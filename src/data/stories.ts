import type { SkillId } from "./skills";

/**
 * Format d'histoire : des scènes (texte + choix) reliées entre elles. Les drapeaux (`flags`) gardent
 * ce que le joueur a fait ; ils conditionnent les choix et les paragraphes. Texte original, en français.
 */

/** Conditions sur les drapeaux : tous ceux de `flags` doivent être posés, aucun de `notFlags`. */
export interface Requires {
  flags?: string[];
  notFlags?: string[];
  /** Or minimum que le personnage doit posséder. */
  minGold?: number;
  /** Objets que le personnage doit posséder (au moins un de chaque). */
  items?: string[];
}

/** Ce qu'un choix change : drapeaux posés ou retirés, or gagné (ou dépensé). */
export interface Effects {
  set?: string[];
  unset?: string[];
  gold?: number;
  /** Objets gagnés (quantité positive) ou perdus (négative) : identifiant → quantité. */
  items?: Record<string, number>;
  /** Ennemis de la carte qui disparaissent (identifiants de la carte) : ils laissent le drapeau `defeated:<id>`. */
  defeat?: string[];
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
  fight?: { encounterId: string; /** Ennemi de la carte affronté : il disparaît s'il est vaincu. */ enemy?: string; win: string; lose?: string };
  /** Ouvre une boutique (identifiant dans `shops.ts`). */
  shop?: string;
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
      { requires: { flags: ["goule-apaisee"] }, text: ["Vous lui dites que le gardien est mort en paix, qu'il s'agissait du père de Thibaud. Odile ferme les yeux. « Gédéon… Il nous aura protégés jusqu'au bout. Vous avez fait plus que nous vous demandions. »"] },
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
      { requires: { flags: ["goule-apaisee"] }, text: ["Thibaud a les yeux rouges. « On m'a dit ce que vous avez fait pour mon père. Je n'ai pas de mots. La maison vous offre le gîte, quand vous voulez. »"] },
      { requires: { flags: ["defeated:ghoul-1"], notFlags: ["goule-apaisee"] }, text: ["Thibaud évite votre regard. « Vous avez fait ce qu'il fallait. Je le sais. Je ne l'accepte pas encore, c'est tout. »"] },
    ],
    choices: [
      { text: "La maire m'envoie : je voudrais la clé de la crypte.", requires: { flags: ["quete-acceptee"], notFlags: ["cle-crypte"] }, goto: "aubergiste-cle" },
      { text: "Léo dit que votre père a disparu dans la crypte. C'est vrai ?", requires: { flags: ["pere-disparu"], notFlags: ["histoire-pere"] }, check: { skill: "insight", dc: 12, success: "aubergiste-pere", failure: "aubergiste-pere-ko" } },
      { text: "Observer la salle d'un œil attentif.", requires: { notFlags: ["indice-cave"] }, check: { skill: "perception", dc: 11, success: "aubergiste-indice", failure: "aubergiste-rien", onSuccess: { set: ["indice-cave"] } } },
      { text: "Écouter les rumeurs du village.", goto: "aubergiste-rumeurs" },
      { text: "Voir ce que Thibaud vend et achète.", shop: "auberge" },
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
    choices: [{ text: "Prendre la clé.", goto: "aubergiste", set: ["cle-crypte"], items: { "cle-crypte": 1 } }],
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


const village: Scene[] = [
  {
    id: "leo",
    title: "Léo, fils du meunier",
    text: [
      "Un garçon d'une douzaine d'années, assis sur un tas de sacs, vous observe sans oser parler. Ses doigts tordent sans cesse le bord de sa chemise.",
    ],
    textIf: [{ requires: { flags: ["pere-disparu"] }, text: ["« Je vous ai tout dit, m'sieur. Faites juste attention là-bas. »"] }],
    choices: [
      { text: "Raconter ce que tu as vu, mon garçon.", requires: { notFlags: ["pere-disparu"] }, goto: "leo-recit" },
      { text: "Le rassurer.", requires: { flags: ["pere-disparu"] }, goto: "leo-rassure" },
      { text: "Je repasserai.", end: true },
    ],
  },
  {
    id: "leo-recit",
    title: "Léo, fils du meunier",
    text: [
      "« J'ai vu une silhouette sortir de la crypte, cette nuit-là. Elle marchait courbée, comme un vieillard. Elle est entrée dans l'auberge par la cave… et elle y a laissé des empreintes. »",
      "Il baisse la voix. « On dit que le père de Thibaud est entré dans la crypte il y a des années, pour ne jamais en ressortir. Je crois que c'est lui. »",
    ],
    choices: [{ text: "Merci, Léo.", goto: "leo-rassure", set: ["pere-disparu"] }],
  },
  {
    id: "leo-rassure",
    title: "Léo, fils du meunier",
    text: ["Léo hoche la tête, un peu moins pâle. « Vous direz à Thibaud que je n'ai rien dit de méchant ? »"],
    choices: [{ text: "Je lui dirai.", end: true }],
  },
  {
    id: "aubergiste-pere",
    title: "Thibaud, l'aubergiste",
    text: [
      "Thibaud repose lentement son gobelet. Sa voix se brise. « Mon père, Gédéon, gardait cette crypte. Un soir, il est descendu pour réparer un sceau et n'est jamais remonté. J'ai gardé la clé comme on garde un deuil. »",
      "Il sort la clé de sous le comptoir et la tend vers vous. « Si c'est lui… ne le laissez pas souffrir. »",
    ],
    choices: [{ text: "Prendre la clé, avec respect.", goto: "aubergiste", set: ["cle-crypte", "histoire-pere"], items: { "cle-crypte": 1 } }],
  },
  {
    id: "aubergiste-pere-ko",
    title: "Thibaud, l'aubergiste",
    text: ["Thibaud se ferme comme une huître. « Je ne sais pas de quoi vous parlez. Les enfants racontent n'importe quoi. »"],
    choices: [{ text: "Revenir au comptoir.", goto: "aubergiste" }],
  },
];

const crypteInterieur: Scene[] = [
  {
    id: "journal",
    title: "Le journal du gardien",
    text: [
      "Sur une table basse, sous une épaisse couche de poussière, repose un cahier à la couverture rongée. L'écriture, tremblante, couvre des pages entières.",
    ],
    textIf: [{ requires: { flags: ["journal-lu"] }, text: ["Vous avez déjà lu ces pages : Gédéon, le gardien, s'est enfermé ici pour ne pas contaminer le village."] }],
    choices: [
      { text: "Lire le journal.", requires: { notFlags: ["journal-lu"] }, goto: "journal-lecture" },
      { text: "Refermer le cahier.", end: true },
    ],
  },
  {
    id: "journal-lecture",
    title: "Le journal du gardien",
    text: [
      "« … le sceau s'est fissuré la nuit de l'orage. Quelque chose est monté de la terre et m'a mordu. Je sens le froid gagner mes bras. Je ne veux pas être un danger pour Brumeval. »",
      "« J'ai verrouillé la porte de la salle du fond et scellé l'entrée. Si je deviens ce que je redoute, qu'on récite sur ma tombe la prière du repos : « Que la terre te soit légère, que la nuit te soit douce, repose-toi, gardien. » »",
    ],
    choices: [{ text: "Refermer le journal et le garder.", end: true, set: ["journal-lu"], items: { "journal-gedeon": 1 } }],
  },
  {
    id: "coffre",
    title: "Un coffre ancien",
    text: ["Un coffre de bois cerclé de cuivre, sans serrure, dort sous un linceul de toiles d'araignée. À l'intérieur, une petite bourse de cuir — les économies d'un gardien oublié — et une fiole de liquide rouge soigneusement bouchée."],
    choices: [
      { text: "Prendre la bourse (30 pièces d'or) et la fiole qui l'accompagne.", end: true, gold: 30, set: ["coffre-pris"], items: { "healing-potion": 1 } },
      { text: "Laisser le coffre en paix.", end: true },
    ],
  },
  {
    id: "sceau",
    title: "La porte scellée",
    text: [
      "Une porte de pierre, gravée de runes pâles, ferme la salle du fond. Au centre, un sceau de cire noire est fendu, mais retient encore la porte. Quelque chose bouge derrière, lentement.",
    ],
    choices: [
      { text: "Réciter la prière du journal.", requires: { flags: ["journal-lu"] }, goto: "sceau-ouvert", set: ["sceau-brise"] },
      { text: "Déchiffrer les runes.", check: { skill: "religion", dc: 12, success: "sceau-ouvert", failure: "sceau-echec", onSuccess: { set: ["sceau-brise"] } } },
      { text: "Chercher le mécanisme caché.", check: { skill: "investigation", dc: 13, success: "sceau-ouvert", failure: "sceau-echec", onSuccess: { set: ["sceau-brise"] } } },
      { text: "Pousser la porte de toutes vos forces.", check: { skill: "athletics", dc: 15, success: "sceau-ouvert", failure: "sceau-echec", onSuccess: { set: ["sceau-brise"] } } },
      { text: "S'éloigner.", end: true },
    ],
  },
  {
    id: "sceau-ouvert",
    title: "La porte scellée",
    text: ["Les runes s'éteignent une à une. La porte glisse dans la roche avec un grondement sourd. Une odeur de terre froide et de cire brûlée vous atteint : la salle du gardien s'ouvre devant vous."],
    choices: [{ text: "Avancer.", end: true }],
  },
  {
    id: "sceau-echec",
    title: "La porte scellée",
    text: ["Rien ne cède. Vous avez l'impression que la porte vous observe. Peut-être vaut-il mieux chercher un indice ailleurs dans la crypte, ou tenter une autre approche."],
    choices: [{ text: "Réfléchir.", goto: "sceau" }],
  },
  {
    id: "autel",
    title: "L'autel du gardien",
    text: [
      "Au fond de la salle, une silhouette voûtée est assise contre un sarcophage de pierre, la tête baissée. Des lambeaux de vêtements pendent à son corps maigre. Vous reconnaissez la veste du gardien décrite par les villageois.",
      "Elle ne vous a pas encore remarqué. Devant vous, un petit autel, couvert de cire fondue, semble attendre une prière.",
    ],
    choices: [
      { text: "Réciter la prière du repos.", requires: { flags: ["journal-lu"] }, check: { skill: "religion", dc: 13, success: "autel-paix", failure: "autel-colere", onSuccess: { set: ["goule-apaisee"], defeat: ["ghoul-1"] } } },
      { text: "Réveiller la créature et se battre.", fight: { encounterId: "ghoul", enemy: "ghoul-1", win: "autel-victoire", lose: "autel-defaite" } },
      { text: "Reculer silencieusement.", end: true },
    ],
  },
  {
    id: "autel-paix",
    title: "L'autel du gardien",
    text: [
      "Vous récitez la prière à voix basse. La silhouette frémit, lève un visage ravagé, puis l'ombre qui la tourmente s'effrite. Le gardien pousse un long soupir… et ne bouge plus. Un sourire fatigué flotte sur ses lèvres.",
      "« Merci », murmure-t-il d'une voix qui n'est plus qu'un souffle. Puis il n'est plus qu'un vieil homme en paix.",
    ],
    choices: [{ text: "Poser une main sur l'épaule du gardien et quitter la salle.", end: true }],
  },
  {
    id: "autel-colere",
    title: "L'autel du gardien",
    text: ["Votre voix tremble, les mots se mélangent. La silhouette lève la tête d'un coup : ses yeux sont deux braises. Elle se redresse en grondant et se jette sur vous !"],
    choices: [{ text: "Se battre !", fight: { encounterId: "ghoul", enemy: "ghoul-1", win: "autel-victoire", lose: "autel-defaite" } }],
  },
  {
    id: "autel-victoire",
    title: "L'autel du gardien",
    text: ["La créature s'effondre dans un râle. Le silence retombe dans la crypte. Il ne reste qu'un vieil homme dont les traits se détendent enfin."],
    choices: [{ text: "Sortir de la salle.", end: true }],
  },
  {
    id: "autel-defaite",
    title: "L'autel du gardien",
    text: ["Les ténèbres vous engloutissent… puis vous revenez à vous sur la place de Brumeval, avec une odeur de terre dans la gorge et un mal de crâne persistant. Quelqu'un vous a ramené."],
    choices: [{ text: "Se relever, courbaturé.", end: true }],
  },
];


const forge: Scene[] = [
  {
    id: "forge",
    title: "Maëlle, la forgeronne",
    text: [
      "La forge de Brumeval sent le charbon et le fer chaud. Maëlle, une femme aux avant-bras massifs, frappe une lame sur l'enclume avant de vous remarquer.",
      "« Une arme ? Une armure ? Je répare aussi, mais ça vous coûtera. »",
    ],
    textIf: [
      { requires: { flags: ["quete-acceptee"], notFlags: ["quete-terminee"] }, text: ["« Vous allez à la crypte ? Alors ne partez pas sans une bonne lame. Et un bouclier, si vous savez vous en servir. »"] },
      { requires: { flags: ["quete-terminee"] }, text: ["« Alors c'est vous qui avez réglé cette histoire de crypte ! Mes meilleurs prix sont les mêmes pour tout le monde, mais je vous sers avec plaisir. »"] },
    ],
    choices: [
      { text: "Voir les armes et armures à vendre, et vendre les miennes.", shop: "forge" },
      { text: "Je repasserai.", end: true },
    ],
  },
];

export const STORIES: readonly StoryDef[] = [
  {
    id: "brumeval",
    title: "Les morts de Brumeval",
    scenes: Object.fromEntries([...maire, ...aubergiste, ...crypte, ...village, ...forge, ...crypteInterieur].map((s) => [s.id, s])),
  },
];

export const STORY_BY_ID: Record<string, StoryDef> = Object.fromEntries(STORIES.map((s) => [s.id, s]));
