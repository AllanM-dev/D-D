import { STORY_BY_ID, type Choice, type Effects, type Requires, type Scene, type StoryDef } from "../data/stories";
import { ENCOUNTERS } from "../data/encounters";
import { SKILLS, type SkillId } from "../data/skills";
import { rollD20, type Rng } from "./dice";

/** Ce que le personnage a fait dans l'histoire (sauvegardé avec lui). */
export interface StoryProgress {
  flags: string[];
}

export const emptyProgress = (): StoryProgress => ({ flags: [] });

export function meets(req: Requires | undefined, flags: readonly string[]): boolean {
  if (!req) return true;
  return (req.flags ?? []).every((f) => flags.includes(f)) && !(req.notFlags ?? []).some((f) => flags.includes(f));
}

/** Drapeau interne qui retient un choix à usage unique. */
export const onceFlag = (sceneId: string, index: number) => `fait:${sceneId}:${index}`;

export interface ChoiceView {
  /** Position dans `scene.choices` (stable, sert à choisir). */
  index: number;
  choice: Choice;
}

/** Choix proposés : conditions remplies, usage unique non encore pris. */
export function availableChoices(scene: Scene, flags: readonly string[]): ChoiceView[] {
  return scene.choices
    .map((choice, index) => ({ choice, index }))
    .filter(({ choice, index }) => meets(choice.requires, flags) && !(choice.once && flags.includes(onceFlag(scene.id, index))));
}

/** Paragraphes de la scène, dont ceux que les drapeaux font apparaître. */
export function sceneText(scene: Scene, flags: readonly string[]): string[] {
  return [...scene.text, ...(scene.textIf ?? []).filter((t) => meets(t.requires, flags)).flatMap((t) => t.text)];
}

export interface Applied {
  flags: string[];
  /** Or gagné (ou dépensé si négatif). */
  gold: number;
  /** Ennemis de la carte à faire disparaître. */
  defeated: string[];
}

/** Applique des effets à une liste de drapeaux. */
export function applyEffects(flags: readonly string[], ...effects: (Effects | undefined)[]): Applied {
  let out = [...flags];
  let gold = 0;
  const defeated: string[] = [];
  for (const e of effects) {
    if (!e) continue;
    for (const id of e.defeat ?? []) { defeated.push(id); if (!out.includes(`defeated:${id}`)) out.push(`defeated:${id}`); }
    for (const f of e.set ?? []) if (!out.includes(f)) out.push(f);
    out = out.filter((f) => !(e.unset ?? []).includes(f));
    gold += e.gold ?? 0;
  }
  return { flags: out, gold, defeated };
}

/** Pose les drapeaux d'arrivée d'une scène. */
export function enterScene(scene: Scene, flags: readonly string[]): string[] {
  return applyEffects(flags, { set: scene.onEnter }).flags;
}

export interface CheckResult {
  skill: SkillId;
  dc: number;
  dice: number[];
  natural: number;
  modifier: number;
  total: number;
  success: boolean;
}

export const skillName = (id: SkillId) => SKILLS.find((s) => s.id === id)!.name;

/** Test de compétence : d20 + bonus contre le DD. */
export function rollCheck(skill: SkillId, dc: number, bonus: number, rng: Rng = Math.random): CheckResult {
  const roll = rollD20(bonus, "normal", rng);
  return { skill, dc, dice: roll.rolls, natural: roll.natural, modifier: bonus, total: roll.total, success: roll.total >= dc };
}

export interface ChoiceOutcome {
  flags: string[];
  gold: number;
  /** Ennemis de la carte à faire disparaître. */
  defeated: string[];
  /** Scène suivante (absente si le choix quitte l'histoire ou lance un combat). */
  next?: string;
  fight?: { encounterId: string; enemy?: string; win: string; lose?: string };
  end?: boolean;
  check?: CheckResult;
}

/**
 * Résout un choix. Pour un test de compétence, `skillBonus` donne le bonus du personnage et le résultat
 * (`check`) est renvoyé avec la scène qui en découle.
 */
export function resolveChoice(
  scene: Scene, index: number, flags: readonly string[], skillBonus: (id: SkillId) => number, rng: Rng = Math.random,
): ChoiceOutcome {
  const choice = scene.choices[index];
  if (!choice || !availableChoices(scene, flags).some((c) => c.index === index)) throw new Error("Choix impossible.");
  const base: Effects = { set: [...(choice.set ?? []), ...(choice.once ? [onceFlag(scene.id, index)] : [])], unset: choice.unset, gold: choice.gold, defeat: choice.defeat };
  if (choice.check) {
    const c = choice.check;
    const check = rollCheck(c.skill, c.dc, skillBonus(c.skill), rng);
    const applied = applyEffects(flags, base, check.success ? c.onSuccess : c.onFailure);
    return { ...applied, next: check.success ? c.success : c.failure, check };
  }
  const applied = applyEffects(flags, base);
  if (choice.fight) return { ...applied, fight: choice.fight };
  if (choice.end) return { ...applied, end: true };
  return { ...applied, next: choice.goto };
}

/** Liste les erreurs d'une histoire (vide si elle est valide). */
export function validateStory(story: StoryDef, startScene: string): string[] {
  const errors: string[] = [];
  const scenes = story.scenes;
  if (!scenes[startScene]) errors.push(`${story.id} : scène de départ ${startScene} inconnue`);
  const targets = (c: Choice) => [c.goto, c.check?.success, c.check?.failure, c.fight?.win, c.fight?.lose].filter((x): x is string => !!x);
  for (const [id, scene] of Object.entries(scenes)) {
    if (scene.id !== id) errors.push(`${story.id}/${id} : identifiant différent de la clé`);
    if (!scene.text.length) errors.push(`${story.id}/${id} : pas de texte`);
    if (!scene.choices.length) errors.push(`${story.id}/${id} : aucun choix (impasse)`);
    scene.choices.forEach((c, i) => {
      const kinds = [c.goto, c.check, c.fight, c.end].filter(Boolean).length;
      if (kinds !== 1) errors.push(`${story.id}/${id}#${i} : un choix doit avoir exactement une issue (goto, check, fight ou end)`);
      for (const t of targets(c)) if (!scenes[t]) errors.push(`${story.id}/${id}#${i} : scène ${t} inconnue`);
      if (c.check && !SKILLS.some((s) => s.id === c.check!.skill)) errors.push(`${story.id}/${id}#${i} : compétence inconnue`);
      if (c.fight && !ENCOUNTERS.some((e) => e.id === c.fight!.encounterId)) errors.push(`${story.id}/${id}#${i} : rencontre inconnue`);
    });
  }
  return errors;
}

/** Scènes qu'aucun choix ni aucun lieu de la carte ne permet d'atteindre. */
export function unreachableScenes(story: StoryDef, entryScenes: string[]): string[] {
  const seen = new Set<string>();
  const queue = [...entryScenes];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id) || !story.scenes[id]) continue;
    seen.add(id);
    for (const c of story.scenes[id].choices) {
      for (const t of [c.goto, c.check?.success, c.check?.failure, c.fight?.win, c.fight?.lose]) if (t) queue.push(t);
    }
  }
  return Object.keys(story.scenes).filter((id) => !seen.has(id));
}

export const storyOf = (id: string): StoryDef => {
  const s = STORY_BY_ID[id];
  if (!s) throw new Error(`Histoire inconnue : ${id}`);
  return s;
};
