import { artKey } from "../data/illustrations";
import type { Character } from "./character";
import type { CombatantInit } from "./combat";
import { featuresFor } from "./features";
import { castingInput, vitalsOf } from "./rest";
import { castingFor } from "./spellcasting";

/** Le héros entre en combat avec ses PV et ressources du moment (voir `rest.ts`). */
export function characterToCombatant(c: Character): CombatantInit {
  const v = vitalsOf(c);
  const spellcasting = castingFor(castingInput(c));
  if (spellcasting) {
    spellcasting.slots.used = Math.min(v.slotsUsed, spellcasting.slots.max);
    for (const f of spellcasting.free) f.uses = Math.min(v.free[f.spellId] ?? f.max, f.max);
  }
  return {
    id: c.id, name: c.name, side: "party", maxHp: c.maxHp, hp: v.hp, ac: c.armorClass,
    initiativeBonus: c.initiative, attacks: c.attacks, level: c.level,
    features: featuresFor(c.classDef.id, c.level).map((f) => ({ ...f, uses: f.unlimited ? f.uses : Math.min(v.features[f.id] ?? f.max, f.max) })),
    art: artKey("class", c.classDef.id),
    spellcasting,
  };
}
