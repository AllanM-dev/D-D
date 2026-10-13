import { describe, expect, it } from "vitest";
import { CLASSES } from "../../data/classes";
import { SPECIES } from "../../data/species";
import { keyAbilities } from "../advice";
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
  it("renvoie les deux caractéristiques clés", () => {
    const wizard = CLASSES.find((c) => c.id === "wizard")!;
    expect(keyAbilities(wizard.priority)).toEqual(["INT", "CON"]);
  });
});
