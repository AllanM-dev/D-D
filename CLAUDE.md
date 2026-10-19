# D&D Mobile — consignes pour Claude

Application mobile de JDR inspirée de D&D 5.5 (règles 2024, SRD 5.2). Vue 3 + TypeScript + Ionic + Capacitor, publiée sur GitHub Pages. Interface et textes en **français**.

## Règle d'or : maintenir la page Aide

La page Aide (menu → Aide) doit **toujours refléter ce que l'application fait réellement**. À chaque ajout ou modification visible par le joueur, mettre à jour l'Aide **dans la même PR**, pas plus tard. Un changement de jeu sans mise à jour de l'Aide n'est pas terminé.

| Si l'on ajoute ou change… | Mettre à jour |
|---|---|
| une règle ou un mécanisme (déplacement, action bonus, conditions, repos, soins, sorts…) | `BASIC_RULES` dans `src/data/help.ts`. Corriger aussi les phrases devenues fausses (« pas encore géré », « pour l'instant, il n'y a ni… ») |
| un écran, un bouton, un réglage, la sauvegarde | `APP_GUIDE` dans `src/data/help.ts` |
| une classe, une capacité | `CLASS_FEATURE_TEXT` (et `features`/`priority`/`advice` dans `src/data/classes.ts`) **et** `FEATURE_STATUS` (« appliqué », « partiel » ou « pas encore » + note de ce que fait le jeu). Une capacité branchée dans le moteur (`featuresFor`) doit être « appliquée » : les tests le vérifient dans les deux sens |
| une espèce, un trait | `SPECIES_TRAIT_TEXT` (et `traits` dans `src/data/species.ts`) |
| un historique, un don d'origine | `BACKGROUND_TEXT`, `FEAT_TEXT` |
| une classe, une espèce, un historique ou un monstre | **son illustration** dans `src/data/illustrations.ts` : choisir une icône de game-icons.net (CC BY 3.0), l'indiquer par `icon: "nom"`, puis lancer `npm install --no-save @iconify-json/game-icons && node scripts/extract-icons.mjs`. Les tests échouent s'il en manque une, s'il en reste une orpheline ou si l'icône n'est pas embarquée. Vérifier le rendu à l'œil, petite taille (44 px) et grande (100 px) |
| une nouvelle source de contenu tiers (icônes, images, textes, données) | l'ajouter dans `src/data/credits.ts` (page Crédits) **et** dans `LICENSE-CONTENT.md`, avec la mention exigée par sa licence. Ne jamais embarquer un contenu dont la licence n'est pas libre |
| une arme, une armure ou un lot d'équipement | `src/data/equipment.ts` ; les fiches Armes/Armures et la fiche de classe se mettent à jour seules, mais ajouter le texte de chaque nouvelle **propriété** d'arme (`WEAPON_PROPERTY_TEXT`) et retirer les mentions « pas encore appliqué » devenues fausses |
| une scène, un personnage, une quête, une carte | `src/data/stories.ts` (scènes, choix, drapeaux) et `src/data/maps.ts` (lieux « ! », verrous, ennemis) ; les tests (`story.test.ts`, `exploration.test.ts`) vérifient les liens entre scènes, les scènes orphelines et la jouabilité de la quête. Mettre à jour les phrases d'Aide devenues fausses (« Suivre l'histoire », « Explorer la carte ») |
| un monstre (statistiques, capacités) | `src/data/monsters.ts` : `traits` (capacités gérées par le moteur, texte dans `MONSTER_TRAIT_TEXT` de `help.ts`) et `notApplied` (ce que le jeu ignore) ; sa fiche Aide → Bestiaire, son illustration et une rencontre (`encounters.ts`) ; un test pour chaque nouvelle capacité |
| une boutique, un article en vente, un prix | `src/data/shops.ts` (stock, ce que le marchand rachète), prix dans `PRICES` de `src/data/equipment.ts` ; un marchand se branche par un choix `shop` d'une scène (`stories.ts`) ; mettre à jour « Équipement, armes et armures » et « Sac à dos, butin et boutique » |
| un objet du sac à dos, un butin, un prix | `src/data/items.ts` (texte et note de chaque objet : ils alimentent Aide → Objets), butin des ennemis dans `src/data/maps.ts` (`loot`), achats/ventes dans `src/data/stories.ts` (`requires.minGold`/`items`, `gold`, `items` : la validation refuse une dépense sans condition) ; mettre à jour « Sac à dos, butin et boutique » |
| un monstre, un sort, un objet (nouveau **type** de contenu) | une nouvelle section d'aide : type dans `src/ui/helpLists.ts` (`HELP_KINDS`, `helpEntries`), fiche dans `src/views/HelpDetailView.vue`, carte dans `src/views/HelpView.vue`, entrée dans le menu `src/App.vue` |
| un trait ou une capacité qui devient **appliqué par le moteur** | retirer les mentions « à titre d'information / pas encore appliqué » dans `HelpDetailView.vue` |

Les tests (`src/engine/__tests__/help.test.ts`) échouent si une capacité, un trait, un historique ou un don d'origine n'a pas de texte, ou si un texte ne correspond plus à rien. Quand on ajoute un nouveau type de contenu, **ajouter le test équivalent**.

Avant de proposer une PR, relire l'Aide : chaque phrase est-elle encore vraie ? Le modèle de PR (`.github/pull_request_template.md`) contient une case « Page Aide » à renseigner.

## Contenu de règles
- **Toutes les distances sont en mètres** (jamais de pieds à l'écran) : une case = 1,5 m, 30 pieds = 9 m. Les données du SRD sont converties à la source (`src/data/`) ; afficher avec `formatMeters` (virgule décimale).
- Images et icônes : uniquement sous licence libre (CC0, CC BY, MIT…), jamais d'image de D&D, de Wizards of the Coast ou d'un tiers sans licence. Les sites d'images habituels sont inaccessibles depuis la session ; la collection game-icons.net passe par npm.
- Seul le contenu du **SRD 5.2** (ou 5.1 pour les monstres actuels) est autorisé, en CC-BY-4.0 ; l'attribution est dans `LICENSE-CONTENT.md`. Pas de texte du Player's Handbook / DMG / Monster Manual hors SRD, ni d'univers protégé (Royaumes Oubliés, Beholder, etc.).
- Les textes d'aide et de description sont rédigés en français, **en texte original** (pas de citation du SRD).
- Les chiffres précis des règles sont écrits de mémoire : les signaler dans la PR pour relecture.

## Architecture
- `src/engine/` : règles pures (dés, personnage, équipement, combat), sans dépendance à l'interface, testées avec Vitest. Le hasard est injecté (`Rng`).
- `src/engine/combat/` : le moteur de combat, découpé par sujet (voir `index.ts`). Une capacité utilisable en combat = **une fiche** dans `combat/features.ts` (`offer` : quand elle est proposée, `use` : ce qu'elle fait, `costsBonus` : si elle coûte l'action bonus), plus son nom dans `labels.ts`.
- `src/data/` : données (classes, espèces, historiques, armes, armures, équipements de départ, monstres, rencontres, textes d'aide), sans logique.
- Sauvegardes : toute migration d'un ancien personnage passe par `migrate()` (`src/engine/migrate.ts`), utilisée au chargement et à l'import ; les copies profondes passent par `clone()` (`src/engine/clone.ts`).
- `src/views/`, `src/components/`, `src/stores/` : interface Ionic et état Pinia ; elles appellent le moteur et ne réimplémentent jamais une règle.

## Vérifier son travail
```bash
npm test && npm run typecheck && npm run build
```
Le workflow `.github/workflows/ci.yml` lance les mêmes vérifications sur chaque PR : une PR rouge ne se fusionne pas.
Pour tout changement d'interface, le tester aussi dans un navigateur au format mobile (390×844), parcours complet : un test vert ne prouve pas que l'écran fonctionne.

## Livraison
- Roadmap : cocher les cases de `docs/ROADMAP.md` au fil des fonctionnalités.
- Une PR par fonctionnalité, description en français avec résumé, vérification et limites connues.
