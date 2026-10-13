import type { Ability } from "../engine/rules";
import type { SkillId } from "./skills";

export interface BackgroundDef {
  id: string;
  name: string;
  /** Règles 2024 : l'historique donne +2/+1 ou +1/+1/+1 parmi ces trois caractéristiques. */
  abilityOptions: [Ability, Ability, Ability];
  originFeat: string;
  skills: [SkillId, SkillId];
}

/** Historiques du SRD 5.2. */
export const BACKGROUNDS: readonly BackgroundDef[] = [
  { id: "acolyte", name: "Acolyte", abilityOptions: ["INT", "WIS", "CHA"], originFeat: "Initié à la magie (Clerc)", skills: ["insight", "religion"] },
  { id: "criminal", name: "Criminel", abilityOptions: ["DEX", "CON", "INT"], originFeat: "Vigilant", skills: ["sleight-of-hand", "stealth"] },
  { id: "sage", name: "Sage", abilityOptions: ["CON", "INT", "WIS"], originFeat: "Initié à la magie (Magicien)", skills: ["arcana", "history"] },
  { id: "soldier", name: "Soldat", abilityOptions: ["STR", "DEX", "CON"], originFeat: "Frappeur sauvage", skills: ["athletics", "intimidation"] },
];
