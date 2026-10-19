import { describe, expect, it } from "vitest";
import { CLASSES } from "../../data/classes";
import { computeEquipment, type EquipmentInput } from "../equipment";
import { characterToCombatant } from "../attacks";
import { buildCharacter } from "../character";
import {
  BONUS_OPTION_IDS, FEATURE_LABELS, availableBonus, currentCombatant, getCombatant, healCombatant, playerAttack, playerDodge, playerEndTurn, playerOptions,
  processTurns, resolveAttack, startCombat, useFeature, type AttackDef, type CombatState, type CombatantInit, type FeatureUse,
} from "../combat";
import { featuresFor } from "../features";
import { abilityModifier } from "../rules";
import type { Rng } from "../dice";
import type { AbilityScores } from "../abilities";

const seq = (...v: number[]): Rng => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const D20 = { one: 0, mid: 0.5, twenty: 0.99 };

const axe: AttackDef = { name: "Hache", toHit: 5, damage: { count: 1, sides: 12, bonus: 3 }, damageType: "tranchant", ranged: false, ability: "STR" };
const sword: AttackDef = { name: "Épée", toHit: 5, damage: { count: 1, sides: 8, bonus: 3 }, damageType: "tranchant", ranged: false };

const hero = (over: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "hero", name: "Héros", side: "party", maxHp: 12, ac: 14, initiativeBonus: 5, attacks: [axe], ...over,
});
const foe = (over: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "foe", name: "Gobelin", side: "enemies", maxHp: 50, ac: 10, initiativeBonus: 0, attacks: [sword], ...over,
});
const feat = (id: FeatureUse["id"], uses = 2, extra: Partial<FeatureUse> = {}): FeatureUse => ({ id, uses, max: uses, ...extra });
/** Combat où le héros joue en premier, sans consommer de hasard. */
const fresh = (h = hero(), f = foe()): CombatState => startCombat([h], [f], seq(D20.twenty, D20.one));
const me = (s: CombatState) => getCombatant(s, "hero");

describe("capacités par classe", () => {
  it("donne les ressources de niveau 1", () => {
    expect(featuresFor("fighter")).toEqual([{ id: "second-wind", uses: 2, max: 2 }]);
    expect(featuresFor("barbarian")).toEqual([{ id: "rage", uses: 2, max: 2 }]);
    expect(featuresFor("paladin")).toEqual([{ id: "lay-on-hands", uses: 5, max: 5 }]);
    expect(featuresFor("paladin", 3)[0]).toMatchObject({ uses: 15, max: 15 });
    expect(featuresFor("sorcerer")).toEqual([{ id: "innate-sorcery", uses: 2, max: 2 }]);
    expect(featuresFor("monk")[0]).toMatchObject({ id: "martial-arts", unlimited: true });
    for (const c of ["wizard", "rogue", "cleric"]) expect(featuresFor(c)).toEqual([]);
  });
  it("chaque classe a une réponse (liste, éventuellement vide)", () => {
    for (const c of CLASSES) expect(Array.isArray(featuresFor(c.id))).toBe(true);
  });
  it("chaque option nommée a une fiche (sauf les réserves, qui ouvrent plusieurs options), et chaque fiche un nom", () => {
    const reserves = ["cunning-action", "focus", "sorcery-points"];
    expect([...BONUS_OPTION_IDS, ...reserves].sort()).toEqual(Object.keys(FEATURE_LABELS).sort());
  });
  it("chaque capacité donnée à une classe (niveaux 1 et 2) ouvre au moins une option", () => {
    const opened = new Set<string>(["cunning-action", "focus", "sorcery-points", ...BONUS_OPTION_IDS]); // réserves : voir ci-dessus
    for (const c of CLASSES) for (const f of featuresFor(c.id, 2, { CHA: 2 })) expect(opened.has(f.id), f.id).toBe(true);
  });
});

describe("Second souffle", () => {
  it("rend 1d10 + niveau PV, plafonné aux PV max, et consomme une utilisation", () => {
    const s = fresh(hero({ features: [feat("second-wind")] }));
    me(s).hp = 5;
    useFeature(s, "second-wind", seq(0.5)); // d10 = 6 → 7 PV
    expect(me(s).hp).toBe(12);
    expect(me(s).features[0].uses).toBe(1);
    const roll = s.rolls[s.rolls.length - 1];
    expect(roll).toMatchObject({ kind: "heal", sides: 10, dice: [6], modifier: 1, total: 7 });
    expect(roll.after.find((c) => c.id === "hero")!.hp).toBe(12);
  });
  it("n'est pas proposé à pleins PV, ni deux fois dans le même tour, ni sans utilisation", () => {
    const s = fresh(hero({ features: [feat("second-wind")] }));
    expect(availableBonus(s, me(s))).toEqual([]); // pleins PV
    expect(() => useFeature(s, "second-wind")).toThrow();
    me(s).hp = 3;
    useFeature(s, "second-wind", seq(0)); // d10 = 1 → +2 PV
    expect(me(s).hp).toBe(5);
    expect(availableBonus(s, me(s))).toEqual([]); // action bonus déjà utilisée
    expect(() => useFeature(s, "second-wind")).toThrow();
    const none = fresh(hero({ features: [feat("second-wind", 0)] }));
    me(none).hp = 3;
    expect(availableBonus(none, me(none))).toEqual([]);
  });
});

describe("enchaînement du tour", () => {
  it("l'action seule termine le tour quand aucune action bonus n'est possible", () => {
    const s = fresh(hero({ features: [feat("second-wind")] })); // pleins PV : rien à proposer
    playerAttack(s, "foe", seq(D20.one, 0, D20.one));
    expect(s.round).toBe(2); // l'ennemi a joué, retour au héros
  });
  it("le tour reste ouvert tant qu'une action bonus est utile, et se termine après son usage", () => {
    const s = fresh(hero({ features: [feat("second-wind")] }));
    me(s).hp = 4;
    playerAttack(s, "foe", seq(D20.one)); // raté
    expect(s.round).toBe(1);
    expect(currentCombatant(s).id).toBe("hero");
    expect(playerOptions(s)).toMatchObject({ canAct: false, canEnd: true });
    expect(playerOptions(s).bonus.map((o) => o.id)).toEqual(["second-wind"]);
    expect(() => playerAttack(s, "foe")).toThrow(); // une seule action par tour
    expect(() => playerDodge(s)).toThrow();
    useFeature(s, "second-wind", seq(0.5, 0, D20.one)); // soigne, puis l'ennemi joue (et rate)
    expect(s.round).toBe(2);
  });
  it("on peut utiliser l'action bonus avant l'action, puis agir", () => {
    const s = fresh(hero({ features: [feat("second-wind")] }));
    me(s).hp = 4;
    useFeature(s, "second-wind", seq(0.5));
    expect(currentCombatant(s).id).toBe("hero");
    expect(playerOptions(s)).toMatchObject({ canAct: true, canEnd: true });
    playerDodge(s, seq(0, D20.one)); // action utilisée, plus d'action bonus → fin de tour automatique
    expect(s.round).toBe(2);
  });
  it("terminer le tour sans utiliser l'action bonus", () => {
    const s = fresh(hero({ features: [feat("second-wind")] }));
    me(s).hp = 4;
    playerDodge(s);
    expect(s.round).toBe(1);
    playerEndTurn(s, seq(0, D20.one));
    expect(s.round).toBe(2);
  });
});

describe("Rage", () => {
  it("ajoute +2 aux dégâts des attaques de Force seulement", () => {
    const s = fresh(hero({ features: [feat("rage")], attacks: [axe, { ...axe, name: "Arc", ability: "DEX", ranged: true }] }));
    useFeature(s, "rage");
    expect(me(s).raging).toBe(true);
    resolveAttack(s, me(s), getCombatant(s, "foe"), axe, seq(0.5, 0.5)); // d20 = 11 touche ; d12 = 7 → 7+3+2
    expect(getCombatant(s, "foe").hp).toBe(50 - 12);
    resolveAttack(s, me(s), getCombatant(s, "foe"), s.combatants[0].attacks[1], seq(0.5, 0.5)); // Dextérité : pas de bonus
    expect(getCombatant(s, "foe").hp).toBe(50 - 12 - 10);
    expect(s.rolls[s.rolls.length - 1]).toMatchObject({ kind: "damage", modifier: 3 });
  });
  it("réduit de moitié les dégâts contondants, perforants et tranchants reçus", () => {
    const s = fresh(hero({ features: [feat("rage")] }));
    useFeature(s, "rage");
    resolveAttack(s, getCombatant(s, "foe"), me(s), sword, seq(0.5, 0.5)); // 11+5 = 16 ≥ 14 ; d8 = 5 → 8 → 4
    expect(me(s).hp).toBe(12 - 4);
    const fire: AttackDef = { ...sword, damageType: "feu" };
    resolveAttack(s, getCombatant(s, "foe"), me(s), fire, seq(0.5, 0.5));
    expect(me(s).hp).toBe(12 - 4 - 8); // pas de résistance au feu
  });
  it("consomme une utilisation et ne se relance pas pendant qu'elle dure", () => {
    const s = fresh(hero({ features: [feat("rage")] }));
    useFeature(s, "rage");
    expect(me(s).features[0].uses).toBe(1);
    expect(availableBonus(s, me(s))).toEqual([]);
  });
  it("retombe au bout d'une minute (10 rounds)", () => {
    const s = fresh(hero({ features: [feat("rage")] }));
    useFeature(s, "rage");
    s.round = 10;
    s.turn = 0;
    processTurns(s);
    expect(me(s).raging).toBe(true);
    s.round = 11;
    processTurns(s);
    expect(me(s).raging).toBe(false);
  });
});

describe("Imposition des mains", () => {
  it("dépense des points de la réserve pour se soigner, dans la limite des PV manquants", () => {
    const s = fresh(hero({ features: [feat("lay-on-hands", 5)] }));
    me(s).hp = 3;
    expect(availableBonus(s, me(s))[0]).toMatchObject({ id: "lay-on-hands", amountMax: 5 });
    useFeature(s, "lay-on-hands", seq(0), { amount: 4 });
    expect(me(s).hp).toBe(7);
    expect(me(s).features[0].uses).toBe(1);
  });
  it("refuse une quantité invalide", () => {
    const s = fresh(hero({ features: [feat("lay-on-hands", 5)] }));
    me(s).hp = 10; // manque 2
    expect(availableBonus(s, me(s))[0].amountMax).toBe(2);
    for (const amount of [0, 3, -1, 1.5]) expect(() => useFeature(s, "lay-on-hands", seq(0), { amount })).toThrow();
    expect(() => useFeature(s, "lay-on-hands", seq(0), {})).toThrow();
    expect(me(s).features[0].uses).toBe(5);
  });
  it("ne propose rien à pleins PV ni réserve épuisée", () => {
    const s = fresh(hero({ features: [feat("lay-on-hands", 5)] }));
    expect(availableBonus(s, me(s))).toEqual([]);
    me(s).hp = 3;
    me(s).features[0].uses = 0;
    expect(availableBonus(s, me(s))).toEqual([]);
  });
  it("soigner un personnage à 0 PV le réveille", () => {
    const s = fresh();
    const h = me(s);
    h.hp = 0;
    h.deathSaves = { successes: 1, failures: 2 };
    expect(healCombatant(s, h, 20)).toBe(12);
    expect(h).toMatchObject({ hp: 12, deathSaves: { successes: 0, failures: 0 }, stable: false });
  });
});

describe("Magie innée", () => {
  const bolt: AttackDef = { name: "Trait de feu", toHit: 5, damage: { count: 1, sides: 10, bonus: 0 }, damageType: "feu", ranged: true, ability: "CHA", spell: true };
  const dagger: AttackDef = { name: "Dague", toHit: 2, damage: { count: 1, sides: 4, bonus: 1 }, damageType: "perforant", ranged: false, ability: "DEX" };
  it("donne l'avantage aux attaques de sort, pas aux attaques d'arme", () => {
    const s = fresh(hero({ attacks: [bolt, dagger], features: [feat("innate-sorcery")] }));
    useFeature(s, "innate-sorcery");
    resolveAttack(s, me(s), getCombatant(s, "foe"), bolt, seq(0.1, 0.9, 0.5));
    const spell = s.rolls.filter((r) => r.kind === "attack").pop()!;
    expect(spell.dice).toEqual([3, 19]);
    expect(spell.dice[spell.keptIndex]).toBe(19);
    resolveAttack(s, me(s), getCombatant(s, "foe"), dagger, seq(0.5, 0.5));
    expect(s.rolls.filter((r) => r.kind === "attack").pop()!.dice).toHaveLength(1);
  });
  it("s'arrête au bout d'une minute", () => {
    const s = fresh(hero({ features: [feat("innate-sorcery")] }));
    useFeature(s, "innate-sorcery");
    s.round = 11;
    s.turn = 0;
    processTurns(s);
    expect(me(s).innateSorcery).toBe(false);
  });
});

describe("Arts martiaux : frappe bonus", () => {
  const unarmed: AttackDef = { name: "Frappe à mains nues", toHit: 5, damage: { count: 1, sides: 6, bonus: 3 }, damageType: "contondant", ranged: false, ability: "DEX", unarmed: true };
  const spear: AttackDef = { name: "Lance", toHit: 5, damage: { count: 1, sides: 6, bonus: 3 }, damageType: "perforant", ranged: false, ability: "DEX" };
  const monk = () => hero({ attacks: [spear, unarmed], features: [feat("martial-arts", 0, { unlimited: true, max: 0 })] });
  it("n'est possible qu'après l'action Attaquer", () => {
    const s = fresh(monk());
    expect(availableBonus(s, me(s))).toEqual([]);
    expect(() => useFeature(s, "martial-arts", seq(0.5), { targetId: "foe" })).toThrow();
    playerDodge(s); // Esquiver n'est pas Attaquer
    expect(availableBonus(s, me(s))).toEqual([]);
  });
  it("ajoute une frappe à mains nues, puis termine le tour", () => {
    const s = fresh(monk());
    playerAttack(s, "foe", seq(0.5, 0.5), 0); // lance : touche, 4+3 = 7... d6 = 4 → 7
    expect(currentCombatant(s).id).toBe("hero");
    expect(availableBonus(s, me(s))[0]).toMatchObject({ id: "martial-arts", needsTarget: true });
    const before = s.rolls.length;
    useFeature(s, "martial-arts", seq(0.5, 0.5, 0, D20.one), { targetId: "foe" });
    const kinds = s.rolls.slice(before).filter((r) => r.actorId === "hero").map((r) => r.kind);
    expect(kinds).toEqual(["attack", "damage"]);
    expect(getCombatant(s, "foe").hp).toBe(50 - 7 - 7);
    expect(s.round).toBe(2); // action + action bonus utilisées : fin de tour
  });
  it("exige une cible valide", () => {
    const s = fresh(monk());
    playerAttack(s, "foe", seq(D20.one));
    expect(() => useFeature(s, "martial-arts", seq(0.5), { targetId: "hero" })).toThrow();
    expect(() => useFeature(s, "martial-arts", seq(0.5), {})).toThrow();
  });
});

describe("styles de combat", () => {
  const input = (over: Partial<EquipmentInput> = {}): EquipmentInput => {
    const scores: AbilityScores = { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 10, CHA: 10 };
    const modifiers = Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, abilityModifier(v)])) as AbilityScores;
    return { classId: "fighter", scores, modifiers, proficiencyBonus: 2, baseSpeed: 9, ...over };
  };
  it("Défense : +1 CA seulement en armure", () => {
    expect(computeEquipment(input()).armorClass).toBe(16);
    expect(computeEquipment(input({ fightingStyle: "defense" })).armorClass).toBe(17);
    expect(computeEquipment(input({ fightingStyle: "defense", classId: "wizard" })).armorClass).toBe(12); // pas d'armure
    expect(computeEquipment(input({ fightingStyle: "archery" })).armorClass).toBe(16);
  });
  it("Archerie : +2 aux attaques d'armes à distance, pas aux autres", () => {
    const plain = computeEquipment(input(), "B").attacks;
    const archer = computeEquipment(input({ fightingStyle: "archery" }), "B").attacks;
    const get = (list: AttackDef[], n: string) => list.find((a) => a.name === n)!;
    expect(get(archer, "Arc long").toHit).toBe(get(plain, "Arc long").toHit + 2);
    expect(get(archer, "Cimeterre").toHit).toBe(get(plain, "Cimeterre").toHit);
    const lot = computeEquipment(input({ fightingStyle: "archery" }), "A").attacks;
    expect(get(lot, "Javeline (lancer)").toHit).toBe(get(computeEquipment(input(), "A").attacks, "Javeline (lancer)").toHit); // arme de mêlée lancée
  });
  it("un guerrier construit reçoit son style, ses capacités et son attaque annotée", () => {
    const c = buildCharacter(
      { name: "F", speciesId: "human", classId: "fighter", backgroundId: "soldier", method: "standard",
        baseScores: { STR: 15, DEX: 13, CON: 14, INT: 8, WIS: 10, CHA: 12 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
        classSkills: ["perception", "survival"], fightingStyle: "defense" }, "f");
    expect(c.fightingStyle).toBe("defense");
    const init = characterToCombatant(c);
    expect(init.features).toEqual([{ id: "second-wind", uses: 2, max: 2 }]);
    expect(init.attacks.every((a) => a.ability)).toBe(true);
  });
});
