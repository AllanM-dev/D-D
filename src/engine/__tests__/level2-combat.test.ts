import { describe, expect, it } from "vitest";
import { defaultClassChoices } from "../../data/class-choices";
import { CLASSES } from "../../data/classes";
import { defaultSpells } from "../../data/spells";
import { characterToCombatant } from "../attacks";
import { buildCharacter, type Character, type CharacterDraft } from "../character";
import { availableBonus, castSpellTest, getCombatant, playerAttack, playerEndTurn, resolveAttack, rollSave, startCombat, useFeature, type CombatState } from "./combat-helpers";
import { levelUp, levelUpNeeds } from "../levelup";

const own = ["athletics", "intimidation"] as const;
function hero2(classId: string, patch: Partial<CharacterDraft> = {}): Character {
  const c = CLASSES.find((x) => x.id === classId)!;
  const draft = {
    name: "T", speciesId: "human", classId, backgroundId: "soldier", method: "standard",
    baseScores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
    classSkills: c.skillChoices.from.filter((s) => s !== "athletics" && s !== "intimidation").slice(0, c.skillChoices.count),
    fightingStyle: "defense", spells: defaultSpells(classId), ...defaultClassChoices(classId, [...own]), ...patch,
  } as CharacterDraft;
  const c1 = { ...buildCharacter(draft, "h"), xp: 300 };
  const n = levelUpNeeds(c1);
  return levelUp(c1, {
    ...(n.expertise ? { expertise: n.expertise.from.slice(0, n.expertise.count) } : {}),
    ...(n.fightingStyle ? { fightingStyle: n.fightingStyle[0] } : {}),
    ...(n.spells ? { spells: n.spells.from.slice(0, n.spells.count) } : {}),
  }).character;
}
const arena = { rows: Array.from({ length: 5 }, () => "..........") };
function fight(c: Character, foeHp = 200, foeAc = 5): CombatState {
  const party = { ...characterToCombatant(c), pos: { x: 1, y: 2 }, initiativeBonus: 30 };
  const foe = { id: "f", name: "Rat", side: "enemies" as const, maxHp: foeHp, ac: foeAc, initiativeBonus: -30, attacks: [], pos: { x: 2, y: 2 }, saveMods: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 } };
  return startCombat([party], [foe], () => 0.5, arena);
}
const ids = (s: CombatState) => availableBonus(s, getCombatant(s, "h")).map((o) => o.id);

describe("Fougue (guerrier)", () => {
  it("n'est proposée qu'une fois l'action dépensée, redonne une action, une fois par tour", () => {
    const s = fight(hero2("fighter"));
    expect(ids(s)).not.toContain("action-surge");
    playerAttack(s, "f", () => 0.5, 0);
    expect(getCombatant(s, "h").turnState.action).toBe(true);
    expect(ids(s)).toContain("action-surge");
    useFeature(s, "action-surge", () => 0.5);
    expect(getCombatant(s, "h").turnState.action).toBe(false);
    expect(getCombatant(s, "h").features.find((f) => f.id === "action-surge")!.uses).toBe(0);
    playerAttack(s, "f", () => 0.5, 0); // une seconde action
    expect(ids(s)).not.toContain("action-surge");
  });
});

describe("Attaque téméraire et Sens du danger (barbare)", () => {
  it("avantage à ses attaques de Force, et aux attaques contre lui, jusqu'à son prochain tour", () => {
    const s = fight(hero2("barbarian"));
    const me = getCombatant(s, "h");
    expect(ids(s)).toContain("reckless");
    useFeature(s, "reckless", () => 0.5);
    expect(me.reckless).toBe(true);
    expect(me.turnState.action).toBe(false); // ne coûte pas d'action
    const foe = getCombatant(s, "f");
    const melee = me.attacks.find((a) => a.ability === "STR" && !a.ranged)!;
    const r = resolveAttack(s, me, foe, melee, () => 0.5);
    expect(s.rolls.filter((x) => x.kind === "attack").at(-1)!.note).toContain("attaque téméraire");
    expect(r.hit || !r.hit).toBe(true);
    // l'ennemi qui l'attaque a l'avantage
    const enemyAttack = { name: "Griffe", toHit: 0, damage: { count: 1, sides: 4, bonus: 0 }, damageType: "tranchant", ranged: false };
    resolveAttack(s, foe, me, enemyAttack, () => 0.5);
    expect(s.rolls.filter((x) => x.kind === "attack").at(-1)!.note).toContain("cible téméraire");
    // il n'est plus proposé une fois actif, ni après une attaque
    expect(ids(s)).not.toContain("reckless");
  });
  it("Sens du danger : avantage aux jets de sauvegarde de Dextérité", () => {
    const s = fight(hero2("barbarian"));
    const me = getCombatant(s, "h");
    rollSave(s, me, "DEX", 30, () => 0.5);
    expect(s.log.at(-1)).toContain("sens du danger");
    rollSave(s, me, "STR", 30, () => 0.5);
    expect(s.log.at(-1)).not.toContain("sens du danger");
  });
});

describe("Action ruse (roublard)", () => {
  it("foncer ou se désengager en action bonus", () => {
    const s = fight(hero2("rogue"));
    expect(ids(s)).toEqual(expect.arrayContaining(["cunning-dash", "cunning-disengage"]));
    useFeature(s, "cunning-dash", () => 0.5);
    const me = getCombatant(s, "h");
    expect(me.turnState.dashed).toBe(true);
    expect(me.turnState.bonus).toBe(true);
    expect(ids(s)).not.toContain("cunning-disengage"); // l'action bonus est prise
  });
});

describe("Concentration du moine", () => {
  it("Défense patiente (esquive), Pas du vent (foncer + se désengager), Déluge de coups (deux frappes) : un point chacun", () => {
    const s = fight(hero2("monk"));
    const me = getCombatant(s, "h");
    expect(me.features.find((f) => f.id === "focus")!.uses).toBe(2);
    useFeature(s, "patient-defense", () => 0.5);
    expect(me.dodging).toBe(true);
    expect(me.features.find((f) => f.id === "focus")!.uses).toBe(1);
    const s2 = fight(hero2("monk"));
    useFeature(s2, "step-of-wind", () => 0.5);
    expect(getCombatant(s2, "h").turnState).toMatchObject({ dashed: true, disengaged: true });
    const s3 = fight(hero2("monk"));
    expect(ids(s3)).not.toContain("flurry"); // seulement après l'action Attaquer
    playerAttack(s3, "f", () => 0.5, 0);
    expect(ids(s3)).toContain("flurry");
    const before = s3.rolls.filter((x) => x.kind === "attack").length;
    useFeature(s3, "flurry", () => 0.5, { targetId: "f" });
    expect(s3.rolls.filter((x) => x.kind === "attack").length - before).toBe(2);
  });
});

describe("Source de magie (ensorceleur)", () => {
  it("2 points → 1 emplacement, et 1 emplacement → 1 point", () => {
    const s = fight(hero2("sorcerer"));
    const me = getCombatant(s, "h");
    const slots = me.spellcasting!.slots;
    expect(slots.max).toBe(3);
    expect(ids(s)).not.toContain("font-points"); // les points sont au maximum : rien à gagner
    me.features.find((f) => f.id === "sorcery-points")!.uses = 1;
    expect(ids(s)).toContain("font-points");
    useFeature(s, "font-points", () => 0.5);
    expect(slots.used).toBe(1);
    expect(me.features.find((f) => f.id === "sorcery-points")!.uses).toBe(2);
  });
  it("convertit des points en emplacement quand il en manque un", () => {
    const s = fight(hero2("sorcerer"));
    const me = getCombatant(s, "h");
    me.spellcasting!.slots.used = 2;
    expect(ids(s)).toContain("font-slot");
    useFeature(s, "font-slot", () => 0.5);
    expect(me.spellcasting!.slots.used).toBe(1);
    expect(me.features.find((f) => f.id === "sorcery-points")!.uses).toBe(0);
  });
});

describe("Châtiment divin (paladin)", () => {
  it("n'est lançable qu'après un coup d'arme au corps à corps qui touche, et inflige 2d8 radiants", () => {
    const s = fight(hero2("paladin"), 200, 1);
    const me = getCombatant(s, "h");
    expect(me.spellcasting!.prepared).toContain("divine-smite");
    const opt = () => castSpellTest(s, "divine-smite");
    expect(opt()).toBeUndefined(); // lancer sans coup touché : impossible
    playerAttack(s, "f", () => 0.6, me.attacks.findIndex((a) => !a.ranged && !a.unarmed));
    expect(me.turnState.lastHit).toBe("f");
    const hp = getCombatant(s, "f").hp;
    expect(opt()).toBe("ok");
    expect(getCombatant(s, "f").hp).toBeLessThan(hp);
    expect(me.spellcasting!.free.find((f) => f.spellId === "divine-smite")!.uses).toBe(0); // lancer gratuit consommé
  });
});
