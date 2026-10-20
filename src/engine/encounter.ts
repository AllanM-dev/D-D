import { XP_BUDGET, encounterMonsters, type EncounterDef } from "../data/encounters";
import { MONSTERS } from "../data/monsters";

export type Difficulty = "Facile" | "Moyen" | "Difficile" | "Très difficile";

/** Expérience totale des ennemis d'une rencontre, pour un groupe de cette taille. */
export function encounterXp(e: EncounterDef, partySize = 1): number {
  return encounterMonsters(e, partySize).reduce((n, m) => n + (MONSTERS.find((x) => x.id === m.monsterId)?.xp ?? 0) * m.count, 0);
}

/**
 * Difficulté d'une rencontre pour un groupe (héros + compagnon), d'après le budget d'expérience des règles 2024 :
 * jusqu'au budget « bas » c'est facile, puis moyen, difficile, et au-delà du budget « haut », très difficile.
 */
export function encounterDifficulty(e: EncounterDef, level: number, partySize = 1): Difficulty {
  const b = XP_BUDGET[Math.min(Math.max(1, level), 5)];
  const xp = encounterXp(e, partySize);
  if (xp <= b.low * partySize) return "Facile";
  if (xp <= b.moderate * partySize) return "Moyen";
  if (xp <= b.high * partySize) return "Difficile";
  return "Très difficile";
}

/** Expérience gagnée par le héros : celle des ennemis vaincus, partagée entre les membres du groupe (arrondie à l'inférieur). */
export const xpShare = (total: number, partySize: number) => Math.floor(total / Math.max(1, partySize));
