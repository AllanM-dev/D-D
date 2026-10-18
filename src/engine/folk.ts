import { PASSABLE, type MapDef, type MapFolk } from "../data/maps";
import type { Rng } from "./dice";
import { parseMap, tileAt, type Cell } from "./exploration";

/** Position actuelle d'un habitant (les positions de départ sont dans la carte). */
export interface FolkPos {
  id: string;
  x: number;
  y: number;
}

export const startFolk = (map: MapDef): FolkPos[] => (map.folk ?? []).map((f) => ({ id: f.id, x: f.x, y: f.y }));

const STEPS: Cell[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

/**
 * Un tour de promenade : chaque habitant, une fois sur deux, fait un pas vers une case voisine de sa zone, libre et plate
 * (herbe, chemin, pont, champ) ; jamais sur une case de `avoid` (le héros, les lieux, les ennemis) ni sur celle d'un autre habitant.
 */
export function folkStep(map: MapDef, folk: readonly FolkPos[], avoid: readonly Cell[], rng: Rng): FolkPos[] {
  const defs = new Map((map.folk ?? []).map((f) => [f.id, f] as const));
  const g = parseMap(map);
  const taken = new Set([...avoid.map((c) => `${c.x},${c.y}`), ...folk.map((f) => `${f.x},${f.y}`)]);
  return folk.map((f) => {
    const def = defs.get(f.id);
    if (!def || rng() < 0.5) return f;
    const options = STEPS.map((d) => ({ x: f.x + d.x, y: f.y + d.y })).filter((c) => {
      const r = def.roam;
      if (c.x < r.x0 || c.x > r.x1 || c.y < r.y0 || c.y > r.y1) return false;
      if (c.x < 0 || c.y < 0 || c.x >= g.width || c.y >= g.height) return false;
      const t = tileAt(g, c);
      return PASSABLE[t] && t !== "door" && t !== "stairs" && !taken.has(`${c.x},${c.y}`);
    });
    if (!options.length) return f;
    const to = options[Math.floor(rng() * options.length)];
    taken.delete(`${f.x},${f.y}`);
    taken.add(`${to.x},${to.y}`);
    return { id: f.id, x: to.x, y: to.y };
  });
}

/** Ce que dit un habitant quand on le touche. */
export const folkLine = (def: MapFolk, rng: Rng): string => def.lines[Math.floor(rng() * def.lines.length)];
