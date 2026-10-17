# Roadmap

## Jalon 0 — Fondations
- [x] Scaffold Vue 3 + Ionic + Capacitor
- [x] Moteur : dés, modificateurs, bonus de maîtrise, jets d20 (avantage/désavantage)
- [ ] CI (typecheck + tests sur chaque PR)

## Jalon 1 — Personnage
- [x] Création niveau 1 : espèce, classe, historique, caractéristiques (tableau standard, achat de points, tirage 4d6), bonus d'historique 2024, compétences
- [x] Feuille de personnage (PV, CA, initiative, compétences, jets de sauvegarde)
- [x] Persistance locale (localStorage) — à migrer vers @capacitor/preferences / SQLite pour l'app native
- [x] Équipement de départ par classe (armure, bouclier, armes, objets, or) : CA, vitesse et attaques calculées ; fiche et aide Armes/Armures
- [ ] Équipement de l'historique, option « or à la place », boutique, inventaire modifiable
- [ ] Traits d'espèce et de classe de niveau 1 appliqués, sorts de départ, don d'origine appliqué

- [x] Distances en mètres partout (vitesses, portées, malus d'armure), anciennes sauvegardes converties
- [x] Illustrations (icônes game-icons.net, CC BY 3.0) : 12 classes, 9 espèces, 4 historiques, 10 monstres (création, fiche, accueil, Aide, combat) ; page Crédits
- [ ] Illustrations des armes, armures et objets ; fonds d'écran d'ambiance ; images plus artistiques (si une source libre devient accessible)
- [x] Menu latéral et page Aide : règles de base, caractéristiques, fiches des 12 classes, 9 espèces et 4 historiques

## Jalon 2 — Combat
- [x] Initiative, tours, action Attaquer / Esquiver (combat 1 contre N, sans positions)
- [x] Animation de vos jets de dés (initiative, attaque, dégâts, jets de mort), déclenchée par un bouton, désactivable ; les jets ennemis se résolvent sans dés
- [x] Action bonus et fin de tour ; capacités de classe de niveau 1 : Second souffle, Style de combat (Défense, Archerie), Rage, Imposition des mains, Magie innée, frappe bonus du moine
- [x] PV et ressources conservés entre les combats ; repos court (dés de vie, Second souffle, Rage, Magie de pacte, Récupération arcanique) et repos long, depuis la fiche
- [x] Réactions (lot 1) : Bouclier et Représailles infernales, proposés au joueur pendant le tour des ennemis
- [x] Combat sur le terrain (lot 1) : positions sur la carte ou dans une clairière, déplacement en mètres, portées et ligne de vue, désavantages à longue portée et au contact, attaques d'opportunité des ennemis, Foncer, Se désengager, ennemis qui avancent à leur vitesse
- [x] Sorts de zone : Mains brûlantes (cône), Vague tonnante (cube), Enchevêtrement (carré) touchent tous les ennemis de la zone, murs et ligne de vue, aperçu des cibles
- [x] Tactiques de monstres : tir à distance (arc, arbalète, javelot, fronde), archer qui recule, lâches qui fuient et quittent le combat
- [ ] Combat sur le terrain (suite) : attaques d'opportunité du héros, terrain difficile, couverts, chefs et moral de groupe ; repos : événements de repos interrompu, montée de niveau (dés de vie multiples)
- [x] Attaques (critiques, avantage/désavantage), dégâts, jets contre la mort, victoire/défaite
- [x] Sorts (lot 1) : 43 sorts mineurs et de niveau 1 jouables, emplacements, DD de sauvegarde, concentration, sorts à action bonus ; liste dans l'Aide
- [ ] Sorts : grimoire du magicien, niveaux supérieurs, soins des alliés
- [x] États (conditions) : empoisonné, effrayé, aveuglé, entravé, à terre, neutralisé, étourdi, paralysé ; infligés par le loup (à terre), la goule (paralysie) et les sorts Rayon empoisonné, Enchevêtrement, Fou rire de Tasha ; section Aide → États
- [x] Capacités de classe (lot 2) : Attaque sournoise, Inspiration bardique (pour soi), maîtrises d'armes (8 effets) ; capacités de monstres : tactique de meute, robustesse des morts-vivants, agressif, toile et venin de l'araignée ; Bestiaire (10 monstres) dans l'Aide
- [x] Capacités de classe (lot 3) : Expertise du roublard, Ordre divin (Protecteur, Thaumaturge) et Ordre primordial (Gardien, Magicien des bois), invocations occultes (Armure d'ombres, Décharge agonisante, Lance occulte), styles Armes à deux mains et Deux armes, sort Bénédiction
- [ ] États restants (charmé, assourdi, épuisement, agrippé, invisible, pétrifié), capacités sans effet de jeu (Druidique, Argot des voleurs, Adepte des rituels), autres invocations (Pactes), sorts sans effet en combat
- [x] Bestiaire de départ (10 monstres, SRD 5.1) et 10 rencontres
- [ ] Bestiaire complet, capacités spéciales des monstres, compagnons, propriétés d'armes (lourde, légère, maîtrises), munitions

## Jalon 3 — Aventure
- [x] Carte d'exploration (lot 1) : cases de 1,5 m, déplacement au toucher, brouillard et ligne de vue, ennemis visibles qui lancent le combat, position enregistrée ; carte « Brumeval et ses environs »
- [ ] Carte : personnages non joueurs, objets, portes verrouillées, pièges, plusieurs cartes reliées
- [x] Format de scénario (scènes, choix conditionnés par des drapeaux, tests de compétence, combats, or) ; lieux et personnages « ! » sur la carte, portes verrouillées ; première quête « Les morts de Brumeval » (maire, aubergiste, porte de la crypte)
- [x] Une aventure courte jouable de bout en bout : « Les morts de Brumeval » (village, crypte à deux cartes reliées, deux fins possibles, récompense en or) ; cartes reliées par des passages, zones explorées gardées par carte
- [ ] Aventure : expérience et montée de niveau, inventaire et butin, autres aventures
- [x] Inventaire et butin : sac à dos, or, potions de soin (hors combat et en action bonus), butin des ennemis et des coffres, boutique de l'aubergiste, objets de quête ; section Aide → Objets
- [x] Équipement : équiper et ranger armes, armure et bouclier (CA, vitesse et attaques recalculées), armes et armures du SRD en boutique et en butin, forge de Brumeval, maîtrise d'armure, propriétés Légère (deux armes), Lourde, Deux mains, Allonge
- [ ] Équipement : objets magiques, poids porté, munitions comptées, maîtrises d'armes 2024, réparation
- [x] Confort : sauvegarde exportable/importable (fichier JSON), légende de la carte
- [x] Apparence de la carte (lot 1) : cases dessinées en SVG (variantes, ombres, rives, lisières, torches), lueur du héros
- [x] Apparence (lot 2) : personnages 2D (héros par espèce et classe, 10 monstres, 4 PNJ), socles d'équipe, barres de PV en combat
- [x] Ennemis qui poursuivent le héros sur la carte quand ils le voient (vitesse propre, embuscade au contact)
- [x] Attaque à distance depuis la carte : bouton « Attaquer d'ici », arme à distance choisie d'office quand la cible est trop loin
- [ ] Apparence (lot 3) : maisons du village avec toits, animations (marche, coup reçu), personnages de l'écran de création
- [ ] Confort : mode sombre/clair réglable, tailles de texte, sauvegarde dans le nuage

## Plus tard
- [ ] Narration générée (MJ IA), multijoueur, repos, montée de niveau
