import type { Character } from "./character";
import { getCombatant, type CombatState, type FeatureId } from "./combat";
import { rollDie, type Rng } from "./dice";
import { featuresFor } from "./features";
import { castingFor } from "./spellcasting";

/** État du personnage entre deux combats : PV et ressources dépensées. */
export interface Vitals {
  hp: number;
  /** Dés de vie restants. */
  hitDice: number;
  /** Utilisations restantes des capacités à utilisations limitées. */
  features: Partial<Record<FeatureId, number>>;
  /** Emplacements de sort de niveau 1 dépensés. */
  slotsUsed: number;
  /** Lancers gratuits restants, par sort. */
  free: Record<string, number>;
  /** Récupération arcanique déjà utilisée depuis le dernier repos long. */
  arcaneUsed: boolean;
}

export const hitDiceMax = (c: Character) => c.level;

/** Ressources d'un personnage frais : tout au maximum. */
export function freshVitals(c: Character): Vitals {
  const features: Vitals["features"] = {};
  for (const f of featuresFor(c.classDef.id, c.level, c.modifiers)) if (!f.unlimited) features[f.id] = f.max;
  const sc = castingFor(castingInput(c));
  const free: Vitals["free"] = {};
  for (const f of sc?.free ?? []) free[f.spellId] = f.max;
  return { hp: c.maxHp, hitDice: hitDiceMax(c), features, slotsUsed: 0, free, arcaneUsed: false };
}

/** État courant d'un personnage (tout au maximum tant qu'il n'a jamais combattu ni dormi). */
export const vitalsOf = (c: Character): Vitals => c.vitals ?? freshVitals(c);

export function castingInput(c: Character) {
  return {
    classId: c.classDef.id, modifiers: c.modifiers, proficiencyBonus: c.proficiencyBonus, conSaveBonus: c.saves.CON.bonus,
    unarmored: !c.equipment.armor, spells: c.spells ?? { cantrips: [], prepared: [] }, invocation: c.invocation,
  };
}

/** Reporte l'état du héros à la fin d'un combat. Un héros à 0 PV est remis sur pied avec 1 PV (simplification). */
export function vitalsAfterCombat(c: Character, state: CombatState): Vitals {
  const before = vitalsOf(c);
  const me = getCombatant(state, c.id);
  const features = { ...before.features };
  for (const f of me.features) if (!f.unlimited && f.id !== "potion") features[f.id] = f.uses;
  const free = { ...before.free };
  for (const f of me.spellcasting?.free ?? []) free[f.spellId] = f.uses;
  return { ...before, hp: Math.max(1, me.hp), features, slotsUsed: me.spellcasting?.slots.used ?? before.slotsUsed, free };
}

export interface HitDieRoll { die: number; sides: number; modifier: number; healed: number }

export interface RestResult {
  vitals: Vitals;
  rolls: HitDieRoll[];
  healed: number;
  /** Ce qui a été récupéré, en clair. */
  recovered: string[];
}

/** Repos court : dépense des dés de vie pour se soigner et récupère quelques ressources. */
export function shortRest(c: Character, spend: number, rng: Rng = Math.random): RestResult {
  const v = JSON.parse(JSON.stringify(vitalsOf(c))) as Vitals;
  const count = Math.max(0, Math.min(Math.floor(spend), v.hitDice));
  const rolls: HitDieRoll[] = [];
  let healed = 0;
  for (let i = 0; i < count && v.hp < c.maxHp; i++) {
    const die = rollDie(c.classDef.hitDie, rng);
    const modifier = c.modifiers.CON;
    const gain = Math.min(Math.max(0, die + modifier), c.maxHp - v.hp);
    v.hp += gain;
    v.hitDice -= 1;
    healed += gain;
    rolls.push({ die, sides: c.classDef.hitDie, modifier, healed: gain });
  }
  const recovered: string[] = [];
  const max = new Map(featuresFor(c.classDef.id, c.level, c.modifiers).map((f) => [f.id, f.max]));
  for (const id of ["second-wind", "rage"] as const) {
    const cap = max.get(id);
    if (cap !== undefined && (v.features[id] ?? cap) < cap) {
      v.features[id] = (v.features[id] ?? 0) + 1;
      recovered.push(id === "rage" ? "1 utilisation de Rage" : "1 utilisation de Second souffle");
    }
  }
  const sc = castingFor(castingInput(c));
  if (sc && v.slotsUsed > 0) {
    if (c.classDef.id === "warlock") {
      recovered.push(`${v.slotsUsed} emplacement${v.slotsUsed > 1 ? "s" : ""} de sort (Magie de pacte)`);
      v.slotsUsed = 0;
    } else if (c.classDef.id === "wizard" && !v.arcaneUsed) {
      v.slotsUsed -= 1; // niveau 1 : la moitié du niveau, arrondie au supérieur, vaut 1
      v.arcaneUsed = true;
      recovered.push("1 emplacement de sort (Récupération arcanique)");
    }
  }
  return { vitals: v, rolls, healed, recovered };
}

/** Repos long : tout revient, et la moitié des dés de vie (au moins un). */
export function longRest(c: Character): RestResult {
  const before = vitalsOf(c);
  const fresh = freshVitals(c);
  const regained = Math.min(hitDiceMax(c) - before.hitDice, Math.max(1, Math.floor(hitDiceMax(c) / 2)));
  const v: Vitals = { ...fresh, hitDice: before.hitDice + regained };
  const recovered = ["tous les PV", "toutes les capacités", "tous les emplacements de sort"].filter((_, i) => {
    if (i === 0) return before.hp < c.maxHp;
    if (i === 1) return JSON.stringify(before.features) !== JSON.stringify(fresh.features) || JSON.stringify(before.free) !== JSON.stringify(fresh.free);
    return before.slotsUsed > 0;
  });
  if (regained > 0) recovered.push(`${regained} dé${regained > 1 ? "s" : ""} de vie`);
  return { vitals: v, rolls: [], healed: c.maxHp - before.hp, recovered };
}
