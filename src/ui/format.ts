import type { Ability } from "../engine/rules";

export const ABILITY_NAMES: Record<Ability, string> = {
  STR: "Force", DEX: "Dextérité", CON: "Constitution", INT: "Intelligence", WIS: "Sagesse", CHA: "Charisme",
};

export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** Texte du bouton qui déclenche un jet du joueur (sans révéler le nombre de dés). */
export const ROLL_BUTTON_LABEL = {
  initiative: "Lancer l'initiative",
  attack: "Lancer le d20",
  damage: "Lancer les dégâts",
  deathSave: "Lancer le jet de mort",
  heal: "Lancer les soins",
  save: "Lancer le jet de sauvegarde",
  check: "Lancer le d20",
  move: "Continuer",
} as const;

/** Nombre à la française : 10.5 → « 10,5 ». */
export const fmtNumber = (n: number) => String(n).replace(".", ",");
/** Distance en mètres : 9 → « 9 m », 10.5 → « 10,5 m ». */
export const formatMeters = (n: number) => `${fmtNumber(n)} m`;
