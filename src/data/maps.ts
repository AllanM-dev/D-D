/** Cartes d'exploration : une case = 1,5 m. */

export type TileKind = "grass" | "tree" | "wall" | "water" | "floor" | "door" | "path" | "bridge";

/** Caractère du plan → type de case. */
export const TILE_CHARS: Record<string, TileKind> = {
  ".": "grass", T: "tree", "#": "wall", "~": "water", ",": "floor", D: "door", ":": "path", "=": "bridge",
};

/** On peut marcher dessus. */
export const PASSABLE: Record<TileKind, boolean> = {
  grass: true, tree: false, wall: false, water: false, floor: true, door: true, path: true, bridge: true,
};
/** Bloque la vue (les portes sont fermées tant qu'on n'est pas dessus). */
export const OPAQUE: Record<TileKind, boolean> = {
  grass: false, tree: true, wall: true, water: false, floor: false, door: true, path: false, bridge: false,
};

/** Ennemi posté sur la carte : le toucher lance la rencontre. */
export interface MapEnemy {
  id: string;
  encounterId: string;
  x: number;
  y: number;
}

export interface MapDef {
  id: string;
  name: string;
  description: string;
  /** Une chaîne par ligne ; voir `TILE_CHARS`. */
  rows: readonly string[];
  start: { x: number; y: number };
  enemies: readonly MapEnemy[];
}

export const MAPS: readonly MapDef[] = [
  {
    id: "brumeval",
    name: "Brumeval et ses environs",
    description: "Un village de campagne, la route qui mène à la rivière, la forêt au nord et le cimetière au sud-est.",
    rows: [
      "TTTTTTTTTTTTTTTTTTTTTTTT",
      "TT.TT..T.T..T.TT.TTT~~.T",
      "T.T...T.TT.T..T.TTTT~~.T",
      "T..........T..T.....~~.T",
      "T.T#####............~~.T",
      "T..#,,,#::::::.....T~~.T",
      "T..#,,,#.....:......~~.T",
      "T..##D##.....:....TT~~.T",
      "T....::::#D##:::::::==.T",
      "T.T.T....#,,#....:..~~.T",
      "T.T#D##..####....:..~~.T",
      "T..#,,#.T....T.##D##~~.T",
      "T..#,,#........#,,,#~~.T",
      "T..####.......T#,,,#~~.T",
      "T.T............#####~~.T",
      "TTTTTTTTTTTTTTTTTTTTTTTT",
    ],
    start: { x: 9, y: 6 },
    enemies: [
      { id: "wolf-1", encounterId: "wolf", x: 4, y: 2 },
      { id: "goblin-1", encounterId: "goblin", x: 15, y: 8 },
      { id: "skeleton-1", encounterId: "skeleton", x: 17, y: 9 },
      { id: "ghoul-1", encounterId: "ghoul", x: 17, y: 13 },
    ],
  },
];

export const MAP_BY_ID: Record<string, MapDef> = Object.fromEntries(MAPS.map((m) => [m.id, m]));
