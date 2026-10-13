import { BACKGROUNDS, type BackgroundDef } from "../data/backgrounds";
import { CLASSES, type ClassDef } from "../data/classes";
import { SKILLS, type SkillId } from "../data/skills";
import { SPECIES, type SpeciesDef } from "../data/species";
import {
  POINT_BUY_BUDGET, POINT_BUY_MAX, POINT_BUY_MIN, pointBuyTotal, usesPoolExactly, STANDARD_ARRAY,
  type AbilityScores, type ScoreMethod,
} from "./abilities";
import type { AttackDef } from "./combat";
import { computeEquipment, getKit, type CharacterEquipment } from "./equipment";
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
}

export interface SkillEntry {
  id: SkillId;
  name: string;
  ability: Ability;
  proficient: boolean;
  bonus: number;
}

export interface Character {
  id: string;
  name: string;
  level: 1;
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
}

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

  const proficientSkills = new Set<SkillId>([...background.skills, ...d.classSkills]);
  const skills: SkillEntry[] = SKILLS.map((s) => {
    const proficient = proficientSkills.has(s.id);
    return { id: s.id, name: s.name, ability: s.ability, proficient, bonus: modifiers[s.ability] + (proficient ? prof : 0) };
  });
  const saves = Object.fromEntries(
    ABILITIES.map((a) => {
      const proficient = classDef.savingThrows.includes(a);
      return [a, { proficient, bonus: modifiers[a] + (proficient ? prof : 0) }];
    }),
  ) as Character["saves"];

  const eq = computeEquipment(
    { classId: classDef.id, scores, modifiers, proficiencyBonus: prof, baseSpeed: species.speed },
    d.kitId,
  );

  return {
    id, name: d.name.trim(), level: 1, species, classDef, background, scores, modifiers,
    proficiencyBonus: prof,
    maxHp: Math.max(1, classDef.hitDie + modifiers.CON), // niveau 1 : dé de vie max + mod. CON
    armorClass: eq.armorClass,
    initiative: modifiers.DEX,
    speed: eq.speed,
    equipment: eq.equipment,
    attacks: eq.attacks,
    passivePerception: 10 + skills.find((s) => s.id === "perception")!.bonus,
    saves, skills, originFeat: background.originFeat,
  };
}
