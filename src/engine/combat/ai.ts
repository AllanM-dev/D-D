/** Tours joués par l'ordinateur (ennemis et compagnons) : choix de la cible et de l'attaque, approche, fuite, tir à distance, soins. */
import { reachableWithin, hasLineOfSight, pathBetween, speedCells } from "../battlefield";
import type { Rng } from "../dice";
import { CELL_METERS, cellDistance, type Cell } from "../exploration";
import { rollDie } from "../dice";
import { resolveAttack } from "./attack";
import { hasCondition, removeCondition, rollSave } from "./conditions";
import { AROUND, SPEED_DEFAULT, attackCheck, attackRange, cellKey, fm, movementLeft, occupiedCells, spellTargetCheck } from "./geometry";
import { ABILITY_FR } from "./labels";
import { applyDamage, healCombatant, isConscious, pushRoll, rollDamageDetailed } from "./state";
import type { AttackDef, Combatant, CombatState } from "./types";

/** Un ennemi s'approche de sa cible aussi loin que sa vitesse le permet. */
function enemyApproach(state: CombatState, enemy: Combatant, target: Combatant, attack?: AttackDef) {
  if (!state.arena || !enemy.pos || !target.pos) return;
  const budget = movementLeft(enemy, state);
  if (!budget || cellDistance(enemy.pos, target.pos) <= 1) return;
  const occupied = occupiedCells(state, enemy.id);
  let best: Cell[] | null = null;
  for (const d of AROUND) {
    const goal = { x: target.pos.x + d.x, y: target.pos.y + d.y };
    if (occupied.has(cellKey(goal))) continue;
    const path = pathBetween(state.arena, enemy.pos, goal, occupied);
    if (path && (!best || path.length < best.length)) best = path;
  }
  if (!best) return;
  let steps = best.slice(0, budget);
  // Un tireur s'arrête dès qu'il peut viser (il n'a pas besoin d'aller au contact).
  if (attack && attackRange(attack)) {
    const from = enemy.pos;
    const stop = steps.findIndex((c) => { enemy.pos = c; return attackCheck(state, enemy, target, attack).ok; });
    enemy.pos = from;
    if (stop >= 0) steps = steps.slice(0, stop + 1);
  }
  if (!steps.length) return;
  enemy.pos = steps[steps.length - 1];
  enemy.turnState.moved = (enemy.turnState.moved ?? 0) + steps.length;
  state.log.push(`${enemy.name} s'approche de ${target.name} (${fm(steps.length * CELL_METERS)} m).`);
  pushRoll(state, {
    kind: "move", actorId: enemy.id, actorName: enemy.name, side: enemy.side, title: `${enemy.name} s'approche`,
    sides: 0, dice: [], modifier: 0, total: steps.length * CELL_METERS,
  });
}

/** Cible de l'ennemi : le héros conscient le plus proche (au hasard à égalité). */
function nearestTarget(state: CombatState, enemy: Combatant, pool: Combatant[], rng: Rng): Combatant {
  if (!state.arena || !enemy.pos) return pool[Math.floor(rng() * pool.length)];
  const dist = (c: Combatant) => (c.pos ? cellDistance(enemy.pos!, c.pos) : 99);
  const best = Math.min(...pool.map(dist));
  const near = pool.filter((c) => dist(c) === best);
  return near.length > 1 ? near[Math.floor(rng() * near.length)] : near[0];
}

/** Attaques à distance d'un ennemi (celles qui entravent, comme la toile, ont leur propre usage). */
const rangedAttacks = (e: Combatant) => e.attacks.filter((a) => attackRange(a) && a.rider?.condition !== "restrained");

const moveEvent = (state: CombatState, enemy: Combatant, title: string, cells: number) =>
  pushRoll(state, { kind: "move", actorId: enemy.id, actorName: enemy.name, side: enemy.side, title, sides: 0, dice: [], modifier: 0, total: cells * CELL_METERS });

/** Distance (en cases) du héros le plus proche. */
const nearestHeroDistance = (pool: Combatant[], c: Cell) => Math.min(...pool.map((p) => (p.pos ? cellDistance(c, p.pos) : 99)));

/**
 * Un ennemi gravement blessé prend la fuite (Foncer vers la case la plus éloignée du héros) et sort du combat
 * quand il est loin ou hors de vue. Renvoie faux s'il est coincé : il se bat alors.
 */
function enemyFlee(state: CombatState, enemy: Combatant, pool: Combatant[]): boolean {
  if (!state.arena || !enemy.pos) return false;
  const budget = speedCells(enemy.speed ?? SPEED_DEFAULT) * 2 - (enemy.turnState.moved ?? 0);
  if (hasCondition(enemy, "restrained") || budget <= 0) return false;
  const here = nearestHeroDistance(pool, enemy.pos);
  const best = reachableWithin(state.arena, enemy.pos, budget, occupiedCells(state, enemy.id))
    .sort((a, b) => nearestHeroDistance(pool, b.cell) - nearestHeroDistance(pool, a.cell) || a.steps - b.steps)[0];
  if (!best || nearestHeroDistance(pool, best.cell) <= here) return false;
  enemy.pos = best.cell;
  enemy.turnState.moved = (enemy.turnState.moved ?? 0) + best.steps;
  state.log.push(`${enemy.name}, grièvement blessé, prend la fuite (${fm(best.steps * CELL_METERS)} m).`);
  moveEvent(state, enemy, `${enemy.name} s'enfuit`, best.steps);
  const arena = state.arena;
  if (nearestHeroDistance(pool, enemy.pos) >= 8 || pool.every((p) => !p.pos || !hasLineOfSight(arena, p.pos, enemy.pos!))) {
    enemy.dead = true;
    enemy.fled = true;
    state.log.push(`${enemy.name} s'enfuit et disparaît dans la nature.`);
  }
  return true;
}

/** Un archer au contact recule vers la case d'où il peut encore tirer et qui est la plus éloignée du héros. */
function enemyKite(state: CombatState, enemy: Combatant, target: Combatant, shot: AttackDef) {
  if (!state.arena || !enemy.pos || !target.pos) return;
  const budget = movementLeft(enemy, state);
  if (!budget) return;
  const from = enemy.pos;
  const options = reachableWithin(state.arena, from, budget, occupiedCells(state, enemy.id)).filter(({ cell }) => {
    enemy.pos = cell;
    const ok = attackCheck(state, enemy, target, shot).ok;
    enemy.pos = from;
    return ok;
  }).sort((a, b) => cellDistance(b.cell, target.pos!) - cellDistance(a.cell, target.pos!) || a.steps - b.steps);
  const best = options[0];
  if (!best || cellDistance(best.cell, target.pos) <= cellDistance(from, target.pos)) return;
  enemy.pos = best.cell;
  enemy.turnState.moved = (enemy.turnState.moved ?? 0) + best.steps;
  state.log.push(`${enemy.name} recule pour garder ses distances (${fm(best.steps * CELL_METERS)} m).`);
  moveEvent(state, enemy, `${enemy.name} recule`, best.steps);
}

/** Un compagnon soigneur soigne le membre du groupe le plus mal en point (à 0 PV ou sous la moitié de ses PV). */
function allyHeal(state: CombatState, ally: Combatant, rng: Rng): boolean {
  const heal = ally.healing;
  if (!heal || heal.uses <= 0) return false;
  const hurt = state.combatants
    .filter((c) => c.side === ally.side && !c.dead && c.hp <= c.maxHp / 2)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || (a.ally ? 1 : 0) - (b.ally ? 1 : 0))[0];
  if (!hurt) return false;
  if (state.arena && ally.pos && hurt.pos && hurt.id !== ally.id && cellDistance(ally.pos, hurt.pos) > 1) {
    enemyApproach(state, ally, hurt);
    if (cellDistance(ally.pos!, hurt.pos) > 1) return false; // trop loin : il agira autrement ce tour
  }
  heal.uses -= 1;
  const dice = Array.from({ length: heal.dice[0] }, () => rollDie(heal.dice[1], rng));
  state.log.push(`${ally.name} lance ${heal.name} sur ${hurt.id === ally.id ? "lui-même" : hurt.name}.`);
  const healed = healCombatant(state, hurt, dice.reduce((a, b) => a + b, heal.bonus));
  pushRoll(state, {
    kind: "heal", actorId: ally.id, actorName: ally.name, side: ally.side, title: `${heal.name} de ${ally.name}`,
    sides: heal.dice[1], dice, modifier: heal.bonus, total: healed, outcome: "success",
  });
  return true;
}

/** Un compagnon lance son sort mineur (Flamme sacrée) sur un ennemi à portée et en vue, en s'approchant au besoin. */
function allyCantrip(state: CombatState, ally: Combatant, target: Combatant, rng: Rng): boolean {
  const sp = ally.cantrip;
  if (!sp) return false;
  if (!spellTargetCheck(state, ally, target, sp.rangeM).ok) {
    enemyApproach(state, ally, target, { name: sp.name, toHit: 0, damage: { count: 0, sides: 0, bonus: 0 }, damageType: sp.damageType, ranged: true, spell: true, range: [sp.rangeM, sp.rangeM] });
    if (!spellTargetCheck(state, ally, target, sp.rangeM).ok) return false;
  }
  state.log.push(`${ally.name} lance ${sp.name} sur ${target.name}.`);
  const { success } = rollSave(state, target, sp.ability, sp.dc, rng, `${target.name} : sauvegarde de ${ABILITY_FR[sp.ability]} contre ${sp.name}`);
  if (success) {
    state.log.push(`${target.name} esquive la flamme.`);
    return true;
  }
  const dmg = rollDamageDetailed({ count: sp.dice[0], sides: sp.dice[1], bonus: 0 }, false, rng);
  state.log.push(`${sp.name} : ${dmg.total} dégâts (${sp.damageType}).`);
  applyDamage(state, target, dmg.total, false);
  pushRoll(state, {
    kind: "damage", actorId: ally.id, actorName: ally.name, side: ally.side, title: `${sp.name} : dégâts (${sp.damageType})`,
    sides: sp.dice[1], dice: dmg.dice, modifier: 0, total: dmg.total, outcome: "hit",
  });
  return true;
}

/**
 * Tour d'un combattant joué par l'ordinateur : les ennemis, et les compagnons du héros (qui visent les ennemis).
 * La défenseuse frappe l'ennemi le plus proche du héros ; le soigneur soigne d'abord, puis lance son sort mineur.
 */
export function aiTurn(state: CombatState, enemy: Combatant, rng: Rng) {
  let pool: Combatant[];
  if (enemy.side === "enemies") {
    const party = state.combatants.filter((c) => c.side === "party" && !c.dead);
    const conscious = party.filter(isConscious);
    pool = conscious.length ? conscious : party.filter((c) => !c.stable);
  } else {
    pool = state.combatants.filter((c) => c.side !== enemy.side && !c.dead && isConscious(c));
  }
  if (enemy.ally && !enemy.conditions.some((x) => x.escape) && allyHeal(state, enemy, rng)) return;
  if (!pool.length || !enemy.attacks.length) {
    state.log.push(`${enemy.name} n'a personne à attaquer.`);
    return;
  }
  // Entravé : l'ennemi tente de se libérer (test de Force contre le DD du sort) au lieu d'attaquer.
  const bound = enemy.conditions.find((x) => x.escape);
  if (bound?.escape) {
    const res = rollSave(state, enemy, bound.escape.ability, bound.escape.dc, rng, `${enemy.name} tente de se libérer`);
    if (res.success) removeCondition(state, enemy, bound.id, "il s'est libéré");
    return;
  }
  // Lâche : à un quart de ses PV ou moins, il fuit s'il le peut.
  if (state.arena && enemy.traits?.includes("coward") && enemy.hp <= enemy.maxHp / 4 && enemyFlee(state, enemy, pool)) return;
  const hero = enemy.tactic === "defender" ? state.combatants.find((c) => c.side === enemy.side && !c.ally && !c.dead) : undefined;
  // Défenseuse : l'ennemi le plus proche du héros (pour le protéger) ; sinon la cible la plus proche.
  const target = hero ? nearestTarget(state, hero, pool, rng) : nearestTarget(state, enemy, pool, rng);
  if (enemy.cantrip && allyCantrip(state, enemy, target, rng)) return;
  // Une attaque qui entrave (toile) est lancée de loin sur une cible libre ; sinon une attaque au hasard parmi celles de mêlée.
  const netter = enemy.attacks.find((a) => a.rider?.condition === "restrained");
  const melee = enemy.attacks.filter((a) => !attackRange(a) && a.rider?.condition !== "restrained");
  const ranged = rangedAttacks(enemy);
  let attack = netter && !hasCondition(target, "restrained") && state.arena && enemy.pos && target.pos && cellDistance(enemy.pos, target.pos) > 1 && attackCheck(state, enemy, target, netter).ok
    ? netter
    : (melee.length > 1 ? melee[Math.floor(rng() * melee.length)] : melee[0] ?? enemy.attacks[0]);
  // Tireur : à distance il tire plutôt que de s'approcher ; au contact, un archer recule d'abord pour tirer.
  if (state.arena && enemy.pos && target.pos && ranged.length && attack !== netter) {
    const archer = enemy.traits?.includes("archer");
    if (archer && cellDistance(enemy.pos, target.pos) <= 1) enemyKite(state, enemy, target, ranged[0]);
    const adjacent = cellDistance(enemy.pos, target.pos) <= 1;
    const shot = ranged.find((a) => attackCheck(state, enemy, target, a).ok);
    if (shot && (!adjacent || (archer && !melee.length))) attack = shot;
    else if (!shot && (archer || !melee.length)) attack = ranged[0]; // il s'approche jusqu'à pouvoir tirer
  }
  if (state.arena) {
    // Sur le terrain : l'ennemi avance d'abord (sauf s'il peut déjà viser), puis attaque s'il est à portée.
    if (!attackCheck(state, enemy, target, attack).ok) {
      enemyApproach(state, enemy, target, attack);
      // Agressif : une seconde course, en action bonus, vers l'adversaire.
      if (enemy.traits?.includes("aggressive") && !attackCheck(state, enemy, target, attack).ok && enemy.pos) {
        enemy.turnState.moved = Math.max(0, (enemy.turnState.moved ?? 0) - speedCells(enemy.speed ?? SPEED_DEFAULT));
        enemyApproach(state, enemy, target);
      }
    }
    // Pas encore au contact après sa course : il tire s'il le peut.
    if (!attackCheck(state, enemy, target, attack).ok) attack = ranged.find((a) => attackCheck(state, enemy, target, a).ok) ?? attack;
    if (!attackCheck(state, enemy, target, attack).ok) {
      state.log.push(`${enemy.name} ne peut pas atteindre ${target.name}.`);
      return;
    }
  }
  resolveAttack(state, enemy, target, attack, rng);
}
