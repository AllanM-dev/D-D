import { describe, expect, it } from "vitest";
import { defaultClassChoices } from "../../data/class-choices";
import { CLASSES } from "../../data/classes";
import { SPELL_BY_ID, defaultSpells } from "../../data/spells";
import { characterToCombatant } from "../attacks";
import { buildCharacter, validateDraft, type Character, type CharacterDraft } from "../character";
import { getCombatant, resolveAttack, rollDamageDetailed, startCombat } from "../combat";
import { deriveStats, isWeaponProficient, wearsUntrained } from "../equipment";
import { castSpell, spellRange } from "../spellcasting";
import { WEAPONS } from "../../data/equipment";

const own = ["athletics", "intimidation"] as const;
function draftOf(classId: string, patch: Partial<CharacterDraft> = {}): CharacterDraft {
  const c = CLASSES.find((x) => x.id === classId)!;
  return {
    name: "T", speciesId: "human", classId, backgroundId: "soldier", method: "standard",
    baseScores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
    classSkills: c.skillChoices.from.filter((s) => s !== "athletics" && s !== "intimidation").slice(0, c.skillChoices.count),
    fightingStyle: "defense", spells: defaultSpells(classId), ...defaultClassChoices(classId, [...own]), ...patch,
  } as CharacterDraft;
}
const hero = (classId: string, patch: Partial<CharacterDraft> = {}): Character => buildCharacter(draftOf(classId, patch), "h");
const skill = (c: Character, id: string) => c.skills.find((s) => s.id === id)!;

describe("Expertise du roublard", () => {
  it("double le bonus de maîtrise de deux compétences maîtrisées", () => {
    const c = hero("rogue", { expertise: ["athletics", "intimidation"] });
    const plain = hero("rogue", { expertise: ["intimidation", "athletics"] });
    expect(skill(c, "athletics").expert).toBe(true);
    expect(skill(c, "athletics").bonus).toBe(c.modifiers.STR + 2 * c.proficiencyBonus);
    expect(skill(plain, "intimidation").bonus).toBe(plain.modifiers.CHA + 2 * plain.proficiencyBonus);
    expect(skill(c, "stealth").expert).toBeUndefined();
  });
  it("exige deux compétences que l'on maîtrise", () => {
    expect(validateDraft(draftOf("rogue", { expertise: [] }))).toContain("Choisissez 2 compétences pour l'expertise.");
    expect(validateDraft(draftOf("rogue", { expertise: ["athletics", "arcana"] })).join(" ")).toContain("expertise porte sur des compétences que vous maîtrisez");
    expect(validateDraft(draftOf("rogue"))).toEqual([]);
  });
});

describe("Ordre divin et Ordre primordial", () => {
  const greataxe = WEAPONS.find((w) => w.id === "greataxe")!;
  it("Protecteur : armes martiales et armure lourde maîtrisées", () => {
    expect(isWeaponProficient("cleric", greataxe)).toBe(false);
    expect(isWeaponProficient("cleric", greataxe, "protector")).toBe(true);
    expect(wearsUntrained("cleric", { armor: { id: "plate", name: "Harnois" }, shield: false })).toBe(true);
    expect(wearsUntrained("cleric", { armor: { id: "plate", name: "Harnois" }, shield: false }, "protector")).toBe(false);
    expect(hero("cleric", { order: "protector" }).order).toBe("protector");
  });
  it("Gardien : armes martiales et armure intermédiaire", () => {
    expect(wearsUntrained("druid", { armor: { id: "chain-shirt", name: "Chemise de mailles" }, shield: false })).toBe(true);
    expect(wearsUntrained("druid", { armor: { id: "chain-shirt", name: "Chemise de mailles" }, shield: false }, "warden")).toBe(false);
    expect(isWeaponProficient("druid", greataxe, "warden")).toBe(true);
  });
  it("Thaumaturge : un sort mineur de plus et un bonus aux compétences de savoir", () => {
    const base = draftOf("cleric", { order: "thaumaturge" });
    expect(validateDraft(base)).toContain("Choisissez 4 sorts mineurs.");
    const cantrips = [...defaultSpells("cleric").cantrips];
    const more = ["sacred-flame", "toll-the-dead", "guidance", "light", "mending", "thaumaturgy"].find((id) => !cantrips.includes(id))!;
    const ok = draftOf("cleric", { order: "thaumaturge", spells: { cantrips: [...cantrips, more], prepared: defaultSpells("cleric").prepared } });
    expect(validateDraft(ok)).toEqual([]);
    const c = buildCharacter(ok, "x");
    const plain = hero("cleric");
    expect(skill(c, "arcana").bonus).toBe(skill(plain, "arcana").bonus + Math.max(1, c.modifiers.WIS));
    expect(skill(c, "religion").bonus).toBe(skill(plain, "religion").bonus + Math.max(1, c.modifiers.WIS));
    expect(skill(c, "nature").bonus).toBe(skill(plain, "nature").bonus);
  });
  it("le choix d'un ordre est obligatoire pour le clerc et le druide", () => {
    expect(validateDraft(draftOf("cleric", { order: undefined }))).toContain("Choisissez un Ordre divin.");
    expect(validateDraft(draftOf("druid", { order: undefined }))).toContain("Choisissez un Ordre primordial.");
    expect(validateDraft(draftOf("druid", { order: "protector" }))).toContain("Choisissez un Ordre primordial.");
  });
});

describe("Invocations occultes", () => {
  it("Armure d'ombres : CA 13 + Dextérité sans armure", () => {
    const c = hero("warlock", { invocation: "armor-of-shadows" });
    const input = { classId: "warlock", scores: c.scores, modifiers: c.modifiers, proficiencyBonus: 2, baseSpeed: 9, invocation: "armor-of-shadows" };
    expect(deriveStats(input, { shield: false, weapons: [] }).armorClass).toBe(13 + c.modifiers.DEX);
    expect(deriveStats({ ...input, invocation: "eldritch-spear" }, { shield: false, weapons: [] }).armorClass).toBe(10 + c.modifiers.DEX);
  });
  it("Décharge agonisante : le Charisme s'ajoute aux dégâts de la Décharge occulte", () => {
    const fight = (invocation: string) => {
      const c = hero("warlock", { invocation, baseScores: { STR: 8, DEX: 14, CON: 13, INT: 10, WIS: 12, CHA: 15 }, spells: { cantrips: ["eldritch-blast", "chill-touch"], prepared: ["hex", "armor-of-agathys"] } });
      const party = { ...characterToCombatant(c), pos: { x: 0, y: 1 }, initiativeBonus: 30 };
      const foe = { id: "f", name: "Rat", side: "enemies" as const, maxHp: 90, ac: 1, initiativeBonus: -30, attacks: [], pos: { x: 3, y: 1 } };
      const s = startCombat([party], [foe], () => 0.5, { rows: ["......", "......", "......"] });
      castSpell(s, "eldritch-blast", () => 0.5, { targetId: "f" });
      return { c, dmg: s.rolls.filter((r) => r.kind === "damage").at(-1)! };
    };
    const a = fight("agonizing-blast");
    const b = fight("eldritch-spear");
    expect(a.dmg.modifier).toBe(a.c.modifiers.CHA);
    expect(b.dmg.modifier).toBe(0);
  });
  it("Lance occulte : portée triplée pour la Décharge occulte seulement", () => {
    const c = hero("warlock", { invocation: "eldritch-spear" });
    const party = characterToCombatant(c);
    const s = startCombat([{ ...party, pos: { x: 0, y: 0 } }], [{ id: "f", name: "R", side: "enemies", maxHp: 5, ac: 1, initiativeBonus: -30, attacks: [], pos: { x: 3, y: 0 } }], () => 0.5, { rows: ["......"] });
    const me = getCombatant(s, "h");
    expect(spellRange(SPELL_BY_ID["eldritch-blast"], me)).toBe(108);
    expect(spellRange(SPELL_BY_ID["chill-touch"], me)).toBe(36);
  });
  it("le choix d'une invocation est obligatoire", () => {
    expect(validateDraft(draftOf("warlock", { invocation: undefined }))).toContain("Choisissez une invocation occulte.");
  });
});

describe("Styles de combat : Armes à deux mains et Deux armes", () => {
  const statsFor = (style: "great-weapon" | "two-weapon" | "defense", weapons: { id: string; name: string; qty: number }[], shield = false) => {
    const c = hero("fighter");
    return deriveStats({ classId: "fighter", scores: c.scores, modifiers: c.modifiers, proficiencyBonus: 2, baseSpeed: 9, fightingStyle: style }, { shield, weapons });
  };
  it("Armes à deux mains : seulement les armes de mêlée tenues à deux mains", () => {
    const st = statsFor("great-weapon", [{ id: "greataxe", name: "Hache à deux mains", qty: 1 }, { id: "longsword", name: "Épée longue", qty: 1 }, { id: "longbow", name: "Arc long", qty: 1 }]);
    expect(st.attacks.find((a) => a.weaponId === "greataxe")?.gwf).toBe(true);
    expect(st.attacks.find((a) => a.weaponId === "longsword")?.gwf).toBe(true); // polyvalente, sans bouclier
    expect(st.attacks.find((a) => a.weaponId === "longbow")?.gwf).toBeUndefined();
    const withShield = statsFor("great-weapon", [{ id: "longsword", name: "Épée longue", qty: 1 }], true);
    expect(withShield.attacks.find((a) => a.weaponId === "longsword")?.gwf).toBeUndefined();
    expect(statsFor("defense", [{ id: "greataxe", name: "Hache à deux mains", qty: 1 }]).attacks[0].gwf).toBeUndefined();
  });
  it("un 1 ou un 2 aux dés de dégâts compte comme un 3", () => {
    expect(rollDamageDetailed({ count: 2, sides: 12, bonus: 0 }, false, () => 0, 3).dice).toEqual([3, 3]);
    expect(rollDamageDetailed({ count: 2, sides: 12, bonus: 0 }, false, () => 0).dice).toEqual([1, 1]);
    expect(rollDamageDetailed({ count: 1, sides: 12, bonus: 4 }, false, () => 0.99, 3).total).toBe(16);
  });
  it("Deux armes : le modificateur s'ajoute aux dégâts de la seconde arme", () => {
    const two = statsFor("two-weapon", [{ id: "dagger", name: "Dague", qty: 2 }]);
    const plain = statsFor("defense", [{ id: "dagger", name: "Dague", qty: 2 }]);
    const mod = hero("fighter").modifiers.DEX > hero("fighter").modifiers.STR ? hero("fighter").modifiers.DEX : hero("fighter").modifiers.STR;
    expect(two.attacks[0].offhand?.damage.bonus).toBe(mod);
    expect(plain.attacks[0].offhand?.damage.bonus).toBe(Math.min(0, mod));
  });
});

describe("Bénédiction", () => {
  it("ajoute 1d4 aux jets d'attaque et de sauvegarde tant que la concentration dure", () => {
    const c = hero("cleric", { spells: { cantrips: defaultSpells("cleric").cantrips, prepared: ["bless", "cure-wounds", "guiding-bolt", "inflict-wounds"] } });
    const party = { ...characterToCombatant(c), pos: { x: 0, y: 1 }, initiativeBonus: 30 };
    const foe = { id: "f", name: "Rat", side: "enemies" as const, maxHp: 90, ac: 15, initiativeBonus: -30, attacks: [], pos: { x: 1, y: 1 }, saveMods: { DEX: 0, STR: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 } };
    const s = startCombat([party], [foe], () => 0.5, { rows: ["......", "......", "......"] });
    castSpell(s, "bless", () => 0.5);
    expect(getCombatant(s, "h").blessed).toBe(true);
    expect(getCombatant(s, "h").concentrating?.spellId).toBe("bless");
    expect(SPELL_BY_ID.bless.effect.kind).toBe("bless");
  });
  it("fait réussir un jet d'attaque qui aurait raté de peu, et seulement quand on est béni", () => {
    const run = (blessed: boolean) => {
      const c = hero("cleric");
      const party = { ...characterToCombatant(c), pos: { x: 0, y: 1 }, initiativeBonus: 30 };
      const foe = { id: "f", name: "Rat", side: "enemies" as const, maxHp: 90, ac: 12, initiativeBonus: -30, attacks: [], pos: { x: 1, y: 1 } };
      const s = startCombat([party], [foe], () => 0.5, { rows: ["......", "......", "......"] });
      const me = getCombatant(s, "h");
      me.blessed = blessed;
      const vals = [0.45, 0.99, 0.5, 0.5, 0.5]; // d20 = 10, d4 = 4
      let i = 0;
      return resolveAttack(s, me, getCombatant(s, "f"), { name: "Épée", toHit: 0, damage: { count: 1, sides: 4, bonus: 0 }, damageType: "tranchant", ranged: false }, () => vals[Math.min(i++, vals.length - 1)]);
    };
    expect(run(false).hit).toBe(false);
    expect(run(true).hit).toBe(true);
  });
});
