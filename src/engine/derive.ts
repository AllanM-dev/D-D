import { BACKGROUNDS } from "../data/backgrounds";
import { ORDER_SKILLS, hasExtraCantrip } from "../data/class-choices";
import { CLASSES } from "../data/classes";
import { SKILLS } from "../data/skills";
import { SPECIES } from "../data/species";
import type { AbilityScores } from "./abilities";
import type { Character, SkillEntry } from "./character";
import { refreshStats } from "./loadout";
import { ABILITIES, abilityModifier, proficiencyBonus } from "./rules";

/**
 * Valeurs calculées d'un personnage. Elles sont enregistrées avec lui pour que les écrans les lisent directement,
 * mais ne font jamais foi : `recompute` les reconstruit à partir des choix du joueur (espèce, classe, historique,
 * scores, niveau, compétences maîtrisées, expertise, équipement, style, ordre, invocations…).
 */
export type DerivedField =
  | "species" | "classDef" | "background" | "modifiers" | "proficiencyBonus" | "maxHp" | "armorClass" | "initiative"
  | "speed" | "passivePerception" | "saves" | "skills" | "originFeat" | "attacks";

/** Touche-à-tout (barde niveau 2) : la moitié du bonus de maîtrise aux compétences non maîtrisées et à l'initiative. */
export const hasJackOfAllTrades = (c: Pick<Character, "classDef" | "level">) => c.classDef.id === "bard" && c.level >= 2;

/** PV gagnés à chaque niveau après le premier : la moyenne du dé de vie (valeur fixe de 2024) + Constitution, au moins 1. */
export const hpGainFor = (c: Pick<Character, "classDef" | "modifiers">) => Math.max(1, Math.floor(c.classDef.hitDie / 2) + 1 + c.modifiers.CON);

/** PV maximum : dé de vie maximum au niveau 1, puis le gain fixe à chaque niveau. */
export const maxHpFor = (c: Pick<Character, "classDef" | "modifiers" | "level">) =>
  Math.max(1, c.classDef.hitDie + c.modifiers.CON) + (c.level - 1) * hpGainFor(c);

/** Compétences : la maîtrise est un choix (gardé tel quel), l'expertise vient de `expertise`, le bonus est recalculé. */
function skillsFor(c: Character, modifiers: AbilityScores, prof: number): SkillEntry[] {
  const proficient = new Set(c.skills.filter((s) => s.proficient).map((s) => s.id));
  const expertise = new Set(c.expertise ?? []);
  // Ordre « sort mineur en plus » (Thaumaturge, Magicien des bois) : Sagesse (au moins +1) à deux compétences de savoir.
  const orderSkills = (hasExtraCantrip(c.order) ? ORDER_SKILLS[c.order!] : undefined) ?? [];
  const orderBonus = Math.max(1, modifiers.WIS);
  const jack = hasJackOfAllTrades(c) ? Math.floor(prof / 2) : 0;
  return SKILLS.map((s) => {
    const isProficient = proficient.has(s.id);
    const expert = isProficient && expertise.has(s.id);
    return {
      id: s.id, name: s.name, ability: s.ability, proficient: isProficient, ...(expert ? { expert: true } : {}),
      bonus: modifiers[s.ability] + (isProficient ? prof : jack) + (expert ? prof : 0) + (orderSkills.includes(s.id) ? orderBonus : 0),
    };
  });
}

/** Reconstruit toutes les valeurs calculées du personnage. Appliquer deux fois ne change rien. */
export function recompute(c: Character): Character {
  // Les définitions viennent des données actuelles (textes, capacités) ; un identifiant inconnu garde la copie enregistrée.
  const species = SPECIES.find((x) => x.id === c.species.id) ?? c.species;
  const classDef = CLASSES.find((x) => x.id === c.classDef.id) ?? c.classDef;
  const background = BACKGROUNDS.find((x) => x.id === c.background.id) ?? c.background;
  const modifiers = Object.fromEntries(ABILITIES.map((a) => [a, abilityModifier(c.scores[a])])) as AbilityScores;
  const prof = proficiencyBonus(c.level);
  const base: Character = { ...c, species, classDef, background, modifiers, proficiencyBonus: prof };
  const skills = skillsFor(base, modifiers, prof);
  const saves = Object.fromEntries(ABILITIES.map((a) => {
    const proficient = classDef.savingThrows.includes(a);
    return [a, { proficient, bonus: modifiers[a] + (proficient ? prof : 0) }];
  })) as Character["saves"];
  const out: Character = {
    ...base, skills, saves,
    maxHp: maxHpFor(base),
    initiative: modifiers.DEX + (hasJackOfAllTrades(base) ? Math.floor(prof / 2) : 0),
    passivePerception: 10 + (skills.find((s) => s.id === "perception")?.bonus ?? 0),
    originFeat: background.originFeat,
  };
  delete (out as { jackOfAllTrades?: boolean }).jackOfAllTrades; // ancien champ, remplacé par `hasJackOfAllTrades`
  return { ...out, ...refreshStats(out) };
}
