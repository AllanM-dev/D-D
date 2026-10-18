import type { Loot } from "./items";

/** Cartes d'exploration : une case = 1,5 m. */

export type TileKind = "grass" | "tree" | "wall" | "water" | "floor" | "door" | "path" | "bridge" | "stairs" | "house" | "planks" | "fence" | "well" | "stall" | "crate" | "grave" | "crop";

/** Caractère du plan → type de case. */
export const TILE_CHARS: Record<string, TileKind> = {
  ".": "grass", T: "tree", "#": "wall", "~": "water", ",": "floor", D: "door", ":": "path", "=": "bridge", ">": "stairs", H: "house", ";": "planks", F: "fence", W: "well", S: "stall", C: "crate", G: "grave", c: "crop",
};

/** On peut marcher dessus. */
export const PASSABLE: Record<TileKind, boolean> = {
  grass: true, tree: false, wall: false, water: false, floor: true, door: true, path: true, bridge: true, stairs: true, house: false, planks: true, fence: false, well: false, stall: false, crate: false, grave: false, crop: true,
};
/** Bloque la vue (les portes sont fermées tant qu'on n'est pas dessus). */
export const OPAQUE: Record<TileKind, boolean> = {
  grass: false, tree: true, wall: true, water: false, floor: false, door: true, path: false, bridge: false, stairs: false, house: true, planks: false, fence: false, well: false, stall: false, crate: false, grave: false, crop: false,
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

/** Habitant ou animal qui se promène dans une zone de la carte : simple décor vivant, il n'arrête personne. */
export interface MapFolk {
  id: string;
  /** Dessin (voir `FOLK_SPRITES` de `src/ui/sprites.ts`). */
  sprite: string;
  name: string;
  x: number;
  y: number;
  /** Zone où il se promène (cases, bornes comprises). */
  roam: { x0: number; y0: number; x1: number; y1: number };
  /** Ce qu'il dit quand on le touche. */
  lines: readonly string[];
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
  folk?: readonly MapFolk[];
  locks?: readonly MapLock[];
  exits?: readonly MapExit[];
}

export const MAPS: readonly MapDef[] = [
  {
    id: "brumeval",
    name: "Brumeval et ses environs",
    description: "Un village de campagne qui s'étend de part et d'autre de la rivière : la mairie, l'auberge et la forge à l'ouest, la place du marché, le moulin et les fermes à l'est, la forêt au nord et, au centre, la crypte et son cimetière.",
    rows: [
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      "TT.TT..T.T..T.TT.TTT~~........T..T",
      "T.T...T.TT.T..T.TTTT~~..HHHHH...TT",
      "T..........T..T.....~~.CH;;;H....T",
      "T.THHHHH............~~.CH;;;H....T",
      "T..H;;;H::::::.....T~~..HHDHH....T",
      "T..H;;;H.....:......~~....:......T",
      "T..HHDHH.....:....TT~~..S.:.S.C..T",
      "T....::::HDHH:::::::==:::::::::..T",
      "T.T.T....H;;H:...:..~~.C..W..C...T",
      "T.THDHH..H;;H:...:..~~..SC:.S....T",
      "T..H;;H.THHHH:.##D##~~....:......T",
      "T..H;;H......:.#,,,#~~FFFF:FF..T.T",
      "T..HHHH....W.:.#,,,#~~Fccc:cFHHHHT",
      "T.T..........:.#####~~Fccc:cFH;;HT",
      "T...............:...~~Fccc:c.H;;HT",
      "T.HHHHH.........:...~~Fccc:cFHDHHT",
      "T.H;;;H.HHHH.FFF:FFF~~Fccc:cF....T",
      "T.H;;;H.H;;H.F.....F~~FFFF:FF....T",
      "T.HHDHH.H;;H.FG.G.GF~~...........T",
      "T...:...HHDH.F.G.G.F~~...........T",
      "T...:........FG.G.GF~~.......T...T",
      "T............FFFFFFF~~...........T",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
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
    folk: [
      { id: "paysanne-1", sprite: "paysanne", name: "Marguerite, une villageoise", x: 11, y: 14, roam: { x0: 8, y0: 12, x1: 14, y1: 15 }, lines: ["« Les nuits sont étranges, ces temps-ci. Je ne sors plus sans ma lanterne. »", "« Le pain de Thibaud est le meilleur de la région, mais il est de plus en plus sombre, ces derniers temps. »"] },
      { id: "enfant-1", sprite: "enfant", name: "Colin, un enfant", x: 9, y: 13, roam: { x0: 7, y0: 12, x1: 14, y1: 15 }, lines: ["« On dit que le cimetière est hanté ! Moi je n'ai pas peur… presque pas. »", "« Chut ! Je joue à cache-cache avec Lisette. »"] },
      { id: "enfant-2", sprite: "enfante", name: "Lisette, une enfant", x: 13, y: 14, roam: { x0: 7, y0: 12, x1: 14, y1: 15 }, lines: ["« Colin triche, il regarde toujours. »", "« Léo dit qu'il a vu un fantôme près de la rivière. Moi, j'ai seulement vu un hibou. »"] },
      { id: "chien-1", sprite: "chien", name: "Un chien errant", x: 6, y: 15, roam: { x0: 2, y0: 14, x1: 12, y1: 16 }, lines: ["Le chien vous renifle, remue la queue, puis repart fureter.", "Le chien aboie joyeusement."] },
      { id: "vieux-1", sprite: "vieux", name: "Gaspard, un vieil homme", x: 15, y: 9, roam: { x0: 14, y0: 8, x1: 19, y1: 10 }, lines: ["« Dans mon jeune temps, la crypte restait fermée à double tour. Qui l'a ouverte ? »", "« Ce chemin, je le suis depuis soixante ans. Il ne change jamais… jusqu'à cette année. »"] },
      { id: "garde-1", sprite: "garde", name: "Une garde du village", x: 19, y: 9, roam: { x0: 17, y0: 8, x1: 19, y1: 10 }, lines: ["« Halte-là… ah, vous êtes l'aventurier dont parle la maire. Soyez prudent près de la crypte. »", "« Je surveille le pont. Pas un loup ne passera tant que je serai là. »"] },
      { id: "marchande-1", sprite: "marchande", name: "Berthe, la marchande de légumes", x: 25, y: 9, roam: { x0: 23, y0: 8, x1: 29, y1: 9 }, lines: ["« Carottes fraîches, navets bien gras ! Rien pour un aventurier ? »", "« Mon étal tient bon depuis trente ans, ce n'est pas un squelette qui me fera fermer. »"] },
      { id: "marchand-1", sprite: "marchand", name: "Orso, le marchand de fruits", x: 27, y: 10, roam: { x0: 25, y0: 8, x1: 29, y1: 11 }, lines: ["« Pommes de la vallée ! Croquez-en une, c'est la maison qui offre… pour le premier qui parle. »", "« Les affaires sont mauvaises depuis que les gens ont peur de la nuit. »"] },
      { id: "paysan-1", sprite: "paysan", name: "Hugues, le fermier", x: 26, y: 15, roam: { x0: 24, y0: 13, x1: 27, y1: 17 }, lines: ["« La récolte sera bonne, si les loups restent loin de mes poules. »", "« Mon grand-père disait que la crypte n'est pas faite pour les vivants. »"] },
      { id: "poule-1", sprite: "poule", name: "Une poule", x: 24, y: 19, roam: { x0: 23, y0: 19, x1: 32, y1: 22 }, lines: ["Cot cot cot !"] },
      { id: "poule-2", sprite: "poule", name: "Une poule", x: 30, y: 20, roam: { x0: 23, y0: 19, x1: 32, y1: 22 }, lines: ["La poule vous regarde d'un œil torve, puis picore le sol."] },
      { id: "paysanne-2", sprite: "paysanne", name: "Josette, la meunière", x: 27, y: 6, roam: { x0: 24, y0: 6, x1: 30, y1: 7 }, lines: ["« Mon mari est au moulin, il moud jusqu'au soir. Léo est parti traîner près de la rivière, encore. »"] },
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
