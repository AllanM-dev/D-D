import type { Ability } from "../engine/rules";

export const ABILITY_NAMES: Record<Ability, string> = {
  STR: "Force", DEX: "Dextérité", CON: "Constitution", INT: "Intelligence", WIS: "Sagesse", CHA: "Charisme",
};

export const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
