import { artKey } from "../data/illustrations";
import type { Character } from "./character";
import type { CombatantInit } from "./combat";
import { featuresFor } from "./features";
import { ABILITIES, type Ability } from "./rules";
import { wearsUntrained } from "./equipment";
import { itemCount } from "./inventory";
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
    id: c.id, name: c.name, side: "party", maxHp: c.maxHp, hp: v.hp, ac: c.armorClass, speed: c.speed,
    initiativeBonus: c.initiative, attacks: c.attacks, level: c.level,
    features: [
      ...featuresFor(c.classDef.id, c.level, c.modifiers).map((f) => ({ ...f, uses: f.unlimited ? f.uses : Math.min(v.features[f.id] ?? f.max, f.max) })),
      // Les potions du sac à dos : une utilisation par potion.
      ...(itemCount(c, "healing-potion") > 0 ? [{ id: "potion" as const, uses: itemCount(c, "healing-potion"), max: itemCount(c, "healing-potion") }] : []),
    ],
    art: artKey("class", c.classDef.id),
    sprite: `hero:${c.species.id}:${c.classDef.id}`,
    untrainedArmor: wearsUntrained(c.classDef.id, c.equipment),
    sneakDice: c.classDef.id === "rogue" ? 1 : undefined, // Attaque sournoise : 1d6 au niveau 1
    saveMods: Object.fromEntries(ABILITIES.map((a) => [a, c.saves[a].bonus])) as Record<Ability, number>,
    tags: [c.species.id],
    spellcasting,
  };
}
