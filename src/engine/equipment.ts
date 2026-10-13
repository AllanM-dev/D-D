import { ARMORS, CLASS_TRAINING, STARTING_KITS, WEAPONS, type ArmorDef, type Kit, type WeaponDef } from "../data/equipment";
import type { AbilityScores } from "./abilities";
import type { AttackDef } from "./combat";
import type { Ability } from "./rules";

export interface OwnedItem {
  id: string;
  name: string;
  qty: number;
}

/** Ce que porte le personnage. */
export interface CharacterEquipment {
  kitId: string;
  /** Armure portée (hors bouclier). */
  armor?: { id: string; name: string };
  shield: boolean;
  weapons: OwnedItem[];
  gear: { name: string; qty: number }[];
  gold: number;
}

export interface EquipmentResult {
  equipment: CharacterEquipment;
  attacks: AttackDef[];
  armorClass: number;
  speed: number;
}

export interface EquipmentInput {
  classId: string;
  scores: AbilityScores;
  modifiers: AbilityScores;
  proficiencyBonus: number;
  /** Vitesse de l'espèce, avant malus d'armure. */
  baseSpeed: number;
}

const weaponById = (id: string): WeaponDef => {
  const w = WEAPONS.find((x) => x.id === id);
  if (!w) throw new Error(`Arme inconnue : ${id}`);
  return w;
};
const armorById = (id: string): ArmorDef => {
  const a = ARMORS.find((x) => x.id === id);
  if (!a) throw new Error(`Armure inconnue : ${id}`);
  return a;
};

export function kitsFor(classId: string): Kit[] {
  const kits = STARTING_KITS[classId];
  if (!kits) throw new Error(`Aucun équipement de départ pour la classe ${classId}`);
  return kits;
}

export function getKit(classId: string, kitId?: string): Kit {
  const kits = kitsFor(classId);
  const kit = kitId ? kits.find((k) => k.id === kitId) : kits[0];
  if (!kit) throw new Error(`Lot d'équipement inconnu : ${kitId}`);
  return kit;
}

/** Maîtrise d'une arme selon la classe (le moine et le roublard ont des règles particulières). */
export function isWeaponProficient(classId: string, w: WeaponDef): boolean {
  const training = CLASS_TRAINING[classId]?.weapons;
  if (w.category === "simple") return true;
  switch (training) {
    case "simple+martial": return true;
    case "simple+martial-light": return w.properties.includes("light");
    case "simple+martial-finesse-or-light": return w.properties.includes("finesse") || w.properties.includes("light");
    default: return false;
  }
}

/** Caractéristique utilisée pour une attaque d'arme. */
function weaponAbility(classId: string, w: WeaponDef, proficient: boolean, mods: AbilityScores): Ability {
  if (w.ranged) return "DEX";
  const finesse = w.properties.includes("finesse") || (classId === "monk" && proficient); // Arts martiaux
  return finesse && mods.DEX > mods.STR ? "DEX" : "STR";
}

const average = (a: AttackDef) => a.damage.count * ((a.damage.sides + 1) / 2) + a.damage.bonus;
/** Estimation grossière de l'intérêt d'une attaque, pour proposer la meilleure en premier. */
const score = (a: AttackDef) => average(a) * Math.min(1, Math.max(0.05, (a.toHit + 10) / 20));

const SPELL_ATTACK: Record<string, { name: string; ability: Ability; damageType: string }> = {
  sorcerer: { name: "Trait de feu", ability: "CHA", damageType: "feu" },
  warlock: { name: "Décharge occulte", ability: "CHA", damageType: "force" },
  wizard: { name: "Trait de feu", ability: "INT", damageType: "feu" },
};

/** Calcule CA, vitesse et attaques à partir de l'équipement de départ choisi. */
export function computeEquipment(input: EquipmentInput, kitId?: string): EquipmentResult {
  const { classId, scores, modifiers: mod, proficiencyBonus: prof } = input;
  const kit = getKit(classId, kitId);

  let armor: ArmorDef | undefined;
  let shield = false;
  const weapons = new Map<string, OwnedItem>();
  const gear: { name: string; qty: number }[] = [];
  for (const e of kit.entries) {
    if ("armor" in e) {
      const a = armorById(e.armor);
      if (a.kind === "shield") shield = true;
      else armor = a;
    } else if ("weapon" in e) {
      const w = weaponById(e.weapon);
      const prev = weapons.get(w.id);
      weapons.set(w.id, { id: w.id, name: w.name, qty: (prev?.qty ?? 0) + (e.qty ?? 1) });
    } else {
      gear.push({ name: e.gear, qty: e.qty ?? 1 });
    }
  }

  // --- classe d'armure
  let ac: number;
  if (armor) {
    // Armure lourde (plafond 0) : la Dextérité ne compte pas du tout, ni bonus ni malus.
    const dex = armor.dexCap === undefined ? mod.DEX : armor.dexCap === 0 ? 0 : Math.min(mod.DEX, armor.dexCap);
    ac = armor.baseAc + dex;
  } else if (classId === "barbarian") {
    ac = 10 + mod.DEX + mod.CON; // Défense sans armure (le bouclier reste permis)
  } else if (classId === "monk" && !shield) {
    ac = 10 + mod.DEX + mod.WIS;
  } else {
    ac = 10 + mod.DEX;
  }
  if (shield) ac += armorById("shield").baseAc;

  // --- vitesse
  const speed = armor?.minStr && scores.STR < armor.minStr ? Math.max(0, input.baseSpeed - 10) : input.baseSpeed;

  // --- attaques
  const attacks: AttackDef[] = [];
  const spell = SPELL_ATTACK[classId];
  if (spell) {
    attacks.push({
      name: spell.name, toHit: mod[spell.ability] + prof, damage: { count: 1, sides: 10, bonus: 0 },
      damageType: spell.damageType, ranged: true,
    });
  }
  if (classId === "monk") {
    attacks.push({
      name: "Frappe à mains nues", toHit: mod.DEX + prof, damage: { count: 1, sides: 6, bonus: mod.DEX },
      damageType: "contondant", ranged: false,
    });
  }
  for (const item of weapons.values()) {
    const w = weaponById(item.id);
    const proficient = isWeaponProficient(classId, w);
    const ability = weaponAbility(classId, w, proficient, mod);
    // Arme polyvalente : une main si l'on porte un bouclier, deux mains sinon.
    const sides = w.properties.includes("versatile") && !shield && w.versatileSides ? w.versatileSides : w.damage.sides;
    const base: AttackDef = {
      name: w.name, toHit: mod[ability] + (proficient ? prof : 0),
      damage: { count: w.damage.count, sides, bonus: mod[ability] }, damageType: w.damageType, ranged: w.ranged,
    };
    attacks.push(base);
    if (w.properties.includes("thrown") && !w.ranged) {
      const throwAbility = w.properties.includes("finesse") && mod.DEX > mod.STR ? "DEX" : "STR";
      attacks.push({
        ...base, name: `${w.name} (lancer)`, ranged: true, toHit: mod[throwAbility] + (proficient ? prof : 0),
        damage: { count: w.damage.count, sides: w.damage.sides, bonus: mod[throwAbility] },
      });
    }
  }
  attacks.sort((a, b) => score(b) - score(a));

  return {
    equipment: {
      kitId: kit.id,
      armor: armor ? { id: armor.id, name: armor.name } : undefined,
      shield,
      weapons: [...weapons.values()],
      gear,
      gold: kit.gold,
    },
    attacks,
    armorClass: ac,
    speed,
  };
}

/** Les personnages créés avant l'équipement n'ont ni équipement ni attaques : on leur donne leur lot de départ. */
export function migrateCharacter<T extends { classDef: { id: string }; species: { speed: number }; scores: AbilityScores; modifiers: AbilityScores; proficiencyBonus: number }>(
  c: T & Partial<{ equipment: CharacterEquipment; attacks: AttackDef[]; armorClass: number; speed: number }>,
): T & { equipment: CharacterEquipment; attacks: AttackDef[]; armorClass: number; speed: number } {
  if (c.equipment && c.attacks && typeof c.armorClass === "number" && typeof c.speed === "number") {
    return c as T & { equipment: CharacterEquipment; attacks: AttackDef[]; armorClass: number; speed: number };
  }
  const eq = computeEquipment({
    classId: c.classDef.id, scores: c.scores, modifiers: c.modifiers, proficiencyBonus: c.proficiencyBonus,
    baseSpeed: c.species.speed,
  });
  return { ...c, equipment: eq.equipment, attacks: eq.attacks, armorClass: eq.armorClass, speed: eq.speed };
}
