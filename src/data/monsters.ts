import type { AttackDef, MonsterTrait } from "../engine/combat";
import type { Ability } from "../engine/rules";
import type { ConditionId } from "./conditions";

export interface MonsterDef {
  id: string;
  name: string;
  maxHp: number;
  ac: number;
  initiativeBonus: number;
  /** Modificateurs de caractéristiques, utilisés pour les jets de sauvegarde contre les sorts. */
  saves: Record<Ability, number>;
  attacks: AttackDef[];
  /** Points d'expérience gagnés en le vainquant (SRD : valeur selon l'indice de dangerosité). */
  xp: number;
  /** Vitesse en mètres (SRD 5.1 : 30 pieds = 9 m). */
  speed: number;
  /** États auxquels le monstre est immunisé. */
  immunities?: ConditionId[];
  /** Capacités spéciales gérées par le moteur. */
  traits?: MonsterTrait[];
  /** Description en français (texte original). */
  text: string;
  /** Capacités du SRD pas encore gérées. */
  notApplied?: string;
}

/**
 * Statistiques basées sur le SRD 5.1 (CC-BY-4.0). Les capacités spéciales listées dans `traits` sont gérées
 * par le moteur ; les autres sont décrites dans `notApplied`.
 */
export const MONSTERS: readonly MonsterDef[] = [
  { id: "giant-rat", name: "Rat géant", xp: 25, speed: 9, traits: ["pack-tactics", "coward"], text: "Un rat de la taille d'un chien, qui rôde dans les caves et les égouts. Il attaque en groupe.", notApplied: "Odorat aiguisé (avantage aux tests d'odorat).", maxHp: 7, ac: 12, initiativeBonus: 2, saves: { STR: -2, DEX: 2, CON: 0, INT: -4, WIS: 0, CHA: -3 },
    attacks: [{ name: "Morsure", toHit: 4, damage: { count: 1, sides: 4, bonus: 2 }, damageType: "perforant", ranged: false }] },
  { id: "goblin", name: "Gobelin", xp: 50, speed: 9, traits: ["coward"], text: "Petite créature rusée et sournoise, qui attaque en embuscade et fuit quand elle perd.", notApplied: "Fuite agile : en action bonus, se désengager ou se cacher.", maxHp: 7, ac: 15, initiativeBonus: 2, saves: { STR: -1, DEX: 2, CON: 0, INT: 0, WIS: -1, CHA: -1 },
    attacks: [{ name: "Cimeterre", toHit: 4, damage: { count: 1, sides: 6, bonus: 2 }, damageType: "tranchant", ranged: false },
      { name: "Arc court", toHit: 4, damage: { count: 1, sides: 6, bonus: 2 }, damageType: "perforant", ranged: true, range: [24, 96] }] },
  { id: "skeleton", name: "Squelette", xp: 50, speed: 9, text: "Les os d'un guerrier mort, animés par une magie ancienne. Il obéit sans réfléchir.", notApplied: "Vulnérable aux dégâts contondants (non appliqué) ; immunisé au poison (appliqué).", maxHp: 13, ac: 13, initiativeBonus: 2, immunities: ["poisoned"], saves: { STR: 0, DEX: 2, CON: 2, INT: -2, WIS: -1, CHA: -3 },
    attacks: [{ name: "Épée courte", toHit: 4, damage: { count: 1, sides: 6, bonus: 2 }, damageType: "perforant", ranged: false },
      { name: "Arc court", toHit: 4, damage: { count: 1, sides: 6, bonus: 2 }, damageType: "perforant", ranged: true, range: [24, 96] }] },
  { id: "zombie", name: "Zombie", xp: 50, speed: 6, traits: ["undead-fortitude"], text: "Un cadavre qui avance lentement mais refuse de tomber.", notApplied: "Immunisé au poison (appliqué).", maxHp: 22, ac: 8, initiativeBonus: -2, immunities: ["poisoned"], saves: { STR: 1, DEX: -2, CON: 3, INT: -4, WIS: -2, CHA: -3 },
    attacks: [{ name: "Coup", toHit: 3, damage: { count: 1, sides: 6, bonus: 1 }, damageType: "contondant", ranged: false }] },
  { id: "wolf", name: "Loup", xp: 50, speed: 12, traits: ["pack-tactics", "coward"], text: "Un prédateur rapide qui chasse en meute et fait tomber ses proies.", notApplied: "Odorat et ouïe aiguisés (avantage aux tests de perception).", maxHp: 11, ac: 13, initiativeBonus: 2, saves: { STR: 1, DEX: 2, CON: 1, INT: -4, WIS: 1, CHA: -2 },
    attacks: [{ name: "Morsure", toHit: 4, damage: { count: 2, sides: 4, bonus: 2 }, damageType: "perforant", ranged: false,
      rider: { condition: "prone", save: { ability: "STR", dc: 11 } } }] },
  { id: "bandit", name: "Bandit", xp: 25, speed: 9, traits: ["archer", "coward"], text: "Un brigand de grand chemin, armé d'un cimeterre et d'une arbalète, prêt à tout pour une bourse. Il tire de loin et prend la fuite quand il est gravement blessé.", maxHp: 11, ac: 12, initiativeBonus: 1, saves: { STR: 0, DEX: 1, CON: 1, INT: 0, WIS: 0, CHA: 0 },
    attacks: [{ name: "Cimeterre", toHit: 3, damage: { count: 1, sides: 6, bonus: 1 }, damageType: "tranchant", ranged: false },
      { name: "Arbalète légère", toHit: 3, damage: { count: 1, sides: 8, bonus: 1 }, damageType: "perforant", ranged: true, range: [24, 96] }] },
  { id: "orc", name: "Orc", xp: 100, speed: 9, traits: ["aggressive"], text: "Un guerrier massif qui se jette dans la mêlée sans attendre.", maxHp: 15, ac: 13, initiativeBonus: 1, saves: { STR: 3, DEX: 1, CON: 3, INT: -2, WIS: 0, CHA: 0 },
    attacks: [{ name: "Hache à deux mains", toHit: 5, damage: { count: 1, sides: 12, bonus: 3 }, damageType: "tranchant", ranged: false },
      { name: "Javelot", toHit: 5, damage: { count: 1, sides: 6, bonus: 3 }, damageType: "perforant", ranged: true, range: [9, 36] }] },
  // Goule : les griffes paralysent (les elfes y échappent) ; immunisée au poison.
  { id: "ghoul", name: "Goule", xp: 200, speed: 9, text: "Un mort-vivant affamé aux griffes qui paralysent. Les elfes y résistent.", notApplied: "Immunisée au poison (appliqué).", maxHp: 22, ac: 12, initiativeBonus: 2, immunities: ["poisoned"], saves: { STR: 1, DEX: 2, CON: 0, INT: -2, WIS: 0, CHA: -2 },
    attacks: [
      { name: "Griffes", toHit: 4, damage: { count: 2, sides: 4, bonus: 2 }, damageType: "tranchant", ranged: false,
        rider: { condition: "paralyzed", rounds: 10, save: { ability: "CON", dc: 10 }, repeatSave: true, exceptTags: ["elf", "undead"] } },
      { name: "Morsure", toHit: 2, damage: { count: 2, sides: 6, bonus: 2 }, damageType: "perforant", ranged: false },
    ] },
  { id: "kobold", name: "Kobold", xp: 25, speed: 9, maxHp: 5, ac: 12, initiativeBonus: 2, saves: { STR: -2, DEX: 2, CON: -1, INT: -1, WIS: -2, CHA: -1 }, traits: ["pack-tactics", "coward"],
    text: "Un petit humanoïde reptilien, lâche seul mais dangereux en bande, qui attaque en nombre avec ses dagues.",
    notApplied: "Sensibilité à la lumière du soleil (désavantage aux attaques en plein soleil).",
    attacks: [{ name: "Dague", toHit: 4, damage: { count: 1, sides: 4, bonus: 2 }, damageType: "perforant", ranged: false },
      { name: "Fronde", toHit: 4, damage: { count: 1, sides: 4, bonus: 2 }, damageType: "contondant", ranged: true, range: [9, 36] }] },
  { id: "giant-spider", name: "Araignée géante", xp: 200, speed: 9, maxHp: 26, ac: 14, initiativeBonus: 3, saves: { STR: 2, DEX: 3, CON: 1, INT: -4, WIS: 0, CHA: -3 },
    text: "Une araignée de la taille d'un cheval, qui engluait ses proies dans sa toile avant de les mordre.",
    notApplied: "Pattes d'araignée (grimpe), perception des vibrations ; la toile se tire à volonté dans le jeu (au lieu d'une recharge) tant que la cible n'est pas déjà entravée ; empoisonné ou paralysé à 0 PV par le venin (non appliqué).",
    attacks: [
      { name: "Morsure", toHit: 5, damage: { count: 1, sides: 8, bonus: 3 }, damageType: "perforant", ranged: false,
        saveDamage: { ability: "CON", dc: 11, dice: [2, 8], damageType: "poison" } },
      { name: "Toile", toHit: 5, damage: { count: 0, sides: 1, bonus: 0 }, damageType: "—", ranged: true, range: [9, 18],
        rider: { condition: "restrained", escape: { ability: "STR", dc: 12 } } },
    ] },
];
