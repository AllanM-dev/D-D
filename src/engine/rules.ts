export const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
export type Ability = (typeof ABILITIES)[number];

/** Modificateur de caractéristique : floor((score - 10) / 2). */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Bonus de maîtrise selon le niveau (1–20) : +2 à +6. */
export function proficiencyBonus(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 20) throw new RangeError(`Niveau invalide : ${level}`);
  return 2 + Math.floor((level - 1) / 4);
}
