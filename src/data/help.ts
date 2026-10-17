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
    "Style de combat": "Tu obtiens un don de style de combat : Archerie (+2 aux attaques à distance), Défense (+1 de CA en armure), Armes à deux mains (un 1 ou un 2 aux dés de dégâts compte comme un 3) ou Deux armes (tu ajoutes ton modificateur à la seconde arme légère).",
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
    "Invocations occultes": "Tu choisis une invocation : un petit pouvoir magique permanent — Armure d'ombres, Décharge agonisante ou Lance occulte dans l'application.",
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
    "Vision dans le noir": "Tu vois dans l'obscurité jusqu'à 18 m.",
    "Vol draconique (niv. 5)": "Au niveau 5, tu peux faire apparaître des ailes spectrales et voler pendant 10 minutes, une fois par repos long.",
  },
  dwarf: {
    "Vision dans le noir (36 m)": "Tu vois dans l'obscurité jusqu'à 36 m.",
    "Résilience naine (poison)": "Tu résistes aux dégâts de poison et tu as l'avantage aux jets de sauvegarde contre l'état empoisonné.",
    "Robustesse naine (+1 PV par niveau)": "Tes PV maximum augmentent de 1 à chaque niveau, y compris le premier.",
    "Connaissance de la pierre": "Action bonus : pendant 10 minutes, tu perçois les vibrations de la pierre autour de toi (vision à 18 m si tu touches la pierre). Utilisable autant de fois que ton bonus de maîtrise, par repos long.",
  },
  elf: {
    "Vision dans le noir": "Tu vois dans l'obscurité jusqu'à 18 m.",
    "Lignées elfiques (drow, haut-elfe, elfe des bois)": "Ta lignée apporte des sorts et un petit avantage : le drow voit plus loin dans le noir, le haut-elfe maîtrise un tour de magie des arcanes, l'elfe des bois est plus rapide.",
    "Ascendance féerique": "Tu as l'avantage aux jets de sauvegarde pour ne pas être charmé.",
    "Sens aiguisés": "Tu maîtrises une compétence au choix parmi Perspicacité, Perception et Survie.",
    "Transe": "Tu n'as pas besoin de dormir : 4 heures de méditation consciente te suffisent pour un repos long.",
  },
  gnome: {
    "Vision dans le noir": "Tu vois dans l'obscurité jusqu'à 18 m.",
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
    "Vision dans le noir (36 m)": "Tu vois dans l'obscurité jusqu'à 36 m.",
    "Endurance implacable": "Une fois par repos long, quand tu tombes à 0 PV sans mourir sur le coup, tu restes à 1 PV.",
  },
  tiefling: {
    "Héritage fiélon": "Tu choisis un héritage (abyssal, chtonien ou infernal) qui t'accorde une résistance (poison, nécrotique ou feu) et quelques sorts.",
    "Présence d'un autre monde": "Tu connais le tour de magie Thaumaturgie.",
    "Vision dans le noir": "Tu vois dans l'obscurité jusqu'à 18 m.",
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
  { title: "Avantage et désavantage", text: "Avec l'avantage, tu lances deux d20 et gardes le meilleur ; avec le désavantage, tu gardes le pire. S'il y a les deux, ils s'annulent. Dans l'application, l'avantage et le désavantage viennent de l'esquive, de la Magie innée, d'Éclair guidé, de Moquerie cruelle et des états (voir « États ») ; la raison est écrite sous le jet." },
  { title: "Coup critique et échec critique", text: "Un 20 naturel sur une attaque touche toujours et fait un coup critique : tu lances deux fois les dés de dégâts. Un 1 naturel rate toujours." },
  { title: "Points de vie (PV)", text: "Ils mesurent ta résistance. Au niveau 1, tu as le dé de vie de ta classe au maximum, plus ton modificateur de Constitution. À 0 PV, un ennemi est vaincu ; un héros tombe inconscient." },
  { title: "Classe d'armure (CA)", text: "Elle indique la difficulté pour te toucher. Sans armure, elle vaut 10 + ton modificateur de Dextérité (le barbare ajoute sa Constitution, le moine sa Sagesse). Une armure remplace ce calcul, un bouclier ajoute 2." },
  { title: "Armures et boucliers", text: "Une armure légère donne sa CA de base + ta Dextérité ; une armure intermédiaire, sa CA de base + ta Dextérité (au maximum +2) ; une armure lourde, une CA fixe sans Dextérité, avec une Force minimale (en dessous, ta vitesse baisse de 3 m). Chaque classe ne sait porter que certaines armures : voir sa fiche. Le détail de chaque armure est dans Armures." },
  { title: "Armes et maîtrise", text: "Une attaque d'arme utilise la Force (mêlée) ou la Dextérité (distance, ou arme à finesse). Si ta classe maîtrise l'arme, tu ajoutes ton bonus de maîtrise au jet d'attaque ; sinon non. Les dégâts ajoutent le même modificateur. Le détail de chaque arme est dans Armes." },
  { title: "Propriétés d'armes", text: "Finesse, légère, lourde, deux mains, lancer, polyvalente, munitions : chaque propriété est expliquée dans la fiche des armes qui la portent, avec ce que le jeu applique déjà et ce qu'il n'applique pas encore." },
  { title: "Distances et unités", text: "Toutes les distances sont en mètres : une case de combat mesure 1,5 m, une vitesse de 9 m permet de parcourir six cases par tour. Les règles d'origine comptent en pieds (5 pieds = 1,5 m) ; l'application les convertit pour vous." },
  { title: "Initiative", text: "Au début d'un combat, chacun lance un d20 et ajoute son modificateur de Dextérité. On joue ensuite dans l'ordre décroissant, round après round." },
  { title: "Un tour de combat (dans l'application)", text: "À votre tour, vous avez une action et, selon votre classe, une action bonus. L'action : Attaquer une cible (avec l'arme de votre choix), lancer un sort, Esquiver (désavantage aux attaques contre vous jusqu'à votre prochain tour), Foncer (déplacement doublé), Se désengager ou Se libérer (quand une toile vous entrave). Vous pouvez aussi vous déplacer (voir « Combat sur le terrain »). L'action bonus (Second souffle, Rage, Imposition des mains, Magie innée, Inspiration bardique, frappe bonus du moine, seconde arme légère, potion de soin, sorts à action bonus) se prend avant ou après l'action. Le tour se termine tout seul quand il ne reste rien d'utile à faire (action utilisée, plus d'action bonus ni de déplacement) ; sinon, « Terminer le tour ». Les ennemis jouent ensuite. Pour l'instant, le déplacement existe sur la carte d'exploration (voir « Déplacement et carte ») et pendant le combat (voir « Combat sur le terrain ») ; les seules réactions sont les sorts Bouclier et Représailles infernales (voir « Réactions »)." },
  { title: "Sorts, sorts mineurs et emplacements", text: "Un sort mineur se lance à volonté. Un sort de niveau 1 consomme un emplacement de sort de niveau 1 ; vos emplacements restent dépensés d'un combat à l'autre et reviennent au repos long (voir « Repos »). Vous ne lancez que les sorts choisis à la création : sorts mineurs connus et sorts de niveau 1 préparés. Le rôdeur lance Marque du chasseur gratuitement deux fois avant d'utiliser un emplacement." },
  { title: "Attaque de sort et DD des sauvegardes", text: "Une attaque de sort ajoute votre bonus de maîtrise et le modificateur de votre caractéristique d'incantation. Contre un sort à sauvegarde, la cible lance un d20 plus son modificateur : elle évite le sort (ou n'en subit que la moitié des dégâts, selon le sort) si elle atteint votre DD, égal à 8 + maîtrise + modificateur d'incantation. Les dégâts d'un sort à sauvegarde ne font jamais de coup critique." },
  { title: "Concentration", text: "Certains sorts durent tant que vous restez concentré (Maléfice, Marque du chasseur, Bouclier de la foi…). Un seul sort de concentration à la fois : en lancer un autre met fin au premier. Chaque fois que vous subissez des dégâts, vous lancez un jet de sauvegarde de Constitution contre un DD de 10 ou de la moitié des dégâts si c'est plus : en cas d'échec, le sort prend fin. Tomber à 0 PV, ou être neutralisé, étourdi ou paralysé, y met fin aussi." },
  { title: "Sorts de zone", text: "Mains brûlantes, Vague tonnante et Enchevêtrement touchent tous les ennemis d'une zone, pas seulement la cible. Vous choisissez un ennemi à viser, et le bouton indique d'avance qui sera touché. Mains brûlantes : un cône de 3 cases (4,5 m) qui part de vous vers la cible, ouvert à 90°. Vague tonnante : un cube de 3 × 3 cases (4,5 m) collé à vous, dans la direction de la cible. Enchevêtrement : un carré de 4 × 4 cases (6 m) centré sur la cible, à 27 m au plus. Les murs, arbres et portes fermées arrêtent la zone (sauf pour Enchevêtrement, posé sur la cible). Chaque créature touchée fait son propre jet de sauvegarde ; les dégâts sont lancés une seule fois pour toute la zone, puis réduits de moitié pour celles qui réussissent. La poussée de Vague tonnante et le terrain difficile d'Enchevêtrement ne sont pas appliqués." },
  { title: "Sorts à action bonus", text: "Si vous lancez un sort avec votre action bonus (Mot de guérison, Maléfice, Bouclier de la foi…), vos autres sorts du tour se limitent à un sort mineur d'une action ; de même, après un sort de niveau 1 d'une action, un sort à action bonus n'est plus permis. L'application grise le sort et vous dit pourquoi." },
  { title: "Capacités à utilisations limitées", text: "Beaucoup de capacités de classe ne se servent que quelques fois (2 Rages, 2 Seconds souffles…) : les utilisations restantes sont indiquées sur le bouton. Les utilisations restantes (et vos PV) sont conservées d'un combat à l'autre ; elles reviennent par les repos (voir « Repos »)." },
  { title: "Jets de mort", text: "À 0 PV, un héros est inconscient et lance un d20 à chaque tour : 10 ou plus est une réussite, moins de 10 un échec, un 1 compte pour deux échecs, un 20 le relève avec 1 PV. Trois réussites le stabilisent, trois échecs le tuent. Un coup reçu à terre compte comme un échec." },
  { title: "États (empoisonné, à terre, paralysé…)", text: "Un état est un effet qui change ce que peut faire une créature. Appliqués en combat : empoisonné, effrayé, aveuglé et entravé (désavantage à vos attaques) ; à terre (désavantage à vos attaques ; les attaques au corps à corps contre vous ont l'avantage, celles à distance un désavantage) ; neutralisé, étourdi et paralysé (le tour est passé, les attaques contre vous ont l'avantage, la concentration est perdue ; étourdi et paralysé ratent leurs jets de Force et de Dextérité ; un coup au corps à corps contre un paralysé est un critique) ; entravé donne aussi un désavantage aux jets de Dextérité. Un état se termine par la durée, par un jet de sauvegarde à la fin de chaque tour de la victime, ou quand le lanceur perd sa concentration. Un héros à terre se relève au début de son tour. Les 15 états sont décrits dans le menu Aide → États, avec ce que le jeu applique ou non (charmé, assourdi, épuisement, agrippé, invisible et pétrifié ne le sont pas encore)." },
  { title: "Déplacement et carte", text: "Sur la carte, une case fait 1,5 m (9 m = 6 cases ; vitesse de 10,5 m = 7 cases). Un pas vers une case voisine, diagonale comprise, compte pour une case ; une diagonale ne peut pas couper le coin d'un mur ou d'un arbre. Les murs, les arbres et l'eau bloquent le passage ; les chemins, les dalles, les portes et les ponts sont praticables. Vous voyez à 12 m (8 cases) ; les murs, les arbres et les portes fermées bloquent la vue, et vous ne voyez pas derrière. Ce que vous avez déjà vu reste affiché en grisé, le reste est dans le noir. Pour l'instant, l'exploration est libre : le déplacement n'est pas limité par votre vitesse, seule la distance parcourue s'affiche. Le déplacement pendant le combat suit les mêmes cases (voir « Combat sur le terrain »)." },
  { title: "Combat sur le terrain", text: "Un combat se joue sur un terrain en cases de 1,5 m : celui de la carte quand il est lancé depuis la carte (chacun à sa place), une clairière sinon. Pendant votre tour, vous pouvez vous déplacer jusqu'à votre vitesse (9 m = 6 cases) avant, après ou entre vos actions : touchez une case pour voir le trajet, touchez-la à nouveau pour y aller. Vous ne traversez pas les créatures ni les obstacles. Le tour ne se termine plus tout seul tant qu'il vous reste du déplacement : touchez « Terminer le tour ». Attaque au corps à corps : l'ennemi doit être au contact (case voisine, diagonale comprise). Arme à distance ou sort : la cible doit être à portée et en ligne de vue (les murs, arbres et portes fermées bloquent) ; entre la portée normale et la portée maximale de l'arme, l'attaque a un désavantage ; au-delà, elle est impossible. Une attaque à distance faite au contact d'un ennemi qui peut agir a aussi un désavantage. S'éloigner d'un ennemi au contact lui donne une attaque d'opportunité (une par round et par ennemi), sauf si vous vous êtes désengagé. Foncer (action) double votre déplacement du tour ; Se désengager (action) supprime les attaques d'opportunité de ce tour. Les ennemis avancent vers le héros le plus proche à leur vitesse (un zombie 6 m, un loup 12 m) puis attaquent s'ils arrivent au contact ; entravés, ils ne bougent pas. Ils ont aussi des tactiques : ceux qui ont une arme à distance (gobelin, squelette, bandit, orc, kobold) tirent quand vous êtes à portée au lieu de s'approcher, l'archer (bandit) recule pour garder ses distances, et les lâches (gobelin, kobold, bandit, rat, loup) fuient quand ils sont gravement blessés puis quittent le combat — sans butin si aucun ennemi n'a été vaincu (voir Aide → Bestiaire). Simplifications : les créatures ne s'empilent jamais, un déplacement diagonal compte pour une case, les attaques d'opportunité ne laissent pas le temps de lancer Bouclier, et les sorts de zone ne tiennent pas compte du terrain difficile ni des alliés (le héros est seul)." },
  { title: "Réactions", text: "Une réaction est une action spéciale qui se déclenche en réponse à un événement, même hors de votre tour. Vous en avez une par round : elle revient au début de votre tour. Dans l'application, les réactions sont des sorts : Bouclier (+5 à votre CA jusqu'au début de votre prochain tour, y compris contre l'attaque qui vient de vous toucher, qui peut alors rater) et Représailles infernales (l'ennemi qui vient de vous blesser fait un jet de Dextérité ou subit 2d10 de feu, la moitié s'il réussit). Quand un ennemi vous touche, le combat s'arrête et vous demande si vous voulez lancer la réaction (elle coûte un emplacement de sort de niveau 1) ; après le coup, Représailles infernales est proposé de la même façon. Un 20 naturel touche malgré Bouclier. Les ennemis ont des attaques d'opportunité quand vous vous éloignez d'eux (voir « Combat sur le terrain ») ; pas encore gérées : vos propres attaques d'opportunité et les autres réactions des ennemis." },
  { title: "Sac à dos, butin et boutique", text: "Votre sac à dos contient vos pièces d'or et vos objets : potions de soin, trésors à vendre, objets de quête (la clé de la crypte, le journal du gardien…). Il se consulte sur la fiche du personnage. Le butin vient de trois sources : les ennemis vaincus sur la carte (un peu d'or, parfois un objet), les coffres et les récompenses de l'histoire. À la fin d'un combat gagné, le butin est affiché. Une potion de soin rend 2d4 + 2 PV : hors combat, on la boit depuis la fiche (bouton « Boire ») ; en combat, la boire coûte une action bonus. À Brumeval, l'aubergiste vend des potions (50 po) et rachète les gemmes ; la forgeronne vend et rachète armes et armures (à la moitié du prix). Les prix du SRD sont écrits de mémoire et arrondis à 1 po au minimum ; les objets de quête ne se vendent pas. Les armes et armures s'équipent et se rangent depuis la fiche (voir « Équipement, armes et armures »). Pas encore gérés : les objets magiques, le poids porté, les munitions et la réparation." },
  { title: "Équipement, armes et armures", text: "Sur la fiche, la section « Équipement » liste ce que vous portez : « Ranger » met une arme, l'armure ou le bouclier dans le sac à dos ; « Équiper » (dans le sac) l'enfile ou le prend en main. Changer d'équipement recalcule aussitôt la classe d'armure, la vitesse et les attaques. Une nouvelle armure remplace la précédente, qui retourne dans le sac. Armure : si vous n'avez pas la Force requise (armures lourdes), votre vitesse baisse de 3 m ; si votre classe ne maîtrise pas l'armure ou le bouclier, vos attaques ont un désavantage et vous ne pouvez lancer aucun sort. Armes : sans la maîtrise, vous n'ajoutez pas votre bonus de maîtrise ; les propriétés Légère, Lourde, Deux mains, Allonge, Finesse, Lancer et Polyvalente sont appliquées (voir la fiche de chaque arme). Sans arme en main, il reste toujours « Coup à mains nues » (1 + Force). Pas encore appliquées : les munitions (illimitées) et la durée pour enfiler une armure." },
  { title: "Maîtrises d'armes, Attaque sournoise et Inspiration bardique", text: "Guerrier (3 armes), barbare, paladin, rôdeur et roublard (2 armes chacun) maîtrisent l'effet spécial de certaines armes : Enchaînement (frappe une seconde créature au contact de la première), Écorchure (dégâts même en cas d'échec), Entaille (seconde arme légère sans action bonus), Poussée (repousse de 3 m), Sape (désavantage à la prochaine attaque de la cible), Ralentissement (−3 m de vitesse), Renversement (jet de Constitution ou à terre) et Gêne (avantage à votre prochaine attaque contre la cible). Chaque arme a sa maîtrise (voir sa fiche) ; sur votre fiche, la section « Maîtrises d'armes » permet de choisir les armes dont l'effet est actif. Attaque sournoise (roublard) : +1d6 une fois par tour avec une arme à finesse ou à distance quand votre attaque a l'avantage, sans désavantage ; le jeu ne connaît pas encore l'allié au contact de la cible, seconde condition des règles. Inspiration bardique (barde) : en action bonus, vous vous donnez un dé d'inspiration (d6) ajouté automatiquement à votre prochain jet d'attaque ou de sauvegarde raté s'il le transforme en réussite ; utilisations : modificateur de Charisme, par repos long." },
  { title: "Capacités des monstres", text: "Certains monstres ont des capacités spéciales, décrites dans la fiche de chaque monstre (Aide → Bestiaire). Appliquées : Tactique de meute (avantage quand un allié du monstre est au contact de sa cible : loup, rat géant, kobold), Robustesse des morts-vivants (le zombie reste parfois à 1 PV), Agressif (l'orc se déplace deux fois), la toile de l'araignée géante (entrave à distance ; vous vous libérez avec l'action « Se libérer », test de Force) et le venin de sa morsure (jet de Constitution ou dégâts de poison). Les monstres ont aussi des immunités (le squelette, le zombie et la goule ne peuvent pas être empoisonnés)." },
  { title: "Repos", text: "Un repos court (1 heure) et un repos long (8 heures) permettent de récupérer des capacités et des PV. Sur la fiche du personnage, la section « Ressources et repos » les propose. Repos court : vous choisissez combien de dés de vie dépenser (niveau 1 : un seul dé) ; chacun rend un jet de votre dé de vie + modificateur de Constitution en PV. Reviennent aussi : une utilisation de Second souffle ou de Rage, les emplacements de l'occultiste, et un emplacement du magicien (Récupération arcanique, une fois par repos long). Repos long : tous les PV, toutes les capacités, tous les emplacements de sort, et la moitié de vos dés de vie (au moins un). Simplifications : le repos se fait n'importe quand, sans risque ni durée ; un héros tombé à 0 PV est remis sur pied avec 1 PV à la fin du combat." },
];

/** Fonctionnement de l'application elle-même. À tenir à jour à chaque nouvelle fonctionnalité visible. */
export const APP_GUIDE: RuleEntry[] = [
  { title: "Créer un personnage", text: "Depuis l'accueil, « Créer un personnage » : donnez un nom, choisissez une espèce, une classe et un historique (le bouton ⓘ à côté des listes décrit chaque choix), répartissez vos caractéristiques, appliquez le bonus de l'historique, puis choisissez vos compétences de classe. Selon la classe, d'autres choix apparaissent : style de combat (guerrier), Ordre divin (clerc) ou primordial (druide), invocation occulte (occultiste), expertise sur deux compétences (roublard) ; les sorts, eux, se choisissent pour les lanceurs de sorts. Le bouton de création s'active quand tout est valide ; les messages en rouge indiquent ce qu'il reste à régler." },
  { title: "Répartir les caractéristiques", text: "Trois méthodes : le tableau standard (15, 14, 13, 12, 10 et 8, chacun une seule fois), l'achat de points (27 points à dépenser, scores de 8 à 15, les hauts scores coûtent plus cher) ou le tirage (4d6 dont on retire le plus bas, six fois). Les deux caractéristiques marquées ★ sont les plus utiles à votre classe." },
  { title: "Le bonus de l'historique", text: "Votre historique ajoute +2 à une caractéristique et +1 à une autre, ou +1 à trois, parmi les trois qu'il propose. Ce bonus s'ajoute à la répartition choisie, avec un maximum de 20." },
  { title: "Équipement de départ", text: "Chaque classe reçoit un équipement de départ : armure, bouclier, armes, matériel et quelques pièces d'or. Le guerrier choisit entre deux lots. L'écran de création montre le contenu et la CA obtenue. Votre fiche liste ensuite l'armure portée, vos armes, vos objets et votre or. L'équipement de l'historique et l'option « or à la place » ne sont pas encore disponibles." },
  { title: "Réactions en combat", text: "Si votre personnage a préparé Bouclier ou Représailles infernales et qu'il lui reste un emplacement de sort, un encadré « Réaction ? » apparaît quand un ennemi vous touche (puis après le coup pour Représailles infernales). Choisissez de lancer le sort ou « Ne pas réagir » : le combat reprend ensuite. Vous n'avez qu'une réaction par round." },
  { title: "États en combat", text: "Les états qui touchent un combattant s'affichent en jaune sous son nom (par exemple « paralysé »). Quand une règle donne un avantage ou un désavantage à un jet, la raison est écrite sous le jet de dés. Un héros neutralisé ou paralysé passe son tour automatiquement ; vous lancez tout de même son jet de sauvegarde de fin de tour. Les ennemis entravés (Enchevêtrement) essaient de se libérer au lieu d'attaquer." },
  { title: "Repos et ressources", text: "La fiche du personnage affiche vos PV actuels, vos dés de vie, vos utilisations de capacités et vos emplacements de sort restants, puis deux boutons : « Repos court » (avec le nombre de dés de vie à dépenser) et « Repos long ». Le résultat du repos s'affiche juste dessous. Les règles sont détaillées dans « Repos » (menu Aide → Règles)." },
  { title: "Suivre l'histoire", text: "Quand vous touchez un « ! » sur la carte et que vous confirmez, une scène s'ouvre : un texte, puis des choix. Certains choix sont des tests de compétence (le nom de la compétence est indiqué) : vous lancez un d20, vous ajoutez le bonus de la compétence (celui de votre fiche) et vous comparez au DD (difficulté) que vous ne voyez pas à l'avance ; sur une réussite l'histoire suit un chemin, sur un échec un autre. D'autres choix lancent un combat (en rouge) ou ne sont proposés que si vous avez fait certaines choses (accepter une quête, obtenir une clé, vaincre un ennemi…). L'application se souvient de vos choix et de l'or gagné avec le personnage ; les scènes s'adaptent. L'aventure « Les morts de Brumeval » se déroule en deux lieux : le village (la maire Odile, l'aubergiste Thibaud, le jeune Léo, la porte de la crypte) puis la crypte (un journal à lire, un coffre, une porte scellée, l'autel du gardien). Elle se termine chez la maire, avec une récompense en or. On peut la finir en combattant ou en apaisant le gardien de la crypte par la prière, si l'on a lu son journal et réussi un test de Religion. Si vous perdez un combat de l'histoire, vous vous réveillez au village avec 1 PV. Les objets gagnés ou achetés vont dans votre sac à dos (voir « Sac à dos, butin et boutique »). Pas encore gérés : les récompenses d'expérience et la montée de niveau (le personnage reste de niveau 1 à la fin de l'aventure)." },
  { title: "Équipement et boutiques", text: "Sur la fiche, « Équipement » permet de ranger une arme, l'armure ou le bouclier, et « Équiper » depuis le sac les remet. Dans le village, touchez un « ! » de marchand (la forge de Maëlle, l'auberge de Thibaud) puis « Voir les armes et armures à vendre » : l'onglet « Acheter » liste les articles avec leur prix en po (grisés si vous n'avez pas assez d'or), l'onglet « Vendre » vos objets du sac à la moitié de leur valeur. Un avertissement jaune signale une arme ou armure que votre classe ne maîtrise pas." },
  { title: "Sac à dos et potions", text: "Sur la fiche du personnage, la section « Sac à dos » liste vos pièces d'or et vos objets avec leur description. Le bouton « Boire » d'une potion de soin la consomme et vous rend des PV (inactif si vos PV sont au maximum). Pendant un combat, la potion apparaît dans « Action bonus » tant qu'il vous reste des PV à regagner. Vos potions restantes sont enregistrées à la fin du combat." },
  { title: "Explorer la carte", text: "Sur la fiche du personnage, « Explorer la carte » ouvre la carte de la région (pour l'instant « Brumeval et ses environs »). Touchez une case : le trajet s'affiche en points jaunes avec la distance en mètres, sans bouger. Touchez la même case une seconde fois pour confirmer : votre personnage y va en suivant ce chemin, case par case (touchez ailleurs pour changer de destination). Il s'arrête dès qu'un ennemi apparaît dans son champ de vision, et vous pouvez retoucher une case pour reprendre ou changer de route (touchez pendant la marche pour l'arrêter). Touchez un ennemi visible (puis confirmez) pour aller le combattre, ou touchez le bouton « Attaquer d'ici » qui apparaît alors pour lancer le combat sans vous approcher : le combat se joue sur la carte, chacun à sa place, et vous pouvez tirer à l'arc ou lancer un sort tant que la cible est à portée et visible ; arriver à son contact lance aussi la rencontre. Après une victoire, l'ennemi disparaît de la carte ; après une défaite, vous vous réveillez au village avec 1 PV. Vos PV et ressources sont ceux de votre fiche : reposez-vous entre deux combats (« Fiche et repos »). Votre position et les zones explorées sont enregistrées avec le personnage. Les « ! » jaunes sont des personnages ou des lieux : touchez-en un pour parler ou agir (voir « Suivre l'histoire »). Chacun est à sa place : Odile dans la mairie, Thibaud dans l'auberge, Maëlle dans sa forge (il faut entrer par la porte : un « ! » sur une porte signale quelqu'un à l'intérieur), Léo au bord de la rivière. Une porte entourée de rouge est verrouillée jusqu'à ce que vous l'ouvriez. Une légende sous la carte rappelle les symboles. Les cases sont dessinées avec des variantes (herbe fleurie, chemin de terre, dalles fissurées, eau à rives écumeuses, murs avec face avant et torches) ; le héros est entouré d'une lueur. Votre personnage (socle bleu, dessiné selon son espèce et sa classe), les ennemis (socle rouge) et les personnages du village (socle jaune avec un « ! ») sont de petits personnages en 2D. C'est purement visuel : cela ne change aucune règle. Un escalier ou une porte menant à une autre carte vous y emmène dès que vous marchez dessus : chaque carte garde en mémoire les zones que vous y avez explorées. Les ennemis ne restent pas à leur poste : tant qu'un ennemi vous voit (à 12 m, sans mur entre vous), il s'approche à chaque pas que vous faites, à sa propre vitesse (le loup va plus vite que vous, le zombie plus lentement) ; s'il vous rejoint, le combat commence. Il ne vous suit plus quand il vous perd de vue, mais il ne retourne pas à son poste tant que vous n'êtes pas battu (après une défaite, tous reprennent leur place). Vaincre un ennemi le retire de la carte pour de bon. Pas encore gérés : les objets posés par terre à ramasser et les pièges." },
  { title: "Terrain et déplacement en combat", text: "Pendant un combat, une grille de cases s'affiche sous la liste des combattants : votre personnage (socle bleu, entouré de jaune quand c'est son tour) et les ennemis (socle rouge), chacun avec une petite barre de PV au-dessus de la tête. À votre tour, la section « Déplacement » indique ce qu'il vous reste. Si l'arme choisie ne peut atteindre aucun ennemi (trop loin) mais qu'une arme à distance le peut, le jeu sélectionne celle-ci à votre place tant que vous n'avez pas choisi vous-même. Les boutons d'attaque affichent la distance en mètres et sont grisés avec la raison (« Hors de portée », « Pas de ligne de vue ») quand la cible est inaccessible ; « Foncer » et « Se désengager » sont dans « Action ». Les déplacements des ennemis se rejouent à l'écran avant leur attaque. Après une victoire lancée depuis la carte, votre personnage reste à l'endroit où le combat l'a mené." },
  { title: "Lancer un combat", text: "Sur la fiche d'un personnage, « Lancer un combat », puis choisissez une rencontre. Sa difficulté est indicative pour un personnage seul de niveau 1. Vous combattez avec les PV et les ressources qu'il vous reste ; si vous quittez le combat en cours, rien n'est reporté. À la fin du combat, vos PV et ressources sont enregistrés. Avant chaque attaque, choisissez l'arme ou le sort à utiliser : le bonus pour toucher et les dégâts sont affichés, et la meilleure option est proposée en premier. Le combat se joue sur un terrain en cases (voir « Combat sur le terrain »). Les munitions restent illimitées." },
  { title: "Capacités de classe en combat", text: "Pendant votre tour, vos capacités à action bonus apparaissent dans « Action bonus » avec leurs utilisations restantes : Second souffle du guerrier, Rage du barbare, Imposition des mains du paladin (choisissez combien de points dépenser), Magie innée de l'ensorceleur, frappe bonus du moine (après avoir attaqué). Elles ne s'affichent que quand elles sont utiles : pas de soins à pleine santé. Les autres capacités ne sont pas encore jouables : l'Aide indique pour chacune si elle est appliquée. Les effets en cours (Rage, Magie innée) sont signalés dans la liste des combattants." },
  { title: "Choisir et lancer ses sorts", text: "Les classes qui lancent des sorts (barde, clerc, druide, ensorceleur, magicien, occultiste, paladin, rôdeur) choisissent leurs sorts mineurs et leurs sorts de niveau 1 à la création : une sélection est déjà cochée, vous pouvez la changer. En combat, le bloc « Sorts » liste les sorts possibles avec leur coût (emplacements restants) ; choisissez-en un, lisez son résumé, puis touchez la cible. Un sort impossible est grisé avec la raison. Les sorts sans effet en combat (Lumière, Détection de la magie…) restent sur la fiche mais ne se lancent pas ; les sorts à réaction (Bouclier, Représailles infernales) se lancent quand le jeu vous le propose (voir « Réactions »). Les emplacements restants et la concentration en cours s'affichent dans la liste des combattants." },
  { title: "Lancer vos dés", text: "Vos jets (initiative, attaque, dégâts, jets de mort) se lancent en appuyant sur un bouton : « Lancer le d20 », puis « Lancer les dégâts » si votre attaque touche. Le dé s'anime et le résultat reste affiché jusqu'à « Continuer ». Les jets des ennemis se déroulent sans animation. L'interrupteur « Mes dés » en haut à droite, coupé, rend tout instantané ; « Passer l'animation » saute les jets restants." },
  { title: "Crédits et licences", text: "Le menu « Crédits » cite les sources libres utilisées : le SRD 5.2 de Wizards of the Coast pour les règles, le SRD 5.1 pour les monstres et game-icons.net pour les illustrations (licences Creative Commons). Les illustrations des listes et des fiches sont des icônes recolorées sur un badge ; les petits personnages de la carte et du combat (héros selon l'espèce et la classe, monstres, personnages du village) sont des dessins originaux de ce projet." },
  { title: "Sauvegarde de vos personnages", text: "Les personnages sont enregistrés dans le navigateur de votre appareil. Ils restent d'une visite à l'autre, mais ne sont pas partagés entre deux appareils, et effacer les données du site les supprime. Sur l'écran d'accueil, « Exporter ma sauvegarde » crée un fichier à conserver (ou à envoyer sur un autre appareil) et « Importer une sauvegarde » le relit : les personnages absents sont ajoutés, ceux qui existent déjà sont remplacés par la version du fichier." },
];

export const WEAPON_PROPERTY_TEXT: Record<string, { name: string; text: string }> = {
  finesse: { name: "Finesse", text: "Tu peux utiliser la Force ou la Dextérité, au choix, pour l'attaque et les dégâts. Le jeu retient automatiquement la meilleure." },
  light: { name: "Légère", text: "Permet de combattre avec une arme dans chaque main. Dans le jeu : après avoir attaqué (action Attaquer) en mêlée avec une arme légère, si vous avez une seconde arme légère (ou deux exemplaires de la même), une attaque à la seconde arme devient possible en action bonus ; elle n'ajoute pas votre modificateur aux dégâts." },
  heavy: { name: "Lourde", text: "Désavantage à l'attaque si votre Force (mêlée) ou votre Dextérité (distance) est inférieure à 13. Appliqué : la raison est affichée sur la fiche et sous le jet." },
  "two-handed": { name: "Deux mains", text: "Se manie à deux mains : impossible d'attaquer avec en portant un bouclier (l'attaque est grisée avec la raison). Rangez le bouclier depuis la fiche pour vous en servir." },
  reach: { name: "Allonge", text: "Ajoute 1,5 m à votre allonge au corps à corps : vous pouvez frapper un ennemi à 3 m (2 cases) sur le terrain de combat." },
  thrown: { name: "Lancer", text: "Peut être lancée pour une attaque à distance, jusqu'à la portée indiquée. Le jeu propose alors une variante « (lancer) » de l'attaque." },
  versatile: { name: "Polyvalente", text: "Inflige plus de dégâts tenue à deux mains. Dans le jeu : le dé le plus grand est utilisé si tu ne portes pas de bouclier." },
  ammunition: { name: "Munitions", text: "Nécessite des munitions (flèches). Le jeu ne les compte pas encore : elles sont illimitées." },
};

/** Maîtrises d'armes (2024) : effet quand l'attaque avec une arme maîtrisée touche (ou rate, pour l'Écorchure). */
export const MASTERY_TEXT: Record<string, { name: string; text: string }> = {
  cleave: { name: "Enchaînement", text: "Quand vous touchez au corps à corps, une seconde créature à côté de la cible (et à votre portée) est frappée aussi, sans votre modificateur aux dégâts. Une fois par tour. Demande le terrain de combat." },
  graze: { name: "Écorchure", text: "Quand vous ratez, la cible subit quand même des dégâts égaux à votre modificateur de caractéristique." },
  nick: { name: "Entaille", text: "L'attaque supplémentaire de l'arme légère ne coûte pas votre action bonus (elle se fait toujours après l'attaque)." },
  push: { name: "Poussée", text: "Quand vous touchez, la cible est repoussée de 3 m en ligne droite si la place est libre. Demande le terrain de combat." },
  sap: { name: "Sape", text: "Quand vous touchez, la cible a un désavantage à sa prochaine attaque." },
  slow: { name: "Ralentissement", text: "Quand vous touchez, la vitesse de la cible baisse de 3 m jusqu'à votre prochain tour." },
  topple: { name: "Renversement", text: "Quand vous touchez, la cible fait un jet de sauvegarde de Constitution (DD 8 + votre bonus d'attaque) ou tombe à terre." },
  vex: { name: "Gêne", text: "Quand vous touchez, votre prochaine attaque contre la même cible a l'avantage (avant la fin de votre prochain tour)." },
};

/** Capacités de monstres appliquées par le moteur. */
export const MONSTER_TRAIT_TEXT: Record<string, { name: string; text: string }> = {
  "pack-tactics": { name: "Tactique de meute", text: "Avantage aux jets d'attaque contre une créature si un allié du monstre, en état d'agir, est à son contact. Demande le terrain de combat." },
  "undead-fortitude": { name: "Robustesse des morts-vivants", text: "Quand les dégâts le font tomber à 0 PV (sauf dégâts radiants ou coup critique), il fait un jet de sauvegarde de Constitution (DD 5 + dégâts) : en cas de réussite, il reste à 1 PV." },
  archer: { name: "Tireur", text: "Il préfère tirer de loin : il s'approche seulement jusqu'à pouvoir viser, et s'il est à votre contact il recule vers la case d'où il peut encore tirer, la plus éloignée de vous. Demande le terrain de combat." },
  coward: { name: "Lâche", text: "À un quart de ses PV ou moins, il ne se bat plus : il fonce loin de vous et, quand il est assez loin ou hors de vue, il quitte le combat (sans butin si tous ses compagnons ont fui ou sont tombés). Coincé, il se bat. Demande le terrain de combat." },
  aggressive: { name: "Agressif", text: "En action bonus, il court vers un ennemi : il peut donc se déplacer deux fois de sa vitesse pendant son tour pour vous atteindre. Demande le terrain de combat." },
};

export const ARMOR_KIND_TEXT: Record<string, { name: string; text: string }> = {
  light: { name: "Armure légère", text: "CA = valeur de l'armure + ton modificateur de Dextérité." },
  medium: { name: "Armure intermédiaire", text: "CA = valeur de l'armure + ton modificateur de Dextérité, au maximum +2." },
  heavy: { name: "Armure lourde", text: "CA fixe : la Dextérité ne compte pas. Exige une Force minimale ; en dessous, ta vitesse baisse de 3 m." },
  shield: { name: "Bouclier", text: "Ajoute 2 à ta CA, avec ou sans armure." },
};

export const WEAPON_TRAINING_TEXT: Record<string, string> = {
  simple: "armes courantes",
  "simple+martial": "armes courantes et armes de guerre",
  "simple+martial-light": "armes courantes et armes de guerre légères",
  "simple+martial-finesse-or-light": "armes courantes et armes de guerre à finesse ou légères",
};
export const ARMOR_TRAINING_TEXT: Record<string, string> = {
  light: "armures légères",
  medium: "armures intermédiaires",
  heavy: "armures lourdes",
  shield: "boucliers",
};

export type FeatureStatusKind = "applied" | "partial" | "todo";

/** Ce que le jeu applique réellement, par capacité de niveau 1. À tenir à jour avec le moteur (voir les tests). */
export const FEATURE_STATUS: Record<string, Record<string, { status: FeatureStatusKind; note?: string }>> = {
  barbarian: {
    "Rage": { status: "applied", note: "Action bonus, 2 utilisations, 1 minute : +2 aux dégâts des attaques de Force et résistance aux dégâts physiques. Le maintien de la rage (attaquer à chaque tour) n'est pas appliqué." },
    "Défense sans armure": { status: "applied", note: "Prise en compte dans le calcul de la CA." },
    "Maîtrise des armes": { status: "applied", note: "Les huit effets (Enchaînement, Écorchure, Entaille, Poussée, Sape, Ralentissement, Renversement, Gêne) sont appliqués pour les armes que vous avez choisies sur la fiche (Maîtrises d'armes). Enchaînement et Poussée demandent le terrain de combat." },
  },
  bard: {
    "Inspiration bardique": { status: "applied", note: "Action bonus : vous vous donnez un dé d'inspiration (d6) ; il est ajouté automatiquement à votre prochain jet d'attaque ou de sauvegarde raté s'il le transforme en réussite. Il se donne à un allié dans les règles : pas d'allié pour l'instant. Utilisations : votre modificateur de Charisme, par repos long." },
    "Incantation": { status: "partial", note: "Sorts mineurs et sorts de niveau 1 jouables (Moquerie cruelle, Soin des blessures, Mot de guérison, Vague tonnante…), avec emplacements, DD et concentration. Bouclier (réaction) et les niveaux supérieurs : Bouclier est proposé quand une attaque vous touche ; les niveaux supérieurs viendront plus tard." },
  },
  cleric: {
    "Incantation": { status: "partial", note: "Flamme sacrée, Glas, Éclair guidé, Infliction de blessures, Soin des blessures, Mot de guérison, Bouclier de la foi et Bénédiction sont jouables ; les autres sorts de la liste s'affichent mais n'ont pas encore d'effet en combat." },
    "Ordre divin": { status: "applied", note: "Choisi à la création. Protecteur : armes martiales et armures lourdes (maîtrise prise en compte pour les attaques, la CA et le désavantage d'une armure non maîtrisée). Thaumaturge : un sort mineur de plus et un bonus de Sagesse (au moins +1) aux compétences Arcanes et Religion." },
  },
  druid: {
    "Incantation": { status: "partial", note: "Création de flammes, Fouet épineux, Vague tonnante, Soin des blessures et Mot de guérison sont jouables ; les autres sorts s'affichent mais n'ont pas encore d'effet en combat." },
    "Druidique": { status: "todo" },
    "Ordre primordial": { status: "applied", note: "Choisi à la création. Gardien : armes martiales et armures intermédiaires. Magicien des bois : un sort mineur de plus et un bonus de Sagesse (au moins +1) aux compétences Arcanes et Nature." },
  },
  fighter: {
    "Style de combat": { status: "applied", note: "Quatre styles : Défense (+1 CA en armure), Archerie (+2 aux armes à distance), Armes à deux mains (1 et 2 comptent comme 3 aux dés de dégâts) et Deux armes (modificateur ajouté à la seconde arme)." },
    "Second souffle": { status: "applied", note: "Action bonus, 2 utilisations : vous récupérez 1d10 + niveau PV." },
    "Maîtrise des armes": { status: "applied", note: "Les huit effets (Enchaînement, Écorchure, Entaille, Poussée, Sape, Ralentissement, Renversement, Gêne) sont appliqués pour les armes que vous avez choisies sur la fiche (Maîtrises d'armes). Enchaînement et Poussée demandent le terrain de combat." },
  },
  monk: {
    "Arts martiaux": { status: "applied", note: "Frappes à mains nues d6 + Dextérité, et frappe bonus après l'action Attaquer." },
    "Défense sans armure": { status: "applied", note: "Prise en compte dans le calcul de la CA." },
  },
  paladin: {
    "Imposition des mains": { status: "applied", note: "Action bonus : vous vous soignez en dépensant des points de la réserve (5 au niveau 1). Soigner un allié viendra avec les compagnons." },
    "Incantation": { status: "partial", note: "Soin des blessures, Bouclier de la foi et Bénédiction sont jouables ; les autres sorts s'affichent mais n'ont pas encore d'effet en combat." },
    "Maîtrise des armes": { status: "applied", note: "Les huit effets (Enchaînement, Écorchure, Entaille, Poussée, Sape, Ralentissement, Renversement, Gêne) sont appliqués pour les armes que vous avez choisies sur la fiche (Maîtrises d'armes). Enchaînement et Poussée demandent le terrain de combat." },
  },
  ranger: {
    "Incantation": { status: "partial", note: "Marque du chasseur et Soin des blessures sont jouables ; les autres sorts s'affichent mais n'ont pas encore d'effet en combat." },
    "Ennemi juré": { status: "partial", note: "Marque du chasseur est toujours préparée et se lance gratuitement 2 fois (rechargées au repos long) ; le changement de cible de la marque n'est pas appliqué." },
    "Maîtrise des armes": { status: "applied", note: "Les huit effets (Enchaînement, Écorchure, Entaille, Poussée, Sape, Ralentissement, Renversement, Gêne) sont appliqués pour les armes que vous avez choisies sur la fiche (Maîtrises d'armes). Enchaînement et Poussée demandent le terrain de combat." },
  },
  rogue: {
    "Expertise": { status: "applied", note: "Choisie à la création : le bonus de maîtrise est doublé pour deux compétences que vous maîtrisez déjà (◉ sur la fiche)." },
    "Attaque sournoise": { status: "partial", note: "+1d6 de dégâts une fois par tour avec une arme à finesse ou à distance quand votre attaque a l'avantage (sans désavantage). La seconde condition des règles (un allié au contact de la cible) n'existe pas encore : il n'y a pas d'allié." },
    "Argot des voleurs": { status: "todo" },
    "Maîtrise des armes": { status: "applied", note: "Les huit effets (Enchaînement, Écorchure, Entaille, Poussée, Sape, Ralentissement, Renversement, Gêne) sont appliqués pour les armes que vous avez choisies sur la fiche (Maîtrises d'armes). Enchaînement et Poussée demandent le terrain de combat." },
  },
  sorcerer: {
    "Incantation": { status: "partial", note: "Trait de feu, Rayon de givre, Contact glacial, Projectile magique, Mains brûlantes, Vague tonnante et Armure du mage sont jouables, ainsi que Bouclier (réaction, proposé quand une attaque vous touche) ; les autres sorts ne le sont pas encore." },
    "Magie innée": { status: "applied", note: "Action bonus, 2 utilisations, 1 minute : avantage aux attaques de sort et +1 au DD des sauvegardes contre vos sorts." },
  },
  warlock: {
    "Invocations occultes": { status: "applied", note: "Une invocation au niveau 1 : Armure d'ombres (CA 13 + Dextérité sans armure), Décharge agonisante (Charisme aux dégâts de la Décharge occulte) ou Lance occulte (portée triplée). Les autres invocations (dont les Pactes) ne sont pas encore proposées." },
    "Magie de pacte": { status: "partial", note: "Un emplacement de niveau 1, rechargé après un repos court. Décharge occulte, Contact glacial, Glas et Maléfice sont jouables ; les autres sorts ne le sont pas encore." },
  },
  wizard: {
    "Incantation": { status: "partial", note: "Trait de feu, Rayon de givre, Contact glacial, Glas, Projectile magique, Mains brûlantes, Vague tonnante et Armure du mage sont jouables. Le grimoire (6 sorts) n'est pas géré : vous choisissez directement vos 4 sorts préparés." },
    "Adepte des rituels": { status: "todo" },
    "Récupération arcanique": { status: "partial", note: "Au repos court, une fois par repos long, vous récupérez un emplacement de niveau 1 (c'est le maximum au niveau 1)." },
  },
};

export const FEATURE_STATUS_LABEL: Record<FeatureStatusKind, string> = {
  applied: "Appliqué en combat",
  partial: "Partiellement appliqué",
  todo: "Pas encore appliqué",
};
