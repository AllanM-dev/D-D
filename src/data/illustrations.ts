import { GAME_ICONS } from "./game-icons.generated";

/**
 * Illustrations : icônes de game-icons.net (CC BY 3.0, voir Crédits) sur un badge coloré.
 * Les clés sont `<type>:<id>` (voir `artKey`). Après avoir ajouté ou changé un `icon`, lancer
 * `node scripts/extract-icons.mjs` (voir ce script) pour mettre à jour `game-icons.generated.ts`.
 */
export type ArtKind = "class" | "species" | "background" | "monster";

export interface Art {
  /** Teinte du badge (0–360). */
  hue: number;
  /** Nom de l'icône dans game-icons.net. */
  icon: string;
}

export const artKey = (kind: ArtKind, id: string) => `${kind}:${id}`;

const classes: Record<string, Art> = {
  barbarian: { hue: 10, icon: "barbarian" },
  bard: { hue: 300, icon: "lyre" },
  cleric: { hue: 45, icon: "holy-symbol" },
  druid: { hue: 120, icon: "oak-leaf" },
  fighter: { hue: 215, icon: "crossed-swords" },
  monk: { hue: 30, icon: "meditation" },
  paladin: { hue: 195, icon: "templar-shield" },
  ranger: { hue: 150, icon: "archer" },
  rogue: { hue: 260, icon: "hooded-assassin" },
  sorcerer: { hue: 350, icon: "fire-spell-cast" },
  warlock: { hue: 280, icon: "warlock-eye" },
  wizard: { hue: 235, icon: "wizard-face" },
};

const species: Record<string, Art> = {
  dragonborn: { hue: 5, icon: "spiked-dragon-head" },
  dwarf: { hue: 25, icon: "dwarf-face" },
  elf: { hue: 140, icon: "woman-elf-face" },
  gnome: { hue: 330, icon: "bad-gnome" },
  goliath: { hue: 205, icon: "giant" },
  halfling: { hue: 85, icon: "hobbit-door" },
  human: { hue: 215, icon: "person" },
  orc: { hue: 100, icon: "orc-head" },
  tiefling: { hue: 335, icon: "devil-mask" },
};

const backgrounds: Record<string, Art> = {
  acolyte: { hue: 40, icon: "prayer" },
  criminal: { hue: 275, icon: "robber-mask" },
  sage: { hue: 220, icon: "quill-ink" },
  soldier: { hue: 8, icon: "spartan-helmet" },
};

const monsters: Record<string, Art> = {
  "giant-rat": { hue: 30, icon: "rat" },
  goblin: { hue: 105, icon: "goblin-head" },
  skeleton: { hue: 220, icon: "skull-crossed-bones" },
  zombie: { hue: 85, icon: "shambling-zombie" },
  wolf: { hue: 215, icon: "wolf-head" },
  bandit: { hue: 10, icon: "bandit" },
  orc: { hue: 100, icon: "orc-head" },
};

export const ART: Record<string, Art> = {};
for (const [kind, group] of [["class", classes], ["species", species], ["background", backgrounds], ["monster", monsters]] as const)
  for (const [id, art] of Object.entries(group)) ART[artKey(kind, id)] = art;

/** Icône (repère 512×512) centrée dans le badge 64×64 avec une marge. */
const SCALE = 0.096;
const OFFSET = (64 - 512 * SCALE) / 2;

export interface ResolvedArt extends Art {
  /** Contenu SVG du glyphe, prêt à être placé dans un <svg viewBox="0 0 64 64">. */
  glyph: string;
}

export function getArt(key: string | undefined): ResolvedArt | undefined {
  const art = key ? ART[key] : undefined;
  const body = art ? GAME_ICONS[art.icon] : undefined;
  if (!art || !body) return undefined;
  return { ...art, glyph: `<g transform="translate(${OFFSET} ${OFFSET}) scale(${SCALE})">${body}</g>` };
}
