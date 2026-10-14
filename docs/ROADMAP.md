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
- [x] Menu latéral et page Aide : règles de base, caractéristiques, fiches des 12 classes, 9 espèces et 4 historiques

## Jalon 2 — Combat
- [x] Initiative, tours, action Attaquer / Esquiver (combat 1 contre N, sans positions)
- [x] Animation de vos jets de dés (initiative, attaque, dégâts, jets de mort), déclenchée par un bouton, désactivable ; les jets ennemis se résolvent sans dés
- [x] Action bonus et fin de tour ; capacités de classe de niveau 1 : Second souffle, Style de combat (Défense, Archerie), Rage, Imposition des mains, Magie innée, frappe bonus du moine
- [ ] Réactions, déplacement, portée, repos court et long
- [x] Attaques (critiques, avantage/désavantage), dégâts, jets contre la mort, victoire/défaite
- [ ] Conditions, sorts de combat (Incantation), soins des alliés, autres capacités de classe (Attaque sournoise, Expertise, Inspiration bardique…), autres styles de combat
- [x] Bestiaire de départ (7 monstres, SRD 5.1) et 7 rencontres
- [ ] Bestiaire complet, capacités spéciales des monstres, compagnons, propriétés d'armes (lourde, légère, maîtrises), munitions

## Jalon 3 — Aventure
- [ ] Format de scénario (scènes, choix, tests de compétence)
- [ ] Une aventure courte jouable de bout en bout
- [ ] Sorts et inventaire

## Plus tard
- [ ] Narration générée (MJ IA), multijoueur, repos, montée de niveau
