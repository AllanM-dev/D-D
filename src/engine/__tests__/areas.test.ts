import { describe, expect, it } from "vitest";
import { SPELL_BY_ID } from "../../data/spells";
import { areaCells } from "../areas";
import { startCombat, getCombatant, type CombatantInit } from "../combat";
import { areaTargets, castSpell } from "../spellcasting";
import { CLASSES } from "../../data/classes";
import { buildCharacter } from "../character";
import { characterToCombatant } from "../attacks";
import { defaultSpells } from "../../data/spells";

const key = (cs: { x: number; y: number }[]) => new Set(cs.map((c) => `${c.x},${c.y}`));

describe("formes de zone", () => {
  it("un carré de 4 cases est centré sur la case visée (1 case au-delà vers le haut et la gauche, 2 vers le bas et la droite)", () => {
    const cells = areaCells({ kind: "square", size: 4 }, { x: 0, y: 0 }, { x: 10, y: 10 });
    expect(cells).toHaveLength(16);
    expect(key(cells).has("9,9")).toBe(true);
    expect(key(cells).has("12,12")).toBe(true);
    expect(key(cells).has("13,10")).toBe(false);
  });
  it("un cône de 3 cases s'ouvre devant le lanceur et ne touche ni l'arrière ni le côté", () => {
    const cone = key(areaCells({ kind: "cone", size: 3 }, { x: 5, y: 5 }, { x: 8, y: 5 }));
    for (const c of ["6,5", "7,5", "8,5", "7,4", "7,6", "8,4", "8,6"]) expect(cone.has(c), c).toBe(true);
    for (const c of ["4,5", "5,4", "5,6", "5,5", "6,3", "9,5"]) expect(cone.has(c), c).toBe(false);
  });
  it("un cube de 3×3 est collé au lanceur, en ligne droite comme en diagonale", () => {
    const straight = areaCells({ kind: "cube", size: 3 }, { x: 5, y: 5 }, { x: 9, y: 5 });
    expect(straight).toHaveLength(9);
    expect(key(straight).has("6,4")).toBe(true);
    expect(key(straight).has("8,6")).toBe(true);
    expect(key(straight).has("5,5")).toBe(false);
    const diag = key(areaCells({ kind: "cube", size: 3 }, { x: 5, y: 5 }, { x: 8, y: 8 }));
    expect(diag.size).toBe(9);
    expect(diag.has("6,6")).toBe(true);
    expect(diag.has("8,8")).toBe(true);
    expect(diag.has("5,6")).toBe(false);
  });
});

function wizardFight(enemyCells: [number, number][]) {
  const c = CLASSES.find((x) => x.id === "wizard")!;
  const hero = buildCharacter({
    name: "M", speciesId: "human", classId: "wizard", backgroundId: "soldier", method: "standard",
    baseScores: { STR: 8, DEX: 14, CON: 13, INT: 15, WIS: 12, CHA: 10 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
    classSkills: c.skillChoices.from.filter((k) => k !== "athletics" && k !== "intimidation").slice(0, c.skillChoices.count), spells: { cantrips: defaultSpells("wizard").cantrips, prepared: ["burning-hands", "thunderwave", "magic-missile", "shield"] },
  }, "m");
  const party = characterToCombatant(hero);
  party.pos = { x: 2, y: 5 };
  const foes: CombatantInit[] = enemyCells.map(([x, y], i) => ({
    id: `r${i}`, name: `Rat ${i}`, side: "enemies", maxHp: 60, ac: 5, initiativeBonus: -20, attacks: [], pos: { x, y }, saveMods: { DEX: -5, CON: -5, STR: -5, INT: 0, WIS: 0, CHA: 0 },
  }));
  const arena = { rows: Array.from({ length: 12 }, () => "............................") };
  const state = startCombat([party], foes, () => 0.5, arena);
  return state;
}

describe("sorts de zone", () => {
  it("Mains brûlantes touche tous les ennemis du cône, pas ceux qui sont derrière ou hors du cône", () => {
    const state = wizardFight([[4, 5], [5, 5], [4, 6], [2, 9]]);
    const hero = getCombatant(state, "m");
    const hit = areaTargets(state, hero, SPELL_BY_ID["burning-hands"], getCombatant(state, "r0"));
    expect(hit.map((t) => t.id).sort()).toEqual(["r0", "r1", "r2"]);
  });
  it("lancer le sort inflige les dégâts à chaque ennemi touché, avec un jet de sauvegarde chacun", () => {
    const state = wizardFight([[4, 5], [5, 5], [2, 9]]);
    const before = [0, 1, 2].map((i) => getCombatant(state, `r${i}`).hp);
    castSpell(state, "burning-hands", () => 0.5, { targetId: "r0" });
    expect(getCombatant(state, "r0").hp).toBeLessThan(before[0]);
    expect(getCombatant(state, "r1").hp).toBeLessThan(before[1]);
    expect(getCombatant(state, "r2").hp).toBe(before[2]); // hors du cône
    expect(state.log.some((l) => l.includes("touche 2 créatures"))).toBe(true);
  });
  it("un mur arrête la zone", () => {
    const state = wizardFight([[3, 5], [5, 5]]);
    state.arena = { rows: state.arena!.rows.map((r, y) => (y === 5 ? r.slice(0, 4) + "#" + r.slice(5) : r)) };
    const hit = areaTargets(state, getCombatant(state, "m"), SPELL_BY_ID["burning-hands"], getCombatant(state, "r0"));
    expect(hit.map((t) => t.id)).toEqual(["r0"]);
  });
  it("Vague tonnante touche un cube de 3×3 devant le lanceur", () => {
    const state = wizardFight([[3, 5], [4, 4], [4, 6], [6, 5]]);
    const hit = areaTargets(state, getCombatant(state, "m"), SPELL_BY_ID.thunderwave, getCombatant(state, "r0"));
    expect(hit.map((t) => t.id).sort()).toEqual(["r0", "r1", "r2"]);
  });
});
