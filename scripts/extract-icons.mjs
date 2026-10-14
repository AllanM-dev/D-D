#!/usr/bin/env node
/**
 * Extrait de la collection game-icons.net (CC BY 3.0) uniquement les icônes utilisées par
 * `src/data/illustrations.ts` et écrit `src/data/game-icons.generated.ts`.
 *
 * Usage (à relancer après avoir ajouté ou changé un `icon: "…"`) :
 *   npm install --no-save @iconify-json/game-icons
 *   node scripts/extract-icons.mjs
 * Variable ICONS_JSON : chemin d'un autre icons.json (facultatif).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(resolve(root, "src/data/illustrations.ts"), "utf8");
const names = [...new Set([...source.matchAll(/icon: "([a-z0-9-]+)"/g)].map((m) => m[1]))].sort();

const jsonPath = process.env.ICONS_JSON ?? resolve(root, "node_modules/@iconify-json/game-icons/icons.json");
const set = JSON.parse(readFileSync(jsonPath, "utf8"));

const missing = names.filter((n) => !set.icons[n]);
if (missing.length) {
  console.error("Icônes introuvables dans game-icons :", missing.join(", "));
  process.exit(1);
}
for (const n of names) {
  const body = set.icons[n].body;
  // Garde-fou : uniquement des tracés simples, sans script ni image externe.
  if (!/^(<path [^>]*\/>)+$/.test(body) || /script|href|on\w+=/i.test(body)) {
    console.error(`Icône « ${n} » : contenu inattendu, vérification manuelle requise.`);
    process.exit(1);
  }
}

const lines = names.map((n) => `  ${JSON.stringify(n)}: ${JSON.stringify(set.icons[n].body)},`);
writeFileSync(
  resolve(root, "src/data/game-icons.generated.ts"),
  `// Fichier généré par scripts/extract-icons.mjs — ne pas modifier à la main.
// Icônes de game-icons.net (Lorc, Delapouite et autres contributeurs), licence CC BY 3.0 : https://creativecommons.org/licenses/by/3.0/
// Attribution affichée dans l'application (menu → Crédits) et dans LICENSE-CONTENT.md.
export const GAME_ICONS: Record<string, string> = {
${lines.join("\n")}
};
`,
);
console.log(`${names.length} icônes extraites.`);
