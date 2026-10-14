import { describe, expect, it } from "vitest";
import { BACKGROUNDS } from "../../data/backgrounds";
import { CLASSES } from "../../data/classes";
import { SKILLS } from "../../data/skills";
import { defaultScores, pointBuyTotal, roll4d6DropLowest, rollAbilityPool, usesPoolExactly } from "../abilities";
import { buildCharacter, validateDraft, type CharacterDraft } from "../character";
import { seededRng } from "../dice";

const fighter: CharacterDraft = {
  name: "Aldric",
  speciesId: "human",
  classId: "fighter",
  backgroundId: "soldier",
  method: "standard",
  baseScores: { STR: 15, DEX: 13, CON: 14, INT: 8, WIS: 10, CHA: 12 },
  bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
  classSkills: ["perception", "survival"],
  fightingStyle: "defense",
};

describe("abilities", () => {
  it("calcule le coût d'achat de points", () => {
    expect(pointBuyTotal(defaultScores())).toBe(0);
    expect(pointBuyTotal({ STR: 15, DEX: 15, CON: 15, INT: 8, WIS: 8, CHA: 8 })).toBe(27);
    expect(pointBuyTotal({ STR: 13, DEX: 13, CON: 13, INT: 13, WIS: 13, CHA: 13 })).toBe(30);
  });
  it("tire 4d6 en retirant le plus bas", () => {
    const rng = seededRng(1);
    for (let i = 0; i < 100; i++) {
      const v = roll4d6DropLowest(rng);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(18);
    }
    expect(rollAbilityPool(seededRng(3))).toHaveLength(6);
  });
  it("vérifie l'usage exact d'un pool", () => {
    expect(usesPoolExactly(fighter.baseScores, [15, 14, 13, 12, 10, 8])).toBe(true);
    expect(usesPoolExactly(defaultScores(10), [15, 14, 13, 12, 10, 8])).toBe(false);
  });
});

describe("données", () => {
  it("référence uniquement des compétences existantes", () => {
    const ids = new Set<string>(SKILLS.map((s) => s.id));
    for (const c of CLASSES) {
      expect(c.skillChoices.from.every((s) => ids.has(s))).toBe(true);
      expect(c.skillChoices.from.length).toBeGreaterThanOrEqual(c.skillChoices.count);
    }
    for (const b of BACKGROUNDS) expect(b.skills.every((s) => ids.has(s))).toBe(true);
  });
});

describe("création de personnage", () => {
  it("construit un guerrier soldat de niveau 1", () => {
    const c = buildCharacter(fighter, "x");
    expect(c.scores).toEqual({ STR: 17, DEX: 13, CON: 15, INT: 8, WIS: 10, CHA: 12 });
    expect(c.maxHp).toBe(10 + 2); // d10 + mod CON (+2)
    expect(c.armorClass).toBe(17); // cotte de mailles (16) + style Défense (+1)
    expect(c.proficiencyBonus).toBe(2);
    expect(c.saves.STR).toEqual({ proficient: true, bonus: 5 });
    expect(c.saves.DEX).toEqual({ proficient: false, bonus: 1 });
    expect(c.skills.find((s) => s.id === "athletics")).toMatchObject({ proficient: true, bonus: 5 });
    expect(c.skills.find((s) => s.id === "perception")).toMatchObject({ proficient: true, bonus: 2 });
    expect(c.passivePerception).toBe(12);
  });
  it("applique le bonus +1/+1/+1 et plafonne à 20", () => {
    const c = buildCharacter(
      { ...fighter, method: "pointbuy", baseScores: { STR: 15, DEX: 15, CON: 15, INT: 8, WIS: 8, CHA: 8 }, bonus: { mode: "1/1/1" } },
      "y",
    );
    expect(c.scores).toMatchObject({ STR: 16, DEX: 16, CON: 16, INT: 8 });
  });
  it("rejette les brouillons invalides", () => {
    expect(validateDraft({ ...fighter, name: " " })).not.toEqual([]);
    expect(validateDraft({ ...fighter, classSkills: ["athletics", "survival"] })).not.toEqual([]); // déjà donnée par l'historique
    expect(validateDraft({ ...fighter, classSkills: ["arcana", "survival"] })).not.toEqual([]); // hors liste de classe
    expect(validateDraft({ ...fighter, bonus: { mode: "2/1", plus2: "INT", plus1: "CON" } })).not.toEqual([]);
    expect(validateDraft({ ...fighter, method: "pointbuy", baseScores: { STR: 15, DEX: 15, CON: 15, INT: 15, WIS: 8, CHA: 8 } })).not.toEqual([]); // 36 points
    expect(validateDraft({ ...fighter, method: "pointbuy" })).toEqual([]); // exactement 27 points
    expect(() => buildCharacter({ ...fighter, name: "" }, "z")).toThrow();
  });
  it("accepte un brouillon valide sans erreur", () => {
    expect(validateDraft(fighter)).toEqual([]);
  });
});
