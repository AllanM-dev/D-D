/**
 * Illustrations vectorielles originales (dessinées pour ce projet) : un glyphe sur un badge coloré.
 * Repère 64×64. Le glyphe utilise `currentColor` (parchemin) ; les classes `a` (or), `d` (ombre), `p` (rose),
 * `r` (rouge) donnent les détails. Les clés sont `<type>:<id>` (voir `artKey`).
 */
export type ArtKind = "class" | "species" | "background" | "monster";

export interface Art {
  hue: number;
  /** Contenu SVG du glyphe (éléments internes, sans balise <svg>). */
  glyph: string;
}

const S = (w = 3.5) => `stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;

export const artKey = (kind: ArtKind, id: string) => `${kind}:${id}`;

const classes: Record<string, Art> = {
  barbarian: { hue: 10, glyph: `
    <path d="M18 56 L40 10" ${S(4.5)}/>
    <path d="M37 9 C55 6 62 22 56 38 C52 35 46 34 40 35 Z" fill="currentColor"/>
    <path d="M35 14 L24 8 L27 22 Z" fill="currentColor"/>
    <path d="M46 16 C50 19 52 24 51 30" class="d" stroke-width="2.2" fill="none" stroke-linecap="round"/>` },
  bard: { hue: 300, glyph: `
    <ellipse cx="22" cy="47" rx="7.5" ry="5.5" fill="currentColor" transform="rotate(-20 22 47)"/>
    <ellipse cx="42" cy="42" rx="7.5" ry="5.5" fill="currentColor" transform="rotate(-20 42 42)"/>
    <path d="M28.5 45 V16 M48.5 40 V11" ${S(3.5)}/>
    <path d="M28.5 16 L48.5 11 V19 L28.5 24 Z" fill="currentColor"/>` },
  cleric: { hue: 45, glyph: `
    <circle cx="32" cy="32" r="10" fill="currentColor"/>
    <circle cx="32" cy="32" r="5" class="a"/>
    <path d="M32 8 V15 M32 49 V56 M8 32 H15 M49 32 H56 M15 15 L20 20 M44 44 L49 49 M49 15 L44 20 M20 44 L15 49" ${S(3.5)}/>` },
  druid: { hue: 120, glyph: `
    <path d="M12 52 C10 26 28 10 54 10 C54 38 40 54 12 52 Z" fill="currentColor"/>
    <path d="M14 50 C24 38 34 28 46 18" class="d" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M26 38 L28 28 M34 31 L38 36 M22 44 L16 42" class="d" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  fighter: { hue: 215, glyph: `
    <path d="M32 6 L39 13 V40 H25 V13 Z" fill="currentColor"/>
    <path d="M32 10 V38" class="d" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="15" y="40" width="34" height="6" rx="3" fill="currentColor"/>
    <rect x="29" y="46" width="6" height="10" rx="2.5" fill="currentColor"/>
    <circle cx="32" cy="58" r="3.2" class="a"/>` },
  monk: { hue: 30, glyph: `
    <rect x="22" y="46" width="20" height="10" rx="3" fill="currentColor"/>
    <rect x="15" y="14" width="34" height="34" rx="10" fill="currentColor"/>
    <path d="M25.5 14 V27 M32 14 V27 M38.5 14 V27" class="d" stroke-width="2" fill="none" stroke-linecap="round"/>
    <rect x="17" y="30" width="27" height="11" rx="5.5" fill="currentColor" stroke="rgba(10,8,20,.62)" stroke-width="2"/>` },
  paladin: { hue: 195, glyph: `
    <path d="M32 6 L51 12 V31 C51 44 43 52 32 58 C21 52 13 44 13 31 V12 Z" fill="currentColor"/>
    <path d="M32 16 V47 M21 27 H43" class="a" stroke-width="5.5" fill="none" stroke-linecap="round"/>` },
  ranger: { hue: 150, glyph: `
    <path d="M22 8 C48 18 48 46 22 56" ${S(4)}/>
    <path d="M22 8 V56" ${S(1.8)}/>
    <path d="M10 32 H52" ${S(3)}/>
    <path d="M56 32 L46 26 V38 Z" fill="currentColor"/>
    <path d="M10 32 L5 27 M10 32 L5 37 M16 32 L11 27 M16 32 L11 37" ${S(2.4)}/>` },
  rogue: { hue: 260, glyph: `
    <path d="M32 58 L25 37 H39 Z" fill="currentColor"/>
    <rect x="18" y="31" width="28" height="6" rx="3" fill="currentColor"/>
    <rect x="29" y="14" width="6" height="17" rx="3" fill="currentColor"/>
    <circle cx="32" cy="10" r="4" class="a"/>
    <path d="M32 40 V52" class="d" stroke-width="1.6" stroke-linecap="round"/>` },
  sorcerer: { hue: 350, glyph: `
    <path d="M32 5 C35 16 49 21 49 38 C49 49 42 58 32 58 C22 58 15 49 15 38 C15 29 21 25 24 17 C27 21 29 23 32 5 Z" fill="currentColor"/>
    <path d="M32 58 C26 58 22 53 22 47 C22 40 29 37 32 29 C35 37 42 40 42 47 C42 53 38 58 32 58 Z" class="a"/>` },
  warlock: { hue: 280, glyph: `
    <path d="M5 32 C16 14 48 14 59 32 C48 50 16 50 5 32 Z" fill="currentColor"/>
    <circle cx="32" cy="32" r="11" class="d"/>
    <circle cx="32" cy="32" r="5.5" class="a"/>
    <path d="M32 6 V12 M16 10 L19 15 M48 10 L45 15" ${S(2.6)}/>` },
  wizard: { hue: 235, glyph: `
    <path d="M30 4 C34 16 44 32 50 46 H14 C20 32 26 16 30 4 Z" fill="currentColor"/>
    <ellipse cx="32" cy="48" rx="26" ry="6.5" fill="currentColor"/>
    <path d="M17 41 C26 45 38 45 47 41 L48 46 C38 50 26 50 16 46 Z" class="d"/>
    <path d="M32 18 l2.4 5.6 6 .5 -4.6 3.9 1.4 5.9 -5.2 -3.2 -5.2 3.2 1.4 -5.9 -4.6 -3.9 6 -.5 z" class="a"/>` },
};

const species: Record<string, Art> = {
  dragonborn: { hue: 5, glyph: `
    <path d="M22 24 C10 20 8 10 11 3 C14 12 21 16 28 19 Z M42 24 C54 20 56 10 53 3 C50 12 43 16 36 19 Z" fill="currentColor"/>
    <path d="M13 28 L25 19 H39 L51 28 L47 44 L38 57 H26 L17 44 Z" fill="currentColor"/>
    <path d="M18 29 L29 34 M46 29 L35 34" class="d" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="25" cy="32" rx="2.4" ry="3" class="a" transform="rotate(-25 25 32)"/><ellipse cx="39" cy="32" rx="2.4" ry="3" class="a" transform="rotate(25 39 32)"/>
    <circle cx="28" cy="49" r="1.8" class="d"/><circle cx="36" cy="49" r="1.8" class="d"/>
    <path d="M32 37 V45 M25 40 L28 42 M39 40 L36 42" class="d" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  dwarf: { hue: 25, glyph: `
    <circle cx="32" cy="27" r="12.5" fill="currentColor"/>
    <path d="M18 30 C14 48 24 59 32 59 C40 59 50 48 46 30 C42 38 22 38 18 30 Z" fill="currentColor" opacity=".78"/>
    <path d="M19 25 A13 13 0 0 1 45 25 Z" class="a"/>
    <rect x="17" y="23" width="30" height="4" rx="2" class="a"/>
    <circle cx="27" cy="29" r="1.8" class="d"/><circle cx="37" cy="29" r="1.8" class="d"/>
    <path d="M28 42 Q32 45 36 42" class="d" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  elf: { hue: 140, glyph: `
    <path d="M20 31 L4 20 L21 40 Z M44 31 L60 20 L43 40 Z" fill="currentColor"/>
    <circle cx="32" cy="33" r="14" fill="currentColor"/>
    <path d="M17 26 C20 12 44 12 47 26 C42 20 22 20 17 26 Z" class="a"/>
    <path d="M24 32 L29 33 M40 32 L35 33" class="d" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M28 42 Q32 45 36 42" class="d" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  gnome: { hue: 330, glyph: `
    <circle cx="32" cy="40" r="13" fill="currentColor"/>
    <path d="M17 36 L34 5 L47 36 Z" class="r"/>
    <rect x="14" y="33" width="36" height="5" rx="2.5" class="r"/>
    <circle cx="32" cy="42" r="4" class="p"/>
    <circle cx="26" cy="38" r="1.7" class="d"/><circle cx="38" cy="38" r="1.7" class="d"/>
    <path d="M22 50 C26 60 38 60 42 50 C38 54 26 54 22 50 Z" fill="currentColor"/>` },
  goliath: { hue: 205, glyph: `
    <circle cx="48" cy="14" r="6" class="a"/>
    <path d="M3 56 L21 22 L31 38 L42 16 L61 56 Z" fill="currentColor"/>
    <path d="M42 16 L35 29 L40 26 L44 31 L48 26 Z" class="a" opacity=".0"/>
    <path d="M42 16 L36 28 L41 25 L44 30 L48 25 L50 28 Z" fill="#fff" opacity=".9"/>
    <path d="M21 22 L16 32 L21 29 L25 33 Z" fill="#fff" opacity=".9"/>` },
  halfling: { hue: 85, glyph: `
    <circle cx="32" cy="33" r="24" fill="currentColor"/>
    <circle cx="32" cy="33" r="19" class="a"/>
    <path d="M32 14 V52 M21 19 V47 M43 19 V47" class="d" stroke-width="1.8" fill="none"/>
    <circle cx="40" cy="35" r="3" class="d"/>` },
  human: { hue: 215, glyph: `
    <circle cx="32" cy="22" r="11" fill="currentColor"/>
    <path d="M10 58 C10 42 21 36 32 36 C43 36 54 42 54 58 Z" fill="currentColor"/>
    <path d="M25 52 L32 42 L39 52" class="d" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  orc: { hue: 100, glyph: `
    <path d="M13 30 C13 15 23 11 32 11 C41 11 51 15 51 30 C51 44 43 52 32 52 C21 52 13 44 13 30 Z" fill="currentColor"/>
    <path d="M15 22 L28 28 M49 22 L36 28" class="d" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    <circle cx="25" cy="31" r="2.2" class="d"/><circle cx="39" cy="31" r="2.2" class="d"/>
    <path d="M23 49 L25 36 L30 49 Z M41 49 L39 36 L34 49 Z" class="a"/>
    <path d="M26 46 H38" class="d" stroke-width="2" fill="none"/>` },
  tiefling: { hue: 335, glyph: `
    <circle cx="32" cy="38" r="14" fill="currentColor"/>
    <path d="M21 30 C9 27 7 13 14 5 C14 17 21 21 28 25 Z M43 30 C55 27 57 13 50 5 C50 17 43 21 36 25 Z" class="r"/>
    <path d="M25 37 L30 38 M39 37 L34 38" class="d" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M28 47 Q32 50 36 47" class="d" stroke-width="2" fill="none" stroke-linecap="round"/>` },
};

const backgrounds: Record<string, Art> = {
  acolyte: { hue: 40, glyph: `
    <path d="M32 6 C38 14 40 19 37 24 C35 27 29 27 27 24 C24 19 26 14 32 6 Z" class="a"/>
    <rect x="26" y="26" width="12" height="27" rx="2.5" fill="currentColor"/>
    <rect x="18" y="52" width="28" height="6" rx="3" fill="currentColor"/>
    <path d="M30 32 V46" class="d" stroke-width="1.6" stroke-linecap="round"/>` },
  criminal: { hue: 275, glyph: `
    <circle cx="21" cy="22" r="12" fill="currentColor"/>
    <circle cx="21" cy="22" r="4.5" class="d"/>
    <path d="M30 31 L53 54" ${S(6.5)}/>
    <path d="M47 48 L54 41 M40 41 L46 35" ${S(4)}/>` },
  sage: { hue: 220, glyph: `
    <path d="M6 14 C19 10 28 12 32 19 C36 12 45 10 58 14 V51 C45 47 36 49 32 56 C28 49 19 47 6 51 Z" fill="currentColor"/>
    <path d="M32 19 V56" class="d" stroke-width="2.4" fill="none"/>
    <path d="M12 22 C18 21 23 22 27 25 M12 30 C18 29 23 30 27 33 M37 25 C41 22 46 21 52 22 M37 33 C41 30 46 29 52 30" class="d" stroke-width="1.8" fill="none" stroke-linecap="round"/>` },
  soldier: { hue: 8, glyph: `
    <path d="M32 9 C30 1 44 0 46 8" class="a" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M12 56 V30 C12 17 21 9 32 9 C43 9 52 17 52 30 V56 H43 V45 H21 V56 Z" fill="currentColor"/>
    <path d="M21 31 H43 M32 31 V45" class="d" stroke-width="3.4" fill="none" stroke-linecap="butt"/>
    <path d="M12 24 H52" class="d" stroke-width="1.8" fill="none"/>` },
};

const monsters: Record<string, Art> = {
  "giant-rat": { hue: 30, glyph: `
    <circle cx="19" cy="21" r="9" fill="currentColor"/><circle cx="45" cy="21" r="9" fill="currentColor"/>
    <circle cx="19" cy="21" r="4.5" class="p"/><circle cx="45" cy="21" r="4.5" class="p"/>
    <ellipse cx="32" cy="38" rx="16" ry="14" fill="currentColor"/>
    <circle cx="25.5" cy="34" r="2.6" class="d"/><circle cx="38.5" cy="34" r="2.6" class="d"/>
    <circle cx="32" cy="43" r="3.4" class="p"/>
    <path d="M22 44 H8 M22 48 L9 53 M42 44 H56 M42 48 L55 53 M29 47 L29 51 M35 47 L35 51" ${S(1.8)}/>` },
  goblin: { hue: 105, glyph: `
    <path d="M18 30 L3 21 L18 43 Z M46 30 L61 21 L46 43 Z" fill="currentColor"/>
    <circle cx="32" cy="34" r="16" fill="currentColor"/>
    <path d="M21 29 L30 33 M43 29 L34 33" class="d" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="26.5" cy="34" r="1.8" class="a"/><circle cx="37.5" cy="34" r="1.8" class="a"/>
    <path d="M22 43 Q32 50 42 43" class="d" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M26 45 L28 50 L30 46 Z M34 46 L36 50 L38 45 Z" class="a"/>` },
  skeleton: { hue: 220, glyph: `
    <path d="M32 6 C18 6 11 17 11 28 C11 36 15 41 20 43 V52 H44 V43 C49 41 53 36 53 28 C53 17 46 6 32 6 Z" fill="currentColor"/>
    <circle cx="23.5" cy="29" r="6.5" class="d"/><circle cx="40.5" cy="29" r="6.5" class="d"/>
    <path d="M32 36 L27.5 45 H36.5 Z" class="d"/>
    <path d="M25 52 V45 M32 52 V47 M39 52 V45" class="d" stroke-width="2" fill="none"/>` },
  zombie: { hue: 85, glyph: `
    <path d="M32 8 C18 8 11 19 12 32 C13 45 22 54 32 54 C42 54 51 45 52 32 C53 19 46 8 32 8 Z" fill="currentColor"/>
    <path d="M20 24 L29 33 M29 24 L20 33 M35 24 L44 33 M44 24 L35 33" class="d" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M21 44 H43" class="d" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M25 40 V48 M31 40 V48 M37 40 V48 M43 40 V48" class="d" stroke-width="1.8" fill="none"/>
    <path d="M44 10 L52 4 M47 14 L56 12" ${S(3)}/>` },
  wolf: { hue: 215, glyph: `
    <path d="M10 5 L25 19 H39 L54 5 L56 30 C56 42 47 50 39 52 H25 C17 50 8 42 8 30 Z" fill="currentColor"/>
    <path d="M15 13 L22 20 L16 24 Z M49 13 L42 20 L48 24 Z" class="d"/>
    <path d="M17 31 L28 35 M47 31 L36 35" class="d" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="25" cy="35" rx="2.2" ry="1.8" class="a"/><ellipse cx="39" cy="35" rx="2.2" ry="1.8" class="a"/>
    <path d="M26 38 L28 55 H36 L38 38" class="d" stroke-width="2" fill="none" stroke-linejoin="round"/>
    <ellipse cx="32" cy="54" rx="5" ry="3.6" class="d"/>
    <path d="M28.5 55 L29.5 60 L31 56 M35.5 55 L34.5 60 L33 56" class="a" stroke="none"/>
    <path d="M9 38 L19 40 M55 38 L45 40" class="d" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  bandit: { hue: 10, glyph: `
    <path d="M32 5 C16 5 9 21 11 40 L19 54 H45 L53 40 C55 21 48 5 32 5 Z" fill="currentColor"/>
    <ellipse cx="32" cy="33" rx="13" ry="15" class="d"/>
    <path d="M18 33 H46 V44 C40 49 24 49 18 44 Z" class="r"/>
    <circle cx="26.5" cy="28" r="2.6" fill="#fff"/><circle cx="37.5" cy="28" r="2.6" fill="#fff"/>
    <path d="M22 22 L30 25 M42 22 L34 25" class="d" stroke-width="2.6" fill="none" stroke-linecap="round"/>` },
  orc: { hue: 100, glyph: species.orc.glyph },
};

export const ART: Record<string, Art> = {};
for (const [kind, group] of [["class", classes], ["species", species], ["background", backgrounds], ["monster", monsters]] as const)
  for (const [id, art] of Object.entries(group)) ART[artKey(kind, id)] = art;

export const getArt = (key: string | undefined): Art | undefined => (key ? ART[key] : undefined);
