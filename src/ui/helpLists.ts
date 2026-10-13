import { BACKGROUNDS } from "../data/backgrounds";
import { CLASSES } from "../data/classes";
import { SPECIES } from "../data/species";
import { BACKGROUND_TEXT } from "../data/help";

export type HelpKind = "classes" | "species" | "backgrounds";

export const HELP_KINDS: Record<HelpKind, { title: string; singular: string }> = {
  classes: { title: "Classes", singular: "Classe" },
  species: { title: "Espèces", singular: "Espèce" },
  backgrounds: { title: "Historiques", singular: "Historique" },
};

export const isHelpKind = (k: string): k is HelpKind => k in HELP_KINDS;

/** Liste d'entrées (nom + résumé) d'un type, pour la page de liste. */
export function helpEntries(kind: HelpKind): { id: string; name: string; summary: string }[] {
  if (kind === "classes") return CLASSES.map((c) => ({ id: c.id, name: c.name, summary: c.description }));
  if (kind === "species") return SPECIES.map((s) => ({ id: s.id, name: s.name, summary: s.description }));
  return BACKGROUNDS.map((b) => ({ id: b.id, name: b.name, summary: BACKGROUND_TEXT[b.id] }));
}
