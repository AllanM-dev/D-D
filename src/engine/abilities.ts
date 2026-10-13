import { rollDie, type Rng } from "./dice";
import { ABILITIES, type Ability } from "./rules";

export type AbilityScores = Record<Ability, number>;
export type ScoreMethod = "standard" | "pointbuy" | "roll";

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;
const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

export function pointBuyCost(score: number): number {
  const cost = POINT_BUY_COST[score];
  if (cost === undefined) throw new RangeError(`Score hors achat de points : ${score}`);
  return cost;
}

export function pointBuyTotal(scores: AbilityScores): number {
  return ABILITIES.reduce((sum, a) => sum + pointBuyCost(scores[a]), 0);
}

export function defaultScores(value = POINT_BUY_MIN): AbilityScores {
  return { STR: value, DEX: value, CON: value, INT: value, WIS: value, CHA: value };
}

/** 4d6, on retire le plus bas. */
export function roll4d6DropLowest(rng?: Rng): number {
  const dice = [rollDie(6, rng), rollDie(6, rng), rollDie(6, rng), rollDie(6, rng)].sort((a, b) => a - b);
  return dice[1] + dice[2] + dice[3];
}

/** Six scores tirés, triés du plus haut au plus bas. */
export function rollAbilityPool(rng?: Rng): number[] {
  return Array.from({ length: 6 }, () => roll4d6DropLowest(rng)).sort((a, b) => b - a);
}

/** Vrai si `scores` utilise exactement les valeurs de `pool` (chacune une fois). */
export function usesPoolExactly(scores: AbilityScores, pool: readonly number[]): boolean {
  const a = ABILITIES.map((k) => scores[k]).sort((x, y) => x - y);
  const b = [...pool].sort((x, y) => x - y);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
