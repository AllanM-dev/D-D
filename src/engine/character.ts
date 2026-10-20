import { BACKGROUNDS, type BackgroundDef } from "../data/backgrounds";
import { CLASSES, type ClassDef } from "../data/classes";
import { SKILLS, type SkillId } from "../data/skills";
import { SPECIES, type SpeciesDef } from "../data/species";
import {
  POINT_BUY_BUDGET, POINT_BUY_MAX, POINT_BUY_MIN, pointBuyTotal, usesPoolExactly, STANDARD_ARRAY,
  type AbilityScores, type ScoreMethod,
} from "./abilities";
import { isFightingStyle, type FightingStyleId } from "../data/fighting-styles";
import { CLASS_SPELLCASTING, defaultSpells, spellsFor } from "../data/spells";
import type { AttackDef } from "./combat";
import type { ExplorationState } from "./exploration";
import type { StoryProgress } from "./story";
import type { Vitals } from "./rest";
import { computeEquipment, defaultMasteries, getKit, type CharacterEquipment } from "./equipment";
import { EXPERTISE_COUNT, hasExtraCantrip, isInvocation, isOrder } from "../data/class-choices";
import { recompute } from "./derive";
import { ABILITIES, abilityModifier, proficiencyBonus, type Ability } from "./rules";

/** Bonus de caractéristiques de l'historique (règles 2024). */
export type BackgroundBonus =
  | { mode: "2/1"; plus2: Ability; plus1: Ability }
  | { mode: "1/1/1" };

export interface CharacterDraft {
  name: string;
  speciesId: string;
  classId: string;
  backgroundId: string;
  method: ScoreMethod;
  /** Scores avant bonus d'historique. */
  baseScores: AbilityScores;
  /** Pool tiré (méthode "roll") ; ignoré sinon. */
  rolledPool?: number[];
  bonus: BackgroundBonus;
  classSkills: SkillId[];
  /** Lot d'équipement de départ (le premier de la classe par défaut). */
  kitId?: string;
  /** Style de combat (guerrier). */
  fightingStyle?: FightingStyleId;
  /** Sorts choisis (classes qui lancent des sorts). */
  spells?: SpellChoice;
  /** Ordre divin (clerc) ou primordial (druide). */
  order?: string;
  /** Invocation occulte (occultiste). */
  invocation?: string;
  /** Compétences en expertise (roublard). */
  expertise?: SkillId[];
}

export interface SpellChoice {
  /** Sorts mineurs connus. */
  cantrips: string[];
  /** Sorts de niveau 1 préparés (hors sorts toujours préparés). */
  prepared: string[];
}

export interface SkillEntry {
  id: SkillId;
  name: string;
  ability: Ability;
  proficient: boolean;
  bonus: number;
  /** Expertise : bonus de maîtrise doublé. */
  expert?: boolean;
}

export interface Character {
  id: string;
  name: string;
  level: number;
  species: SpeciesDef;
  classDef: ClassDef;
  background: BackgroundDef;
  scores: AbilityScores;
  modifiers: AbilityScores;
  proficiencyBonus: number;
  maxHp: number;
  armorClass: number;
  initiative: number;
  speed: number;
  passivePerception: number;
  saves: Record<Ability, { proficient: boolean; bonus: number }>;
  skills: SkillEntry[];
  originFeat: string;
  equipment: CharacterEquipment;
  /** Attaques disponibles en combat, la meilleure en premier. */
  attacks: AttackDef[];
  fightingStyle?: FightingStyleId;
  spells?: SpellChoice;
  order?: string;
  /** Première invocation occulte (anciennes sauvegardes) ; voir `invocationsOf`. */
  invocation?: string;
  /** Toutes les invocations occultes connues. */
  invocations?: string[];
  expertise?: SkillId[];
  /** Expérience (voir `levels.ts`) ; absent = pas encore comptée. */
  xp?: number;
  /** PV et ressources actuels (voir `rest.ts`) ; absent = tout au maximum. */
  vitals?: Vitals;
  /** Position et exploration sur la carte (voir `exploration.ts`) ; absent = jamais exploré. */
  exploration?: ExplorationState;
  /** Drapeaux de l'histoire (voir `story.ts`). */
  story?: StoryProgress;
  /** Objets du sac à dos : identifiant → quantité (voir `inventory.ts`). */
  inventory?: Record<string, number>;
  /** Armes dont la maîtrise est active (identifiants d'armes) ; absent = choix par défaut d'après l'équipement. */
  masteries?: string[];
  /** Compagnon choisi parmi ceux recrutés (`aucun` : voyager seul) ; absent = le premier recruté (voir `companions.ts`). */
  companion?: string;
}

const ORDERS_BY_CLASS = new Set(["cleric", "druid"]);

const find = <T extends { id: string }>(list: readonly T[], id: string) => list.find((x) => x.id === id);

export function applyBackgroundBonus(base: AbilityScores, bg: BackgroundDef, bonus: BackgroundBonus): AbilityScores {
  const out = { ...base };
  if (bonus.mode === "2/1") {
    out[bonus.plus2] += 2;
    out[bonus.plus1] += 1;
  } else {
    for (const a of bg.abilityOptions) out[a] += 1;
  }
  return out;
}

/** Renvoie la liste des erreurs de règles ; vide si le brouillon est valide. */
export function validateDraft(d: CharacterDraft): string[] {
  const errors: string[] = [];
  if (!d.name.trim()) errors.push("Le personnage doit avoir un nom.");
  const cls = find(CLASSES, d.classId);
  const bg = find(BACKGROUNDS, d.backgroundId);
  if (!find(SPECIES, d.speciesId)) errors.push("Choisissez une espèce.");
  if (!cls) errors.push("Choisissez une classe.");
  if (!bg) errors.push("Choisissez un historique.");

  if (d.method === "standard" && !usesPoolExactly(d.baseScores, STANDARD_ARRAY)) {
    errors.push("Utilisez chaque valeur du tableau standard (15, 14, 13, 12, 10, 8) une seule fois.");
  } else if (d.method === "pointbuy") {
    const inRange = ABILITIES.every((a) => d.baseScores[a] >= POINT_BUY_MIN && d.baseScores[a] <= POINT_BUY_MAX);
    if (!inRange) errors.push(`Chaque score doit être entre ${POINT_BUY_MIN} et ${POINT_BUY_MAX}.`);
    else if (pointBuyTotal(d.baseScores) > POINT_BUY_BUDGET) errors.push(`Maximum ${POINT_BUY_BUDGET} points à dépenser.`);
  } else if (d.method === "roll" && !(d.rolledPool && usesPoolExactly(d.baseScores, d.rolledPool))) {
    errors.push("Répartissez les six valeurs tirées, chacune une seule fois.");
  }

  if (bg && d.bonus.mode === "2/1") {
    const { plus2, plus1 } = d.bonus;
    if (!bg.abilityOptions.includes(plus2) || !bg.abilityOptions.includes(plus1) || plus2 === plus1)
      errors.push("Le bonus d'historique doit viser deux caractéristiques différentes proposées par l'historique.");
  }

  if (cls?.id === "fighter" && !isFightingStyle(d.fightingStyle)) errors.push("Choisissez un style de combat.");

  if (cls && ORDERS_BY_CLASS.has(cls.id) && !isOrder(cls.id, d.order)) errors.push(cls.id === "cleric" ? "Choisissez un Ordre divin." : "Choisissez un Ordre primordial.");
  if (cls?.id === "warlock" && !isInvocation(d.invocation)) errors.push("Choisissez une invocation occulte.");
  const expertiseCount = cls ? EXPERTISE_COUNT[cls.id] ?? 0 : 0;
  if (cls && bg && expertiseCount) {
    const own = new Set<SkillId>([...bg.skills, ...d.classSkills]);
    const picked = new Set(d.expertise ?? []);
    if (picked.size !== (d.expertise ?? []).length || picked.size !== expertiseCount) errors.push(`Choisissez ${expertiseCount} compétences pour l'expertise.`);
    else if ((d.expertise ?? []).some((s) => !own.has(s))) errors.push("L'expertise porte sur des compétences que vous maîtrisez.");
  }

  const casting = cls ? CLASS_SPELLCASTING[cls.id] : undefined;
  if (cls && casting) {
    for (const [level, count, label, chosen] of [
      [0, casting.cantrips + (hasExtraCantrip(d.order) ? 1 : 0), "sorts mineurs", d.spells?.cantrips ?? []],
      [1, casting.prepared, "sorts de niveau 1", d.spells?.prepared ?? []],
    ] as const) {
      const allowed = new Set(spellsFor(cls.id, level).map((x) => x.id));
      if (new Set(chosen).size !== chosen.length || chosen.length !== count) errors.push(`Choisissez ${count} ${label}.`);
      else if (chosen.some((id) => !allowed.has(id))) errors.push(`Un des ${label} choisis n'est pas disponible pour cette classe.`);
    }
  }

  if (cls && d.kitId) {
    try {
      getKit(cls.id, d.kitId);
    } catch {
      errors.push("Ce lot d'équipement n'existe pas pour cette classe.");
    }
  }

  if (cls && bg) {
    const picked = new Set(d.classSkills);
    if (picked.size !== d.classSkills.length || picked.size !== cls.skillChoices.count)
      errors.push(`Choisissez ${cls.skillChoices.count} compétences de classe.`);
    else if (d.classSkills.some((s) => !cls.skillChoices.from.includes(s)))
      errors.push("Une compétence choisie n'est pas disponible pour cette classe.");
    else if (d.classSkills.some((s) => bg.skills.includes(s)))
      errors.push("Une compétence choisie est déjà donnée par l'historique.");
  }
  return errors;
}

export function buildCharacter(d: CharacterDraft, id: string): Character {
  const errors = validateDraft(d);
  if (errors.length) throw new Error(errors.join(" "));
  const species = find(SPECIES, d.speciesId)!;
  const classDef = find(CLASSES, d.classId)!;
  const background = find(BACKGROUNDS, d.backgroundId)!;

  const scores = applyBackgroundBonus(d.baseScores, background, d.bonus);
  for (const a of ABILITIES) scores[a] = Math.min(20, scores[a]);
  const modifiers = Object.fromEntries(ABILITIES.map((a) => [a, abilityModifier(scores[a])])) as AbilityScores;
  const prof = proficiencyBonus(1);

  // Les choix du joueur ; les valeurs calculées (bonus, CA, PV, attaques…) sont remplies par `recompute`.
  const proficientSkills = new Set<SkillId>([...background.skills, ...d.classSkills]);
  const expertise = EXPERTISE_COUNT[classDef.id] ? [...(d.expertise ?? [])] : [];
  const skills: SkillEntry[] = SKILLS.map((s) => ({ id: s.id, name: s.name, ability: s.ability, proficient: proficientSkills.has(s.id), bonus: 0 }));
  const kit = getKit(classDef.id, d.kitId);
  const order = ORDERS_BY_CLASS.has(classDef.id) ? d.order : undefined;
  const masteries = defaultMasteries(classDef.id, kit.entries.flatMap((e) => ("weapon" in e ? [e.weapon] : [])), order);
  const fightingStyle = classDef.id === "fighter" ? d.fightingStyle : undefined;
  const invocations = classDef.id === "warlock" && d.invocation ? [d.invocation] : undefined;
  const eq = computeEquipment(
    { classId: classDef.id, scores, modifiers, proficiencyBonus: prof, baseSpeed: species.speed, fightingStyle, masteries, order, invocations },
    d.kitId,
  );

  return recompute({
    id, name: d.name.trim(), level: 1, species, classDef, background, scores, modifiers,
    proficiencyBonus: prof, maxHp: 0, armorClass: 0, initiative: 0, speed: 0, passivePerception: 0,
    saves: {} as Character["saves"], skills, originFeat: background.originFeat,
    masteries: masteries.length ? masteries : undefined,
    equipment: eq.equipment,
    attacks: [],
    fightingStyle,
    order,
    invocation: classDef.id === "warlock" ? d.invocation : undefined,
    invocations,
    xp: 0,
    expertise: expertise.length ? expertise : undefined,
    spells: CLASS_SPELLCASTING[classDef.id] && d.spells ? { cantrips: [...d.spells.cantrips], prepared: [...d.spells.prepared] } : undefined,
  });
}

/**
 * Personnages sauvegardés avant les sorts : les lanceurs de sorts reçoivent des sorts par défaut, et les anciens
 * « sorts mineurs d'attaque » enregistrés comme des armes sont retirés (ils se lancent maintenant comme des sorts).
 */
export function migrateSpells<T extends { classDef: { id: string }; spells?: SpellChoice; attacks?: AttackDef[] }>(c: T): T {
  let out = c;
  if (out.attacks?.some((a) => a.spell || a.name === "Trait de feu" || a.name === "Décharge occulte")) {
    out = { ...out, attacks: out.attacks.filter((a) => !a.spell && a.name !== "Trait de feu" && a.name !== "Décharge occulte") };
  }
  if (CLASS_SPELLCASTING[out.classDef.id] && !out.spells) out = { ...out, spells: defaultSpells(out.classDef.id) };
  return out;
}

/** Invocations occultes connues d'un personnage (les anciennes sauvegardes n'en ont qu'une, dans `invocation`). */
export const invocationsOf = (c: Pick<Character, "invocation" | "invocations">): string[] => c.invocations ?? (c.invocation ? [c.invocation] : []);
