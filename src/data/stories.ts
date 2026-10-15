import type { SkillId } from "./skills";

/**
 * Format d'histoire : des scènes (texte + choix) reliées entre elles. Les drapeaux (`flags`) gardent
 * ce que le joueur a fait ; ils conditionnent les choix et les paragraphes. Texte original, en français.
 */

/** Conditions sur les drapeaux : tous ceux de `flags` doivent être posés, aucun de `notFlags`. */
export interface Requires {
  flags?: string[];
  notFlags?: string[];
}

/** Ce qu'un choix change : drapeaux posés ou retirés, or gagné (ou dépensé). */
export interface Effects {
  set?: string[];
  unset?: string[];
  gold?: number;
}

export interface Choice extends Effects {
  text: string;
  requires?: Requires;
  /** Scène suivante. */
  goto?: string;
  /** Test de compétence : le joueur lance un d20 + bonus de la compétence contre le DD. */
  check?: {
    skill: SkillId;
    dc: number;
    success: string;
    failure: string;
    /** Effets propres à la réussite ou à l'échec (en plus de ceux du choix). */
    onSuccess?: Effects;
    onFailure?: Effects;
  };
  /** Combat : le joueur se bat, puis la suite dépend du résultat. */
  fight?: { encounterId: string; win: string; lose?: string };
  /** Quitte l'histoire et revient à la carte. */
  end?: boolean;
  /** Le choix ne peut être pris qu'une fois. */
  once?: boolean;
}

export interface Scene {
  id: string;
  title: string;
  text: string[];
  /** Paragraphes ajoutés quand les conditions sont remplies. */
  textIf?: { requires: Requires; text: string[] }[];
  /** Drapeaux posés en arrivant dans la scène. */
  onEnter?: string[];
  choices: Choice[];
}

export interface StoryDef {
  id: string;
  title: string;
  scenes: Record<string, Scene>;
}

const maire: Scene[] = [
  {
    id: "maire",
    title: "Odile, la maire",
    text: [
      "Odile vous accueille devant sa maison, un châle de laine sur les épaules. Son regard est cerné de fatigue.",
      "« Voyageur, vous tombez bien ou très mal. Depuis trois nuits, des bruits montent de la vieille crypte, près de la route. Hier soir, le fils du meunier a juré avoir vu des silhouettes en sortir. »",
    ],
    textIf: [
      { requires: { flags: ["quete-acceptee"], notFlags: ["quete-terminee"] }, text: ["« La crypte, toujours la crypte. Revenez me voir quand vous saurez ce qui s'y passe. »"] },
      { requires: { flags: ["defeated:ghoul-1"], notFlags: ["quete-terminee"] }, text: ["Elle remarque la poussière de tombe sur vos vêtements et pâlit. « Vous… vous avez vu ce qu'il y avait là-dessous ? »"] },
      { requires: { flags: ["quete-terminee"] }, text: ["« Brumeval dort enfin tranquille. Vous êtes ici chez vous, quand vous voulez. »"] },
    ],
    choices: [
      { text: "J'accepte d'enquêter sur la crypte.", requires: { notFlags: ["quete-acceptee"] }, goto: "maire-accepte", set: ["quete-acceptee"] },
      { text: "Que pouvez-vous m'offrir pour ce service ?", requires: { notFlags: ["quete-acceptee", "recompense-negociee"] }, goto: "maire-prix" },
      { text: "Je reviens de la crypte : la menace est écartée.", requires: { flags: ["defeated:ghoul-1", "recompense-haute"], notFlags: ["quete-terminee"] }, goto: "maire-fin", set: ["quete-terminee"], gold: 50 },
      { text: "Je reviens de la crypte : la menace est écartée.", requires: { flags: ["defeated:ghoul-1"], notFlags: ["quete-terminee", "recompense-haute"] }, goto: "maire-fin", set: ["quete-terminee"], gold: 20 },
      { text: "Où trouver la clé de la crypte ?", requires: { flags: ["quete-acceptee"], notFlags: ["cle-crypte"] }, goto: "maire-cle" },
      { text: "Je vous laisse.", end: true },
    ],
  },
  {
    id: "maire-accepte",
    title: "Odile, la maire",
    text: [
      "Le visage d'Odile se détend un peu. « Merci. La crypte est fermée à clé depuis des années : c'est Thibaud, l'aubergiste, qui en a hérité de son père. Demandez-la-lui. Et prenez garde : si quelque chose rôde là-dedans, ce n'est pas un chat. »",
    ],
    choices: [{ text: "Je m'en occupe.", goto: "maire" }],
  },
  {
    id: "maire-prix",
    title: "Odile, la maire",
    text: ["Odile soupire. « Brumeval est un petit village. Je peux vous donner vingt pièces d'or, pas davantage. »"],
    choices: [
      {
        text: "Marchander : la tâche est dangereuse.",
        check: {
          skill: "persuasion", dc: 12, success: "maire-prix-ok", failure: "maire-prix-ko",
          onSuccess: { set: ["recompense-negociee"] },
          onFailure: { set: ["recompense-negociee"] },
        },
      },
      { text: "Vingt pièces me suffiront.", goto: "maire", set: ["quete-acceptee", "recompense-negociee"] },
    ],
  },
  {
    id: "maire-prix-ok",
    title: "Odile, la maire",
    text: ["Odile cède enfin. « Cinquante pièces d'or, alors, et je les prendrai sur ma bourse. Mais faites vite. »"],
    choices: [{ text: "Marché conclu.", goto: "maire", set: ["quete-acceptee", "recompense-haute"] }],
  },
  {
    id: "maire-prix-ko",
    title: "Odile, la maire",
    text: ["« Je n'ai pas davantage, et vous le savez bien. » Elle croise les bras. « Alors, vous acceptez ? »"],
    choices: [{ text: "D'accord, j'enquête.", goto: "maire", set: ["quete-acceptee"] }],
  },
  {
    id: "maire-cle",
    title: "Odile, la maire",
    text: ["« L'aubergiste, Thibaud. Il tient l'auberge au bout de la place, près du chemin. Il est un peu bourru, mais il connaît chaque pierre du village. »"],
    choices: [{ text: "Merci.", goto: "maire" }],
  },
  {
    id: "maire-fin",
    title: "Odile, la maire",
    text: [
      "Vous racontez ce que vous avez affronté. Odile écoute en silence, puis dépose dans votre main une bourse.",
    ],
    textIf: [
      { requires: { flags: ["recompense-haute"] }, text: ["« Cinquante pièces d'or, comme promis. C'est peu pour ce que vous avez fait. Brumeval n'oubliera pas. »"] },
      { requires: { notFlags: ["recompense-haute"] }, text: ["« Vingt pièces d'or. C'est peu pour ce que vous avez fait. Brumeval n'oubliera pas. »"] },
    ],
    choices: [{ text: "Je repars sur la route.", end: true }],
  },
];

const aubergiste: Scene[] = [
  {
    id: "aubergiste",
    title: "Thibaud, l'aubergiste",
    text: [
      "Thibaud essuie un gobelet d'étain d'un geste las. Il vous jauge de la tête aux pieds.",
      "« Étranger, hein ? Ici, on se méfie. Qu'est-ce que vous voulez ? »",
    ],
    textIf: [
      { requires: { flags: ["cle-crypte"] }, text: ["Il vous lance un regard en coin. « Vous avez la clé. Ne me la rendez pas, je préfère ne plus la voir. »"] },
    ],
    choices: [
      { text: "La maire m'envoie : je voudrais la clé de la crypte.", requires: { flags: ["quete-acceptee"], notFlags: ["cle-crypte"] }, goto: "aubergiste-cle" },
      { text: "Observer la salle d'un œil attentif.", requires: { notFlags: ["indice-cave"] }, check: { skill: "perception", dc: 11, success: "aubergiste-indice", failure: "aubergiste-rien", onSuccess: { set: ["indice-cave"] } } },
      { text: "Écouter les rumeurs du village.", goto: "aubergiste-rumeurs" },
      { text: "Je vous laisse.", end: true },
    ],
  },
  {
    id: "aubergiste-cle",
    title: "Thibaud, l'aubergiste",
    text: ["Thibaud serre la mâchoire. « Cette clé, mon père me l'a confiée en me disant de ne jamais ouvrir. Pourquoi je vous la donnerais ? »"],
    choices: [
      { text: "Le convaincre : le village est en danger.", check: { skill: "persuasion", dc: 12, success: "aubergiste-cle-ok", failure: "aubergiste-cle-ko" } },
      { text: "Le menacer.", check: { skill: "intimidation", dc: 14, success: "aubergiste-cle-ok", failure: "aubergiste-cle-ko" } },
      { text: "Je repasserai.", goto: "aubergiste" },
    ],
  },
  {
    id: "aubergiste-cle-ok",
    title: "Thibaud, l'aubergiste",
    text: ["Il soupire, fouille sous le comptoir et pose sur le bois une grosse clé rouillée. « Prenez-la. Et si vous voyez mon père là-dedans, dites-lui que je n'y suis pour rien. »"],
    choices: [{ text: "Prendre la clé.", goto: "aubergiste", set: ["cle-crypte"] }],
  },
  {
    id: "aubergiste-cle-ko",
    title: "Thibaud, l'aubergiste",
    text: ["« Non. Ce n'est pas la première fois qu'un inconnu vient me réclamer cette clé en disant que le village est en danger. »"],
    choices: [{ text: "Réfléchir à une autre approche.", goto: "aubergiste" }],
  },
  {
    id: "aubergiste-indice",
    title: "Thibaud, l'aubergiste",
    text: ["Votre regard s'arrête sur la porte de la cave : de la terre grasse, fraîche, a séché sur le seuil, et la poussière forme des traces de pas qui montent de la cave vers la cour. Quelqu'un — ou quelque chose — est sorti par là, cette nuit."],
    choices: [{ text: "Garder cela en tête.", goto: "aubergiste" }],
  },
  {
    id: "aubergiste-rien",
    title: "Thibaud, l'aubergiste",
    text: ["Vous ne voyez rien d'autre que des tables collantes et des chaises dépareillées."],
    choices: [{ text: "Revenir au comptoir.", goto: "aubergiste" }],
  },
  {
    id: "aubergiste-rumeurs",
    title: "Thibaud, l'aubergiste",
    text: [
      "Les clients parlent à voix basse. On dit que le vieux cimetière était déjà maudit avant la fondation du village. On dit qu'un charretier a disparu sur la route, il y a une semaine. On dit surtout que les chiens refusent de s'approcher de la crypte.",
    ],
    textIf: [{ requires: { flags: ["indice-cave"] }, text: ["Vous repensez à la terre fraîche dans la cour : tout cela semble bien lié."] }],
    choices: [{ text: "Revenir au comptoir.", goto: "aubergiste" }],
  },
];

const crypte: Scene[] = [
  {
    id: "crypte",
    title: "La porte de la crypte",
    text: [
      "Une lourde porte de chêne cerclée de fer, couverte de mousse, ferme l'entrée de la crypte. Une serrure massive y est scellée. Derrière, vous croyez entendre un raclement lent, comme des griffes sur la pierre.",
    ],
    choices: [
      { text: "Ouvrir avec la clé de Thibaud.", requires: { flags: ["cle-crypte"] }, goto: "crypte-ouverte", set: ["crypte-ouverte"] },
      { text: "Crocheter la serrure.", requires: { notFlags: ["cle-crypte"] }, check: { skill: "sleight-of-hand", dc: 15, success: "crypte-ouverte", failure: "crypte-alerte", onSuccess: { set: ["crypte-ouverte"] } } },
      { text: "Enfoncer la porte.", requires: { notFlags: ["cle-crypte"] }, check: { skill: "athletics", dc: 14, success: "crypte-ouverte", failure: "crypte-alerte", onSuccess: { set: ["crypte-ouverte"] } } },
      { text: "Laisser la porte tranquille.", end: true },
    ],
  },
  {
    id: "crypte-ouverte",
    title: "La porte de la crypte",
    text: ["La porte cède avec un long gémissement. Un souffle froid, chargé d'une odeur de terre et de pourriture, s'échappe de l'ombre. Les marches descendent vers l'obscurité."],
    choices: [{ text: "Entrer dans la crypte.", end: true }],
  },
  {
    id: "crypte-alerte",
    title: "La porte de la crypte",
    text: ["Le bruit résonne dans toute la crypte. Derrière la porte, quelque chose se met à marteler le bois, de plus en plus fort. Vous reculez d'un pas : un squelette surgit des broussailles, arme au poing !"],
    choices: [{ text: "Se battre !", fight: { encounterId: "skeleton", win: "crypte", lose: "crypte-defaite" } }],
  },
  {
    id: "crypte-defaite",
    title: "La porte de la crypte",
    text: ["Les coups pleuvent. Vous perdez connaissance… et vous reprenez vos esprits sur la place du village, une couverture sur les épaules, avec Odile qui se penche sur vous."],
    choices: [{ text: "Se relever, courbaturé.", end: true }],
  },
];

export const STORIES: readonly StoryDef[] = [
  {
    id: "brumeval",
    title: "Les morts de Brumeval",
    scenes: Object.fromEntries([...maire, ...aubergiste, ...crypte].map((s) => [s.id, s])),
  },
];

export const STORY_BY_ID: Record<string, StoryDef> = Object.fromEntries(STORIES.map((s) => [s.id, s]));
