import { rollD20, rollDie, type AdvantageMode, type Rng } from "./dice";
import { SPELL_BY_ID } from "../data/spells";
import { hasBonusSpell, spellOptionsFor, type SpellOption } from "./spellcasting";
import type { Ability } from "./rules";

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
  /** Caractéristique utilisée (la Rage ne renforce que les attaques de Force). */
  ability?: Ability;
  /** Attaque de sort (la Magie innée donne l'avantage). */
  spell?: boolean;
  /** Frappe à mains nues (arts martiaux). */
  unarmed?: boolean;
}

/** Capacités de classe utilisables en combat (toutes en action bonus). */
export type FeatureId = "second-wind" | "rage" | "lay-on-hands" | "innate-sorcery" | "martial-arts";

export interface FeatureUse {
  id: FeatureId;
  /** Utilisations restantes (pour l'imposition des mains : points de la réserve). */
  uses: number;
  max: number;
  /** Utilisable sans limite (frappe bonus des arts martiaux). */
  unlimited?: boolean;
}

export const FEATURE_LABELS: Record<FeatureId, string> = {
  "second-wind": "Second souffle",
  rage: "Rage",
  "lay-on-hands": "Imposition des mains",
  "innate-sorcery": "Magie innée",
  "martial-arts": "Frappe bonus (arts martiaux)",
};

/** Capacité d'incantation d'un combattant (voir `spellcasting.ts`). */
export interface Spellcasting {
  ability: Ability;
  modifier: number;
  attackBonus: number;
  saveDc: number;
  cantrips: string[];
  prepared: string[];
  /** Emplacements de sort de niveau 1. */
  slots: { max: number; used: number };
  /** Lancers gratuits (Ennemi juré du rôdeur). */
  free: { spellId: string; uses: number; max: number }[];
  /** Bonus au jet de sauvegarde de Constitution pour garder sa concentration. */
  concentrationBonus: number;
  /** Ne porte pas d'armure (condition de l'Armure du mage). */
  unarmored: boolean;
}

/** Marque sur une cible (Maléfice, Marque du chasseur) : dégâts supplémentaires à chaque coup. */
export interface Mark {
  spellId: string;
  name: string;
  targetId: string;
  count: number;
  sides: number;
  damageType: string;
  /** Ne s'applique qu'aux attaques d'arme (Marque du chasseur). */
  weaponOnly: boolean;
}

/** État du tour en cours d'un combattant. */
export interface TurnState {
  action: boolean;
  bonus: boolean;
  /** Sorts lancés ce tour (règle : un sort à action bonus limite les autres sorts). */
  spells: { level: number; time: "action" | "bonus" | "reaction" }[];
  /** A utilisé l'action Attaquer ce tour (condition de la frappe bonus des arts martiaux). */
  attacked: boolean;
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
  level: number;
  features: FeatureUse[];
  /** Rage : +2 aux dégâts des attaques de Force et résistance aux dégâts contondants, perforants et tranchants. */
  raging: boolean;
  ragingUntilRound: number;
  /** Magie innée : avantage aux attaques de sort. */
  innateSorcery: boolean;
  innateUntilRound: number;
  turnState: TurnState;
  /** Clé d'illustration (`class:fighter`, `monster:goblin`…). */
  art?: string;
  spellcasting?: Spellcasting;
  /** Sort de concentration en cours. */
  concentrating?: { spellId: string };
  mark?: Mark;
  /** Bonus de CA d'un sort (Bouclier de la foi), à retirer quand il se termine. */
  acBonus: number;
  /** Éclair guidé : la prochaine attaque contre ce combattant a l'avantage. */
  guided: boolean;
  guidedUntilRound: number;
  /** Moquerie cruelle : désavantage à sa prochaine attaque. */
  mocked: boolean;
  /** Modificateurs de caractéristiques pour les jets de sauvegarde (monstres). */
  saveMods?: Partial<Record<Ability, number>>;
}

export type CombatStatus = "ongoing" | "victory" | "defeat";

export type RollKind = "initiative" | "attack" | "damage" | "deathSave" | "heal" | "save";
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
  /** CA visée (jets d'attaque) ou DD (jets de sauvegarde). */
  dc?: number;
  /** Total lancé avant réduction (moitié des dégâts, résistance) ; `total` est le total réellement appliqué. */
  rolled?: number;
  /** Précision affichée sous le résultat (« moitié : jet de sauvegarde réussi »). */
  note?: string;
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

export type CombatantInit = Pick<Combatant, "id" | "name" | "side" | "maxHp" | "ac" | "initiativeBonus" | "attacks"> &
  Partial<Pick<Combatant, "level" | "features" | "art" | "spellcasting" | "saveMods">>;

const MAX_STEPS = 500; // garde-fou contre toute boucle infinie
/** Durée de la Rage et de la Magie innée : 1 minute = 10 rounds de 6 secondes. */
export const EFFECT_ROUNDS = 10;
export const RAGE_DAMAGE = 2;
const RAGE_RESISTED = ["contondant", "perforant", "tranchant"];

export function makeCombatant(init: CombatantInit): Combatant {
  return {
    ...init, attacks: [...init.attacks], hp: init.maxHp, initiative: 0,
    dodging: false, dead: false, stable: false, deathSaves: { successes: 0, failures: 0 },
    level: init.level ?? 1,
    features: (init.features ?? []).map((f) => ({ ...f })),
    raging: false, ragingUntilRound: 0, innateSorcery: false, innateUntilRound: 0,
    turnState: { action: false, bonus: false, attacked: false, spells: [] },
    spellcasting: init.spellcasting ? JSON.parse(JSON.stringify(init.spellcasting)) : undefined,
    acBonus: 0, guided: false, guidedUntilRound: 0, mocked: false,
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
export const snapshot = (combatants: Combatant[]): Combatant[] => JSON.parse(JSON.stringify(combatants));

export type RollInit = Omit<RollEvent, "id" | "after" | "logLen" | "round" | "keptIndex"> & { keptIndex?: number };

export function pushRoll(state: CombatState, init: RollInit, logLen = state.log.length) {
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

/** Met fin à la concentration d'un combattant et aux effets qui en dépendent. */
export function endConcentration(state: CombatState, c: Combatant, reason: string) {
  if (!c.concentrating) return;
  const spell = SPELL_BY_ID[c.concentrating.spellId];
  if (c.acBonus) {
    c.ac -= c.acBonus;
    c.acBonus = 0;
  }
  c.mark = undefined;
  c.concentrating = undefined;
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
    endConcentration(state, target, "meurt");
    state.log.push(`${target.name} succombe à ses blessures.`);
  }
}

export interface AttackResult {
  hit: boolean;
  crit: boolean;
  damage: number;
}

export function resolveAttack(state: CombatState, attacker: Combatant, target: Combatant, attack: AttackDef, rng: Rng): AttackResult {
  const melee = !attack.ranged;
  const unconscious = isDown(target);
  let mode: AdvantageMode = "normal";
  // Avantage : cible inconsciente au corps à corps, attaque de sort sous Magie innée, ou cible marquée par Éclair guidé.
  const guidedAdvantage = target.guided && attacker.side === "party";
  const advantage = (unconscious && melee) || (attacker.innateSorcery && !!attack.spell) || guidedAdvantage;
  // Désavantage : cible qui esquive, ou attaquant visé par Moquerie cruelle.
  const disadvantage = target.dodging || attacker.mocked;
  if (guidedAdvantage) target.guided = false;
  if (attacker.mocked) attacker.mocked = false;
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
    return { hit: false, crit: false, damage: 0 };
  }
  pushRoll(state, attackRoll); // état et journal d'avant les dégâts
  // Rage : +2 aux dégâts des attaques de Force.
  const rageBonus = attacker.raging && attack.ability === "STR" ? RAGE_DAMAGE : 0;
  const damageDef = rageBonus ? { ...attack.damage, bonus: attack.damage.bonus + rageBonus } : attack.damage;
  const { dice, total: rolled } = rollDamageDetailed(damageDef, crit, rng);
  // Rage : résistance aux dégâts contondants, perforants et tranchants (moitié, arrondie à l'inférieur).
  const resisted = target.raging && RAGE_RESISTED.includes(attack.damageType);
  const damage = resisted ? Math.floor(rolled / 2) : rolled;
  const notes = [rageBonus ? `rage +${rageBonus}` : "", resisted ? "réduits de moitié par la rage" : ""].filter(Boolean);
  state.log.push(
    `${label} — ${crit ? "coup critique" : "touché"} : ${damage} dégâts (${attack.damageType}${notes.length ? ", " + notes.join(", ") : ""}).`,
  );
  applyDamage(state, target, damage, crit);
  pushRoll(state, {
    kind: "damage", actorId: attacker.id, actorName: attacker.name, side: attacker.side,
    title: `Dégâts de ${attacker.name} (${attack.damageType})`,
    sides: attack.damage.sides, dice, modifier: damageDef.bonus, total: damage, outcome: crit ? "crit" : "hit",
    ...(resisted ? { rolled, note: "réduits de moitié (résistance de la rage)" } : {}),
  });
  let total = damage;

  // Maléfice, Marque du chasseur : dégâts supplémentaires sur la cible marquée.
  const mark = attacker.mark;
  if (mark && mark.targetId === target.id && !target.dead && (!attack.spell || !mark.weaponOnly)) {
    const extra = rollDamageDetailed({ count: mark.count, sides: mark.sides, bonus: 0 }, crit, rng);
    state.log.push(`${mark.name} : ${extra.total} dégâts supplémentaires (${mark.damageType}).`);
    applyDamage(state, target, extra.total, crit);
    pushRoll(state, {
      kind: "damage", actorId: attacker.id, actorName: attacker.name, side: attacker.side,
      title: `${mark.name} : dégâts supplémentaires (${mark.damageType})`,
      sides: mark.sides, dice: extra.dice, modifier: 0, total: extra.total, outcome: crit ? "crit" : "hit",
    });
    total += extra.total;
  }

  // Un lanceur de sorts qui subit des dégâts doit garder sa concentration.
  concentrationCheck(state, target, damage, rng);
  return { hit: true, crit, damage: total };
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
    cur.turnState = { action: false, bonus: false, attacked: false, spells: [] };
    for (const c of state.combatants) if (c.guided && state.round > c.guidedUntilRound) c.guided = false;
    if (cur.raging && state.round > cur.ragingUntilRound) {
      cur.raging = false;
      state.log.push(`La rage de ${cur.name} retombe.`);
    }
    if (cur.innateSorcery && state.round > cur.innateUntilRound) {
      cur.innateSorcery = false;
      state.log.push(`La magie innée de ${cur.name} s'estompe.`);
    }
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

export function assertPlayerTurn(state: CombatState): Combatant {
  if (state.status !== "ongoing") throw new Error("Le combat est terminé.");
  const cur = currentCombatant(state);
  if (cur.side !== "party" || !isConscious(cur)) throw new Error("Ce n'est pas le tour d'un personnage du joueur.");
  return cur;
}

const feature = (c: Combatant, id: FeatureId) => c.features.find((f) => f.id === id);
const hasUses = (f: FeatureUse | undefined): f is FeatureUse => !!f && (!!f.unlimited || f.uses > 0);

export interface FeatureOption {
  id: FeatureId;
  label: string;
  /** Précision affichée (utilisations restantes…). */
  detail: string;
  /** La capacité demande une cible ennemie. */
  needsTarget?: boolean;
  /** La capacité demande une quantité (imposition des mains) : maximum possible. */
  amountMax?: number;
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
}

/** Actions bonus utilisables par ce combattant maintenant. Rien si l'action bonus est déjà utilisée. */
export function availableBonus(state: CombatState, c: Combatant): FeatureOption[] {
  if (c.turnState.bonus || c.side !== "party" || !isConscious(c)) return [];
  const out: FeatureOption[] = [];
  const missing = c.maxHp - c.hp;
  const enemiesAlive = state.combatants.some((x) => x.side === "enemies" && !x.dead);
  for (const f of c.features) {
    if (!hasUses(f)) continue;
    const label = FEATURE_LABELS[f.id];
    if (f.id === "second-wind" && missing > 0) out.push({ id: f.id, label, detail: `${f.uses}/${f.max} · 1d10 + niveau PV` });
    else if (f.id === "lay-on-hands" && missing > 0) out.push({ id: f.id, label, detail: `réserve ${f.uses}/${f.max} PV`, amountMax: Math.min(f.uses, missing) });
    else if (f.id === "rage" && !c.raging) out.push({ id: f.id, label, detail: `${f.uses}/${f.max}` });
    else if (f.id === "innate-sorcery" && !c.innateSorcery) out.push({ id: f.id, label, detail: `${f.uses}/${f.max}` });
    else if (f.id === "martial-arts" && c.turnState.attacked && enemiesAlive && c.attacks.some((a) => a.unarmed))
      out.push({ id: f.id, label, detail: "après l'action Attaquer", needsTarget: true });
  }
  return out;
}

/** Ce que le joueur peut faire maintenant (pour l'interface). */
export function playerOptions(state: CombatState): PlayerOptions {
  if (state.status !== "ongoing") return { canAct: false, bonus: [], spells: [], canEnd: false };
  const cur = currentCombatant(state);
  if (cur.side !== "party" || !isConscious(cur)) return { canAct: false, bonus: [], spells: [], canEnd: false };
  return {
    canAct: !cur.turnState.action,
    bonus: availableBonus(state, cur),
    spells: spellOptionsFor(state, cur),
    canEnd: cur.turnState.action || cur.turnState.bonus,
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
  if (cur.turnState.action && availableBonus(state, cur).length === 0 && !hasBonusSpell(state, cur)) endTurn(state, rng);
}

export function enemyTarget(state: CombatState, targetId: string): Combatant {
  const target = getCombatant(state, targetId);
  if (target.side !== "enemies" || target.dead) throw new Error("Cible invalide.");
  return target;
}

/** Action Attaquer du combattant dont c'est le tour. */
export function playerAttack(state: CombatState, targetId: string, rng: Rng = Math.random, attackIndex = 0) {
  const cur = assertPlayerTurn(state);
  if (cur.turnState.action) throw new Error("Action déjà utilisée ce tour.");
  const target = enemyTarget(state, targetId);
  const attack = cur.attacks[attackIndex];
  if (!attack) throw new Error("Attaque inconnue.");
  cur.turnState.action = true;
  cur.turnState.attacked = true;
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

export interface FeatureChoice {
  /** Cible de la frappe bonus. */
  targetId?: string;
  /** Points à dépenser (imposition des mains). */
  amount?: number;
}

/** Utilise une capacité de classe (action bonus). */
export function useFeature(state: CombatState, id: FeatureId, rng: Rng = Math.random, choice: FeatureChoice = {}) {
  const cur = assertPlayerTurn(state);
  const option = availableBonus(state, cur).find((o) => o.id === id);
  if (!option) throw new Error(`${FEATURE_LABELS[id]} n'est pas utilisable maintenant.`);
  const f = feature(cur, id)!;

  switch (id) {
    case "second-wind": {
      const die = rollDie(10, rng);
      f.uses -= 1;
      const healed = healCombatant(state, cur, die + cur.level);
      state.log.push(`${cur.name} reprend son souffle (1d10 + ${cur.level} = ${die + cur.level}).`);
      pushRoll(state, {
        kind: "heal", actorId: cur.id, actorName: cur.name, side: cur.side, title: `Second souffle de ${cur.name}`,
        sides: 10, dice: [die], modifier: cur.level, total: healed, outcome: "success",
      });
      break;
    }
    case "lay-on-hands": {
      const amount = choice.amount ?? 0;
      if (!Number.isInteger(amount) || amount < 1 || amount > (option.amountMax ?? 0)) throw new Error("Quantité de soins invalide.");
      f.uses -= amount;
      healCombatant(state, cur, amount);
      break;
    }
    case "rage":
      f.uses -= 1;
      cur.raging = true;
      cur.ragingUntilRound = state.round + EFFECT_ROUNDS - 1;
      state.log.push(`${cur.name} entre en rage !`);
      break;
    case "innate-sorcery":
      f.uses -= 1;
      cur.innateSorcery = true;
      cur.innateUntilRound = state.round + EFFECT_ROUNDS - 1;
      state.log.push(`${cur.name} libère sa magie innée.`);
      break;
    case "martial-arts": {
      const target = enemyTarget(state, choice.targetId ?? "");
      const strike = cur.attacks.find((a) => a.unarmed)!;
      cur.turnState.bonus = true;
      resolveAttack(state, cur, target, strike, rng);
      afterPlayerAction(state, rng);
      return;
    }
  }
  cur.turnState.bonus = true;
  afterPlayerAction(state, rng);
}
