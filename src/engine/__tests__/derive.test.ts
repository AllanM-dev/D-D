import { describe, expect, it } from "vitest";
import { defaultClassChoices } from "../../data/class-choices";
import { CLASSES } from "../../data/classes";
import { defaultSpells } from "../../data/spells";
import { buildCharacter, type Character, type CharacterDraft } from "../character";
import { clone } from "../clone";
import { hasJackOfAllTrades, maxHpFor, recompute } from "../derive";
import { levelUp, levelUpNeeds } from "../levelup";
import { migrate } from "../migrate";

function hero(classId: string): Character {
  const c = CLASSES.find((x) => x.id === classId)!;
  return buildCharacter({
    name: "T", speciesId: "human", classId, backgroundId: "soldier", method: "standard",
    baseScores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
    classSkills: c.skillChoices.from.filter((s) => s !== "athletics" && s !== "intimidation").slice(0, c.skillChoices.count),
    fightingStyle: "defense", spells: defaultSpells(classId), ...defaultClassChoices(classId, ["athletics", "intimidation"]),
  } as CharacterDraft, "h");
}
function toLevel2(c: Character): Character {
  const n = levelUpNeeds(c);
  return levelUp({ ...c, xp: 300 }, {
    ...(n.expertise ? { expertise: n.expertise.from.slice(0, n.expertise.count) } : {}),
    ...(n.fightingStyle ? { fightingStyle: n.fightingStyle[0] } : {}),
    ...(n.spells ? { spells: n.spells.from.slice(0, n.spells.count) } : {}),
  }).character;
}

describe("recalcul des valeurs dérivées", () => {
  it("ne change rien à un personnage à jour, niveau 1 ou 2, et appliqué deux fois", () => {
    for (const cls of CLASSES) {
      const c1 = hero(cls.id);
      expect(recompute(clone(c1)), cls.id).toEqual(c1);
      const c2 = toLevel2(c1);
      expect(recompute(clone(c2)), cls.id).toEqual(c2);
      expect(recompute(recompute(clone(c2))), cls.id).toEqual(c2);
    }
  });
  it("répare des valeurs enregistrées devenues fausses", () => {
    const good = hero("fighter");
    const stale: Character = clone({
      ...good, armorClass: 3, speed: 1, initiative: 9, maxHp: 99, passivePerception: 0, proficiencyBonus: 6, attacks: [],
      modifiers: { ...good.modifiers, STR: -5 }, skills: good.skills.map((s) => ({ ...s, bonus: 42 })), originFeat: "?",
    });
    expect(recompute(stale)).toEqual(good);
  });
  it("garde les choix du joueur : compétences maîtrisées, expertise, style de combat", () => {
    const rogue = hero("rogue");
    const r = recompute(clone(rogue));
    expect(r.skills.filter((s) => s.proficient).map((s) => s.id)).toEqual(rogue.skills.filter((s) => s.proficient).map((s) => s.id));
    expect(r.skills.filter((s) => s.expert).map((s) => s.id).sort()).toEqual([...(rogue.expertise ?? [])].sort());
    expect(recompute(clone(hero("fighter"))).fightingStyle).toBe("defense");
  });
  it("reprend les définitions actuelles de la classe, de l'espèce et de l'historique", () => {
    const c = hero("wizard");
    const old = clone({ ...c, classDef: { ...c.classDef, features: ["ancien texte"] }, species: { ...c.species, traits: [] } });
    const r = recompute(old);
    expect(r.classDef).toEqual(CLASSES.find((x) => x.id === "wizard"));
    expect(r.species.traits.length).toBeGreaterThan(0);
  });
  it("PV maximum : dé de vie au niveau 1, puis la moyenne fixe + Constitution", () => {
    const c = hero("fighter"); // d10, CON 14 (+2)
    expect(c.maxHp).toBe(12);
    expect(maxHpFor({ ...c, level: 2 })).toBe(12 + 6 + 2);
    expect(toLevel2(c).maxHp).toBe(20);
  });
  it("Touche-à-tout dépend de la classe et du niveau, pas d'un champ enregistré", () => {
    const bard = hero("bard");
    expect(hasJackOfAllTrades(bard)).toBe(false);
    const b2 = toLevel2(bard);
    expect(hasJackOfAllTrades(b2)).toBe(true);
    expect(b2.initiative).toBe(bard.modifiers.DEX + 1);
    const untrained = b2.skills.find((s) => !s.proficient)!;
    expect(untrained.bonus).toBe(b2.modifiers[untrained.ability] + 1);
    expect("jackOfAllTrades" in b2).toBe(false);
  });
  it("la migration des sauvegardes recalcule aussi les anciens personnages", () => {
    const c = hero("barbarian");
    const stale = clone({ ...c, armorClass: 1, jackOfAllTrades: true } as Character);
    const m = migrate(stale);
    expect(m.armorClass).toBe(c.armorClass);
    expect("jackOfAllTrades" in m).toBe(false);
  });
});
