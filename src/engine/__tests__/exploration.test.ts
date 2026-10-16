import { describe, expect, it } from "vitest";
import { MAPS, MAP_BY_ID, type MapDef } from "../../data/maps";
import { ENCOUNTERS } from "../../data/encounters";
import {
  cellDistance, cellMeters, defeatEnemy, findPath, foeMoves, key, livingEnemies, mapOf, parseMap, planPath, reachableFrom, retreatToStart,
  startExploration, stepTo, travelTo, validateMap, visibleCells, visibleEnemies, walkable,
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
    // Le loup vient à la rencontre du héros : le contact arrive avant la case 5.
    let ambush; let x = 0;
    while (!ambush && x < 5) ambush = stepTo(st, { x: ++x, y: 1 }).ambush;
    expect(ambush?.id).toBe("w");
    expect(x).toBeLessThan(5);
    const wolfAt = livingEnemies(arena, st)[0];
    expect(() => stepTo(st, { x: wolfAt.x, y: wolfAt.y })).toThrow();
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
  it("un ennemi vaincu disparaît ; la défaite ramène au village", () => {
    const st = withArena();
    st.x = 5;
    const won = defeatEnemy(st, "w");
    expect(livingEnemies(arena, won)).toHaveLength(0);
    expect(defeatEnemy(won, "w").defeated).toEqual(["w"]);
    const lost = retreatToStart(st);
    expect(lost).toMatchObject({ mapId: "brumeval", x: MAP_BY_ID.brumeval.start.x, y: MAP_BY_ID.brumeval.start.y });
    expect(lost.defeated).toEqual([]);
  });
  it("chaque ennemi de chaque carte est atteignable (portes déverrouillées)", () => {
    const open = ["crypte-ouverte", "sceau-brise"];
    for (const m of MAPS) {
      const st = startExploration(m);
      for (const e of m.enemies) expect(planPath(st, e, open), `${m.id}/${e.id}`).not.toBeNull();
    }
    const st = startExploration(MAP_BY_ID.crypte);
    expect(planPath(st, MAP_BY_ID.crypte.enemies.find((e) => e.id === "ghoul-1")!, [])).toBeNull(); // derrière la porte scellée
    expect(key({ x: 1, y: 2 })).toBe("1,2");
  });
  it("les identifiants d'ennemis sont uniques d'une carte à l'autre", () => {
    const ids = MAPS.flatMap((m) => m.enemies.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("passages entre cartes", () => {
  const village = MAP_BY_ID.brumeval;
  const crypt = MAP_BY_ID.crypte;
  it("marcher sur le passage de la porte de la crypte propose le voyage (une fois ouverte)", () => {
    const st = startExploration(village);
    st.x = 17; st.y = 10;
    st.defeated = village.enemies.map((e) => e.id); // les gardiens ne gênent pas ce test
    const res = stepTo(st, { x: 17, y: 11 }, ["crypte-ouverte"]);
    expect(res.travel?.to.map).toBe("crypte");
  });
  it("voyager garde la mémoire des zones explorées de chaque carte", () => {
    const st = startExploration(village);
    const villageSeen = st.explored.length;
    const inside = travelTo(st, village.exits![0]);
    expect(inside.mapId).toBe("crypte");
    expect(inside).toMatchObject({ x: 3, y: 1 });
    expect(inside.others!.brumeval).toHaveLength(villageSeen);
    expect(inside.explored).toContain("3,1");
    const back = travelTo(inside, crypt.exits![0]);
    expect(back.mapId).toBe("brumeval");
    expect(back.explored.length).toBeGreaterThanOrEqual(villageSeen);
    for (const k of st.explored) expect(back.explored).toContain(k);
    expect(back.others!.crypte).toContain("3,1");
    expect(back.others!.brumeval).toBeUndefined();
  });
  it("on n'arrive pas sur un passage : il faut s'en éloigner pour le reprendre", () => {
    const inside = travelTo(startExploration(village), village.exits![0]);
    expect(inside.x === crypt.exits![0].x && inside.y === crypt.exits![0].y).toBe(false);
  });
  it("une défaite dans la crypte ramène au village", () => {
    const inside = travelTo(startExploration(village), village.exits![0]);
    const lost = retreatToStart(inside);
    expect(lost.mapId).toBe("brumeval");
    expect(lost).toMatchObject({ x: village.start.x, y: village.start.y });
    expect(lost.others!.crypte).toBeTruthy();
  });
  it("les passages mènent à des cases libres de cartes existantes", () => {
    for (const m of MAPS) expect(validateMap(m), m.id).toEqual([]);
  });
});

describe("poursuite des ennemis", () => {
  const open = (enemies: MapDef["enemies"]) => tiny(["............", "............", "............"], { start: { x: 1, y: 1 }, enemies });
  const withMap = (m: MapDef) => {
    const prev = MAP_BY_ID.tiny;
    (MAP_BY_ID as Record<string, MapDef>).tiny = m;
    return () => { if (prev) (MAP_BY_ID as Record<string, MapDef>).tiny = prev; else delete (MAP_BY_ID as Record<string, MapDef>).tiny; };
  };

  it("un ennemi qui voit le héros s'approche ; il le rejoint et déclenche la rencontre", () => {
    const m = open([{ id: "w", encounterId: "goblin", x: 8, y: 1 }]);
    const done = withMap(m);
    const st = startExploration(m);
    const res = stepTo(st, { x: 1, y: 0 });
    expect(res.chased.map((e) => e.id)).toEqual(["w"]);
    expect(st.foes?.w).toEqual({ x: 7, y: 1 });
    expect(livingEnemies(m, st)[0].x).toBe(7);
    let ambush = res.ambush;
    for (let i = 0; i < 10 && !ambush; i++) ambush = stepTo(st, { x: 1, y: i % 2 ? 0 : 1 }).ambush;
    expect(ambush?.id).toBe("w");
    done();
  });

  it("un ennemi qui ne voit pas le héros reste en place (mur, ou trop loin)", () => {
    const m = tiny(["....#....", "....#....", "....#...."], { start: { x: 0, y: 0 }, enemies: [{ id: "w", encounterId: "goblin", x: 8, y: 1 }] });
    const done = withMap(m);
    const st = startExploration(m);
    expect(stepTo(st, { x: 1, y: 0 }).chased).toEqual([]);
    expect(st.foes).toBeUndefined();
    done();
  });

  it("la vitesse règle la cadence : un loup va plus vite qu'un zombie", () => {
    const fast = { id: "x", encounterId: "wolf", x: 0, y: 0 };
    const slow = { id: "y", encounterId: "zombie", x: 0, y: 0 };
    const sum = (e: typeof fast) => [0, 1, 2, 3, 4, 5].reduce((a, t) => a + foeMoves(e, t), 0);
    expect(sum(fast)).toBe(8);
    expect(sum(slow)).toBe(4);
  });

  it("une défaite remet les ennemis à leur poste", () => {
    const st = { ...startExploration(MAPS[0]), foes: { "wolf-1": { x: 9, y: 9 } } };
    expect(retreatToStart(st).foes).toBeUndefined();
  });
});
