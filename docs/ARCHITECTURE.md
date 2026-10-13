# Architecture

- **`src/engine`** : logique de règles pure et déterministe. Le hasard est injecté (`Rng`) : tests reproductibles et parties rejouables (seed).
- **`src/data`** : données SRD typées, sans logique.
- **`src/views` / `src/stores`** : UI et état ; appellent le moteur, ne réimplémentent jamais une règle.
- État de partie sérialisable en JSON (sauvegarde, reprise, futur multijoueur).
