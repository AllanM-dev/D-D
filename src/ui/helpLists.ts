import { BACKGROUNDS } from "../data/backgrounds";
import { CLASSES } from "../data/classes";
import { SPECIES } from "../data/species";
import { ARMORS, WEAPONS } from "../data/equipment";
import { artKey } from "../data/illustrations";
import { CONDITIONS } from "../data/conditions";
import { SPELLS, isPlayable } from "../data/spells";
import { BACKGROUND_TEXT, WEAPON_PROPERTY_TEXT } from "../data/help";

export type HelpKind = "classes" | "species" | "backgrounds" | "weapons" | "armors" | "spells" | "conditions";

export const HELP_KINDS: Record<HelpKind, { title: string; singular: string }> = {
  classes: { title: "Classes", singular: "Classe" },
  species: { title: "Espèces", singular: "Espèce" },
  backgrounds: { title: "Historiques", singular: "Historique" },
  weapons: { title: "Armes", singular: "Arme" },
  armors: { title: "Armures", singular: "Armure" },
  spells: { title: "Sorts", singular: "Sort" },
  conditions: { title: "États", singular: "État" },
};

export const isHelpKind = (k: string): k is HelpKind => k in HELP_KINDS;

/** Liste d'entrées (nom + résumé) d'un type, pour la page de liste. */
export function helpEntries(kind: HelpKind): { id: string; name: string; summary: string }[] {
  if (kind === "classes") return CLASSES.map((c) => ({ id: c.id, name: c.name, summary: c.description }));
  if (kind === "species") return SPECIES.map((s) => ({ id: s.id, name: s.name, summary: s.description }));
  if (kind === "weapons")
    return WEAPONS.map((w) => ({
      id: w.id, name: w.name,
      summary: `${w.category === "simple" ? "Courante" : "De guerre"} · ${w.damage.count}d${w.damage.sides} ${w.damageType}${w.properties.length ? " · " + w.properties.map((p) => WEAPON_PROPERTY_TEXT[p].name.toLowerCase()).join(", ") : ""}`,
    }));
  if (kind === "spells")
    return [...SPELLS]
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "fr"))
      .map((sp) => ({
        id: sp.id, name: sp.name,
        summary: `${sp.level === 0 ? "Sort mineur" : "Niveau 1"} · ${sp.school}${isPlayable(sp) ? "" : " · pas encore jouable en combat"}`,
      }));
  if (kind === "conditions")
    return CONDITIONS.map((c) => ({ id: c.id, name: c.name, summary: `${c.status === "applied" ? "Appliqué en combat" : "Pas encore appliqué"} · ${c.text}` }));
  if (kind === "armors")
    return ARMORS.map((a) => ({
      id: a.id, name: a.name,
      summary: a.kind === "shield" ? "Bouclier · +2 CA" : `${a.kind === "light" ? "Légère" : a.kind === "medium" ? "Intermédiaire" : "Lourde"} · CA ${a.baseAc}`,
    }));
  return BACKGROUNDS.map((b) => ({ id: b.id, name: b.name, summary: BACKGROUND_TEXT[b.id] }));
}

/** Illustration d'une entrée d'aide (les armes et armures n'en ont pas). */
export function helpArt(kind: HelpKind | string, id: string): string | undefined {
  if (kind === "classes") return artKey("class", id);
  if (kind === "species") return artKey("species", id);
  if (kind === "backgrounds") return artKey("background", id);
  return undefined;
}
