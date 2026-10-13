import { describe, expect, it } from "vitest";
import { rollD20, rollDie, seededRng } from "../dice";
import { abilityModifier, proficiencyBonus } from "../rules";

describe("rules", () => {
  it("calcule les modificateurs de caractéristique", () => {
    expect([1, 8, 9, 10, 11, 15, 16, 20].map(abilityModifier)).toEqual([-5, -1, -1, 0, 0, 2, 3, 5]);
  });
  it("calcule le bonus de maîtrise", () => {
    expect([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(proficiencyBonus)).toEqual([2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
    expect(() => proficiencyBonus(0)).toThrow();
  });
});

describe("dice", () => {
  it("reste dans les bornes et est reproductible", () => {
    const a = seededRng(42);
    const b = seededRng(42);
    for (let i = 0; i < 200; i++) {
      const v = rollDie(20, a);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(20);
      expect(v).toBe(rollDie(20, b));
    }
  });
  it("gère avantage et désavantage", () => {
    const rng = seededRng(7);
    const adv = rollD20(3, "advantage", rng);
    expect(adv.natural).toBe(Math.max(...adv.rolls));
    const dis = rollD20(3, "disadvantage", rng);
    expect(dis.natural).toBe(Math.min(...dis.rolls));
    expect(dis.total).toBe(dis.natural + 3);
  });
});
