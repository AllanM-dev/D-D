import { SPELL_BY_ID } from "../../data/spells";
import { availableBonus, getCombatant, playerAttack, playerEndTurn, resolveAttack, rollSave, startCombat, useFeature, type CombatState } from "../combat";
import { castSpell, spellOptionsFor } from "../spellcasting";

export { availableBonus, getCombatant, playerAttack, playerEndTurn, resolveAttack, rollSave, startCombat, useFeature };
export type { CombatState };

/** Lance un sort du héros s'il est possible ; renvoie « ok », ou rien s'il ne l'est pas. */
export function castSpellTest(s: CombatState, spellId: string): "ok" | undefined {
  const opt = spellOptionsFor(s, getCombatant(s, "h")).find((o) => o.id === spellId);
  if (!opt?.available || !SPELL_BY_ID[spellId]) return undefined;
  castSpell(s, spellId, () => 0.5, {});
  return "ok";
}
