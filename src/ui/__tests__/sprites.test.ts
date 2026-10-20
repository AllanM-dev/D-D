import { describe, expect, it } from "vitest";
import { CLASSES } from "../../data/classes";
import { MAPS } from "../../data/maps";
import { MONSTERS } from "../../data/monsters";
import { SPECIES } from "../../data/species";
import { COMPANIONS } from "../../data/companions";
import { COMPANION_SPRITES, NPC_SPRITES, heroSpriteKey, monsterSpriteKey, npcSpriteKey, spriteSvg } from "../sprites";

describe("personnages 2D", () => {
  it("chaque monstre a son dessin", () => {
    for (const m of MONSTERS) expect(spriteSvg(monsterSpriteKey(m.id)), m.id).toBeTruthy();
  });
  it("chaque combinaison espèce × classe a un dessin valide", () => {
    for (const s of SPECIES) for (const c of CLASSES) {
      const svg = spriteSvg(heroSpriteKey(s.id, c.id));
      expect(svg, `${s.id}/${c.id}`).toBeTruthy();
      expect(svg).not.toMatch(/NaN|undefined/);
    }
  });
  it("chaque PNJ dessiné correspond à un lieu « ! » de la carte, et inversement pour les personnages", () => {
    const spotIds = new Set(MAPS.flatMap((m) => (m.spots ?? []).map((s) => s.id)));
    for (const id of NPC_SPRITES) { expect(spotIds.has(id), id).toBe(true); expect(spriteSvg(npcSpriteKey(id))).toBeTruthy(); }
  });
  it("chaque compagnon a son dessin, et chaque dessin de compagnon un compagnon", () => {
    for (const c of COMPANIONS) { expect(spriteSvg(c.sprite), c.id).toBeTruthy(); expect(spriteSvg(c.sprite)).not.toMatch(/NaN|undefined/); }
    expect(COMPANION_SPRITES.sort()).toEqual(COMPANIONS.map((c) => c.sprite.split(":")[1]).sort());
  });
  it("une clé inconnue ne donne rien", () => {
    expect(spriteSvg("monster:dragon-rouge")).toBeNull();
    expect(spriteSvg(undefined)).toBeNull();
  });
});
