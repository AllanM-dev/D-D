import { MAP_BY_ID, OPAQUE, PASSABLE, TILE_CHARS, type MapDef, type MapEnemy, type TileKind } from "../data/maps";

/** Une case de la carte fait 1,5 m. */
export const CELL_METERS = 1.5;
/** Distance de vue, en cases (12 m). */
export const VIEW_RADIUS = 8;

export interface Cell {
  x: number;
  y: number;
}

/** Ce que le personnage a fait sur la carte (sauvegardé avec lui). */
export interface ExplorationState {
  mapId: string;
  x: number;
  y: number;
  /** Cases déjà vues, « x,y ». */
  explored: string[];
  /** Ennemis vaincus (identifiants de la carte). */
  defeated: string[];
}

export const key = (c: Cell) => `${c.x},${c.y}`;
export const cellMeters = (cells: number) => cells * CELL_METERS;
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
/** Distance en cases (les diagonales comptent pour 1). */
export const cellDistance = (a: Cell, b: Cell) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export interface Grid {
  width: number;
  height: number;
  tiles: TileKind[][];
}

export function parseMap(map: MapDef): Grid {
  const tiles = map.rows.map((row, y) =>
    [...row].map((ch, x) => {
      const t = TILE_CHARS[ch];
      if (!t) throw new Error(`Case inconnue « ${ch} » en ${x},${y} de la carte ${map.id}`);
      return t;
    }),
  );
  const width = tiles[0]?.length ?? 0;
  if (!width || tiles.some((r) => r.length !== width)) throw new Error(`Carte ${map.id} : lignes de longueurs différentes`);
  return { width, height: tiles.length, tiles };
}

export const inside = (g: Grid, c: Cell) => c.x >= 0 && c.y >= 0 && c.x < g.width && c.y < g.height;
export const tileAt = (g: Grid, c: Cell): TileKind => g.tiles[c.y][c.x];
export const walkable = (g: Grid, c: Cell) => inside(g, c) && PASSABLE[tileAt(g, c)];

/** Liste les erreurs d'une carte (vide si elle est valide). */
export function validateMap(map: MapDef): string[] {
  const errors: string[] = [];
  let g: Grid;
  try { g = parseMap(map); } catch (e) { return [(e as Error).message]; }
  if (!walkable(g, map.start)) errors.push(`${map.id} : départ sur une case infranchissable`);
  const seen = new Set<string>();
  for (const e of map.enemies) {
    if (!walkable(g, e)) errors.push(`${map.id} : ${e.id} sur une case infranchissable`);
    if (seen.has(e.id)) errors.push(`${map.id} : identifiant ${e.id} en double`);
    seen.add(e.id);
    if (same(e, map.start)) errors.push(`${map.id} : ${e.id} sur le départ`);
  }
  const reach = reachableFrom(g, map.start);
  for (const e of map.enemies) if (walkable(g, e) && !reach.has(key(e))) errors.push(`${map.id} : ${e.id} inatteignable`);
  return errors;
}

const DIRS: Cell[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
];

/** Cases voisines où l'on peut aller ; une diagonale ne peut pas couper le coin d'un obstacle. */
function neighbors(g: Grid, c: Cell, blocked: Set<string>): Cell[] {
  const out: Cell[] = [];
  for (const d of DIRS) {
    const n = { x: c.x + d.x, y: c.y + d.y };
    if (!walkable(g, n) || blocked.has(key(n))) continue;
    if (d.x && d.y && (!walkable(g, { x: c.x + d.x, y: c.y }) || !walkable(g, { x: c.x, y: c.y + d.y }))) continue;
    out.push(n);
  }
  return out;
}

/** Toutes les cases accessibles depuis `from` (sans tenir compte des ennemis). */
export function reachableFrom(g: Grid, from: Cell): Set<string> {
  const seen = new Set([key(from)]);
  const queue = [from];
  while (queue.length) {
    const c = queue.shift()!;
    for (const n of neighbors(g, c, new Set())) if (!seen.has(key(n))) { seen.add(key(n)); queue.push(n); }
  }
  return seen;
}

/** Plus court chemin (sans la case de départ) ; null s'il n'y en a pas. */
export function findPath(g: Grid, from: Cell, to: Cell, blocked: Set<string> = new Set()): Cell[] | null {
  if (same(from, to)) return [];
  if (!walkable(g, to) || blocked.has(key(to))) return null;
  const prev = new Map<string, Cell>();
  const seen = new Set([key(from)]);
  const queue = [from];
  while (queue.length) {
    const c = queue.shift()!;
    for (const n of neighbors(g, c, blocked)) {
      if (seen.has(key(n))) continue;
      seen.add(key(n));
      prev.set(key(n), c);
      if (same(n, to)) {
        const path: Cell[] = [n];
        for (let p = prev.get(key(n))!; !same(p, from); p = prev.get(key(p))!) path.unshift(p);
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

function line(a: Cell, b: Cell): Cell[] {
  const out: Cell[] = [];
  let x = a.x, y = a.y;
  const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1, sy = a.y < b.y ? 1 : -1;
  let err = dx - dy;
  while (!(x === b.x && y === b.y)) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
    out.push({ x, y });
  }
  return out;
}

/** Cases vues depuis `origin` : dans le rayon et sans obstacle opaque sur la ligne de vue (l'obstacle lui-même est vu). */
export function visibleCells(g: Grid, origin: Cell, radius = VIEW_RADIUS): Set<string> {
  const out = new Set([key(origin)]);
  for (let y = origin.y - radius; y <= origin.y + radius; y++) {
    for (let x = origin.x - radius; x <= origin.x + radius; x++) {
      const c = { x, y };
      if (!inside(g, c) || (x - origin.x) ** 2 + (y - origin.y) ** 2 > radius * radius + radius) continue;
      const ray = line(origin, c);
      if (ray.slice(0, -1).every((r) => !OPAQUE[tileAt(g, r)])) out.add(key(c));
    }
  }
  return out;
}

// ---------------------------------------------------------------- état d'exploration

export function startExploration(map: MapDef): ExplorationState {
  const st: ExplorationState = { mapId: map.id, x: map.start.x, y: map.start.y, explored: [], defeated: [] };
  reveal(map, st);
  return st;
}

export const mapOf = (st: ExplorationState): MapDef => {
  const m = MAP_BY_ID[st.mapId];
  if (!m) throw new Error(`Carte inconnue : ${st.mapId}`);
  return m;
};

/** Ennemis encore en vie sur la carte. */
export const livingEnemies = (map: MapDef, st: ExplorationState): MapEnemy[] => map.enemies.filter((e) => !st.defeated.includes(e.id));
/** Cases occupées par un ennemi vivant. */
const enemyCells = (map: MapDef, st: ExplorationState) => new Set(livingEnemies(map, st).map(key));

/** Met à jour les cases explorées d'après la position. Renvoie les ennemis qui viennent d'apparaître. */
function reveal(map: MapDef, st: ExplorationState): MapEnemy[] {
  const g = parseMap(map);
  const before = new Set(st.explored);
  const wasVisible = new Set(livingEnemies(map, st).filter((e) => before.has(key(e))).map((e) => e.id));
  const vis = visibleCells(g, st);
  for (const k of vis) if (!before.has(k)) st.explored.push(k);
  return livingEnemies(map, st).filter((e) => vis.has(key(e)) && !wasVisible.has(e.id));
}

/** Ennemis visibles depuis la position actuelle. */
export function visibleEnemies(map: MapDef, st: ExplorationState): MapEnemy[] {
  const vis = visibleCells(parseMap(map), st);
  return livingEnemies(map, st).filter((e) => vis.has(key(e)));
}

export interface StepResult {
  /** Ennemis qui viennent d'entrer dans le champ de vision. */
  spotted: MapEnemy[];
  /** Ennemi au contact après ce pas : la rencontre commence. */
  ambush?: MapEnemy;
}

/** Un pas vers une case voisine libre. Lève une erreur si le pas est impossible. */
export function stepTo(st: ExplorationState, to: Cell): StepResult {
  const map = mapOf(st);
  const g = parseMap(map);
  if (cellDistance(st, to) !== 1 || !neighbors(g, st, enemyCells(map, st)).some((n) => same(n, to))) throw new Error("Pas impossible.");
  st.x = to.x;
  st.y = to.y;
  const spotted = reveal(map, st);
  const ambush = livingEnemies(map, st).find((e) => cellDistance(e, st) <= 1);
  return { spotted, ambush };
}

/** Chemin vers une case libre, ou vers la case voisine d'un ennemi si la destination en porte un. */
export function planPath(st: ExplorationState, target: Cell): { path: Cell[]; enemy?: MapEnemy } | null {
  const map = mapOf(st);
  const g = parseMap(map);
  const enemy = livingEnemies(map, st).find((e) => same(e, target));
  const blocked = enemyCells(map, st);
  if (!enemy) {
    const path = findPath(g, st, target, blocked);
    return path ? { path } : null;
  }
  if (cellDistance(st, enemy) <= 1) return { path: [], enemy };
  // Meilleure case voisine de l'ennemi.
  let best: Cell[] | null = null;
  for (const d of DIRS) {
    const n = { x: enemy.x + d.x, y: enemy.y + d.y };
    if (!walkable(g, n) || blocked.has(key(n))) continue;
    const p = findPath(g, st, n, blocked);
    if (p && (!best || p.length < best.length)) best = p;
  }
  return best ? { path: best, enemy } : null;
}

/** Marque un ennemi comme vaincu. */
export function defeatEnemy(st: ExplorationState, enemyId: string): ExplorationState {
  return st.defeated.includes(enemyId) ? st : { ...st, defeated: [...st.defeated, enemyId] };
}

/** Après une défaite, le héros se réveille au point de départ. */
export function retreatToStart(st: ExplorationState): ExplorationState {
  const map = mapOf(st);
  const next: ExplorationState = { ...st, x: map.start.x, y: map.start.y, explored: [...st.explored] };
  reveal(map, next);
  return next;
}
