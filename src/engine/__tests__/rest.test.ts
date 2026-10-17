import { defaultClassChoices } from "../../data/class-choices";
import { describe, expect, it } from "vitest";
import { CLASSES } from "../../data/classes";
import { defaultSpells } from "../../data/spells";
import { characterToCombatant } from "../attacks";
import { buildCharacter, type Character, type CharacterDraft } from "../character";
import { getCombatant, startCombat, useFeature } from "../combat";
import { castSpell } from "../spellcasting";
import { freshVitals, longRest, shortRest, vitalsAfterCombat, vitalsOf } from "../rest";

function hero(classId: string): Character {
  const c = CLASSES.find((x) => x.id === classId)!;
  const draft: CharacterDraft = {
    name: "T", speciesId: "human", classId, backgroundId: "soldier", method: "standard",
    baseScores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
    classSkills: c.skillChoices.from.filter((s) => s !== "athletics" && s !== "intimidation").slice(0, c.skillChoices.count),
    fightingStyle: "defense", spells: defaultSpells(classId), ...defaultClassChoices(classId, ["athletics", "intimidation"]),
  };
  return buildCharacter(draft, "hero");
}
const foe = { id: "foe", name: "Rat", side: "enemies" as const, maxHp: 500, ac: 30, initiativeBonus: -5, attacks: [] };
const withVitals = (c: Character, patch: Partial<ReturnType<typeof vitalsOf>>): Character => ({ ...c, vitals: { ...vitalsOf(c), ...patch } });

describe("repos", () => {
  it("un personnage neuf a tout au maximum", () => {
    const c = hero("fighter");
    expect(vitalsOf(c)).toEqual(freshVitals(c));
    expect(vitalsOf(c).hp).toBe(c.maxHp);
    expect(vitalsOf(c).hitDice).toBe(1);
  });

  it("le héros entre en combat avec ses PV et ses utilisations restantes", () => {
    const c = withVitals(hero("fighter"), { hp: 4, features: { "second-wind": 1 } });
    const init = characterToCombatant(c);
    expect(init.hp).toBe(4);
    expect(init.features![0].uses).toBe(1);
    expect(getCombatant(startCombat([init], [foe], () => 0.99), "hero").hp).toBe(4);
  });

  it("les emplacements dépensés et les lancers gratuits sont conservés", () => {
    const w = withVitals(hero("wizard"), { slotsUsed: 1 });
    expect(characterToCombatant(w).spellcasting!.slots.used).toBe(1);
    const r = withVitals(hero("ranger"), { free: { "hunters-mark": 0 } });
    expect(characterToCombatant(r).spellcasting!.free[0].uses).toBe(0);
  });

  it("fin de combat : PV, utilisations et emplacements sont reportés", () => {
    const c = withVitals(hero("fighter"), { hp: 3 });
    const s = startCombat([characterToCombatant(c)], [foe], () => 0.99);
    useFeature(s, "second-wind", () => 0.5);
    const v = vitalsAfterCombat(c, s);
    expect(v.features["second-wind"]).toBe(1);
    const wiz = hero("wizard");
    const sw = startCombat([characterToCombatant(wiz)], [foe], () => 0.99);
    const spell = wiz.spells!.prepared.find((id) => id === "magic-missile") ? "magic-missile" : wiz.spells!.prepared[0];
    castSpell(sw, spell, () => 0.5, { targetId: "foe" });
    expect(vitalsAfterCombat(wiz, sw).slotsUsed).toBe(1);
  });

  it("un héros tombé à 0 PV repart avec 1 PV", () => {
    const c = hero("fighter");
    const s = startCombat([characterToCombatant(c)], [foe], () => 0.99);
    getCombatant(s, "hero").hp = 0;
    expect(vitalsAfterCombat(c, s).hp).toBe(1);
  });

  it("repos court : un dé de vie + Constitution, plafonné aux PV max, un seul dé au niveau 1", () => {
    const c = withVitals(hero("fighter"), { hp: 1 });
    const r = shortRest(c, 5, () => 0.5); // d10 → 6
    expect(r.rolls).toHaveLength(1);
    expect(r.rolls[0].die).toBe(6);
    expect(r.healed).toBe(Math.min(6 + c.modifiers.CON, c.maxHp - 1));
    expect(r.vitals.hitDice).toBe(0);
    expect(shortRest(withVitals(c, { hitDice: 0 }), 1).rolls).toHaveLength(0);
    expect(shortRest(hero("fighter"), 1).rolls).toHaveLength(0); // déjà à fond : aucun dé gaspillé
  });

  it("repos court : une utilisation de Second souffle / Rage revient, pas la Magie innée", () => {
    expect(shortRest(withVitals(hero("fighter"), { features: { "second-wind": 0 } }), 0).vitals.features["second-wind"]).toBe(1);
    expect(shortRest(withVitals(hero("barbarian"), { features: { rage: 1 } }), 0).vitals.features.rage).toBe(2);
    expect(shortRest(withVitals(hero("sorcerer"), { features: { "innate-sorcery": 0 } }), 0).vitals.features["innate-sorcery"]).toBe(0);
  });

  it("repos court : l'occultiste récupère ses emplacements, le magicien un seul, une fois", () => {
    expect(shortRest(withVitals(hero("warlock"), { slotsUsed: 1 }), 0).vitals.slotsUsed).toBe(0);
    const w = withVitals(hero("wizard"), { slotsUsed: 2 });
    const r1 = shortRest(w, 0);
    expect(r1.vitals.slotsUsed).toBe(1);
    expect(shortRest({ ...w, vitals: r1.vitals }, 0).vitals.slotsUsed).toBe(1); // une fois seulement
    expect(shortRest(withVitals(hero("cleric"), { slotsUsed: 2 }), 0).vitals.slotsUsed).toBe(2);
  });

  it("repos long : tout revient, y compris le dé de vie et la Récupération arcanique", () => {
    const w = withVitals(hero("wizard"), { hp: 1, slotsUsed: 2, hitDice: 0, arcaneUsed: true });
    const r = longRest(w);
    expect(r.vitals).toEqual(freshVitals(w));
    const p = withVitals(hero("paladin"), { features: { "lay-on-hands": 0 }, hp: 2 });
    const rp = longRest(p);
    expect(rp.vitals.features["lay-on-hands"]).toBe(5);
    expect(rp.vitals.hp).toBe(p.maxHp);
  });

  it("anciennes sauvegardes sans vitals : tout au maximum", () => {
    const c = hero("barbarian");
    delete (c as Partial<Character>).vitals;
    expect(characterToCombatant(c).features![0].uses).toBe(2);
  });
});
