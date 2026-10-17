import type { Loot } from "./items";

/** Cartes d'exploration : une case = 1,5 m. */

export type TileKind = "grass" | "tree" | "wall" | "water" | "floor" | "door" | "path" | "bridge" | "stairs";

/** Caractère du plan → type de case. */
export const TILE_CHARS: Record<string, TileKind> = {
  ".": "grass", T: "tree", "#": "wall", "~": "water", ",": "floor", D: "door", ":": "path", "=": "bridge", ">": "stairs",
};

/** On peut marcher dessus. */
export const PASSABLE: Record<TileKind, boolean> = {
  grass: true, tree: false, wall: false, water: false, floor: true, door: true, path: true, bridge: true, stairs: true,
};
/** Bloque la vue (les portes sont fermées tant qu'on n'est pas dessus). */
export const OPAQUE: Record<TileKind, boolean> = {
  grass: false, tree: true, wall: true, water: false, floor: false, door: true, path: false, bridge: false, stairs: false,
};

/** Ennemi posté sur la carte : le toucher lance la rencontre. */
export interface MapEnemy {
  id: string;
  encounterId: string;
  x: number;
  y: number;
  /** Butin laissé quand il est vaincu. */
  loot?: Loot;
}

/** Lieu ou personnage : le toucher ouvre une scène de l'histoire. */
export interface MapSpot {
  id: string;
  x: number;
  y: number;
  /** Porte du bâtiment où se trouve le personnage : un « ! » y signale qu'il y a quelqu'un à voir. */
  door?: { x: number; y: number };
  label: string;
  story: string;
  scene: string;
  /** Disparaît quand ce drapeau est posé. */
  hiddenWhen?: string;
}

/** Case infranchissable tant que le drapeau n'est pas posé (porte verrouillée). */
export interface MapLock {
  x: number;
  y: number;
  flag: string;
}

/** Passage vers une autre carte : marcher dessus y emmène le héros. */
export interface MapExit {
  x: number;
  y: number;
  label: string;
  to: { map: string; x: number; y: number };
}

export interface MapDef {
  id: string;
  name: string;
  description: string;
  /** Une chaîne par ligne ; voir `TILE_CHARS`. */
  rows: readonly string[];
  start: { x: number; y: number };
  enemies: readonly MapEnemy[];
  spots?: readonly MapSpot[];
  locks?: readonly MapLock[];
  exits?: readonly MapExit[];
}

export const MAPS: readonly MapDef[] = [
  {
    id: "brumeval",
    name: "Brumeval et ses environs",
    description: "Un village de campagne : la mairie, l'auberge et la forge, la route qui mène à la rivière, la forêt au nord et, au sud-est, la crypte.",
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
      "T.T#D##..#,,#....:..~~.T",
      "T..#,,#.T####T.##D##~~.T",
      "T..#,,#........#,,,#~~.T",
      "T..####.......T#,,,#~~.T",
      "T.T............#####~~.T",
      "TTTTTTTTTTTTTTTTTTTTTTTT",
    ],
    start: { x: 9, y: 6 },
    enemies: [
      { id: "wolf-1", encounterId: "wolf", x: 4, y: 2 },
      { id: "goblin-1", encounterId: "goblin", x: 15, y: 8, loot: { gold: 6, items: { "weapon:scimitar": 1 } } },
      { id: "skeleton-1", encounterId: "skeleton", x: 17, y: 9, loot: { gold: 4, items: { gem: 1, "weapon:shortsword": 1 } } },
    ],
    spots: [
      { id: "maire", x: 5, y: 5, door: { x: 5, y: 7 }, label: "Odile, la maire", story: "brumeval", scene: "maire" },
      { id: "aubergiste", x: 11, y: 10, door: { x: 10, y: 8 }, label: "Thibaud, l'aubergiste", story: "brumeval", scene: "aubergiste" },
      { id: "crypte", x: 17, y: 11, label: "Porte de la crypte", story: "brumeval", scene: "crypte", hiddenWhen: "crypte-ouverte" },
      { id: "leo", x: 19, y: 6, label: "Léo, fils du meunier", story: "brumeval", scene: "leo" },
      { id: "forge", x: 5, y: 12, door: { x: 4, y: 10 }, label: "Maëlle, la forgeronne", story: "brumeval", scene: "forge" },
    ],
    locks: [{ x: 17, y: 11, flag: "crypte-ouverte" }],
    exits: [{ x: 17, y: 11, label: "Descendre dans la crypte", to: { map: "crypte", x: 3, y: 1 } }],
  },
  {
    id: "crypte",
    name: "La crypte de Brumeval",
    description: "Une antichambre, un ossuaire et, au fond, la salle du gardien, scellée.",
    rows: [
      "###>##################",
      "#,,,,,,######,,,,,,,,#",
      "#,,,,,,######,,,,,,,,#",
      "#,,,,,,D,,,,,,,,,,,,,#",
      "#,,,,,,#,####,,,,,,,,#",
      "#,,,,,,#,####,,,,,,,,#",
      "########,#####,#######",
      "########,#####,#######",
      "##,,,,,,,#####,#######",
      "##,,,,,,######D#######",
      "##,,,,,,###,,,,,,,,,,#",
      "##,,,,,,###,,,,,,,,,,#",
      "###########,,,,,,,,,,#",
      "######################",
    ],
    start: { x: 3, y: 1 },
    enemies: [
      { id: "rat-1", encounterId: "rat", x: 5, y: 4 },
      { id: "zombie-1", encounterId: "zombie", x: 17, y: 3, loot: { gold: 8 } },
      { id: "ghoul-1", encounterId: "ghoul", x: 19, y: 11, loot: { gold: 15, items: { "healing-potion": 1 } } },
    ],
    spots: [
      { id: "journal", x: 4, y: 10, label: "Journal du gardien", story: "brumeval", scene: "journal" },
      { id: "coffre", x: 7, y: 11, label: "Coffre ancien", story: "brumeval", scene: "coffre", hiddenWhen: "coffre-pris" },
      { id: "sceau", x: 14, y: 9, label: "Porte scellée", story: "brumeval", scene: "sceau", hiddenWhen: "sceau-brise" },
      { id: "autel", x: 13, y: 11, label: "Autel du gardien", story: "brumeval", scene: "autel", hiddenWhen: "defeated:ghoul-1" },
    ],
    locks: [{ x: 14, y: 9, flag: "sceau-brise" }],
    exits: [{ x: 3, y: 0, label: "Remonter", to: { map: "brumeval", x: 17, y: 10 } }],
  },
];

export const MAP_BY_ID: Record<string, MapDef> = Object.fromEntries(MAPS.map((m) => [m.id, m]));
