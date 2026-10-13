/**
 * Textes de la page Aide : explications rédigées en français (texte original, pas une citation du SRD)
 * des capacités de niveau 1, des traits d'espèce, des dons d'origine et des règles de base.
 * Les clés reprennent exactement les noms affichés dans `classes.ts`, `species.ts` et `backgrounds.ts`.
 */

export const CLASS_FEATURE_TEXT: Record<string, Record<string, string>> = {
  barbarian: {
    "Rage": "Action bonus : tu entres en rage (2 utilisations, récupérées au repos long). En rage, tu as l'avantage aux jets de Force, +2 aux dégâts des attaques de Force et une résistance aux dégâts contondants, perforants et tranchants. Tu ne peux pas lancer de sorts, et la rage est impossible en armure lourde.",
    "Défense sans armure": "Sans armure, ta CA vaut 10 + Dextérité + Constitution (tu peux garder un bouclier).",
    "Maîtrise des armes": "Tu débloques l'effet spécial de 2 types d'armes de mêlée de ton choix (par exemple repousser ou entailler l'adversaire).",
  },
  bard: {
    "Inspiration bardique": "Action bonus : tu donnes à un allié qui t'entend un dé d'inspiration (d6). Dans l'heure qui suit, il peut l'ajouter à un jet de d20 raté. Utilisable autant de fois que ton modificateur de Charisme (au moins 1), récupéré au repos long.",
    "Incantation": "Tu lances des sorts avec le Charisme : quelques tours de magie et des sorts de niveau 1 de la liste du barde. Un instrument de musique te sert de focaliseur.",
  },
  cleric: {
    "Incantation": "Tu lances des sorts divins avec la Sagesse. Chaque jour, tu prépares une sélection de sorts de la liste du clerc.",
    "Ordre divin": "Tu choisis ton rôle : Protecteur (armures lourdes et armes martiales) ou Thaumaturge (un tour de magie de plus et un bonus aux jets d'Arcanes et de Religion).",
  },
  druid: {
    "Incantation": "Tu lances des sorts de la nature avec la Sagesse, en préparant chaque jour ceux que tu veux utiliser.",
    "Druidique": "Tu connais la langue secrète des druides, et tu as toujours préparé le sort Communication avec les animaux.",
    "Ordre primordial": "Tu choisis ton rôle : Gardien (armes martiales et armure intermédiaire) ou Magicien (un tour de magie de plus et un bonus aux jets d'Arcanes et de Nature).",
  },
  fighter: {
    "Style de combat": "Tu obtiens un don de style de combat, par exemple Archerie (+2 aux attaques à distance) ou Défense (+1 de CA quand tu portes une armure).",
    "Second souffle": "Action bonus : tu récupères 1d10 + ton niveau en PV. 2 utilisations ; une revient après un repos court, toutes après un repos long.",
    "Maîtrise des armes": "Tu débloques l'effet spécial de 3 types d'armes de ton choix.",
  },
  monk: {
    "Arts martiaux": "Tes frappes à mains nues font 1d6 de dégâts, tu peux utiliser la Dextérité à la place de la Force pour les attaquer, et tu peux porter une frappe supplémentaire en action bonus après avoir attaqué.",
    "Défense sans armure": "Sans armure ni bouclier, ta CA vaut 10 + Dextérité + Sagesse.",
  },
  paladin: {
    "Imposition des mains": "Tu disposes d'une réserve de soins de 5 × ton niveau en PV. Action bonus : touche une créature pour lui rendre autant de PV que tu le souhaites, pris dans cette réserve. Elle se recharge au repos long.",
    "Incantation": "Tu lances des sorts sacrés avec le Charisme, en préparant ceux que tu veux utiliser.",
    "Maîtrise des armes": "Tu débloques l'effet spécial de 2 types d'armes de ton choix.",
  },
  ranger: {
    "Incantation": "Tu lances des sorts avec la Sagesse, en préparant chaque jour ceux que tu veux utiliser.",
    "Ennemi juré": "Tu as toujours préparé le sort Marque du chasseur et tu peux le lancer gratuitement quelques fois par repos long.",
    "Maîtrise des armes": "Tu débloques l'effet spécial de 2 types d'armes de ton choix.",
  },
  rogue: {
    "Expertise": "Tu choisis 2 compétences que tu maîtrises déjà : ton bonus de maîtrise y est doublé.",
    "Attaque sournoise": "Une fois par tour, tes attaques infligent 1d6 de dégâts en plus si tu as l'avantage ou si un allié est au contact de la cible (arme à distance ou à finesse).",
    "Argot des voleurs": "Tu connais le langage codé des voleurs, ainsi qu'une autre langue.",
    "Maîtrise des armes": "Tu débloques l'effet spécial de 2 types d'armes de ton choix.",
  },
  sorcerer: {
    "Incantation": "Tu lances des sorts avec le Charisme : ta magie est innée, tu n'as pas besoin de livre.",
    "Magie innée": "Action bonus : pendant 1 minute, le DD de tes sorts augmente de 1 et tu as l'avantage aux jets d'attaque de tes sorts. 2 utilisations, récupérées au repos long.",
  },
  warlock: {
    "Invocations occultes": "Tu choisis une invocation : un petit pouvoir magique permanent qui personnalise ton occultiste.",
    "Magie de pacte": "Tu as peu d'emplacements de sorts, mais ils reviennent après un repos court et sont toujours lancés à leur niveau maximal. Ta caractéristique d'incantation est le Charisme.",
  },
  wizard: {
    "Incantation": "Tu lances des sorts avec l'Intelligence, à partir de ton grimoire où tu consignes tes sorts.",
    "Adepte des rituels": "Tu peux lancer en rituel (sans emplacement, en 10 minutes de plus) les sorts rituels de ton grimoire, même s'ils ne sont pas préparés.",
    "Récupération arcanique": "Une fois par jour, après un repos court, tu récupères des emplacements de sorts déjà dépensés (leur niveau total ne peut pas dépasser la moitié de ton niveau de magicien, arrondi au supérieur).",
  },
};

export const SPECIES_TRAIT_TEXT: Record<string, Record<string, string>> = {
  dragonborn: {
    "Ascendance draconique": "Tu choisis un dragon (chromatique ou métallique) : il détermine le type de dégâts de ton souffle et de ta résistance.",
    "Arme de souffle": "Au lieu d'une attaque, tu exhales de l'énergie en cône : les créatures touchées font un jet de sauvegarde de Dextérité ou subissent des dégâts (1d10 au niveau 1) du type de ton ascendance. Utilisable autant de fois que ton bonus de maîtrise, par repos long.",
    "Résistance aux dégâts": "Tu résistes au type de dégâts de ton ascendance : tu n'en subis que la moitié.",
    "Vision dans le noir": "Tu vois dans l'obscurité jusqu'à 18 m (60 pieds).",
    "Vol draconique (niv. 5)": "Au niveau 5, tu peux faire apparaître des ailes spectrales et voler pendant 10 minutes, une fois par repos long.",
  },
  dwarf: {
    "Vision dans le noir (36 m)": "Tu vois dans l'obscurité jusqu'à 36 m (120 pieds).",
    "Résilience naine (poison)": "Tu résistes aux dégâts de poison et tu as l'avantage aux jets de sauvegarde contre l'état empoisonné.",
    "Robustesse naine (+1 PV par niveau)": "Tes PV maximum augmentent de 1 à chaque niveau, y compris le premier.",
    "Connaissance de la pierre": "Action bonus : pendant 10 minutes, tu perçois les vibrations de la pierre autour de toi (vision à 18 m si tu touches la pierre). Utilisable autant de fois que ton bonus de maîtrise, par repos long.",
  },
  elf: {
    "Vision dans le noir": "Tu vois dans l'obscurité jusqu'à 18 m (60 pieds).",
    "Lignées elfiques (drow, haut-elfe, elfe des bois)": "Ta lignée apporte des sorts et un petit avantage : le drow voit plus loin dans le noir, le haut-elfe maîtrise un tour de magie des arcanes, l'elfe des bois est plus rapide.",
    "Ascendance féerique": "Tu as l'avantage aux jets de sauvegarde pour ne pas être charmé.",
    "Sens aiguisés": "Tu maîtrises une compétence au choix parmi Perspicacité, Perception et Survie.",
    "Transe": "Tu n'as pas besoin de dormir : 4 heures de méditation consciente te suffisent pour un repos long.",
  },
  gnome: {
    "Vision dans le noir": "Tu vois dans l'obscurité jusqu'à 18 m (60 pieds).",
    "Ruse gnome": "Tu as l'avantage aux jets de sauvegarde d'Intelligence, de Sagesse et de Charisme.",
    "Lignées gnomes (forêt ou roche)": "Le gnome des forêts a des talents d'illusion et parle aux petits animaux ; le gnome des roches est un bricoleur qui fabrique de petits mécanismes.",
  },
  goliath: {
    "Ascendance de géant": "Tu choisis une faveur surnaturelle héritée des géants (froid, feu, foudre, pierre…), utilisable autant de fois que ton bonus de maîtrise, par repos long.",
    "Forme de grande taille (niv. 5)": "Au niveau 5, tu peux devenir de taille Grande pendant 10 minutes, une fois par repos long.",
    "Constitution imposante": "Tu as l'avantage pour te libérer d'une empoigne, et tu comptes comme une taille au-dessus pour la capacité de charge.",
  },
  halfling: {
    "Brave": "Tu as l'avantage aux jets de sauvegarde contre l'état effrayé.",
    "Agilité halfeline": "Tu peux traverser l'espace d'une créature plus grande que toi.",
    "Chance": "Quand tu obtiens un 1 sur un d20 (jet d'attaque, de caractéristique ou de sauvegarde), tu dois relancer le dé et garder le nouveau résultat.",
    "Naturellement discret": "Tu peux te cacher derrière une créature de taille Moyenne ou plus grande.",
  },
  human: {
    "Ingénieux": "À chaque repos long, tu gagnes l'inspiration héroïque : un dé que tu peux relancer plus tard pour retenter un jet raté.",
    "Doué": "Tu maîtrises une compétence supplémentaire de ton choix.",
    "Polyvalent": "Tu obtiens un don d'origine de ton choix, en plus de celui de ton historique.",
  },
  orc: {
    "Poussée d'adrénaline": "Action bonus : tu te précipites (course) et tu gagnes des PV temporaires égaux à ton bonus de maîtrise. Utilisable autant de fois que ce bonus, par repos court ou long.",
    "Vision dans le noir (36 m)": "Tu vois dans l'obscurité jusqu'à 36 m (120 pieds).",
    "Endurance implacable": "Une fois par repos long, quand tu tombes à 0 PV sans mourir sur le coup, tu restes à 1 PV.",
  },
  tiefling: {
    "Héritage fiélon": "Tu choisis un héritage (abyssal, chtonien ou infernal) qui t'accorde une résistance (poison, nécrotique ou feu) et quelques sorts.",
    "Présence d'un autre monde": "Tu connais le tour de magie Thaumaturgie.",
    "Vision dans le noir": "Tu vois dans l'obscurité jusqu'à 18 m (60 pieds).",
  },
};

export const FEAT_TEXT: Record<string, string> = {
  "Initié à la magie (Clerc)": "Tu apprends 2 tours de magie et un sort de niveau 1 de la liste du clerc. Tu peux lancer ce sort de niveau 1 une fois par repos long sans emplacement.",
  "Initié à la magie (Magicien)": "Tu apprends 2 tours de magie et un sort de niveau 1 de la liste du magicien. Tu peux lancer ce sort de niveau 1 une fois par repos long sans emplacement.",
  "Vigilant": "Tu ajoutes ton bonus de maîtrise à tes jets d'initiative, et tu peux échanger ton initiative avec celle d'un allié consentant.",
  "Frappeur sauvage": "Une fois par tour, quand tu touches avec une arme, tu peux relancer les dés de dégâts et garder le meilleur résultat.",
};

export const BACKGROUND_TEXT: Record<string, string> = {
  acolyte: "Tu as grandi au service d'un temple, à étudier les textes sacrés et à accomplir les rites. Tu connais la religion et les gens de foi.",
  criminal: "Tu as vécu de combines et d'activités en marge de la loi. Tu sais te faire discret et repérer le danger.",
  sage: "Tu as passé des années à étudier dans des bibliothèques ou auprès d'un maître. Tu cherches les réponses dans les livres.",
  soldier: "Tu as appris le combat dans une armée ou une milice. Tu connais la discipline, les armes et la vie de campagne.",
};

export const ABILITY_HELP: { id: string; name: string; text: string }[] = [
  { id: "STR", name: "Force", text: "Puissance physique : attaques de mêlée avec la plupart des armes, saut, escalade, port de charges. Athlétisme." },
  { id: "DEX", name: "Dextérité", text: "Agilité et réflexes : armes à distance et à finesse, CA en armure légère, initiative. Acrobaties, Escamotage, Discrétion." },
  { id: "CON", name: "Constitution", text: "Endurance et santé : points de vie à chaque niveau, résistance aux poisons et à la fatigue. Aucune compétence, mais utile à tous." },
  { id: "INT", name: "Intelligence", text: "Raisonnement et mémoire : magie du magicien. Arcanes, Histoire, Investigation, Nature, Religion." },
  { id: "WIS", name: "Sagesse", text: "Perception et intuition : magie des clercs, druides et rôdeurs. Dressage, Perspicacité, Médecine, Perception, Survie." },
  { id: "CHA", name: "Charisme", text: "Force de personnalité : magie du barde, du paladin, de l'ensorceleur et de l'occultiste. Tromperie, Intimidation, Représentation, Persuasion." },
];

export interface RuleEntry {
  title: string;
  text: string;
}

export const BASIC_RULES: RuleEntry[] = [
  { title: "Le jet de d20", text: "Presque tout se résout en lançant un d20, auquel on ajoute des modificateurs, et on compare le total à une difficulté. Pour une attaque, la difficulté est la classe d'armure (CA) de la cible : si ton total est supérieur ou égal, tu touches." },
  { title: "Modificateur de caractéristique", text: "Chaque caractéristique a un score (autour de 8 à 17 au début) et un modificateur : (score − 10) divisé par 2, arrondi à l'inférieur. Un score de 10 donne +0, 14 donne +2, 8 donne −1." },
  { title: "Bonus de maîtrise", text: "Tu l'ajoutes aux jets pour lesquels tu es compétent (compétences, jets de sauvegarde, armes). Il vaut +2 au niveau 1 et augmente avec le niveau, jusqu'à +6." },
  { title: "Avantage et désavantage", text: "Avec l'avantage, tu lances deux d20 et gardes le meilleur ; avec le désavantage, tu gardes le pire. S'il y a les deux, ils s'annulent." },
  { title: "Coup critique et échec critique", text: "Un 20 naturel sur une attaque touche toujours et fait un coup critique : tu lances deux fois les dés de dégâts. Un 1 naturel rate toujours." },
  { title: "Points de vie (PV)", text: "Ils mesurent ta résistance. Au niveau 1, tu as le dé de vie de ta classe au maximum, plus ton modificateur de Constitution. À 0 PV, un ennemi est vaincu ; un héros tombe inconscient." },
  { title: "Classe d'armure (CA)", text: "Elle indique la difficulté pour te toucher. Sans armure, elle vaut 10 + ton modificateur de Dextérité (certaines classes ont une formule différente)." },
  { title: "Initiative", text: "Au début d'un combat, chacun lance un d20 et ajoute son modificateur de Dextérité. On joue ensuite dans l'ordre décroissant, round après round." },
  { title: "Un tour de combat (dans l'application)", text: "À votre tour, vous choisissez une action : Attaquer une cible ou Esquiver (désavantage aux attaques contre vous jusqu'à votre prochain tour). Les ennemis jouent ensuite à leur tour. Pour l'instant, il n'y a ni déplacement ni action bonus." },
  { title: "Jets de mort", text: "À 0 PV, un héros est inconscient et lance un d20 à chaque tour : 10 ou plus est une réussite, moins de 10 un échec, un 1 compte pour deux échecs, un 20 le relève avec 1 PV. Trois réussites le stabilisent, trois échecs le tuent. Un coup reçu à terre compte comme un échec." },
  { title: "Repos", text: "Un repos court (1 heure) et un repos long (8 heures) permettent de récupérer des capacités et des PV. Ils ne sont pas encore gérés dans l'application." },
];
