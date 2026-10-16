import type { Ability } from "../engine/rules";

/** Conditions que le moteur de combat sait appliquer. */
export type ConditionId = "poisoned" | "prone" | "frightened" | "blinded" | "restrained" | "incapacitated" | "stunned" | "paralyzed";

export interface ConditionDef {
  id: string;
  name: string;
  /** Règle résumée en français (texte original, pas une citation du SRD). */
  text: string;
  /** « applied » : le moteur applique ses effets en combat. */
  status: "applied" | "todo";
  /** Ce que fait (ou ne fait pas) l'application. */
  note: string;
}

/** Les 15 états du SRD 5.2 ; `status` dit ceux que le jeu applique. */
export const CONDITIONS: readonly ConditionDef[] = [
  { id: "blinded", name: "Aveuglé", status: "applied",
    text: "Vous ne voyez rien : vos jets d'attaque ont un désavantage et les jets d'attaque contre vous ont l'avantage.",
    note: "Avantage et désavantage aux attaques." },
  { id: "charmed", name: "Charmé", status: "todo",
    text: "Vous ne pouvez pas attaquer celui qui vous a charmé ni le cibler avec des effets nuisibles ; il a l'avantage à ses tests sociaux contre vous.",
    note: "Pas encore appliqué : aucune source de charme n'est jouable." },
  { id: "deafened", name: "Assourdi", status: "todo",
    text: "Vous n'entendez rien et ratez automatiquement tout test qui demande d'entendre.",
    note: "Pas encore appliqué : aucun effet de combat n'en dépend pour l'instant." },
  { id: "exhaustion", name: "Épuisement", status: "todo",
    text: "Cet état se cumule en niveaux (1 à 6) : chaque niveau retire 2 à tous vos jets de d20 et 1,5 m de vitesse ; au niveau 6, c'est la mort. Un repos long retire un niveau.",
    note: "Pas encore appliqué." },
  { id: "frightened", name: "Effrayé", status: "applied",
    text: "Tant que la source de votre peur est en vue, vos jets d'attaque et vos tests de caractéristique ont un désavantage, et vous ne pouvez pas vous en approcher volontairement.",
    note: "Désavantage à vos attaques (la source est toujours supposée en vue)." },
  { id: "grappled", name: "Agrippé", status: "todo",
    text: "Votre vitesse tombe à 0 et vous avez un désavantage aux attaques contre toute autre cible que celui qui vous agrippe.",
    note: "Pas encore appliqué : demande des positions sur le terrain." },
  { id: "incapacitated", name: "Neutralisé", status: "applied",
    text: "Vous ne pouvez accomplir ni action, ni action bonus, ni réaction, et vous ne pouvez pas vous concentrer.",
    note: "Le tour est passé et la concentration est perdue." },
  { id: "invisible", name: "Invisible", status: "todo",
    text: "On ne vous voit pas sans magie : vos attaques ont l'avantage et celles contre vous ont un désavantage.",
    note: "Pas encore appliqué." },
  { id: "paralyzed", name: "Paralysé", status: "applied",
    text: "Vous êtes neutralisé et immobile, vous ratez automatiquement les jets de sauvegarde de Force et de Dextérité, les attaques contre vous ont l'avantage et tout coup porté au corps à corps est un coup critique.",
    note: "Toutes les attaques sont supposées au corps à corps." },
  { id: "petrified", name: "Pétrifié", status: "todo",
    text: "Vous êtes changé en pierre : neutralisé, immobile, résistant à tous les dégâts, et vous ratez les jets de Force et de Dextérité.",
    note: "Pas encore appliqué." },
  { id: "poisoned", name: "Empoisonné", status: "applied",
    text: "Vos jets d'attaque et vos tests de caractéristique ont un désavantage.",
    note: "Désavantage à vos attaques." },
  { id: "prone", name: "À terre", status: "applied",
    text: "Vous êtes au sol. Vos attaques ont un désavantage. Une attaque contre vous a l'avantage si l'attaquant est au corps à corps, un désavantage s'il est à distance. Vous vous relevez en dépensant la moitié de votre vitesse.",
    note: "Vous vous relevez automatiquement au début de votre tour (sauf si vous êtes neutralisé)." },
  { id: "restrained", name: "Entravé", status: "applied",
    text: "Votre vitesse tombe à 0. Vos attaques ont un désavantage, les attaques contre vous ont l'avantage, et vos jets de sauvegarde de Dextérité ont un désavantage.",
    note: "Un ennemi entravé essaie de se libérer au lieu d'attaquer (test de Force contre le DD du sort)." },
  { id: "stunned", name: "Étourdi", status: "applied",
    text: "Vous êtes neutralisé, vous ratez automatiquement les jets de sauvegarde de Force et de Dextérité, et les attaques contre vous ont l'avantage.",
    note: "Avantage aux attaques contre vous, échec automatique en Force et Dextérité, tour passé." },
  { id: "unconscious", name: "Inconscient", status: "applied",
    text: "Vous êtes neutralisé, à terre, vous ne sentez rien. Les attaques contre vous ont l'avantage, et tout coup porté au corps à corps est un coup critique. Un personnage à 0 PV est inconscient.",
    note: "C'est l'état d'un personnage à 0 PV (jets de mort)." },
];

export const CONDITION_BY_ID: Record<string, ConditionDef> = Object.fromEntries(CONDITIONS.map((c) => [c.id, c]));

/** Condition en cours sur un combattant. */
export interface ActiveCondition {
  id: ConditionId;
  /** D'où elle vient (nom du sort ou de l'attaque), pour le journal. */
  source: string;
  /** Fin à la fin du tour de ce combattant, à ce round (« jusqu'à la fin de votre prochain tour »). */
  until?: { actorId: string; round: number };
  /** Fin automatique après ce round (durée en rounds). */
  expiresRound?: number;
  /** Jet de sauvegarde à la fin de chaque tour du combattant touché ; une réussite met fin à l'état. */
  save?: { ability: Ability; dc: number };
  /** Test de Force (contre ce DD) tenté à la place de l'attaque pour se libérer, pour un ennemi. */
  escape?: { ability: Ability; dc: number };
  /** L'état disparaît quand ce lanceur perd sa concentration. */
  concentrationOf?: string;
  /** Ne disparaît pas tout seul au début du tour (à terre causé par un sort qui neutralise). */
  sticky?: boolean;
}

/** Condition infligée par une attaque ou un sort (la durée est calculée au moment de l'effet). */
export interface ConditionRider {
  condition: ConditionId;
  /** Durée en rounds (absent : jusqu'à la fin du tour suivant du lanceur pour un sort, 10 rounds sinon). */
  rounds?: number;
  /** Jet de sauvegarde de la cible (attaque de monstre ou sort à jet de sauvegarde). */
  save?: { ability: Ability; dc: number };
  /** Après l'effet, nouveau jet de sauvegarde à la fin de chaque tour de la cible. */
  repeatSave?: boolean;
  /** Les cibles qui ont l'un de ces marqueurs (espèce) y échappent. */
  exceptTags?: string[];
  /** La victime peut tenter de s'en libérer (test contre ce DD) en utilisant son action. */
  escape?: { ability: Ability; dc: number };
}
