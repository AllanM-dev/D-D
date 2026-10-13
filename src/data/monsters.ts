import type { AttackDef } from "../engine/combat";

export interface MonsterDef {
  id: string;
  name: string;
  maxHp: number;
  ac: number;
  initiativeBonus: number;
  attacks: AttackDef[];
}

/**
 * Statistiques basées sur le SRD 5.1 (CC-BY-4.0). Les capacités spéciales
 * (tactique de meute, évasion du gobelin…) ne sont pas encore gérées.
 */
export const MONSTERS: readonly MonsterDef[] = [
  { id: "giant-rat", name: "Rat géant", maxHp: 7, ac: 12, initiativeBonus: 2,
    attacks: [{ name: "Morsure", toHit: 4, damage: { count: 1, sides: 4, bonus: 2 }, damageType: "perforant", ranged: false }] },
  { id: "goblin", name: "Gobelin", maxHp: 7, ac: 15, initiativeBonus: 2,
    attacks: [{ name: "Cimeterre", toHit: 4, damage: { count: 1, sides: 6, bonus: 2 }, damageType: "tranchant", ranged: false }] },
  { id: "skeleton", name: "Squelette", maxHp: 13, ac: 13, initiativeBonus: 2,
    attacks: [{ name: "Épée courte", toHit: 4, damage: { count: 1, sides: 6, bonus: 2 }, damageType: "perforant", ranged: false }] },
  { id: "zombie", name: "Zombie", maxHp: 22, ac: 8, initiativeBonus: -2,
    attacks: [{ name: "Coup", toHit: 3, damage: { count: 1, sides: 6, bonus: 1 }, damageType: "contondant", ranged: false }] },
  { id: "wolf", name: "Loup", maxHp: 11, ac: 13, initiativeBonus: 2,
    attacks: [{ name: "Morsure", toHit: 4, damage: { count: 2, sides: 4, bonus: 2 }, damageType: "perforant", ranged: false }] },
  { id: "bandit", name: "Bandit", maxHp: 11, ac: 12, initiativeBonus: 1,
    attacks: [{ name: "Cimeterre", toHit: 3, damage: { count: 1, sides: 6, bonus: 1 }, damageType: "tranchant", ranged: false }] },
  { id: "orc", name: "Orc", maxHp: 15, ac: 13, initiativeBonus: 1,
    attacks: [{ name: "Hache à deux mains", toHit: 5, damage: { count: 1, sides: 12, bonus: 3 }, damageType: "tranchant", ranged: false }] },
];
