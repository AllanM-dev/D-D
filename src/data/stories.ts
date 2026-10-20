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
  /** Points d'expérience gagnés. */
  xp?: number;
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
      "Odile vous accueille dans la salle de la mairie, un châle de laine sur les épaules. Son regard est cerné de fatigue.",
      "« Voyageur, vous tombez bien ou très mal. Depuis trois nuits, des bruits montent de la vieille crypte, près de la route. Hier soir, le fils du meunier a juré avoir vu des silhouettes en sortir. »",
    ],
    textIf: [
      { requires: { flags: ["quete-acceptee"], notFlags: ["quete-terminee"] }, text: ["« La crypte, toujours la crypte. Revenez me voir quand vous saurez ce qui s'y passe. »"] },
      { requires: { flags: ["quete-acceptee"], notFlags: ["indice-moulin", "quete-terminee"] }, text: ["« Josette, la meunière, de l'autre côté de la rivière, a perdu des outils et vu une ombre rôder. Parlez-lui. »"] },
      { requires: { flags: ["quete-acceptee"], notFlags: ["indice-ferme", "quete-terminee"] }, text: ["« Hugues, le fermier, perd ses bêtes et ne dort plus. Il a sûrement des choses à raconter, mais il est fâché contre un loup. »"] },
      { requires: { flags: ["quete-acceptee"], notFlags: ["defeated:bandit-1", "quete-terminee"] }, text: ["« Et le cimetière, au sud, sent la terre remuée… Je n'ose pas y aller seule. »"] },
      { requires: { flags: ["pendentif-rendu"], notFlags: ["quete-terminee"] }, text: ["« Thibaud est passé me voir : il a retrouvé le pendentif de son père, il pleurait comme un enfant. »"] },
      { requires: { flags: ["defeated:ghoul-1"], notFlags: ["quete-terminee"] }, text: ["Elle remarque la poussière de tombe sur vos vêtements et pâlit. « Vous… vous avez vu ce qu'il y avait là-dessous ? »"] },
      { requires: { flags: ["quete-terminee"] }, text: ["« Brumeval dort enfin tranquille. Vous êtes ici chez vous, quand vous voulez. »"] },
    ],
    choices: [
      { text: "J'accepte d'enquêter sur la crypte.", requires: { notFlags: ["quete-acceptee"] }, goto: "maire-accepte", set: ["quete-acceptee"] },
      { text: "Que pouvez-vous m'offrir pour ce service ?", requires: { notFlags: ["quete-acceptee", "recompense-negociee"] }, goto: "maire-prix" },
      { text: "Je reviens de la crypte : la menace est écartée.", requires: { flags: ["defeated:ghoul-1", "recompense-haute"], notFlags: ["quete-terminee"] }, goto: "maire-fin", set: ["quete-terminee"], gold: 50, xp: 100 },
      { text: "Je reviens de la crypte : la menace est écartée.", requires: { flags: ["defeated:ghoul-1"], notFlags: ["quete-terminee", "recompense-haute"] }, goto: "maire-fin", set: ["quete-terminee"], gold: 20, xp: 100 },
      { text: "Où trouver la clé de la crypte ?", requires: { flags: ["quete-acceptee"], notFlags: ["cle-crypte"] }, goto: "maire-cle" },
      { text: "Le village pourrait-il me prêter quelqu'un pour m'accompagner ?", requires: { flags: ["quete-acceptee"], notFlags: ["compagnon:ysolde", "quete-terminee"] }, goto: "maire-ysolde" },
      { text: "Je vous laisse.", end: true },
    ],
  },
  {
    id: "maire-accepte",
    title: "Odile, la maire",
    text: [
      "Le visage d'Odile se détend un peu. « Merci. La crypte est fermée à clé depuis des années : c'est Thibaud, l'aubergiste, qui en a hérité de son père. Demandez-la-lui. Et prenez garde : si quelque chose rôde là-dedans, ce n'est pas un chat. »",
      "« Mais n'y descendez pas à l'aveugle. Faites d'abord le tour du village : Josette, la meunière, de l'autre côté du pont, et Hugues, le fermier, ont vu ou perdu des choses étranges ; et on dit qu'on a vu une lanterne au cimetière, au sud. Revenez avec des réponses. »",
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
    id: "maire-ysolde",
    title: "Odile, la maire",
    text: [
      "Odile réfléchit un instant, puis désigne la fenêtre : sur le pont, une garde en cotte de mailles, lance à l'épaule, surveille la route. « Ysolde. Dix ans qu'elle garde ce pont, et pas un loup n'est passé. Elle connaît le village mieux que personne. »",
    ],
    textIf: [
      { requires: { notFlags: ["recompense-haute"] }, text: ["« Je peux vous la prêter jusqu'à ce que cette affaire soit réglée. Brumeval paiera sa solde, c'est bien le moins. »"] },
      { requires: { flags: ["recompense-haute"] }, text: ["Elle grimace. « Mais avec les cinquante pièces que je vous ai promises, la caisse du village est vide : je ne peux pas payer sa solde en plus. Si vous la voulez, payez-la vous-même… ou rendez-moi une part de votre récompense. »"] },
    ],
    choices: [
      { text: "Volontiers : qu'Ysolde vienne avec moi.", requires: { notFlags: ["recompense-haute"] }, goto: "maire-ysolde-ok", set: ["compagnon:ysolde"] },
      { text: "Payer la solde d'Ysolde de ma poche (15 pièces d'or).", requires: { flags: ["recompense-haute"], minGold: 15 }, goto: "maire-ysolde-ok", gold: -15, set: ["compagnon:ysolde"] },
      { text: "Renoncer à trente pièces de ma récompense pour qu'Ysolde vienne.", requires: { flags: ["recompense-haute"] }, goto: "maire-ysolde-ok", unset: ["recompense-haute"], set: ["compagnon:ysolde"] },
      { text: "Je préfère m'en passer.", goto: "maire" },
    ],
  },
  {
    id: "maire-ysolde-ok",
    title: "Ysolde, la garde du pont",
    text: [
      "Odile fait signe par la fenêtre. Quelques instants plus tard, Ysolde pousse la porte, salue d'un hochement de tête et cale son bouclier sur son épaule. « La maire dit que je vous suis. Restez derrière moi quand ça tourne mal, et tout ira bien. »",
    ],
    choices: [{ text: "Repartir avec Ysolde.", goto: "maire" }],
  },
  {
    id: "maire-cle",
    title: "Odile, la maire",
    text: ["« L'aubergiste, Thibaud. Il tient l'auberge près du chemin, au centre du village. Il est un peu bourru, mais il connaît chaque pierre du village. »"],
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
      { requires: { flags: ["pillard-avoue"], notFlags: ["compagnon:corentin"] }, text: ["« Et ce pillard… on l'a laissé filer ? Soit. Il paraît qu'il a quitté la région, la queue entre les jambes. »"] },
      { requires: { flags: ["compagnon:corentin"] }, text: ["Elle jette un regard méfiant à Corentin, puis soupire. « Celui qui a ouvert la tombe a aidé à la refermer. Brumeval lui pardonnera… avec le temps. »"] },
      { requires: { flags: ["compagnon:ysolde"] }, text: ["« Ysolde m'a raconté. Elle dit qu'on ne l'avait jamais aussi bien commandée. Venant d'elle, c'est un compliment. »"] },
      { requires: { flags: ["pendentif-rendu"] }, text: ["Elle sourit tristement. « Vous avez rendu à Thibaud ce qu'il avait perdu de plus cher. Cela ne se paie pas. »"] },
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
      { text: "Je crois avoir quelque chose qui appartient à votre père : un pendentif d'argent.", requires: { items: ["pendentif-gedeon"], notFlags: ["pendentif-rendu"] }, goto: "aubergiste-pendentif" },
      { text: "Observer la salle d'un œil attentif.", requires: { notFlags: ["indice-cave"] }, check: { skill: "perception", dc: 11, success: "aubergiste-indice", failure: "aubergiste-rien", onSuccess: { set: ["indice-cave"] } } },
      { text: "Écouter les rumeurs du village.", goto: "aubergiste-rumeurs" },
      { text: "Aborder le moine qui dîne seul près du feu.", requires: { notFlags: ["compagnon:anselme"] }, goto: "anselme" },
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
    id: "aubergiste-pendentif",
    title: "Thibaud, l'aubergiste",
    text: [
      "Thibaud saisit le pendentif d'une main qui tremble. Il le retourne, passe le pouce sur la clé et l'étoile gravées. « C'est le sien. Il ne l'ôtait jamais. Où l'avez-vous trouvé ? »",
      "Vous lui racontez le cimetière, la tombe éventrée et le pillard. Il ferme le poing sur le bijou, longtemps, sans rien dire.",
    ],
    textIf: [
      { requires: { flags: ["defeated:ghoul-1"] }, text: ["« Alors même après… il a continué à veiller sur nous. »"] },
      { requires: { flags: ["cle-crypte"], notFlags: ["defeated:ghoul-1"] }, text: ["« Si vous descendez, dites-lui que j'ai son pendentif. Dites-lui que je ne l'ai pas oublié. »"] },
    ],
    choices: [{ text: "Accepter la bourse qu'il vous presse dans la main.", requires: { items: ["pendentif-gedeon"] }, goto: "aubergiste", set: ["pendentif-rendu"], gold: 25, xp: 25, items: { "pendentif-gedeon": -1 } }],
  },
  {
    id: "anselme",
    title: "Frère Anselme",
    text: [
      "Près du feu, un moine en robe de bure trempe son pain dans une soupe claire. Il lève vers vous des yeux calmes. « Frère Anselme. Je vais de village en village prier pour les morts qu'on oublie. Et ici, j'ai l'impression que les morts ne dorment pas. »",
      "« J'aimerais descendre dans cette crypte. Mais je ne suis pas un guerrier, et je ne suivrai que quelqu'un qui sait ce qui l'attend en bas. »",
    ],
    textIf: [
      { requires: { flags: ["anselme-hesite"] }, text: ["« Revenez quand vous en saurez davantage. Je ne descends pas les yeux fermés. »"] },
    ],
    choices: [
      { text: "Lui raconter l'histoire de Gédéon, le gardien qui n'est jamais remonté.", requires: { flags: ["pere-disparu"] }, goto: "anselme-ok", set: ["compagnon:anselme"] },
      { text: "Lui parler du tunnel sous la tombe et du sceau fendu.", requires: { flags: ["tunnel-vu"] }, goto: "anselme-ok", set: ["compagnon:anselme"] },
      {
        text: "Le convaincre que le village a besoin de lui, maintenant.",
        requires: { notFlags: ["anselme-hesite"] },
        check: { skill: "persuasion", dc: 13, success: "anselme-ok", failure: "anselme-ko", onSuccess: { set: ["compagnon:anselme"] }, onFailure: { set: ["anselme-hesite"] } },
      },
      { text: "Le laisser à son repas.", goto: "aubergiste" },
    ],
  },
  {
    id: "anselme-ok",
    title: "Frère Anselme",
    text: ["Anselme repose sa cuillère et se lève. « Alors ce n'est pas un hasard si nos routes se croisent. Je viens. Je soignerai vos blessures ; vous me protégerez des griffes. »"],
    choices: [{ text: "Revenir au comptoir avec Anselme.", goto: "aubergiste" }],
  },
  {
    id: "anselme-ko",
    title: "Frère Anselme",
    text: ["Anselme sourit tristement. « Vous parlez bien, mais vous ne savez rien de plus que moi. Interrogez les gens d'ici : quelqu'un, forcément, sait qui repose dans cette crypte. »"],
    choices: [{ text: "Revenir au comptoir.", goto: "aubergiste" }],
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
    textIf: [
      { requires: { notFlags: ["indice-moulin"] }, text: ["Vous hésitez. Odile vous a parlé de Josette, la meunière : elle sait peut-être qui rôde autour de la crypte."] },
      { requires: { notFlags: ["indice-ferme"] }, text: ["Hugues, le fermier, a lui aussi des choses à dire ; il est de l'autre côté de la rivière."] },
      { requires: { notFlags: ["defeated:bandit-1"] }, text: ["Et ce cimetière, au sud, d'où l'on aurait vu une lanterne… Descendre ici sans savoir serait imprudent."] },
      { requires: { flags: ["indice-moulin", "indice-ferme", "defeated:bandit-1"] }, text: ["Vous savez ce qui est arrivé : un pillard a creusé sous la tombe, fendu le sceau, et réveillé ce qui dormait. Il est temps de descendre."] },
    ],
    choices: [
      { text: "Ouvrir avec la clé de Thibaud.", requires: { flags: ["cle-crypte", "indice-moulin", "indice-ferme", "defeated:bandit-1"] }, goto: "crypte-ouverte", set: ["crypte-ouverte"] },
      { text: "Crocheter la serrure.", requires: { flags: ["indice-moulin", "indice-ferme", "defeated:bandit-1"], notFlags: ["cle-crypte"] }, check: { skill: "sleight-of-hand", dc: 15, success: "crypte-ouverte", failure: "crypte-alerte", onSuccess: { set: ["crypte-ouverte"] } } },
      { text: "Enfoncer la porte.", requires: { flags: ["indice-moulin", "indice-ferme", "defeated:bandit-1"], notFlags: ["cle-crypte"] }, check: { skill: "athletics", dc: 14, success: "crypte-ouverte", failure: "crypte-alerte", onSuccess: { set: ["crypte-ouverte"] } } },
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

const moulin: Scene[] = [
  {
    id: "meuniere",
    title: "Josette, la meunière",
    text: [
      "Dans le moulin, la farine flotte comme un brouillard doré. Josette, la meunière, une femme robuste au tablier poudré de blanc, vous fait signe de parler bas : son mari dort sur un tas de sacs, épuisé par les nuits de veille.",
    ],
    textIf: [
      { requires: { flags: ["indice-moulin"] }, text: ["« Je vous ai tout dit. Trouvez ce voleur avant qu'il ne s'en prenne à autre chose que ma pelle. »"] },
      { requires: { flags: ["pillard-avoue"], notFlags: ["compagnon:corentin"] }, text: ["« On dit que vous avez parlé au pillard. S'il repasse par chez moi, je lui apprendrai à voler une pelle ! »"] },
      { requires: { flags: ["compagnon:corentin"] }, text: ["Elle fixe Corentin, les poings sur les hanches. Il baisse les yeux et marmonne qu'il rapportera la pelle. « Et la lanterne ! » ajoute-t-elle."] },
    ],
    choices: [
      { text: "La maire m'envoie : avez-vous remarqué quelque chose d'étrange ?", requires: { flags: ["quete-acceptee"], notFlags: ["indice-moulin"] }, goto: "meuniere-recit" },
      { text: "Demander des nouvelles du village.", goto: "meuniere-village" },
      { text: "Je repasserai.", end: true },
    ],
  },
  {
    id: "meuniere-recit",
    title: "Josette, la meunière",
    text: [
      "« Étrange ? Oui. Il y a trois nuits, on m'a volé ma pelle et la lanterne de la cour. Et hier à l'aube, j'ai vu une silhouette encapuchonnée traverser le pont avec un sac qui tintait, en direction du vieux cimetière. Pas un fantôme : il laissait des traces de bottes. »",
    ],
    choices: [
      { text: "Examiner le sol de la cour.", check: { skill: "perception", dc: 12, success: "meuniere-traces", failure: "meuniere-rien" } },
      { text: "Remercier Josette.", goto: "meuniere", set: ["indice-moulin"], xp: 25 },
    ],
  },
  {
    id: "meuniere-traces",
    title: "Josette, la meunière",
    text: ["Dans la boue séchée, des empreintes de bottes à gros clous, profondes : un homme chargé, qui traînait un peu la jambe gauche. Elles repartent vers le pont, puis vers le sud. Ce n'est pas une créature de la crypte, mais bien quelqu'un de vivant."],
    choices: [{ text: "Remercier Josette.", goto: "meuniere", set: ["indice-moulin", "traces-bottes"], xp: 25 }],
  },
  {
    id: "meuniere-rien",
    title: "Josette, la meunière",
    text: ["La cour est un champ de boue piétinée par les charrettes. Impossible d'y distinguer quoi que ce soit de précis."],
    choices: [{ text: "Revenir vers Josette.", goto: "meuniere-recit" }],
  },
  {
    id: "meuniere-village",
    title: "Josette, la meunière",
    text: ["« Le village ? Il a changé depuis que les nuits font peur. Le marché ferme plus tôt, et Berthe et Orso ne crient plus leurs prix qu'à contrecœur. Mais personne ne veut quitter Brumeval : c'est un bon endroit, quand les morts dorment. »"],
    choices: [{ text: "Revenir vers Josette.", goto: "meuniere" }],
  },
];

const ferme: Scene[] = [
  {
    id: "fermier",
    title: "Hugues, le fermier",
    text: [
      "Hugues, large d'épaules, tord son chapeau de paille entre ses mains. La ferme est silencieuse : dans la cour, quelques poules gisent, la gorge ouverte.",
    ],
    textIf: [
      { requires: { flags: ["indice-ferme"] }, text: ["« Merci encore pour le loup. Si vous trouvez celui qui creuse au cimetière, tapez fort de ma part. »"] },
      { requires: { flags: ["loup-signale"], notFlags: ["defeated:wolf-1"] }, text: ["« Le loup rôde toujours, au nord-ouest, près de la lisière du bois. Revenez quand il ne pourra plus faire de mal. »"] },
    ],
    choices: [
      { text: "Que s'est-il passé ici ?", requires: { notFlags: ["loup-signale"] }, goto: "fermier-loup" },
      { text: "Le loup de la forêt ne fera plus de mal à vos bêtes.", requires: { flags: ["defeated:wolf-1", "loup-signale"], notFlags: ["indice-ferme"] }, goto: "fermier-merci", gold: 10, xp: 25, set: ["indice-ferme"] },
      { text: "Parler à Mila, la chasseuse.", requires: { flags: ["indice-ferme"], notFlags: ["compagnon:mila"] }, goto: "mila" },
      { text: "Je repasserai.", end: true },
    ],
  },
  {
    id: "fermier-loup",
    title: "Hugues, le fermier",
    text: [
      "« Un loup, gros comme un veau, qui rôde à la lisière de la forêt, au nord-ouest du village. Il a pris mes poules, demain il prendra mes agneaux. Débarrassez-m'en, et je vous dirai ce que j'ai vu, la nuit dernière, depuis ma fenêtre. »",
    ],
    choices: [{ text: "Je m'en occupe.", goto: "fermier", set: ["loup-signale"] }],
  },
  {
    id: "fermier-merci",
    title: "Hugues, le fermier",
    text: [
      "Hugues vous serre la main avec une force de forgeron. « Dix pièces, c'est tout ce que j'ai de côté. Prenez-les. »",
      "Puis il baisse la voix. « La nuit dernière, j'ai vu une lueur au vieux cimetière : une lanterne, et quelqu'un qui creusait. Pas un mort : il jurait comme un charretier. Allez voir du côté de la tombe du fond. »",
    ],
    choices: [
      { text: "Merci, Hugues.", goto: "fermier" },
      { text: "Qui est cette jeune femme, l'arc à la main, qui vous regarde depuis la grange ?", requires: { notFlags: ["compagnon:mila"] }, goto: "mila" },
    ],
  },
  {
    id: "mila",
    title: "Mila, la chasseuse",
    text: [
      "La fille d'Hugues s'avance, un arc long à l'épaule, un carquois plein dans le dos. « Mila. Trois semaines que je traque ce loup, et c'est vous qui l'avez eu. » Elle n'a pas l'air vexée : plutôt curieuse.",
      "« Ce n'était pas un loup ordinaire. Il fuyait quelque chose, du côté de la crypte. Je veux savoir quoi. Vous y allez, n'est-ce pas ? »",
    ],
    choices: [
      { text: "Venez avec moi : un arc de plus ne sera pas de trop.", goto: "mila-ok", set: ["compagnon:mila"] },
      { text: "Pas pour l'instant.", goto: "fermier" },
    ],
  },
  {
    id: "mila-ok",
    title: "Mila, la chasseuse",
    text: ["Mila vérifie la corde de son arc. « Je reste en retrait et je tire sur ce qui vous menace. Si ça s'approche de moi, je recule : ne vous vexez pas. » Hugues soupire, mais la serre dans ses bras avant de vous laisser partir."],
    choices: [{ text: "Repartir avec Mila.", goto: "fermier" }],
  },
];

const cimetiere: Scene[] = [
  {
    id: "tombe",
    title: "La tombe éventrée",
    text: [
      "Au fond du cimetière, une tombe a été éventrée : la dalle gît de côté et un tunnel étroit s'enfonce dans la terre, en direction de la crypte. Des outils traînent sur le bord. Une odeur de terre fraîche et de tabac flotte dans l'air.",
    ],
    textIf: [
      { requires: { notFlags: ["defeated:bandit-1"] }, text: ["Un homme est accroupi près d'un sac, de dos, en train de compter des pièces à la lueur d'une lanterne. À côté de lui, une pelle : la pelle du meunier, sans aucun doute."] },
      { requires: { flags: ["defeated:bandit-1"] }, text: ["Le pillard n'est plus là pour vous surprendre. Le tunnel, lui, est toujours béant."] },
    ],
    choices: [
      { text: "L'affronter.", requires: { notFlags: ["defeated:bandit-1"] }, fight: { encounterId: "pillard", enemy: "bandit-1", win: "tombe-victoire", lose: "tombe-defaite" } },
      { text: "Le prendre au dépourvu et lui ordonner de se rendre.", requires: { notFlags: ["defeated:bandit-1"] }, check: { skill: "intimidation", dc: 14, success: "tombe-aveu", failure: "tombe-alerte", onSuccess: { defeat: ["bandit-1"], set: ["pillard-avoue"], xp: 25, items: { "pendentif-gedeon": 1 } } } },
      { text: "Examiner le tunnel.", goto: "tombe-tunnel" },
      { text: "S'éloigner.", end: true },
    ],
  },
  {
    id: "tombe-aveu",
    title: "La tombe éventrée",
    text: [
      "Surpris, le pillard lâche son sac et lève les mains. « Je… je cherchais seulement de quoi manger ! J'ai creusé sous la tombe, et j'ai débouché dans un couloir de pierre. Il y avait un sceau fendu, des runes… J'y ai touché, et la nuit suivante, tout s'est mis à bouger là-dessous. »",
      "Il vous tend un pendentif d'argent. « Je l'ai pris sur un squelette. Je n'en veux plus. Laissez-moi partir, je quitte la région ! » Il file entre les tombes sans se retourner.",
    ],
    choices: [
      { text: "Garder le pendentif et le laisser fuir.", end: true },
      {
        text: "Le retenir : « Tu as réveillé ce qui dort là-dessous. Aide-moi à le rendormir. »",
        check: { skill: "persuasion", dc: 12, success: "corentin-ok", failure: "corentin-fuite", onSuccess: { set: ["compagnon:corentin"] } },
      },
    ],
  },
  {
    id: "corentin-ok",
    title: "Corentin, le pillard",
    text: [
      "L'homme s'arrête, les épaules basses. « Corentin. Je m'appelle Corentin. » Il ramasse son arbalète, la regarde longtemps, puis la passe à son épaule. « Vous avez raison. Je n'arriverai plus à dormir tant que ce truc rôdera. Je viens. Je vise bien, et je sais me battre de près, s'il le faut. »",
    ],
    choices: [{ text: "Repartir avec Corentin.", end: true }],
  },
  {
    id: "corentin-fuite",
    title: "La tombe éventrée",
    text: ["Il secoue la tête, terrifié. « Non, non, non. Je ne redescends pas là-dedans ! » Et il file entre les tombes sans se retourner."],
    choices: [{ text: "Le laisser partir.", end: true }],
  },
  {
    id: "tombe-alerte",
    title: "La tombe éventrée",
    text: ["Il se retourne d'un bond, une arbalète déjà à l'épaule. « Un curieux ! Il fallait rester au village ! »"],
    choices: [{ text: "Se battre !", fight: { encounterId: "pillard", enemy: "bandit-1", win: "tombe-victoire", lose: "tombe-defaite" } }],
  },
  {
    id: "tombe-victoire",
    title: "La tombe éventrée",
    text: ["Le pillard s'effondre. Dans sa besace, entre quelques pièces et un morceau de pain dur, un pendentif d'argent terni, gravé d'une clé et d'une étoile."],
    choices: [{ text: "Ramasser ses affaires.", end: true }],
  },
  {
    id: "tombe-defaite",
    title: "La tombe éventrée",
    text: ["Les coups pleuvent. Vous perdez connaissance… et vous reprenez vos esprits sur la place du village, une couverture sur les épaules, avec Odile qui se penche sur vous."],
    choices: [{ text: "Se relever, courbaturé.", end: true }],
  },
  {
    id: "tombe-tunnel",
    title: "La tombe éventrée",
    text: ["Le tunnel est étroit, étayé de planches pourries. À l'autre bout, un souffle froid, chargé de cire et de terre, monte vers vous : il mène sous le mur de la crypte. C'est ainsi que le pillard a atteint le sceau, et par ricochet réveillé ce qui reposait là."],
    choices: [{ text: "Se redresser.", goto: "tombe", set: ["tunnel-vu"] }],
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
      { text: "Réciter la prière du repos.", requires: { flags: ["journal-lu"] }, check: { skill: "religion", dc: 13, success: "autel-paix", failure: "autel-colere", onSuccess: { set: ["goule-apaisee"], defeat: ["ghoul-1"], xp: 200 } } },
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
    scenes: Object.fromEntries([...maire, ...aubergiste, ...crypte, ...village, ...forge, ...moulin, ...ferme, ...cimetiere, ...crypteInterieur].map((s) => [s.id, s])),
  },
];

export const STORY_BY_ID: Record<string, StoryDef> = Object.fromEntries(STORIES.map((s) => [s.id, s]));
