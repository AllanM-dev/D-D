import { rollD20, rollDie, type AdvantageMode, type Rng } from "./dice";
import { SPELL_BY_ID } from "../data/spells";
import { hasBonusSpell, spellOptionsFor, type SpellOption } from "./spellcasting";
import type { Ability } from "./rules";
import { WEAPONS } from "../data/equipment";
import { CLEARING, freeCellsNear, hasLineOfSight, metersBetween, pathBetween, speedCells, type Arena } from "./battlefield";
import { CELL_METERS, cellDistance, type Cell } from "./exploration";
import type { ActiveCondition, ConditionId, ConditionRider } from "../data/conditions";

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
  /** État infligé par un coup qui touche (jet de sauvegarde de la cible). */
  rider?: ConditionRider;
  /** Portée normale / maximale en mètres (armes à distance, armes de jet, sorts) ; sinon corps à corps (1,5 m). */
  range?: [number, number];
  /** Frappe à mains nues (arts martiaux). */
  unarmed?: boolean;
}

/** Capacités de classe utilisables en combat (toutes en action bonus). */
export type FeatureId = "second-wind" | "rage" | "lay-on-hands" | "innate-sorcery" | "martial-arts" | "potion";

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
  potion: "Boire une potion de soin",
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
  /** Réaction utilisée depuis le début de son dernier tour. */
  reaction?: boolean;
  /** Cases parcourues ce tour. */
  moved?: number;
  /** A utilisé l'action Foncer : déplacement doublé. */
  dashed?: boolean;
  /** A utilisé l'action Se désengager : pas d'attaque d'opportunité ce tour. */
  disengaged?: boolean;
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
  /** Position sur le terrain (absente : combat sans carte). */
  pos?: Cell;
  /** Vitesse en mètres. */
  speed?: number;
  /** Bonus de CA du sort Bouclier, jusqu'au début de son prochain tour. */
  shielded: number;
  /** États en cours (empoisonné, à terre…). */
  conditions: ActiveCondition[];
  /** Marqueurs (espèce du héros…) : certains effets les épargnent. */
  tags?: string[];
  /** États auxquels ce combattant est immunisé. */
  immunities?: ConditionId[];
  /** Modificateurs de caractéristiques pour les jets de sauvegarde (monstres). */
  saveMods?: Partial<Record<Ability, number>>;
}

export type CombatStatus = "ongoing" | "victory" | "defeat";

export type RollKind = "initiative" | "attack" | "damage" | "deathSave" | "heal" | "save" | "check" | "move";
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
  /** Réaction que le joueur doit décider avant que le combat continue. */
  pending?: PendingReaction;
  /** Terrain du combat (absent : pas de positions, ni portées ni déplacement). */
  arena?: Arena;
}

export type CombatantInit = Pick<Combatant, "id" | "name" | "side" | "maxHp" | "ac" | "initiativeBonus" | "attacks"> &
  Partial<Pick<Combatant, "hp" | "level" | "features" | "art" | "spellcasting" | "saveMods" | "tags" | "immunities" | "pos" | "speed">>;

const MAX_STEPS = 500; // garde-fou contre toute boucle infinie
/** Durée de la Rage et de la Magie innée : 1 minute = 10 rounds de 6 secondes. */
export const EFFECT_ROUNDS = 10;
export const RAGE_DAMAGE = 2;
export const SHIELD_BONUS = 5;
const RAGE_RESISTED = ["contondant", "perforant", "tranchant"];

export function makeCombatant(init: CombatantInit): Combatant {
  return {
    ...init, attacks: [...init.attacks], hp: init.hp ?? init.maxHp, initiative: 0,
    dodging: false, dead: false, stable: false, deathSaves: { successes: 0, failures: 0 },
    level: init.level ?? 1,
    features: (init.features ?? []).map((f) => ({ ...f })),
    raging: false, ragingUntilRound: 0, innateSorcery: false, innateUntilRound: 0,
    turnState: { action: false, bonus: false, attacked: false, spells: [] },
    spellcasting: init.spellcasting ? JSON.parse(JSON.stringify(init.spellcasting)) : undefined,
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
  /** Une réaction est proposée au joueur avant de connaître l'issue (voir `state.pending`). */
  paused?: boolean;
}

/** Jet d'attaque déjà lancé, en attente de la réaction du joueur. */
interface AttackContext {
  attackerId: string;
  targetId: string;
  attack: AttackDef;
  roll: { natural: number; rolls: number[]; total: number; critical: boolean; fumble: boolean };
  reasons: string[];
  melee: boolean;
}

export interface ReactionOption {
  /** Identifiant du sort (`shield`, `hellish-rebuke`). */
  id: string;
  name: string;
  detail: string;
}

/** Réaction à décider : avant les dégâts (l'attaque touche) ou après (le héros a été blessé). */
export interface PendingReaction {
  stage: "hit" | "damage";
  reactorId: string;
  attackerId: string;
  summary: string;
  options: ReactionOption[];
  context: AttackContext;
}

/** Réactions (sorts) que ce combattant peut utiliser maintenant : Bouclier quand l'attaque touche, Représailles infernales après des dégâts. */
export function reactionOptions(c: Combatant, stage: "hit" | "damage"): ReactionOption[] {
  const sc = c.spellcasting;
  if (!sc || c.side !== "party" || !isConscious(c) || isIncapacitated(c) || c.turnState.reaction) return [];
  if (sc.slots.max - sc.slots.used <= 0) return [];
  const id = stage === "hit" ? "shield" : "hellish-rebuke";
  if (!sc.prepared.includes(id)) return [];
  const spell = SPELL_BY_ID[id];
  return [{ id, name: spell.name, detail: `1 emplacement, ${sc.slots.max - sc.slots.used}/${sc.slots.max} restants` }];
}

export const ABILITY_FR: Record<Ability, string> = {
  STR: "Force", DEX: "Dextérité", CON: "Constitution", INT: "Intelligence", WIS: "Sagesse", CHA: "Charisme",
};

export const hasCondition = (c: Combatant, id: ConditionId) => c.conditions.some((x) => x.id === id);
/** Neutralisé, étourdi ou paralysé : ne peut ni agir ni se concentrer. */
export const isIncapacitated = (c: Combatant) => c.conditions.some((x) => x.id === "incapacitated" || x.id === "stunned" || x.id === "paralyzed");
const CONDITION_FR: Record<ConditionId, string> = {
  poisoned: "empoisonné", prone: "à terre", frightened: "effrayé", blinded: "aveuglé", restrained: "entravé",
  incapacitated: "neutralisé", stunned: "étourdi", paralyzed: "paralysé",
};
export const conditionName = (id: ConditionId) => CONDITION_FR[id];

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
  const mod = target.saveMods?.[ability] ?? 0;
  const roll = rollD20(mod, disadvantage ? "disadvantage" : "normal", rng);
  const success = roll.total >= dc;
  state.log.push(
    `${target.name} : sauvegarde de ${ABILITY_FR[ability]} ${roll.natural}${mod >= 0 ? "+" : ""}${mod} = ${roll.total} contre DD ${dc}${disadvantage ? " (désavantage : entravé)" : ""} — ${success ? "réussie" : "ratée"}.`,
  );
  pushRoll(state, {
    kind: "save", actorId: target.id, actorName: target.name, side: target.side, title: name,
    sides: 20, dice: roll.rolls, keptIndex: roll.rolls.indexOf(roll.natural), modifier: mod, total: roll.total, dc, outcome: success ? "success" : "failure",
    ...(disadvantage ? { note: "Désavantage : entravé" } : {}),
  });
  return { success, total: roll.total };
}

/** Avantages et désavantages venant des états des deux combattants. */
function conditionModes(attacker: Combatant, target: Combatant, melee: boolean) {
  const advantage: string[] = [];
  const disadvantage: string[] = [];
  for (const id of ["poisoned", "frightened", "blinded", "restrained", "prone"] as const)
    if (hasCondition(attacker, id)) disadvantage.push(CONDITION_FR[id]);
  for (const id of ["blinded", "restrained", "stunned", "paralyzed"] as const)
    if (hasCondition(target, id)) advantage.push(`cible ${CONDITION_FR[id]}`);
  if (hasCondition(target, "prone")) (melee ? advantage : disadvantage).push(melee ? "cible à terre" : "cible à terre, attaque à distance");
  return { advantage, disadvantage };
}

export function resolveAttack(
  state: CombatState, attacker: Combatant, target: Combatant, attack: AttackDef, rng: Rng, opts: { opportunity?: boolean } = {},
): AttackResult {
  const melee = !attack.ranged;
  const unconscious = isDown(target);
  let mode: AdvantageMode = "normal";
  // Avantage : cible inconsciente au corps à corps, attaque de sort sous Magie innée, ou cible marquée par Éclair guidé.
  const guidedAdvantage = target.guided && attacker.side === "party";
  const cm = conditionModes(attacker, target, melee);
  const advantage = (unconscious && melee) || (attacker.innateSorcery && !!attack.spell) || guidedAdvantage || cm.advantage.length > 0;
  // Désavantage : cible qui esquive, attaquant visé par Moquerie cruelle, ou états (empoisonné, effrayé…).
  const rangeDis = attackCheck(state, attacker, target, attack).disadvantage;
  const disadvantage = target.dodging || attacker.mocked || cm.disadvantage.length > 0 || rangeDis.length > 0;
  const reasons = [
    advantage && !disadvantage ? `Avantage : ${[unconscious && melee ? "cible inconsciente" : "", attacker.innateSorcery && attack.spell ? "Magie innée" : "", guidedAdvantage ? "cible éclairée" : "", ...cm.advantage].filter(Boolean).join(", ")}` : "",
    disadvantage && !advantage ? `Désavantage : ${[target.dodging ? "cible qui esquive" : "", attacker.mocked ? "moquerie" : "", ...cm.disadvantage, ...rangeDis].filter(Boolean).join(", ")}` : "",
    advantage && disadvantage ? "Avantage et désavantage s'annulent" : "",
  ].filter(Boolean);
  if (guidedAdvantage) target.guided = false;
  if (attacker.mocked) attacker.mocked = false;
  if (advantage && !disadvantage) mode = "advantage";
  else if (disadvantage && !advantage) mode = "disadvantage";

  const roll = rollD20(attack.toHit, mode, rng);
  const ctx: AttackContext = {
    attackerId: attacker.id, targetId: target.id, attack, reasons, melee,
    roll: { natural: roll.natural, rolls: roll.rolls, total: roll.total, critical: roll.critical, fumble: roll.fumble },
  };
  // Un ennemi qui touche un héros capable de réagir (Bouclier) attend la décision du joueur avant les dégâts.
  const hits = roll.critical || (!roll.fumble && roll.total >= target.ac);
  if (hits && attacker.side === "enemies" && target.side === "party" && !opts.opportunity) {
    const options = reactionOptions(target, "hit");
    if (options.length) {
      state.pending = {
        stage: "hit", reactorId: target.id, attackerId: attacker.id, options, context: ctx,
        summary: `${attacker.name} vous touche (${attack.name} : ${roll.total} contre CA ${target.ac}).`,
      };
      return { hit: true, crit: false, damage: 0, paused: true };
    }
  }
  return completeAttack(state, ctx, rng);
}

/** Suite d'une attaque dont le d20 est lancé : touche ou rate (selon la CA actuelle), dégâts, marque, concentration, état. */
function completeAttack(state: CombatState, ctx: AttackContext, rng: Rng): AttackResult {
  const attacker = getCombatant(state, ctx.attackerId);
  const target = getCombatant(state, ctx.targetId);
  const { attack, roll, reasons, melee } = ctx;
  const unconscious = isDown(target);
  const hit = roll.critical || (!roll.fumble && roll.total >= target.ac);
  const label = `${attacker.name} attaque ${target.name} (${attack.name}) : ${roll.natural}${attack.toHit >= 0 ? "+" : ""}${attack.toHit} = ${roll.total} contre CA ${target.ac}`;
  // Un coup au corps à corps contre une cible inconsciente est toujours un critique.
  const paralyzed = hasCondition(target, "paralyzed");
  const crit = hit && (roll.critical || ((unconscious || paralyzed) && melee));
  const attackRoll: RollInit = {
    kind: "attack", actorId: attacker.id, actorName: attacker.name, side: attacker.side,
    title: `${attacker.name} attaque ${target.name} (${attack.name})`,
    sides: 20, dice: roll.rolls, keptIndex: roll.rolls.indexOf(roll.natural), modifier: attack.toHit,
    total: roll.total, dc: target.ac, outcome: roll.fumble ? "fumble" : !hit ? "miss" : crit ? "crit" : "hit",
    ...(reasons.length ? { note: reasons.join(" · ") } : {}),
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
  // État infligé par le coup (jet de sauvegarde de la cible).
  const rider = attack.rider;
  if (rider && !target.dead && target.hp > 0 && !target.tags?.some((t) => rider.exceptTags?.includes(t))) {
    const save = rider.save;
    const ok = save ? rollSave(state, target, save.ability, save.dc, rng).success : false;
    if (!ok) {
      applyCondition(state, target, {
        id: rider.condition, source: attack.name,
        ...(rider.rounds ? { expiresRound: state.round + rider.rounds } : {}),
        ...(rider.repeatSave && save ? { save } : {}),
      });
    }
  }
  // Représailles infernales : le héros blessé peut réagir.
  if (attacker.side === "enemies" && target.side === "party" && total > 0) {
    const options = reactionOptions(target, "damage");
    if (options.length) {
      state.pending = {
        stage: "damage", reactorId: target.id, attackerId: attacker.id, options, context: ctx,
        summary: `${attacker.name} vous a blessé (${total} PV).`,
      };
      return { hit: true, crit, damage: total, paused: true };
    }
  }
  return { hit: true, crit, damage: total };
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

// ---------------------------------------------------------------- positions, portées, déplacement

const AROUND: Cell[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
];
const cellKey = (c: Cell) => `${c.x},${c.y}`;
/** Portée par défaut d'une arme à distance sans portée connue (anciennes sauvegardes). */
const DEFAULT_RANGE: [number, number] = [18, 54];
export const SPEED_DEFAULT = 9;

/** Portée d'une attaque en mètres : `undefined` pour le corps à corps. */
export function attackRange(attack: AttackDef): [number, number] | undefined {
  if (attack.range) return attack.range;
  if (!attack.ranged) return undefined;
  const base = attack.name.replace(/ \(lancer\)$/, "");
  return WEAPONS.find((w) => w.name === base)?.range ?? DEFAULT_RANGE;
}

/** Cases occupées par des combattants en vie (celui dont l'identifiant est `except` ne compte pas). */
export function occupiedCells(state: CombatState, except?: string): Set<string> {
  return new Set(state.combatants.filter((c) => !c.dead && c.pos && c.id !== except).map((c) => cellKey(c.pos!)));
}

export interface TargetCheck {
  ok: boolean;
  /** Pourquoi la cible est inaccessible. */
  reason?: string;
  /** Désavantages venant de la distance ou du contact (tir à longue portée, ennemi au contact). */
  disadvantage: string[];
  /** Distance en mètres. */
  meters: number;
}

const fm = (n: number) => String(n).replace(".", ",");

/** Peut-on viser `target` avec cette attaque ? (portée, ligne de vue, désavantages). Toujours oui sans terrain. */
export function attackCheck(state: CombatState, attacker: Combatant, target: Combatant, attack: AttackDef): TargetCheck {
  if (!state.arena || !attacker.pos || !target.pos) return { ok: true, disadvantage: [], meters: 0 };
  const meters = metersBetween(attacker.pos, target.pos);
  const range = attackRange(attack);
  const disadvantage: string[] = [];
  if (!range) {
    if (cellDistance(attacker.pos, target.pos) > 1) return { ok: false, reason: `Hors de portée (${fm(meters)} m ; corps à corps : 1,5 m)`, disadvantage, meters };
    return { ok: true, disadvantage, meters };
  }
  if (meters > range[1]) return { ok: false, reason: `Hors de portée (${fm(meters)} m ; maximum ${fm(range[1])} m)`, disadvantage, meters };
  if (!hasLineOfSight(state.arena, attacker.pos, target.pos)) return { ok: false, reason: "Pas de ligne de vue", disadvantage, meters };
  if (meters > range[0]) disadvantage.push("longue portée");
  // Une attaque à distance faite au contact d'un ennemi qui peut agir a un désavantage (pas pour un sort de contact).
  if (attack.ranged && state.combatants.some((c) => c.side !== attacker.side && !c.dead && c.pos && !isIncapacitated(c) && cellDistance(c.pos, attacker.pos!) <= 1))
    disadvantage.push("ennemi au contact");
  return { ok: true, disadvantage, meters };
}

/** Une cible peut-elle être visée par un sort de portée `rangeM` ? (distance et ligne de vue) */
export function spellTargetCheck(state: CombatState, caster: Combatant, target: Combatant, rangeM: number | undefined): TargetCheck {
  if (!state.arena || !caster.pos || !target.pos || rangeM === undefined) return { ok: true, disadvantage: [], meters: 0 };
  const meters = metersBetween(caster.pos, target.pos);
  if (meters > rangeM) return { ok: false, reason: `Hors de portée (${fm(meters)} m ; sort : ${fm(rangeM)} m)`, disadvantage: [], meters };
  if (!hasLineOfSight(state.arena, caster.pos, target.pos)) return { ok: false, reason: "Pas de ligne de vue", disadvantage: [], meters };
  return { ok: true, disadvantage: [], meters };
}

/** Cases de déplacement qu'il reste à ce combattant ce tour. */
export function movementLeft(c: Combatant): number {
  if (hasCondition(c, "restrained")) return 0;
  const base = speedCells(c.speed ?? SPEED_DEFAULT) * (c.turnState.dashed ? 2 : 1);
  return Math.max(0, base - (c.turnState.moved ?? 0));
}

export interface MovePlan {
  ok: boolean;
  reason?: string;
  path: Cell[];
  /** Coût en mètres. */
  meters: number;
}

/** Trajet (cases libres uniquement) du combattant vers une case, et ce qu'il coûte. */
export function planMove(state: CombatState, c: Combatant, to: Cell): MovePlan {
  if (!state.arena || !c.pos) return { ok: false, reason: "Pas de terrain.", path: [], meters: 0 };
  if (cellDistance(c.pos, to) === 0) return { ok: false, reason: "Vous y êtes déjà.", path: [], meters: 0 };
  if (occupiedCells(state, c.id).has(cellKey(to))) return { ok: false, reason: "Case occupée.", path: [], meters: 0 };
  const path = pathBetween(state.arena, c.pos, to, occupiedCells(state, c.id));
  if (!path) return { ok: false, reason: "Chemin impossible.", path: [], meters: 0 };
  const meters = path.length * CELL_METERS;
  const left = movementLeft(c);
  if (path.length > left) return { ok: false, reason: `Trop loin : ${fm(meters)} m, il vous reste ${fm(left * CELL_METERS)} m.`, path, meters };
  return { ok: true, path, meters };
}

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

/** Action Foncer : le déplacement de ce tour est doublé. */
export function playerDash(state: CombatState, rng: Rng = Math.random) {
  const cur = assertPlayerTurn(state);
  if (cur.turnState.action) throw new Error("Action déjà utilisée ce tour.");
  cur.turnState.action = true;
  cur.turnState.dashed = true;
  state.log.push(`${cur.name} fonce : déplacement doublé (${fm(movementLeft(cur) * CELL_METERS)} m possibles).`);
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

/** Un ennemi s'approche de sa cible aussi loin que sa vitesse le permet. */
function enemyApproach(state: CombatState, enemy: Combatant, target: Combatant) {
  if (!state.arena || !enemy.pos || !target.pos) return;
  const budget = movementLeft(enemy);
  if (!budget || cellDistance(enemy.pos, target.pos) <= 1) return;
  const occupied = occupiedCells(state, enemy.id);
  let best: Cell[] | null = null;
  for (const d of AROUND) {
    const goal = { x: target.pos.x + d.x, y: target.pos.y + d.y };
    if (occupied.has(cellKey(goal))) continue;
    const path = pathBetween(state.arena, enemy.pos, goal, occupied);
    if (path && (!best || path.length < best.length)) best = path;
  }
  if (!best) return;
  const steps = best.slice(0, budget);
  if (!steps.length) return;
  enemy.pos = steps[steps.length - 1];
  enemy.turnState.moved = (enemy.turnState.moved ?? 0) + steps.length;
  state.log.push(`${enemy.name} s'approche de ${target.name} (${fm(steps.length * CELL_METERS)} m).`);
  pushRoll(state, {
    kind: "move", actorId: enemy.id, actorName: enemy.name, side: enemy.side, title: `${enemy.name} s'approche`,
    sides: 0, dice: [], modifier: 0, total: steps.length * CELL_METERS,
  });
}

/** Cible de l'ennemi : le héros conscient le plus proche (au hasard à égalité). */
function nearestTarget(state: CombatState, enemy: Combatant, pool: Combatant[], rng: Rng): Combatant {
  if (!state.arena || !enemy.pos) return pool[Math.floor(rng() * pool.length)];
  const dist = (c: Combatant) => (c.pos ? cellDistance(enemy.pos!, c.pos) : 99);
  const best = Math.min(...pool.map(dist));
  const near = pool.filter((c) => dist(c) === best);
  return near.length > 1 ? near[Math.floor(rng() * near.length)] : near[0];
}

function enemyTurn(state: CombatState, enemy: Combatant, rng: Rng) {
  const party = state.combatants.filter((c) => c.side === "party" && !c.dead);
  const conscious = party.filter(isConscious);
  const pool = conscious.length ? conscious : party.filter((c) => !c.stable);
  if (!pool.length || !enemy.attacks.length) {
    state.log.push(`${enemy.name} n'a personne à attaquer.`);
    return;
  }
  // Entravé : l'ennemi tente de se libérer (test de Force contre le DD du sort) au lieu d'attaquer.
  const bound = enemy.conditions.find((x) => x.escape);
  if (bound?.escape) {
    const res = rollSave(state, enemy, bound.escape.ability, bound.escape.dc, rng, `${enemy.name} tente de se libérer`);
    if (res.success) removeCondition(state, enemy, bound.id, "il s'est libéré");
    return;
  }
  const target = nearestTarget(state, enemy, pool, rng);
  const attack = enemy.attacks.length > 1 ? enemy.attacks[Math.floor(rng() * enemy.attacks.length)] : enemy.attacks[0];
  if (state.arena) {
    // Sur le terrain : l'ennemi avance d'abord, puis attaque s'il est à portée.
    enemyApproach(state, enemy, target);
    if (!attackCheck(state, enemy, target, attack).ok) {
      state.log.push(`${enemy.name} ne peut pas atteindre ${target.name}.`);
      return;
    }
  }
  resolveAttack(state, enemy, target, attack, rng);
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
    } else if (cur.side === "enemies") {
      enemyTurn(state, cur, rng);
      if (state.pending) return; // le joueur décide d'une réaction
      endOfTurnConditions(state, cur, rng);
      advanceTurn(state);
    } else {
      return; // à vous de jouer
    }
  }
  throw new Error("Boucle de combat anormale.");
}

/** Début du tour : les états à durée en rounds expirent, un combattant à terre se relève (s'il n'est pas neutralisé). */
function startOfTurnConditions(state: CombatState, cur: Combatant) {
  for (const c of state.combatants) {
    const over = c.conditions.filter((x) => x.expiresRound !== undefined && state.round > x.expiresRound);
    for (const o of over) removeCondition(state, c, o.id, "la durée est écoulée");
  }
  if (!cur.dead && hasCondition(cur, "prone") && !isIncapacitated(cur)) removeCondition(state, cur, "prone", "il se relève");
}

/** Fin du tour : fin des états « jusqu'à la fin de votre tour », puis jets de sauvegarde répétés. */
function endOfTurnConditions(state: CombatState, c: Combatant, rng: Rng) {
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

function endTurn(state: CombatState, rng: Rng) {
  endOfTurnConditions(state, currentCombatant(state), rng);
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
  /** Cases de déplacement restantes (absent : pas de terrain). */
  movementCells?: number;
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
    else if (f.id === "potion" && missing > 0) out.push({ id: f.id, label, detail: `${f.uses} dans le sac · 2d4 + 2 PV` });
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
    canEnd: cur.turnState.action || cur.turnState.bonus || (cur.turnState.moved ?? 0) > 0,
    ...(state.arena ? { movementCells: movementLeft(cur) } : {}),
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
  if (state.arena && movementLeft(cur) > 0) return;
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
  const check = attackCheck(state, cur, target, attack);
  if (!check.ok) throw new Error(check.reason);
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
    case "potion": {
      const dice = [rollDie(4, rng), rollDie(4, rng)];
      f.uses -= 1;
      f.max -= 1;
      const healed = healCombatant(state, cur, dice[0] + dice[1] + 2);
      state.log.push(`${cur.name} boit une potion de soin (2d4 + 2 = ${dice[0] + dice[1] + 2}).`);
      pushRoll(state, {
        kind: "heal", actorId: cur.id, actorName: cur.name, side: cur.side, title: `Potion de soin de ${cur.name}`,
        sides: 4, dice, modifier: 2, total: healed, outcome: "success",
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
