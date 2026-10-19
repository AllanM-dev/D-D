import { clone } from "./clone";
import { rollD20, rollDie, type AdvantageMode, type Rng } from "./dice";
import { SPELL_BY_ID } from "../data/spells";
import { hasBonusSpell, spellOptionsFor, type SpellOption } from "./spellcasting";
import type { Ability } from "./rules";
import { WEAPONS, type Mastery } from "../data/equipment";
import { CLEARING, freeCellsNear, gridOf, hasLineOfSight, metersBetween, pathBetween, reachableWithin, speedCells, type Arena } from "./battlefield";
import { CELL_METERS, cellDistance, walkable, type Cell } from "./exploration";
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
  /** Style Armes à deux mains : un 1 ou un 2 sur un dé de dégâts compte comme un 3. */
  gwf?: boolean;
  /** Frappe à mains nues (arts martiaux). */
  unarmed?: boolean;
  /** Identifiant de l'arme (données d'équipement), pour les armes. */
  weaponId?: string;
  /** Allonge en cases (2 = 3 m) ; sinon 1. */
  reach?: number;
  /** Arme légère de mêlée : peut être suivie d'une attaque à la seconde arme (action bonus). */
  light?: boolean;
  /** Seconde arme légère utilisable en action bonus après cette attaque. */
  offhand?: { name: string; toHit: number; damage: DamageDice; damageType: string; ability?: Ability };
  /** Dégâts supplémentaires sur un jet de sauvegarde de la cible (poison d'araignée) : moitié en cas de réussite. */
  saveDamage?: { ability: Ability; dc: number; dice: [number, number]; damageType: string };
  /** Effet de maîtrise d'arme (si le personnage maîtrise cette arme). */
  mastery?: Mastery;
  /** Arme éligible à l'Attaque sournoise (finesse ou à distance). */
  sneak?: boolean;
  /** Attaque impossible avec l'équipement actuel (raison). */
  blocked?: string;
  /** Désavantage permanent à cause de l'équipement (arme lourde sans la Force requise…). */
  penalty?: string;
}

/** Capacités de classe utilisables en combat (toutes en action bonus). */
export type FeatureId =
  | "second-wind" | "rage" | "lay-on-hands" | "innate-sorcery" | "martial-arts" | "potion" | "offhand" | "bardic-inspiration"
  // niveau 2
  | "action-surge" | "reckless" | "cunning-action" | "focus" | "sorcery-points";
/** Choix proposés au joueur : les capacités, plus les usages de Concentration du moine, d'Action ruse et de Source de magie. */
export type FeatureOptionId = FeatureId | "flurry" | "patient-defense" | "step-of-wind" | "cunning-dash" | "cunning-disengage" | "font-slot" | "font-points";

export interface FeatureUse {
  id: FeatureId;
  /** Utilisations restantes (pour l'imposition des mains : points de la réserve). */
  uses: number;
  max: number;
  /** Utilisable sans limite (frappe bonus des arts martiaux). */
  unlimited?: boolean;
}

export const FEATURE_LABELS: Record<FeatureOptionId, string> = {
  "second-wind": "Second souffle",
  rage: "Rage",
  "lay-on-hands": "Imposition des mains",
  "innate-sorcery": "Magie innée",
  "martial-arts": "Frappe bonus (arts martiaux)",
  potion: "Boire une potion de soin",
  offhand: "Attaque à la seconde arme",
  "bardic-inspiration": "Inspiration bardique",
  "action-surge": "Fougue",
  reckless: "Attaque téméraire",
  "cunning-action": "Action ruse",
  focus: "Points de concentration",
  "sorcery-points": "Points de sorcellerie",
  flurry: "Déluge de coups",
  "patient-defense": "Défense patiente",
  "step-of-wind": "Pas du vent",
  "cunning-dash": "Action ruse : foncer",
  "cunning-disengage": "Action ruse : se désengager",
  "font-slot": "Créer un emplacement de sort",
  "font-points": "Convertir un emplacement en point",
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
  /** Invocation occulte de l'occultiste (Décharge agonisante, Lance occulte). */
  invocations?: string[];
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
  /** Cible touchée au corps à corps par une arme ce tour (Châtiment divin). */
  lastHit?: string;
  /** Fougue déjà utilisée ce tour. */
  surged?: boolean;
  /** Seconde arme légère utilisable en action bonus (après une attaque avec une arme légère). */
  offhand?: AttackDef["offhand"];
  /** Attaque sournoise déjà utilisée ce tour. */
  sneakUsed?: boolean;
  /** Enchaînement déjà utilisé ce tour. */
  cleaved?: boolean;
  /** La seconde arme (Entaille) ne coûte pas l'action bonus. */
  offhandFree?: boolean;
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
  /** Un ennemi qui a pris la fuite sort du combat (compté comme hors de combat, sans butin). */
  fled?: boolean;
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
  /** Expérience que vaut ce monstre s'il est vaincu. */
  xp?: number;
  /** Clé d'illustration (`class:fighter`, `monster:goblin`…). */
  art?: string;
  /** Clé du personnage 2D affiché sur les cartes (`hero:elf:wizard`, `monster:goblin`). */
  sprite?: string;
  spellcasting?: Spellcasting;
  /** Sort de concentration en cours. */
  concentrating?: { spellId: string };
  mark?: Mark;
  /** Bonus de CA d'un sort (Bouclier de la foi), à retirer quand il se termine. */
  acBonus: number;
  /** Attaque téméraire : avantage à ses attaques de Force au corps à corps, et avantage aux attaques contre lui, jusqu'au début de son prochain tour. */
  reckless?: boolean;
  /** Sens du danger (barbare niveau 2) : avantage aux jets de sauvegarde de Dextérité. */
  dangerSense?: boolean;
  /** Éclair guidé : la prochaine attaque contre ce combattant a l'avantage. */
  guided: boolean;
  guidedUntilRound: number;
  /** Moquerie cruelle : désavantage à sa prochaine attaque. */
  mocked: boolean;
  /** Dés de l'Attaque sournoise (d6). */
  sneakDice?: number;
  /** Dé d'Inspiration bardique en réserve (faces) : ajouté à un jet d'attaque ou de sauvegarde raté s'il le réussit. */
  inspiration?: number;
  /** Bénédiction : +1d4 aux jets d'attaque et de sauvegarde tant que la concentration dure. */
  blessed?: boolean;
  /** Cible de la Gêne (maîtrise Vex) : avantage à la prochaine attaque contre elle. */
  vexTargetId?: string;
  vexUntilRound?: number;
  /** Ralenti (maîtrise Ralentissement) : −3 m de vitesse jusqu'à la fin de ce round. */
  slowedUntilRound?: number;
  /** Capacités propres aux monstres. */
  traits?: MonsterTrait[];
  /** Porte une armure ou un bouclier qu'il ne maîtrise pas : désavantage aux attaques, aucun sort. */
  untrainedArmor?: boolean;
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

/** Capacités de monstres gérées par le moteur. */
export type MonsterTrait = "pack-tactics" | "undead-fortitude" | "aggressive" | "archer" | "coward";

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
  Partial<Pick<Combatant, "hp" | "level" | "features" | "art" | "sprite" | "dangerSense" | "xp" | "spellcasting" | "saveMods" | "tags" | "immunities" | "pos" | "speed" | "untrainedArmor" | "sneakDice" | "traits">>;

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
  /** L'attaque a l'avantage (net) : condition de l'Attaque sournoise. */
  advantaged?: boolean;
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
  if (!sc || c.side !== "party" || !isConscious(c) || isIncapacitated(c) || c.turnState.reaction || c.untrainedArmor) return [];
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
  // Gêne (maîtrise Vex) et tactique de meute (monstres).
  const vexed = attacker.vexTargetId === target.id && (attacker.vexUntilRound ?? 0) >= state.round;
  const pack = !!attacker.traits?.includes("pack-tactics") && !!state.arena && !!target.pos &&
    state.combatants.some((a) => a.side === attacker.side && a.id !== attacker.id && !a.dead && !isIncapacitated(a) && a.pos && cellDistance(a.pos, target.pos!) <= 1);
  // Attaque téméraire : avantage à ses attaques de Force au corps à corps, et avantage à ceux qui l'attaquent.
  const recklessAttack = !!attacker.reckless && melee && attack.ability === "STR";
  const recklessExposed = !!target.reckless;
  const advantage = (unconscious && melee) || (attacker.innateSorcery && !!attack.spell) || guidedAdvantage || vexed || pack || recklessAttack || recklessExposed || cm.advantage.length > 0;
  // Désavantage : cible qui esquive, attaquant visé par Moquerie cruelle, ou états (empoisonné, effrayé…).
  const rangeDis = attackCheck(state, attacker, target, attack).disadvantage;
  const disadvantage = target.dodging || attacker.mocked || cm.disadvantage.length > 0 || rangeDis.length > 0;
  const reasons = [
    advantage && !disadvantage ? `Avantage : ${[unconscious && melee ? "cible inconsciente" : "", attacker.innateSorcery && attack.spell ? "Magie innée" : "", guidedAdvantage ? "cible éclairée" : "", vexed ? "gêne (maîtrise)" : "", pack ? "tactique de meute" : "", recklessAttack ? "attaque téméraire" : "", recklessExposed ? "cible téméraire" : "", ...cm.advantage].filter(Boolean).join(", ")}` : "",
    disadvantage && !advantage ? `Désavantage : ${[target.dodging ? "cible qui esquive" : "", attacker.mocked ? "moquerie" : "", ...cm.disadvantage, ...rangeDis].filter(Boolean).join(", ")}` : "",
    advantage && disadvantage ? "Avantage et désavantage s'annulent" : "",
  ].filter(Boolean);
  if (guidedAdvantage) target.guided = false;
  if (vexed) attacker.vexTargetId = undefined;
  if (attacker.mocked) attacker.mocked = false;
  if (advantage && !disadvantage) mode = "advantage";
  else if (disadvantage && !advantage) mode = "disadvantage";

  const roll = rollD20(attack.toHit, mode, rng);
  const ctx: AttackContext = {
    attackerId: attacker.id, targetId: target.id, attack, reasons, melee, advantaged: advantage && !disadvantage,
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
  // Bénédiction : +1d4 au jet d'attaque.
  const bless = attacker.blessed && attacker.side === "party" && !roll.fumble ? rollDie(4, rng) : 0;
  let hit = roll.critical || (!roll.fumble && roll.total + bless >= target.ac);
  // Inspiration bardique : le dé en réserve est ajouté à un jet raté, s'il le fait réussir.
  let inspired = 0;
  if (!hit && !roll.fumble && attacker.inspiration && attacker.side === "party") {
    const die = rollDie(attacker.inspiration, rng);
    if (roll.total + bless + die >= target.ac) {
      hit = true;
      inspired = die;
      attacker.inspiration = undefined;
    }
  }
  if (hit && attacker.side === "party" && melee && !attack.spell) attacker.turnState.lastHit = target.id;
  const shownTotal = roll.total + bless + inspired;
  const label = `${attacker.name} attaque ${target.name} (${attack.name}) : ${roll.natural}${attack.toHit >= 0 ? "+" : ""}${attack.toHit}${bless ? ` + ${bless} (Bénédiction)` : ""}${inspired ? ` + ${inspired} (inspiration bardique)` : ""} = ${shownTotal} contre CA ${target.ac}`;
  // Un coup au corps à corps contre une cible inconsciente est toujours un critique.
  const paralyzed = hasCondition(target, "paralyzed");
  const crit = hit && (roll.critical || ((unconscious || paralyzed) && melee));
  const attackRoll: RollInit = {
    kind: "attack", actorId: attacker.id, actorName: attacker.name, side: attacker.side,
    title: `${attacker.name} attaque ${target.name} (${attack.name})`,
    sides: 20, dice: roll.rolls, keptIndex: roll.rolls.indexOf(roll.natural), modifier: attack.toHit,
    total: shownTotal, dc: target.ac, outcome: roll.fumble ? "fumble" : !hit ? "miss" : crit ? "crit" : "hit",
    ...(reasons.length || inspired || bless ? { note: [...reasons, ...(bless ? [`Bénédiction +${bless}`] : []), ...(inspired ? [`Inspiration bardique +${inspired}`] : [])].join(" · ") } : {}),
  };
  if (!hit) {
    state.log.push(`${label} — raté.`);
    pushRoll(state, attackRoll);
    // Maîtrise Écorchure : même sur un coup raté, le modificateur de caractéristique est infligé.
    if (attack.mastery === "graze" && attacker.side === "party" && attack.damage.bonus > 0 && !target.dead) {
      const g = attack.damage.bonus;
      state.log.push(`Écorchure : ${g} dégâts malgré l'échec (${attack.damageType}).`);
      applyDamage(state, target, g, false);
      pushRoll(state, {
        kind: "damage", actorId: attacker.id, actorName: attacker.name, side: attacker.side, title: `Écorchure : dégâts (${attack.damageType})`,
        sides: 0, dice: [], modifier: g, total: g, outcome: "hit",
      });
    }
    return { hit: false, crit: false, damage: 0 };
  }
  pushRoll(state, attackRoll); // état et journal d'avant les dégâts
  // Rage : +2 aux dégâts des attaques de Force.
  const rageBonus = attacker.raging && attack.ability === "STR" ? RAGE_DAMAGE : 0;
  const damageDef = rageBonus ? { ...attack.damage, bonus: attack.damage.bonus + rageBonus } : attack.damage;
  const { dice, total: rolled } = rollDamageDetailed(damageDef, crit, rng, attack.gwf ? 3 : 1);
  // Rage : résistance aux dégâts contondants, perforants et tranchants (moitié, arrondie à l'inférieur).
  const resisted = target.raging && RAGE_RESISTED.includes(attack.damageType);
  const damage = resisted ? Math.floor(rolled / 2) : rolled;
  const notes = [rageBonus ? `rage +${rageBonus}` : "", resisted ? "réduits de moitié par la rage" : ""].filter(Boolean);
  state.log.push(
    damage === 0 && attack.damage.count === 0 ? `${label} — touché.` : `${label} — ${crit ? "coup critique" : "touché"} : ${damage} dégâts (${attack.damageType}${notes.length ? ", " + notes.join(", ") : ""}).`,
  );
  applyDamage(state, target, damage, crit);
  pushRoll(state, {
    kind: "damage", actorId: attacker.id, actorName: attacker.name, side: attacker.side,
    title: `Dégâts de ${attacker.name} (${attack.damageType})`,
    sides: attack.damage.sides, dice, modifier: damageDef.bonus, total: damage, outcome: crit ? "crit" : "hit",
    ...(resisted ? { rolled, note: "réduits de moitié (résistance de la rage)" } : {}),
  });
  let total = damage;
  // Robustesse des morts-vivants : à 0 PV, jet de Constitution pour rester à 1 PV (sauf dégâts radiants ou coup critique).
  if (target.dead && target.traits?.includes("undead-fortitude") && attack.damageType !== "radiant" && !crit) {
    const r = rollSave(state, target, "CON", 5 + damage, rng, `${target.name} : robustesse des morts-vivants`);
    if (r.success) {
      target.dead = false;
      target.hp = 1;
      state.log.push(`${target.name} refuse de tomber : il reste à 1 PV.`);
    }
  }

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

  // Attaque sournoise : une fois par tour, arme à finesse ou à distance, avec l'avantage.
  if (attacker.sneakDice && attack.sneak && ctx.advantaged && !attacker.turnState.sneakUsed && !target.dead) {
    attacker.turnState.sneakUsed = true;
    const extra = rollDamageDetailed({ count: attacker.sneakDice, sides: 6, bonus: 0 }, crit, rng);
    state.log.push(`Attaque sournoise : ${extra.total} dégâts supplémentaires.`);
    applyDamage(state, target, extra.total, crit);
    pushRoll(state, {
      kind: "damage", actorId: attacker.id, actorName: attacker.name, side: attacker.side, title: `Attaque sournoise : dégâts supplémentaires (${attack.damageType})`,
      sides: 6, dice: extra.dice, modifier: 0, total: extra.total, outcome: crit ? "crit" : "hit",
    });
    total += extra.total;
  }
  // Effet de maîtrise d'arme.
  if (attack.mastery && attacker.side === "party" && !target.dead) applyMastery(state, attacker, target, attack, rng);

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
        ...(rider.escape ? { escape: rider.escape } : {}),
        ...(rider.repeatSave && save ? { save } : {}),
      });
    }
  }
  // Dégâts supplémentaires sur jet de sauvegarde (poison).
  const sd = attack.saveDamage;
  if (sd && !target.dead && target.hp > 0) {
    const r = rollSave(state, target, sd.ability, sd.dc, rng, `${target.name} : sauvegarde de ${ABILITY_FR[sd.ability]} contre ${attack.name}`);
    const dmg = rollDamageDetailed({ count: sd.dice[0], sides: sd.dice[1], bonus: 0 }, false, rng);
    const amount = r.success ? Math.floor(dmg.total / 2) : dmg.total;
    state.log.push(`${attack.name} : ${amount} dégâts supplémentaires (${sd.damageType})${r.success ? ", moitié car le jet est réussi" : ""}.`);
    applyDamage(state, target, amount, false);
    pushRoll(state, {
      kind: "damage", actorId: attacker.id, actorName: attacker.name, side: attacker.side, title: `${attack.name} : dégâts (${sd.damageType})`,
      sides: sd.dice[1], dice: dmg.dice, modifier: 0, total: amount, outcome: "hit", ...(r.success ? { rolled: dmg.total, note: "moitié : jet de sauvegarde réussi" } : {}),
    });
    total += amount;
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

/** Effets des maîtrises d'armes (2024) : appliqués quand l'attaque touche avec une arme maîtrisée. */
function applyMastery(state: CombatState, attacker: Combatant, target: Combatant, attack: AttackDef, rng: Rng) {
  switch (attack.mastery) {
    case "vex":
      attacker.vexTargetId = target.id;
      attacker.vexUntilRound = state.round + 1;
      state.log.push(`Gêne : ${attacker.name} aura l'avantage à sa prochaine attaque contre ${target.name}.`);
      break;
    case "sap":
      target.mocked = true;
      state.log.push(`Sape : ${target.name} aura un désavantage à sa prochaine attaque.`);
      break;
    case "slow":
      target.slowedUntilRound = state.round + 1;
      state.log.push(`Ralentissement : la vitesse de ${target.name} baisse de 3 m jusqu'à votre prochain tour.`);
      break;
    case "topple": {
      const r = rollSave(state, target, "CON", 8 + attack.toHit, rng, `${target.name} : sauvegarde de Constitution contre le renversement`);
      if (!r.success) applyCondition(state, target, { id: "prone", source: `${attack.name} (renversement)` });
      break;
    }
    case "push": {
      if (!state.arena || !attacker.pos || !target.pos) break;
      const dx = Math.sign(target.pos.x - attacker.pos.x), dy = Math.sign(target.pos.y - attacker.pos.y);
      const occupied = occupiedCells(state, target.id);
      const grid = gridOf(state.arena);
      let pos = target.pos;
      for (let i = 0; i < 2; i++) {
        const n = { x: pos.x + dx, y: pos.y + dy };
        if (!walkable(grid, n) || occupied.has(cellKey(n))) break;
        pos = n;
      }
      if (pos !== target.pos) {
        target.pos = pos;
        state.log.push(`Poussée : ${target.name} est repoussé de ${fm(cellDistance(pos, attacker.pos) * CELL_METERS - CELL_METERS)} m.`);
      }
      break;
    }
    case "cleave": {
      if (!state.arena || attack.ranged || attacker.turnState.cleaved || !target.pos || !attacker.pos) break;
      const reach = attack.reach ?? 1;
      const other = state.combatants.find(
        (c) => c.side !== attacker.side && !c.dead && c.id !== target.id && c.pos && cellDistance(c.pos, target.pos!) <= 1 && cellDistance(c.pos, attacker.pos!) <= reach,
      );
      if (!other) break;
      attacker.turnState.cleaved = true;
      state.log.push(`Enchaînement : ${attacker.name} frappe aussi ${other.name}.`);
      resolveAttack(state, attacker, other, { ...attack, name: `${attack.name} (enchaînement)`, mastery: undefined, damage: { ...attack.damage, bonus: Math.min(0, attack.damage.bonus) } }, rng);
      break;
    }
    default:
      break; // Entaille (nick) : voir la seconde arme
  }
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
  if (attack.blocked) return { ok: false, reason: attack.blocked, disadvantage: [], meters: 0 };
  // Désavantages venant de l'équipement (arme lourde sans la Force requise, armure non maîtrisée).
  const gear = [...(attack.penalty ? [attack.penalty] : []), ...(attacker.untrainedArmor ? ["armure non maîtrisée"] : [])];
  if (!state.arena || !attacker.pos || !target.pos) return { ok: true, disadvantage: gear, meters: 0 };
  const meters = metersBetween(attacker.pos, target.pos);
  const range = attackRange(attack);
  const disadvantage: string[] = [...gear];
  if (!range) {
    const reach = attack.reach ?? 1;
    if (cellDistance(attacker.pos, target.pos) > reach) return { ok: false, reason: `Hors de portée (${fm(meters)} m ; corps à corps : ${fm(reach * CELL_METERS)} m)`, disadvantage, meters };
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
export function movementLeft(c: Combatant, state?: CombatState): number {
  if (hasCondition(c, "restrained")) return 0;
  // Ralenti (maîtrise d'arme) : −3 m de vitesse.
  const slowed = !!state && c.slowedUntilRound !== undefined && state.round <= c.slowedUntilRound;
  const base = speedCells((c.speed ?? SPEED_DEFAULT) - (slowed ? 3 : 0)) * (c.turnState.dashed ? 2 : 1);
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
  const left = movementLeft(c, state);
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

/** Un ennemi s'approche de sa cible aussi loin que sa vitesse le permet. */
function enemyApproach(state: CombatState, enemy: Combatant, target: Combatant, attack?: AttackDef) {
  if (!state.arena || !enemy.pos || !target.pos) return;
  const budget = movementLeft(enemy, state);
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
  let steps = best.slice(0, budget);
  // Un tireur s'arrête dès qu'il peut viser (il n'a pas besoin d'aller au contact).
  if (attack && attackRange(attack)) {
    const from = enemy.pos;
    const stop = steps.findIndex((c) => { enemy.pos = c; return attackCheck(state, enemy, target, attack).ok; });
    enemy.pos = from;
    if (stop >= 0) steps = steps.slice(0, stop + 1);
  }
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

/** Attaques à distance d'un ennemi (celles qui entravent, comme la toile, ont leur propre usage). */
const rangedAttacks = (e: Combatant) => e.attacks.filter((a) => attackRange(a) && a.rider?.condition !== "restrained");

const moveEvent = (state: CombatState, enemy: Combatant, title: string, cells: number) =>
  pushRoll(state, { kind: "move", actorId: enemy.id, actorName: enemy.name, side: enemy.side, title, sides: 0, dice: [], modifier: 0, total: cells * CELL_METERS });

/** Distance (en cases) du héros le plus proche. */
const nearestHeroDistance = (pool: Combatant[], c: Cell) => Math.min(...pool.map((p) => (p.pos ? cellDistance(c, p.pos) : 99)));

/**
 * Un ennemi gravement blessé prend la fuite (Foncer vers la case la plus éloignée du héros) et sort du combat
 * quand il est loin ou hors de vue. Renvoie faux s'il est coincé : il se bat alors.
 */
function enemyFlee(state: CombatState, enemy: Combatant, pool: Combatant[]): boolean {
  if (!state.arena || !enemy.pos) return false;
  const budget = speedCells(enemy.speed ?? SPEED_DEFAULT) * 2 - (enemy.turnState.moved ?? 0);
  if (hasCondition(enemy, "restrained") || budget <= 0) return false;
  const here = nearestHeroDistance(pool, enemy.pos);
  const best = reachableWithin(state.arena, enemy.pos, budget, occupiedCells(state, enemy.id))
    .sort((a, b) => nearestHeroDistance(pool, b.cell) - nearestHeroDistance(pool, a.cell) || a.steps - b.steps)[0];
  if (!best || nearestHeroDistance(pool, best.cell) <= here) return false;
  enemy.pos = best.cell;
  enemy.turnState.moved = (enemy.turnState.moved ?? 0) + best.steps;
  state.log.push(`${enemy.name}, grièvement blessé, prend la fuite (${fm(best.steps * CELL_METERS)} m).`);
  moveEvent(state, enemy, `${enemy.name} s'enfuit`, best.steps);
  const arena = state.arena;
  if (nearestHeroDistance(pool, enemy.pos) >= 8 || pool.every((p) => !p.pos || !hasLineOfSight(arena, p.pos, enemy.pos!))) {
    enemy.dead = true;
    enemy.fled = true;
    state.log.push(`${enemy.name} s'enfuit et disparaît dans la nature.`);
  }
  return true;
}

/** Un archer au contact recule vers la case d'où il peut encore tirer et qui est la plus éloignée du héros. */
function enemyKite(state: CombatState, enemy: Combatant, target: Combatant, shot: AttackDef) {
  if (!state.arena || !enemy.pos || !target.pos) return;
  const budget = movementLeft(enemy, state);
  if (!budget) return;
  const from = enemy.pos;
  const options = reachableWithin(state.arena, from, budget, occupiedCells(state, enemy.id)).filter(({ cell }) => {
    enemy.pos = cell;
    const ok = attackCheck(state, enemy, target, shot).ok;
    enemy.pos = from;
    return ok;
  }).sort((a, b) => cellDistance(b.cell, target.pos!) - cellDistance(a.cell, target.pos!) || a.steps - b.steps);
  const best = options[0];
  if (!best || cellDistance(best.cell, target.pos) <= cellDistance(from, target.pos)) return;
  enemy.pos = best.cell;
  enemy.turnState.moved = (enemy.turnState.moved ?? 0) + best.steps;
  state.log.push(`${enemy.name} recule pour garder ses distances (${fm(best.steps * CELL_METERS)} m).`);
  moveEvent(state, enemy, `${enemy.name} recule`, best.steps);
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
  // Lâche : à un quart de ses PV ou moins, il fuit s'il le peut.
  if (state.arena && enemy.traits?.includes("coward") && enemy.hp <= enemy.maxHp / 4 && enemyFlee(state, enemy, pool)) return;
  const target = nearestTarget(state, enemy, pool, rng);
  // Une attaque qui entrave (toile) est lancée de loin sur une cible libre ; sinon une attaque au hasard parmi celles de mêlée.
  const netter = enemy.attacks.find((a) => a.rider?.condition === "restrained");
  const melee = enemy.attacks.filter((a) => !attackRange(a) && a.rider?.condition !== "restrained");
  const ranged = rangedAttacks(enemy);
  let attack = netter && !hasCondition(target, "restrained") && state.arena && enemy.pos && target.pos && cellDistance(enemy.pos, target.pos) > 1 && attackCheck(state, enemy, target, netter).ok
    ? netter
    : (melee.length > 1 ? melee[Math.floor(rng() * melee.length)] : melee[0] ?? enemy.attacks[0]);
  // Tireur : à distance il tire plutôt que de s'approcher ; au contact, un archer recule d'abord pour tirer.
  if (state.arena && enemy.pos && target.pos && ranged.length && attack !== netter) {
    const archer = enemy.traits?.includes("archer");
    if (archer && cellDistance(enemy.pos, target.pos) <= 1) enemyKite(state, enemy, target, ranged[0]);
    const adjacent = cellDistance(enemy.pos, target.pos) <= 1;
    const shot = ranged.find((a) => attackCheck(state, enemy, target, a).ok);
    if (shot && (!adjacent || (archer && !melee.length))) attack = shot;
    else if (!shot && (archer || !melee.length)) attack = ranged[0]; // il s'approche jusqu'à pouvoir tirer
  }
  if (state.arena) {
    // Sur le terrain : l'ennemi avance d'abord (sauf s'il peut déjà viser), puis attaque s'il est à portée.
    if (!attackCheck(state, enemy, target, attack).ok) {
      enemyApproach(state, enemy, target, attack);
      // Agressif : une seconde course, en action bonus, vers l'adversaire.
      if (enemy.traits?.includes("aggressive") && !attackCheck(state, enemy, target, attack).ok && enemy.pos) {
        enemy.turnState.moved = Math.max(0, (enemy.turnState.moved ?? 0) - speedCells(enemy.speed ?? SPEED_DEFAULT));
        enemyApproach(state, enemy, target);
      }
    }
    // Pas encore au contact après sa course : il tire s'il le peut.
    if (!attackCheck(state, enemy, target, attack).ok) attack = ranged.find((a) => attackCheck(state, enemy, target, a).ok) ?? attack;
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
/** Points de concentration (moine) ou de sorcellerie (ensorceleur) restants. */
const points = (c: Combatant, id: "focus" | "sorcery-points") => feature(c, id)?.uses ?? 0;
const hasUses = (f: FeatureUse | undefined): f is FeatureUse => !!f && (!!f.unlimited || f.uses > 0);

export interface FeatureOption {
  id: FeatureOptionId;
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
  if (c.side !== "party" || !isConscious(c)) return [];
  const out: FeatureOption[] = [];
  // Entaille : la seconde arme ne coûte pas l'action bonus, même si elle est déjà prise.
  const bonusFree = !c.turnState.bonus;
  const missing = c.maxHp - c.hp;
  const enemiesAlive = state.combatants.some((x) => x.side === "enemies" && !x.dead);
  for (const f of bonusFree ? c.features : []) {
    if (!hasUses(f)) continue;
    const label = FEATURE_LABELS[f.id];
    if (f.id === "second-wind" && missing > 0) out.push({ id: f.id, label, detail: `${f.uses}/${f.max} · 1d10 + niveau PV` });
    else if (f.id === "lay-on-hands" && missing > 0) out.push({ id: f.id, label, detail: `réserve ${f.uses}/${f.max} PV`, amountMax: Math.min(f.uses, missing) });
    else if (f.id === "potion" && missing > 0) out.push({ id: f.id, label, detail: `${f.uses} dans le sac · 2d4 + 2 PV` });
    else if (f.id === "bardic-inspiration" && !c.inspiration) out.push({ id: f.id, label, detail: `${f.uses}/${f.max} · dé d'inspiration d6` });
    else if (f.id === "rage" && !c.raging) out.push({ id: f.id, label, detail: `${f.uses}/${f.max}` });
    else if (f.id === "innate-sorcery" && !c.innateSorcery) out.push({ id: f.id, label, detail: `${f.uses}/${f.max}` });
    else if (f.id === "martial-arts" && c.turnState.attacked && enemiesAlive && c.attacks.some((a) => a.unarmed))
      out.push({ id: f.id, label, detail: "après l'action Attaquer", needsTarget: true });
  }
  // Fougue : une action de plus ce tour, quand la première est dépensée.
  const surge = feature(c, "action-surge");
  if (hasUses(surge) && c.turnState.action && !c.turnState.surged) out.push({ id: "action-surge", label: FEATURE_LABELS["action-surge"], detail: `${surge.uses}/${surge.max} · une action de plus` });
  // Attaque téméraire : avant la première attaque du tour, sans coûter d'action.
  if (feature(c, "reckless") && !c.turnState.action && !c.turnState.attacked && !c.reckless) out.push({ id: "reckless", label: FEATURE_LABELS.reckless, detail: "avantage à vos attaques de Force, et aux attaques contre vous" });
  if (bonusFree) {
    // Action ruse (roublard).
    if (feature(c, "cunning-action")) {
      if (!c.turnState.dashed) out.push({ id: "cunning-dash", label: FEATURE_LABELS["cunning-dash"], detail: "action bonus" });
      if (!c.turnState.disengaged) out.push({ id: "cunning-disengage", label: FEATURE_LABELS["cunning-disengage"], detail: "action bonus" });
    }
    // Concentration (moine) : un point pour chaque usage.
    const focus = points(c, "focus");
    if (feature(c, "focus") && focus > 0) {
      if (c.turnState.attacked && enemiesAlive && c.attacks.some((a) => a.unarmed))
        out.push({ id: "flurry", label: FEATURE_LABELS.flurry, detail: `1 point (${focus} restant${focus > 1 ? "s" : ""}) · deux frappes à mains nues`, needsTarget: true });
      if (!c.dodging) out.push({ id: "patient-defense", label: FEATURE_LABELS["patient-defense"], detail: `1 point (${focus} restant${focus > 1 ? "s" : ""}) · esquive` });
      if (!c.turnState.dashed || !c.turnState.disengaged) out.push({ id: "step-of-wind", label: FEATURE_LABELS["step-of-wind"], detail: `1 point (${focus} restant${focus > 1 ? "s" : ""}) · foncer et se désengager` });
    }
    // Source de magie (ensorceleur) : convertir des emplacements de sort et des points de sorcellerie.
    const sp = feature(c, "sorcery-points");
    const slots = c.spellcasting?.slots;
    if (sp && slots) {
      if (sp.uses >= 2 && slots.used > 0) out.push({ id: "font-slot", label: FEATURE_LABELS["font-slot"], detail: `2 points (${sp.uses}/${sp.max}) → 1 emplacement de niveau 1` });
      if (sp.uses < sp.max && slots.used < slots.max) out.push({ id: "font-points", label: FEATURE_LABELS["font-points"], detail: `1 emplacement de niveau 1 → 1 point (${sp.uses}/${sp.max})` });
    }
  }
  // Combat à deux armes : après une attaque avec une arme légère, une attaque avec une seconde arme légère.
  const off = c.turnState.offhand;
  if (off && enemiesAlive && (bonusFree || c.turnState.offhandFree)) out.push({ id: "offhand", label: FEATURE_LABELS.offhand, detail: `${off.name}, sans modificateur aux dégâts`, needsTarget: true });
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
export function useFeature(state: CombatState, id: FeatureOptionId, rng: Rng = Math.random, choice: FeatureChoice = {}) {
  const cur = assertPlayerTurn(state);
  const option = availableBonus(state, cur).find((o) => o.id === id);
  if (!option) throw new Error(`${FEATURE_LABELS[id]} n'est pas utilisable maintenant.`);
  const f = feature(cur, id as FeatureId)!;

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
    case "bardic-inspiration":
      f.uses -= 1;
      cur.inspiration = 6;
      state.log.push(`${cur.name} se donne un dé d'inspiration bardique (d6) : il sera ajouté à un jet d'attaque ou de sauvegarde raté.`);
      break;
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
    case "offhand": {
      const target = enemyTarget(state, choice.targetId ?? "");
      const off = cur.turnState.offhand!;
      const strike: AttackDef = { name: off.name, toHit: off.toHit, damage: off.damage, damageType: off.damageType, ranged: false, ability: off.ability, light: true };
      const check = attackCheck(state, cur, target, strike);
      if (!check.ok) throw new Error(check.reason);
      if (!cur.turnState.offhandFree) cur.turnState.bonus = true;
      cur.turnState.offhand = undefined;
      cur.turnState.offhandFree = false;
      resolveAttack(state, cur, target, strike, rng);
      afterPlayerAction(state, rng);
      return;
    }
    case "action-surge":
      f.uses -= 1;
      cur.turnState.action = false;
      cur.turnState.surged = true;
      state.log.push(`${cur.name} puise dans ses réserves : une action de plus ce tour (Fougue).`);
      break;
    case "reckless":
      cur.reckless = true;
      state.log.push(`${cur.name} attaque sans se protéger : avantage à ses attaques de Force au corps à corps, mais aussi aux attaques contre lui jusqu'à son prochain tour.`);
      break;
    case "cunning-dash":
      cur.turnState.bonus = true;
      cur.turnState.dashed = true;
      state.log.push(`${cur.name} fonce (Action ruse) : déplacement doublé (${fm(movementLeft(cur, state) * CELL_METERS)} m possibles).`);
      break;
    case "cunning-disengage":
      cur.turnState.bonus = true;
      cur.turnState.disengaged = true;
      state.log.push(`${cur.name} se désengage (Action ruse) : aucune attaque d'opportunité ce tour.`);
      break;
    case "patient-defense":
      feature(cur, "focus")!.uses -= 1;
      cur.turnState.bonus = true;
      cur.dodging = true;
      state.log.push(`${cur.name} adopte la Défense patiente : désavantage aux attaques contre lui jusqu'à son prochain tour.`);
      break;
    case "step-of-wind":
      feature(cur, "focus")!.uses -= 1;
      cur.turnState.bonus = true;
      cur.turnState.dashed = true;
      cur.turnState.disengaged = true;
      state.log.push(`${cur.name} file comme le vent : il fonce et se désengage (${fm(movementLeft(cur, state) * CELL_METERS)} m possibles).`);
      break;
    case "flurry": {
      const target = enemyTarget(state, choice.targetId ?? "");
      const strike = cur.attacks.find((a) => a.unarmed)!;
      const check = attackCheck(state, cur, target, strike);
      if (!check.ok) throw new Error(check.reason);
      feature(cur, "focus")!.uses -= 1;
      cur.turnState.bonus = true;
      state.log.push(`${cur.name} se lance dans un déluge de coups !`);
      resolveAttack(state, cur, target, strike, rng);
      if (!target.dead && state.status === "ongoing") resolveAttack(state, cur, target, strike, rng);
      afterPlayerAction(state, rng);
      return;
    }
    case "font-slot": {
      const sc = cur.spellcasting!;
      feature(cur, "sorcery-points")!.uses -= 2;
      sc.slots.used -= 1;
      cur.turnState.bonus = true;
      state.log.push(`${cur.name} transforme 2 points de sorcellerie en un emplacement de sort de niveau 1.`);
      break;
    }
    case "font-points": {
      const sc = cur.spellcasting!;
      feature(cur, "sorcery-points")!.uses += 1;
      sc.slots.used += 1;
      cur.turnState.bonus = true;
      state.log.push(`${cur.name} convertit un emplacement de sort de niveau 1 en 1 point de sorcellerie.`);
      break;
    }
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
