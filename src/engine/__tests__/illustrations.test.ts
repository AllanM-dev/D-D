import { describe, expect, it } from "vitest";
import { BACKGROUNDS } from "../../data/backgrounds";
import { CLASSES } from "../../data/classes";
import { ENCOUNTERS, buildEnemies } from "../../data/encounters";
import { GAME_ICONS } from "../../data/game-icons.generated";
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
  it("chaque illustration pointe vers une icône embarquée, et il n'y en a pas d'inutilisée", () => {
    const used = new Set(Object.values(ART).map((a) => a.icon));
    for (const [key, art] of Object.entries(ART)) {
      expect(art.hue, key).toBeGreaterThanOrEqual(0);
      expect(art.hue, key).toBeLessThanOrEqual(360);
      expect(GAME_ICONS[art.icon], `${key} → ${art.icon} (relancer scripts/extract-icons.mjs ?)`).toBeTruthy();
      expect(getArt(key)!.glyph, key).toContain("<path");
    }
    expect(Object.keys(GAME_ICONS).sort()).toEqual([...used].sort());
  });
  it("les icônes embarquées sont de simples tracés, sans script ni lien externe", () => {
    for (const [name, body] of Object.entries(GAME_ICONS)) {
      expect(/^(<path [^>]*\/>)+$/.test(body), `${name}: balisage inattendu`).toBe(true);
      expect(/script|href|xlink|on\w+\s*=|javascript:|url\(/i.test(body), `${name}: contenu interdit`).toBe(false);
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
