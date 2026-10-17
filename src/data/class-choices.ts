import type { SkillId } from "./skills";

/** Choix de classe faits à la création du personnage (règles 2024). */
export interface ClassChoice {
  id: string;
  name: string;
  /** Résumé en français (texte original). */
  text: string;
}

/** Ordre divin (clerc) et Ordre primordial (druide). */
export const ORDERS: Record<string, ClassChoice[]> = {
  cleric: [
    { id: "protector", name: "Protecteur", text: "Formation aux armes martiales et aux armures lourdes : un clerc qui se bat en première ligne." },
    { id: "thaumaturge", name: "Thaumaturge", text: "Un sort mineur de plus, et un bonus aux tests d'Arcanes et de Religion égal à votre modificateur de Sagesse (au moins +1)." },
  ],
  druid: [
    { id: "warden", name: "Gardien", text: "Formation aux armes martiales et aux armures intermédiaires : un druide qui se bat en première ligne." },
    { id: "magician", name: "Magicien des bois", text: "Un sort mineur de plus, et un bonus aux tests d'Arcanes et de Nature égal à votre modificateur de Sagesse (au moins +1)." },
  ],
};

/** Compétences qui profitent de l'ordre « sort mineur en plus ». */
export const ORDER_SKILLS: Record<string, SkillId[]> = { thaumaturge: ["arcana", "religion"], magician: ["arcana", "nature"] };

/** Les deux ordres de ce type qui donnent un sort mineur de plus. */
export const hasExtraCantrip = (order?: string) => order === "thaumaturge" || order === "magician";

/** Invocations occultes de l'occultiste (une au niveau 1). */
export const INVOCATIONS: ClassChoice[] = [
  { id: "armor-of-shadows", name: "Armure d'ombres", text: "Vous pouvez lancer Armure du mage sur vous à volonté : sans armure, votre CA est de 13 + Dextérité." },
  { id: "agonizing-blast", name: "Décharge agonisante", text: "Votre Décharge occulte ajoute votre modificateur de Charisme à ses dégâts." },
  { id: "eldritch-spear", name: "Lance occulte", text: "La portée de votre Décharge occulte est multipliée par trois." },
];

/** Nombre de compétences à maîtriser en expertise (le roublard en choisit deux au niveau 1). */
export const EXPERTISE_COUNT: Record<string, number> = { rogue: 2 };

export const isOrder = (classId: string, id: unknown) => !!ORDERS[classId]?.some((o) => o.id === id);
export const isInvocation = (id: unknown) => INVOCATIONS.some((i) => i.id === id);

/** Choix par défaut d'une classe (premier ordre, première invocation, premières compétences maîtrisées pour l'expertise). */
export function defaultClassChoices(classId: string, ownSkills: SkillId[]): { order?: string; invocation?: string; expertise?: SkillId[] } {
  return {
    ...(ORDERS[classId] ? { order: ORDERS[classId][0].id } : {}),
    ...(classId === "warlock" ? { invocation: INVOCATIONS[0].id } : {}),
    ...(EXPERTISE_COUNT[classId] ? { expertise: ownSkills.slice(0, EXPERTISE_COUNT[classId]) } : {}),
  };
}
