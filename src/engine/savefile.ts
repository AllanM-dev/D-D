import type { Character } from "./character";

/** Fichier de sauvegarde exportable : les personnages, dans un format versionné. */
export interface SaveFile {
  app: "dd-mobile";
  version: 1;
  characters: Character[];
}

export function exportSave(characters: Character[]): string {
  const file: SaveFile = { app: "dd-mobile", version: 1, characters };
  return JSON.stringify(file, null, 2);
}

function looksLikeCharacter(c: unknown): c is Character {
  if (!c || typeof c !== "object") return false;
  const x = c as Record<string, unknown>;
  return typeof x.id === "string" && typeof x.name === "string" && !!x.classDef && !!x.species && typeof x.level === "number";
}

/** Lit un fichier de sauvegarde. Renvoie les personnages ou un message d'erreur en français. */
export function parseSave(text: string): { characters: Character[] } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "Ce fichier n'est pas une sauvegarde valide." };
  }
  const file = data as Partial<SaveFile>;
  if (!file || file.app !== "dd-mobile" || !Array.isArray(file.characters)) {
    return { error: "Ce fichier n'est pas une sauvegarde de D&D Mobile." };
  }
  if (file.version !== 1) return { error: "Cette sauvegarde vient d'une version inconnue de l'application." };
  const characters = file.characters.filter(looksLikeCharacter);
  if (!characters.length) return { error: "La sauvegarde ne contient aucun personnage lisible." };
  return { characters };
}

/** Fusionne des personnages importés : un personnage déjà présent (même identifiant) est remplacé. */
export function mergeCharacters(current: Character[], imported: Character[]): { list: Character[]; added: number; replaced: number } {
  const list = [...current];
  let added = 0;
  let replaced = 0;
  for (const c of imported) {
    const i = list.findIndex((x) => x.id === c.id);
    if (i >= 0) { list[i] = c; replaced++; } else { list.push(c); added++; }
  }
  return { list, added, replaced };
}
