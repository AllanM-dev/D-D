import type { Ability } from "../engine/rules";
import { ALL_SKILL_IDS, type SkillId } from "./skills";

export interface ClassDef {
  id: string;
  name: string;
  hitDie: 6 | 8 | 10 | 12;
  /** Jets de sauvegarde maîtrisés. */
  savingThrows: [Ability, Ability];
  skillChoices: { count: number; from: readonly SkillId[] };
}

export const CLASSES: readonly ClassDef[] = [
  { id: "barbarian", name: "Barbare", hitDie: 12, savingThrows: ["STR", "CON"],
    skillChoices: { count: 2, from: ["animal-handling", "athletics", "intimidation", "nature", "perception", "survival"] } },
  { id: "bard", name: "Barde", hitDie: 8, savingThrows: ["DEX", "CHA"],
    skillChoices: { count: 3, from: ALL_SKILL_IDS } },
  { id: "cleric", name: "Clerc", hitDie: 8, savingThrows: ["WIS", "CHA"],
    skillChoices: { count: 2, from: ["history", "insight", "medicine", "persuasion", "religion"] } },
  { id: "druid", name: "Druide", hitDie: 8, savingThrows: ["INT", "WIS"],
    skillChoices: { count: 2, from: ["arcana", "animal-handling", "insight", "medicine", "nature", "perception", "religion", "survival"] } },
  { id: "fighter", name: "Guerrier", hitDie: 10, savingThrows: ["STR", "CON"],
    skillChoices: { count: 2, from: ["acrobatics", "animal-handling", "athletics", "history", "insight", "intimidation", "persuasion", "perception", "survival"] } },
  { id: "monk", name: "Moine", hitDie: 8, savingThrows: ["STR", "DEX"],
    skillChoices: { count: 2, from: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"] } },
  { id: "paladin", name: "Paladin", hitDie: 10, savingThrows: ["WIS", "CHA"],
    skillChoices: { count: 2, from: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"] } },
  { id: "ranger", name: "Rôdeur", hitDie: 10, savingThrows: ["STR", "DEX"],
    skillChoices: { count: 3, from: ["animal-handling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"] } },
  { id: "rogue", name: "Roublard", hitDie: 8, savingThrows: ["DEX", "INT"],
    skillChoices: { count: 4, from: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "persuasion", "sleight-of-hand", "stealth"] } },
  { id: "sorcerer", name: "Ensorceleur", hitDie: 6, savingThrows: ["CON", "CHA"],
    skillChoices: { count: 2, from: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"] } },
  { id: "warlock", name: "Occultiste", hitDie: 8, savingThrows: ["WIS", "CHA"],
    skillChoices: { count: 2, from: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"] } },
  { id: "wizard", name: "Magicien", hitDie: 6, savingThrows: ["INT", "WIS"],
    skillChoices: { count: 2, from: ["arcana", "history", "insight", "investigation", "medicine", "nature", "religion"] } },
];
