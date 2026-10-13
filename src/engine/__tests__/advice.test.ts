import { describe, expect, it } from "vitest";
import { BACKGROUNDS } from "../../data/backgrounds";
import { CLASSES } from "../../data/classes";
import { SPECIES } from "../../data/species";
import { STANDARD_ARRAY, pointBuyTotal } from "../abilities";
import { assignByPriority, keyAbilities, recommendedBonus } from "../advice";
import { buildCharacter, validateDraft, type CharacterDraft } from "../character";
import { ABILITIES } from "../rules";

describe("données descriptives", () => {
  it("chaque classe a une priorité couvrant les 6 caractéristiques, une description et des capacités", () => {
    for (const c of CLASSES) {
      expect([...c.priority].sort()).toEqual([...ABILITIES].sort());
      expect(c.description.length).toBeGreaterThan(20);
      expect(c.features.length).toBeGreaterThan(0);
      expect(c.advice.length).toBeGreaterThan(20);
    }
  });
  it("chaque espèce a une description et des traits", () => {
    for (const s of SPECIES) {
      expect(s.description.length).toBeGreaterThan(20);
      expect(s.traits.length).toBeGreaterThan(0);
    }
  });
});

describe("conseils", () => {
  const wizard = CLASSES.find((c) => c.id === "wizard")!;
  it("répartit le tableau standard selon la priorité", () => {
    expect(assignByPriority(wizard.priority, STANDARD_ARRAY)).toEqual({ INT: 15, CON: 14, DEX: 13, WIS: 12, CHA: 10, STR: 8 });
  });
  it("la répartition conseillée coûte exactement 27 points (utilisable en achat de points)", () => {
    for (const c of CLASSES) expect(pointBuyTotal(assignByPriority(c.priority, STANDARD_ARRAY))).toBe(27);
  });
  it("renvoie les deux caractéristiques clés", () => {
    expect(keyAbilities(wizard.priority)).toEqual(["INT", "CON"]);
  });
  it("choisit le bonus d'historique le plus utile", () => {
    const sage = BACKGROUNDS.find((b) => b.id === "sage")!;
    expect(recommendedBonus(sage, wizard.priority)).toEqual({ mode: "2/1", plus2: "INT", plus1: "CON" });
    const soldier = BACKGROUNDS.find((b) => b.id === "soldier")!;
    const fighter = CLASSES.find((c) => c.id === "fighter")!;
    expect(recommendedBonus(soldier, fighter.priority)).toEqual({ mode: "2/1", plus2: "STR", plus1: "CON" });
  });
  it("produit un brouillon valide pour chaque classe", () => {
    for (const c of CLASSES) {
      const bg = BACKGROUNDS[0];
      const draft: CharacterDraft = {
        name: "Test", speciesId: "human", classId: c.id, backgroundId: bg.id, method: "standard",
        baseScores: assignByPriority(c.priority, STANDARD_ARRAY), bonus: recommendedBonus(bg, c.priority),
        classSkills: c.skillChoices.from.filter((s) => !bg.skills.includes(s as never)).slice(0, c.skillChoices.count),
      };
      expect(validateDraft(draft)).toEqual([]);
      expect(buildCharacter(draft, "t").maxHp).toBeGreaterThan(0);
    }
  });
});
