import { describe, expect, it } from "vitest";
import { BACKGROUNDS } from "../../data/backgrounds";
import { CLASSES } from "../../data/classes";
import { ARMORS, CLASS_TRAINING, WEAPONS } from "../../data/equipment";
import {
  ABILITY_HELP, APP_GUIDE, FEATURE_STATUS, ARMOR_KIND_TEXT, ARMOR_TRAINING_TEXT, BACKGROUND_TEXT, BASIC_RULES, CLASS_FEATURE_TEXT, FEAT_TEXT,
  SPECIES_TRAIT_TEXT, WEAPON_PROPERTY_TEXT, WEAPON_TRAINING_TEXT,
} from "../../data/help";
import { SPECIES } from "../../data/species";
import { HELP_KINDS, helpEntries, type HelpKind } from "../../ui/helpLists";
import { ABILITIES } from "../rules";
import { featuresFor } from "../features";

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

  it("explique chaque propriété d'arme, chaque type d'armure et chaque maîtrise", () => {
    for (const w of WEAPONS) for (const p of w.properties) expect(WEAPON_PROPERTY_TEXT[p]?.text, `${w.id}/${p}`).toBeTruthy();
    for (const a of ARMORS) expect(ARMOR_KIND_TEXT[a.kind]?.text, a.id).toBeTruthy();
    for (const t of Object.values(CLASS_TRAINING)) {
      expect(WEAPON_TRAINING_TEXT[t.weapons]).toBeTruthy();
      for (const a of t.armor) expect(ARMOR_TRAINING_TEXT[a]).toBeTruthy();
    }
  });
  it("liste toutes les entrées de chaque section d'aide", () => {
    const counts: Record<HelpKind, number> = { classes: CLASSES.length, species: SPECIES.length, backgrounds: BACKGROUNDS.length, weapons: WEAPONS.length, armors: ARMORS.length };
    for (const k of Object.keys(HELP_KINDS) as HelpKind[]) {
      const entries = helpEntries(k);
      expect(entries.length, k).toBe(counts[k]);
      for (const e of entries) expect(e.summary, `${k}/${e.id}`).toBeTruthy();
    }
  });

  it("indique le statut de chaque capacité de classe, sans entrée orpheline", () => {
    for (const c of CLASSES) {
      expect(Object.keys(FEATURE_STATUS[c.id] ?? {}).sort(), c.id).toEqual([...c.features].sort());
    }
    expect(Object.keys(FEATURE_STATUS).sort()).toEqual(CLASSES.map((c) => c.id).sort());
  });
  it("ne déclare « appliqué » que ce que le moteur gère, et inversement", () => {
    const names: Record<string, string[]> = {
      "second-wind": ["Second souffle"], rage: ["Rage"], "lay-on-hands": ["Imposition des mains"],
      "innate-sorcery": ["Magie innée"], "martial-arts": ["Arts martiaux"],
    };
    // Tout ce que le moteur donne en combat est « appliqué » dans l'Aide…
    for (const c of CLASSES)
      for (const f of featuresFor(c.id))
        for (const n of names[f.id]) expect(FEATURE_STATUS[c.id][n]?.status, `${c.id}/${n}`).toBe("applied");
    // … et rien n'est « appliqué » sans être branché (hors Défense sans armure, calculée dans la CA).
    const wired = new Set(CLASSES.flatMap((c) => featuresFor(c.id).flatMap((f) => names[f.id].map((n) => `${c.id}/${n}`))));
    for (const [cid, feats] of Object.entries(FEATURE_STATUS))
      for (const [n, v] of Object.entries(feats))
        if (v.status === "applied" && n !== "Défense sans armure") expect(wired.has(`${cid}/${n}`), `${cid}/${n}`).toBe(true);
  });
  it("chaque capacité appliquée ou partielle a une explication de ce que fait le jeu", () => {
    for (const feats of Object.values(FEATURE_STATUS))
      for (const [n, v] of Object.entries(feats)) if (v.status !== "todo") expect(v.note, n).toBeTruthy();
  });
});
