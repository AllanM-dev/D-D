import { CLASS_ROLES, COMPANION_BY_ID, type CompanionDef, type CompanionRole } from "../data/companions";
import type { Character } from "./character";
import type { CombatantInit, CombatState } from "./combat";

/** Drapeau d'histoire posé quand un compagnon rejoint le héros. */
export const companionFlag = (id: string) => `compagnon:${id}`;
/** Valeur de `Character.companion` quand le joueur préfère voyager seul. */
export const NO_COMPANION = "aucun";
/** Identifiant de combat d'un compagnon. */
export const companionCombatId = (id: string) => `compagnon:${id}`;

/** Compagnons recrutés, dans l'ordre où ils ont rejoint le héros. */
export const recruitedCompanions = (c: Pick<Character, "story">): CompanionDef[] =>
  (c.story?.flags ?? []).filter((f) => f.startsWith("compagnon:")).map((f) => COMPANION_BY_ID[f.slice("compagnon:".length)]).filter((x): x is CompanionDef => !!x);

/** Compagnon qu'un choix d'histoire fait recruter (drapeau `compagnon:<id>` posé par le choix ou par sa réussite). */
export function recruitedBy(choice: { set?: string[]; check?: { onSuccess?: { set?: string[] } } }): CompanionDef | undefined {
  const flag = [...(choice.set ?? []), ...(choice.check?.onSuccess?.set ?? [])].find((f) => f.startsWith("compagnon:"));
  return flag ? COMPANION_BY_ID[flag.slice("compagnon:".length)] : undefined;
}

/** Compagnon qui accompagne le héros : celui qu'il a choisi, sinon le premier recruté (rien s'il voyage seul). */
export function activeCompanion(c: Pick<Character, "story" | "companion">): CompanionDef | undefined {
  if (c.companion === NO_COMPANION) return undefined;
  const recruited = recruitedCompanions(c);
  return recruited.find((x) => x.id === c.companion) ?? recruited[0];
}

/** PV maximum d'un compagnon : il gagne en robustesse au rythme du héros. */
export const companionMaxHp = (def: CompanionDef, heroLevel: number) => def.hp + (Math.max(1, heroLevel) - 1) * def.hpPerLevel;

export interface CompanionVitals {
  hp: number;
  /** Soins restants (Frère Anselme). */
  heals: number;
}

/** PV et soins restants d'un compagnon (tout au maximum tant qu'il n'a pas combattu). */
export function companionVitals(c: Pick<Character, "vitals" | "level">, def: CompanionDef): CompanionVitals {
  const max = companionMaxHp(def, c.level);
  const v = c.vitals?.companions?.[def.id];
  return { hp: Math.min(max, v?.hp ?? max), heals: Math.min(def.healing?.uses ?? 0, v?.heals ?? def.healing?.uses ?? 0) };
}

/** Le compagnon actif, prêt à combattre aux côtés du héros (rien s'il n'y en a pas). */
export function companionCombatant(c: Character): CombatantInit | undefined {
  const def = activeCompanion(c);
  if (!def) return undefined;
  const v = companionVitals(c, def);
  return {
    id: companionCombatId(def.id), name: def.name, side: "party", ally: true, tactic: def.tactic,
    maxHp: companionMaxHp(def, c.level), hp: Math.max(1, v.hp), ac: def.ac, speed: def.speed, initiativeBonus: def.initiativeBonus,
    attacks: def.attacks.map((a) => ({ ...a, damage: { ...a.damage } })), level: c.level, sprite: def.sprite, saveMods: { ...def.saveMods },
    traits: def.tactic === "archer" ? ["archer"] : undefined,
    ...(def.healing ? { healing: { ...def.healing, dice: [...def.healing.dice] as [number, number], uses: v.heals } } : {}),
    ...(def.cantrip ? { cantrip: { ...def.cantrip, dice: [...def.cantrip.dice] as [number, number] } } : {}),
  };
}

/** PV et soins du compagnon à la fin d'un combat (à 0 PV, il se relève avec 1 PV, comme le héros). */
export function companionVitalsAfterCombat(c: Character, state: CombatState): Record<string, CompanionVitals> | undefined {
  const def = activeCompanion(c);
  const fighter = def && state.combatants.find((x) => x.id === companionCombatId(def.id));
  if (!def || !fighter) return c.vitals?.companions;
  return { ...c.vitals?.companions, [def.id]: { hp: Math.max(1, fighter.hp), heals: fighter.healing?.uses ?? 0 } };
}

export interface CompanionAdvice {
  recommended: boolean;
  /** Pourquoi il complète (ou non) le personnage, en une phrase. */
  reason: string;
}

/** Pour chaque rôle : ce que dit le conseil quand la classe en manque, et quand elle l'a déjà. */
const ROLE_GAP: Record<CompanionRole, { lacks: string; gives: string; has: string; doubles: string }> = {
  melee: {
    lacks: "ne tient pas la ligne au contact", gives: "{name} se place devant vous et retient les ennemis",
    has: "se bat déjà au contact", doubles: "{name} partage les coups avec vous plutôt que de vous protéger",
  },
  heal: {
    lacks: "ne sait pas soigner", gives: "{name} vous remet sur pied au milieu du combat",
    has: "soigne déjà", doubles: "{name} double vos soins, sans rien apporter d'autre",
  },
  ranged: {
    lacks: "combat au contact", gives: "{name} abat de loin les ennemis que vous ne pouvez pas atteindre",
    has: "frappe déjà de loin", doubles: "{name} ajoute ses tirs aux vôtres",
  },
};

/** Ce compagnon complète-t-il le personnage ? D'après les rôles de sa classe et ceux du compagnon. */
export function companionAdvice(classId: string, companionId: string, className = "personnage"): CompanionAdvice {
  const def = COMPANION_BY_ID[companionId];
  if (!def) throw new Error(`Compagnon inconnu : ${companionId}`);
  const has = new Set(CLASS_ROLES[classId] ?? []);
  const gap = def.roles.find((r) => !has.has(r));
  const who = `Votre ${className.toLowerCase()}`;
  const name = (t: string) => t.replace("{name}", def.name);
  if (gap) return { recommended: true, reason: `${who} ${ROLE_GAP[gap].lacks} : ${name(ROLE_GAP[gap].gives)}.` };
  const r = ROLE_GAP[def.roles[0]];
  return { recommended: false, reason: `${who} ${r.has} : ${name(r.doubles)}.` };
}
