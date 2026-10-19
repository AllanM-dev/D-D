/** Noms affichés (capacités, caractéristiques, états). */
import type { ConditionId } from "../../data/conditions";
import type { Ability } from "../rules";
import type { FeatureOptionId } from "./types";

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

export const ABILITY_FR: Record<Ability, string> = {
  STR: "Force", DEX: "Dextérité", CON: "Constitution", INT: "Intelligence", WIS: "Sagesse", CHA: "Charisme",
};

export const CONDITION_FR: Record<ConditionId, string> = {
  poisoned: "empoisonné", prone: "à terre", frightened: "effrayé", blinded: "aveuglé", restrained: "entravé",
  incapacitated: "neutralisé", stunned: "étourdi", paralyzed: "paralysé",
};
export const conditionName = (id: ConditionId) => CONDITION_FR[id];
