import { rollDie, type Rng } from "../dice";
import { CELL_METERS } from "../exploration";
import { resolveAttack } from "./attack";
import { attackCheck, fm, movementLeft } from "./geometry";
import { FEATURE_LABELS } from "./labels";
import { EFFECT_ROUNDS, enemyTarget, healCombatant, isConscious, pushRoll } from "./state";
import type { AttackDef, Combatant, CombatState, FeatureChoice, FeatureId, FeatureOption, FeatureOptionId, FeatureUse } from "./types";

/**
 * Capacités utilisables en combat (surtout des actions bonus) : chaque option dit dans une seule fiche
 * quand elle est proposée (`offer`) et ce qu'elle fait (`use`). Ajouter une capacité, c'est ajouter une fiche.
 */
interface OfferContext {
  state: CombatState;
  c: Combatant;
  /** Ressource de la capacité requise (`needs`), si elle en a une. */
  f: FeatureUse;
  /** PV qui manquent au combattant. */
  missing: number;
  enemiesAlive: boolean;
}

interface UseContext {
  state: CombatState;
  c: Combatant;
  f: FeatureUse;
  rng: Rng;
  choice: FeatureChoice;
  /** L'option telle qu'elle a été proposée (maximum de l'imposition des mains…). */
  option: FeatureOption;
}

interface BonusDef {
  id: FeatureOptionId;
  /** Capacité que le combattant doit avoir (absente : l'option ne dépend d'aucune capacité, comme la seconde arme). */
  needs?: FeatureId;
  /** L'option coûte l'action bonus (par défaut oui) ; une option gratuite reste proposée quand l'action bonus est prise. */
  costsBonus?: (c: Combatant) => boolean;
  /** Précision affichée, ou `null` si l'option n'est pas utilisable maintenant. */
  offer(ctx: OfferContext): Omit<FeatureOption, "id" | "label"> | null;
  use(ctx: UseContext): void;
}

const NO_FEATURE: FeatureUse = { id: "potion", uses: 0, max: 0 };
const left = (f: FeatureUse) => !!f.unlimited || f.uses > 0;
const hasUnarmed = (c: Combatant) => c.attacks.some((a) => a.unarmed);
const unarmedStrike = (c: Combatant) => c.attacks.find((a) => a.unarmed)!;
const pointsLeft = (n: number) => `${n} restant${n > 1 ? "s" : ""}`;

/** Attaque d'une capacité (frappe bonus, seconde arme…) : la cible doit être à portée. */
function strikeTarget(state: CombatState, c: Combatant, strike: AttackDef, choice: FeatureChoice): Combatant {
  const target = enemyTarget(state, choice.targetId ?? "");
  const check = attackCheck(state, c, target, strike);
  if (!check.ok) throw new Error(check.reason);
  return target;
}

/** Soin d'une capacité ou d'une potion, avec son jet de dés. */
function healRoll(state: CombatState, c: Combatant, title: string, sides: number, dice: number[], modifier: number) {
  const healed = healCombatant(state, c, dice.reduce((a, b) => a + b, modifier));
  pushRoll(state, { kind: "heal", actorId: c.id, actorName: c.name, side: c.side, title, sides, dice, modifier, total: healed, outcome: "success" });
}

/** Dans l'ordre où elles sont proposées au joueur. */
const BONUS_OPTIONS: BonusDef[] = [
  {
    id: "second-wind", needs: "second-wind",
    offer: ({ f, missing }) => (left(f) && missing > 0 ? { detail: `${f.uses}/${f.max} · 1d10 + niveau PV` } : null),
    use: ({ state, c, f, rng }) => {
      const die = rollDie(10, rng);
      f.uses -= 1;
      state.log.push(`${c.name} reprend son souffle (1d10 + ${c.level} = ${die + c.level}).`);
      healRoll(state, c, `Second souffle de ${c.name}`, 10, [die], c.level);
    },
  },
  {
    id: "lay-on-hands", needs: "lay-on-hands",
    offer: ({ f, missing }) => (left(f) && missing > 0 ? { detail: `réserve ${f.uses}/${f.max} PV`, amountMax: Math.min(f.uses, missing) } : null),
    use: ({ state, c, f, choice, option }) => {
      const amount = choice.amount ?? 0;
      if (!Number.isInteger(amount) || amount < 1 || amount > (option.amountMax ?? 0)) throw new Error("Quantité de soins invalide.");
      f.uses -= amount;
      healCombatant(state, c, amount);
    },
  },
  {
    id: "potion", needs: "potion",
    offer: ({ f, missing }) => (left(f) && missing > 0 ? { detail: `${f.uses} dans le sac · 2d4 + 2 PV` } : null),
    use: ({ state, c, f, rng }) => {
      const dice = [rollDie(4, rng), rollDie(4, rng)];
      f.uses -= 1;
      f.max -= 1;
      state.log.push(`${c.name} boit une potion de soin (2d4 + 2 = ${dice[0] + dice[1] + 2}).`);
      healRoll(state, c, `Potion de soin de ${c.name}`, 4, dice, 2);
    },
  },
  {
    id: "bardic-inspiration", needs: "bardic-inspiration",
    offer: ({ c, f }) => (left(f) && !c.inspiration ? { detail: `${f.uses}/${f.max} · dé d'inspiration d6` } : null),
    use: ({ state, c, f }) => {
      f.uses -= 1;
      c.inspiration = 6;
      state.log.push(`${c.name} se donne un dé d'inspiration bardique (d6) : il sera ajouté à un jet d'attaque ou de sauvegarde raté.`);
    },
  },
  {
    id: "rage", needs: "rage",
    offer: ({ c, f }) => (left(f) && !c.raging ? { detail: `${f.uses}/${f.max}` } : null),
    use: ({ state, c, f }) => {
      f.uses -= 1;
      c.raging = true;
      c.ragingUntilRound = state.round + EFFECT_ROUNDS - 1;
      state.log.push(`${c.name} entre en rage !`);
    },
  },
  {
    id: "innate-sorcery", needs: "innate-sorcery",
    offer: ({ c, f }) => (left(f) && !c.innateSorcery ? { detail: `${f.uses}/${f.max}` } : null),
    use: ({ state, c, f }) => {
      f.uses -= 1;
      c.innateSorcery = true;
      c.innateUntilRound = state.round + EFFECT_ROUNDS - 1;
      state.log.push(`${c.name} libère sa magie innée.`);
    },
  },
  {
    id: "martial-arts", needs: "martial-arts",
    offer: ({ c, enemiesAlive }) => (c.turnState.attacked && enemiesAlive && hasUnarmed(c) ? { detail: "après l'action Attaquer", needsTarget: true } : null),
    use: ({ state, c, rng, choice }) => {
      const strike = unarmedStrike(c);
      resolveAttack(state, c, enemyTarget(state, choice.targetId ?? ""), strike, rng);
    },
  },
  {
    // Fougue : une action de plus ce tour, quand la première est dépensée. Ne coûte pas l'action bonus.
    id: "action-surge", needs: "action-surge", costsBonus: () => false,
    offer: ({ c, f }) => (left(f) && c.turnState.action && !c.turnState.surged ? { detail: `${f.uses}/${f.max} · une action de plus` } : null),
    use: ({ state, c, f }) => {
      f.uses -= 1;
      c.turnState.action = false;
      c.turnState.surged = true;
      state.log.push(`${c.name} puise dans ses réserves : une action de plus ce tour (Fougue).`);
    },
  },
  {
    // Attaque téméraire : décidée avant la première attaque du tour, sans coûter d'action.
    id: "reckless", needs: "reckless", costsBonus: () => false,
    offer: ({ c }) => (!c.turnState.action && !c.turnState.attacked && !c.reckless ? { detail: "avantage à vos attaques de Force, et aux attaques contre vous" } : null),
    use: ({ state, c }) => {
      c.reckless = true;
      state.log.push(`${c.name} attaque sans se protéger : avantage à ses attaques de Force au corps à corps, mais aussi aux attaques contre lui jusqu'à son prochain tour.`);
    },
  },
  {
    id: "cunning-dash", needs: "cunning-action",
    offer: ({ c }) => (!c.turnState.dashed ? { detail: "action bonus" } : null),
    use: ({ state, c }) => {
      c.turnState.dashed = true;
      state.log.push(`${c.name} fonce (Action ruse) : déplacement doublé (${fm(movementLeft(c, state) * CELL_METERS)} m possibles).`);
    },
  },
  {
    id: "cunning-disengage", needs: "cunning-action",
    offer: ({ c }) => (!c.turnState.disengaged ? { detail: "action bonus" } : null),
    use: ({ state, c }) => {
      c.turnState.disengaged = true;
      state.log.push(`${c.name} se désengage (Action ruse) : aucune attaque d'opportunité ce tour.`);
    },
  },
  {
    // Concentration du moine : un point pour chaque usage.
    id: "flurry", needs: "focus",
    offer: ({ c, f, enemiesAlive }) => (f.uses > 0 && c.turnState.attacked && enemiesAlive && hasUnarmed(c)
      ? { detail: `1 point (${pointsLeft(f.uses)}) · deux frappes à mains nues`, needsTarget: true } : null),
    use: ({ state, c, f, rng, choice }) => {
      const strike = unarmedStrike(c);
      const target = strikeTarget(state, c, strike, choice);
      f.uses -= 1;
      state.log.push(`${c.name} se lance dans un déluge de coups !`);
      resolveAttack(state, c, target, strike, rng);
      if (!target.dead && state.status === "ongoing") resolveAttack(state, c, target, strike, rng);
    },
  },
  {
    id: "patient-defense", needs: "focus",
    offer: ({ c, f }) => (f.uses > 0 && !c.dodging ? { detail: `1 point (${pointsLeft(f.uses)}) · esquive` } : null),
    use: ({ state, c, f }) => {
      f.uses -= 1;
      c.dodging = true;
      state.log.push(`${c.name} adopte la Défense patiente : désavantage aux attaques contre lui jusqu'à son prochain tour.`);
    },
  },
  {
    id: "step-of-wind", needs: "focus",
    offer: ({ c, f }) => (f.uses > 0 && (!c.turnState.dashed || !c.turnState.disengaged) ? { detail: `1 point (${pointsLeft(f.uses)}) · foncer et se désengager` } : null),
    use: ({ state, c, f }) => {
      f.uses -= 1;
      c.turnState.dashed = true;
      c.turnState.disengaged = true;
      state.log.push(`${c.name} file comme le vent : il fonce et se désengage (${fm(movementLeft(c, state) * CELL_METERS)} m possibles).`);
    },
  },
  {
    // Source de magie de l'ensorceleur : convertir des points de sorcellerie et des emplacements de sort.
    id: "font-slot", needs: "sorcery-points",
    offer: ({ c, f }) => (c.spellcasting && f.uses >= 2 && c.spellcasting.slots.used > 0 ? { detail: `2 points (${f.uses}/${f.max}) → 1 emplacement de niveau 1` } : null),
    use: ({ state, c, f }) => {
      f.uses -= 2;
      c.spellcasting!.slots.used -= 1;
      state.log.push(`${c.name} transforme 2 points de sorcellerie en un emplacement de sort de niveau 1.`);
    },
  },
  {
    id: "font-points", needs: "sorcery-points",
    offer: ({ c, f }) => (c.spellcasting && f.uses < f.max && c.spellcasting.slots.used < c.spellcasting.slots.max ? { detail: `1 emplacement de niveau 1 → 1 point (${f.uses}/${f.max})` } : null),
    use: ({ state, c, f }) => {
      f.uses += 1;
      c.spellcasting!.slots.used += 1;
      state.log.push(`${c.name} convertit un emplacement de sort de niveau 1 en 1 point de sorcellerie.`);
    },
  },
  {
    // Combat à deux armes : après une attaque avec une arme légère, une attaque avec une seconde arme légère.
    // Avec l'Entaille (maîtrise), elle ne coûte pas l'action bonus.
    id: "offhand", costsBonus: (c) => !c.turnState.offhandFree,
    offer: ({ c, enemiesAlive }) => (c.turnState.offhand && enemiesAlive ? { detail: `${c.turnState.offhand.name}, sans modificateur aux dégâts`, needsTarget: true } : null),
    use: ({ state, c, rng, choice }) => {
      const off = c.turnState.offhand!;
      const strike: AttackDef = { name: off.name, toHit: off.toHit, damage: off.damage, damageType: off.damageType, ranged: false, ability: off.ability, light: true };
      const target = strikeTarget(state, c, strike, choice);
      c.turnState.offhand = undefined;
      c.turnState.offhandFree = false;
      resolveAttack(state, c, target, strike, rng);
    },
  },
];

/** Options qui ont une fiche (les tests vérifient que chaque option nommée en a une). */
export const BONUS_OPTION_IDS: readonly FeatureOptionId[] = BONUS_OPTIONS.map((d) => d.id);
const BONUS_BY_ID = new Map(BONUS_OPTIONS.map((d) => [d.id, d]));
const costsBonus = (d: BonusDef, c: Combatant) => d.costsBonus?.(c) ?? true;
const resourceOf = (d: BonusDef, c: Combatant): FeatureUse | undefined => (d.needs ? c.features.find((f) => f.id === d.needs) : NO_FEATURE);

/** Options utilisables par ce combattant maintenant. Celles qui coûtent l'action bonus disparaissent quand elle est prise. */
export function availableBonus(state: CombatState, c: Combatant): FeatureOption[] {
  if (c.side !== "party" || !isConscious(c)) return [];
  const missing = c.maxHp - c.hp;
  const enemiesAlive = state.combatants.some((x) => x.side === "enemies" && !x.dead);
  const out: FeatureOption[] = [];
  for (const d of BONUS_OPTIONS) {
    const f = resourceOf(d, c);
    if (!f || (c.turnState.bonus && costsBonus(d, c))) continue;
    const offered = d.offer({ state, c, f, missing, enemiesAlive });
    if (offered) out.push({ id: d.id, label: FEATURE_LABELS[d.id], ...offered });
  }
  return out;
}

/** Applique une option déjà vérifiée par `availableBonus`, et dépense l'action bonus si elle en coûte une. */
export function applyBonusOption(state: CombatState, c: Combatant, option: FeatureOption, rng: Rng, choice: FeatureChoice) {
  const d = BONUS_BY_ID.get(option.id)!;
  const costs = costsBonus(d, c); // avant l'effet : la seconde arme oublie l'Entaille en servant
  d.use({ state, c, f: resourceOf(d, c)!, rng, choice, option });
  if (costs) c.turnState.bonus = true;
}
