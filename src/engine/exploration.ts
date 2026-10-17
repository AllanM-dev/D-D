import { ENCOUNTERS } from "../data/encounters";
import { MONSTERS } from "../data/monsters";
import { MAPS, MAP_BY_ID, OPAQUE, PASSABLE, TILE_CHARS, type MapDef, type MapEnemy, type MapExit, type MapSpot, type TileKind } from "../data/maps";

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
  /** Cases déjà vues sur la carte actuelle, « x,y ». */
  explored: string[];
  /** Cases déjà vues sur les autres cartes visitées. */
  others?: Record<string, string[]>;
  /** Ennemis vaincus (identifiants de la carte). */
  defeated: string[];
  /** Ennemis qui ont quitté leur poste pour poursuivre le héros (position actuelle). */
  foes?: Record<string, Cell>;
  /** Nombre de pas faits sur la carte : cadence les ennemis plus lents ou plus rapides que le héros. */
  ticks?: number;
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
  for (const sp of map.spots ?? []) {
    if (!walkable(g, sp)) errors.push(`${map.id} : lieu ${sp.id} sur une case infranchissable`);
    if (sp.door && (!inside(g, sp.door) || tileAt(g, sp.door) !== "door")) errors.push(`${map.id} : la porte de ${sp.id} n'est pas une porte`);
  }
  for (const l of map.locks ?? []) if (!walkable(g, l)) errors.push(`${map.id} : verrou en ${l.x},${l.y} sur une case infranchissable`);
  for (const ex of map.exits ?? []) {
    if (!walkable(g, ex)) errors.push(`${map.id} : passage en ${ex.x},${ex.y} sur une case infranchissable`);
    const dest = MAP_BY_ID[ex.to.map];
    if (!dest) errors.push(`${map.id} : passage vers une carte inconnue (${ex.to.map})`);
    else if (!walkable(parseMap(dest), ex.to)) errors.push(`${map.id} : arrivée en ${ex.to.x},${ex.to.y} de ${ex.to.map} infranchissable`);
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
export function neighbors(g: Grid, c: Cell, blocked: Set<string>): Cell[] {
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
export const livingEnemies = (map: MapDef, st: ExplorationState): MapEnemy[] =>
  map.enemies.filter((e) => !st.defeated.includes(e.id)).map((e) => (st.foes?.[e.id] ? { ...e, ...st.foes[e.id] } : e));
/** Lieux et personnages encore présents (selon les drapeaux de l'histoire). */
export const liveSpots = (map: MapDef, flags: readonly string[] = []): MapSpot[] =>
  (map.spots ?? []).filter((s) => !s.hiddenWhen || !flags.includes(s.hiddenWhen));
/** Portes verrouillées qui le sont encore. */
export const lockedCells = (map: MapDef, flags: readonly string[] = []) => (map.locks ?? []).filter((l) => !flags.includes(l.flag));
/** Cases où l'on ne peut pas entrer : ennemis vivants, personnages, portes verrouillées. */
const blockedCells = (map: MapDef, st: ExplorationState, flags: readonly string[]) =>
  new Set([...livingEnemies(map, st), ...liveSpots(map, flags), ...lockedCells(map, flags)].map(key));

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
  /** Le pas mène à un passage vers une autre carte. */
  travel?: MapExit;
  /** Ennemis qui ont bougé en réponse à ce pas (ils poursuivent le héros). */
  chased: MapEnemy[];
}

/** Cases parcourues par un ennemi pendant ce pas du héros (1 case par pas à la vitesse du héros, 9 m). */
export function foeMoves(enemy: MapEnemy, tick: number): number {
  const enc = ENCOUNTERS.find((e) => e.id === enemy.encounterId);
  const speed = enc ? (MONSTERS.find((m) => m.id === enc.monsters[0].monsterId)?.speed ?? 9) : 9;
  const r = speed / 9;
  return Math.floor((tick + 1) * r + 1e-9) - Math.floor(tick * r + 1e-9);
}

/** Les ennemis qui voient le héros s'approchent de lui. Renvoie ceux qui ont bougé. */
function chase(map: MapDef, st: ExplorationState, flags: readonly string[]): MapEnemy[] {
  const g = parseMap(map);
  const hero: Cell = { x: st.x, y: st.y };
  const moved = new Map<string, MapEnemy>();
  const tick = st.ticks ?? 0;
  for (const base of livingEnemies(map, st)) {
    let cur = livingEnemies(map, st).find((e) => e.id === base.id)!;
    for (let i = foeMoves(cur, tick); i > 0; i--) {
      if (cellDistance(cur, hero) <= 1 || !visibleCells(g, cur).has(key(hero))) break;
      const blocked = new Set([...livingEnemies(map, st).filter((e) => e.id !== cur.id), ...liveSpots(map, flags), ...lockedCells(map, flags)].map(key));
      const path = findPath(g, cur, hero, blocked);
      if (!path || path.length < 2) break;
      st.foes = { ...(st.foes ?? {}), [cur.id]: path[0] };
      cur = { ...cur, ...path[0] };
      moved.set(cur.id, cur);
    }
  }
  return [...moved.values()];
}

/** Un pas vers une case voisine libre. Lève une erreur si le pas est impossible. */
export function stepTo(st: ExplorationState, to: Cell, flags: readonly string[] = []): StepResult {
  const map = mapOf(st);
  const g = parseMap(map);
  if (cellDistance(st, to) !== 1 || !neighbors(g, st, blockedCells(map, st, flags)).some((n) => same(n, to))) throw new Error("Pas impossible.");
  st.x = to.x;
  st.y = to.y;
  const spotted = reveal(map, st);
  let ambush = livingEnemies(map, st).find((e) => cellDistance(e, st) <= 1);
  let chased: MapEnemy[] = [];
  if (!ambush) {
    chased = chase(map, st, flags);
    st.ticks = (st.ticks ?? 0) + 1;
    ambush = livingEnemies(map, st).find((e) => cellDistance(e, st) <= 1);
  }
  const travel = ambush ? undefined : (map.exits ?? []).find((e) => same(e, st));
  return { spotted, ambush, travel, chased };
}

export interface Plan {
  path: Cell[];
  /** La destination est un ennemi : le chemin s'arrête à son contact. */
  enemy?: MapEnemy;
  /** La destination est un lieu ou un personnage : le chemin s'arrête à côté. */
  spot?: MapSpot;
}

/** Chemin vers une case libre, ou vers la case voisine d'un ennemi ou d'un lieu si la destination en porte un. */
export function planPath(st: ExplorationState, target: Cell, flags: readonly string[] = []): Plan | null {
  const map = mapOf(st);
  const g = parseMap(map);
  const enemy = livingEnemies(map, st).find((e) => same(e, target));
  const spot = enemy ? undefined : liveSpots(map, flags).find((s) => same(s, target));
  const blocked = blockedCells(map, st, flags);
  if (!enemy && !spot) {
    const path = findPath(g, st, target, blocked);
    return path ? { path } : null;
  }
  const dest = (enemy ?? spot)!;
  if (cellDistance(st, dest) <= 1) return { path: [], enemy, spot };
  // Meilleure case voisine de la destination.
  let best: Cell[] | null = null;
  for (const d of DIRS) {
    const n = { x: dest.x + d.x, y: dest.y + d.y };
    if (!walkable(g, n) || blocked.has(key(n))) continue;
    // Une diagonale ne peut pas couper un coin : on laisse `findPath` en juger.
    const p = findPath(g, st, n, blocked);
    if (p && (!best || p.length < best.length)) best = p;
  }
  return best ? { path: best, enemy, spot } : null;
}

/** Marque un ennemi comme vaincu. */
export function defeatEnemy(st: ExplorationState, enemyId: string): ExplorationState {
  return st.defeated.includes(enemyId) ? st : { ...st, defeated: [...st.defeated, enemyId] };
}

/** Pose le héros sur une case (fin d'un combat sur la carte) et dévoile ce qu'il y voit. */
export function placeAt(st: ExplorationState, cell: Cell): ExplorationState {
  const next: ExplorationState = { ...st, x: cell.x, y: cell.y, explored: [...st.explored] };
  reveal(mapOf(st), next);
  return next;
}

/** Passe par un passage : le héros arrive sur l'autre carte, qui garde ses zones déjà explorées. */
export function travelTo(st: ExplorationState, exit: MapExit): ExplorationState {
  const dest = MAP_BY_ID[exit.to.map];
  if (!dest) throw new Error(`Carte inconnue : ${exit.to.map}`);
  const others = { ...(st.others ?? {}), [st.mapId]: [...st.explored] };
  const known = others[dest.id] ?? [];
  delete others[dest.id];
  const next: ExplorationState = { ...st, mapId: dest.id, x: exit.to.x, y: exit.to.y, explored: [...known], others };
  reveal(dest, next);
  return next;
}

/** Après une défaite, le héros se réveille au village (départ de la première carte). */
export function retreatToStart(st: ExplorationState): ExplorationState {
  const home = MAPS[0];
  const back = st.mapId === home.id ? st : travelTo(st, { x: st.x, y: st.y, label: "", to: { map: home.id, x: home.start.x, y: home.start.y } });
  const next: ExplorationState = { ...back, x: home.start.x, y: home.start.y, explored: [...back.explored] };
  next.foes = undefined; // les ennemis regagnent leur poste
  reveal(home, next);
  return next;
}
