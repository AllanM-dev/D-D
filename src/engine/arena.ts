import { MAP_BY_ID, type MapDef } from "../data/maps";
import { CLEARING, freeCellsNear, gridOf, type Arena } from "./battlefield";
import type { ExplorationState, Cell } from "./exploration";

export interface Setup {
  arena: Arena;
  hero: Cell;
  /** Position de chaque ennemi, dans l'ordre de la rencontre. */
  enemies: Cell[];
  /** Position de chaque compagnon : à côté du héros. */
  allies: Cell[];
}

const key = (c: Cell) => `${c.x},${c.y}`;

/**
 * Prépare le terrain d'un combat. Lancé depuis la carte, le combat se déroule sur la carte, le héros et l'ennemi
 * à leur place ; sinon (combat libre) dans une clairière. Les ennemis supplémentaires se placent autour du premier.
 */
export function buildSetup(enemyCount: number, from?: { exploration: ExplorationState; enemyCell?: Cell }, allyCount = 0): Setup {
  let arena: Arena = CLEARING;
  let hero: Cell = { x: 1, y: 4 };
  let anchor: Cell | undefined = { x: 9, y: 4 };
  if (from) {
    const map: MapDef | undefined = MAP_BY_ID[from.exploration.mapId];
    if (map) {
      arena = { rows: [...map.rows] };
      hero = { x: from.exploration.x, y: from.exploration.y };
      anchor = from.enemyCell;
    }
  }
  const occupied = new Set([key(hero)]);
  const cells: Cell[] = [];
  // Premier ennemi : sa place sur la carte, sinon une case libre à 3 cases du héros.
  const first = anchor && !occupied.has(key(anchor)) ? { x: anchor.x, y: anchor.y } : freeCellsNear(arena, hero, occupied, 3)[0];
  gridOf(arena);
  cells.push(first);
  occupied.add(key(first));
  while (cells.length < enemyCount) {
    const next = freeCellsNear(arena, first, occupied, 1)[0];
    if (!next) throw new Error("Pas assez de place pour les ennemis.");
    cells.push(next);
    occupied.add(key(next));
  }
  const allies: Cell[] = [];
  for (let i = 0; i < allyCount; i++) {
    const near = freeCellsNear(arena, hero, occupied, 1)[0];
    if (!near) break;
    allies.push(near);
    occupied.add(key(near));
  }
  return { arena, hero, enemies: cells.slice(0, enemyCount), allies };
}
