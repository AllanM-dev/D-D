import { describe, expect, it } from "vitest";
import { MAPS, PASSABLE, type TileKind } from "../../data/maps";
import { parseMap } from "../../engine/exploration";
import { VARIANTS, edgesOf, tileBackground, tileSvg, variantAt } from "../tileArt";

const KINDS = Object.keys(PASSABLE) as TileKind[];

describe("dessin des cases", () => {
  it("chaque type de case a un dessin SVG, pour chaque variante et chaque voisinage", () => {
    for (const k of KINDS) for (let v = 0; v < VARIANTS; v++) for (let e = 0; e < 16; e++) {
      const svg = tileSvg(k, v, e);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg.endsWith("</svg>")).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });
  it("est déterministe, et la variante dépend de la position", () => {
    expect(tileSvg("grass", 2, 0)).toBe(tileSvg("grass", 2, 0));
    expect(variantAt(3, 4)).toBe(variantAt(3, 4));
    const seen = new Set<number>();
    for (let x = 0; x < 12; x++) for (let y = 0; y < 12; y++) seen.add(variantAt(x, y));
    expect(seen.size).toBe(VARIANTS);
  });
  it("le voisinage change le dessin (face avant d'un mur, rive de l'eau)", () => {
    expect(tileSvg("wall", 0, 4)).not.toBe(tileSvg("wall", 0, 0));
    expect(tileSvg("water", 0, 1)).not.toBe(tileSvg("water", 0, 0));
    expect(edgesOf("wall", ["wall", "wall", "floor", "wall"])).toBe(4);
    expect(edgesOf("water", ["bridge", undefined, "grass", "water"])).toBe(4);
  });
  it("fournit un fond pour chaque case de chaque carte", () => {
    for (const m of MAPS) {
      const g = parseMap(m);
      for (let y = 0; y < g.height; y++) for (let x = 0; x < g.width; x++) expect(tileBackground(g.tiles, x, y)).toMatch(/^url\("data:image\/svg\+xml,/);
    }
  });
});
