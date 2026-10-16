import type { CombatantInit } from "../engine/combat";
import { artKey } from "./illustrations";
import { MONSTERS } from "./monsters";

export interface EncounterDef {
  id: string;
  name: string;
  difficulty: "Facile" | "Moyen" | "Difficile";
  monsters: { monsterId: string; count: number }[];
}

/** Difficulté indicative pour un personnage seul de niveau 1. */
export const ENCOUNTERS: readonly EncounterDef[] = [
  { id: "rat", name: "Un rat géant dans la cave", difficulty: "Facile", monsters: [{ monsterId: "giant-rat", count: 1 }] },
  { id: "goblin", name: "Un gobelin sur la route", difficulty: "Facile", monsters: [{ monsterId: "goblin", count: 1 }] },
  { id: "wolf", name: "Un loup affamé", difficulty: "Moyen", monsters: [{ monsterId: "wolf", count: 1 }] },
  { id: "skeleton", name: "Un squelette dans la crypte", difficulty: "Moyen", monsters: [{ monsterId: "skeleton", count: 1 }] },
  { id: "goblins", name: "Embuscade de gobelins", difficulty: "Difficile", monsters: [{ monsterId: "goblin", count: 2 }] },
  { id: "bandits", name: "Bandits de grand chemin", difficulty: "Difficile", monsters: [{ monsterId: "bandit", count: 2 }] },
  { id: "zombie", name: "Un zombie dans l'ossuaire", difficulty: "Moyen", monsters: [{ monsterId: "zombie", count: 1 }] },
  { id: "kobolds", name: "Une meute de kobolds", difficulty: "Moyen", monsters: [{ monsterId: "kobold", count: 3 }] },
  { id: "spider", name: "Une araignée géante dans la forêt", difficulty: "Difficile", monsters: [{ monsterId: "giant-spider", count: 1 }] },
  { id: "ghoul", name: "Une goule dans le cimetière", difficulty: "Difficile", monsters: [{ monsterId: "ghoul", count: 1 }] },
  { id: "orc", name: "Un orc solitaire", difficulty: "Difficile", monsters: [{ monsterId: "orc", count: 1 }] },
];

/** Construit les ennemis ; numérote les doublons (« Gobelin 1 », « Gobelin 2 »). */
export function buildEnemies(encounter: EncounterDef): CombatantInit[] {
  const out: CombatantInit[] = [];
  for (const { monsterId, count } of encounter.monsters) {
    const m = MONSTERS.find((x) => x.id === monsterId);
    if (!m) throw new Error(`Monstre inconnu : ${monsterId}`);
    for (let i = 1; i <= count; i++) {
      out.push({
        id: `${m.id}-${i}`, name: count > 1 ? `${m.name} ${i}` : m.name, side: "enemies",
        maxHp: m.maxHp, ac: m.ac, initiativeBonus: m.initiativeBonus, attacks: m.attacks, art: artKey("monster", m.id), saveMods: m.saves, immunities: m.immunities, speed: m.speed, traits: m.traits,
      });
    }
  }
  return out;
}
