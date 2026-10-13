# D&D Mobile — consignes pour Claude

Application mobile de JDR inspirée de D&D 5.5 (règles 2024, SRD 5.2). Vue 3 + TypeScript + Ionic + Capacitor, publiée sur GitHub Pages. Interface et textes en **français**.

## Règle d'or : maintenir la page Aide

La page Aide (menu → Aide) doit **toujours refléter ce que l'application fait réellement**. À chaque ajout ou modification visible par le joueur, mettre à jour l'Aide **dans la même PR**, pas plus tard. Un changement de jeu sans mise à jour de l'Aide n'est pas terminé.

| Si l'on ajoute ou change… | Mettre à jour |
|---|---|
| une règle ou un mécanisme (déplacement, action bonus, conditions, repos, soins, sorts…) | `BASIC_RULES` dans `src/data/help.ts`. Corriger aussi les phrases devenues fausses (« pas encore géré », « pour l'instant, il n'y a ni… ») |
| un écran, un bouton, un réglage, la sauvegarde | `APP_GUIDE` dans `src/data/help.ts` |
| une classe, une capacité | `CLASS_FEATURE_TEXT` (et `features`/`priority`/`advice` dans `src/data/classes.ts`) |
| une espèce, un trait | `SPECIES_TRAIT_TEXT` (et `traits` dans `src/data/species.ts`) |
| un historique, un don d'origine | `BACKGROUND_TEXT`, `FEAT_TEXT` |
| un monstre, une arme, une armure, un sort, un objet (nouveau **type** de contenu) | une nouvelle section d'aide : type dans `src/ui/helpLists.ts` (`HELP_KINDS`, `helpEntries`), fiche dans `src/views/HelpDetailView.vue`, carte dans `src/views/HelpView.vue`, entrée dans le menu `src/App.vue` |
| un trait ou une capacité qui devient **appliqué par le moteur** | retirer les mentions « à titre d'information / pas encore appliqué » dans `HelpDetailView.vue` |

Les tests (`src/engine/__tests__/help.test.ts`) échouent si une capacité, un trait, un historique ou un don d'origine n'a pas de texte, ou si un texte ne correspond plus à rien. Quand on ajoute un nouveau type de contenu, **ajouter le test équivalent**.

Avant de proposer une PR, relire l'Aide : chaque phrase est-elle encore vraie ? Le modèle de PR (`.github/pull_request_template.md`) contient une case « Page Aide » à renseigner.

## Contenu de règles
- Seul le contenu du **SRD 5.2** (ou 5.1 pour les monstres actuels) est autorisé, en CC-BY-4.0 ; l'attribution est dans `LICENSE-CONTENT.md`. Pas de texte du Player's Handbook / DMG / Monster Manual hors SRD, ni d'univers protégé (Royaumes Oubliés, Beholder, etc.).
- Les textes d'aide et de description sont rédigés en français, **en texte original** (pas de citation du SRD).
- Les chiffres précis des règles sont écrits de mémoire : les signaler dans la PR pour relecture.

## Architecture
- `src/engine/` : règles pures (dés, personnage, combat), sans dépendance à l'interface, testées avec Vitest. Le hasard est injecté (`Rng`).
- `src/data/` : données (classes, espèces, historiques, monstres, rencontres, textes d'aide), sans logique.
- `src/views/`, `src/components/`, `src/stores/` : interface Ionic et état Pinia ; elles appellent le moteur et ne réimplémentent jamais une règle.

## Vérifier son travail
```bash
npm test && npm run typecheck && npm run build
```
Pour tout changement d'interface, le tester aussi dans un navigateur au format mobile (390×844), parcours complet : un test vert ne prouve pas que l'écran fonctionne.

## Livraison
- Roadmap : cocher les cases de `docs/ROADMAP.md` au fil des fonctionnalités.
- Une PR par fonctionnalité, description en français avec résumé, vérification et limites connues.
