import { describe, expect, it } from "vitest";
import { BACKGROUNDS } from "../../data/backgrounds";
import { CLASSES } from "../../data/classes";
import { ABILITY_HELP, APP_GUIDE, BACKGROUND_TEXT, BASIC_RULES, CLASS_FEATURE_TEXT, FEAT_TEXT, SPECIES_TRAIT_TEXT } from "../../data/help";
import { SPECIES } from "../../data/species";
import { ABILITIES } from "../rules";

describe("contenu de la page Aide", () => {
  it("explique chaque capacité de chaque classe", () => {
    for (const c of CLASSES)
      for (const f of c.features) expect(CLASS_FEATURE_TEXT[c.id]?.[f], `${c.id} / ${f}`).toBeTruthy();
  });
  it("explique chaque trait de chaque espèce", () => {
    for (const s of SPECIES)
      for (const t of s.traits) expect(SPECIES_TRAIT_TEXT[s.id]?.[t], `${s.id} / ${t}`).toBeTruthy();
  });
  it("décrit chaque historique et son don d'origine", () => {
    for (const b of BACKGROUNDS) {
      expect(BACKGROUND_TEXT[b.id], b.id).toBeTruthy();
      expect(FEAT_TEXT[b.originFeat], b.originFeat).toBeTruthy();
    }
  });
  it("n'a pas de texte orphelin (clé qui ne correspond à rien)", () => {
    for (const [id, texts] of Object.entries(CLASS_FEATURE_TEXT)) {
      const c = CLASSES.find((x) => x.id === id)!;
      expect(c, id).toBeTruthy();
      expect(Object.keys(texts).sort()).toEqual([...c.features].sort());
    }
    for (const [id, texts] of Object.entries(SPECIES_TRAIT_TEXT)) {
      const s = SPECIES.find((x) => x.id === id)!;
      expect(s, id).toBeTruthy();
      expect(Object.keys(texts).sort()).toEqual([...s.traits].sort());
    }
  });
  it("couvre les six caractéristiques et des règles de base", () => {
    expect(ABILITY_HELP.map((a) => a.id)).toEqual([...ABILITIES]);
    expect(BASIC_RULES.length).toBeGreaterThan(5);
    expect(APP_GUIDE.length).toBeGreaterThan(3);
  });
});
