# D&D Mobile — JDR sur mobile (règles D&D 5.5)

Application mobile (iOS / Android) inspirée d'une partie de jeu de rôle *Donjons & Dragons*, basée sur les règles **5.5 (révision 2024, SRD 5.2)**.

> Projet non officiel, non affilié à Wizards of the Coast. Voir [LICENSE-CONTENT.md](LICENSE-CONTENT.md).

## Stack

- **Vue 3 + TypeScript + Vite**, état avec **Pinia**
- **Ionic Vue** pour l'UI mobile, **Capacitor** pour l'emballage iOS/Android
- **Moteur de règles** pur TypeScript dans `src/engine` (aucune dépendance UI), testé avec **Vitest**

## Démarrer

```bash
npm install
npm run dev         # navigateur (mode mobile via les devtools)
npm test            # tests du moteur de règles
npm run typecheck
npm run build

# Mobile natif
npx cap add android   # et/ou: npx cap add ios
npm run build && npx cap sync
npx cap open android
```

## Structure

```
src/engine/   règles : dés, caractéristiques, bonus de maîtrise, jets d20…
src/data/     données SRD (classes, sorts, monstres…)
src/views/    écrans Ionic
src/stores/   état Pinia (personnage, partie)
docs/         roadmap et architecture
```

Voir [docs/ROADMAP.md](docs/ROADMAP.md) et [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Version en ligne

Après fusion dans `main` et activation de *Settings → Pages → Source : GitHub Actions*, l'app est publiée sur `https://allanm-dev.github.io/D-D/` (utilisable sur téléphone, ajoutable à l'écran d'accueil).
