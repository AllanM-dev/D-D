import type { Character } from "./character";
import type { AttackDef, CombatantInit } from "./combat";
import { ABILITIES, type Ability } from "./rules";

interface Loadout {
  name: string;
  ability: Ability;
  sides: number;
  damageType: string;
  ranged: boolean;
  /** Un sort mineur n'ajoute pas le modificateur aux dégâts. */
  cantrip?: boolean;
}

const LOADOUTS: Record<string, Loadout> = {
  barbarian: { name: "Hache à deux mains", ability: "STR", sides: 12, damageType: "tranchant", ranged: false },
  bard: { name: "Rapière", ability: "DEX", sides: 8, damageType: "perforant", ranged: false },
  cleric: { name: "Masse d'armes", ability: "STR", sides: 6, damageType: "contondant", ranged: false },
  druid: { name: "Bâton", ability: "STR", sides: 6, damageType: "contondant", ranged: false },
  fighter: { name: "Épée longue", ability: "STR", sides: 8, damageType: "tranchant", ranged: false },
  monk: { name: "Coup à mains nues", ability: "DEX", sides: 6, damageType: "contondant", ranged: false },
  paladin: { name: "Épée longue", ability: "STR", sides: 8, damageType: "tranchant", ranged: false },
  ranger: { name: "Arc long", ability: "DEX", sides: 8, damageType: "perforant", ranged: true },
  rogue: { name: "Épée courte", ability: "DEX", sides: 6, damageType: "perforant", ranged: false },
  sorcerer: { name: "Trait de feu", ability: "CHA", sides: 10, damageType: "feu", ranged: true, cantrip: true },
  warlock: { name: "Décharge occulte", ability: "CHA", sides: 10, damageType: "force", ranged: true, cantrip: true },
  wizard: { name: "Trait de feu", ability: "INT", sides: 10, damageType: "feu", ranged: true, cantrip: true },
};

/** Attaque par défaut selon la classe, en attendant l'équipement de départ. Le personnage maîtrise cette arme. */
export function defaultAttack(c: Character): AttackDef {
  let l = LOADOUTS[c.classDef.id];
  // Un guerrier plus agile que fort préfère l'arc long.
  if (c.classDef.id === "fighter" && c.modifiers.DEX > c.modifiers.STR) {
    l = { name: "Arc long", ability: "DEX", sides: 8, damageType: "perforant", ranged: true };
  }
  if (!l || !ABILITIES.includes(l.ability)) throw new Error(`Classe inconnue : ${c.classDef.id}`);
  const mod = c.modifiers[l.ability];
  return {
    name: l.name,
    toHit: mod + c.proficiencyBonus,
    damage: { count: 1, sides: l.sides, bonus: l.cantrip ? 0 : mod },
    damageType: l.damageType,
    ranged: l.ranged,
  };
}

export function characterToCombatant(c: Character): CombatantInit {
  return {
    id: c.id, name: c.name, side: "party", maxHp: c.maxHp, ac: c.armorClass,
    initiativeBonus: c.initiative, attacks: [defaultAttack(c)],
  };
}
