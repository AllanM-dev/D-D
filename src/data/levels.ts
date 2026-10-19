/**
 * Niveaux et expérience (règles 2024). Le jeu s'arrête pour l'instant au niveau 2 : il manque encore les sorts
 * de niveau 2 et les sous-classes (niveau 3).
 */
export const MAX_LEVEL = 2;

/** Points d'expérience nécessaires pour atteindre chaque niveau (index = niveau). */
export const XP_FOR_LEVEL = [0, 0, 300, 900, 2700, 6500] as const;

/** Niveau correspondant à une quantité d'expérience, dans la limite du niveau maximum jouable. */
export function levelForXp(xp: number): number {
  let level = 1;
  for (let l = 2; l <= MAX_LEVEL; l++) if (xp >= XP_FOR_LEVEL[l]) level = l;
  return level;
}

/** Expérience du niveau suivant, ou `undefined` au niveau maximum. */
export const xpForNext = (level: number): number | undefined => (level >= MAX_LEVEL ? undefined : XP_FOR_LEVEL[level + 1]);

/** Une capacité gagnée au niveau 2. `applied` : le jeu la gère ; sinon elle est seulement décrite (voir `note`). */
export interface LevelFeature {
  name: string;
  /** Description en français (texte original). */
  text: string;
  status: "applied" | "partial" | "todo";
  /** Ce que fait (ou ne fait pas) l'application. */
  note: string;
}

/** Capacités de classe du niveau 2, par classe. */
export const LEVEL2_FEATURES: Record<string, LevelFeature[]> = {
  barbarian: [
    { name: "Attaque téméraire", text: "Avant votre première attaque du tour, vous pouvez frapper sans vous protéger : avantage à vos attaques de Force au corps à corps, mais aussi avantage aux attaques contre vous jusqu'à votre prochain tour.", status: "applied", note: "Proposée avant d'attaquer, sans coûter d'action ni d'action bonus." },
    { name: "Sens du danger", text: "Vous avez l'avantage aux jets de sauvegarde de Dextérité contre les pièges et les effets que vous voyez.", status: "applied", note: "Avantage à tous vos jets de sauvegarde de Dextérité tant que vous n'êtes pas neutralisé." },
  ],
  bard: [
    { name: "Expertise", text: "Vous choisissez deux compétences que vous maîtrisez : votre bonus de maîtrise y est doublé.", status: "applied", note: "Choisie au passage de niveau." },
    { name: "Touche-à-tout", text: "Vous ajoutez la moitié de votre bonus de maîtrise (arrondie à l'inférieur) aux tests de caractéristique et à l'initiative où vous n'êtes pas déjà maîtrisant.", status: "applied", note: "Appliquée aux compétences non maîtrisées et à l'initiative." },
  ],
  cleric: [
    { name: "Conduit divin", text: "Une fois par repos court, vous canalisez l'énergie divine : une étincelle divine qui soigne ou blesse, ou le renvoi des morts-vivants.", status: "todo", note: "Pas encore jouable." },
  ],
  druid: [
    { name: "Forme sauvage", text: "Vous prenez la forme d'une bête que vous avez déjà vue, deux fois par repos court.", status: "todo", note: "Pas encore jouable (il faudrait des formes de bêtes)." },
    { name: "Compagnon sauvage", text: "Vous dépensez une utilisation de Forme sauvage pour lancer l'appel d'un familier.", status: "todo", note: "Pas encore jouable (pas de compagnon)." },
  ],
  fighter: [
    { name: "Fougue", text: "Une fois par repos court, vous accomplissez une action de plus pendant votre tour.", status: "applied", note: "Proposée quand votre action est dépensée, sans coûter votre action bonus ; se recharge au repos court." },
    { name: "Esprit tactique", text: "Vous pouvez dépenser Second souffle pour ajouter 1d10 à un test de caractéristique raté.", status: "todo", note: "Pas encore appliqué (peu de tests de caractéristique en combat)." },
  ],
  monk: [
    { name: "Concentration du moine", text: "Vous avez 2 points de concentration, récupérés au repos court. Un point permet un Déluge de coups (deux frappes en action bonus après l'action Attaquer), une Défense patiente (esquive en action bonus) ou le Pas du vent (foncer et se désengager en action bonus).", status: "applied", note: "Les trois usages sont jouables en combat." },
    { name: "Déplacement sans armure", text: "Votre vitesse augmente de 3 m quand vous ne portez ni armure ni bouclier.", status: "applied", note: "Prise en compte dans la vitesse de la fiche." },
    { name: "Métabolisme surnaturel", text: "Une fois par repos long, vous récupérez tous vos points de concentration et des PV.", status: "todo", note: "Pas encore jouable." },
  ],
  paladin: [
    { name: "Châtiment du paladin", text: "Le sort Châtiment divin est toujours préparé, et vous le lancez une fois gratuitement par repos long.", status: "applied", note: "Sort jouable en action bonus juste après un coup d'arme au corps à corps." },
    { name: "Style de combat", text: "Vous choisissez un style de combat (Défense, Archerie, Armes à deux mains ou Deux armes).", status: "applied", note: "Choisi au passage de niveau." },
  ],
  ranger: [
    { name: "Explorateur expert", text: "Vous choisissez une compétence que vous maîtrisez : votre bonus de maîtrise y est doublé.", status: "applied", note: "Choisie au passage de niveau (les langues ne servent à rien dans le jeu)." },
    { name: "Style de combat", text: "Vous choisissez un style de combat (Défense, Archerie, Armes à deux mains ou Deux armes).", status: "applied", note: "Choisi au passage de niveau." },
  ],
  rogue: [
    { name: "Action ruse", text: "En action bonus, vous pouvez foncer, vous désengager ou vous cacher.", status: "partial", note: "Foncer et se désengager sont jouables ; se cacher n'existe pas encore." },
  ],
  sorcerer: [
    { name: "Source de magie", text: "Vous avez 2 points de sorcellerie, récupérés au repos long. En action bonus, vous transformez 2 points en un emplacement de sort de niveau 1, ou un emplacement en 1 point.", status: "applied", note: "Les deux conversions sont jouables en combat." },
    { name: "Métamagie", text: "Vous choisissez deux manières de modifier vos sorts (sorts jumelés, sorts subtils…), en dépensant des points de sorcellerie.", status: "todo", note: "Pas encore jouable." },
  ],
  warlock: [
    { name: "Invocations supplémentaires", text: "Vous apprenez deux invocations de plus.", status: "applied", note: "Vous connaissez maintenant les trois invocations du jeu." },
    { name: "Magie occulte", text: "Une fois par repos long, vous récupérez la moitié de vos emplacements de Magie de pacte.", status: "todo", note: "Pas encore jouable." },
  ],
  wizard: [
    { name: "Érudit", text: "Vous choisissez une compétence de savoir que vous maîtrisez (Arcanes, Histoire, Investigation, Médecine, Nature ou Religion) : votre bonus de maîtrise y est doublé.", status: "applied", note: "Choisie au passage de niveau." },
  ],
};

/** Expérience déjà méritée par les anciennes sauvegardes, d'après les drapeaux de l'histoire (les ennemis vaincus comptent à part). */
export const RETRO_FLAG_XP: Record<string, number> = {
  "indice-moulin": 25, "indice-ferme": 25, "pendentif-rendu": 25, "quete-terminee": 100,
};
