/** Résolution d'une attaque : jet, avantage et désavantage, dégâts, effets au coup, réactions, maîtrises d'arme. */
import { SPELL_BY_ID } from "../../data/spells";
import { gridOf } from "../battlefield";
import { rollD20, rollDie, type AdvantageMode, type Rng } from "../dice";
import { CELL_METERS, cellDistance, walkable } from "../exploration";
import { applyCondition, conditionModes, hasCondition, isIncapacitated, rollSave } from "./conditions";
import { attackCheck, cellKey, fm, occupiedCells } from "./geometry";
import { ABILITY_FR } from "./labels";
import { RAGE_DAMAGE, RAGE_RESISTED, applyDamage, concentrationCheck, getCombatant, isConscious, isDown, pushRoll, rollDamageDetailed, type RollInit } from "./state";
import type { AttackContext, AttackDef, AttackResult, Combatant, CombatState, ReactionOption } from "./types";

/** Réactions (sorts) que ce combattant peut utiliser maintenant : Bouclier quand l'attaque touche, Représailles infernales après des dégâts. */
export function reactionOptions(c: Combatant, stage: "hit" | "damage"): ReactionOption[] {
  const sc = c.spellcasting;
  if (!sc || c.side !== "party" || !isConscious(c) || isIncapacitated(c) || c.turnState.reaction || c.untrainedArmor) return [];
  if (sc.slots.max - sc.slots.used <= 0) return [];
  const id = stage === "hit" ? "shield" : "hellish-rebuke";
  if (!sc.prepared.includes(id)) return [];
  const spell = SPELL_BY_ID[id];
  return [{ id, name: spell.name, detail: `1 emplacement, ${sc.slots.max - sc.slots.used}/${sc.slots.max} restants` }];
}

export function resolveAttack(
  state: CombatState, attacker: Combatant, target: Combatant, attack: AttackDef, rng: Rng, opts: { opportunity?: boolean } = {},
): AttackResult {
  const melee = !attack.ranged;
  const unconscious = isDown(target);
  let mode: AdvantageMode = "normal";
  // Avantage : cible inconsciente au corps à corps, attaque de sort sous Magie innée, ou cible marquée par Éclair guidé.
  const guidedAdvantage = target.guided && attacker.side === "party";
  const cm = conditionModes(attacker, target, melee);
  // Gêne (maîtrise Vex) et tactique de meute (monstres).
  const vexed = attacker.vexTargetId === target.id && (attacker.vexUntilRound ?? 0) >= state.round;
  const pack = !!attacker.traits?.includes("pack-tactics") && !!state.arena && !!target.pos &&
    state.combatants.some((a) => a.side === attacker.side && a.id !== attacker.id && !a.dead && !isIncapacitated(a) && a.pos && cellDistance(a.pos, target.pos!) <= 1);
  // Attaque téméraire : avantage à ses attaques de Force au corps à corps, et avantage à ceux qui l'attaquent.
  const recklessAttack = !!attacker.reckless && melee && attack.ability === "STR";
  const recklessExposed = !!target.reckless;
  const advantage = (unconscious && melee) || (attacker.innateSorcery && !!attack.spell) || guidedAdvantage || vexed || pack || recklessAttack || recklessExposed || cm.advantage.length > 0;
  // Désavantage : cible qui esquive, attaquant visé par Moquerie cruelle, ou états (empoisonné, effrayé…).
  const rangeDis = attackCheck(state, attacker, target, attack).disadvantage;
  const disadvantage = target.dodging || attacker.mocked || cm.disadvantage.length > 0 || rangeDis.length > 0;
  const reasons = [
    advantage && !disadvantage ? `Avantage : ${[unconscious && melee ? "cible inconsciente" : "", attacker.innateSorcery && attack.spell ? "Magie innée" : "", guidedAdvantage ? "cible éclairée" : "", vexed ? "gêne (maîtrise)" : "", pack ? "tactique de meute" : "", recklessAttack ? "attaque téméraire" : "", recklessExposed ? "cible téméraire" : "", ...cm.advantage].filter(Boolean).join(", ")}` : "",
    disadvantage && !advantage ? `Désavantage : ${[target.dodging ? "cible qui esquive" : "", attacker.mocked ? "moquerie" : "", ...cm.disadvantage, ...rangeDis].filter(Boolean).join(", ")}` : "",
    advantage && disadvantage ? "Avantage et désavantage s'annulent" : "",
  ].filter(Boolean);
  if (guidedAdvantage) target.guided = false;
  if (vexed) attacker.vexTargetId = undefined;
  if (attacker.mocked) attacker.mocked = false;
  if (advantage && !disadvantage) mode = "advantage";
  else if (disadvantage && !advantage) mode = "disadvantage";

  const roll = rollD20(attack.toHit, mode, rng);
  const ctx: AttackContext = {
    attackerId: attacker.id, targetId: target.id, attack, reasons, melee, advantaged: advantage && !disadvantage,
    roll: { natural: roll.natural, rolls: roll.rolls, total: roll.total, critical: roll.critical, fumble: roll.fumble },
  };
  // Un ennemi qui touche un héros capable de réagir (Bouclier) attend la décision du joueur avant les dégâts.
  const hits = roll.critical || (!roll.fumble && roll.total >= target.ac);
  if (hits && attacker.side === "enemies" && target.side === "party" && !opts.opportunity) {
    const options = reactionOptions(target, "hit");
    if (options.length) {
      state.pending = {
        stage: "hit", reactorId: target.id, attackerId: attacker.id, options, context: ctx,
        summary: `${attacker.name} vous touche (${attack.name} : ${roll.total} contre CA ${target.ac}).`,
      };
      return { hit: true, crit: false, damage: 0, paused: true };
    }
  }
  return completeAttack(state, ctx, rng);
}

/** Suite d'une attaque dont le d20 est lancé : touche ou rate (selon la CA actuelle), dégâts, marque, concentration, état. */
export function completeAttack(state: CombatState, ctx: AttackContext, rng: Rng): AttackResult {
  const attacker = getCombatant(state, ctx.attackerId);
  const target = getCombatant(state, ctx.targetId);
  const { attack, roll, reasons, melee } = ctx;
  const unconscious = isDown(target);
  // Bénédiction : +1d4 au jet d'attaque.
  const bless = attacker.blessed && attacker.side === "party" && !roll.fumble ? rollDie(4, rng) : 0;
  let hit = roll.critical || (!roll.fumble && roll.total + bless >= target.ac);
  // Inspiration bardique : le dé en réserve est ajouté à un jet raté, s'il le fait réussir.
  let inspired = 0;
  if (!hit && !roll.fumble && attacker.inspiration && attacker.side === "party") {
    const die = rollDie(attacker.inspiration, rng);
    if (roll.total + bless + die >= target.ac) {
      hit = true;
      inspired = die;
      attacker.inspiration = undefined;
    }
  }
  if (hit && attacker.side === "party" && melee && !attack.spell) attacker.turnState.lastHit = target.id;
  const shownTotal = roll.total + bless + inspired;
  const label = `${attacker.name} attaque ${target.name} (${attack.name}) : ${roll.natural}${attack.toHit >= 0 ? "+" : ""}${attack.toHit}${bless ? ` + ${bless} (Bénédiction)` : ""}${inspired ? ` + ${inspired} (inspiration bardique)` : ""} = ${shownTotal} contre CA ${target.ac}`;
  // Un coup au corps à corps contre une cible inconsciente est toujours un critique.
  const paralyzed = hasCondition(target, "paralyzed");
  const crit = hit && (roll.critical || ((unconscious || paralyzed) && melee));
  const attackRoll: RollInit = {
    kind: "attack", actorId: attacker.id, actorName: attacker.name, side: attacker.side,
    title: `${attacker.name} attaque ${target.name} (${attack.name})`,
    sides: 20, dice: roll.rolls, keptIndex: roll.rolls.indexOf(roll.natural), modifier: attack.toHit,
    total: shownTotal, dc: target.ac, outcome: roll.fumble ? "fumble" : !hit ? "miss" : crit ? "crit" : "hit",
    ...(reasons.length || inspired || bless ? { note: [...reasons, ...(bless ? [`Bénédiction +${bless}`] : []), ...(inspired ? [`Inspiration bardique +${inspired}`] : [])].join(" · ") } : {}),
  };
  if (!hit) {
    state.log.push(`${label} — raté.`);
    pushRoll(state, attackRoll);
    // Maîtrise Écorchure : même sur un coup raté, le modificateur de caractéristique est infligé.
    if (attack.mastery === "graze" && attacker.side === "party" && attack.damage.bonus > 0 && !target.dead) {
      const g = attack.damage.bonus;
      state.log.push(`Écorchure : ${g} dégâts malgré l'échec (${attack.damageType}).`);
      applyDamage(state, target, g, false);
      pushRoll(state, {
        kind: "damage", actorId: attacker.id, actorName: attacker.name, side: attacker.side, title: `Écorchure : dégâts (${attack.damageType})`,
        sides: 0, dice: [], modifier: g, total: g, outcome: "hit",
      });
    }
    return { hit: false, crit: false, damage: 0 };
  }
  pushRoll(state, attackRoll); // état et journal d'avant les dégâts
  // Rage : +2 aux dégâts des attaques de Force.
  const rageBonus = attacker.raging && attack.ability === "STR" ? RAGE_DAMAGE : 0;
  const damageDef = rageBonus ? { ...attack.damage, bonus: attack.damage.bonus + rageBonus } : attack.damage;
  const { dice, total: rolled } = rollDamageDetailed(damageDef, crit, rng, attack.gwf ? 3 : 1);
  // Rage : résistance aux dégâts contondants, perforants et tranchants (moitié, arrondie à l'inférieur).
  const resisted = target.raging && RAGE_RESISTED.includes(attack.damageType);
  const damage = resisted ? Math.floor(rolled / 2) : rolled;
  const notes = [rageBonus ? `rage +${rageBonus}` : "", resisted ? "réduits de moitié par la rage" : ""].filter(Boolean);
  state.log.push(
    damage === 0 && attack.damage.count === 0 ? `${label} — touché.` : `${label} — ${crit ? "coup critique" : "touché"} : ${damage} dégâts (${attack.damageType}${notes.length ? ", " + notes.join(", ") : ""}).`,
  );
  applyDamage(state, target, damage, crit);
  pushRoll(state, {
    kind: "damage", actorId: attacker.id, actorName: attacker.name, side: attacker.side,
    title: `Dégâts de ${attacker.name} (${attack.damageType})`,
    sides: attack.damage.sides, dice, modifier: damageDef.bonus, total: damage, outcome: crit ? "crit" : "hit",
    ...(resisted ? { rolled, note: "réduits de moitié (résistance de la rage)" } : {}),
  });
  let total = damage;
  // Robustesse des morts-vivants : à 0 PV, jet de Constitution pour rester à 1 PV (sauf dégâts radiants ou coup critique).
  if (target.dead && target.traits?.includes("undead-fortitude") && attack.damageType !== "radiant" && !crit) {
    const r = rollSave(state, target, "CON", 5 + damage, rng, `${target.name} : robustesse des morts-vivants`);
    if (r.success) {
      target.dead = false;
      target.hp = 1;
      state.log.push(`${target.name} refuse de tomber : il reste à 1 PV.`);
    }
  }

  // Maléfice, Marque du chasseur : dégâts supplémentaires sur la cible marquée.
  const mark = attacker.mark;
  if (mark && mark.targetId === target.id && !target.dead && (!attack.spell || !mark.weaponOnly)) {
    const extra = rollDamageDetailed({ count: mark.count, sides: mark.sides, bonus: 0 }, crit, rng);
    state.log.push(`${mark.name} : ${extra.total} dégâts supplémentaires (${mark.damageType}).`);
    applyDamage(state, target, extra.total, crit);
    pushRoll(state, {
      kind: "damage", actorId: attacker.id, actorName: attacker.name, side: attacker.side,
      title: `${mark.name} : dégâts supplémentaires (${mark.damageType})`,
      sides: mark.sides, dice: extra.dice, modifier: 0, total: extra.total, outcome: crit ? "crit" : "hit",
    });
    total += extra.total;
  }

  // Attaque sournoise : une fois par tour, arme à finesse ou à distance, avec l'avantage.
  if (attacker.sneakDice && attack.sneak && ctx.advantaged && !attacker.turnState.sneakUsed && !target.dead) {
    attacker.turnState.sneakUsed = true;
    const extra = rollDamageDetailed({ count: attacker.sneakDice, sides: 6, bonus: 0 }, crit, rng);
    state.log.push(`Attaque sournoise : ${extra.total} dégâts supplémentaires.`);
    applyDamage(state, target, extra.total, crit);
    pushRoll(state, {
      kind: "damage", actorId: attacker.id, actorName: attacker.name, side: attacker.side, title: `Attaque sournoise : dégâts supplémentaires (${attack.damageType})`,
      sides: 6, dice: extra.dice, modifier: 0, total: extra.total, outcome: crit ? "crit" : "hit",
    });
    total += extra.total;
  }
  // Effet de maîtrise d'arme.
  if (attack.mastery && attacker.side === "party" && !target.dead) applyMastery(state, attacker, target, attack, rng);

  // Un lanceur de sorts qui subit des dégâts doit garder sa concentration.
  concentrationCheck(state, target, damage, rng);
  // État infligé par le coup (jet de sauvegarde de la cible).
  const rider = attack.rider;
  if (rider && !target.dead && target.hp > 0 && !target.tags?.some((t) => rider.exceptTags?.includes(t))) {
    const save = rider.save;
    const ok = save ? rollSave(state, target, save.ability, save.dc, rng).success : false;
    if (!ok) {
      applyCondition(state, target, {
        id: rider.condition, source: attack.name,
        ...(rider.rounds ? { expiresRound: state.round + rider.rounds } : {}),
        ...(rider.escape ? { escape: rider.escape } : {}),
        ...(rider.repeatSave && save ? { save } : {}),
      });
    }
  }
  // Dégâts supplémentaires sur jet de sauvegarde (poison).
  const sd = attack.saveDamage;
  if (sd && !target.dead && target.hp > 0) {
    const r = rollSave(state, target, sd.ability, sd.dc, rng, `${target.name} : sauvegarde de ${ABILITY_FR[sd.ability]} contre ${attack.name}`);
    const dmg = rollDamageDetailed({ count: sd.dice[0], sides: sd.dice[1], bonus: 0 }, false, rng);
    const amount = r.success ? Math.floor(dmg.total / 2) : dmg.total;
    state.log.push(`${attack.name} : ${amount} dégâts supplémentaires (${sd.damageType})${r.success ? ", moitié car le jet est réussi" : ""}.`);
    applyDamage(state, target, amount, false);
    pushRoll(state, {
      kind: "damage", actorId: attacker.id, actorName: attacker.name, side: attacker.side, title: `${attack.name} : dégâts (${sd.damageType})`,
      sides: sd.dice[1], dice: dmg.dice, modifier: 0, total: amount, outcome: "hit", ...(r.success ? { rolled: dmg.total, note: "moitié : jet de sauvegarde réussi" } : {}),
    });
    total += amount;
  }
  // Représailles infernales : le héros blessé peut réagir.
  if (attacker.side === "enemies" && target.side === "party" && total > 0) {
    const options = reactionOptions(target, "damage");
    if (options.length) {
      state.pending = {
        stage: "damage", reactorId: target.id, attackerId: attacker.id, options, context: ctx,
        summary: `${attacker.name} vous a blessé (${total} PV).`,
      };
      return { hit: true, crit, damage: total, paused: true };
    }
  }
  return { hit: true, crit, damage: total };
}

/** Effets des maîtrises d'armes (2024) : appliqués quand l'attaque touche avec une arme maîtrisée. */
function applyMastery(state: CombatState, attacker: Combatant, target: Combatant, attack: AttackDef, rng: Rng) {
  switch (attack.mastery) {
    case "vex":
      attacker.vexTargetId = target.id;
      attacker.vexUntilRound = state.round + 1;
      state.log.push(`Gêne : ${attacker.name} aura l'avantage à sa prochaine attaque contre ${target.name}.`);
      break;
    case "sap":
      target.mocked = true;
      state.log.push(`Sape : ${target.name} aura un désavantage à sa prochaine attaque.`);
      break;
    case "slow":
      target.slowedUntilRound = state.round + 1;
      state.log.push(`Ralentissement : la vitesse de ${target.name} baisse de 3 m jusqu'à votre prochain tour.`);
      break;
    case "topple": {
      const r = rollSave(state, target, "CON", 8 + attack.toHit, rng, `${target.name} : sauvegarde de Constitution contre le renversement`);
      if (!r.success) applyCondition(state, target, { id: "prone", source: `${attack.name} (renversement)` });
      break;
    }
    case "push": {
      if (!state.arena || !attacker.pos || !target.pos) break;
      const dx = Math.sign(target.pos.x - attacker.pos.x), dy = Math.sign(target.pos.y - attacker.pos.y);
      const occupied = occupiedCells(state, target.id);
      const grid = gridOf(state.arena);
      let pos = target.pos;
      for (let i = 0; i < 2; i++) {
        const n = { x: pos.x + dx, y: pos.y + dy };
        if (!walkable(grid, n) || occupied.has(cellKey(n))) break;
        pos = n;
      }
      if (pos !== target.pos) {
        target.pos = pos;
        state.log.push(`Poussée : ${target.name} est repoussé de ${fm(cellDistance(pos, attacker.pos) * CELL_METERS - CELL_METERS)} m.`);
      }
      break;
    }
    case "cleave": {
      if (!state.arena || attack.ranged || attacker.turnState.cleaved || !target.pos || !attacker.pos) break;
      const reach = attack.reach ?? 1;
      const other = state.combatants.find(
        (c) => c.side !== attacker.side && !c.dead && c.id !== target.id && c.pos && cellDistance(c.pos, target.pos!) <= 1 && cellDistance(c.pos, attacker.pos!) <= reach,
      );
      if (!other) break;
      attacker.turnState.cleaved = true;
      state.log.push(`Enchaînement : ${attacker.name} frappe aussi ${other.name}.`);
      resolveAttack(state, attacker, other, { ...attack, name: `${attack.name} (enchaînement)`, mastery: undefined, damage: { ...attack.damage, bonus: Math.min(0, attack.damage.bonus) } }, rng);
      break;
    }
    default:
      break; // Entaille (nick) : voir la seconde arme
  }
}
