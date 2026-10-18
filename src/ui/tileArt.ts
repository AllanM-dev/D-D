import type { TileKind } from "../data/maps";

/**
 * Dessin des cases : de petits SVG originaux (32×32), générés à partir de la nature de la case,
 * d'une variante choisie par position et du voisinage (ombres, rives, lisières).
 * Aucune image extérieure : tout est dessiné ici, sans licence à gérer.
 */
export const VARIANTS = 6;
const N = 1, E = 2, S = 4, W = 8;

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Variante d'une case : fixe pour une position donnée, répartie sans motif visible. */
export function variantAt(x: number, y: number): number {
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) % VARIANTS;
}

type Neighbours = readonly [TileKind | undefined, TileKind | undefined, TileKind | undefined, TileKind | undefined]; // N, E, S, W

/** Bits des côtés qui touchent un voisin « différent » pour ce type de case. */
export function edgesOf(kind: TileKind, nb: Neighbours): number {
  const test = (pred: (k: TileKind) => boolean) =>
    nb.reduce<number>((m, k, i) => (k !== undefined && pred(k) ? m | [N, E, S, W][i] : m), 0);
  switch (kind) {
    case "wall": return test((k) => k !== "wall");
    case "water": return test((k) => k !== "water" && k !== "bridge");
    case "path": return test((k) => k === "grass" || k === "tree");
    case "floor": case "grass": case "planks": return test((k) => k === "wall" || k === "tree" || k === "house");
    case "house": return test((k) => k !== "house");
    case "door": return test((k) => k === "house");
    case "bridge": return test((k) => k === "water");
    default: return 0;
  }
}

const f = (n: number) => +n.toFixed(1);
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];

const GRASS = ["#4f7f3a", "#518139", "#4d7d3b", "#528339", "#4e7e3a", "#50803c"];

function grass(v: number, e: number, r: () => number): string {
  let s = `<rect width="32" height="32" fill="${GRASS[v]}"/>`;
  s += `<ellipse cx="${f(13 + r() * 6)}" cy="${f(13 + r() * 6)}" rx="9" ry="6" fill="#fff" opacity=".03"/>`;
  for (let i = 0; i < 9; i++) {
    const x = r() * 30 + 1, y = r() * 28 + 3, h = 2.5 + r() * 2.5;
    s += `<path d="M${f(x)} ${f(y)}l-1.2 -${f(h)}M${f(x)} ${f(y)}l.4 -${f(h + 1)}M${f(x)} ${f(y)}l1.6 -${f(h)}" stroke="${r() > 0.5 ? "#6b9a4c" : "#3b6a2c"}" stroke-width=".9" fill="none" stroke-linecap="round"/>`;
  }
  if (v === 1 || v === 4) {
    for (let i = 0; i < 3; i++) {
      const x = 4 + r() * 24, y = 5 + r() * 22;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="1.6" fill="${pick(r, ["#fff6c8", "#f4a9c0", "#ffe27a", "#d6c3ff"])}"/><circle cx="${f(x)}" cy="${f(y)}" r=".6" fill="#e0a020"/>`;
    }
  }
  if (v === 2) s += `<ellipse cx="${f(8 + r() * 16)}" cy="${f(10 + r() * 14)}" rx="2.6" ry="1.8" fill="#8d8d86"/><ellipse cx="${f(8 + r() * 16)}" cy="${f(10 + r() * 14)}" rx="1.6" ry="1" fill="#a9a9a1"/>`;
  if (v === 5) s += `<ellipse cx="16" cy="16" rx="5" ry="3.5" fill="#2f5f2a" opacity=".6"/><ellipse cx="15" cy="15" rx="3" ry="2" fill="#3f7a35"/>`;
  return s + shade(e);
}

/** Ombre portée par un mur ou un arbre voisin. */
function shade(e: number): string {
  let s = "";
  if (e & N) s += `<rect width="32" height="9" fill="url(#sn)"/>`;
  if (e & W) s += `<rect width="6" height="32" fill="url(#sw)"/>`;
  if (e & E) s += `<rect x="26" width="6" height="32" fill="url(#se)"/>`;
  return s;
}
const DEFS = `<defs><linearGradient id="sn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient><linearGradient id="sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient><linearGradient id="se" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>`;

function path(v: number, e: number, r: () => number): string {
  let s = `<rect width="32" height="32" fill="${["#b59a63", "#b9a068", "#b0955d", "#bba46d", "#b39860", "#b79c65"][v]}"/>`;
  for (let i = 0; i < 14; i++) s += `<circle cx="${f(r() * 32)}" cy="${f(r() * 32)}" r="${f(0.5 + r() * 0.9)}" fill="${r() > 0.5 ? "#8f7a49" : "#d4bf8a"}" opacity=".75"/>`;
  if (v === 1 || v === 3) s += `<path d="M0 ${f(10 + r() * 4)}Q16 ${f(8 + r() * 6)} 32 ${f(10 + r() * 4)}M0 ${f(21 + r() * 4)}Q16 ${f(19 + r() * 6)} 32 ${f(21 + r() * 4)}" stroke="#9c8650" stroke-width="1.4" fill="none" opacity=".6"/>`;
  if (v === 4) s += `<ellipse cx="${f(8 + r() * 16)}" cy="${f(8 + r() * 16)}" rx="2.4" ry="1.7" fill="#8a8378"/>`;
  // lisière d'herbe sur les côtés qui touchent l'herbe ou les arbres
  const tuft = (x: number, y: number, rot: number) => `<path transform="translate(${x} ${y}) rotate(${rot})" d="M0 0l-1.5 -4M0 0l.3 -5M0 0l1.8 -4" stroke="#4f7f3a" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  if (e & N) s += `<rect width="32" height="4" fill="#4f7f3a"/>` + [3, 10, 17, 24, 30].map((x) => tuft(x, 7 + r() * 2, 180)).join("");
  if (e & S) s += `<rect y="28" width="32" height="4" fill="#4f7f3a"/>` + [4, 11, 18, 26].map((x) => tuft(x, 25 - r() * 2, 0)).join("");
  if (e & W) s += `<rect width="4" height="32" fill="#4f7f3a"/>` + [5, 14, 23].map((y) => tuft(7 + r() * 2, y, 90)).join("");
  if (e & E) s += `<rect x="28" width="4" height="32" fill="#4f7f3a"/>` + [5, 14, 23].map((y) => tuft(25 - r() * 2, y, -90)).join("");
  return s;
}

function floor(v: number, e: number, r: () => number): string {
  const tone = ["#8a8a92", "#8e8e96", "#85858d", "#909098", "#88888f", "#8c8c94"][v];
  let s = `<rect width="32" height="32" fill="${tone}"/>`;
  const off = v % 2 ? 8 : 0;
  s += `<path d="M0 16H32M${16 + off} 0V16M${off ? 8 : 24} 16V32" stroke="#5f5f68" stroke-width="1.2" fill="none"/>`;
  s += `<path d="M0 1H32M1 0V32" stroke="#a9a9b2" stroke-width=".8" opacity=".6"/>`;
  for (let i = 0; i < 5; i++) s += `<circle cx="${f(r() * 32)}" cy="${f(r() * 32)}" r=".7" fill="#6c6c75"/>`;
  if (v === 2) s += `<path d="M${f(6 + r() * 8)} ${f(4 + r() * 8)}l5 4 -2 5 4 4" stroke="#4d4d55" stroke-width="1" fill="none"/>`;
  if (v === 4) s += `<ellipse cx="${f(6 + r() * 6)}" cy="${f(20 + r() * 8)}" rx="4" ry="2.4" fill="#4f6f3a" opacity=".6"/>`;
  if (v === 5) s += `<path d="M2 2l6 3M2 2l3 6M2 2l5 5" stroke="#e8e8ee" stroke-width=".6" opacity=".5"/>`;
  return s + shade(e);
}

function wall(v: number, e: number, r: () => number): string {
  const top = ["#6a6a73", "#6e6e77", "#66666f", "#707079", "#686871", "#6c6c75"][v];
  let s = `<rect width="32" height="32" fill="${top}"/>`;
  // dessus du mur : briques
  const faceH = e & S ? 12 : 0;
  const h = 32 - faceH;
  for (let row = 0; row * 8 < h; row++) {
    const y = row * 8, shift = row % 2 ? 8 : 0;
    s += `<path d="M0 ${y}H32" stroke="#4c4c54" stroke-width="1"/>`;
    for (let x = shift; x < 32; x += 16) s += `<path d="M${x} ${y}v${Math.min(8, h - y)}" stroke="#4c4c54" stroke-width="1"/>`;
  }
  for (let i = 0; i < 6; i++) s += `<rect x="${f(r() * 28)}" y="${f(r() * Math.max(1, h - 4))}" width="${f(3 + r() * 5)}" height="3" fill="${r() > 0.5 ? "#7d7d86" : "#5a5a63"}" opacity=".6"/>`;
  s += `<rect width="32" height="2" fill="#8c8c96" opacity=".7"/>`;
  if (e & S) {
    // face avant, plus sombre, avec joints décalés
    s += `<rect y="${h}" width="32" height="${faceH}" fill="#45454d"/><rect y="${h}" width="32" height="2" fill="#8a8a94"/>`;
    s += `<path d="M0 ${h + 6}H32M8 ${h + 2}v4M24 ${h + 2}v4M0 ${h + 6}M16 ${h + 6}v6" stroke="#2e2e35" stroke-width="1"/>`;
    s += `<rect y="${32 - 3}" width="32" height="3" fill="#000" opacity=".25"/>`;
    if (v === 3) s += `<rect x="13" y="${h + 1}" width="6" height="2" rx="1" fill="#2b2b30"/><path d="M16 ${h - 3}v-4" stroke="#6b4a22" stroke-width="2"/><ellipse cx="16" cy="${h - 8}" rx="3" ry="4.5" fill="#ff9a1f"/><ellipse cx="16" cy="${h - 7}" rx="1.6" ry="2.6" fill="#ffe27a"/>`;
  }
  if (e & W) s += `<rect width="2" height="32" fill="#8c8c96" opacity=".5"/>`;
  if (e & E) s += `<rect x="30" width="2" height="32" fill="#2a2a30" opacity=".5"/>`;
  return s;
}

function tree(v: number, _e: number, r: () => number): string {
  let s = `<rect width="32" height="32" fill="${GRASS[v]}"/>`;
  s += `<ellipse cx="16" cy="25" rx="12" ry="5" fill="#000" opacity=".3"/>`;
  const dark = ["#1d4a1c", "#1f4f1e", "#1a451a"][v % 3], mid = ["#2f6a2a", "#33702d", "#2c6427"][v % 3], light = ["#4a8a3a", "#4f9040", "#448435"][v % 3];
  s += `<circle cx="${f(11 + r() * 2)}" cy="${f(17 + r() * 2)}" r="9" fill="${dark}"/><circle cx="${f(21 + r() * 2)}" cy="${f(17 + r() * 2)}" r="9" fill="${dark}"/>`;
  s += `<circle cx="16" cy="12" r="10.5" fill="${mid}"/>`;
  s += `<circle cx="${f(12 + r() * 3)}" cy="${f(9 + r() * 2)}" r="5" fill="${light}" opacity=".85"/><circle cx="${f(19 + r() * 3)}" cy="${f(14 + r() * 2)}" r="3.5" fill="${light}" opacity=".6"/>`;
  if (v === 1) s += `<circle cx="9" cy="14" r="1.5" fill="#d9413a"/><circle cx="21" cy="9" r="1.5" fill="#d9413a"/><circle cx="15" cy="18" r="1.5" fill="#d9413a"/>`;
  return s;
}

function water(v: number, e: number, r: () => number): string {
  let s = `<rect width="32" height="32" fill="url(#wg)"/>`;
  for (let i = 0; i < 4; i++) {
    const x = r() * 22, y = 4 + i * 7 + r() * 3;
    s += `<path d="M${f(x)} ${f(y)}q3 -2.5 6 0t6 0" stroke="#bfe0ff" stroke-width="1.1" fill="none" opacity=".6" stroke-linecap="round"/>`;
  }
  if (v % 3 === 0) s += `<circle cx="${f(6 + r() * 20)}" cy="${f(6 + r() * 20)}" r="1" fill="#fff" opacity=".8"/>`;
  if (v === 4) s += `<ellipse cx="${f(10 + r() * 12)}" cy="${f(10 + r() * 12)}" rx="4" ry="2.4" fill="#3f8f4a"/><ellipse cx="${f(10 + r() * 12)}" cy="${f(10 + r() * 12)}" rx="1.4" ry=".9" fill="#f4a9c0"/>`;
  const foam = (d: string) => `<path d="${d}" stroke="#e6f3ff" stroke-width="2.2" fill="none" opacity=".75" stroke-linecap="round"/>`;
  if (e & N) s += foam("M0 1.5q4 2 8 0t8 0 8 0 8 0");
  if (e & S) s += foam("M0 30.5q4 -2 8 0t8 0 8 0 8 0");
  if (e & W) s += foam("M1.5 0q2 4 0 8t0 8 0 8 0 8");
  if (e & E) s += foam("M30.5 0q-2 4 0 8t0 8 0 8 0 8");
  return `<defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a80c7"/><stop offset="1" stop-color="#2a5f9f"/></linearGradient></defs>` + s;
}

function bridge(_v: number, e: number, r: () => number): string {
  let s = `<rect width="32" height="32" fill="#2f6fb5"/><rect x="2" width="28" height="32" fill="#8b6a3a"/>`;
  for (let x = 2; x < 30; x += 7) s += `<path d="M${x} 0v32" stroke="#5c4424" stroke-width="1"/><path d="M${x + 3} 0v32" stroke="#a4804a" stroke-width=".8" opacity=".7"/>`;
  for (let i = 0; i < 6; i++) s += `<circle cx="${f(3 + r() * 26)}" cy="${f(r() * 32)}" r=".7" fill="#4a361c"/>`;
  s += `<rect x="2" width="2.4" height="32" fill="#5c4424"/><rect x="27.6" width="2.4" height="32" fill="#5c4424"/>`;
  if (e & N || e & S) s += "";
  return s;
}

/** Toit d'une maison vu de dessus : tuiles, avant-toit ombré, façade crépie avec fenêtre sur le côté qui donne sur l'extérieur. */
function house(v: number, e: number, r: () => number): string {
  const roof = ["#a8472f", "#b04d33", "#a1422b", "#b3513a", "#9d3f28", "#ab4a31"][v];
  const faceH = e & S ? 12 : 0;
  const h = 32 - faceH;
  let s = `<rect width="32" height="${h}" fill="${roof}"/>`;
  for (let y = 0, row = 0; y < h; y += 6, row++) {
    s += `<path d="M0 ${y + 5.5}H32" stroke="#6f2a1a" stroke-width="1"/>`;
    for (let x = row % 2 ? 4 : 0; x < 32; x += 8) s += `<path d="M${x} ${y}v5.5" stroke="#6f2a1a" stroke-width=".8" opacity=".7"/>`;
  }
  for (let i = 0; i < 5; i++) s += `<rect x="${f(r() * 28)}" y="${f(r() * Math.max(1, h - 4))}" width="${f(3 + r() * 4)}" height="2.4" rx=".6" fill="${r() > 0.5 ? "#c4624a" : "#8a3320"}" opacity=".6"/>`;
  if (e & N) s += `<rect width="32" height="3" fill="#d98a6a"/><rect y="3" width="32" height="1.5" fill="#6f2a1a" opacity=".5"/>`;
  if (e & W) s += `<rect width="3" height="${h}" fill="#d98a6a" opacity=".7"/>`;
  if (e & E) s += `<rect x="29" width="3" height="${h}" fill="#5a2012" opacity=".6"/>`;
  if (e & S) {
    s += `<rect y="${h}" width="32" height="${faceH}" fill="#e8dcc0"/><rect y="${h}" width="32" height="3" fill="#7a4a22"/><rect y="${h + 3}" width="32" height="2" fill="#000" opacity=".15"/>`;
    s += `<rect y="29" width="32" height="3" fill="#8a7a5a"/><path d="M0 ${h}h32" stroke="#4a2c12" stroke-width="1"/>`;
    if (v % 2 === 0) s += `<rect x="9" y="${h + 4}" width="14" height="10" rx="1" fill="#5aa0d8" stroke="#7a4a22" stroke-width="1.6"/><path d="M16 ${h + 4}v10M9 ${h + 9}h14" stroke="#7a4a22" stroke-width="1"/><path d="M10 ${h + 5}l5 0 -5 4Z" fill="#fff" opacity=".35"/>`;
    else s += `<path d="M0 ${h + 3}L8 29M32 ${h + 3}L24 29M16 ${h + 3}V29" stroke="#7a4a22" stroke-width="1.6" opacity=".8"/>`;
  }
  return s;
}

/** Plancher en bois d'une maison. */
function planks(v: number, e: number, r: () => number): string {
  const tone = ["#9a6b3c", "#a0713f", "#946636", "#a4753f", "#98693a", "#9e6e3d"][v];
  let s = `<rect width="32" height="32" fill="${tone}"/>`;
  for (let y = 0; y < 32; y += 8) {
    s += `<path d="M0 ${y}H32" stroke="#5c3a1c" stroke-width="1.2"/>`;
    const sx = (y / 8 + v) % 2 ? 10 : 22;
    s += `<path d="M${sx} ${y}v8" stroke="#5c3a1c" stroke-width="1"/><circle cx="${sx - 3}" cy="${y + 2.5}" r=".6" fill="#3d2610"/><circle cx="${sx + 3}" cy="${y + 5.5}" r=".6" fill="#3d2610"/>`;
    s += `<path d="M${f(r() * 8)} ${y + 4}q8 -2 ${f(10 + r() * 8)} 0" stroke="#7d5428" stroke-width=".7" fill="none" opacity=".7"/>`;
  }
  if (v === 3) s += `<rect x="5" y="8" width="22" height="16" rx="2" fill="#a83a3a" opacity=".55"/><rect x="7" y="10" width="18" height="12" rx="1" fill="none" stroke="#e8c35a" stroke-width="1" opacity=".7"/>`;
  return s + shade(e);
}

function door(_v: number, e: number, _r: () => number): string {
  const frame = e & W && e & E ? "#e8dcc0" : "#45454d"; // porte de maison : encadrement crépi
  return `<rect width="32" height="32" fill="${frame}"/><path d="M4 32V12a12 12 0 0 1 24 0V32Z" fill="#4a2c12"/><path d="M6 32V12a10 10 0 0 1 20 0V32Z" fill="#7a4a22"/>`
    + `<path d="M11 32V8M16 32V2M21 32V8" stroke="#4a2c12" stroke-width="1" opacity=".8"/>`
    + `<path d="M6 12H26M6 23H26" stroke="#2f2f33" stroke-width="2.4"/><circle cx="21.5" cy="18" r="1.8" fill="#e0b84a"/><circle cx="21.5" cy="18" r=".7" fill="#7a5a10"/>`;
}

function stairs(_v: number, _e: number, _r: () => number): string {
  let s = `<rect width="32" height="32" fill="#585862"/>`;
  for (let i = 0; i < 5; i++) {
    const y = i * 6.4;
    s += `<rect y="${f(y)}" width="32" height="6.4" fill="${["#9a9aa6", "#8d8d99", "#80808c", "#737380", "#66666f"][i]}"/><rect y="${f(y)}" width="32" height="1.4" fill="#c0c0cc" opacity=".6"/><rect y="${f(y + 5)}" width="32" height="1.4" fill="#000" opacity=".3"/>`;
  }
  return s + `<path d="M16 8v15M11 18l5 6 5 -6" stroke="#2c2c34" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
}

const DRAW: Record<TileKind, (v: number, e: number, r: () => number) => string> = { grass, path, floor, wall, tree, water, bridge, door, stairs, house, planks };

const svgCache = new Map<string, string>();

/** SVG complet d'une case. */
export function tileSvg(kind: TileKind, variant: number, edges: number): string {
  const k = `${kind}:${variant}:${edges}`;
  let svg = svgCache.get(k);
  if (!svg) {
    const seed = [...kind].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) * 97 + variant * 13 + edges;
    const body = DRAW[kind](variant, edges, seeded(seed));
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="geometricPrecision">${body.includes("<defs>") ? "" : DEFS}${body}</svg>`;
    svgCache.set(k, svg);
  }
  return svg;
}

const urlCache = new Map<string, string>();

/** Fond CSS de la case (x, y) d'une grille de types de case. */
export function tileBackground(tiles: readonly (readonly TileKind[])[], x: number, y: number): string {
  const kind = tiles[y][x];
  const nb: Neighbours = [tiles[y - 1]?.[x], tiles[y]?.[x + 1], tiles[y + 1]?.[x], tiles[y]?.[x - 1]];
  const edges = edgesOf(kind, nb);
  const variant = variantAt(x, y);
  const k = `${kind}:${variant}:${edges}`;
  let url = urlCache.get(k);
  if (!url) {
    url = `url("data:image/svg+xml,${encodeURIComponent(tileSvg(kind, variant, edges))}")`;
    urlCache.set(k, url);
  }
  return url;
}
