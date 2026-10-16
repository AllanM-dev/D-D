import { ARMORS, CLASS_TRAINING, MASTERY_COUNT, STARTING_KITS, WEAPONS, WEAPON_MASTERY, type ArmorDef, type Kit, type WeaponDef } from "../data/equipment";
import type { AbilityScores } from "./abilities";
import type { FightingStyleId } from "../data/fighting-styles";
import type { AttackDef } from "./combat";
import type { Ability } from "./rules";

/** Malus de vitesse (en mètres) d'une armure lourde portée sans la Force requise. */
export const HEAVY_ARMOR_SPEED_PENALTY = 3;

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
  /** Vitesse de l'espèce en mètres, avant malus d'armure. */
  baseSpeed: number;
  fightingStyle?: FightingStyleId;
  /** Armes dont l'effet de maîtrise est connu (identifiants d'armes). */
  masteries?: string[];
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

/** Ce qui est porté ou en main : armure, bouclier, armes. */
export interface Loadout {
  armor?: { id: string; name: string };
  shield: boolean;
  weapons: OwnedItem[];
}

export interface DerivedStats {
  attacks: AttackDef[];
  armorClass: number;
  speed: number;
}

/** Une classe sait-elle porter cette armure (ou ce bouclier) ? Sinon : désavantage aux attaques et aucun sort. */
export function armorTrained(classId: string, kind: ArmorDef["kind"]): boolean {
  return (CLASS_TRAINING[classId]?.armor ?? []).includes(kind);
}

/** Le personnage porte-t-il une armure ou un bouclier qu'il ne maîtrise pas ? */
export function wearsUntrained(classId: string, loadout: Pick<Loadout, "armor" | "shield">): boolean {
  const a = loadout.armor ? armorById(loadout.armor.id) : undefined;
  return (!!a && !armorTrained(classId, a.kind)) || (loadout.shield && !armorTrained(classId, "shield"));
}

/** CA, vitesse et attaques d'un personnage pour un équipement donné (utilisé à la création et à chaque changement d'équipement). */
export function deriveStats(input: EquipmentInput, loadout: Loadout): DerivedStats {
  const { classId, scores, modifiers: mod, proficiencyBonus: prof } = input;
  const armor = loadout.armor ? armorById(loadout.armor.id) : undefined;
  const shield = loadout.shield;
  const weapons = new Map(loadout.weapons.map((w) => [w.id, w]));

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
  if (input.fightingStyle === "defense" && armor) ac += 1; // Style de combat : Défense

  // --- vitesse
  const speed = armor?.minStr && scores.STR < armor.minStr ? Math.max(0, input.baseSpeed - HEAVY_ARMOR_SPEED_PENALTY) : input.baseSpeed;

  // --- attaques
  const attacks: AttackDef[] = [];
  if (classId === "monk") {
    attacks.push({
      name: "Frappe à mains nues", toHit: mod.DEX + prof, damage: { count: 1, sides: 6, bonus: mod.DEX },
      damageType: "contondant", ranged: false, ability: "DEX", unarmed: true,
    });
  }
  const archery = input.fightingStyle === "archery" ? 2 : 0; // Style de combat : Archerie (armes à distance)
  for (const item of weapons.values()) {
    const w = weaponById(item.id);
    const proficient = isWeaponProficient(classId, w);
    const ability = weaponAbility(classId, w, proficient, mod);
    // Arme polyvalente : une main si l'on porte un bouclier, deux mains sinon.
    const sides = w.properties.includes("versatile") && !shield && w.versatileSides ? w.versatileSides : w.damage.sides;
    const base: AttackDef = {
      name: w.name, toHit: mod[ability] + (proficient ? prof : 0) + (w.ranged ? archery : 0),
      damage: { count: w.damage.count, sides, bonus: mod[ability] }, damageType: w.damageType, ranged: w.ranged, ability, weaponId: w.id,
    };
    // Propriétés d'arme
    if (w.range && w.ranged) base.range = w.range;
    if (w.properties.includes("reach")) base.reach = 2; // allonge : 3 m
    if (input.masteries?.includes(w.id) && WEAPON_MASTERY[w.id]) base.mastery = WEAPON_MASTERY[w.id];
    if (w.properties.includes("finesse") || w.ranged) base.sneak = true; // arme éligible à l'Attaque sournoise
    if (w.properties.includes("light") && !w.ranged) base.light = true;
    if (w.properties.includes("two-handed") && shield) base.blocked = "Deux mains : impossible avec un bouclier";
    if (w.properties.includes("heavy") && scores[w.ranged ? "DEX" : "STR"] < 13) base.penalty = `arme lourde, ${w.ranged ? "Dextérité" : "Force"} inférieure à 13`;
    attacks.push(base);
    if (w.properties.includes("thrown") && !w.ranged) {
      const throwAbility = w.properties.includes("finesse") && mod.DEX > mod.STR ? "DEX" : "STR";
      attacks.push({
        ...base, name: `${w.name} (lancer)`, ranged: true, ability: throwAbility, toHit: mod[throwAbility] + (proficient ? prof : 0),
        damage: { count: w.damage.count, sides: w.damage.sides, bonus: mod[throwAbility] }, range: w.range, reach: undefined, light: undefined, sneak: true,
      });
    }
  }
  // Combat à deux armes : une arme légère de mêlée peut être doublée d'une seconde arme légère (action bonus, sans modificateur aux dégâts).
  const lights = attacks.filter((a) => a.light);
  for (const a of lights) {
    const other = lights.find((o) => o !== a && o.weaponId !== a.weaponId) ?? (weapons.get(a.weaponId!)!.qty >= 2 ? a : undefined);
    if (other) a.offhand = { name: other.name, toHit: other.toHit, damage: { ...other.damage, bonus: Math.min(0, other.damage.bonus) }, damageType: other.damageType, ability: other.ability };
  }
  // Mains nues : toujours possible (dégâts 1 + Force), même sans arme en main.
  if (classId !== "monk") {
    attacks.push({
      name: "Coup à mains nues", toHit: mod.STR + prof, damage: { count: 0, sides: 4, bonus: 1 + mod.STR },
      damageType: "contondant", ranged: false, ability: "STR",
    });
  }
  attacks.sort((a, b) => Number(!!a.blocked) - Number(!!b.blocked) || score(b) - score(a));
  return { attacks, armorClass: ac, speed };
}

/** Calcule CA, vitesse et attaques à partir de l'équipement de départ choisi. */
export function computeEquipment(input: EquipmentInput, kitId?: string): EquipmentResult {
  const kit = getKit(input.classId, kitId);

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
  const loadout: Loadout = { armor: armor ? { id: armor.id, name: armor.name } : undefined, shield, weapons: [...weapons.values()] };
  const stats = deriveStats(input, loadout);
  return {
    equipment: { kitId: kit.id, armor: loadout.armor, shield, weapons: loadout.weapons, gear, gold: kit.gold },
    attacks: stats.attacks,
    armorClass: stats.armorClass,
    speed: stats.speed,
  };
}

/** Les personnages créés avant l'équipement n'ont ni équipement ni attaques : on leur donne leur lot de départ. */
/** Pieds → mètres, arrondi au demi-mètre (30 → 9, 35 → 10,5). */
export const feetToMeters = (ft: number) => Math.round(ft * 0.3 * 2) / 2;

export function migrateCharacter<T extends { classDef: { id: string }; species: { speed: number }; scores: AbilityScores; modifiers: AbilityScores; proficiencyBonus: number }>(
  c: T & Partial<{ equipment: CharacterEquipment; attacks: AttackDef[]; armorClass: number; speed: number }>,
): T & { equipment: CharacterEquipment; attacks: AttackDef[]; armorClass: number; speed: number } {
  // Les personnages sauvegardés avant le passage aux mètres ont des vitesses en pieds (20 à 35).
  if (c.species.speed > 15) {
    c = {
      ...c,
      species: { ...c.species, speed: feetToMeters(c.species.speed) },
      speed: typeof c.speed === "number" ? feetToMeters(c.speed) : undefined,
    };
  }
  if (c.equipment && c.attacks && typeof c.armorClass === "number" && typeof c.speed === "number") {
    return c as T & { equipment: CharacterEquipment; attacks: AttackDef[]; armorClass: number; speed: number };
  }
  const eq = computeEquipment({
    classId: c.classDef.id, scores: c.scores, modifiers: c.modifiers, proficiencyBonus: c.proficiencyBonus,
    baseSpeed: c.species.speed,
  });
  return { ...c, equipment: eq.equipment, attacks: eq.attacks, armorClass: eq.armorClass, speed: eq.speed };
}

/** Armes dont un personnage de cette classe peut maîtriser l'effet : armes qu'il sait manier et qui ont une maîtrise. */
export function masterableWeapons(classId: string): WeaponDef[] {
  if (!MASTERY_COUNT[classId]) return [];
  return WEAPONS.filter((w) => WEAPON_MASTERY[w.id] && isWeaponProficient(classId, w));
}

/** Maîtrises par défaut : les premières armes du lot de départ que la classe peut maîtriser. */
export function defaultMasteries(classId: string, weaponIds: string[]): string[] {
  const n = MASTERY_COUNT[classId] ?? 0;
  const ok = new Set(masterableWeapons(classId).map((w) => w.id));
  return [...new Set(weaponIds.filter((id) => ok.has(id)))].slice(0, n);
}
