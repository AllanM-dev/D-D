import { describe, expect, it } from "vitest";
import { BACKGROUNDS } from "../../data/backgrounds";
import { CLASSES } from "../../data/classes";
import { ENCOUNTERS, buildEnemies } from "../../data/encounters";
import { ART, artKey, getArt } from "../../data/illustrations";
import { MONSTERS } from "../../data/monsters";
import { SPECIES } from "../../data/species";
import { helpArt } from "../../ui/helpLists";
import { characterToCombatant } from "../attacks";
import { buildCharacter } from "../character";

describe("illustrations", () => {
  it("chaque classe, espèce, historique et monstre a son illustration", () => {
    for (const c of CLASSES) expect(getArt(artKey("class", c.id)), `class:${c.id}`).toBeTruthy();
    for (const s of SPECIES) expect(getArt(artKey("species", s.id)), `species:${s.id}`).toBeTruthy();
    for (const b of BACKGROUNDS) expect(getArt(artKey("background", b.id)), `background:${b.id}`).toBeTruthy();
    for (const m of MONSTERS) expect(getArt(artKey("monster", m.id)), `monster:${m.id}`).toBeTruthy();
  });
  it("aucune illustration orpheline (clé qui ne correspond à rien)", () => {
    const valid = new Set([
      ...CLASSES.map((c) => artKey("class", c.id)),
      ...SPECIES.map((s) => artKey("species", s.id)),
      ...BACKGROUNDS.map((b) => artKey("background", b.id)),
      ...MONSTERS.map((m) => artKey("monster", m.id)),
    ]);
    expect(Object.keys(ART).sort()).toEqual([...valid].sort());
  });
  it("les glyphes sont du SVG simple et sûr (formes autofermantes autorisées seulement)", () => {
    const allowed = new Set(["path", "circle", "ellipse", "rect"]);
    for (const [key, art] of Object.entries(ART)) {
      expect(art.hue, key).toBeGreaterThanOrEqual(0);
      expect(art.hue, key).toBeLessThanOrEqual(360);
      const tags = art.glyph.match(/<[^>]+>/g) ?? [];
      expect(tags.length, key).toBeGreaterThan(1);
      for (const t of tags) {
        const name = /^<(\w+)/.exec(t)?.[1];
        expect(allowed.has(name!), `${key}: <${name}>`).toBe(true);
        expect(t.endsWith("/>"), `${key}: ${t.slice(0, 40)}`).toBe(true);
        expect(/\bon\w+\s*=|href|<script|javascript:/i.test(t), `${key}: attribut interdit`).toBe(false);
      }
      expect(art.glyph.replace(/<[^>]+>/g, "").trim(), `${key}: texte hors balise`).toBe("");
    }
  });
  it("les ennemis et le personnage portent leur illustration en combat", () => {
    for (const e of ENCOUNTERS)
      for (const en of buildEnemies(e)) expect(getArt(en.art), en.id).toBeTruthy();
    expect(buildEnemies(ENCOUNTERS.find((e) => e.id === "goblins")!).map((x) => x.art)).toEqual(["monster:goblin", "monster:goblin"]);
    const c = buildCharacter(
      { name: "T", speciesId: "elf", classId: "wizard", backgroundId: "sage", method: "standard",
        baseScores: { STR: 8, DEX: 13, CON: 14, INT: 15, WIS: 12, CHA: 10 }, bonus: { mode: "2/1", plus2: "INT", plus1: "CON" },
        classSkills: ["investigation", "medicine"] }, "w");
    expect(characterToCombatant(c).art).toBe("class:wizard");
  });
  it("les pages d'aide trouvent l'illustration de chaque entrée (sauf armes et armures)", () => {
    expect(helpArt("classes", "fighter")).toBe("class:fighter");
    expect(helpArt("species", "elf")).toBe("species:elf");
    expect(helpArt("backgrounds", "sage")).toBe("background:sage");
    expect(helpArt("weapons", "dagger")).toBeUndefined();
    expect(helpArt("armors", "shield")).toBeUndefined();
  });
});
