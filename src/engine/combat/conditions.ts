/** États (empoisonné, à terre, entravé…) et jets de sauvegarde. */
import type { ActiveCondition, ConditionId } from "../../data/conditions";
import { rollD20, rollDie, type Rng } from "../dice";
import type { Ability } from "../rules";
import { ABILITY_FR, CONDITION_FR } from "./labels";
import { endConcentration, isConscious, pushRoll } from "./state";
import type { Combatant, CombatState } from "./types";

export const hasCondition = (c: Combatant, id: ConditionId) => c.conditions.some((x) => x.id === id);
/** Neutralisé, étourdi ou paralysé : ne peut ni agir ni se concentrer. */
export const isIncapacitated = (c: Combatant) => c.conditions.some((x) => x.id === "incapacitated" || x.id === "stunned" || x.id === "paralyzed");

/** Inflige un état. Renvoie false si la cible y est immunisée. Un état qui neutralise met fin à la concentration. */
export function applyCondition(state: CombatState, target: Combatant, cond: ActiveCondition): boolean {
  if (target.dead) return false;
  if (target.immunities?.includes(cond.id)) {
    state.log.push(`${target.name} est immunisé : ${CONDITION_FR[cond.id]} sans effet.`);
    return false;
  }
  target.conditions = target.conditions.filter((x) => x.id !== cond.id);
  target.conditions.push(cond);
  state.log.push(`${target.name} est ${CONDITION_FR[cond.id]} (${cond.source}).`);
  if (cond.id === "incapacitated" || cond.id === "stunned" || cond.id === "paralyzed") endConcentration(state, target, "est neutralisé");
  return true;
}

export function removeCondition(state: CombatState, target: Combatant, id: ConditionId, why: string) {
  if (!hasCondition(target, id)) return;
  target.conditions = target.conditions.filter((x) => x.id !== id);
  state.log.push(`${target.name} n'est plus ${CONDITION_FR[id]} (${why}).`);
}

export interface SaveResult {
  success: boolean;
  total: number;
}

/** Jet de sauvegarde d'un combattant contre un DD, avec les effets des états (échec automatique, désavantage). */
export function rollSave(state: CombatState, target: Combatant, ability: Ability, dc: number, rng: Rng, title?: string): SaveResult {
  const name = title ?? `${target.name} : sauvegarde de ${ABILITY_FR[ability]}`;
  if ((ability === "STR" || ability === "DEX") && (hasCondition(target, "stunned") || hasCondition(target, "paralyzed"))) {
    state.log.push(`${target.name} : sauvegarde de ${ABILITY_FR[ability]} ratée automatiquement (${hasCondition(target, "stunned") ? "étourdi" : "paralysé"}).`);
    return { success: false, total: 0 };
  }
  const disadvantage = ability === "DEX" && hasCondition(target, "restrained");
  // Sens du danger : avantage aux jets de sauvegarde de Dextérité (sauf si l'on est neutralisé).
  const dangerSense = ability === "DEX" && !!target.dangerSense && !isIncapacitated(target);
  const mod = target.saveMods?.[ability] ?? 0;
  const roll = rollD20(mod, disadvantage && !dangerSense ? "disadvantage" : dangerSense && !disadvantage ? "advantage" : "normal", rng);
  // Bénédiction : +1d4 aux jets de sauvegarde.
  const bless = target.blessed && target.side === "party" ? rollDie(4, rng) : 0;
  let success = roll.total + bless >= dc;
  // Inspiration bardique : le dé en réserve peut transformer un échec en réussite.
  let inspired = 0;
  if (!success && target.inspiration && target.side === "party") {
    const die = rollDie(target.inspiration, rng);
    if (roll.total + bless + die >= dc) {
      success = true;
      inspired = die;
      target.inspiration = undefined;
    }
  }
  state.log.push(
    `${target.name} : sauvegarde de ${ABILITY_FR[ability]} ${roll.natural}${mod >= 0 ? "+" : ""}${mod}${bless ? ` + ${bless} (Bénédiction)` : ""} = ${roll.total + bless} contre DD ${dc}${disadvantage && !dangerSense ? " (désavantage : entravé)" : ""}${dangerSense && !disadvantage ? " (avantage : sens du danger)" : ""} — ${success ? "réussie" : "ratée"}.`,
  );
  pushRoll(state, {
    kind: "save", actorId: target.id, actorName: target.name, side: target.side, title: name,
    sides: 20, dice: roll.rolls, keptIndex: roll.rolls.indexOf(roll.natural), modifier: mod, total: roll.total + bless + inspired, dc, outcome: success ? "success" : "failure",
    ...(disadvantage || dangerSense || inspired || bless ? { note: [disadvantage && !dangerSense ? "Désavantage : entravé" : "", dangerSense && !disadvantage ? "Avantage : sens du danger" : "", bless ? `Bénédiction +${bless}` : "", inspired ? `Inspiration bardique +${inspired}` : ""].filter(Boolean).join(" · ") } : {}),
  });
  return { success, total: roll.total + bless };
}

/** Avantages et désavantages venant des états des deux combattants. */
export function conditionModes(attacker: Combatant, target: Combatant, melee: boolean) {
  const advantage: string[] = [];
  const disadvantage: string[] = [];
  for (const id of ["poisoned", "frightened", "blinded", "restrained", "prone"] as const)
    if (hasCondition(attacker, id)) disadvantage.push(CONDITION_FR[id]);
  for (const id of ["blinded", "restrained", "stunned", "paralyzed"] as const)
    if (hasCondition(target, id)) advantage.push(`cible ${CONDITION_FR[id]}`);
  if (hasCondition(target, "prone")) (melee ? advantage : disadvantage).push(melee ? "cible à terre" : "cible à terre, attaque à distance");
  return { advantage, disadvantage };
}

/** Début du tour : les états à durée en rounds expirent, un combattant à terre se relève (s'il n'est pas neutralisé). */
export function startOfTurnConditions(state: CombatState, cur: Combatant) {
  for (const c of state.combatants) {
    const over = c.conditions.filter((x) => x.expiresRound !== undefined && state.round > x.expiresRound);
    for (const o of over) removeCondition(state, c, o.id, "la durée est écoulée");
  }
  if (!cur.dead && hasCondition(cur, "prone") && !isIncapacitated(cur)) removeCondition(state, cur, "prone", "il se relève");
}

/** Fin du tour : fin des états « jusqu'à la fin de votre tour », puis jets de sauvegarde répétés. */
export function endOfTurnConditions(state: CombatState, c: Combatant, rng: Rng) {
  if (c.dead) return;
  // « Jusqu'à la fin de votre prochain tour » : l'état est sur la cible, l'échéance est le tour du lanceur.
  for (const other of state.combatants) {
    for (const cond of [...other.conditions]) {
      if (cond.until && cond.until.actorId === c.id && state.round >= cond.until.round) {
        removeCondition(state, other, cond.id, "la durée est écoulée");
      }
    }
  }
  for (const cond of [...c.conditions]) {
    if (!cond.save || !isConscious(c)) continue;
    const res = rollSave(state, c, cond.save.ability, cond.save.dc, rng, `${c.name} : sauvegarde de ${ABILITY_FR[cond.save.ability]} contre ${CONDITION_FR[cond.id]}`);
    if (res.success) removeCondition(state, c, cond.id, "jet de sauvegarde réussi");
  }
}
