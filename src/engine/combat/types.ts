/** Types du combat : combattants, attaques, état d'un combat, jets de dés, réactions et capacités. */
import type { Mastery } from "../../data/equipment";
import type { ActiveCondition, ConditionId, ConditionRider } from "../../data/conditions";
import type { Arena } from "../battlefield";
import type { Cell } from "../exploration";
import type { Ability } from "../rules";

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


export interface AttackResult {
  hit: boolean;
  crit: boolean;
  damage: number;
  /** Une réaction est proposée au joueur avant de connaître l'issue (voir `state.pending`). */
  paused?: boolean;
}

/** Jet d'attaque déjà lancé, en attente de la réaction du joueur. */
export interface AttackContext {
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

export interface FeatureChoice {
  /** Cible de la frappe bonus. */
  targetId?: string;
  /** Points à dépenser (imposition des mains). */
  amount?: number;
}
