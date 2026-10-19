/** Positions sur le terrain : portées, ligne de vue, cases occupées, déplacement. */
import { WEAPONS } from "../../data/equipment";
import { hasLineOfSight, metersBetween, pathBetween, speedCells } from "../battlefield";
import { CELL_METERS, cellDistance, type Cell } from "../exploration";
import { hasCondition, isIncapacitated } from "./conditions";
import type { AttackDef, Combatant, CombatState } from "./types";

export const AROUND: Cell[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
];
export const cellKey = (c: Cell) => `${c.x},${c.y}`;
/** Portée par défaut d'une arme à distance sans portée connue (anciennes sauvegardes). */
const DEFAULT_RANGE: [number, number] = [18, 54];
export const SPEED_DEFAULT = 9;

/** Portée d'une attaque en mètres : `undefined` pour le corps à corps. */
export function attackRange(attack: AttackDef): [number, number] | undefined {
  if (attack.range) return attack.range;
  if (!attack.ranged) return undefined;
  const base = attack.name.replace(/ \(lancer\)$/, "");
  return WEAPONS.find((w) => w.name === base)?.range ?? DEFAULT_RANGE;
}

/** Cases occupées par des combattants en vie (celui dont l'identifiant est `except` ne compte pas). */
export function occupiedCells(state: CombatState, except?: string): Set<string> {
  return new Set(state.combatants.filter((c) => !c.dead && c.pos && c.id !== except).map((c) => cellKey(c.pos!)));
}

export interface TargetCheck {
  ok: boolean;
  /** Pourquoi la cible est inaccessible. */
  reason?: string;
  /** Désavantages venant de la distance ou du contact (tir à longue portée, ennemi au contact). */
  disadvantage: string[];
  /** Distance en mètres. */
  meters: number;
}

export const fm = (n: number) => String(n).replace(".", ",");

/** Peut-on viser `target` avec cette attaque ? (portée, ligne de vue, désavantages). Toujours oui sans terrain. */
export function attackCheck(state: CombatState, attacker: Combatant, target: Combatant, attack: AttackDef): TargetCheck {
  if (attack.blocked) return { ok: false, reason: attack.blocked, disadvantage: [], meters: 0 };
  // Désavantages venant de l'équipement (arme lourde sans la Force requise, armure non maîtrisée).
  const gear = [...(attack.penalty ? [attack.penalty] : []), ...(attacker.untrainedArmor ? ["armure non maîtrisée"] : [])];
  if (!state.arena || !attacker.pos || !target.pos) return { ok: true, disadvantage: gear, meters: 0 };
  const meters = metersBetween(attacker.pos, target.pos);
  const range = attackRange(attack);
  const disadvantage: string[] = [...gear];
  if (!range) {
    const reach = attack.reach ?? 1;
    if (cellDistance(attacker.pos, target.pos) > reach) return { ok: false, reason: `Hors de portée (${fm(meters)} m ; corps à corps : ${fm(reach * CELL_METERS)} m)`, disadvantage, meters };
    return { ok: true, disadvantage, meters };
  }
  if (meters > range[1]) return { ok: false, reason: `Hors de portée (${fm(meters)} m ; maximum ${fm(range[1])} m)`, disadvantage, meters };
  if (!hasLineOfSight(state.arena, attacker.pos, target.pos)) return { ok: false, reason: "Pas de ligne de vue", disadvantage, meters };
  if (meters > range[0]) disadvantage.push("longue portée");
  // Une attaque à distance faite au contact d'un ennemi qui peut agir a un désavantage (pas pour un sort de contact).
  if (attack.ranged && state.combatants.some((c) => c.side !== attacker.side && !c.dead && c.pos && !isIncapacitated(c) && cellDistance(c.pos, attacker.pos!) <= 1))
    disadvantage.push("ennemi au contact");
  return { ok: true, disadvantage, meters };
}

/** Une cible peut-elle être visée par un sort de portée `rangeM` ? (distance et ligne de vue) */
export function spellTargetCheck(state: CombatState, caster: Combatant, target: Combatant, rangeM: number | undefined): TargetCheck {
  if (!state.arena || !caster.pos || !target.pos || rangeM === undefined) return { ok: true, disadvantage: [], meters: 0 };
  const meters = metersBetween(caster.pos, target.pos);
  if (meters > rangeM) return { ok: false, reason: `Hors de portée (${fm(meters)} m ; sort : ${fm(rangeM)} m)`, disadvantage: [], meters };
  if (!hasLineOfSight(state.arena, caster.pos, target.pos)) return { ok: false, reason: "Pas de ligne de vue", disadvantage: [], meters };
  return { ok: true, disadvantage: [], meters };
}

/** Cases de déplacement qu'il reste à ce combattant ce tour. */
export function movementLeft(c: Combatant, state?: CombatState): number {
  if (hasCondition(c, "restrained")) return 0;
  // Ralenti (maîtrise d'arme) : −3 m de vitesse.
  const slowed = !!state && c.slowedUntilRound !== undefined && state.round <= c.slowedUntilRound;
  const base = speedCells((c.speed ?? SPEED_DEFAULT) - (slowed ? 3 : 0)) * (c.turnState.dashed ? 2 : 1);
  return Math.max(0, base - (c.turnState.moved ?? 0));
}

export interface MovePlan {
  ok: boolean;
  reason?: string;
  path: Cell[];
  /** Coût en mètres. */
  meters: number;
}

/** Trajet (cases libres uniquement) du combattant vers une case, et ce qu'il coûte. */
export function planMove(state: CombatState, c: Combatant, to: Cell): MovePlan {
  if (!state.arena || !c.pos) return { ok: false, reason: "Pas de terrain.", path: [], meters: 0 };
  if (cellDistance(c.pos, to) === 0) return { ok: false, reason: "Vous y êtes déjà.", path: [], meters: 0 };
  if (occupiedCells(state, c.id).has(cellKey(to))) return { ok: false, reason: "Case occupée.", path: [], meters: 0 };
  const path = pathBetween(state.arena, c.pos, to, occupiedCells(state, c.id));
  if (!path) return { ok: false, reason: "Chemin impossible.", path: [], meters: 0 };
  const meters = path.length * CELL_METERS;
  const left = movementLeft(c, state);
  if (path.length > left) return { ok: false, reason: `Trop loin : ${fm(meters)} m, il vous reste ${fm(left * CELL_METERS)} m.`, path, meters };
  return { ok: true, path, meters };
}
