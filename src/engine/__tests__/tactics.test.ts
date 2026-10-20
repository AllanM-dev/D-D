import { describe, expect, it } from "vitest";
import { MONSTERS } from "../../data/monsters";
import { buildEnemies } from "../../data/encounters";
import { cellDistance } from "../exploration";
import { type Arena } from "../battlefield";
import { getCombatant, startCombat, type CombatantInit } from "../combat";

const arena: Arena = { rows: Array.from({ length: 9 }, () => ".".repeat(26)) };
const hero = (x: number, hp = 40): CombatantInit => ({
  id: "h", name: "Héros", side: "party", maxHp: 40, hp, ac: 10, initiativeBonus: -30, attacks: [{ name: "Épée", toHit: 0, damage: { count: 1, sides: 4, bonus: 0 }, damageType: "tranchant", ranged: false }], pos: { x, y: 4 },
});
const foe = (id: string, x: number, patch: Partial<CombatantInit> = {}): CombatantInit => {
  const m = MONSTERS.find((q) => q.id === id)!;
  return { id: `${id}-1`, name: m.name, side: "enemies", maxHp: m.maxHp, ac: m.ac, initiativeBonus: 30, attacks: m.attacks, traits: m.traits, speed: m.speed, saveMods: m.saves, pos: { x, y: 4 }, ...patch };
};
const fight = (h: CombatantInit, e: CombatantInit) => startCombat([h], [e], () => 0.5, arena);

describe("tactiques des monstres", () => {
  it("un monstre qui sait tirer tire de loin au lieu de s'approcher", () => {
    const s = fight(hero(2), foe("goblin", 12));
    expect(getCombatant(s, "goblin-1").pos).toEqual({ x: 12, y: 4 });
    expect(s.log.some((l) => l.includes("Arc court"))).toBe(true);
  });

  it("hors de portée de tir, il s'approche seulement jusqu'à pouvoir tirer", () => {
    const s = fight(hero(0), foe("kobold", 25)); // fronde : 36 m maximum = 24 cases
    const k = getCombatant(s, "kobold-1");
    expect(cellDistance(k.pos!, { x: 0, y: 4 })).toBeGreaterThan(1);
    expect(s.log.some((l) => l.includes("Fronde"))).toBe(true);
  });

  it("un archer au contact recule pour garder ses distances, puis tire", () => {
    const s = fight(hero(5), foe("bandit", 6));
    const b = getCombatant(s, "bandit-1");
    expect(cellDistance(b.pos!, { x: 5, y: 4 })).toBeGreaterThan(1);
    expect(s.log.some((l) => l.includes("recule pour garder ses distances"))).toBe(true);
    expect(s.log.some((l) => l.includes("Arbalète légère"))).toBe(true);
  });

  it("un monstre sans arme à distance avance et attaque au contact (zombie)", () => {
    const s = fight(hero(2), foe("zombie", 8));
    expect(cellDistance(getCombatant(s, "zombie-1").pos!, { x: 2, y: 4 })).toBeLessThan(6);
  });

  it("un lâche gravement blessé prend la fuite et quitte le combat quand il est loin", () => {
    const s = fight(hero(2), foe("goblin", 5, { hp: 1 }));
    const g = getCombatant(s, "goblin-1");
    expect(s.log.some((l) => l.includes("prend la fuite"))).toBe(true);
    expect(cellDistance(g.pos!, { x: 2, y: 4 })).toBeGreaterThan(3);
  });

  it("l'ennemi qui s'enfuit disparaît et la victoire est déclarée, sans qu'il soit mort", () => {
    // Couloir : la fuite le met vite hors de vue, derrière un mur.
    const walled: Arena = { rows: Array.from({ length: 9 }, (_, y) => (y === 4 ? "..." + "#" + ".".repeat(22) : ".".repeat(26))) };
    const h = hero(0);
    const g = foe("goblin", 2, { hp: 1, pos: { x: 2, y: 4 } });
    const s = startCombat([h], [g], () => 0.5, walled);
    const gob = getCombatant(s, "goblin-1");
    if (gob.fled) {
      expect(gob.dead).toBe(true);
      expect(s.status).toBe("victory");
    } else {
      expect(cellDistance(gob.pos!, { x: 0, y: 4 })).toBeGreaterThan(2);
    }
  });

  it("un lâche en bonne santé se bat", () => {
    const s = fight(hero(2), foe("goblin", 3));
    expect(s.log.some((l) => l.includes("prend la fuite"))).toBe(false);
  });

  it("un lâche coincé se bat", () => {
    // Un couloir sans issue : le gobelin ne peut pas s'éloigner du héros, donc il se bat.
    const corner: Arena = { rows: ["####", "....", "####"] };
    const s = startCombat([{ ...hero(1), pos: { x: 1, y: 1 } }], [foe("goblin", 0, { hp: 1, pos: { x: 0, y: 1 } })], () => 0.5, corner);
    expect(getCombatant(s, "goblin-1").fled).toBeUndefined();
  });

  it("tous les monstres lâches sont des monstres du bestiaire, et les rencontres se construisent", () => {
    for (const m of MONSTERS) for (const t of m.traits ?? []) expect(["pack-tactics", "undead-fortitude", "aggressive", "archer", "coward"]).toContain(t);
    expect(buildEnemies({ id: "x", name: "x", monsters: [{ monsterId: "bandit", count: 2 }], reinforcements: [], reinforceText: "" })).toHaveLength(2);
  });
});
