export type WeaponProperty = "finesse" | "light" | "heavy" | "two-handed" | "thrown" | "versatile" | "ammunition" | "reach";

export interface WeaponDef {
  id: string;
  name: string;
  category: "simple" | "martial";
  ranged: boolean;
  damage: { count: number; sides: number };
  damageType: string;
  properties: WeaponProperty[];
  /** Dé de dégâts quand l'arme polyvalente est tenue à deux mains. */
  versatileSides?: number;
  /** Portée normale / maximale en mètres (armes à distance et armes de jet). */
  range?: [number, number];
}

/** Maîtrises d'armes (2024) : effet spécial d'une arme pour qui l'a « maîtrisée ». */
export type Mastery = "cleave" | "graze" | "nick" | "push" | "sap" | "slow" | "topple" | "vex";

/** Maîtrise de chaque arme (SRD 5.2, écrite de mémoire). */
export const WEAPON_MASTERY: Record<string, Mastery> = {
  club: "slow", dagger: "nick", handaxe: "vex", javelin: "slow", "light-hammer": "nick", mace: "sap", quarterstaff: "topple", sickle: "nick",
  spear: "sap", dart: "vex", "light-crossbow": "slow", shortbow: "vex", battleaxe: "topple", flail: "sap", glaive: "graze", greataxe: "cleave",
  greatsword: "graze", halberd: "cleave", longsword: "sap", maul: "topple", morningstar: "sap", rapier: "vex", scimitar: "nick", shortsword: "vex",
  trident: "topple", warhammer: "push", whip: "slow", longbow: "slow",
};

/** Nombre d'armes dont la classe maîtrise l'effet (niveau 1). */
export const MASTERY_COUNT: Record<string, number> = { barbarian: 2, fighter: 3, paladin: 2, ranger: 2, rogue: 2 };

/** Armes du SRD 5.2 : celles des lots de départ et celles que l'on trouve ou achète. */
export const WEAPONS: readonly WeaponDef[] = [
  { id: "greataxe", name: "Hache à deux mains", category: "martial", ranged: false, damage: { count: 1, sides: 12 }, damageType: "tranchant", properties: ["heavy", "two-handed"] },
  { id: "handaxe", name: "Hachette", category: "simple", ranged: false, damage: { count: 1, sides: 6 }, damageType: "tranchant", properties: ["light", "thrown"], range: [6, 18] },
  { id: "dagger", name: "Dague", category: "simple", ranged: false, damage: { count: 1, sides: 4 }, damageType: "perforant", properties: ["finesse", "light", "thrown"], range: [6, 18] },
  { id: "mace", name: "Masse d'armes", category: "simple", ranged: false, damage: { count: 1, sides: 6 }, damageType: "contondant", properties: [] },
  { id: "sickle", name: "Serpe", category: "simple", ranged: false, damage: { count: 1, sides: 4 }, damageType: "tranchant", properties: ["light"] },
  { id: "quarterstaff", name: "Bâton", category: "simple", ranged: false, damage: { count: 1, sides: 6 }, damageType: "contondant", properties: ["versatile"], versatileSides: 8 },
  { id: "greatsword", name: "Épée à deux mains", category: "martial", ranged: false, damage: { count: 2, sides: 6 }, damageType: "tranchant", properties: ["heavy", "two-handed"] },
  { id: "flail", name: "Fléau d'armes", category: "martial", ranged: false, damage: { count: 1, sides: 8 }, damageType: "contondant", properties: [] },
  { id: "javelin", name: "Javeline", category: "simple", ranged: false, damage: { count: 1, sides: 6 }, damageType: "perforant", properties: ["thrown"], range: [9, 36] },
  { id: "scimitar", name: "Cimeterre", category: "martial", ranged: false, damage: { count: 1, sides: 6 }, damageType: "tranchant", properties: ["finesse", "light"] },
  { id: "shortsword", name: "Épée courte", category: "martial", ranged: false, damage: { count: 1, sides: 6 }, damageType: "perforant", properties: ["finesse", "light"] },
  { id: "longbow", name: "Arc long", category: "martial", ranged: true, damage: { count: 1, sides: 8 }, damageType: "perforant", properties: ["ammunition", "heavy", "two-handed"], range: [45, 180] },
  { id: "shortbow", name: "Arc court", category: "simple", ranged: true, damage: { count: 1, sides: 6 }, damageType: "perforant", properties: ["ammunition", "two-handed"], range: [24, 96] },
  { id: "spear", name: "Lance", category: "simple", ranged: false, damage: { count: 1, sides: 6 }, damageType: "perforant", properties: ["thrown", "versatile"], versatileSides: 8, range: [6, 18] },
  { id: "longsword", name: "Épée longue", category: "martial", ranged: false, damage: { count: 1, sides: 8 }, damageType: "tranchant", properties: ["versatile"], versatileSides: 10 },
  { id: "club", name: "Gourdin", category: "simple", ranged: false, damage: { count: 1, sides: 4 }, damageType: "contondant", properties: ["light"] },
  { id: "light-hammer", name: "Marteau léger", category: "simple", ranged: false, damage: { count: 1, sides: 4 }, damageType: "contondant", properties: ["light", "thrown"], range: [6, 18] },
  { id: "dart", name: "Fléchette", category: "simple", ranged: true, damage: { count: 1, sides: 4 }, damageType: "perforant", properties: ["finesse", "thrown"], range: [6, 18] },
  { id: "light-crossbow", name: "Arbalète légère", category: "simple", ranged: true, damage: { count: 1, sides: 8 }, damageType: "perforant", properties: ["ammunition", "two-handed"], range: [24, 96] },
  { id: "battleaxe", name: "Hache d'armes", category: "martial", ranged: false, damage: { count: 1, sides: 8 }, damageType: "tranchant", properties: ["versatile"], versatileSides: 10 },
  { id: "warhammer", name: "Marteau de guerre", category: "martial", ranged: false, damage: { count: 1, sides: 8 }, damageType: "contondant", properties: ["versatile"], versatileSides: 10 },
  { id: "rapier", name: "Rapière", category: "martial", ranged: false, damage: { count: 1, sides: 8 }, damageType: "perforant", properties: ["finesse"] },
  { id: "morningstar", name: "Morgenstern", category: "martial", ranged: false, damage: { count: 1, sides: 8 }, damageType: "perforant", properties: [] },
  { id: "trident", name: "Trident", category: "martial", ranged: false, damage: { count: 1, sides: 8 }, damageType: "perforant", properties: ["thrown", "versatile"], versatileSides: 10, range: [6, 18] },
  { id: "whip", name: "Fouet", category: "martial", ranged: false, damage: { count: 1, sides: 4 }, damageType: "tranchant", properties: ["finesse", "reach"] },
  { id: "glaive", name: "Coutille", category: "martial", ranged: false, damage: { count: 1, sides: 10 }, damageType: "tranchant", properties: ["heavy", "reach", "two-handed"] },
  { id: "halberd", name: "Hallebarde", category: "martial", ranged: false, damage: { count: 1, sides: 10 }, damageType: "tranchant", properties: ["heavy", "reach", "two-handed"] },
  { id: "maul", name: "Maillet", category: "martial", ranged: false, damage: { count: 2, sides: 6 }, damageType: "contondant", properties: ["heavy", "two-handed"] },
];

export interface ArmorDef {
  id: string;
  name: string;
  kind: "light" | "medium" | "heavy" | "shield";
  /** CA de base (armures) ou bonus (bouclier). */
  baseAc: number;
  /** Plafond du bonus de Dextérité : undefined = aucun, 0 = aucun bonus. */
  dexCap?: number;
  /** Force minimale ; en dessous, la vitesse baisse de 3 m. */
  minStr?: number;
  stealthDisadvantage?: boolean;
}

export const ARMORS: readonly ArmorDef[] = [
  { id: "leather", name: "Armure de cuir", kind: "light", baseAc: 11 },
  { id: "studded-leather", name: "Armure de cuir clouté", kind: "light", baseAc: 12 },
  { id: "chain-shirt", name: "Chemise de mailles", kind: "medium", baseAc: 13, dexCap: 2 },
  { id: "chain-mail", name: "Cotte de mailles", kind: "heavy", baseAc: 16, dexCap: 0, minStr: 13, stealthDisadvantage: true },
  { id: "shield", name: "Bouclier", kind: "shield", baseAc: 2 },
  { id: "padded", name: "Armure matelassée", kind: "light", baseAc: 11, stealthDisadvantage: true },
  { id: "hide", name: "Armure de peaux", kind: "medium", baseAc: 12, dexCap: 2 },
  { id: "breastplate", name: "Cuirasse", kind: "medium", baseAc: 14, dexCap: 2 },
  { id: "half-plate", name: "Demi-plate", kind: "medium", baseAc: 15, dexCap: 2, stealthDisadvantage: true },
  { id: "ring-mail", name: "Cotte d'anneaux", kind: "heavy", baseAc: 14, dexCap: 0, stealthDisadvantage: true },
  { id: "splint", name: "Clibanion", kind: "heavy", baseAc: 17, dexCap: 0, minStr: 15, stealthDisadvantage: true },
  { id: "plate", name: "Harnois", kind: "heavy", baseAc: 18, dexCap: 0, minStr: 15, stealthDisadvantage: true },
];

/** Prix en pièces d'or (arrondis à 1 po au minimum ; valeurs du SRD écrites de mémoire). */
export const PRICES: Record<string, number> = {
  // armes
  club: 1, dagger: 2, handaxe: 5, mace: 5, sickle: 1, quarterstaff: 1, spear: 1, javelin: 1, "light-hammer": 2, dart: 1,
  shortbow: 25, "light-crossbow": 25, longbow: 50, greataxe: 30, greatsword: 50, flail: 10, scimitar: 25, shortsword: 10,
  longsword: 15, battleaxe: 10, warhammer: 15, rapier: 25, morningstar: 15, trident: 5, whip: 2, glaive: 20, halberd: 20, maul: 10,
  // armures
  leather: 10, "studded-leather": 45, "chain-shirt": 50, "chain-mail": 75, shield: 10, padded: 5, hide: 10, breastplate: 400,
  "half-plate": 750, "ring-mail": 30, splint: 200, plate: 1500,
};

export type KitEntry = { weapon: string; qty?: number } | { armor: string } | { gear: string; qty?: number };

export interface Kit {
  id: string;
  label: string;
  entries: KitEntry[];
  /** Pièces d'or (po) restantes. */
  gold: number;
}

/**
 * Équipement de départ par classe (option « objets » du SRD 5.2).
 * Le guerrier a deux lots au choix. Les alternatives en or et l'équipement des historiques viendront plus tard.
 */
export const STARTING_KITS: Record<string, Kit[]> = {
  barbarian: [{ id: "A", label: "Équipement du barbare", gold: 15, entries: [{ weapon: "greataxe" }, { weapon: "handaxe", qty: 4 }, { gear: "Sac d'explorateur" }] }],
  bard: [{ id: "A", label: "Équipement du barde", gold: 19, entries: [{ armor: "leather" }, { weapon: "dagger", qty: 2 }, { gear: "Instrument de musique (au choix)" }, { gear: "Sac d'artiste" }] }],
  cleric: [{ id: "A", label: "Équipement du clerc", gold: 7, entries: [{ armor: "chain-shirt" }, { armor: "shield" }, { weapon: "mace" }, { gear: "Symbole sacré" }, { gear: "Sac de prêtre" }] }],
  druid: [{ id: "A", label: "Équipement du druide", gold: 9, entries: [{ armor: "leather" }, { armor: "shield" }, { weapon: "sickle" }, { weapon: "quarterstaff" }, { gear: "Focaliseur druidique" }, { gear: "Sac d'explorateur" }, { gear: "Trousse d'herboriste" }] }],
  fighter: [
    { id: "A", label: "Lot A : armure lourde et armes de mêlée", gold: 4, entries: [{ armor: "chain-mail" }, { weapon: "greatsword" }, { weapon: "flail" }, { weapon: "javelin", qty: 8 }, { gear: "Sac de donjon" }] },
    { id: "B", label: "Lot B : armure légère et arc long", gold: 11, entries: [{ armor: "studded-leather" }, { weapon: "scimitar" }, { weapon: "shortsword" }, { weapon: "longbow" }, { gear: "Flèches", qty: 20 }, { gear: "Carquois" }, { gear: "Sac de donjon" }] },
  ],
  monk: [{ id: "A", label: "Équipement du moine", gold: 11, entries: [{ weapon: "spear" }, { weapon: "dagger", qty: 5 }, { gear: "Outils d'artisan ou instrument de musique" }, { gear: "Sac d'explorateur" }] }],
  paladin: [{ id: "A", label: "Équipement du paladin", gold: 9, entries: [{ armor: "chain-mail" }, { armor: "shield" }, { weapon: "longsword" }, { weapon: "javelin", qty: 6 }, { gear: "Symbole sacré" }, { gear: "Sac de prêtre" }] }],
  ranger: [{ id: "A", label: "Équipement du rôdeur", gold: 7, entries: [{ armor: "studded-leather" }, { weapon: "scimitar" }, { weapon: "shortsword" }, { weapon: "longbow" }, { gear: "Flèches", qty: 20 }, { gear: "Carquois" }, { gear: "Focaliseur druidique" }, { gear: "Sac d'explorateur" }] }],
  rogue: [{ id: "A", label: "Équipement du roublard", gold: 8, entries: [{ armor: "leather" }, { weapon: "dagger", qty: 2 }, { weapon: "shortsword" }, { weapon: "shortbow" }, { gear: "Flèches", qty: 20 }, { gear: "Carquois" }, { gear: "Outils de voleur" }, { gear: "Sac de cambrioleur" }] }],
  sorcerer: [{ id: "A", label: "Équipement de l'ensorceleur", gold: 28, entries: [{ weapon: "spear" }, { weapon: "dagger", qty: 2 }, { gear: "Focaliseur arcanique (cristal)" }, { gear: "Sac de donjon" }] }],
  warlock: [{ id: "A", label: "Équipement de l'occultiste", gold: 15, entries: [{ armor: "leather" }, { weapon: "sickle" }, { weapon: "dagger", qty: 2 }, { gear: "Focaliseur arcanique (orbe)" }, { gear: "Livre (savoirs occultes)" }, { gear: "Sac d'érudit" }] }],
  wizard: [{ id: "A", label: "Équipement du magicien", gold: 5, entries: [{ weapon: "dagger", qty: 2 }, { weapon: "quarterstaff" }, { gear: "Focaliseur arcanique (bâton)" }, { gear: "Robe" }, { gear: "Grimoire" }, { gear: "Sac d'érudit" }] }],
};

export type WeaponTraining = "simple" | "simple+martial" | "simple+martial-light" | "simple+martial-finesse-or-light";
export type ArmorTraining = "light" | "medium" | "heavy" | "shield";

/** Maîtrises d'armes et d'armures de niveau 1. */
export const CLASS_TRAINING: Record<string, { weapons: WeaponTraining; armor: ArmorTraining[] }> = {
  barbarian: { weapons: "simple+martial", armor: ["light", "medium", "shield"] },
  bard: { weapons: "simple", armor: ["light"] },
  cleric: { weapons: "simple", armor: ["light", "medium", "shield"] },
  druid: { weapons: "simple", armor: ["light", "shield"] },
  fighter: { weapons: "simple+martial", armor: ["light", "medium", "heavy", "shield"] },
  monk: { weapons: "simple+martial-light", armor: [] },
  paladin: { weapons: "simple+martial", armor: ["light", "medium", "heavy", "shield"] },
  ranger: { weapons: "simple+martial", armor: ["light", "medium", "shield"] },
  rogue: { weapons: "simple+martial-finesse-or-light", armor: ["light"] },
  sorcerer: { weapons: "simple", armor: [] },
  warlock: { weapons: "simple", armor: ["light"] },
  wizard: { weapons: "simple", armor: [] },
};
