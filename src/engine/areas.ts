import type { Cell } from "./exploration";

/** Forme d'une zone d'effet, en cases (1 case = 1,5 m). */
export type AreaShape =
  /** Cône qui part du lanceur vers la cible : `size` cases de long, ouvert à 90°. */
  | { kind: "cone"; size: number }
  /** Cube qui part du lanceur : `size` cases de côté, collé à lui, dans la direction de la cible. */
  | { kind: "cube"; size: number }
  /** Carré de `size` cases de côté, centré sur la case visée. */
  | { kind: "square"; size: number };

const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

/** Cases touchées par une zone, du lanceur `from` vers la case visée `aim` (le lanceur lui-même n'en fait jamais partie). */
export function areaCells(shape: AreaShape, from: Cell, aim: Cell): Cell[] {
  const out: Cell[] = [];
  if (shape.kind === "square") {
    const lo = -Math.ceil(shape.size / 2) + 1;
    for (let dy = lo; dy < lo + shape.size; dy++) for (let dx = lo; dx < lo + shape.size; dx++) out.push({ x: aim.x + dx, y: aim.y + dy });
    return out.filter((c) => !(c.x === from.x && c.y === from.y));
  }
  const dx = aim.x - from.x, dy = aim.y - from.y;
  if (dx === 0 && dy === 0) return out;
  if (shape.kind === "cone") {
    const len = Math.hypot(dx, dy);
    for (let y = from.y - shape.size; y <= from.y + shape.size; y++) {
      for (let x = from.x - shape.size; x <= from.x + shape.size; x++) {
        const vx = x - from.x, vy = y - from.y;
        const d = Math.hypot(vx, vy);
        if (d === 0 || d > shape.size + 0.5) continue;
        // Demi-ouverture de 45° : le cosinus de l'angle avec l'axe doit dépasser √2/2.
        if ((vx * dx + vy * dy) / (d * len) >= Math.SQRT1_2 - 1e-9) out.push({ x, y });
      }
    }
    return out;
  }
  // Cube collé au lanceur : direction ramenée aux 8 directions de la grille.
  const diagonal = Math.min(Math.abs(dx), Math.abs(dy)) * 2 > Math.max(Math.abs(dx), Math.abs(dy));
  const sx = diagonal || Math.abs(dx) >= Math.abs(dy) ? sign(dx) : 0;
  const sy = diagonal || Math.abs(dy) > Math.abs(dx) ? sign(dy) : 0;
  const half = Math.floor(shape.size / 2);
  for (let a = 1; a <= shape.size; a++) {
    for (let b = -half; b <= half; b++) {
      if (sx && sy) out.push({ x: from.x + sx * a, y: from.y + sy * (b + half + 1) });
      else if (sx) out.push({ x: from.x + sx * a, y: from.y + b });
      else out.push({ x: from.x + b, y: from.y + sy * a });
    }
  }
  return out;
}
