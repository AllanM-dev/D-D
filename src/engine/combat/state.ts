/** État d'un combat : création des combattants, jets enregistrés, dégâts, soins, concentration, fin du combat. */
import { SPELL_BY_ID } from "../../data/spells";
import { clone } from "../clone";
import { rollD20, rollDie, type Rng } from "../dice";
import { CONDITION_FR } from "./labels";
import type { Combatant, CombatantInit, CombatState, DamageDice, RollEvent } from "./types";

export const MAX_STEPS = 500; // garde-fou contre toute boucle infinie
/** Durée de la Rage et de la Magie innée : 1 minute = 10 rounds de 6 secondes. */
export const EFFECT_ROUNDS = 10;
export const RAGE_DAMAGE = 2;
export const SHIELD_BONUS = 5;
export const RAGE_RESISTED = ["contondant", "perforant", "tranchant"];

export function makeCombatant(init: CombatantInit): Combatant {
  return {
    ...init, attacks: [...init.attacks], hp: init.hp ?? init.maxHp, initiative: 0,
    dodging: false, dead: false, stable: false, deathSaves: { successes: 0, failures: 0 },
    level: init.level ?? 1,
    features: (init.features ?? []).map((f) => ({ ...f })),
    raging: false, ragingUntilRound: 0, innateSorcery: false, innateUntilRound: 0,
    turnState: { action: false, bonus: false, attacked: false, spells: [] },
    spellcasting: init.spellcasting ? clone(init.spellcasting) : undefined,
    acBonus: 0, guided: false, guidedUntilRound: 0, mocked: false, conditions: [], shielded: 0,
  };
}

export const isConscious = (c: Combatant) => !c.dead && c.hp > 0;
/** À 0 PV, encore en vie (inconscient ou stable). */
export const isDown = (c: Combatant) => !c.dead && c.hp === 0 && c.side === "party";

export function getCombatant(state: CombatState, id: string): Combatant {
  const c = state.combatants.find((x) => x.id === id);
  if (!c) throw new Error(`Combattant introuvable : ${id}`);
  return c;
}

export const currentCombatant = (state: CombatState) => getCombatant(state, state.order[state.turn]);

/** Dégâts avec le détail des dés. Un critique double les dés, pas le bonus. */
export function rollDamageDetailed(d: DamageDice, crit: boolean, rng: Rng, minDie = 1): { dice: number[]; total: number } {
  const count = crit ? d.count * 2 : d.count;
  const dice = Array.from({ length: count }, () => Math.max(minDie, rollDie(d.sides, rng)));
  return { dice, total: Math.max(0, dice.reduce((a, b) => a + b, d.bonus)) };
}

export const rollDamage = (d: DamageDice, crit: boolean, rng: Rng): number => rollDamageDetailed(d, crit, rng).total;

/** Copie indépendante (fonctionne aussi sur un objet réactif Vue, contrairement à structuredClone). */
export const snapshot = (combatants: Combatant[]): Combatant[] => clone(combatants);

export type RollInit = Omit<RollEvent, "id" | "after" | "logLen" | "round" | "keptIndex"> & { keptIndex?: number };

export function pushRoll(state: CombatState, init: RollInit, logLen = state.log.length) {
  state.rolls.push({ keptIndex: 0, ...init, id: state.rolls.length, logLen, round: state.round, after: snapshot(state.combatants) });
}

export function updateStatus(state: CombatState) {
  if (state.status !== "ongoing") return;
  const party = state.combatants.filter((c) => c.side === "party");
  if (state.combatants.filter((c) => c.side === "enemies").every((c) => c.dead)) {
    state.status = "victory";
    state.log.push("Victoire ! Tous les ennemis sont vaincus.");
  } else if (party.filter((c) => !c.ally).every((c) => c.dead) || party.every((c) => c.dead || (c.hp === 0 && c.stable))) {
    // Défaite : le héros est mort, ou plus personne du groupe n'est debout (compagnons compris).
    state.status = "defeat";
    state.log.push("Défaite… plus personne ne peut se battre.");
  }
}

/** Met fin à la concentration d'un combattant et aux effets qui en dépendent. */
export function endConcentration(state: CombatState, c: Combatant, reason: string) {
  if (!c.concentrating) return;
  const spell = SPELL_BY_ID[c.concentrating.spellId];
  if (c.acBonus) {
    c.ac -= c.acBonus;
    c.acBonus = 0;
  }
  c.mark = undefined;
  c.blessed = false;
  c.concentrating = undefined;
  // Les états liés à ce sort (Enchevêtrement, Fou rire…) prennent fin.
  for (const other of state.combatants) {
    const gone = other.conditions.filter((x) => x.concentrationOf === c.id);
    if (!gone.length) continue;
    other.conditions = other.conditions.filter((x) => x.concentrationOf !== c.id);
    for (const g of gone) state.log.push(`${other.name} n'est plus ${CONDITION_FR[g.id]}.`);
  }
  state.log.push(`${c.name} ${reason} : ${spell?.name ?? "le sort"} prend fin.`);
}

/** Jet de sauvegarde de Constitution pour garder sa concentration après avoir subi des dégâts. */
export function concentrationCheck(state: CombatState, c: Combatant, damage: number, rng: Rng) {
  if (!c.concentrating || c.dead || c.hp <= 0 || damage <= 0) return;
  const bonus = c.spellcasting?.concentrationBonus ?? 0;
  const dc = Math.max(10, Math.floor(damage / 2));
  const roll = rollD20(bonus, "normal", rng);
  const ok = roll.total >= dc;
  state.log.push(`${c.name} : concentration, jet de sauvegarde de Constitution ${roll.natural}${bonus >= 0 ? "+" : ""}${bonus} = ${roll.total} contre DD ${dc} — ${ok ? "maintenue" : "perdue"}.`);
  pushRoll(state, {
    kind: "save", actorId: c.id, actorName: c.name, side: c.side, title: `Concentration de ${c.name} : sauvegarde de Constitution`,
    sides: 20, dice: roll.rolls, modifier: bonus, total: roll.total, dc, outcome: ok ? "success" : "failure",
    note: ok ? "Concentration maintenue" : "Concentration perdue",
  });
  if (!ok) endConcentration(state, c, "perd sa concentration");
}

/** Applique des dégâts. Le joueur tombe à 0 PV (inconscient) ; un ennemi à 0 PV meurt. */
export function applyDamage(state: CombatState, target: Combatant, amount: number, crit: boolean) {
  if (amount <= 0 || target.dead) return;
  if (target.hp > 0) {
    const overflow = amount - target.hp;
    target.hp = Math.max(0, target.hp - amount);
    if (target.hp > 0) return;
    endConcentration(state, target, "perd connaissance");
    if (target.ally) {
      // Un compagnon à 0 PV est hors de combat : pas de jets de mort, il se relèvera après le combat.
      target.stable = true;
      state.log.push(`${target.name} s'effondre, hors de combat.`);
    } else if (target.side === "enemies") {
      target.dead = true;
      state.log.push(`${target.name} est vaincu.`);
    } else if (overflow >= target.maxHp) {
      target.dead = true;
      state.log.push(`${target.name} est tué sur le coup (dégâts massifs).`);
    } else {
      target.deathSaves = { successes: 0, failures: 0 };
      target.stable = false;
      state.log.push(`${target.name} tombe à 0 PV, inconscient.`);
    }
    return;
  }
  if (target.ally) return; // déjà hors de combat
  // Déjà à 0 PV : chaque coup reçu = 1 échec aux jets de mort (2 si critique).
  target.stable = false;
  if (amount >= target.maxHp) target.deathSaves.failures = 3;
  else target.deathSaves.failures += crit ? 2 : 1;
  state.log.push(`${target.name} est touché alors qu'il est à terre.`);
  if (target.deathSaves.failures >= 3) {
    target.dead = true;
    endConcentration(state, target, "meurt");
    state.log.push(`${target.name} succombe à ses blessures.`);
  }
}

export function enemyTarget(state: CombatState, targetId: string): Combatant {
  const target = getCombatant(state, targetId);
  if (target.side !== "enemies" || target.dead) throw new Error("Cible invalide.");
  return target;
}

/** Rend des PV. À 0 PV, le personnage reprend connaissance. */
export function healCombatant(state: CombatState, c: Combatant, amount: number): number {
  const before = c.hp;
  if (c.dead || amount <= 0) return 0;
  if (c.hp === 0) {
    c.deathSaves = { successes: 0, failures: 0 };
    c.stable = false;
  }
  c.hp = Math.min(c.maxHp, c.hp + amount);
  const healed = c.hp - before;
  state.log.push(`${c.name} récupère ${healed} PV.`);
  return healed;
}
