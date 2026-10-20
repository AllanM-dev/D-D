/** Déroulement du combat : initiative, enchaînement des tours, jets de mort, réactions du joueur. */
import { SPELL_BY_ID } from "../../data/spells";
import type { Arena } from "../battlefield";
import { rollD20, type Rng } from "../dice";
import { aiTurn } from "./ai";
import { completeAttack } from "./attack";
import { endOfTurnConditions, isIncapacitated, rollSave, startOfTurnConditions } from "./conditions";
import { MAX_STEPS, SHIELD_BONUS, applyDamage, currentCombatant, getCombatant, isConscious, makeCombatant, pushRoll, rollDamageDetailed, updateStatus, type RollInit } from "./state";
import type { Combatant, CombatantInit, CombatState } from "./types";

/** Initiative : d20 + bonus. Égalité : meilleur bonus, puis le groupe du joueur. */
export function startCombat(party: CombatantInit[], enemies: CombatantInit[], rng: Rng = Math.random, arena?: Arena): CombatState {
  const combatants = [...party, ...enemies].map(makeCombatant);
  if (arena && combatants.some((c) => !c.pos)) throw new Error("Chaque combattant a besoin d'une position sur le terrain.");
  const state: CombatState = { combatants, order: [], turn: 0, round: 1, log: [], rolls: [], status: "ongoing", arena };
  for (const c of combatants) {
    const roll = rollD20(c.initiativeBonus, "normal", rng);
    c.initiative = roll.total;
    pushRoll(state, {
      kind: "initiative", actorId: c.id, actorName: c.name, side: c.side, title: `Initiative de ${c.name}`,
      sides: 20, dice: roll.rolls, modifier: c.initiativeBonus, total: roll.total,
    }, 0);
  }
  const sorted = [...combatants].sort(
    (a, b) =>
      b.initiative - a.initiative ||
      b.initiativeBonus - a.initiativeBonus ||
      (a.side === b.side ? 0 : a.side === "party" ? -1 : 1),
  );
  state.order = sorted.map((c) => c.id);
  state.log.push("Initiative : " + sorted.map((c) => `${c.name} ${c.initiative}`).join(", ") + ".");
  processTurns(state, rng);
  return state;
}

/** Décision du joueur pour la réaction en attente (`null` : ne pas réagir), puis le combat continue. */
export function resolveReaction(state: CombatState, choice: string | null, rng: Rng = Math.random) {
  const p = state.pending;
  if (!p) throw new Error("Aucune réaction en attente.");
  state.pending = undefined;
  const reactor = getCombatant(state, p.reactorId);
  const attacker = getCombatant(state, p.attackerId);
  if (choice !== null) {
    const option = p.options.find((o) => o.id === choice);
    const sc = reactor.spellcasting;
    if (!option || !sc) throw new Error("Réaction impossible.");
    sc.slots.used += 1;
    reactor.turnState.reaction = true;
    state.log.push(`${reactor.name} lance ${option.name} (réaction).`);
    if (choice === "shield") {
      reactor.ac += SHIELD_BONUS;
      reactor.shielded += SHIELD_BONUS;
      state.log.push(`${reactor.name} : CA ${reactor.ac} jusqu'au début de son prochain tour.`);
    } else if (choice === "hellish-rebuke") {
      const spell = SPELL_BY_ID["hellish-rebuke"].effect;
      if (spell.kind === "reaction-rebuke" && !attacker.dead) {
        const { success } = rollSave(state, attacker, spell.save, sc.saveDc, rng);
        const dmg = rollDamageDetailed({ count: spell.dice[0], sides: spell.dice[1], bonus: 0 }, false, rng);
        const amount = success ? Math.floor(dmg.total / 2) : dmg.total;
        state.log.push(`Représailles infernales : ${amount} dégâts (${spell.damageType})${success ? ", moitié car le jet est réussi" : ""}.`);
        applyDamage(state, attacker, amount, false);
        pushRoll(state, {
          kind: "damage", actorId: reactor.id, actorName: reactor.name, side: reactor.side,
          title: `Représailles infernales : dégâts (${spell.damageType})`, sides: spell.dice[1], dice: dmg.dice, modifier: 0, total: amount, outcome: "hit",
          ...(success ? { rolled: dmg.total, note: "moitié : jet de sauvegarde réussi" } : {}),
        });
      }
    }
  }
  if (p.stage === "hit") completeAttack(state, p.context, rng);
  if (state.pending) return; // seconde réaction proposée (Représailles infernales)
  // Le tour de l'attaquant reprend où il s'était arrêté.
  endOfTurnConditions(state, attacker, rng);
  advanceTurn(state);
  processTurns(state, rng);
}

function deathSave(state: CombatState, c: Combatant, rng: Rng) {
  const roll = rollD20(0, "normal", rng);
  const event: RollInit = {
    kind: "deathSave", actorId: c.id, actorName: c.name, side: c.side, title: `Jet de mort de ${c.name}`,
    sides: 20, dice: roll.rolls, modifier: 0, total: roll.total,
  };
  if (roll.critical) {
    c.hp = 1;
    c.deathSaves = { successes: 0, failures: 0 };
    state.log.push(`${c.name} : jet de mort 20 — se relève avec 1 PV !`);
    pushRoll(state, { ...event, outcome: "crit" });
    return;
  }
  const failures = roll.fumble ? 2 : roll.natural < 10 ? 1 : 0;
  if (failures) c.deathSaves.failures += failures;
  else c.deathSaves.successes += 1;
  state.log.push(`${c.name} : jet de mort ${roll.natural} — ${failures ? `${failures} échec(s)` : "réussite"} (${c.deathSaves.successes}✓ ${c.deathSaves.failures}✗).`);
  if (c.deathSaves.failures >= 3) {
    c.dead = true;
    state.log.push(`${c.name} meurt.`);
  } else if (c.deathSaves.successes >= 3) {
    c.stable = true;
    state.log.push(`${c.name} est stabilisé.`);
  }
  pushRoll(state, { ...event, outcome: roll.fumble ? "fumble" : failures ? "failure" : "success" });
}

export function advanceTurn(state: CombatState) {
  state.turn += 1;
  if (state.turn >= state.order.length) {
    state.turn = 0;
    state.round += 1;
  }
}

/** Déroule les tours jusqu'à celui d'un personnage du joueur qui peut agir (ou la fin du combat). */
export function processTurns(state: CombatState, rng: Rng = Math.random) {
  for (let step = 0; step < MAX_STEPS; step++) {
    updateStatus(state);
    if (state.status !== "ongoing") return;
    const cur = currentCombatant(state);
    cur.dodging = false;
    cur.reckless = false;
    cur.turnState = { action: false, bonus: false, attacked: false, spells: [], moved: 0 };
    if (cur.shielded) {
      cur.ac -= cur.shielded;
      cur.shielded = 0;
      state.log.push(`Le Bouclier de ${cur.name} se dissipe.`);
    }
    for (const c of state.combatants) if (c.guided && state.round > c.guidedUntilRound) c.guided = false;
    if (cur.raging && state.round > cur.ragingUntilRound) {
      cur.raging = false;
      state.log.push(`La rage de ${cur.name} retombe.`);
    }
    if (cur.innateSorcery && state.round > cur.innateUntilRound) {
      cur.innateSorcery = false;
      state.log.push(`La magie innée de ${cur.name} s'estompe.`);
    }
    startOfTurnConditions(state, cur);
    if (cur.dead) {
      advanceTurn(state);
    } else if (cur.side === "party" && cur.hp === 0) {
      if (!cur.stable) deathSave(state, cur, rng);
      advanceTurn(state);
    } else if (isIncapacitated(cur)) {
      state.log.push(`${cur.name} est neutralisé et passe son tour.`);
      endOfTurnConditions(state, cur, rng);
      advanceTurn(state);
    } else if (cur.side === "enemies" || cur.ally) {
      aiTurn(state, cur, rng); // ennemis et compagnons jouent tout seuls
      if (state.pending) return; // le joueur décide d'une réaction
      endOfTurnConditions(state, cur, rng);
      advanceTurn(state);
    } else {
      return; // à vous de jouer
    }
  }
  throw new Error("Boucle de combat anormale.");
}

export function endTurn(state: CombatState, rng: Rng) {
  endOfTurnConditions(state, currentCombatant(state), rng);
  advanceTurn(state);
  processTurns(state, rng);
}

export function assertPlayerTurn(state: CombatState): Combatant {
  if (state.status !== "ongoing") throw new Error("Le combat est terminé.");
  const cur = currentCombatant(state);
  if (cur.side !== "party" || cur.ally || !isConscious(cur)) throw new Error("Ce n'est pas le tour d'un personnage du joueur.");
  return cur;
}
