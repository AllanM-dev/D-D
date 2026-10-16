import { OPAQUE, TILE_CHARS, type TileKind } from "../data/maps";
import { CELL_METERS, cellDistance, findPath, type Cell, type Grid } from "./exploration";

/** Terrain d'un combat : les lignes d'une carte (voir `src/data/maps.ts`). */
export interface Arena {
  rows: string[];
}

const cache = new WeakMap<string[], Grid>();

export function gridOf(arena: Arena): Grid {
  let g = cache.get(arena.rows);
  if (!g) {
    const tiles = arena.rows.map((row, y) =>
      [...row].map((ch, x) => {
        const t = TILE_CHARS[ch];
        if (!t) throw new Error(`Case inconnue « ${ch} » en ${x},${y}`);
        return t as TileKind;
      }),
    );
    g = { width: tiles[0]?.length ?? 0, height: tiles.length, tiles };
    cache.set(arena.rows, g);
  }
  return g;
}

export const metersBetween = (a: Cell, b: Cell) => cellDistance(a, b) * CELL_METERS;

/** Nombre de cases que permet une vitesse en mètres (9 m → 6 cases). */
export const speedCells = (speedMeters: number) => Math.floor(speedMeters / CELL_METERS + 1e-9);

/** Cases traversées (sans les extrémités) par la ligne qui relie deux cases. */
function between(a: Cell, b: Cell): Cell[] {
  const out: Cell[] = [];
  let x = a.x, y = a.y;
  const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1, sy = a.y < b.y ? 1 : -1;
  let err = dx - dy;
  while (!(x === b.x && y === b.y)) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
    if (!(x === b.x && y === b.y)) out.push({ x, y });
  }
  return out;
}

/** Aucune case opaque (mur, arbre, porte fermée) entre les deux cases. */
export function hasLineOfSight(arena: Arena, a: Cell, b: Cell): boolean {
  const g = gridOf(arena);
  return between(a, b).every((c) => !OPAQUE[g.tiles[c.y][c.x]]);
}

/** Chemin libre (les cases occupées bloquent) ; null s'il n'y en a pas. */
export function pathBetween(arena: Arena, from: Cell, to: Cell, occupied: Set<string>): Cell[] | null {
  return findPath(gridOf(arena), from, to, occupied);
}

/** Cases libres autour d'un point, de la plus proche à la plus lointaine (pour placer plusieurs ennemis). */
export function freeCellsNear(arena: Arena, anchor: Cell, occupied: Set<string>, minDistance = 0): Cell[] {
  const g = gridOf(arena);
  const out: { c: Cell; d: number }[] = [];
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      const t = g.tiles[y][x];
      if (t === "tree" || t === "wall" || t === "water" || t === "door" || t === "stairs") continue;
      const d = cellDistance(anchor, { x, y });
      if (d >= minDistance && !occupied.has(`${x},${y}`)) out.push({ c: { x, y }, d });
    }
  }
  return out.sort((p, q) => p.d - q.d || p.c.y - q.c.y || p.c.x - q.c.x).map((o) => o.c);
}

/** Terrain d'un combat sans carte : une clairière de 12 × 8 cases. */
export const CLEARING: Arena = {
  rows: [
    "TTTTTTTTTTTT",
    "T..........T",
    "T...T......T",
    "T..........T",
    "T..........T",
    "T......T...T",
    "T..........T",
    "TTTTTTTTTTTT",
  ],
};
