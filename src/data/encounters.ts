import type { CombatantInit } from "../engine/combat";
import { artKey } from "./illustrations";
import { MONSTERS } from "./monsters";

export interface EncounterDef {
  id: string;
  name: string;
  /** Ennemis face à un héros seul. */
  monsters: { monsterId: string; count: number }[];
  /** Renforts quand un compagnon accompagne le héros : le groupe est deux fois plus fort, la rencontre aussi. */
  reinforcements: { monsterId: string; count: number }[];
  /** Comment les renforts entrent en scène. */
  reinforceText: string;
}

/**
 * Budget d'expérience par personnage, selon le niveau du groupe (règles 2024) : au-delà de « difficile »,
 * la rencontre dépasse ce que les règles recommandent. Multiplié par le nombre de membres du groupe.
 */
export const XP_BUDGET: Record<number, { low: number; moderate: number; high: number }> = {
  1: { low: 50, moderate: 75, high: 100 },
  2: { low: 100, moderate: 150, high: 200 },
  3: { low: 150, moderate: 225, high: 400 },
  4: { low: 250, moderate: 375, high: 500 },
  5: { low: 500, moderate: 750, high: 1100 },
};

const one = (monsterId: string, count = 1) => [{ monsterId, count }];

export const ENCOUNTERS: readonly EncounterDef[] = [
  { id: "rat", name: "Un rat géant dans la cave", monsters: one("giant-rat"), reinforcements: one("giant-rat"), reinforceText: "Un second rat sort d'un trou du mur." },
  { id: "goblin", name: "Un gobelin sur la route", monsters: one("goblin"), reinforcements: one("goblin"), reinforceText: "Un autre gobelin surgit des fourrés." },
  { id: "wolf", name: "Un loup affamé", monsters: one("wolf"), reinforcements: one("wolf"), reinforceText: "Un second loup accourt à l'appel de son compagnon de meute." },
  { id: "skeleton", name: "Un squelette dans la crypte", monsters: one("skeleton"), reinforcements: one("skeleton"), reinforceText: "Un second squelette se redresse dans un cliquetis d'os." },
  { id: "goblins", name: "Embuscade de gobelins", monsters: one("goblin", 2), reinforcements: one("goblin"), reinforceText: "Un troisième gobelin sort de sa cachette." },
  { id: "pillard", name: "Un pillard de tombes", monsters: one("bandit"), reinforcements: one("bandit"), reinforceText: "Un complice du pillard surgit du tunnel, arbalète au poing." },
  { id: "bandits", name: "Bandits de grand chemin", monsters: one("bandit", 2), reinforcements: one("bandit"), reinforceText: "Un troisième bandit sort du bois pour prêter main-forte." },
  { id: "zombie", name: "Un zombie dans l'ossuaire", monsters: one("zombie"), reinforcements: one("zombie"), reinforceText: "Un second zombie se traîne hors d'une alcôve." },
  { id: "kobolds", name: "Une meute de kobolds", monsters: one("kobold", 3), reinforcements: one("kobold"), reinforceText: "Un quatrième kobold glapit et rejoint la meute." },
  { id: "spider", name: "Une araignée géante dans la forêt", monsters: one("giant-spider"), reinforcements: one("wolf"), reinforceText: "Un loup, attiré par le bruit, rôde autour de la toile." },
  { id: "ghoul", name: "Une goule dans le cimetière", monsters: one("ghoul"), reinforcements: one("zombie"), reinforceText: "Un zombie, réveillé par le même mal, se lève derrière la goule." },
  { id: "orc", name: "Un orc solitaire", monsters: one("orc"), reinforcements: one("goblin"), reinforceText: "Pas si solitaire : un gobelin, son larbin, le suit en ricanant." },
];

/** Ennemis de la rencontre : ceux de base, plus les renforts quand le groupe compte au moins deux membres. */
export function encounterMonsters(encounter: EncounterDef, partySize = 1): { monsterId: string; count: number }[] {
  const all = [...encounter.monsters, ...(partySize >= 2 ? encounter.reinforcements : [])];
  const merged = new Map<string, number>();
  for (const m of all) merged.set(m.monsterId, (merged.get(m.monsterId) ?? 0) + m.count);
  return [...merged].map(([monsterId, count]) => ({ monsterId, count }));
}

/** Construit les ennemis (renforts compris pour un groupe de deux) ; numérote les doublons (« Gobelin 1 », « Gobelin 2 »). */
export function buildEnemies(encounter: EncounterDef, partySize = 1): CombatantInit[] {
  const out: CombatantInit[] = [];
  for (const { monsterId, count } of encounterMonsters(encounter, partySize)) {
    const m = MONSTERS.find((x) => x.id === monsterId);
    if (!m) throw new Error(`Monstre inconnu : ${monsterId}`);
    for (let i = 1; i <= count; i++) {
      out.push({
        id: `${m.id}-${i}`, name: count > 1 ? `${m.name} ${i}` : m.name, side: "enemies",
        maxHp: m.maxHp, ac: m.ac, initiativeBonus: m.initiativeBonus, attacks: m.attacks, art: artKey("monster", m.id), sprite: `monster:${m.id}`, xp: m.xp, saveMods: m.saves, immunities: m.immunities, speed: m.speed, traits: m.traits,
      });
    }
  }
  return out;
}
