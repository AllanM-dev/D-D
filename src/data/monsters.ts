import type { AttackDef } from "../engine/combat";
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
  /** Vitesse en mètres (SRD 5.1 : 30 pieds = 9 m). */
  speed: number;
  /** États auxquels le monstre est immunisé. */
  immunities?: ConditionId[];
}

/**
 * Statistiques basées sur le SRD 5.1 (CC-BY-4.0). Les capacités spéciales
 * (tactique de meute, évasion du gobelin…) ne sont pas encore gérées.
 */
export const MONSTERS: readonly MonsterDef[] = [
  { id: "giant-rat", name: "Rat géant", speed: 9, maxHp: 7, ac: 12, initiativeBonus: 2, saves: { STR: -2, DEX: 2, CON: 0, INT: -4, WIS: 0, CHA: -3 },
    attacks: [{ name: "Morsure", toHit: 4, damage: { count: 1, sides: 4, bonus: 2 }, damageType: "perforant", ranged: false }] },
  { id: "goblin", name: "Gobelin", speed: 9, maxHp: 7, ac: 15, initiativeBonus: 2, saves: { STR: -1, DEX: 2, CON: 0, INT: 0, WIS: -1, CHA: -1 },
    attacks: [{ name: "Cimeterre", toHit: 4, damage: { count: 1, sides: 6, bonus: 2 }, damageType: "tranchant", ranged: false }] },
  { id: "skeleton", name: "Squelette", speed: 9, maxHp: 13, ac: 13, initiativeBonus: 2, immunities: ["poisoned"], saves: { STR: 0, DEX: 2, CON: 2, INT: -2, WIS: -1, CHA: -3 },
    attacks: [{ name: "Épée courte", toHit: 4, damage: { count: 1, sides: 6, bonus: 2 }, damageType: "perforant", ranged: false }] },
  { id: "zombie", name: "Zombie", speed: 6, maxHp: 22, ac: 8, initiativeBonus: -2, immunities: ["poisoned"], saves: { STR: 1, DEX: -2, CON: 3, INT: -4, WIS: -2, CHA: -3 },
    attacks: [{ name: "Coup", toHit: 3, damage: { count: 1, sides: 6, bonus: 1 }, damageType: "contondant", ranged: false }] },
  { id: "wolf", name: "Loup", speed: 12, maxHp: 11, ac: 13, initiativeBonus: 2, saves: { STR: 1, DEX: 2, CON: 1, INT: -4, WIS: 1, CHA: -2 },
    attacks: [{ name: "Morsure", toHit: 4, damage: { count: 2, sides: 4, bonus: 2 }, damageType: "perforant", ranged: false,
      rider: { condition: "prone", save: { ability: "STR", dc: 11 } } }] },
  { id: "bandit", name: "Bandit", speed: 9, maxHp: 11, ac: 12, initiativeBonus: 1, saves: { STR: 0, DEX: 1, CON: 1, INT: 0, WIS: 0, CHA: 0 },
    attacks: [{ name: "Cimeterre", toHit: 3, damage: { count: 1, sides: 6, bonus: 1 }, damageType: "tranchant", ranged: false }] },
  { id: "orc", name: "Orc", speed: 9, maxHp: 15, ac: 13, initiativeBonus: 1, saves: { STR: 3, DEX: 1, CON: 3, INT: -2, WIS: 0, CHA: 0 },
    attacks: [{ name: "Hache à deux mains", toHit: 5, damage: { count: 1, sides: 12, bonus: 3 }, damageType: "tranchant", ranged: false }] },
  // Goule : les griffes paralysent (les elfes y échappent) ; immunisée au poison.
  { id: "ghoul", name: "Goule", speed: 9, maxHp: 22, ac: 12, initiativeBonus: 2, immunities: ["poisoned"], saves: { STR: 1, DEX: 2, CON: 0, INT: -2, WIS: 0, CHA: -2 },
    attacks: [
      { name: "Griffes", toHit: 4, damage: { count: 2, sides: 4, bonus: 2 }, damageType: "tranchant", ranged: false,
        rider: { condition: "paralyzed", rounds: 10, save: { ability: "CON", dc: 10 }, repeatSave: true, exceptTags: ["elf", "undead"] } },
      { name: "Morsure", toHit: 2, damage: { count: 2, sides: 6, bonus: 2 }, damageType: "perforant", ranged: false },
    ] },
];
