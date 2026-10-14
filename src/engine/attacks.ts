import type { Character } from "./character";
import type { CombatantInit } from "./combat";
import { featuresFor } from "./features";

export function characterToCombatant(c: Character): CombatantInit {
  return {
    id: c.id, name: c.name, side: "party", maxHp: c.maxHp, ac: c.armorClass,
    initiativeBonus: c.initiative, attacks: c.attacks, level: c.level, features: featuresFor(c.classDef.id, c.level),
  };
}
