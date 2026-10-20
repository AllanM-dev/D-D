import type { AttackDef } from "../engine/combat";
import type { Ability } from "../engine/rules";

/**
 * Compagnons que le héros peut recruter au fil de l'histoire. Leurs statistiques reprennent des profils de
 * personnages non joueurs du SRD 5.1 (garde, acolyte, éclaireur, bandit), convertis en mètres ; textes originaux.
 * Recruter un compagnon, c'est poser le drapeau `compagnon:<id>` dans l'histoire (voir `stories.ts`).
 */

/** Ce que le compagnon apporte au groupe. */
export type CompanionRole = "melee" | "heal" | "ranged";

/** Façon de combattre, appliquée par le moteur (voir `combat/ai.ts`). */
export type CompanionTactic = "defender" | "healer" | "archer" | "skirmisher";

export interface CompanionDef {
  id: string;
  name: string;
  /** Qui c'est, en une ligne. */
  title: string;
  /** Rôle affiché (« Défenseuse »…). */
  roleLabel: string;
  roles: CompanionRole[];
  tactic: CompanionTactic;
  description: string;
  /** Comment le rencontrer (sans tout dévoiler). */
  recruitHint: string;
  /** Profil du SRD 5.1 dont viennent ses statistiques. */
  source: string;
  sprite: string;
  ac: number;
  /** PV au niveau 1 du héros, puis gain par niveau du héros. */
  hp: number;
  hpPerLevel: number;
  /** Vitesse en mètres. */
  speed: number;
  initiativeBonus: number;
  saveMods: Record<Ability, number>;
  attacks: AttackDef[];
  /** Soins (utilisations par repos long). */
  healing?: { name: string; uses: number; dice: [number, number]; bonus: number };
  /** Sort mineur à jet de sauvegarde. */
  cantrip?: { name: string; ability: Ability; dc: number; dice: [number, number]; damageType: string; rangeM: number };
  /** Ce que le jeu n'applique pas de son profil. */
  notApplied: string[];
}

const mods = (STR: number, DEX: number, CON: number, INT: number, WIS: number, CHA: number): Record<Ability, number> => ({ STR, DEX, CON, INT, WIS, CHA });
const melee = (name: string, toHit: number, count: number, sides: number, bonus: number, damageType: string, ability: Ability = "STR"): AttackDef =>
  ({ name, toHit, damage: { count, sides, bonus }, damageType, ranged: false, ability });
const ranged = (name: string, toHit: number, count: number, sides: number, bonus: number, damageType: string, range: [number, number]): AttackDef =>
  ({ name, toHit, damage: { count, sides, bonus }, damageType, ranged: true, ability: "DEX", range });

export const COMPANIONS: readonly CompanionDef[] = [
  {
    id: "ysolde",
    name: "Ysolde",
    title: "Garde du pont de Brumeval",
    roleLabel: "Défenseuse",
    roles: ["melee"],
    tactic: "defender",
    description: "Lance au poing et bouclier au bras, Ysolde garde le pont depuis dix ans. Elle se place entre vous et le danger et frappe ceux qui s'approchent de trop près de vous.",
    recruitHint: "La maire peut vous la prêter pour votre enquête… si vous ne lui avez pas déjà vidé la bourse.",
    source: "Garde (SRD 5.1)",
    sprite: "companion:ysolde",
    ac: 16, hp: 11, hpPerLevel: 6, speed: 9, initiativeBonus: 1,
    saveMods: mods(1, 1, 1, 0, 0, 0),
    attacks: [melee("Lance", 3, 1, 6, 1, "perforant")],
    notApplied: ["Lance lancée (elle se bat au contact)"],
  },
  {
    id: "anselme",
    name: "Frère Anselme",
    title: "Moine errant, de passage à l'auberge",
    roleLabel: "Soigneur",
    roles: ["heal"],
    tactic: "healer",
    description: "Un moine à la voix douce, venu prier pour les morts de la région. Il soigne le premier blessé grave à sa portée et, le reste du temps, appelle sur les ennemis une flamme sacrée.",
    recruitHint: "Il dîne seul près du feu, à l'auberge. Il suivra quelqu'un qui comprend ce qui se passe dans la crypte.",
    source: "Acolyte (SRD 5.1)",
    sprite: "companion:anselme",
    ac: 10, hp: 9, hpPerLevel: 5, speed: 9, initiativeBonus: 0,
    saveMods: mods(0, 0, 0, 0, 2, 0),
    attacks: [melee("Gourdin", 2, 1, 4, 0, "contondant")],
    healing: { name: "Soins", uses: 3, dice: [1, 8], bonus: 2 },
    cantrip: { name: "Flamme sacrée", ability: "DEX", dc: 12, dice: [1, 8], damageType: "radiant", rangeM: 18 },
    notApplied: ["Bénédiction et Sanctuaire (il garde ses emplacements pour soigner)", "Lumière et Thaumaturgie (sans effet en combat)"],
  },
  {
    id: "mila",
    name: "Mila",
    title: "Chasseuse, fille du fermier Hugues",
    roleLabel: "Archère",
    roles: ["ranged"],
    tactic: "archer",
    description: "Mila suit le loup depuis des semaines. Elle tire de loin, recule quand on l'approche et sort l'épée courte s'il le faut.",
    recruitHint: "Elle traque le loup qui décime les bêtes de son père. Débarrassez la ferme de ce fléau, et elle saura vous remercier.",
    source: "Éclaireur (SRD 5.1)",
    sprite: "companion:mila",
    ac: 13, hp: 16, hpPerLevel: 6, speed: 9, initiativeBonus: 2,
    saveMods: mods(0, 2, 1, 0, 1, 0),
    attacks: [ranged("Arc long", 4, 1, 8, 2, "perforant", [45, 180]), melee("Épée courte", 4, 1, 6, 2, "perforant", "DEX")],
    notApplied: ["Attaque multiple : une seule attaque par tour", "Ouïe et vue aiguisées (sans effet en combat)"],
  },
  {
    id: "corentin",
    name: "Corentin",
    title: "Pillard repenti",
    roleLabel: "Franc-tireur",
    roles: ["melee", "ranged"],
    tactic: "skirmisher",
    description: "Le pillard du cimetière, qui veut racheter sa faute. Arbalète de loin, cimeterre de près : il s'adapte à ce qui manque au groupe.",
    recruitHint: "On peut se battre contre un pillard… ou l'écouter. Un homme qui a peur cherche parfois une seconde chance.",
    source: "Bandit (SRD 5.1)",
    sprite: "companion:corentin",
    ac: 12, hp: 11, hpPerLevel: 6, speed: 9, initiativeBonus: 1,
    saveMods: mods(0, 1, 1, 0, 0, 0),
    attacks: [melee("Cimeterre", 3, 1, 6, 1, "tranchant", "DEX"), ranged("Arbalète légère", 3, 1, 8, 1, "perforant", [24, 96])],
    notApplied: [],
  },
];

export const COMPANION_BY_ID: Record<string, CompanionDef> = Object.fromEntries(COMPANIONS.map((c) => [c.id, c]));

/** Ce dont chaque classe a déjà l'habitude : se battre au contact, soigner, frapper de loin. */
export const CLASS_ROLES: Record<string, CompanionRole[]> = {
  barbarian: ["melee"],
  fighter: ["melee"],
  monk: ["melee"],
  paladin: ["melee", "heal"],
  cleric: ["melee", "heal"],
  rogue: ["melee", "ranged"],
  ranger: ["ranged"],
  druid: ["heal", "ranged"],
  bard: ["heal", "ranged"],
  sorcerer: ["ranged"],
  warlock: ["ranged"],
  wizard: ["ranged"],
};
