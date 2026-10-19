import { describe, expect, it } from "vitest";
import { defaultClassChoices } from "../../data/class-choices";
import { CLASSES } from "../../data/classes";
import { LEVEL2_FEATURES, XP_FOR_LEVEL, levelForXp, xpForNext } from "../../data/levels";
import { MONSTERS } from "../../data/monsters";
import { defaultSpells, spellCountsFor } from "../../data/spells";
import { characterToCombatant } from "../attacks";
import { buildCharacter, type Character, type CharacterDraft } from "../character";
import { getCombatant, startCombat } from "../combat";
import { featuresFor } from "../features";
import { addXp, canLevelUp, hpGainFor, levelUp, levelUpNeeds, migrateXp, retroXp, validateLevelUp, xpOf, type LevelUpChoices } from "../levelup";
import { freshVitals, shortRest, vitalsOf } from "../rest";
import { castingFor } from "../spellcasting";
import { castingInput } from "../rest";

const own = ["athletics", "intimidation"] as const;
function hero(classId: string, xp = 0): Character {
  const c = CLASSES.find((x) => x.id === classId)!;
  const draft = {
    name: "T", speciesId: "human", classId, backgroundId: "soldier", method: "standard",
    baseScores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
    classSkills: c.skillChoices.from.filter((s) => s !== "athletics" && s !== "intimidation").slice(0, c.skillChoices.count),
    fightingStyle: "defense", spells: defaultSpells(classId), ...defaultClassChoices(classId, [...own]),
  } as CharacterDraft;
  return { ...buildCharacter(draft, "h"), xp };
}
/** Premiers choix valides pour chaque besoin du passage de niveau. */
function autoChoices(c: Character): LevelUpChoices {
  const n = levelUpNeeds(c);
  return {
    ...(n.expertise ? { expertise: n.expertise.from.slice(0, n.expertise.count) } : {}),
    ...(n.fightingStyle ? { fightingStyle: n.fightingStyle[0] } : {}),
    ...(n.spells ? { spells: n.spells.from.slice(0, n.spells.count) } : {}),
  };
}

describe("expérience et niveaux", () => {
  it("seuils de 2024 : 300 points pour le niveau 2, et le jeu s'arrête au niveau 2", () => {
    expect(XP_FOR_LEVEL[2]).toBe(300);
    expect(levelForXp(299)).toBe(1);
    expect(levelForXp(300)).toBe(2);
    expect(levelForXp(99999)).toBe(2);
    expect(xpForNext(1)).toBe(300);
    expect(xpForNext(2)).toBeUndefined();
  });
  it("chaque monstre vaut de l'expérience", () => {
    for (const m of MONSTERS) expect(m.xp, m.id).toBeGreaterThan(0);
  });
  it("on peut monter de niveau à partir de 300 points, une seule fois", () => {
    const c = hero("fighter", 299);
    expect(canLevelUp(c)).toBe(false);
    expect(validateLevelUp(c, {})).toEqual(["Pas assez d'expérience pour monter de niveau."]);
    const ok = addXp(c, 1);
    expect(xpOf(ok)).toBe(300);
    expect(canLevelUp(ok)).toBe(true);
    expect(canLevelUp(levelUp(ok, {}).character)).toBe(false);
  });
  it("les anciens personnages reçoivent l'expérience déjà gagnée (ennemis vaincus, étapes de l'histoire)", () => {
    const base = { ...hero("fighter"), xp: undefined } as Character;
    const old = { ...base, exploration: { mapId: "brumeval", x: 0, y: 0, explored: [], defeated: ["wolf-1", "ghoul-1"] }, story: { flags: ["indice-moulin", "quete-terminee"] } };
    expect(retroXp(old)).toBe(50 + 200 + 25 + 100);
    expect(migrateXp(old).xp).toBe(375);
    expect(migrateXp({ ...old, xp: 12 }).xp).toBe(12);
  });
});

describe("passage au niveau 2", () => {
  it("les PV augmentent de la moyenne du dé de vie + Constitution, les dés de vie aussi, et la vie actuelle suit", () => {
    for (const cls of CLASSES) {
      const c = hero(cls.id, 300);
      const r = levelUp(c, autoChoices(c));
      const gain = Math.max(1, Math.floor(cls.hitDie / 2) + 1 + c.modifiers.CON);
      expect(hpGainFor(c), cls.id).toBe(gain);
      expect(r.character.level, cls.id).toBe(2);
      expect(r.character.maxHp, cls.id).toBe(c.maxHp + gain);
      expect(r.character.vitals!.hp, cls.id).toBe(c.maxHp + gain);
      expect(r.character.vitals!.hitDice, cls.id).toBe(2);
      expect(r.character.proficiencyBonus).toBe(2);
    }
  });
  it("les choix demandés par classe : expertise, style de combat, sorts préparés", () => {
    expect(levelUpNeeds(hero("bard", 300)).expertise?.count).toBe(2);
    expect(levelUpNeeds(hero("ranger", 300)).expertise?.count).toBe(1);
    expect(levelUpNeeds(hero("wizard", 300)).expertise?.from.every((s) => ["arcana", "history", "investigation", "medicine", "nature", "religion"].includes(s))).toBe(true);
    expect(levelUpNeeds(hero("paladin", 300)).fightingStyle).toBeTruthy();
    expect(levelUpNeeds(hero("fighter", 300)).fightingStyle).toBeUndefined();
    expect(levelUpNeeds(hero("barbarian", 300))).toEqual({});
    expect(levelUpNeeds(hero("wizard", 300)).spells?.count).toBe(1);
    expect(levelUpNeeds(hero("sorcerer", 300)).spells?.count).toBe(2);
    // les choix invalides sont refusés
    expect(validateLevelUp(hero("bard", 300), {}).join(" ")).toContain("Expertise");
    expect(validateLevelUp(hero("barbarian", 300), { expertise: ["athletics"] }).join(" ")).toContain("Pas d'expertise");
    expect(() => levelUp(hero("paladin", 300), {})).toThrow();
  });
  it("sorts : emplacements et sorts préparés du niveau 2, plus Châtiment divin pour le paladin", () => {
    for (const id of ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"]) {
      const c = hero(id, 300);
      const r = levelUp(c, autoChoices(c)).character;
      const counts = spellCountsFor(id, 2);
      expect(r.spells!.prepared.length, id).toBe(counts.prepared);
      expect(new Set(r.spells!.prepared).size, id).toBe(r.spells!.prepared.length);
      const sc = castingFor(castingInput(r))!;
      expect(sc.slots.max, id).toBe(counts.slots);
      expect(sc.prepared.includes("divine-smite"), id).toBe(id === "paladin");
    }
    const pal = levelUp(hero("paladin", 300), { fightingStyle: "defense", spells: levelUpNeeds(hero("paladin", 300)).spells!.from.slice(0, 1) }).character;
    expect(vitalsOf(pal).free["divine-smite"]).toBe(1);
  });
  it("expertise : bonus doublé ; Touche-à-tout du barde sur les compétences non maîtrisées et l'initiative", () => {
    const c = hero("bard", 300);
    const r = levelUp(c, { expertise: ["athletics", "intimidation"], spells: levelUpNeeds(c).spells!.from.slice(0, 1) }).character;
    const sk = (id: string) => r.skills.find((s) => s.id === id)!;
    expect(sk("athletics").expert).toBe(true);
    expect(sk("athletics").bonus).toBe(r.modifiers.STR + 2 * r.proficiencyBonus);
    const untrained = r.skills.find((s) => !s.proficient)!;
    expect(untrained.bonus).toBe(r.modifiers[untrained.ability] + 1);
    expect(r.initiative).toBe(c.initiative + 1);
  });
  it("style de combat du paladin ou du rôdeur : appliqué aux attaques et à la CA", () => {
    const pal = hero("paladin", 300);
    const spells = levelUpNeeds(pal).spells!.from.slice(0, 1);
    const withDefense = levelUp(pal, { fightingStyle: "defense", spells }).character;
    expect(withDefense.fightingStyle).toBe("defense");
    expect(withDefense.armorClass).toBe(pal.armorClass + 1);
  });
  it("occultiste : les trois invocations ; moine : +3 m sans armure ; ressources du niveau 2 pleines", () => {
    const wl = levelUp(hero("warlock", 300), autoChoices(hero("warlock", 300))).character;
    expect(wl.invocations).toHaveLength(3);
    const monk = hero("monk", 300);
    const m2 = levelUp(monk, {}).character;
    expect(m2.speed).toBe(monk.speed + 3);
    expect(m2.vitals!.features.focus).toBe(2);
    const fighter = levelUp(hero("fighter", 300), {}).character;
    expect(fighter.vitals!.features["action-surge"]).toBe(1);
    const pal = hero("paladin", 300);
    const p2 = levelUp(pal, autoChoices(pal)).character;
    expect(p2.vitals!.features["lay-on-hands"]).toBe(10);
    const sor = hero("sorcerer", 300);
    expect(levelUp(sor, autoChoices(sor)).character.vitals!.features["sorcery-points"]).toBe(2);
    expect(freshVitals(m2).features.focus).toBe(2);
  });
  it("chaque capacité du niveau 2 est décrite, et les capacités « appliquées » existent dans le moteur", () => {
    for (const cls of CLASSES) {
      const list = LEVEL2_FEATURES[cls.id];
      expect(list?.length, cls.id).toBeGreaterThan(0);
      for (const f of list) { expect(f.text.length).toBeGreaterThan(20); expect(f.note.length).toBeGreaterThan(5); }
    }
    expect(featuresFor("fighter", 2).map((f) => f.id)).toContain("action-surge");
    expect(featuresFor("fighter", 1).map((f) => f.id)).not.toContain("action-surge");
    expect(featuresFor("barbarian", 2).map((f) => f.id)).toContain("reckless");
    expect(featuresFor("rogue", 2).map((f) => f.id)).toContain("cunning-action");
    expect(featuresFor("monk", 2).map((f) => f.id)).toContain("focus");
    expect(featuresFor("sorcerer", 2).map((f) => f.id)).toContain("sorcery-points");
  });
  it("le repos court rend Fougue et les points de concentration", () => {
    const f = levelUp(hero("fighter", 300), {}).character;
    const spent = { ...f, vitals: { ...vitalsOf(f), features: { ...vitalsOf(f).features, "action-surge": 0 } } };
    expect(shortRest(spent, 0).vitals.features["action-surge"]).toBe(1);
    const mk = levelUp(hero("monk", 300), {}).character;
    const spentM = { ...mk, vitals: { ...vitalsOf(mk), features: { ...vitalsOf(mk).features, focus: 0 } } };
    expect(shortRest(spentM, 0).vitals.features.focus).toBe(2);
  });
  it("un combattant de niveau 2 entre en combat avec ses nouvelles capacités", () => {
    const f = levelUp(hero("barbarian", 300), {}).character;
    const party = { ...characterToCombatant(f), pos: { x: 0, y: 0 } };
    const s = startCombat([party], [{ id: "e", name: "E", side: "enemies", maxHp: 9, ac: 5, initiativeBonus: -30, attacks: [], pos: { x: 3, y: 0 } }], () => 0.5, { rows: ["....."] });
    expect(getCombatant(s, "h").dangerSense).toBe(true);
    expect(getCombatant(s, "h").features.map((x) => x.id)).toContain("reckless");
  });
});
