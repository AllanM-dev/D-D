import { CLASS_SPELLCASTING, SPELL_BY_ID, rangeMeters, type SpellDef } from "../data/spells";
import { rollD20, rollDie, type Rng } from "./dice";
import {
  ABILITY_FR, afterPlayerAction, applyCondition, applyDamage, rollSave, spellTargetCheck, assertPlayerTurn, endConcentration, enemyTarget, healCombatant, isConscious, pushRoll,
  resolveAttack, rollDamageDetailed, type AttackDef, type Combatant, type CombatState, type Spellcasting,
} from "./combat";
import type { AbilityScores } from "./abilities";
import type { Ability } from "./rules";

export interface CastingInput {
  classId: string;
  modifiers: AbilityScores;
  proficiencyBonus: number;
  /** Bonus de sauvegarde de Constitution (maîtrise comprise). */
  conSaveBonus: number;
  unarmored: boolean;
  spells: { cantrips: string[]; prepared: string[] };
}

/** Capacité d'incantation d'un personnage de niveau 1 : DD, bonus d'attaque, emplacements, sorts connus. */
export function castingFor(input: CastingInput): Spellcasting | undefined {
  const cfg = CLASS_SPELLCASTING[input.classId];
  if (!cfg) return undefined;
  const mod = input.modifiers[cfg.ability];
  return {
    ability: cfg.ability,
    modifier: mod,
    attackBonus: input.proficiencyBonus + mod,
    saveDc: 8 + input.proficiencyBonus + mod,
    cantrips: [...input.spells.cantrips],
    prepared: [...(cfg.alwaysPrepared ?? []), ...input.spells.prepared],
    slots: { max: cfg.slots, used: 0 },
    free: cfg.free ? [{ spellId: cfg.free.spellId, uses: cfg.free.uses, max: cfg.free.uses }] : [],
    concentrationBonus: input.conSaveBonus,
    unarmored: input.unarmored,
  };
}


export interface SpellOption {
  id: string;
  name: string;
  level: 0 | 1;
  time: "action" | "bonus";
  /** Ennemi à choisir, ou le lanceur lui-même. */
  target: "enemy" | "self";
  /** Coût ou ressource restante. */
  detail: string;
  available: boolean;
  /** Pourquoi le sort est impossible maintenant. */
  reason?: string;
}

/** Restriction de 2024 : un sort à action bonus limite les autres sorts du tour à un sort mineur d'une action. */
function turnRestriction(c: Combatant, spell: SpellDef): string | undefined {
  const cast = c.turnState.spells;
  const actionCantrip = (s: { level: number; time: string }) => s.level === 0 && s.time === "action";
  if (cast.some((s) => s.time === "bonus") && !actionCantrip({ level: spell.level, time: spell.time }))
    return "Après un sort à action bonus, seul un sort mineur d'action est possible";
  if (spell.time === "bonus" && cast.some((s) => !actionCantrip(s)))
    return "Un sort à action bonus ne peut suivre qu'un sort mineur d'action";
  return undefined;
}

function targetKind(spell: SpellDef): "enemy" | "self" {
  const k = spell.effect.kind;
  return k === "heal" || k === "mage-armor" || k === "ac-bonus" ? "self" : "enemy";
}

/** Sorts jouables de ce combattant, avec ce qui les empêche éventuellement. */
export function spellOptionsFor(state: CombatState, c: Combatant): SpellOption[] {
  const sc = c.spellcasting;
  if (!sc || c.side !== "party" || !isConscious(c)) return [];
  const ids = [...new Set([...sc.cantrips, ...sc.prepared])];
  const enemiesAlive = state.combatants.some((x) => x.side === "enemies" && !x.dead);
  const out: SpellOption[] = [];
  for (const id of ids) {
    const spell = SPELL_BY_ID[id];
    if (!spell || spell.effect.kind === "none" || spell.time === "reaction") continue;
    const free = sc.free.find((f) => f.spellId === id);
    const hasFree = !!free && free.uses > 0;
    const slotsLeft = sc.slots.max - sc.slots.used;
    let reason: string | undefined;
    if (spell.time === "action" && c.turnState.action) reason = "Action déjà utilisée";
    else if (spell.time === "bonus" && c.turnState.bonus) reason = "Action bonus déjà utilisée";
    else if (spell.level >= 1 && !hasFree && slotsLeft <= 0) reason = "Plus d'emplacement de sort";
    else reason = turnRestriction(c, spell);
    const kind = spell.effect.kind;
    if (!reason && kind === "heal" && c.hp >= c.maxHp) reason = "Points de vie au maximum";
    if (!reason && kind === "mage-armor") {
      if (!sc.unarmored) reason = "Réservé à qui ne porte pas d'armure";
      else if (13 + c.initiativeBonus <= c.ac) reason = "Sans effet : votre CA est déjà aussi bonne";
    }
    if (!reason && kind === "ac-bonus" && c.concentrating?.spellId === id) reason = "Déjà actif";
    if (!reason && targetKind(spell) === "enemy" && !enemiesAlive) reason = "Aucune cible";
    const detail = spell.level === 0 ? "sort mineur" : hasFree ? `gratuit ${free!.uses}/${free!.max}` : `emplacement ${slotsLeft}/${sc.slots.max}`;
    out.push({ id, name: spell.name, level: spell.level, time: spell.time as "action" | "bonus", target: targetKind(spell), detail, available: !reason, reason });
  }
  return out;
}

/** Un sort à action bonus est-il utilisable maintenant ? (le tour reste alors ouvert) */
export function hasBonusSpell(state: CombatState, c: Combatant): boolean {
  return spellOptionsFor(state, c).some((o) => o.time === "bonus" && o.available);
}

export interface CastChoice {
  targetId?: string;
}

/** Lance un sort du personnage dont c'est le tour. */
export function castSpell(state: CombatState, spellId: string, rng: Rng = Math.random, choice: CastChoice = {}) {
  const cur = assertPlayerTurn(state);
  const sc = cur.spellcasting;
  const spell = SPELL_BY_ID[spellId];
  const option = spellOptionsFor(state, cur).find((o) => o.id === spellId);
  if (!sc || !spell || !option) throw new Error("Sort inconnu ou non préparé.");
  if (!option.available) throw new Error(option.reason ?? "Ce sort est impossible maintenant.");
  const target = option.target === "enemy" ? enemyTarget(state, choice.targetId ?? "") : cur;
  if (option.target === "enemy") {
    const check = spellTargetCheck(state, cur, target, rangeMeters(spell));
    if (!check.ok) throw new Error(check.reason);
  }

  // Coût : lancer gratuit d'abord, sinon un emplacement.
  if (spell.level >= 1) {
    const free = sc.free.find((f) => f.spellId === spellId);
    if (free && free.uses > 0) free.uses -= 1;
    else sc.slots.used += 1;
  }
  if (spell.time === "action") cur.turnState.action = true;
  else cur.turnState.bonus = true;
  cur.turnState.spells.push({ level: spell.level, time: spell.time as "action" | "bonus" });
  if (spell.concentration) {
    endConcentration(state, cur, "change de sort");
    cur.concentrating = { spellId };
  }
  state.log.push(`${cur.name} lance ${spell.name}.`);

  const e = spell.effect;
  switch (e.kind) {
    case "attack": {
      const attack: AttackDef = {
        name: spell.name, toHit: sc.attackBonus, damage: { count: e.dice[0], sides: e.dice[1], bonus: 0 },
        damageType: e.damageType, ranged: !e.melee, ability: sc.ability, spell: true,
        ...(rangeMeters(spell) !== undefined ? { range: [rangeMeters(spell)!, rangeMeters(spell)!] as [number, number] } : {}),
      };
      const res = resolveAttack(state, cur, target, attack, rng);
      if (e.condition && res.hit && !target.dead) {
        // « Jusqu'à la fin de votre prochain tour » : lanceur, round suivant.
        applyCondition(state, target, { id: e.condition, source: spell.name, until: { actorId: cur.id, round: state.round + 1 } });
      }
      if (e.guiding && res.hit && !target.dead) {
        target.guided = true;
        target.guidedUntilRound = state.round + 1;
        state.log.push(`${target.name} est éclairé : la prochaine attaque contre lui a l'avantage.`);
      }
      break;
    }
    case "save": {
      const dc = sc.saveDc + (cur.innateSorcery ? 1 : 0); // Magie innée : +1 au DD des sorts
      const { success } = rollSave(state, target, e.save, dc, rng);
      if (success && !e.half) {
        state.log.push(`${target.name} résiste à ${spell.name}.`);
        break;
      }
      const sides = e.hurtSides && target.hp < target.maxHp ? e.hurtSides : e.dice[1];
      const dmg = rollDamageDetailed({ count: e.dice[0], sides, bonus: 0 }, false, rng); // pas de critique sur un jet de sauvegarde
      const amount = success ? Math.floor(dmg.total / 2) : dmg.total;
      state.log.push(`${spell.name} : ${amount} dégâts (${e.damageType})${success ? ", moitié car le jet est réussi" : ""}.`);
      applyDamage(state, target, amount, false);
      pushRoll(state, {
        kind: "damage", actorId: cur.id, actorName: cur.name, side: cur.side, title: `${spell.name} : dégâts (${e.damageType})`,
        sides, dice: dmg.dice, modifier: 0, total: amount, outcome: "hit",
        ...(success ? { rolled: dmg.total, note: "moitié : jet de sauvegarde réussi" } : {}),
      });
      if (!success && e.mocks && !target.dead) {
        target.mocked = true;
        state.log.push(`${target.name} est tourné en ridicule : désavantage à sa prochaine attaque.`);
      }
      break;
    }
    case "control": {
      const dc = sc.saveDc + (cur.innateSorcery ? 1 : 0);
      const { success } = rollSave(state, target, e.save, dc, rng);
      if (success) {
        state.log.push(`${target.name} résiste à ${spell.name}.`);
        break;
      }
      for (const id of e.conditions) {
        applyCondition(state, target, {
          id, source: spell.name,
          ...(spell.concentration ? { concentrationOf: cur.id } : {}),
          // Le nouveau jet ne porte que sur l'état qui neutralise : à terre disparaît ensuite quand la cible se relève.
          ...(e.repeatSave && id === "incapacitated" ? { save: { ability: e.save, dc } } : {}),
          ...(e.escape ? { escape: { ability: "STR" as const, dc } } : {}),
        });
      }
      break;
    }
    case "missiles": {
      const dice = Array.from({ length: e.darts }, () => rollDie(e.sides, rng));
      const bonus = e.darts * e.bonus;
      const total = dice.reduce((a, b) => a + b, bonus);
      state.log.push(`${spell.name} : ${total} dégâts (${e.damageType}), les fléchettes ne manquent jamais.`);
      applyDamage(state, target, total, false);
      pushRoll(state, {
        kind: "damage", actorId: cur.id, actorName: cur.name, side: cur.side, title: `${spell.name} : dégâts (${e.damageType})`,
        sides: e.sides, dice, modifier: bonus, total, outcome: "hit",
      });
      break;
    }
    case "heal": {
      const dice = Array.from({ length: e.dice[0] }, () => rollDie(e.dice[1], rng));
      const total = dice.reduce((a, b) => a + b, sc.modifier);
      healCombatant(state, cur, Math.max(0, total));
      pushRoll(state, {
        kind: "heal", actorId: cur.id, actorName: cur.name, side: cur.side, title: `${spell.name} de ${cur.name}`,
        sides: e.dice[1], dice, modifier: sc.modifier, total: Math.max(0, total), outcome: "success",
      });
      break;
    }
    case "mage-armor": {
      cur.ac = Math.max(cur.ac, 13 + cur.initiativeBonus);
      state.log.push(`${cur.name} : CA ${cur.ac}.`);
      break;
    }
    case "ac-bonus": {
      cur.ac += e.bonus;
      cur.acBonus = e.bonus;
      state.log.push(`${cur.name} : CA ${cur.ac}.`);
      break;
    }
    case "mark": {
      cur.mark = {
        spellId, name: spell.name, targetId: target.id, count: e.dice[0], sides: e.dice[1], damageType: e.damageType,
        weaponOnly: e.weaponOnly,
      };
      state.log.push(`${target.name} est marqué : +${e.dice[0]}d${e.dice[1]} dégâts (${e.damageType}) à chaque coup.`);
      break;
    }
    case "reaction-shield":
    case "reaction-rebuke":
    case "none":
      break;
  }
  afterPlayerAction(state, rng);
}
