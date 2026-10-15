import { describe, expect, it } from "vitest";
import { MONSTERS } from "../../data/monsters";
import { SPELL_BY_ID, isPlayable } from "../../data/spells";
import { getCombatant, playerEndTurn, reactionOptions, resolveReaction, startCombat, type AttackDef, type CombatState, type CombatantInit } from "../combat";
import type { Rng } from "../dice";
import { castingFor } from "../spellcasting";

const seq = (...v: number[]): Rng => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const roll = (n: number) => (n - 0.5) / 20;
const MODS = { STR: 0, DEX: 2, CON: 2, INT: 3, WIS: 3, CHA: 3 };
const sword: AttackDef = { name: "Épée", toHit: 5, damage: { count: 1, sides: 8, bonus: 3 }, damageType: "tranchant", ranged: false };
const goblinDef = MONSTERS.find((m) => m.id === "goblin")!;

const caster = (classId: string, prepared: string[]): CombatantInit => ({
  id: "hero", name: "Mage", side: "party", maxHp: 30, ac: 10, initiativeBonus: 5, attacks: [sword],
  saveMods: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
  spellcasting: castingFor({ classId, modifiers: MODS, proficiencyBonus: 2, conSaveBonus: 2, unarmored: true, spells: { cantrips: [], prepared } }),
});
const goblin = (id = "g1", over: Partial<CombatantInit> = {}): CombatantInit => ({
  id, name: id, side: "enemies", maxHp: goblinDef.maxHp, ac: goblinDef.ac, initiativeBonus: -5, attacks: goblinDef.attacks, saveMods: goblinDef.saves, ...over,
});
const begin = (h: CombatantInit, foes: CombatantInit[]): CombatState => startCombat([h], foes, seq(0.99, 0, 0));
const me = (s: CombatState) => getCombatant(s, "hero");

describe("réactions : Bouclier", () => {
  it("l'ennemi qui touche suspend le combat et propose Bouclier", () => {
    const s = begin(caster("wizard", ["shield"]), [goblin()]);
    playerEndTurn(s, seq(0, roll(8)));
    expect(s.pending?.stage).toBe("hit");
    expect(s.pending?.options.map((o) => o.id)).toEqual(["shield"]);
    expect(s.pending?.summary).toContain("vous touche");
    expect(me(s).hp).toBe(30); // pas encore de dégâts
    expect(s.rolls.some((r) => r.kind === "attack")).toBe(false); // le jet est rejoué après la décision
  });

  it("Bouclier : +5 CA, l'attaque rate, un emplacement dépensé, la CA revient au tour suivant", () => {
    const s = begin(caster("wizard", ["shield"]), [goblin()]);
    playerEndTurn(s, seq(0, roll(8))); // 12 contre CA 10 : touche ; CA 15 : rate
    resolveReaction(s, "shield", seq(0.5));
    expect(s.pending).toBeUndefined();
    expect(me(s).hp).toBe(30);
    expect(me(s).spellcasting!.slots.used).toBe(1);
    expect(s.rolls.filter((r) => r.kind === "attack").at(-1)!.outcome).toBe("miss");
    expect(s.log.some((l) => l.includes("lance Bouclier (réaction)"))).toBe(true);
    // la main revient au héros : le Bouclier s'est dissipé
    expect(s.round).toBe(2);
    expect(me(s).ac).toBe(10);
    expect(me(s).turnState.reaction).toBeFalsy();
  });

  it("le Bouclier est actif jusqu'au début du prochain tour du héros (autres ennemis compris)", () => {
    const s = begin(caster("wizard", ["shield"]), [goblin("g1"), goblin("g2")]);
    playerEndTurn(s, seq(0, roll(8)));
    resolveReaction(s, "shield", seq(0, roll(13))); // g2 : 13 + 4 = 17 contre CA 15 → touche, mais plus de réaction possible
    expect(s.pending).toBeUndefined();
    expect(me(s).hp).toBeLessThan(30);
    expect(me(s).spellcasting!.slots.used).toBe(1);
  });

  it("refuser : l'attaque touche et inflige ses dégâts", () => {
    const s = begin(caster("wizard", ["shield"]), [goblin()]);
    playerEndTurn(s, seq(0, roll(8)));
    resolveReaction(s, null, seq(0.5));
    expect(me(s).hp).toBeLessThan(30);
    expect(me(s).spellcasting!.slots.used).toBe(0);
    expect(s.rolls.filter((r) => r.kind === "attack").at(-1)!.outcome).toBe("hit");
  });

  it("un 20 naturel touche malgré le Bouclier", () => {
    const s = begin(caster("wizard", ["shield"]), [goblin()]);
    playerEndTurn(s, seq(0, roll(20)));
    resolveReaction(s, "shield", seq(0.5));
    expect(s.rolls.filter((r) => r.kind === "attack").at(-1)!.outcome).toBe("crit");
    expect(me(s).hp).toBeLessThan(30);
  });

  it("une attaque qui rate ne demande rien", () => {
    const s = begin(caster("wizard", ["shield"]), [goblin()]);
    playerEndTurn(s, seq(0, roll(2)));
    expect(s.pending).toBeUndefined();
  });

  it("pas de réaction sans le sort préparé, sans emplacement, ou si elle est déjà utilisée", () => {
    const noSpell = begin(caster("wizard", ["magic-missile"]), [goblin()]);
    playerEndTurn(noSpell, seq(0, roll(8)));
    expect(noSpell.pending).toBeUndefined();

    const noSlot = begin(caster("wizard", ["shield"]), [goblin()]);
    me(noSlot).spellcasting!.slots.used = 2;
    expect(reactionOptions(me(noSlot), "hit")).toEqual([]);

    const used = begin(caster("wizard", ["shield"]), [goblin()]);
    me(used).turnState.reaction = true;
    expect(reactionOptions(me(used), "hit")).toEqual([]);
  });

  it("une réaction impossible ou sans attente est refusée", () => {
    const s = begin(caster("wizard", ["shield"]), [goblin()]);
    expect(() => resolveReaction(s, "shield")).toThrow();
    playerEndTurn(s, seq(0, roll(8)));
    expect(() => resolveReaction(s, "hellish-rebuke")).toThrow();
  });
});

describe("réactions : Représailles infernales", () => {
  it("après un coup subi : l'attaquant fait un jet de Dextérité et subit 2d10 de feu (moitié si réussi)", () => {
    const s = begin(caster("warlock", ["hellish-rebuke"]), [goblin()]);
    playerEndTurn(s, seq(0, roll(15), 0.5));
    expect(s.pending?.stage).toBe("damage");
    expect(me(s).hp).toBeLessThan(30);
    const foeHp = getCombatant(s, "g1").hp;
    // jet de Dextérité raté, 2d10 → 6 + 6
    resolveReaction(s, "hellish-rebuke", seq(roll(1), 0.5, 0.5));
    expect(foeHp - getCombatant(s, "g1").hp).toBeGreaterThan(0);
    expect(me(s).spellcasting!.slots.used).toBe(1);
    expect(s.log.some((l) => l.includes("Représailles infernales"))).toBe(true);
  });

  it("jet réussi : moitié des dégâts", () => {
    const a = begin(caster("warlock", ["hellish-rebuke"]), [goblin("g1", { maxHp: 100 })]);
    playerEndTurn(a, seq(0, roll(15), 0.5));
    resolveReaction(a, "hellish-rebuke", seq(roll(1), 0.95, 0.95)); // 2d10 = 20
    const b = begin(caster("warlock", ["hellish-rebuke"]), [goblin("g1", { maxHp: 100 })]);
    playerEndTurn(b, seq(0, roll(15), 0.5));
    resolveReaction(b, "hellish-rebuke", seq(roll(20), 0.95, 0.95));
    expect(100 - getCombatant(a, "g1").hp).toBe(20);
    expect(100 - getCombatant(b, "g1").hp).toBe(10);
  });

  it("refuser continue le combat", () => {
    const s = begin(caster("warlock", ["hellish-rebuke"]), [goblin()]);
    playerEndTurn(s, seq(0, roll(15), 0.5));
    resolveReaction(s, null);
    expect(s.pending).toBeUndefined();
    expect(s.round).toBe(2);
  });

  it("tuer l'attaquant avec la réaction donne la victoire", () => {
    const s = begin(caster("warlock", ["hellish-rebuke"]), [goblin("g1", { maxHp: 5 })]);
    playerEndTurn(s, seq(0, roll(15), 0.5));
    resolveReaction(s, "hellish-rebuke", seq(roll(1), 0.95, 0.95));
    expect(s.status).toBe("victory");
  });

  it("pas de proposition si le coup n'a fait aucun dégât ou a tué le héros", () => {
    const s = begin({ ...caster("warlock", ["hellish-rebuke"]), maxHp: 1 }, [goblin()]);
    playerEndTurn(s, seq(0, roll(15), 0.99));
    expect(s.pending).toBeUndefined();
  });
});

describe("données des réactions", () => {
  it("Bouclier et Représailles infernales sont jouables", () => {
    expect(isPlayable(SPELL_BY_ID.shield)).toBe(true);
    expect(isPlayable(SPELL_BY_ID["hellish-rebuke"])).toBe(true);
  });
});
