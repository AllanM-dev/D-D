/**
 * Personnages 2D des cartes : héros, monstres et personnages non joueurs, dessinés en SVG
 * (32×32, de face, pieds vers y = 29). Tout est original, sans image extérieure.
 * Clés : `hero:<espèce>:<classe>`, `monster:<id>`, `npc:<id>`.
 */
const OUT = "#1c1a22";
const o = (extra = "") => `stroke="${OUT}" stroke-width=".9" stroke-linejoin="round" stroke-linecap="round"${extra ? " " + extra : ""}`;

interface Human {
  skin: string;
  hair?: string;
  style?: "short" | "long" | "bald" | "bun" | "mohawk" | "hood" | "cap" | "wizard" | "feather" | "helm" | "band";
  top: string;
  trim?: string;
  pants?: string;
  /** Cape dans le dos. */
  cloak?: string;
  /** Tenue longue (robe) au lieu d'un haut et d'un pantalon. */
  robe?: boolean;
  bare?: boolean;
  scale?: number;
  wide?: number;
  held?: string;
  offhand?: string;
  extraFront?: string;
  extraBack?: string;
  face?: "normal" | "dead" | "glow" | "masked" | "old";
  beard?: string;
  ears?: "round" | "pointy" | "big";
  horns?: string;
  tail?: string;
  tusks?: boolean;
  arms?: "down" | "forward";
  hunch?: boolean;
}

function human(h: Human): string {
  const sc = h.scale ?? 1;
  const w = h.wide ?? 0;
  const hairC = h.hair ?? "#5a3a1e";
  const pants = h.pants ?? "#4a4a5a";
  const trim = h.trim ?? "#c9a84a";
  let s = `<g transform="translate(16 29) scale(${sc}) translate(-16 -29)${h.hunch ? " rotate(4 16 29)" : ""}">`;
  s += h.extraBack ?? "";
  if (h.tail) s += `<path d="M20 25q8 0 7 -7" fill="none" stroke="${h.tail}" stroke-width="2" stroke-linecap="round"/>`;
  if (h.cloak) s += `<path d="M${9 - w} 14 L${6 - w} 28 L${26 + w} 28 L${23 + w} 14 Z" fill="${h.cloak}" ${o()}/>`;
  // jambes
  if (!h.robe) s += `<rect x="${11.5 - w / 2}" y="22" width="4" height="6.5" rx="1" fill="${pants}" ${o()}/><rect x="${16.5 + w / 2}" y="22" width="4" height="6.5" rx="1" fill="${pants}" ${o()}/><rect x="${10.8 - w / 2}" y="27.2" width="5.4" height="2.3" rx="1" fill="#3a2a1c" ${o()}/><rect x="${15.8 + w / 2}" y="27.2" width="5.4" height="2.3" rx="1" fill="#3a2a1c" ${o()}/>`;
  // bras (derrière)
  const armCol = h.bare ? h.skin : h.top;
  if (h.arms === "forward") s += `<rect x="${5 - w}" y="14" width="3.6" height="8" rx="1.6" fill="${armCol}" ${o()} transform="rotate(-25 7 14)"/><rect x="${23.4 + w}" y="14" width="3.6" height="8" rx="1.6" fill="${armCol}" ${o()} transform="rotate(25 25 14)"/>`;
  else s += `<rect x="${6.2 - w}" y="14.5" width="3.6" height="8" rx="1.6" fill="${armCol}" ${o()}/>`;
  // corps
  if (h.robe) s += `<path d="M${10 - w} 14.5 Q16 12.5 ${22 + w} 14.5 L${24.5 + w} 28.6 Q16 30.4 ${7.5 - w} 28.6 Z" fill="${h.top}" ${o()}/><path d="M16 14 V29" stroke="${trim}" stroke-width="1.4"/><rect x="${10.5 - w}" y="20" width="${11 + 2 * w}" height="1.8" fill="${trim}"/>`;
  else s += `<rect x="${10 - w}" y="14" width="${12 + 2 * w}" height="9.5" rx="2.4" fill="${h.top}" ${o()}/><rect x="${10 - w}" y="21.2" width="${12 + 2 * w}" height="1.8" fill="${trim}" opacity=".9"/>`;
  s += h.extraFront ?? "";
  if (h.arms !== "forward") s += `<rect x="${22.2 + w}" y="14.5" width="3.6" height="8" rx="1.6" fill="${armCol}" ${o()}/>`;
  s += `<circle cx="${8 - w}" cy="22.8" r="1.7" fill="${h.skin}" ${o()}/>`;
  if (h.arms !== "forward") s += `<circle cx="${24 + w}" cy="22.8" r="1.7" fill="${h.skin}" ${o()}/>`;
  // tête
  if (h.horns) s += `<path d="M10.5 6.5 Q7 3 8 0.5 Q11 3 12.5 6 M21.5 6.5 Q25 3 24 0.5 Q21 3 19.5 6" fill="${h.horns}" ${o()}/>`;
  if (h.ears === "pointy") s += `<path d="M10.8 9.5 L6.2 7.4 L10.6 12.4 Z M21.2 9.5 L25.8 7.4 L21.4 12.4 Z" fill="${h.skin}" ${o()}/>`;
  else if (h.ears === "big") s += `<path d="M10.6 9 L4 6.5 L10.4 13 Z M21.4 9 L28 6.5 L21.6 13 Z" fill="${h.skin}" ${o()}/>`;
  s += `<circle cx="16" cy="10" r="6.2" fill="${h.skin}" ${o()}/>`;
  if (h.beard) s += `<path d="M10.6 11 Q16 22 21.4 11 Q16 15 10.6 11Z" fill="${h.beard}" ${o()}/>`;
  // coiffure
  switch (h.style) {
    case "short": s += `<path d="M9.8 9.5 Q9.5 3.6 16 3.6 Q22.5 3.6 22.2 9.5 Q19 6.8 16 7 Q13 6.8 9.8 9.5Z" fill="${hairC}" ${o()}/>`; break;
    case "long": s += `<path d="M9.4 11 Q8.6 3.2 16 3.4 Q23.4 3.2 22.6 11 L23 18 L21 18 L21 9 Q16 6.5 11 9 L11 18 L9 18Z" fill="${hairC}" ${o()}/>`; break;
    case "bun": s += `<circle cx="16" cy="3.4" r="2.6" fill="${hairC}" ${o()}/><path d="M9.8 9.5 Q9.5 3.9 16 3.9 Q22.5 3.9 22.2 9.5 Q19 6.8 16 7 Q13 6.8 9.8 9.5Z" fill="${hairC}" ${o()}/>`; break;
    case "mohawk": s += `<path d="M14 4.5 L16 -0.5 L18 4.5Z" fill="${hairC}" ${o()}/><path d="M13.6 4.4 Q16 3.4 18.4 4.4 L18 8 L14 8Z" fill="${hairC}" ${o()}/>`; break;
    case "hood": s += `<path d="M8.6 12 Q7.6 2 16 2.4 Q24.4 2 23.4 12 Q22 6.5 16 6.4 Q10 6.5 8.6 12Z" fill="${h.cloak ?? h.top}" ${o()}/>`; break;
    case "cap": s += `<path d="M9.6 8.6 Q10 2.8 16 2.8 Q22 2.8 22.4 8.6Z" fill="${h.top}" ${o()}/><path d="M9 8.6 H25 L22 7.6Z" fill="${h.trim ?? h.top}" ${o()}/>`; break;
    case "wizard": s += `<path d="M8 8.2 Q16 10 24 8.2 L19.5 8 L17 -1 L12.5 8Z" fill="${h.top}" ${o()}/><circle cx="16" cy="4.6" r=".8" fill="#ffe27a"/><circle cx="14" cy="6.8" r=".6" fill="#ffe27a"/>`; break;
    case "feather": s += `<path d="M9.6 8.6 Q10 3 16 3 Q22 3 22.4 8.6Z" fill="${h.top}" ${o()}/><path d="M20 4.5 Q26 -1 25.5 4" fill="#e04a4a" ${o()}/>`; break;
    case "helm": s += `<path d="M9.6 10 Q9.2 3 16 3 Q22.8 3 22.4 10 L20.6 10 L20.6 8.4 L11.4 8.4 L11.4 10Z" fill="#9aa0ad" ${o()}/><rect x="15.2" y="3" width="1.6" height="5.4" fill="#6b717d"/>`; break;
    case "band": s += `<path d="M9.8 9.2 Q9.5 3.8 16 3.8 Q22.5 3.8 22.2 9.2 Q19 6.8 16 7 Q13 6.8 9.8 9.2Z" fill="${hairC}" ${o()}/><rect x="9.8" y="7.2" width="12.4" height="1.8" fill="#d9413a"/>`; break;
    default: break;
  }
  // visage
  const ey = 10.8;
  if (h.face === "dead") s += `<rect x="12.2" y="9" width="2.6" height="3" rx="1" fill="${OUT}"/><rect x="17.2" y="9" width="2.6" height="3" rx="1" fill="${OUT}"/><path d="M13 14.2h6" stroke="${OUT}" stroke-width="1.2"/><path d="M14.4 13.4v1.6M16 13.4v1.6M17.6 13.4v1.6" stroke="${OUT}" stroke-width=".7"/>`;
  else if (h.face === "glow") s += `<circle cx="13.4" cy="${ey}" r="1.5" fill="#ffd34a"/><circle cx="18.6" cy="${ey}" r="1.5" fill="#ffd34a"/><path d="M12.6 14.2 L14.4 13.4 L16 14.4 L17.6 13.4 L19.4 14.2" stroke="${OUT}" stroke-width=".9" fill="none"/>`;
  else if (h.face === "masked") s += `<path d="M10 8.2 H22 V12 Q16 15.6 10 12Z" fill="#a33a3a" ${o()}/><rect x="12" y="9.6" width="2.4" height="1.4" fill="#fff"/><rect x="17.6" y="9.6" width="2.4" height="1.4" fill="#fff"/><circle cx="13.2" cy="10.3" r=".5" fill="${OUT}"/><circle cx="18.8" cy="10.3" r=".5" fill="${OUT}"/>`;
  else {
    s += `<circle cx="13.4" cy="${ey}" r="1" fill="${OUT}"/><circle cx="18.6" cy="${ey}" r="1" fill="${OUT}"/>`;
    s += h.face === "old" ? `<path d="M12.4 9.2 L14.4 8.8M17.6 8.8 L19.6 9.2" stroke="${OUT}" stroke-width=".6"/><path d="M14.4 13.8 Q16 14.6 17.6 13.8" stroke="${OUT}" stroke-width=".8" fill="none"/>` : `<path d="M14.4 13.4 Q16 14.8 17.6 13.4" stroke="${OUT}" stroke-width=".8" fill="none"/>`;
    s += `<circle cx="11.8" cy="12.4" r="1" fill="#e07a7a" opacity=".35"/><circle cx="20.2" cy="12.4" r="1" fill="#e07a7a" opacity=".35"/>`;
  }
  if (h.tusks) s += `<path d="M13.2 13.6 L12.6 11.6 L14.4 13.4Z M18.8 13.6 L19.4 11.6 L17.6 13.4Z" fill="#f4efe0" ${o()}/>`;
  if (h.offhand) s += h.offhand;
  if (h.held) s += h.held;
  return s + "</g>";
}

// --- objets tenus ---
const sword = (blade = "#d6dbe6") => `<g transform="rotate(18 24.5 21)"><rect x="23.6" y="6" width="1.9" height="15" rx=".7" fill="${blade}" ${o()}/><rect x="21.8" y="20.6" width="5.6" height="1.6" fill="#c9a84a" ${o()}/><rect x="23.7" y="22" width="1.6" height="3" fill="#6b4a22" ${o()}/></g>`;
const axe = `<g transform="rotate(12 24.5 21)"><rect x="24" y="6" width="1.6" height="19" fill="#6b4a22" ${o()}/><path d="M25.6 6.2 Q31.5 8 29.6 14 Q27.5 12 25.6 12Z" fill="#c4c9d4" ${o()}/><path d="M24 6.2 Q19 8 20.5 13 Q22 12 24 12Z" fill="#c4c9d4" ${o()}/></g>`;
const staff = (orb: string) => `<rect x="24.2" y="3" width="1.6" height="26" fill="#6b4a22" ${o()}/><circle cx="25" cy="3.2" r="2.6" fill="${orb}" ${o()}/><circle cx="24.2" cy="2.4" r=".8" fill="#fff" opacity=".7"/>`;
const mace = `<rect x="24.2" y="9" width="1.6" height="15" fill="#6b4a22" ${o()}/><circle cx="25" cy="8" r="3" fill="#c4c9d4" ${o()}/>`;
const dagger = `<path d="M25.2 12 L26.6 19 L23.8 19Z" fill="#d6dbe6" ${o()}/><rect x="23.4" y="19" width="3.6" height="1.2" fill="#6b4a22"/>`;
const daggerL = `<path d="M6.8 12 L8.2 19 L5.4 19Z" fill="#d6dbe6" ${o()}/><rect x="5" y="19" width="3.6" height="1.2" fill="#6b4a22"/>`;
const bow = `<path d="M26 4 Q33 16 26 28" fill="none" stroke="#7a4a22" stroke-width="1.6" stroke-linecap="round"/><path d="M26 4 L26 28" stroke="#e8e0cc" stroke-width=".6"/>`;
const shield = (c: string, cross = "") => `<path d="M2.4 14 H12 V21 Q12 25.4 7.2 27 Q2.4 25.4 2.4 21Z" fill="${c}" ${o()}/>${cross}`;
const lute = `<ellipse cx="25.6" cy="22" rx="3.4" ry="4.2" fill="#a8672a" ${o()} transform="rotate(25 25.6 22)"/><circle cx="25.4" cy="22.4" r="1" fill="${OUT}"/><rect x="26.6" y="9" width="1.4" height="10" fill="#6b4a22" transform="rotate(25 26.6 18)"/>`;
const hammer = `<rect x="24.2" y="8" width="1.6" height="17" fill="#6b4a22" ${o()}/><rect x="21.4" y="5.5" width="7.2" height="4.4" rx=".8" fill="#6c7280" ${o()}/>`;
const orbGlow = (c: string) => `<circle cx="26" cy="19" r="3.6" fill="${c}" opacity=".35"/><circle cx="26" cy="19" r="2.2" fill="${c}" ${o()}/>`;
const club = `<path d="M24.4 24 L25.8 24 L26.6 11 Q29 9 27.4 6.4 Q23.6 6.6 24.4 12Z" fill="#7a4a22" ${o()}/>`;
const spear = `<rect x="24.4" y="6" width="1.4" height="23" fill="#6b4a22" ${o()}/><path d="M25.1 1.5 L27 7 L23.2 7Z" fill="#d6dbe6" ${o()}/>`;
const mug = `<rect x="23.4" y="19" width="4.4" height="4.6" rx=".8" fill="#e8c35a" ${o()}/><path d="M27.8 20.2 q2 .8 0 2.6" fill="none" stroke="${OUT}" stroke-width=".9"/><rect x="23.4" y="18.2" width="4.4" height="1.6" fill="#fff"/>`;

type Species = Partial<Human>;
const SPECIES: Record<string, Species> = {
  human: { skin: "#e9b98a" },
  elf: { skin: "#f0cfa0", ears: "pointy" },
  dwarf: { skin: "#d89c70", beard: "#8a4a22", wide: 1.5, scale: 0.92 },
  halfling: { skin: "#e6b383", scale: 0.84 },
  gnome: { skin: "#e8b58e", scale: 0.82, ears: "pointy" },
  dragonborn: { skin: "#b8433a", horns: "#e8d9b0", ears: "round" },
  goliath: { skin: "#a9a6a0", scale: 1.1, wide: 1 },
  orc: { skin: "#7fa05a", tusks: true, wide: 1 },
  tiefling: { skin: "#b0507a", horns: "#2c2430", tail: "#8f3d62" },
};

const CLASSES: Record<string, Partial<Human>> = {
  barbarian: { top: "#7a4a22", bare: true, trim: "#5a3a1e", pants: "#6a4a2a", style: "mohawk", hair: "#c2452a", held: axe },
  bard: { top: "#7a3a8a", trim: "#e0b84a", pants: "#3a3a5a", style: "feather", cloak: "#c0476a", held: lute },
  cleric: { top: "#f0ebe0", trim: "#d9b64a", robe: true, style: "short", hair: "#7a5a3a", held: mace, extraFront: `<path d="M16 15.4 v5 M14 17.2 h4" stroke="#d9b64a" stroke-width="1.4"/>` },
  druid: { top: "#4f7a3a", trim: "#b59a63", robe: true, style: "hood", cloak: "#3d6a2c", held: staff("#7fd35a") },
  fighter: { top: "#8f98a8", trim: "#5c6372", pants: "#4a5060", style: "helm", held: sword(), offhand: shield("#2d5fa3", `<path d="M7.2 15.4 v9.6" stroke="#e8d28a" stroke-width="1.4"/>`) },
  monk: { top: "#e08a2a", trim: "#8a4a12", pants: "#d97a1f", style: "band", hair: "#2a2a2a", arms: "forward" },
  paladin: { top: "#d5dae6", trim: "#e0b84a", pants: "#7a8090", style: "helm", cloak: "#2a5fa8", held: sword("#f0e7b0"), offhand: shield("#e8ecf4", `<path d="M7.2 15.4 v9.6 M3.8 19 h6.8" stroke="#d9b64a" stroke-width="1.5"/>`) },
  ranger: { top: "#5a7a3a", trim: "#3a5a28", pants: "#6a4a2a", style: "hood", cloak: "#3f5f2d", held: bow },
  rogue: { top: "#3a3a4a", trim: "#7a7a8a", pants: "#2c2c38", style: "hood", cloak: "#24242e", held: dagger, offhand: daggerL },
  sorcerer: { top: "#c23a4a", trim: "#f4a35a", robe: true, style: "long", hair: "#f0c040", held: orbGlow("#ff7a3a") },
  warlock: { top: "#4a2a6a", trim: "#9a4ad0", robe: true, style: "hood", cloak: "#2e1a46", held: orbGlow("#b05aff") },
  wizard: { top: "#2f4fa8", trim: "#e8d28a", robe: true, style: "wizard", beard: "#d8d8e0", held: staff("#7ac8ff") },
};

const MONSTERS: Record<string, () => string> = {
  goblin: () => human({ skin: "#6e9a3a", top: "#7a5a2a", trim: "#4a3418", pants: "#4a3418", ears: "big", style: "bald", scale: 0.8, held: club }),
  kobold: () => human({ skin: "#c0583a", top: "#7a6a3a", trim: "#4a3a1c", pants: "#5a4a2a", ears: "pointy", style: "bald", scale: 0.78, held: spear, tail: "#a8482c", horns: "#e8d9b0" }),
  orc: () => human({ skin: "#6c8f48", top: "#5a5a64", trim: "#3a3a42", pants: "#4a3a2a", style: "mohawk", hair: "#1c1c1c", tusks: true, wide: 2, scale: 1.1, held: axe }),
  bandit: () => human({ skin: "#e0aa7e", top: "#6a3a2a", trim: "#3a2018", pants: "#3a3a44", style: "hood", cloak: "#4a2a22", face: "masked", held: sword("#c4c9d4") }),
  skeleton: () => human({ skin: "#ece6d2", top: "#d8d2bc", trim: "#b8b29a", pants: "#cfc9b3", style: "bald", face: "dead", arms: "down", held: sword("#9aa0ad"), extraFront: `<path d="M12.4 16.5 H19.6 M12.4 18.8 H19.6 M12.4 21 H19.6 M16 15 V22.5" stroke="#8a846c" stroke-width="1"/>` }),
  zombie: () => human({ skin: "#8aa078", top: "#5a5a48", trim: "#3a3a2c", pants: "#44443a", style: "short", hair: "#3a3a2a", face: "dead", arms: "forward", hunch: true, extraFront: `<path d="M11 17 l3 3 -2 3" stroke="#3a1a1a" stroke-width="1.2" fill="none"/>` }),
  ghoul: () => human({ skin: "#9aa3a6", top: "#4a4a50", trim: "#2a2a30", pants: "#34343a", style: "long", hair: "#2a2a2a", face: "glow", arms: "forward", hunch: true, ears: "pointy" }),
};

const wolf = () => `<ellipse cx="16" cy="28.4" rx="10" ry="1.8" fill="#000" opacity=".25"/>`
  + `<path d="M24 14 Q29 10 28.6 5.6 Q27 9 24 10Z" fill="#7a8088" ${o()}/>`
  + `<path d="M6 18 Q6 12 14 12 H22 Q27 12 27 18 L27 23 H24 V27.6 H21.4 V23 H12 V27.6 H9.4 V23 H6Z" fill="#8a9098" ${o()}/>`
  + `<path d="M3.6 14.4 L9 11 L6.4 17 L1 19.4 Q1 16.4 3.6 14.4Z" fill="#7a8088" ${o()}/><path d="M7 9.4 L9.4 6 L10.8 10.6Z" fill="#6a7078" ${o()}/><path d="M1 19.4 L6.4 17 L8 20 L2 21.4Z" fill="#c4c9d0" ${o()}/>`
  + `<circle cx="6.2" cy="14.8" r="1" fill="#ffd34a"/><circle cx="1.6" cy="19.6" r=".8" fill="${OUT}"/><path d="M2.6 21 l.6 1.6 .8 -1.4" fill="#fff" stroke="${OUT}" stroke-width=".4"/>`
  + `<path d="M12 14 Q17 12.6 22 14" stroke="#6a7078" stroke-width="1.4" fill="none"/>`;
const rat = () => `<ellipse cx="16" cy="28.4" rx="10" ry="1.6" fill="#000" opacity=".25"/>`
  + `<path d="M25 24 Q32 24 31 15" fill="none" stroke="#e0a0a0" stroke-width="1.4" stroke-linecap="round"/>`
  + `<path d="M6 25 Q5 15 14 15 Q24 14 25 22 Q25 27.5 20 27.6 H9 Q6 27.6 6 25Z" fill="#7a5a3e" ${o()}/>`
  + `<path d="M3 21 Q4 16 9 16.4 L10 24 L3.6 25Z" fill="#8a6a4a" ${o()}/><circle cx="8" cy="14.6" r="2.6" fill="#e8a8a8" ${o()}/><circle cx="12.6" cy="14.6" r="2.2" fill="#e8a8a8" ${o()}/>`
  + `<circle cx="5.6" cy="20" r=".9" fill="#d03a3a"/><circle cx="2.6" cy="23" r=".9" fill="${OUT}"/><path d="M3.6 24 l.5 1.8 .9 -1.6" fill="#fff" stroke="${OUT}" stroke-width=".4"/><path d="M1 22 l-2 -1 M1 23.4 l-2 .6" stroke="${OUT}" stroke-width=".4"/>`
  + `<rect x="9.4" y="25.6" width="2.4" height="2.6" rx="1" fill="#e8a8a8"/><rect x="18" y="25.6" width="2.4" height="2.6" rx="1" fill="#e8a8a8"/>`;
const spider = () => {
  let s = `<ellipse cx="16" cy="28" rx="11" ry="1.8" fill="#000" opacity=".25"/>`;
  for (const [dx, dy] of [[-1, -3], [-1.6, 0], [-1.4, 3], [-.8, 6]]) {
    const y = 17 + dy;
    s += `<path d="M13 ${y - 1} L${3.5 + dx * 2} ${y - 6 + dy * 0.5} L${2 + dx * 2} ${y + 8}" fill="none" stroke="#2a2430" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="M19 ${y - 1} L${28.5 - dx * 2} ${y - 6 + dy * 0.5} L${30 - dx * 2} ${y + 8}" fill="none" stroke="#2a2430" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  s += `<ellipse cx="16" cy="21" rx="6.4" ry="7" fill="#3a2f45" ${o()}/><path d="M13 20 Q16 16 19 20 Q16 24 13 20Z" fill="#8a2a3a"/><circle cx="16" cy="12.6" r="4.2" fill="#463a52" ${o()}/>`;
  s += `<circle cx="14.4" cy="11.8" r="1" fill="#ff4a4a"/><circle cx="17.6" cy="11.8" r="1" fill="#ff4a4a"/><circle cx="15.4" cy="13.8" r=".6" fill="#ff4a4a"/><circle cx="16.6" cy="13.8" r=".6" fill="#ff4a4a"/><path d="M14 15.6 l-.6 2 M18 15.6 l.6 2" stroke="#d9d0c0" stroke-width="1"/>`;
  return s;
};

const NPCS: Record<string, () => string> = {
  maire: () => human({ skin: "#e6b890", top: "#2f5f4a", trim: "#d9b64a", robe: true, style: "bun", hair: "#c8c8d0", face: "old", extraFront: `<path d="M12 15 Q16 21 20 15" fill="none" stroke="#e0b84a" stroke-width="1.2"/><circle cx="16" cy="19" r="1.3" fill="#e0b84a"/>` }),
  aubergiste: () => human({ skin: "#e0a87c", top: "#a8482c", trim: "#f0ebe0", style: "bald", beard: "#6a4a2a", wide: 1.5, extraFront: `<path d="M11 17 H21 L22 28 H10Z" fill="#f0ebe0" ${o()}/>`, held: mug }),
  leo: () => human({ skin: "#eec59a", top: "#6a8fc0", trim: "#c9a84a", pants: "#6a4a2a", style: "cap", scale: 0.74, extraFront: "" }),
  forge: () => human({ skin: "#d8a074", top: "#8a8a92", trim: "#3a3a42", pants: "#4a3a2a", style: "bun", hair: "#2a1a12", wide: 1, extraFront: `<path d="M11 17 H21 L22 28 H10Z" fill="#6a4a2a" ${o()}/>`, held: hammer }),
};

const pitchfork = `<rect x="24.4" y="8" width="1.4" height="20" fill="#6b4a22" ${o()}/><path d="M22.8 9v-5M25.1 9v-6M27.4 9v-5M22.8 9h4.6" stroke="#9aa0ad" stroke-width="1.2" fill="none"/>`;
const basket = `<path d="M22.4 20h6.4l-1 5h-4.4z" fill="#b8873a" ${o()}/><path d="M23 20q2.6 -4 5 0" fill="none" stroke="#6b4a22" stroke-width="1"/><circle cx="25" cy="19.4" r="1.2" fill="#d9413a"/><circle cx="27" cy="19.6" r="1.1" fill="#f0c040"/>`;
const cane = `<rect x="24.4" y="14" width="1.4" height="15" rx=".6" fill="#6b4a22" ${o()}/>`;
const smallShield = shield("#a83a3a", `<path d="M7.2 15.4v9.6" stroke="#e8d28a" stroke-width="1.2"/>`);

const dog = () => `<ellipse cx="16" cy="28.4" rx="9" ry="1.6" fill="#000" opacity=".25"/>`
  + `<path d="M25 18q5 -3 4 -8" fill="none" stroke="#9a6a3a" stroke-width="2.4" stroke-linecap="round"/>`
  + `<path d="M9 20q0 -6 8 -6h6q4 0 4 5v5h-2.4v4h-2.4v-4h-9v4h-2.4v-4h-2.4z" fill="#b07a42" ${o()}/>`
  + `<path d="M4 17l4 -4 3 3 1 5 -4 3 -4 -1z" fill="#c08850" ${o()}/><path d="M6 12l-1.6 4 3 -1z" fill="#6b4a22" ${o()}/><circle cx="6" cy="17" r="1" fill="${OUT}"/><circle cx="3.4" cy="19.4" r="1.2" fill="${OUT}"/>`
  + `<path d="M10 18q5 -2 11 0" stroke="#8a5a2a" stroke-width="1.4" fill="none"/>`;
const chicken = () => `<ellipse cx="16" cy="28" rx="7" ry="1.4" fill="#000" opacity=".25"/>`
  + `<path d="M8 22q0 -8 8 -8t8 6q0 5 -6 6h-5q-5 0 -5 -4z" fill="#f4efe0" ${o()}/><path d="M23 18q4 -4 3 -8" fill="#f4efe0" stroke="${OUT}" stroke-width=".9"/>`
  + `<circle cx="10.6" cy="13" r="3.8" fill="#f4efe0" ${o()}/><path d="M9 9q1.6 -2.6 3.2 -.4 1.6 -2.4 2.2 .6" fill="#d9413a" ${o()}/><path d="M6.4 13.6l-3 1.2 3 1.2z" fill="#e8a02a" ${o()}/><circle cx="9.6" cy="12.4" r=".8" fill="${OUT}"/><path d="M10 14.6q.6 3 0 3.6" stroke="#d9413a" stroke-width="1.4" fill="none"/>`
  + `<path d="M13 28v-2.6M17 28v-2.6" stroke="#e8a02a" stroke-width="1.2"/>`;

/** Villageois qui se promènent (décor vivant de la carte). */
const FOLK: Record<string, () => string> = {
  paysan: () => human({ skin: "#e0aa7e", top: "#8a7a4a", trim: "#5a4a2a", pants: "#4a3a2a", style: "cap", held: pitchfork }),
  paysanne: () => human({ skin: "#e6b890", top: "#a84a6a", trim: "#f0ebe0", robe: true, style: "bun", hair: "#7a4a22", held: basket }),
  marchande: () => human({ skin: "#d9a074", top: "#3a7a5a", trim: "#e8d28a", robe: true, style: "short", hair: "#c2452a", extraFront: `<path d="M11 17H21L22 28H10Z" fill="#f4efe0" ${o()}/>` }),
  marchand: () => human({ skin: "#e0aa7e", top: "#7a3a2a", trim: "#d9b64a", style: "feather", beard: "#5a3a1e", wide: 1, extraFront: `<path d="M11 17H21L22 28H10Z" fill="#6a4a2a" ${o()}/>` }),
  garde: () => human({ skin: "#e6b890", top: "#8f98a8", trim: "#5c6372", pants: "#4a5060", style: "helm", held: spear, offhand: smallShield }),
  enfant: () => human({ skin: "#eec59a", top: "#d9a21f", trim: "#c9a84a", pants: "#4a5a7a", style: "short", hair: "#7a4a22", scale: 0.7 }),
  enfante: () => human({ skin: "#eec59a", top: "#6a9ad0", trim: "#f0ebe0", robe: true, style: "bun", hair: "#c2452a", scale: 0.7 }),
  vieux: () => human({ skin: "#e0b08a", top: "#6a5a7a", trim: "#9a8aaa", robe: true, style: "bald", beard: "#e0e0e8", face: "old", held: cane }),
  chien: dog,
  poule: chicken,
};

/** Compagnons recrutables (voir `companions.ts`). */
const COMPANION_ART: Record<string, () => string> = {
  ysolde: () => human({ skin: "#e8bc94", top: "#9aa2b2", trim: "#3f6fb0", pants: "#4a5060", style: "helm", cloak: "#3f6fb0", held: spear, offhand: shield("#3f6fb0", `<path d="M7.2 15.4v9.6M3.8 19h6.8" stroke="#e8d28a" stroke-width="1.2"/>`) }),
  anselme: () => human({ skin: "#e0b08a", top: "#7a5a3a", trim: "#c9a84a", robe: true, style: "bald", face: "old", held: club, extraFront: `<circle cx="16" cy="17.6" r="1.2" fill="#e8d28a"/><path d="M16 15.6v4M14.4 17.2h3.2" stroke="#e8d28a" stroke-width=".9"/>` }),
  mila: () => human({ skin: "#eec59a", top: "#4a6a3a", trim: "#8a5a2a", pants: "#5a4a2a", style: "long", hair: "#b0602a", held: bow, extraBack: `<rect x="7" y="9" width="3" height="10" rx="1" fill="#8a5a2a" ${o()} transform="rotate(-20 8 14)"/>` }),
  corentin: () => human({ skin: "#e0aa7e", top: "#6a3a2a", trim: "#3a2018", pants: "#3a3a44", style: "hood", cloak: "#4a2a22", beard: "#4a2e1a", held: sword("#c4c9d4") }),
};

const cache = new Map<string, string>();

function draw(key: string): string | null {
  const [kind, a, b] = key.split(":");
  if (kind === "hero") {
    const sp = SPECIES[a], cl = CLASSES[b];
    if (!sp || !cl) return null;
    return human({ ...cl, ...sp, hair: cl.hair ?? "#5a3a1e", top: cl.top!, wide: (sp.wide ?? 0) + (cl.wide ?? 0), scale: sp.scale, skin: sp.skin! });
  }
  if (kind === "monster") {
    if (a === "wolf") return wolf();
    if (a === "giant-rat") return rat();
    if (a === "giant-spider") return spider();
    return MONSTERS[a]?.() ?? null;
  }
  if (kind === "npc") return NPCS[a]?.() ?? null;
  if (kind === "folk") return FOLK[a]?.() ?? null;
  if (kind === "companion") return COMPANION_ART[a]?.() ?? null;
  return null;
}

/** Contenu SVG (viewBox 0 0 32 32) du personnage, ou `null` si la clé est inconnue. */
export function spriteSvg(key: string | undefined): string | null {
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;
  const body = draw(key);
  if (body === null) return null;
  // ombre au sol commune aux silhouettes debout
  const shadow = (key.startsWith("monster:") && /wolf|rat|spider/.test(key)) || /^folk:(chien|poule)$/.test(key) ? "" : `<ellipse cx="16" cy="29.2" rx="9" ry="2" fill="#000" opacity=".28"/>`;
  const svg = shadow + body;
  cache.set(key, svg);
  return svg;
}

export const heroSpriteKey = (speciesId: string, classId: string) => `hero:${speciesId}:${classId}`;
export const monsterSpriteKey = (id: string) => `monster:${id}`;
export const npcSpriteKey = (id: string) => `npc:${id}`;
export const NPC_SPRITES = Object.keys(NPCS);
export const FOLK_SPRITES = Object.keys(FOLK);
export const folkSpriteKey = (id: string) => `folk:${id}`;
export const MONSTER_SPRITES = [...Object.keys(MONSTERS), "wolf", "giant-rat", "giant-spider"];
export const SPECIES_SPRITES = Object.keys(SPECIES);
export const CLASS_SPRITES = Object.keys(CLASSES);
export const COMPANION_SPRITES = Object.keys(COMPANION_ART);
