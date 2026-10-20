import { describe, expect, it } from "vitest";
import { ENCOUNTERS, XP_BUDGET, buildEnemies, encounterMonsters } from "../../data/encounters";
import { MONSTERS } from "../../data/monsters";
import { encounterDifficulty, encounterXp, xpShare } from "../encounter";

const byId = (id: string) => ENCOUNTERS.find((e) => e.id === id)!;

describe("rencontres et compagnons", () => {
  it("chaque rencontre a des renforts connus, un texte, et des ennemis numérotés sans doublon", () => {
    for (const e of ENCOUNTERS) {
      expect(e.reinforcements.length, e.id).toBeGreaterThan(0);
      expect(e.reinforceText.length, e.id).toBeGreaterThan(10);
      for (const m of [...e.monsters, ...e.reinforcements]) expect(MONSTERS.some((x) => x.id === m.monsterId), `${e.id}/${m.monsterId}`).toBe(true);
      const duo = buildEnemies(e, 2);
      expect(new Set(duo.map((x) => x.id)).size, e.id).toBe(duo.length);
      expect(duo.length).toBeGreaterThan(buildEnemies(e, 1).length);
    }
  });
  it("seul : pas de renfort ; à deux : les renforts s'ajoutent aux ennemis de base", () => {
    expect(encounterMonsters(byId("goblins"), 1)).toEqual([{ monsterId: "goblin", count: 2 }]);
    expect(encounterMonsters(byId("goblins"), 2)).toEqual([{ monsterId: "goblin", count: 3 }]);
    expect(buildEnemies(byId("ghoul"), 2).map((x) => x.name)).toEqual(["Goule", "Zombie"]);
  });
  it("avec un compagnon, la menace grandit autant que le groupe : même difficulté qu'en solo, à un cran près", () => {
    const order = ["Facile", "Moyen", "Difficile", "Très difficile"];
    for (const e of ENCOUNTERS) {
      const ratio = encounterXp(e, 2) / encounterXp(e, 1);
      expect(ratio, e.id).toBeGreaterThanOrEqual(1.25);
      expect(ratio, e.id).toBeLessThanOrEqual(2);
      const solo = order.indexOf(encounterDifficulty(e, 1, 1));
      const duo = order.indexOf(encounterDifficulty(e, 1, 2));
      expect(Math.abs(solo - duo), e.id).toBeLessThanOrEqual(1);
    }
  });
  it("difficulté selon le budget d'expérience : par personnage et par niveau", () => {
    expect(XP_BUDGET[1]).toEqual({ low: 50, moderate: 75, high: 100 });
    expect(encounterDifficulty(byId("rat"), 1, 1)).toBe("Facile"); // 25 XP
    expect(encounterDifficulty(byId("kobolds"), 1, 1)).toBe("Moyen"); // 75 XP
    expect(encounterDifficulty(byId("goblins"), 1, 1)).toBe("Difficile"); // 100 XP
    expect(encounterDifficulty(byId("ghoul"), 1, 1)).toBe("Très difficile"); // 200 XP
    expect(encounterDifficulty(byId("ghoul"), 2, 1)).toBe("Difficile"); // au niveau 2, le budget double
    expect(encounterDifficulty(byId("orc"), 1, 2)).toBe("Moyen"); // orc + gobelin = 150 XP pour deux
  });
  it("l'expérience des combats est partagée entre le héros et son compagnon", () => {
    expect(xpShare(100, 1)).toBe(100);
    expect(xpShare(100, 2)).toBe(50);
    expect(xpShare(75, 2)).toBe(37);
    // Avec les renforts, le héros gagne à peu près autant qu'en solo.
    for (const e of ENCOUNTERS) expect(xpShare(encounterXp(e, 2), 2), e.id).toBeGreaterThanOrEqual(encounterXp(e, 1) * 0.6);
  });
});
