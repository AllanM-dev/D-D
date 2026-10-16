import type { FeatureUse } from "./combat";

/**
 * Capacités de classe de niveau 1 utilisables en combat, avec leurs utilisations.
 * Les ressources sont rechargées au début de chaque combat (les repos ne sont pas encore gérés).
 */
export function featuresFor(classId: string, level = 1, modifiers?: { CHA: number }): FeatureUse[] {
  switch (classId) {
    case "bard": {
      const uses = Math.max(1, modifiers?.CHA ?? 2); // Inspiration bardique : modificateur de Charisme (au moins 1)
      return [{ id: "bardic-inspiration", uses, max: uses }];
    }
    case "fighter":
      return [{ id: "second-wind", uses: 2, max: 2 }];
    case "barbarian":
      return [{ id: "rage", uses: 2, max: 2 }];
    case "paladin":
      return [{ id: "lay-on-hands", uses: 5 * level, max: 5 * level }];
    case "sorcerer":
      return [{ id: "innate-sorcery", uses: 2, max: 2 }];
    case "monk":
      return [{ id: "martial-arts", uses: 0, max: 0, unlimited: true }];
    default:
      return [];
  }
}
