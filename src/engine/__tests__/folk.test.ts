import { describe, expect, it } from "vitest";
import { MAPS, PASSABLE, type MapDef } from "../../data/maps";
import { parseMap, tileAt, validateMap } from "../exploration";
import { folkLine, folkStep, startFolk } from "../folk";
import { FOLK_SPRITES, spriteSvg, folkSpriteKey } from "../../ui/sprites";

const village = MAPS[0];

describe("habitants du village", () => {
  it("chaque habitant est bien posé : case plate libre dans sa zone, dessin connu, au moins une phrase", () => {
    const g = parseMap(village);
    const ids = new Set<string>();
    expect((village.folk ?? []).length).toBeGreaterThanOrEqual(8);
    for (const f of village.folk ?? []) {
      expect(ids.has(f.id), `${f.id} en double`).toBe(false);
      ids.add(f.id);
      const t = tileAt(g, f);
      expect(PASSABLE[t] && t !== "door" && t !== "stairs", `${f.id} sur ${t}`).toBe(true);
      expect(f.x >= f.roam.x0 && f.x <= f.roam.x1 && f.y >= f.roam.y0 && f.y <= f.roam.y1, `${f.id} hors de sa zone`).toBe(true);
      expect(FOLK_SPRITES, f.id).toContain(f.sprite);
      expect(spriteSvg(folkSpriteKey(f.sprite))).toBeTruthy();
      expect(f.lines.length, f.id).toBeGreaterThan(0);
      expect(village.spots?.some((s) => s.x === f.x && s.y === f.y), `${f.id} sur un lieu`).toBeFalsy();
      expect(village.enemies.some((e) => e.x === f.x && e.y === f.y), `${f.id} sur un ennemi`).toBeFalsy();
    }
    expect(validateMap(village)).toEqual([]);
  });

  it("ils se promènent d'un pas à la fois, restent dans leur zone et ne se marchent pas dessus", () => {
    let folk = startFolk(village);
    const moved = new Set<string>();
    let seed = 1;
    const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const g = parseMap(village);
    for (let i = 0; i < 400; i++) {
      const next = folkStep(village, folk, [], rng);
      for (let k = 0; k < next.length; k++) {
        const a = folk[k], b = next[k];
        expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBeLessThanOrEqual(1);
        if (a.x !== b.x || a.y !== b.y) moved.add(a.id);
        const def = village.folk!.find((f) => f.id === b.id)!;
        expect(b.x >= def.roam.x0 && b.x <= def.roam.x1 && b.y >= def.roam.y0 && b.y <= def.roam.y1).toBe(true);
        const t = tileAt(g, b);
        expect(PASSABLE[t] && t !== "door", `${b.id} sur ${t}`).toBe(true);
      }
      expect(new Set(next.map((f) => `${f.x},${f.y}`)).size).toBe(next.length);
      folk = next;
    }
    expect(moved.size).toBeGreaterThanOrEqual((village.folk ?? []).length - 1);
  });

  it("ils évitent le héros, les lieux et les ennemis", () => {
    const m: MapDef = { id: "t", name: "t", description: "t", rows: ["....."], start: { x: 0, y: 0 }, enemies: [],
      folk: [{ id: "a", sprite: "paysan", name: "A", x: 2, y: 0, roam: { x0: 0, y0: 0, x1: 4, y1: 0 }, lines: ["x"] }] };
    const folk = startFolk(m);
    for (let i = 0; i < 30; i++) {
      const next = folkStep(m, folk, [{ x: 1, y: 0 }, { x: 3, y: 0 }], () => 0.9);
      expect(next[0]).toEqual({ id: "a", x: 2, y: 0 }); // encerclé : il reste
    }
  });

  it("une phrase au hasard parmi les siennes", () => {
    const d = village.folk![0];
    expect(d.lines).toContain(folkLine(d, () => 0));
    expect(d.lines).toContain(folkLine(d, () => 0.999));
  });
});
