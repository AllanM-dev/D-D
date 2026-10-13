import type { Ability } from "../engine/rules";

export const SKILLS = [
  { id: "acrobatics", name: "Acrobaties", ability: "DEX" },
  { id: "animal-handling", name: "Dressage", ability: "WIS" },
  { id: "arcana", name: "Arcanes", ability: "INT" },
  { id: "athletics", name: "Athlétisme", ability: "STR" },
  { id: "deception", name: "Tromperie", ability: "CHA" },
  { id: "history", name: "Histoire", ability: "INT" },
  { id: "insight", name: "Perspicacité", ability: "WIS" },
  { id: "intimidation", name: "Intimidation", ability: "CHA" },
  { id: "investigation", name: "Investigation", ability: "INT" },
  { id: "medicine", name: "Médecine", ability: "WIS" },
  { id: "nature", name: "Nature", ability: "INT" },
  { id: "perception", name: "Perception", ability: "WIS" },
  { id: "performance", name: "Représentation", ability: "CHA" },
  { id: "persuasion", name: "Persuasion", ability: "CHA" },
  { id: "religion", name: "Religion", ability: "INT" },
  { id: "sleight-of-hand", name: "Escamotage", ability: "DEX" },
  { id: "stealth", name: "Discrétion", ability: "DEX" },
  { id: "survival", name: "Survie", ability: "WIS" },
] as const satisfies readonly { id: string; name: string; ability: Ability }[];

export type SkillId = (typeof SKILLS)[number]["id"];
export const ALL_SKILL_IDS: readonly SkillId[] = SKILLS.map((s) => s.id);
