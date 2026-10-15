import { describe, expect, it } from "vitest";
import { MAPS, MAP_BY_ID, type MapDef } from "../../data/maps";
import { ENCOUNTERS } from "../../data/encounters";
import {
  cellDistance, cellMeters, defeatEnemy, findPath, key, livingEnemies, mapOf, parseMap, planPath, reachableFrom, retreatToStart,
  startExploration, stepTo, validateMap, visibleCells, visibleEnemies, walkable,
} from "../exploration";

const tiny = (rows: string[], extra: Partial<MapDef> = {}): MapDef => ({ id: "tiny", name: "t", description: "t", rows, start: { x: 0, y: 0 }, enemies: [], ...extra });

describe("cartes", () => {
  it("chaque carte est valide : départ libre, ennemis atteignables, rencontres existantes", () => {
    for (const m of MAPS) {
      expect(validateMap(m), m.id).toEqual([]);
      for (const e of m.enemies) expect(ENCOUNTERS.some((x) => x.id === e.encounterId), `${m.id}/${e.id}`).toBe(true);
    }
  });
  it("détecte les cartes invalides", () => {
    expect(validateMap(tiny(["..", "."]))).not.toEqual([]);
    expect(validateMap(tiny(["?."]))).not.toEqual([]);
    expect(validateMap(tiny(["T.."]))).not.toEqual([]); // départ dans un arbre
    expect(validateMap(tiny(["...", "###", "..."], { enemies: [{ id: "a", encounterId: "wolf", x: 0, y: 2 }] }))).not.toEqual([]); // inatteignable
  });
});

describe("déplacement", () => {
  it("les diagonales comptent pour une case, mais ne coupent pas un coin", () => {
    const g = parseMap(tiny(["...", "...", "..."]));
    expect(findPath(g, { x: 0, y: 0 }, { x: 2, y: 2 })).toHaveLength(2);
    const wall = parseMap(tiny([".#.", "#..", "..."]));
    // (0,0) → (1,1) en diagonale est interdit : les deux cases voisines sont des murs
    expect(findPath(wall, { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
  });
  it("contourne les obstacles et refuse l'eau, les arbres et les murs", () => {
    const g = parseMap(tiny([".T.", ".T.", "..."]));
    const p = findPath(g, { x: 0, y: 0 }, { x: 2, y: 0 })!;
    expect(p.at(-1)).toEqual({ x: 2, y: 0 });
    expect(p.some((c) => c.x === 1 && c.y < 2)).toBe(false);
    for (const ch of ["T", "#", "~"]) expect(walkable(parseMap(tiny([`.${ch}`])), { x: 1, y: 0 })).toBe(false);
    for (const ch of [":", ",", "D", "="]) expect(walkable(parseMap(tiny([`.${ch}`])), { x: 1, y: 0 })).toBe(true);
  });
  it("la distance se compte en mètres (1,5 m par case)", () => {
    expect(cellMeters(6)).toBe(9);
    expect(cellDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(4);
  });
  it("toute la carte du village est reliée au départ", () => {
    const m = MAP_BY_ID.brumeval;
    const g = parseMap(m);
    const reach = reachableFrom(g, m.start);
    let open = 0;
    for (let y = 0; y < g.height; y++) for (let x = 0; x < g.width; x++) if (walkable(g, { x, y })) open++;
    // les cases closes (intérieur fermé) restent accessibles par leur porte
    expect(reach.size).toBeGreaterThan(open * 0.85);
  });
});

describe("vue et brouillard", () => {
  it("un mur bloque la vue mais est vu lui-même", () => {
    const g = parseMap(tiny([".#.."]));
    const v = visibleCells(g, { x: 0, y: 0 });
    expect(v.has("1,0")).toBe(true);
    expect(v.has("2,0")).toBe(false);
  });
  it("la porte fermée bloque la vue ; on voit au-delà depuis la porte", () => {
    const g = parseMap(tiny([".D.."]));
    expect(visibleCells(g, { x: 0, y: 0 }).has("2,0")).toBe(false);
    expect(visibleCells(g, { x: 1, y: 0 }).has("2,0")).toBe(true);
  });
  it("la portée de vue est limitée", () => {
    const g = parseMap(tiny(["." .repeat(30)]));
    expect(visibleCells(g, { x: 0, y: 0 }).has("20,0")).toBe(false);
    expect(visibleCells(g, { x: 0, y: 0 }, 8).has("8,0")).toBe(true);
  });
  it("au départ, seules les cases proches sont explorées ; marcher en révèle d'autres", () => {
    const st = startExploration(MAP_BY_ID.brumeval);
    const n0 = st.explored.length;
    expect(n0).toBeGreaterThan(5);
    expect(n0).toBeLessThan(MAP_BY_ID.brumeval.rows.length * MAP_BY_ID.brumeval.rows[0].length);
    stepTo(st, { x: 10, y: 6 });
    expect(st.explored.length).toBeGreaterThan(n0);
    expect(st.explored).toContain("10,6");
  });
});

describe("pas, ennemis et rencontres", () => {
  const arena = tiny(["........", "........", "........"], { start: { x: 0, y: 1 }, enemies: [{ id: "w", encounterId: "wolf", x: 6, y: 1 }] });
  const withArena = () => {
    MAP_BY_ID.tiny = arena;
    return startExploration(arena);
  };

  it("un pas ne peut viser qu'une case voisine libre", () => {
    const st = withArena();
    expect(() => stepTo(st, { x: 3, y: 1 })).toThrow();
    expect(() => stepTo(st, { x: 1, y: 1 })).not.toThrow();
    expect(st.x).toBe(1);
  });
  it("l'ennemi est repéré quand il entre dans le champ de vision", () => {
    const st = withArena();
    expect(visibleEnemies(arena, st).map((e) => e.id)).toEqual(["w"]); // 6 cases : déjà visible
    const far = tiny(["." .repeat(20)], { id: "far", start: { x: 0, y: 0 }, enemies: [{ id: "w", encounterId: "wolf", x: 12, y: 0 }] });
    MAP_BY_ID.far = far;
    const f = startExploration(far);
    expect(visibleEnemies(far, f)).toHaveLength(0);
    let spottedAt = -1;
    for (let x = 1; x < 12; x++) { if (stepTo(f, { x, y: 0 }).spotted.length) { spottedAt = x; break; } }
    expect(spottedAt).toBeGreaterThan(0);
    expect(12 - spottedAt).toBeLessThanOrEqual(9);
  });
  it("arriver au contact déclenche la rencontre ; on ne traverse pas un ennemi", () => {
    const st = withArena();
    for (let x = 1; x <= 4; x++) expect(stepTo(st, { x, y: 1 }).ambush).toBeUndefined();
    expect(stepTo(st, { x: 5, y: 1 }).ambush?.id).toBe("w");
    expect(() => stepTo(st, { x: 6, y: 1 })).toThrow();
  });
  it("viser un ennemi donne un chemin jusqu'à la case voisine", () => {
    const st = withArena();
    const plan = planPath(st, { x: 6, y: 1 })!;
    expect(plan.enemy?.id).toBe("w");
    expect(plan.path.at(-1)).toEqual({ x: 5, y: 1 });
    // déjà au contact : chemin vide
    st.x = 5;
    expect(planPath(st, { x: 6, y: 1 })!.path).toEqual([]);
  });
  it("viser une case inatteignable ne donne rien", () => {
    const m = tiny([".#.."], { id: "wall" });
    MAP_BY_ID.wall = m;
    expect(planPath(startExploration(m), { x: 2, y: 0 })).toBeNull();
  });
  it("un ennemi vaincu disparaît ; la défaite ramène au départ", () => {
    const st = withArena();
    st.x = 5;
    const won = defeatEnemy(st, "w");
    expect(livingEnemies(arena, won)).toHaveLength(0);
    expect(defeatEnemy(won, "w").defeated).toEqual(["w"]);
    const lost = retreatToStart(st);
    expect(lost).toMatchObject({ x: 0, y: 1 });
    expect(lost.defeated).toEqual([]);
    expect(mapOf(lost).id).toBe("tiny");
  });
  it("la carte du village : on atteint chaque ennemi", () => {
    const m = MAP_BY_ID.brumeval;
    const st = startExploration(m);
    for (const e of m.enemies) expect(planPath(st, e), e.id).not.toBeNull();
    expect(key({ x: 1, y: 2 })).toBe("1,2");
  });
});
