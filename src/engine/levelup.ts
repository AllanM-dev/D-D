import { INVOCATIONS } from "../data/class-choices";
import { ENCOUNTERS } from "../data/encounters";
import { FIGHTING_STYLES, isFightingStyle, type FightingStyleId } from "../data/fighting-styles";
import { MAX_LEVEL, RETRO_FLAG_XP, xpForNext } from "../data/levels";
import { MAPS } from "../data/maps";
import { MONSTERS } from "../data/monsters";
import type { SkillId } from "../data/skills";
import { CLASS_SPELLCASTING, spellCountsFor, spellsFor } from "../data/spells";
import { invocationsOf, type Character } from "./character";
import { featuresFor } from "./features";
import { hpGainFor, recompute } from "./derive";
import { vitalsOf, type Vitals } from "./rest";

export { hpGainFor };

export const xpOf = (c: Pick<Character, "xp">) => c.xp ?? 0;

/** Le personnage a assez d'expérience pour le niveau suivant (et ce niveau est jouable). */
export function canLevelUp(c: Pick<Character, "xp" | "level">): boolean {
  const next = xpForNext(c.level);
  return next !== undefined && xpOf(c) >= next && c.level < MAX_LEVEL;
}

/** Ajoute de l'expérience (le niveau ne change qu'avec `levelUp`). */
export const addXp = (c: Character, amount: number): Character => (amount > 0 ? { ...c, xp: xpOf(c) + amount } : c);

/** Expérience que valent les ennemis d'une carte, par identifiant (rencontre → monstres). */
const enemyXp = (() => {
  const out: Record<string, number> = {};
  for (const m of MAPS) {
    for (const e of m.enemies) {
      const enc = ENCOUNTERS.find((x) => x.id === e.encounterId);
      out[e.id] = (enc?.monsters ?? []).reduce((sum, { monsterId, count }) => sum + count * (MONSTERS.find((mo) => mo.id === monsterId)?.xp ?? 0), 0);
    }
  }
  return out;
})();

/** Expérience déjà méritée par un personnage sauvegardé avant l'expérience : ennemis vaincus et étapes de l'histoire. */
export function retroXp(c: Pick<Character, "exploration" | "story">): number {
  const fromEnemies = (c.exploration?.defeated ?? []).reduce((sum, id) => sum + (enemyXp[id] ?? 0), 0);
  const fromStory = (c.story?.flags ?? []).reduce((sum, flag) => sum + (RETRO_FLAG_XP[flag] ?? 0), 0);
  return fromEnemies + fromStory;
}

/** Les anciens personnages reçoivent l'expérience qu'ils ont déjà gagnée. */
export const migrateXp = <T extends Character>(c: T): T => (c.xp === undefined ? { ...c, xp: retroXp(c) } : c);

// ------------------------------------------------------------------ choix du passage de niveau

export interface LevelUpChoices {
  expertise?: SkillId[];
  fightingStyle?: FightingStyleId;
  /** Sorts de niveau 1 préparés en plus. */
  spells?: string[];
}

export interface LevelUpNeeds {
  expertise?: { count: number; from: SkillId[]; label: string };
  fightingStyle?: readonly FightingStyleId[];
  spells?: { count: number; from: string[] };
}

const SCHOLAR_SKILLS: SkillId[] = ["arcana", "history", "investigation", "medicine", "nature", "religion"];

/** Ce que le joueur doit choisir pour passer au niveau suivant. */
export function levelUpNeeds(c: Character): LevelUpNeeds {
  const needs: LevelUpNeeds = {};
  const trained = c.skills.filter((s) => s.proficient && !s.expert).map((s) => s.id);
  const id = c.classDef.id;
  if (id === "bard") needs.expertise = { count: 2, from: trained, label: "Expertise" };
  if (id === "ranger") needs.expertise = { count: 1, from: trained, label: "Explorateur expert" };
  if (id === "wizard") needs.expertise = { count: 1, from: trained.filter((s) => SCHOLAR_SKILLS.includes(s)), label: "Érudit" };
  if (id === "paladin" || id === "ranger") needs.fightingStyle = FIGHTING_STYLES.map((s) => s.id);
  const cfg = CLASS_SPELLCASTING[id];
  if (cfg) {
    const gain = spellCountsFor(id, c.level + 1).prepared - spellCountsFor(id, c.level).prepared;
    const have = new Set([...(c.spells?.prepared ?? []), ...(cfg.alwaysPrepared ?? []), ...(id === "paladin" ? ["divine-smite"] : [])]);
    const from = spellsFor(id, 1).map((s) => s.id).filter((s) => !have.has(s));
    if (gain > 0 && from.length) needs.spells = { count: Math.min(gain, from.length), from };
  }
  return needs;
}

export function validateLevelUp(c: Character, choices: LevelUpChoices): string[] {
  const errors: string[] = [];
  if (!canLevelUp(c)) return ["Pas assez d'expérience pour monter de niveau."];
  const needs = levelUpNeeds(c);
  const pick = choices.expertise ?? [];
  if (needs.expertise) {
    if (new Set(pick).size !== pick.length || pick.length !== needs.expertise.count) errors.push(`Choisissez ${needs.expertise.count} compétence${needs.expertise.count > 1 ? "s" : ""} pour ${needs.expertise.label}.`);
    else if (pick.some((s) => !needs.expertise!.from.includes(s))) errors.push(`${needs.expertise.label} : compétence non valide.`);
  } else if (pick.length) errors.push("Pas d'expertise à choisir pour cette classe.");
  if (needs.fightingStyle && !(isFightingStyle(choices.fightingStyle) && needs.fightingStyle.includes(choices.fightingStyle))) errors.push("Choisissez un style de combat.");
  const spells = choices.spells ?? [];
  if (needs.spells) {
    if (new Set(spells).size !== spells.length || spells.length !== needs.spells.count) errors.push(`Choisissez ${needs.spells.count} sort${needs.spells.count > 1 ? "s" : ""} de niveau 1.`);
    else if (spells.some((s) => !needs.spells!.from.includes(s))) errors.push("Un des sorts choisis n'est pas disponible.");
  } else if (spells.length) errors.push("Pas de sort à choisir pour cette classe.");
  return errors;
}

export interface LevelUpResult {
  character: Character;
  hpGain: number;
}

/** Passe au niveau suivant : PV, dés de vie, capacités, sorts et choix du joueur. Lève une erreur si les choix sont invalides. */
export function levelUp(c: Character, choices: LevelUpChoices = {}): LevelUpResult {
  const errors = validateLevelUp(c, choices);
  if (errors.length) throw new Error(errors.join(" "));
  const before = vitalsOf(c);
  const hpGain = hpGainFor(c);
  const next = c.level + 1;
  const id = c.classDef.id;
  // Les choix du niveau : expertise, style de combat (paladin, rôdeur), invocations (occultiste), sorts préparés.
  const chosen: Character = { ...c, level: next };
  if (choices.expertise?.length) chosen.expertise = [...(c.expertise ?? []), ...choices.expertise];
  if (choices.fightingStyle) chosen.fightingStyle = choices.fightingStyle;
  if (id === "warlock") chosen.invocations = [...new Set([...invocationsOf(c), ...INVOCATIONS.map((i) => i.id)])];
  if (choices.spells?.length && c.spells) chosen.spells = { cantrips: [...c.spells.cantrips], prepared: [...c.spells.prepared, ...choices.spells] };
  // PV, maîtrise, compétences (Touche-à-tout), initiative, CA, vitesse et attaques en découlent.
  const out = recompute(chosen);
  // Ressources : les nouvelles capacités arrivent pleines, les réserves qui grandissent gagnent la différence.
  const old = new Map(featuresFor(id, c.level, c.modifiers).map((f) => [f.id, f.max]));
  const features: Vitals["features"] = { ...before.features };
  for (const f of featuresFor(id, next, out.modifiers)) {
    if (f.unlimited) continue;
    const had = old.get(f.id);
    features[f.id] = had === undefined ? f.max : (before.features[f.id] ?? had) + (f.max - had);
  }
  const free = { ...before.free };
  if (id === "paladin" && free["divine-smite"] === undefined) free["divine-smite"] = 1;
  out.vitals = { ...before, hp: Math.min(out.maxHp, before.hp + hpGain), hitDice: before.hitDice + 1, features, free };
  return { character: out, hpGain };
}

