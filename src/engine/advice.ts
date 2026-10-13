import type { Ability } from "./rules";

/** Les deux premières caractéristiques de la priorité sont « clés » pour la classe. */
export const KEY_ABILITY_COUNT = 2;

export const keyAbilities = (priority: readonly Ability[]): Ability[] => priority.slice(0, KEY_ABILITY_COUNT);
