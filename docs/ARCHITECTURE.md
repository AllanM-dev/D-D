# Architecture

- **`src/engine`** : logique de règles pure et déterministe. Le hasard est injecté (`Rng`) : tests reproductibles et parties rejouables (seed).
- **`src/data`** : données SRD typées, sans logique.
- **`src/views` / `src/stores`** : UI et état ; appellent le moteur, ne réimplémentent jamais une règle.
- État de partie sérialisable en JSON (sauvegarde, reprise, futur multijoueur).

## Page Aide
Le contenu de l'Aide vit dans `src/data/help.ts` et dans les données de jeu (`classes.ts`, `species.ts`, `backgrounds.ts`). Les fiches sont générées à partir de ces données : ajouter une entrée de jeu la fait apparaître dans l'Aide, avec une explication obligatoire vérifiée par les tests. La règle de maintenance est décrite dans `CLAUDE.md`.
