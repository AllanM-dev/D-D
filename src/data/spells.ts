import type { Ability } from "../engine/rules";
import type { AreaShape } from "../engine/areas";
import type { ConditionId } from "./conditions";

/** Effet d'un sort tel que le moteur sait le jouer. `none` : pas d'effet en combat pour le moment. */
export type SpellEffect =
  | { kind: "attack"; melee: boolean; dice: [number, number]; damageType: string; guiding?: boolean; /** État infligé si le sort touche, jusqu'à la fin de votre prochain tour. */ condition?: ConditionId }
  | { kind: "save"; save: Ability; dice: [number, number]; damageType: string; half: boolean; hurtSides?: number; mocks?: boolean }
  | { kind: "missiles"; darts: number; sides: number; bonus: number; damageType: string }
  /** Pas de dégâts : un jet de sauvegarde ; en cas d'échec, la cible subit ces états. */
  | { kind: "control"; save: Ability; conditions: ConditionId[]; /** Nouveau jet à la fin de chacun de ses tours. */ repeatSave?: boolean; /** La cible peut tenter de se libérer (Force) au lieu d'attaquer. */ escape?: boolean }
  /** Réaction : +5 à la CA quand une attaque touche. */
  | { kind: "reaction-shield" }
  /** Réaction : l'attaquant qui vient de vous blesser subit des dégâts (jet de sauvegarde, moitié si réussi). */
  | { kind: "reaction-rebuke"; save: Ability; dice: [number, number]; damageType: string }
  | { kind: "heal"; dice: [number, number] }
  | { kind: "mage-armor" }
  | { kind: "ac-bonus"; bonus: number }
  /** Concentration : +1d4 aux jets d'attaque et de sauvegarde du lanceur. */
  | { kind: "bless" }
  /** Châtiment divin : dégâts supplémentaires à la créature qui vient d'être touchée au corps à corps. */
  | { kind: "smite"; dice: [number, number]; damageType: string }
  | { kind: "mark"; dice: [number, number]; damageType: string; weaponOnly: boolean }
  | { kind: "none" };

export interface SpellDef {
  id: string;
  name: string;
  level: 0 | 1;
  school: string;
  time: "action" | "bonus" | "reaction";
  /** Portée affichée (distances en mètres). */
  range: string;
  duration: string;
  concentration: boolean;
  /** Classes qui peuvent préparer ce sort. */
  classes: string[];
  /** Résumé en français (texte original, pas une citation du SRD). */
  description: string;
  effect: SpellEffect;
  /** Zone d'effet : tous les ennemis dans la zone sont touchés (la cible choisie donne la direction ou le centre). */
  area?: AreaShape;
  /** Ce que fait (ou ne fait pas) l'application, quand c'est plus simple que la règle. */
  note?: string;
}

const CASTERS = { bard: "bard", cleric: "cleric", druid: "druid", paladin: "paladin", ranger: "ranger", sorcerer: "sorcerer", warlock: "warlock", wizard: "wizard" } as const;
const { bard, cleric, druid, paladin, ranger, sorcerer, warlock, wizard } = CASTERS;

export const SPELLS: readonly SpellDef[] = [
  // ----- Sorts mineurs avec effet en combat
  { id: "fire-bolt", name: "Trait de feu", level: 0, school: "Évocation", time: "action", range: "36 m", duration: "Instantanée", concentration: false, classes: [sorcerer, wizard],
    description: "Vous projetez un trait de feu sur une créature. Jet d'attaque de sort à distance : 1d10 dégâts de feu.",
    effect: { kind: "attack", melee: false, dice: [1, 10], damageType: "feu" } },
  { id: "eldritch-blast", name: "Décharge occulte", level: 0, school: "Évocation", time: "action", range: "36 m", duration: "Instantanée", concentration: false, classes: [warlock],
    description: "Un faisceau d'énergie crépitante frappe une créature. Jet d'attaque de sort à distance : 1d10 dégâts de force. Aux niveaux supérieurs, plusieurs faisceaux.",
    effect: { kind: "attack", melee: false, dice: [1, 10], damageType: "force" } },
  { id: "chill-touch", name: "Contact glacial", level: 0, school: "Nécromancie", time: "action", range: "36 m", duration: "Instantanée", concentration: false, classes: [sorcerer, warlock, wizard],
    description: "Une main spectrale s'abat sur une créature. Jet d'attaque de sort à distance : 1d10 dégâts nécrotiques ; la cible ne peut pas récupérer de PV jusqu'à votre prochain tour.",
    effect: { kind: "attack", melee: false, dice: [1, 10], damageType: "nécrotique" }, note: "L'interdiction de récupérer des PV n'est pas appliquée." },
  { id: "ray-of-frost", name: "Rayon de givre", level: 0, school: "Évocation", time: "action", range: "18 m", duration: "Instantanée", concentration: false, classes: [sorcerer, wizard],
    description: "Un rayon de froid bleuté. Jet d'attaque de sort à distance : 1d8 dégâts de froid ; la vitesse de la cible baisse de 3 m jusqu'à votre prochain tour.",
    effect: { kind: "attack", melee: false, dice: [1, 8], damageType: "froid" }, note: "Le ralentissement n'est pas appliqué." },
  { id: "produce-flame", name: "Création de flammes", level: 0, school: "Invocation", time: "action", range: "18 m", duration: "Instantanée", concentration: false, classes: [druid],
    description: "Une flamme vacille dans votre main, puis vous la lancez. Jet d'attaque de sort à distance : 1d8 dégâts de feu.",
    effect: { kind: "attack", melee: false, dice: [1, 8], damageType: "feu" }, note: "L'application fait apparaître et lancer la flamme en une seule action." },
  { id: "thorn-whip", name: "Fouet épineux", level: 0, school: "Transmutation", time: "action", range: "9 m", duration: "Instantanée", concentration: false, classes: [druid],
    description: "Une liane couverte d'épines fouette une créature. Jet d'attaque de sort au corps à corps : 1d6 dégâts perforants ; la cible peut être attirée vers vous.",
    effect: { kind: "attack", melee: true, dice: [1, 6], damageType: "perforant" }, note: "L'attirance n'est pas appliquée." },
  { id: "sacred-flame", name: "Flamme sacrée", level: 0, school: "Évocation", time: "action", range: "18 m", duration: "Instantanée", concentration: false, classes: [cleric],
    description: "Une lumière descend sur une créature. Jet de sauvegarde de Dextérité : en cas d'échec, 1d8 dégâts radiants ; aucun dégât si elle réussit.",
    effect: { kind: "save", save: "DEX", dice: [1, 8], damageType: "radiant", half: false } },
  { id: "toll-the-dead", name: "Glas", level: 0, school: "Nécromancie", time: "action", range: "18 m", duration: "Instantanée", concentration: false, classes: [cleric, warlock, wizard],
    description: "Le glas d'une cloche lugubre. Jet de sauvegarde de Sagesse : en cas d'échec, 1d8 dégâts nécrotiques, ou 1d12 si la cible a déjà perdu des PV.",
    effect: { kind: "save", save: "WIS", dice: [1, 8], damageType: "nécrotique", half: false, hurtSides: 12 } },
  { id: "vicious-mockery", name: "Moquerie cruelle", level: 0, school: "Enchantement", time: "action", range: "18 m", duration: "Instantanée", concentration: false, classes: [bard],
    description: "Une insulte teintée de magie. Jet de sauvegarde de Sagesse : en cas d'échec, 1d6 dégâts psychiques et la cible a un désavantage à sa prochaine attaque.",
    effect: { kind: "save", save: "WIS", dice: [1, 6], damageType: "psychique", half: false, mocks: true } },
  // ----- Sorts mineurs sans effet en combat
  { id: "light", name: "Lumière", level: 0, school: "Évocation", time: "action", range: "Contact", duration: "1 heure", concentration: false, classes: [bard, cleric, sorcerer, wizard],
    description: "Un objet que vous touchez brille aussi fort qu'une torche pendant une heure.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "mage-hand", name: "Main de mage", level: 0, school: "Invocation", time: "action", range: "9 m", duration: "1 minute", concentration: false, classes: [bard, sorcerer, warlock, wizard],
    description: "Une main spectrale manipule un objet léger à distance : ouvrir une porte, porter un petit objet.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "prestidigitation", name: "Prestidigitation", level: 0, school: "Transmutation", time: "action", range: "3 m", duration: "Jusqu'à 1 heure", concentration: false, classes: [bard, sorcerer, warlock, wizard],
    description: "Petits tours de magie : étincelles, odeurs, nettoyer ou salir un objet, réchauffer ou refroidir un peu de nourriture.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "minor-illusion", name: "Illusion mineure", level: 0, school: "Illusion", time: "action", range: "9 m", duration: "1 minute", concentration: false, classes: [bard, sorcerer, warlock, wizard],
    description: "Vous créez un son ou une image immobile dans un cube de 1,5 m.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "guidance", name: "Assistance", level: 0, school: "Divination", time: "action", range: "Contact", duration: "Concentration, 1 minute", concentration: true, classes: [cleric, druid],
    description: "Une créature touchée ajoute 1d4 à un test de caractéristique de son choix.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "mending", name: "Réparation", level: 0, school: "Transmutation", time: "action", range: "Contact", duration: "Instantanée", concentration: false, classes: [bard, cleric, druid, sorcerer, wizard],
    description: "Répare une cassure ou une déchirure dans un objet.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "druidcraft", name: "Druidisme", level: 0, school: "Transmutation", time: "action", range: "9 m", duration: "Instantanée", concentration: false, classes: [druid],
    description: "Petits effets de la nature : prévoir la météo, faire éclore une fleur, éteindre une flamme minuscule.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "thaumaturgy", name: "Thaumaturgie", level: 0, school: "Transmutation", time: "action", range: "9 m", duration: "1 minute", concentration: false, classes: [cleric],
    description: "Une manifestation mineure de puissance divine : voix qui tonne, flammes qui vacillent, sol qui tremble.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },

  // ----- Sorts de niveau 1 avec effet en combat
  { id: "magic-missile", name: "Projectile magique", level: 1, school: "Évocation", time: "action", range: "36 m", duration: "Instantanée", concentration: false, classes: [sorcerer, wizard],
    description: "Trois fléchettes d'énergie frappent sans jamais manquer : 1d4 + 1 dégâts de force chacune.",
    effect: { kind: "missiles", darts: 3, sides: 4, bonus: 1, damageType: "force" } },
  { id: "burning-hands", name: "Mains brûlantes", level: 1, school: "Évocation", time: "action", range: "Cône de 4,5 m", duration: "Instantanée", concentration: false, classes: [sorcerer, wizard],
    description: "Une nappe de flammes jaillit de vos mains. Jet de sauvegarde de Dextérité : 3d6 dégâts de feu, la moitié si la créature réussit.",
    effect: { kind: "save", save: "DEX", dice: [3, 6], damageType: "feu", half: true }, area: { kind: "cone", size: 3 },
    note: "Le cône part de vous vers la cible choisie (3 cases de long, ouvert à 90°) et touche tous les ennemis dedans ; les murs arrêtent les flammes. Les objets inflammables ne s'embrasent pas." },
  { id: "thunderwave", name: "Vague tonnante", level: 1, school: "Évocation", time: "action", range: "Cube de 4,5 m autour de vous", duration: "Instantanée", concentration: false, classes: [bard, druid, sorcerer, wizard],
    description: "Une onde de tonnerre. Jet de sauvegarde de Constitution : 2d8 dégâts de tonnerre, la moitié si la créature réussit ; en cas d'échec elle est aussi repoussée.",
    effect: { kind: "save", save: "CON", dice: [2, 8], damageType: "tonnerre", half: true }, area: { kind: "cube", size: 3 },
    note: "Le cube de 3 × 3 cases part de vous vers la cible choisie et touche tous les ennemis dedans ; la poussée de 3 m n'est pas appliquée." },
  { id: "ray-of-sickness", name: "Rayon empoisonné", level: 1, school: "Nécromancie", time: "action", range: "18 m", duration: "Instantanée", concentration: false, classes: [sorcerer, wizard],
    description: "Un rayon verdâtre frappe une créature. Jet d'attaque de sort à distance : 2d8 dégâts de poison, et la cible est empoisonnée jusqu'à la fin de votre prochain tour.",
    effect: { kind: "attack", melee: false, dice: [2, 8], damageType: "poison", condition: "poisoned" } },
  { id: "entangle", name: "Enchevêtrement", level: 1, school: "Invocation", time: "action", range: "27 m", duration: "Concentration, 1 minute", concentration: true, classes: [druid, ranger],
    description: "Des herbes et des lianes jaillissent du sol. Jet de sauvegarde de Force : en cas d'échec, la créature est entravée tant que vous restez concentré ; elle peut tenter de se libérer par un test de Force.",
    effect: { kind: "control", save: "STR", conditions: ["restrained"], escape: true }, area: { kind: "square", size: 4 }, note: "Le carré de 4 × 4 cases (6 m) est centré sur la cible choisie et touche tous les ennemis dedans. Pas de terrain difficile. Un ennemi entravé tente de se libérer à la place d'attaquer." },
  { id: "hideous-laughter", name: "Fou rire de Tasha", level: 1, school: "Enchantement", time: "action", range: "9 m", duration: "Concentration, 1 minute", concentration: true, classes: [bard, wizard],
    description: "La cible est prise d'un fou rire incontrôlable. Jet de sauvegarde de Sagesse : en cas d'échec, elle tombe à terre et est neutralisée ; elle refait le jet à la fin de chacun de ses tours.",
    effect: { kind: "control", save: "WIS", conditions: ["prone", "incapacitated"], repeatSave: true }, note: "Le nouveau jet quand la cible subit des dégâts n'est pas appliqué." },
  { id: "guiding-bolt", name: "Éclair guidé", level: 1, school: "Évocation", time: "action", range: "36 m", duration: "Jusqu'à la fin de votre prochain tour", concentration: false, classes: [cleric],
    description: "Un éclair de lumière. Jet d'attaque de sort à distance : 4d6 dégâts radiants ; la prochaine attaque contre la cible a l'avantage.",
    effect: { kind: "attack", melee: false, dice: [4, 6], damageType: "radiant", guiding: true } },
  { id: "inflict-wounds", name: "Infliction de blessures", level: 1, school: "Nécromancie", time: "action", range: "Contact", duration: "Instantanée", concentration: false, classes: [cleric],
    description: "Une énergie nécrotique. Jet d'attaque de sort au corps à corps : 2d10 dégâts nécrotiques.",
    effect: { kind: "attack", melee: true, dice: [2, 10], damageType: "nécrotique" } },
  { id: "cure-wounds", name: "Soin des blessures", level: 1, school: "Abjuration", time: "action", range: "Contact", duration: "Instantanée", concentration: false, classes: [bard, cleric, druid, paladin, ranger],
    description: "Une créature touchée récupère 2d8 PV plus votre modificateur de caractéristique d'incantation.",
    effect: { kind: "heal", dice: [2, 8] }, note: "Dans l'application, vous soignez vous-même ou votre compagnon, s'il est au contact (même à 0 PV)." },
  { id: "healing-word", name: "Mot de guérison", level: 1, school: "Abjuration", time: "bonus", range: "18 m", duration: "Instantanée", concentration: false, classes: [bard, cleric, druid],
    description: "Une créature visible récupère 2d4 PV plus votre modificateur de caractéristique d'incantation.",
    effect: { kind: "heal", dice: [2, 4] }, note: "Dans l'application, vous soignez vous-même ou votre compagnon, s'il est à 18 m et en vue (même à 0 PV)." },
  { id: "mage-armor", name: "Armure du mage", level: 1, school: "Abjuration", time: "action", range: "Contact", duration: "8 heures", concentration: false, classes: [sorcerer, wizard],
    description: "Un champ de force protège une créature consentante qui ne porte pas d'armure : sa CA devient 13 + son modificateur de Dextérité.",
    effect: { kind: "mage-armor" }, note: "Dans l'application, l'effet dure jusqu'à la fin du combat." },
  { id: "shield-of-faith", name: "Bouclier de la foi", level: 1, school: "Abjuration", time: "bonus", range: "18 m", duration: "Concentration, 10 minutes", concentration: true, classes: [cleric, paladin],
    description: "Un champ scintillant entoure une créature : +2 à sa CA tant que vous restez concentré.",
    effect: { kind: "ac-bonus", bonus: 2 }, note: "Dans l'application, la protection vous vise vous-même." },
  { id: "hex", name: "Maléfice", level: 1, school: "Enchantement", time: "bonus", range: "27 m", duration: "Concentration, 1 heure", concentration: true, classes: [warlock],
    description: "Vous maudissez une créature : chaque attaque qui la touche lui inflige 1d6 dégâts nécrotiques supplémentaires, tant que vous restez concentré.",
    effect: { kind: "mark", dice: [1, 6], damageType: "nécrotique", weaponOnly: false }, note: "Le désavantage aux tests d'une caractéristique et le changement de cible ne sont pas appliqués." },
  { id: "hunters-mark", name: "Marque du chasseur", level: 1, school: "Divination", time: "bonus", range: "27 m", duration: "Concentration, 1 heure", concentration: true, classes: [ranger],
    description: "Vous marquez une créature : vos attaques d'arme qui la touchent lui infligent 1d6 dégâts de force supplémentaires, tant que vous restez concentré.",
    effect: { kind: "mark", dice: [1, 6], damageType: "force", weaponOnly: true }, note: "Le changement de cible n'est pas appliqué." },

  { id: "divine-smite", name: "Châtiment divin", level: 1, school: "Évocation", time: "bonus", range: "Soi-même", duration: "Instantanée", concentration: false, classes: [paladin],
    description: "Juste après avoir touché une créature avec une arme de mêlée, vous libérez une force sacrée : 2d8 dégâts radiants supplémentaires.",
    effect: { kind: "smite", dice: [2, 8], damageType: "radiant" }, note: "Se lance en action bonus après un coup d'arme au corps à corps (même tour). Le dé de dégâts supplémentaire contre les morts-vivants et les fiélons, et les emplacements de niveau supérieur, ne sont pas appliqués." },

  // ----- Sorts de niveau 1 sans effet en combat pour le moment
  { id: "shield", name: "Bouclier", level: 1, school: "Abjuration", time: "reaction", range: "Soi-même", duration: "1 round", concentration: false, classes: [sorcerer, wizard],
    description: "Réaction quand vous êtes touché : +5 à votre CA jusqu'au début de votre prochain tour, et vous évitez Projectile magique.", effect: { kind: "reaction-shield" }, note: "Se lance en réaction quand une attaque ennemie vous touche : l'application vous demande si vous voulez le lancer (1 emplacement). L'immunité à Projectile magique est sans objet, aucun ennemi n'en lance." },
  { id: "bless", name: "Bénédiction", level: 1, school: "Enchantement", time: "action", range: "9 m", duration: "Concentration, 1 minute", concentration: true, classes: [cleric, paladin],
    description: "Jusqu'à trois créatures ajoutent 1d4 à leurs jets d'attaque et de sauvegarde.", effect: { kind: "bless" }, note: "Dans l'application, la bénédiction vous vise vous-même (pas d'allié) : +1d4 à vos jets d'attaque et de sauvegarde tant que vous restez concentré." },
  { id: "goodberry", name: "Baies nourricières", level: 1, school: "Transmutation", time: "action", range: "Contact", duration: "24 heures", concentration: false, classes: [druid, ranger],
    description: "Dix baies magiques : en manger une rend 1 PV et nourrit pour la journée.", effect: { kind: "none" }, note: "Pas encore appliqué : pas d'inventaire de consommables." },
  { id: "hellish-rebuke", name: "Représailles infernales", level: 1, school: "Évocation", time: "reaction", range: "18 m", duration: "Instantanée", concentration: false, classes: [warlock],
    description: "Réaction quand une créature vous blesse : elle fait un jet de sauvegarde de Dextérité, 2d10 dégâts de feu, la moitié si elle réussit.", effect: { kind: "reaction-rebuke", save: "DEX", dice: [2, 10], damageType: "feu" }, note: "Se lance en réaction après avoir été blessé par un ennemi : l'application vous demande si vous voulez le lancer (1 emplacement)." },
  { id: "armor-of-agathys", name: "Armure d'Agathys", level: 1, school: "Abjuration", time: "action", range: "Soi-même", duration: "1 heure", concentration: false, classes: [warlock],
    description: "Vous gagnez 5 PV temporaires ; un attaquant au corps à corps qui vous touche subit 5 dégâts de froid tant qu'il vous en reste.", effect: { kind: "none" }, note: "Pas encore appliqué : les PV temporaires ne sont pas gérés." },
  { id: "detect-magic", name: "Détection de la magie", level: 1, school: "Divination", time: "action", range: "Soi-même (9 m)", duration: "Concentration, 10 minutes", concentration: true, classes: [bard, cleric, druid, paladin, ranger, sorcerer, wizard],
    description: "Vous sentez la présence de magie à 9 m et pouvez en voir l'aura autour des objets et créatures.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "longstrider", name: "Grande foulée", level: 1, school: "Transmutation", time: "action", range: "Contact", duration: "1 heure", concentration: false, classes: [bard, druid, ranger, wizard],
    description: "La vitesse d'une créature touchée augmente de 3 m.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "speak-with-animals", name: "Communication avec les animaux", level: 1, school: "Divination", time: "action", range: "Soi-même", duration: "10 minutes", concentration: false, classes: [bard, druid, ranger],
    description: "Vous comprenez les bêtes et pouvez leur parler.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "comprehend-languages", name: "Compréhension des langues", level: 1, school: "Divination", time: "action", range: "Soi-même", duration: "1 heure", concentration: false, classes: [bard, sorcerer, warlock, wizard],
    description: "Vous comprenez toute langue parlée que vous entendez, et l'écrit que vous touchez.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "disguise-self", name: "Déguisement", level: 1, school: "Illusion", time: "action", range: "Soi-même", duration: "1 heure", concentration: false, classes: [bard, sorcerer, wizard],
    description: "Vous changez d'apparence (silhouette, vêtements) ; un examen attentif peut révéler l'illusion.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "identify", name: "Identification", level: 1, school: "Divination", time: "action", range: "Contact", duration: "Instantanée", concentration: false, classes: [bard, wizard],
    description: "Vous apprenez les propriétés magiques d'un objet ou d'une créature que vous touchez.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
  { id: "detect-evil-and-good", name: "Détection du mal et du bien", level: 1, school: "Divination", time: "action", range: "Soi-même (9 m)", duration: "Concentration, 10 minutes", concentration: true, classes: [cleric, paladin],
    description: "Vous sentez la présence de créatures aberrantes, célestes, élémentaires, fées, fiélons et morts-vivants à 9 m.", effect: { kind: "none" }, note: "Pas d'effet en combat : le sort n'a d'usage qu'en dehors des combats." },
];

export const SPELL_BY_ID: Record<string, SpellDef> = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

/** Un sort que le moteur sait jouer en combat. */
/** Portée numérique en mètres : « 36 m » → 36, « Contact » → 1,5, « Cône de 4,5 m » → 4,5 ; undefined pour « Soi-même ». */
export function rangeMeters(spell: Pick<SpellDef, "range">): number | undefined {
  const r = spell.range;
  if (r === "Contact") return 1.5;
  if (r.startsWith("Soi-même")) return undefined;
  const m = r.match(/(\d+(?:,\d+)?)\s*m/);
  return m ? Number(m[1].replace(",", ".")) : undefined;
}

export const isPlayable = (s: SpellDef) => s.effect.kind !== "none";

export interface ClassSpellcasting {
  ability: Ability;
  /** Nombre de sorts mineurs connus et de sorts de niveau 1 préparés au niveau 1. */
  cantrips: number;
  prepared: number;
  /** Emplacements de sort de niveau 1 (Magie de pacte : emplacements récupérés après un repos court). */
  slots: number;
  /** Sorts toujours préparés, hors du compte. */
  alwaysPrepared?: string[];
  /** Lancers gratuits par repos long (Ennemi juré du rôdeur). */
  free?: { spellId: string; uses: number };
  /** Sorts préparés et emplacements de niveau 1 au niveau 2. */
  level2: { prepared: number; slots: number };
}

/** Lanceurs de sorts au niveau 1 (règles 2024 : paladin et rôdeur lancent des sorts dès le niveau 1). */
export const CLASS_SPELLCASTING: Record<string, ClassSpellcasting> = {
  bard: { ability: "CHA", cantrips: 2, prepared: 4, slots: 2, level2: { prepared: 5, slots: 3 } },
  cleric: { ability: "WIS", cantrips: 3, prepared: 4, slots: 2, level2: { prepared: 5, slots: 3 } },
  druid: { ability: "WIS", cantrips: 2, prepared: 4, slots: 2, level2: { prepared: 5, slots: 3 } },
  paladin: { ability: "CHA", cantrips: 0, prepared: 2, slots: 2, level2: { prepared: 3, slots: 2 } },
  ranger: { ability: "WIS", cantrips: 0, prepared: 2, slots: 2, level2: { prepared: 3, slots: 2 }, alwaysPrepared: ["hunters-mark"], free: { spellId: "hunters-mark", uses: 2 } },
  sorcerer: { ability: "CHA", cantrips: 4, prepared: 2, slots: 2, level2: { prepared: 4, slots: 3 } },
  warlock: { ability: "CHA", cantrips: 2, prepared: 2, slots: 1, level2: { prepared: 3, slots: 2 } },
  wizard: { ability: "INT", cantrips: 3, prepared: 4, slots: 2, level2: { prepared: 5, slots: 3 } },
};

/** Nombre de sorts mineurs et préparés et d'emplacements de niveau 1 d'une classe à un niveau (1 ou 2). */
export function spellCountsFor(classId: string, level = 1): { cantrips: number; prepared: number; slots: number } {
  const cfg = CLASS_SPELLCASTING[classId];
  if (!cfg) return { cantrips: 0, prepared: 0, slots: 0 };
  return level >= 2 ? { cantrips: cfg.cantrips, ...cfg.level2 } : { cantrips: cfg.cantrips, prepared: cfg.prepared, slots: cfg.slots };
}

/** Sorts qu'une classe peut choisir : mineurs ou de niveau 1 (hors sorts toujours préparés). */
export function spellsFor(classId: string, level: 0 | 1): SpellDef[] {
  const always = CLASS_SPELLCASTING[classId]?.alwaysPrepared ?? [];
  return SPELLS.filter((s) => s.level === level && s.classes.includes(classId) && !always.includes(s.id));
}

/** Choix par défaut : d'abord les sorts jouables en combat, dans l'ordre de la liste. */
export function defaultSpells(classId: string): { cantrips: string[]; prepared: string[] } {
  const cfg = CLASS_SPELLCASTING[classId];
  if (!cfg) return { cantrips: [], prepared: [] };
  const pick = (level: 0 | 1, n: number) => {
    const all = spellsFor(classId, level);
    return [...all.filter(isPlayable), ...all.filter((s) => !isPlayable(s))].slice(0, n).map((s) => s.id);
  };
  return { cantrips: pick(0, cfg.cantrips), prepared: pick(1, cfg.prepared) };
}
