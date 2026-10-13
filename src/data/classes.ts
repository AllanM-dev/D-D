import type { Ability } from "../engine/rules";
import { ALL_SKILL_IDS, type SkillId } from "./skills";

export interface ClassDef {
  id: string;
  name: string;
  hitDie: 6 | 8 | 10 | 12;
  /** Jets de sauvegarde maîtrisés. */
  savingThrows: [Ability, Ability];
  skillChoices: { count: number; from: readonly SkillId[] };
  /** Résumé du rôle de la classe (texte original, pas une citation du SRD). */
  description: string;
  /** Capacités de niveau 1. */
  features: string[];
  /** Caractéristiques de la plus à la moins utile ; les deux premières sont « clés ». */
  priority: Ability[];
  /** Conseil de répartition des caractéristiques. */
  advice: string;
}

export const CLASSES: readonly ClassDef[] = [
  { id: "barbarian", name: "Barbare", hitDie: 12, savingThrows: ["STR", "CON"],
    skillChoices: { count: 2, from: ["animal-handling", "athletics", "intimidation", "nature", "perception", "survival"] },
    description: "Combattant de mêlée féroce qui encaisse les coups et frappe fort grâce à sa rage. Simple à jouer, très résistant.",
    features: ["Rage", "Défense sans armure", "Maîtrise des armes"],
    priority: ["STR", "CON", "DEX", "WIS", "CHA", "INT"],
    advice: "La Force sert à frapper, la Constitution te garde en vie. Sans armure, ta CA vaut 10 + Dextérité + Constitution : une bonne Dextérité aide aussi." },
  { id: "bard", name: "Barde", hitDie: 8, savingThrows: ["DEX", "CHA"],
    skillChoices: { count: 3, from: ALL_SKILL_IDS },
    description: "Artiste et lanceur de sorts polyvalent : soutien, contrôle et charme. Touche-à-tout, avec beaucoup de compétences.",
    features: ["Inspiration bardique", "Incantation"],
    priority: ["CHA", "DEX", "CON", "WIS", "INT", "STR"],
    advice: "Le Charisme est ta caractéristique d'incantation. La Dextérité améliore ta CA et ton initiative, la Constitution tes PV." },
  { id: "cleric", name: "Clerc", hitDie: 8, savingThrows: ["WIS", "CHA"],
    skillChoices: { count: 2, from: ["history", "insight", "medicine", "persuasion", "religion"] },
    description: "Serviteur d'une divinité : soigne les alliés, les protège et lance des sorts divins. Peut aussi se battre en armure.",
    features: ["Incantation", "Ordre divin"],
    priority: ["WIS", "CON", "STR", "CHA", "DEX", "INT"],
    advice: "La Sagesse détermine tes sorts et leur puissance. La Constitution te rend plus solide ; la Force aide si tu portes une armure lourde et te bats au corps à corps." },
  { id: "druid", name: "Druide", hitDie: 8, savingThrows: ["INT", "WIS"],
    skillChoices: { count: 2, from: ["arcana", "animal-handling", "insight", "medicine", "nature", "perception", "religion", "survival"] },
    description: "Gardien de la nature : sorts de soin et de contrôle, et plus tard transformation en animal.",
    features: ["Incantation", "Druidique", "Ordre primordial"],
    priority: ["WIS", "DEX", "CON", "INT", "CHA", "STR"],
    advice: "La Sagesse est ta caractéristique d'incantation. La Dextérité et la Constitution compensent le fait de ne pas porter d'armure métallique." },
  { id: "fighter", name: "Guerrier", hitDie: 10, savingThrows: ["STR", "CON"],
    skillChoices: { count: 2, from: ["acrobatics", "animal-handling", "athletics", "history", "insight", "intimidation", "persuasion", "perception", "survival"] },
    description: "Maître des armes et des armures, fiable à toute distance. La classe la plus simple et la plus polyvalente.",
    features: ["Style de combat", "Second souffle", "Maîtrise des armes"],
    priority: ["STR", "CON", "DEX", "WIS", "CHA", "INT"],
    advice: "Force pour un guerrier de mêlée, ou Dextérité en priorité si tu préfères l'arc ou les armes légères (dans ce cas mets Dextérité en premier). La Constitution reste utile dans les deux cas." },
  { id: "monk", name: "Moine", hitDie: 8, savingThrows: ["STR", "DEX"],
    skillChoices: { count: 2, from: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"] },
    description: "Combattant agile qui frappe à mains nues et se déplace très vite. Mobile, mais demande de bien gérer ses ressources.",
    features: ["Arts martiaux", "Défense sans armure"],
    priority: ["DEX", "WIS", "CON", "STR", "INT", "CHA"],
    advice: "Dextérité et Sagesse comptent double : elles servent à frapper et à ta CA (10 + Dex + Sag sans armure). La Constitution complète tes PV." },
  { id: "paladin", name: "Paladin", hitDie: 10, savingThrows: ["WIS", "CHA"],
    skillChoices: { count: 2, from: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"] },
    description: "Guerrier sacré : armure lourde, gros dégâts et soins sur lui-même ou ses alliés, avec un peu de magie.",
    features: ["Imposition des mains", "Incantation", "Maîtrise des armes"],
    priority: ["STR", "CHA", "CON", "WIS", "DEX", "INT"],
    advice: "La Force pour frapper et porter l'armure lourde, le Charisme pour tes sorts et tes capacités sacrées. La Constitution te garde debout." },
  { id: "ranger", name: "Rôdeur", hitDie: 10, savingThrows: ["STR", "DEX"],
    skillChoices: { count: 3, from: ["animal-handling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"] },
    description: "Éclaireur et chasseur à l'arc ou aux armes, à l'aise en pleine nature, avec un peu de magie.",
    features: ["Incantation", "Ennemi juré", "Maîtrise des armes"],
    priority: ["DEX", "WIS", "CON", "STR", "INT", "CHA"],
    advice: "La Dextérité pour viser et esquiver, la Sagesse pour tes sorts et ta perception. La Constitution renforce tes PV." },
  { id: "rogue", name: "Roublard", hitDie: 8, savingThrows: ["DEX", "INT"],
    skillChoices: { count: 4, from: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "persuasion", "sleight-of-hand", "stealth"] },
    description: "Spécialiste de la discrétion et des attaques sournoises, très doué en compétences. Fragile mais redoutable.",
    features: ["Expertise", "Attaque sournoise", "Argot des voleurs", "Maîtrise des armes"],
    priority: ["DEX", "CON", "WIS", "INT", "CHA", "STR"],
    advice: "La Dextérité gouverne presque tout : attaques, CA, initiative, discrétion. Constitution et Sagesse (Perception) t'évitent de tomber trop vite." },
  { id: "sorcerer", name: "Ensorceleur", hitDie: 6, savingThrows: ["CON", "CHA"],
    skillChoices: { count: 2, from: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"] },
    description: "Lanceur de sorts à la magie innée : puissant et flexible, mais peu résistant.",
    features: ["Incantation", "Magie innée"],
    priority: ["CHA", "CON", "DEX", "WIS", "INT", "STR"],
    advice: "Le Charisme est ta caractéristique d'incantation. Constitution et Dextérité compensent tes PV et ta CA faibles." },
  { id: "warlock", name: "Occultiste", hitDie: 8, savingThrows: ["WIS", "CHA"],
    skillChoices: { count: 2, from: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"] },
    description: "Lanceur de sorts lié à un pacte avec une entité puissante. Sorts peu nombreux mais forts, avec des pouvoirs uniques.",
    features: ["Invocations occultes", "Magie de pacte"],
    priority: ["CHA", "CON", "DEX", "WIS", "INT", "STR"],
    advice: "Le Charisme alimente tes sorts et tes dégâts. Constitution et Dextérité te rendent moins vulnérable au corps à corps." },
  { id: "wizard", name: "Magicien", hitDie: 6, savingThrows: ["INT", "WIS"],
    skillChoices: { count: 2, from: ["arcana", "history", "insight", "investigation", "medicine", "nature", "religion"] },
    description: "Érudit des arcanes avec le plus grand choix de sorts. Très puissant, mais fragile : il faut le protéger.",
    features: ["Incantation", "Adepte des rituels", "Récupération arcanique"],
    priority: ["INT", "CON", "DEX", "WIS", "CHA", "STR"],
    advice: "L'Intelligence détermine tes sorts. Constitution et Dextérité sont vitales : tu as peu de PV et pas d'armure." },
];
