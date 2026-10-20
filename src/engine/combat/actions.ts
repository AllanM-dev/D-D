/** Actions du joueur pendant son tour : se déplacer, attaquer, esquiver, foncer, utiliser une capacité… */
import type { Rng } from "../dice";
import { CELL_METERS, cellDistance, type Cell } from "../exploration";
import { hasBonusSpell, spellOptionsFor, type SpellOption } from "../spellcasting";
import { resolveAttack } from "./attack";
import { isIncapacitated, removeCondition, rollSave } from "./conditions";
import { applyBonusOption, availableBonus } from "./features";
import { attackCheck, fm, movementLeft, planMove } from "./geometry";
import { FEATURE_LABELS } from "./labels";
import { currentCombatant, enemyTarget, isConscious, updateStatus } from "./state";
import { assertPlayerTurn, endTurn } from "./turns";
import type { CombatState, FeatureChoice, FeatureOption, FeatureOptionId } from "./types";

/** Déplacement du joueur : case par case, avec les attaques d'opportunité des ennemis qu'il quitte. */
export function playerMove(state: CombatState, to: Cell, rng: Rng = Math.random) {
  const cur = assertPlayerTurn(state);
  const plan = planMove(state, cur, to);
  if (!plan.ok) throw new Error(plan.reason ?? "Déplacement impossible.");
  for (const cell of plan.path) {
    const from = cur.pos!;
    if (!cur.turnState.disengaged) {
      for (const e of state.combatants) {
        if (e.side === cur.side || e.dead || !e.pos || !e.attacks.length || isIncapacitated(e) || e.turnState.reaction) continue;
        if (cellDistance(e.pos, from) <= 1 && cellDistance(e.pos, cell) > 1) {
          e.turnState.reaction = true;
          state.log.push(`${cur.name} s'éloigne de ${e.name} : attaque d'opportunité !`);
          resolveAttack(state, e, cur, e.attacks[0], rng, { opportunity: true });
          if (!isConscious(cur)) {
            // Tombé pendant son propre tour : le tour se termine (jets de mort, ennemis suivants).
            updateStatus(state);
            if (state.status === "ongoing") endTurn(state, rng);
            return;
          }
        }
      }
    }
    cur.pos = cell;
    cur.turnState.moved = (cur.turnState.moved ?? 0) + 1;
  }
  state.log.push(`${cur.name} se déplace de ${fm(plan.meters)} m.`);
  updateStatus(state);
}

/** Action Se libérer : test de Force contre le DD de ce qui vous entrave (toile…). */
export function playerBreakFree(state: CombatState, rng: Rng = Math.random) {
  const cur = assertPlayerTurn(state);
  if (cur.turnState.action) throw new Error("Action déjà utilisée ce tour.");
  const bound = cur.conditions.find((x) => x.escape);
  if (!bound?.escape) throw new Error("Rien ne vous retient.");
  cur.turnState.action = true;
  const res = rollSave(state, cur, bound.escape.ability, bound.escape.dc, rng, `${cur.name} tente de se libérer`);
  if (res.success) removeCondition(state, cur, bound.id, "vous vous êtes libéré");
  afterPlayerAction(state, rng);
}

/** Action Foncer : le déplacement de ce tour est doublé. */
export function playerDash(state: CombatState, rng: Rng = Math.random) {
  const cur = assertPlayerTurn(state);
  if (cur.turnState.action) throw new Error("Action déjà utilisée ce tour.");
  cur.turnState.action = true;
  cur.turnState.dashed = true;
  state.log.push(`${cur.name} fonce : déplacement doublé (${fm(movementLeft(cur, state) * CELL_METERS)} m possibles).`);
  afterPlayerAction(state, rng);
}

/** Action Se désengager : pas d'attaque d'opportunité pour ce tour. */
export function playerDisengage(state: CombatState, rng: Rng = Math.random) {
  const cur = assertPlayerTurn(state);
  if (cur.turnState.action) throw new Error("Action déjà utilisée ce tour.");
  cur.turnState.action = true;
  cur.turnState.disengaged = true;
  state.log.push(`${cur.name} se désengage : aucune attaque d'opportunité ce tour.`);
  afterPlayerAction(state, rng);
}

export interface PlayerOptions {
  /** L'action (Attaquer, Esquiver) est encore disponible. */
  canAct: boolean;
  /** Actions bonus utilisables maintenant. */
  bonus: FeatureOption[];
  /** Sorts du personnage (disponibles ou non, avec la raison). */
  spells: SpellOption[];
  /** On peut terminer le tour (au moins une action utilisée). */
  canEnd: boolean;
  /** Cases de déplacement restantes (absent : pas de terrain). */
  movementCells?: number;
}

/** Ce que le joueur peut faire maintenant (pour l'interface). */
export function playerOptions(state: CombatState): PlayerOptions {
  if (state.status !== "ongoing") return { canAct: false, bonus: [], spells: [], canEnd: false };
  const cur = currentCombatant(state);
  if (cur.side !== "party" || cur.ally || !isConscious(cur)) return { canAct: false, bonus: [], spells: [], canEnd: false };
  return {
    canAct: !cur.turnState.action,
    bonus: availableBonus(state, cur),
    spells: spellOptionsFor(state, cur),
    canEnd: cur.turnState.action || cur.turnState.bonus || (cur.turnState.moved ?? 0) > 0,
    ...(state.arena ? { movementCells: movementLeft(cur, state) } : {}),
  };
}

/**
 * Après une action : le tour se termine tout seul s'il ne reste plus rien à faire (action utilisée et aucune
 * action bonus possible) ; sinon le joueur peut utiliser son action bonus ou terminer son tour.
 */
export function afterPlayerAction(state: CombatState, rng: Rng) {
  updateStatus(state);
  if (state.status !== "ongoing") return;
  const cur = currentCombatant(state);
  // Sur le terrain, le tour ne se termine pas tout seul tant qu'il reste du déplacement : on peut reculer après avoir attaqué.
  if (state.arena && movementLeft(cur, state) > 0) return;
  if (cur.turnState.action && availableBonus(state, cur).length === 0 && !hasBonusSpell(state, cur)) endTurn(state, rng);
}

/** Action Attaquer du combattant dont c'est le tour. */
export function playerAttack(state: CombatState, targetId: string, rng: Rng = Math.random, attackIndex = 0) {
  const cur = assertPlayerTurn(state);
  if (cur.turnState.action) throw new Error("Action déjà utilisée ce tour.");
  const target = enemyTarget(state, targetId);
  const attack = cur.attacks[attackIndex];
  if (!attack) throw new Error("Attaque inconnue.");
  const check = attackCheck(state, cur, target, attack);
  if (!check.ok) throw new Error(check.reason);
  cur.turnState.action = true;
  cur.turnState.attacked = true;
  if (attack.light && attack.offhand) {
    cur.turnState.offhand = attack.offhand;
    if (attack.mastery === "nick") cur.turnState.offhandFree = true; // Entaille : la seconde arme ne coûte pas l'action bonus
  }
  resolveAttack(state, cur, target, attack, rng);
  afterPlayerAction(state, rng);
}

/** Action Esquiver : désavantage aux attaques contre vous jusqu'à votre prochain tour. */
export function playerDodge(state: CombatState, rng: Rng = Math.random) {
  const cur = assertPlayerTurn(state);
  if (cur.turnState.action) throw new Error("Action déjà utilisée ce tour.");
  cur.turnState.action = true;
  cur.dodging = true;
  state.log.push(`${cur.name} esquive.`);
  afterPlayerAction(state, rng);
}

/** Termine le tour (utile quand il reste une action bonus que l'on ne veut pas utiliser). */
export function playerEndTurn(state: CombatState, rng: Rng = Math.random) {
  assertPlayerTurn(state);
  endTurn(state, rng);
}

/** Utilise une capacité de classe (le plus souvent en action bonus) : voir les fiches de `features.ts`. */
export function useFeature(state: CombatState, id: FeatureOptionId, rng: Rng = Math.random, choice: FeatureChoice = {}) {
  const cur = assertPlayerTurn(state);
  const option: FeatureOption | undefined = availableBonus(state, cur).find((o) => o.id === id);
  if (!option) throw new Error(`${FEATURE_LABELS[id]} n'est pas utilisable maintenant.`);
  applyBonusOption(state, cur, option, rng, choice);
  afterPlayerAction(state, rng);
}
