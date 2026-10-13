import { rollD20, rollDie, type AdvantageMode, type Rng } from "./dice";

export type Side = "party" | "enemies";

export interface DamageDice {
  count: number;
  sides: number;
  bonus: number;
}

export interface AttackDef {
  name: string;
  toHit: number;
  damage: DamageDice;
  damageType: string;
  /** Une attaque à distance ne profite pas de l'avantage contre une cible inconsciente. */
  ranged: boolean;
}

export interface Combatant {
  id: string;
  name: string;
  side: Side;
  maxHp: number;
  hp: number;
  ac: number;
  initiativeBonus: number;
  initiative: number;
  attacks: AttackDef[];
  /** Esquive : les attaques contre ce combattant ont un désavantage jusqu'au début de son prochain tour. */
  dodging: boolean;
  dead: boolean;
  /** Stabilisé à 0 PV (3 réussites aux jets de mort). */
  stable: boolean;
  deathSaves: { successes: number; failures: number };
}

export type CombatStatus = "ongoing" | "victory" | "defeat";

export type RollKind = "initiative" | "attack" | "damage" | "deathSave";
export type RollOutcome = "hit" | "miss" | "crit" | "fumble" | "success" | "failure";

/** Un jet de dés, avec de quoi l'animer : dés lancés, dé retenu, résultat. */
export interface RollEvent {
  id: number;
  kind: RollKind;
  actorId: string;
  actorName: string;
  side: Side;
  title: string;
  sides: number;
  /** Tous les dés lancés (deux d20 avec avantage ou désavantage). */
  dice: number[];
  /** Indice du d20 retenu quand deux dés sont lancés. */
  keptIndex: number;
  modifier: number;
  total: number;
  /** CA visée (jets d'attaque). */
  dc?: number;
  outcome?: RollOutcome;
  /** Nombre de lignes du journal à afficher une fois ce jet révélé. */
  logLen: number;
  /** Round en cours au moment de ce jet. */
  round: number;
  /** État des combattants juste après ce jet (pour mettre l'affichage à jour au bon moment). */
  after: Combatant[];
}

export interface CombatState {
  combatants: Combatant[];
  /** Ids dans l'ordre d'initiative. */
  order: string[];
  turn: number;
  round: number;
  log: string[];
  /** Tous les jets, dans l'ordre : sert à animer les dés. */
  rolls: RollEvent[];
  status: CombatStatus;
}

export type CombatantInit = Pick<Combatant, "id" | "name" | "side" | "maxHp" | "ac" | "initiativeBonus" | "attacks">;

const MAX_STEPS = 500; // garde-fou contre toute boucle infinie

export function makeCombatant(init: CombatantInit): Combatant {
  return {
    ...init, attacks: [...init.attacks], hp: init.maxHp, initiative: 0,
    dodging: false, dead: false, stable: false, deathSaves: { successes: 0, failures: 0 },
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
export function rollDamageDetailed(d: DamageDice, crit: boolean, rng: Rng): { dice: number[]; total: number } {
  const count = crit ? d.count * 2 : d.count;
  const dice = Array.from({ length: count }, () => rollDie(d.sides, rng));
  return { dice, total: Math.max(0, dice.reduce((a, b) => a + b, d.bonus)) };
}

export const rollDamage = (d: DamageDice, crit: boolean, rng: Rng): number => rollDamageDetailed(d, crit, rng).total;

/** Copie indépendante (fonctionne aussi sur un objet réactif Vue, contrairement à structuredClone). */
const snapshot = (combatants: Combatant[]): Combatant[] => JSON.parse(JSON.stringify(combatants));

type RollInit = Omit<RollEvent, "id" | "after" | "logLen" | "round" | "keptIndex"> & { keptIndex?: number };

function pushRoll(state: CombatState, init: RollInit, logLen = state.log.length) {
  state.rolls.push({ keptIndex: 0, ...init, id: state.rolls.length, logLen, round: state.round, after: snapshot(state.combatants) });
}

/** Initiative : d20 + bonus. Égalité : meilleur bonus, puis le groupe du joueur. */
export function startCombat(party: CombatantInit[], enemies: CombatantInit[], rng: Rng = Math.random): CombatState {
  const combatants = [...party, ...enemies].map(makeCombatant);
  const state: CombatState = { combatants, order: [], turn: 0, round: 1, log: [], rolls: [], status: "ongoing" };
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

function updateStatus(state: CombatState) {
  if (state.status !== "ongoing") return;
  const party = state.combatants.filter((c) => c.side === "party");
  if (state.combatants.filter((c) => c.side === "enemies").every((c) => c.dead)) {
    state.status = "victory";
    state.log.push("Victoire ! Tous les ennemis sont vaincus.");
  } else if (party.every((c) => c.dead || (c.hp === 0 && c.stable))) {
    state.status = "defeat";
    state.log.push("Défaite… plus personne ne peut se battre.");
  }
}

/** Applique des dégâts. Le joueur tombe à 0 PV (inconscient) ; un ennemi à 0 PV meurt. */
export function applyDamage(state: CombatState, target: Combatant, amount: number, crit: boolean) {
  if (amount <= 0 || target.dead) return;
  if (target.hp > 0) {
    const overflow = amount - target.hp;
    target.hp = Math.max(0, target.hp - amount);
    if (target.hp > 0) return;
    if (target.side === "enemies") {
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
  // Déjà à 0 PV : chaque coup reçu = 1 échec aux jets de mort (2 si critique).
  target.stable = false;
  if (amount >= target.maxHp) target.deathSaves.failures = 3;
  else target.deathSaves.failures += crit ? 2 : 1;
  state.log.push(`${target.name} est touché alors qu'il est à terre.`);
  if (target.deathSaves.failures >= 3) {
    target.dead = true;
    state.log.push(`${target.name} succombe à ses blessures.`);
  }
}

export function resolveAttack(state: CombatState, attacker: Combatant, target: Combatant, attack: AttackDef, rng: Rng) {
  const melee = !attack.ranged;
  const unconscious = isDown(target);
  let mode: AdvantageMode = "normal";
  const advantage = unconscious && melee;
  const disadvantage = target.dodging;
  if (advantage && !disadvantage) mode = "advantage";
  else if (disadvantage && !advantage) mode = "disadvantage";

  const roll = rollD20(attack.toHit, mode, rng);
  const hit = roll.critical || (!roll.fumble && roll.total >= target.ac);
  const label = `${attacker.name} attaque ${target.name} (${attack.name}) : ${roll.natural}${attack.toHit >= 0 ? "+" : ""}${attack.toHit} = ${roll.total} contre CA ${target.ac}`;
  // Un coup au corps à corps contre une cible inconsciente est toujours un critique.
  const crit = hit && (roll.critical || (unconscious && melee));
  const attackRoll: RollInit = {
    kind: "attack", actorId: attacker.id, actorName: attacker.name, side: attacker.side,
    title: `${attacker.name} attaque ${target.name} (${attack.name})`,
    sides: 20, dice: roll.rolls, keptIndex: roll.rolls.indexOf(roll.natural), modifier: attack.toHit,
    total: roll.total, dc: target.ac, outcome: roll.fumble ? "fumble" : !hit ? "miss" : crit ? "crit" : "hit",
  };
  if (!hit) {
    state.log.push(`${label} — raté.`);
    pushRoll(state, attackRoll);
    return;
  }
  pushRoll(state, attackRoll); // état et journal d'avant les dégâts
  const { dice, total: damage } = rollDamageDetailed(attack.damage, crit, rng);
  state.log.push(`${label} — ${crit ? "coup critique" : "touché"} : ${damage} dégâts (${attack.damageType}).`);
  applyDamage(state, target, damage, crit);
  pushRoll(state, {
    kind: "damage", actorId: attacker.id, actorName: attacker.name, side: attacker.side,
    title: `Dégâts de ${attacker.name} (${attack.damageType})`,
    sides: attack.damage.sides, dice, modifier: attack.damage.bonus, total: damage, outcome: crit ? "crit" : "hit",
  });
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

function enemyTurn(state: CombatState, enemy: Combatant, rng: Rng) {
  const party = state.combatants.filter((c) => c.side === "party" && !c.dead);
  const conscious = party.filter(isConscious);
  const pool = conscious.length ? conscious : party.filter((c) => !c.stable);
  if (!pool.length || !enemy.attacks.length) {
    state.log.push(`${enemy.name} n'a personne à attaquer.`);
    return;
  }
  const target = pool[Math.floor(rng() * pool.length)];
  resolveAttack(state, enemy, target, enemy.attacks[0], rng);
}

function advanceTurn(state: CombatState) {
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
    if (cur.dead) {
      advanceTurn(state);
    } else if (cur.side === "enemies") {
      enemyTurn(state, cur, rng);
      advanceTurn(state);
    } else if (cur.hp === 0) {
      if (!cur.stable) deathSave(state, cur, rng);
      advanceTurn(state);
    } else {
      return; // à vous de jouer
    }
  }
  throw new Error("Boucle de combat anormale.");
}

function endTurn(state: CombatState, rng: Rng) {
  advanceTurn(state);
  processTurns(state, rng);
}

function assertPlayerTurn(state: CombatState): Combatant {
  if (state.status !== "ongoing") throw new Error("Le combat est terminé.");
  const cur = currentCombatant(state);
  if (cur.side !== "party" || !isConscious(cur)) throw new Error("Ce n'est pas le tour d'un personnage du joueur.");
  return cur;
}

/** Action Attaquer du combattant dont c'est le tour, puis fin du tour (les ennemis jouent ensuite). */
export function playerAttack(state: CombatState, targetId: string, rng: Rng = Math.random, attackIndex = 0) {
  const cur = assertPlayerTurn(state);
  const target = getCombatant(state, targetId);
  if (target.side !== "enemies" || target.dead) throw new Error("Cible invalide.");
  const attack = cur.attacks[attackIndex];
  if (!attack) throw new Error("Attaque inconnue.");
  resolveAttack(state, cur, target, attack, rng);
  endTurn(state, rng);
}

/** Action Esquiver : désavantage aux attaques contre vous jusqu'à votre prochain tour. */
export function playerDodge(state: CombatState, rng: Rng = Math.random) {
  const cur = assertPlayerTurn(state);
  cur.dodging = true;
  state.log.push(`${cur.name} esquive.`);
  endTurn(state, rng);
}
