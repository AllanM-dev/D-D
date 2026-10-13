import type { BackgroundDef } from "../data/backgrounds";
import type { AbilityScores } from "./abilities";
import type { BackgroundBonus } from "./character";
import type { Ability } from "./rules";

/** Les deux premières caractéristiques de la priorité sont « clés » pour la classe. */
export const KEY_ABILITY_COUNT = 2;

export const keyAbilities = (priority: readonly Ability[]): Ability[] => priority.slice(0, KEY_ABILITY_COUNT);

/** Attribue les valeurs du pool, de la plus haute à la plus basse, dans l'ordre de priorité. */
export function assignByPriority(priority: readonly Ability[], pool: readonly number[]): AbilityScores {
  if (pool.length !== priority.length) throw new RangeError("Le pool doit contenir une valeur par caractéristique.");
  const sorted = [...pool].sort((a, b) => b - a);
  const out = {} as AbilityScores;
  priority.forEach((a, i) => (out[a] = sorted[i]));
  return out;
}

/** +2 / +1 sur les deux options d'historique les plus utiles pour la classe. */
export function recommendedBonus(bg: BackgroundDef, priority: readonly Ability[]): BackgroundBonus {
  const [plus2, plus1] = [...bg.abilityOptions].sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
  return { mode: "2/1", plus2, plus1 };
}
