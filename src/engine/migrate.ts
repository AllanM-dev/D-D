import type { Character } from "./character";
import { migrateSpells } from "./character";
import { migrateCharacter } from "./equipment";
import { migrateMasteries } from "./loadout";
import { migrateXp } from "./levelup";

/**
 * Met à niveau un personnage enregistré par une version plus ancienne de l'application.
 * Seul point d'entrée des migrations : le chargement local et l'import de sauvegarde l'utilisent tous les deux.
 * Chaque étape ne touche qu'aux personnages qui en ont besoin, si bien que l'appliquer deux fois ne change rien.
 * Ajouter ici toute nouvelle migration, dans l'ordre où les champs sont apparus.
 */
export function migrate(c: Character): Character {
  return migrateXp(migrateMasteries(migrateSpells(migrateCharacter(c))));
}
