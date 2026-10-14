import { describe, expect, it } from "vitest";
import { CONDITIONS, CONDITION_BY_ID } from "../../data/conditions";
import { MONSTERS } from "../../data/monsters";
import { SPELL_BY_ID } from "../../data/spells";
import {
  applyCondition, endConcentration, getCombatant, hasCondition, playerEndTurn, resolveAttack, rollSave, startCombat,
  type AttackDef, type CombatState, type CombatantInit,
} from "../combat";
import type { Rng } from "../dice";
import { castSpell, castingFor } from "../spellcasting";

/** Suite de nombres dans [0,1) ; la dernière valeur se répète. */
const seq = (...v: number[]): Rng => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const roll = (n: number) => (n - 0.5) / 20; // d20 donnant n
const MODS = { STR: 0, DEX: 2, CON: 2, INT: 3, WIS: 3, CHA: 3 };
const sword: AttackDef = { name: "Épée", toHit: 5, damage: { count: 1, sides: 8, bonus: 3 }, damageType: "tranchant", ranged: false };
const bow: AttackDef = { ...sword, name: "Arc", ranged: true };

const hero = (over: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "hero", name: "Héros", side: "party", maxHp: 30, ac: 10, initiativeBonus: 5, attacks: [sword], saveMods: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }, ...over,
});
const wolf = MONSTERS.find((m) => m.id === "wolf")!;
const ghoul = MONSTERS.find((m) => m.id === "ghoul")!;
const foe = (over: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "foe", name: "Cible", side: "enemies", maxHp: 50, ac: 10, initiativeBonus: -5, attacks: [], saveMods: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }, ...over,
});
const monster = (m: typeof wolf, over: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "foe", name: m.name, side: "enemies", maxHp: m.maxHp, ac: m.ac, initiativeBonus: -5, attacks: m.attacks, saveMods: m.saves, immunities: m.immunities, ...over,
});
/** Héros en premier (initiative 20 contre 1), puis le reste du hasard fourni. */
const begin = (h: CombatantInit, f: CombatantInit, ...rest: number[]): { s: CombatState; rng: Rng } => {
  const rng = seq(0.99, 0, ...rest);
  return { s: startCombat([h], [f], rng), rng };
};
const me = (s: CombatState) => getCombatant(s, "hero");
const them = (s: CombatState) => getCombatant(s, "foe");
const lastAttack = (s: CombatState) => [...s.rolls].reverse().find((r) => r.kind === "attack")!;

describe("avantage et désavantage venant des états", () => {
  it("un attaquant empoisonné a un désavantage (deux d20, le plus bas gardé)", () => {
    const { s } = begin(hero(), foe());
    applyCondition(s, me(s), { id: "poisoned", source: "test" });
    resolveAttack(s, me(s), them(s), sword, seq(roll(18), roll(4)));
    const a = lastAttack(s);
    expect(a.dice).toHaveLength(2);
    expect(a.dice[a.keptIndex]).toBe(4);
    expect(a.note).toContain("empoisonné");
  });

  it.each(["frightened", "blinded", "restrained", "prone"] as const)("un attaquant %s a un désavantage", (id) => {
    const { s } = begin(hero(), foe());
    applyCondition(s, me(s), { id, source: "test" });
    resolveAttack(s, me(s), them(s), sword, seq(roll(18), roll(4)));
    expect(lastAttack(s).dice).toHaveLength(2);
    expect(lastAttack(s).note).toMatch(/^Désavantage/);
  });

  it.each(["blinded", "restrained", "stunned", "paralyzed"] as const)("une cible %s subit les attaques avec avantage", (id) => {
    const { s } = begin(hero(), foe());
    applyCondition(s, them(s), { id, source: "test" });
    resolveAttack(s, me(s), them(s), sword, seq(roll(4), roll(18)));
    const a = lastAttack(s);
    expect(a.dice[a.keptIndex]).toBe(18);
    expect(a.note).toMatch(/^Avantage/);
  });

  it("à terre : avantage au corps à corps, désavantage à distance", () => {
    const { s } = begin(hero(), foe());
    applyCondition(s, them(s), { id: "prone", source: "test" });
    resolveAttack(s, me(s), them(s), sword, seq(roll(4), roll(18)));
    expect(lastAttack(s).note).toContain("cible à terre");
    expect(lastAttack(s).dice.length).toBe(2);
    const keptMelee = lastAttack(s).dice[lastAttack(s).keptIndex];
    expect(keptMelee).toBe(18);
    resolveAttack(s, me(s), them(s), bow, seq(roll(18), roll(4)));
    const keptRanged = lastAttack(s).dice[lastAttack(s).keptIndex];
    expect(keptRanged).toBe(4);
  });

  it("avantage et désavantage s'annulent (un seul d20)", () => {
    const { s } = begin(hero(), foe());
    applyCondition(s, me(s), { id: "poisoned", source: "test" });
    applyCondition(s, them(s), { id: "stunned", source: "test" });
    resolveAttack(s, me(s), them(s), sword, seq(roll(12)));
    expect(lastAttack(s).dice).toHaveLength(1);
  });

  it("un coup au corps à corps contre une cible paralysée est critique, pas à distance", () => {
    const { s } = begin(hero(), foe());
    applyCondition(s, them(s), { id: "paralyzed", source: "test" });
    expect(resolveAttack(s, me(s), them(s), sword, seq(roll(12), roll(12), 0.5)).crit).toBe(true);
    expect(resolveAttack(s, me(s), them(s), bow, seq(roll(12), roll(12), 0.5)).crit).toBe(false);
  });
});

describe("jets de sauvegarde et états", () => {
  it("étourdi ou paralysé : échec automatique en Force et Dextérité, pas en Sagesse", () => {
    const { s } = begin(hero(), foe());
    applyCondition(s, them(s), { id: "stunned", source: "test" });
    expect(rollSave(s, them(s), "DEX", 5, seq(0.99)).success).toBe(false);
    expect(rollSave(s, them(s), "STR", 5, seq(0.99)).success).toBe(false);
    expect(rollSave(s, them(s), "WIS", 5, seq(0.99)).success).toBe(true);
  });

  it("entravé : désavantage en Dextérité", () => {
    const { s } = begin(hero(), foe());
    applyCondition(s, them(s), { id: "restrained", source: "test" });
    const before = s.rolls.length;
    rollSave(s, them(s), "DEX", 10, seq(roll(18), roll(3)));
    const ev = s.rolls[before];
    expect(ev.dice).toHaveLength(2);
    expect(ev.outcome).toBe("failure");
  });
});

describe("états infligés par les monstres", () => {
  it("le loup fait tomber à terre sur un jet de Force raté, puis le héros se relève à son tour", () => {
    const { s, rng } = begin(hero(), monster(wolf), 0, roll(15), 0, 0, roll(2) /* sauvegarde de Force ratée */);
    playerEndTurn(s, rng);
    expect(s.log.some((l) => l.includes("Héros est à terre"))).toBe(true);
    expect(s.log.some((l) => l.includes("il se relève"))).toBe(true);
    expect(hasCondition(me(s), "prone")).toBe(false);
  });

  it("jet de Force réussi : pas de chute", () => {
    const { s, rng } = begin(hero(), monster(wolf), 0, roll(15), 0, 0, roll(19));
    playerEndTurn(s, rng);
    expect(s.log.some((l) => l.includes("est à terre"))).toBe(false);
  });

  it("une attaque qui rate n'inflige rien", () => {
    const { s, rng } = begin(hero({ ac: 30 }), monster(wolf), 0, roll(2));
    playerEndTurn(s, rng);
    expect(s.log.some((l) => l.includes("est à terre"))).toBe(false);
  });

  it("les griffes de la goule paralysent sur un jet de Constitution raté : le héros passe son tour et refait son jet", () => {
    // Goule : choix de la cible, choix de l'attaque (griffes), jet d'attaque, 2d4, sauvegarde ratée ;
    // le héros passe son tour : sauvegarde de fin de tour réussie.
    const { s, rng } = begin(hero(), monster(ghoul), 0, 0, roll(15), 0, 0, roll(2), roll(19));
    playerEndTurn(s, rng);
    expect(s.log.some((l) => l.includes("Héros est paralysé (Griffes)"))).toBe(true);
    expect(s.log.some((l) => l.includes("Héros est neutralisé et passe son tour"))).toBe(true);
    expect(s.log.some((l) => l.includes("Héros n'est plus paralysé"))).toBe(true);
  });

  it("les elfes sont épargnés par la paralysie de la goule", () => {
    const { s, rng } = begin(hero({ tags: ["elf"] }), monster(ghoul), 0, 0, roll(15), 0, 0, roll(2));
    playerEndTurn(s, rng);
    expect(hasCondition(me(s), "paralyzed")).toBe(false);
    expect(s.log.some((l) => l.includes("est paralysé"))).toBe(false);
  });

  it("la goule est immunisée au poison", () => {
    const { s } = begin(hero(), monster(ghoul));
    expect(applyCondition(s, them(s), { id: "poisoned", source: "test" })).toBe(false);
    expect(them(s).conditions).toHaveLength(0);
  });

  it("un héros paralysé subit des critiques au corps à corps", () => {
    const { s } = begin(hero(), monster(ghoul));
    applyCondition(s, me(s), { id: "paralyzed", source: "test" });
    expect(resolveAttack(s, them(s), me(s), ghoul.attacks[1], seq(roll(15), roll(15), 0.5, 0.5, 0.5, 0.5)).crit).toBe(true);
  });
});

describe("sorts qui infligent des états", () => {
  const caster = (classId: string, prepared: string[]): CombatantInit => ({
    ...hero(), id: "hero", name: "Mage", attacks: [sword],
    spellcasting: castingFor({ classId, modifiers: MODS, proficiencyBonus: 2, conSaveBonus: 2, unarmored: true, spells: { cantrips: [], prepared } }),
  });

  it("Rayon empoisonné : touché → empoisonné jusqu'à la fin du prochain tour du lanceur", () => {
    const { s } = begin(caster("wizard", ["ray-of-sickness"]), foe(), 0);
    // le lancer termine le tour (action utilisée) : la cible joue, puis c'est de nouveau le tour du lanceur
    castSpell(s, "ray-of-sickness", seq(roll(18), 0.5, 0.5), { targetId: "foe" });
    expect(s.round).toBe(2);
    expect(hasCondition(them(s), "poisoned")).toBe(true);
    playerEndTurn(s, seq(0.5));
    expect(hasCondition(them(s), "poisoned")).toBe(false);
  });

  it("Rayon empoisonné raté : rien", () => {
    const { s } = begin(caster("wizard", ["ray-of-sickness"]), foe({ ac: 30 }), 0);
    castSpell(s, "ray-of-sickness", seq(roll(2)), { targetId: "foe" });
    expect(them(s).conditions).toHaveLength(0);
  });

  it("un squelette est immunisé au poison", () => {
    const sk = MONSTERS.find((m) => m.id === "skeleton")!;
    const { s } = begin(caster("wizard", ["ray-of-sickness"]), monster(sk), 0);
    castSpell(s, "ray-of-sickness", seq(roll(18), 0.5, 0.5), { targetId: "foe" });
    expect(them(s).conditions).toHaveLength(0);
  });

  const goblin = () => monster(MONSTERS.find((m) => m.id === "goblin")!);

  it("Enchevêtrement : Force ratée → entravé ; l'ennemi tente de se libérer au lieu d'attaquer", () => {
    const { s } = begin(caster("druid", ["entangle"]), goblin(), 0);
    const hp = me(s).hp;
    // sauvegarde de Force ratée, puis (tour du gobelin) test de Force raté
    castSpell(s, "entangle", seq(roll(1)), { targetId: "foe" });
    expect(me(s).concentrating?.spellId).toBe("entangle");
    expect(hasCondition(them(s), "restrained")).toBe(true);
    expect(me(s).hp).toBe(hp);
    expect(s.rolls.some((r) => r.title.includes("tente de se libérer"))).toBe(true);
    expect(s.rolls.some((r) => r.kind === "attack")).toBe(false);
  });

  it("Enchevêtrement : un test de Force réussi libère l'ennemi", () => {
    const { s } = begin(caster("druid", ["entangle"]), goblin(), 0);
    castSpell(s, "entangle", seq(roll(1), roll(20)), { targetId: "foe" });
    expect(hasCondition(them(s), "restrained")).toBe(false);
  });

  it("perdre la concentration libère l'ennemi entravé", () => {
    const { s } = begin(caster("druid", ["entangle"]), goblin(), 0);
    castSpell(s, "entangle", seq(roll(1)), { targetId: "foe" });
    endConcentration(s, me(s), "perd sa concentration");
    expect(them(s).conditions).toHaveLength(0);
  });

  it("Enchevêtrement : Force réussie → aucun effet", () => {
    const { s } = begin(caster("druid", ["entangle"]), foe(), 0);
    castSpell(s, "entangle", seq(roll(20)), { targetId: "foe" });
    expect(them(s).conditions).toHaveLength(0);
  });

  it("Fou rire : à terre et neutralisé ; la cible passe son tour et refait son jet à chaque tour", () => {
    const { s } = begin(caster("bard", ["hideous-laughter"]), monster(MONSTERS.find((m) => m.id === "goblin")!), 0);
    castSpell(s, "hideous-laughter", seq(roll(1)), { targetId: "foe" });
    expect(hasCondition(them(s), "prone")).toBe(true);
    expect(hasCondition(them(s), "incapacitated")).toBe(true);
    const hp = me(s).hp;
    // sa sauvegarde de fin de tour est ratée : elle reste neutralisée, ne se relève pas et n'attaque pas
    playerEndTurn(s, seq(roll(1)));
    expect(me(s).hp).toBe(hp);
    expect(hasCondition(them(s), "incapacitated")).toBe(true);
    expect(hasCondition(them(s), "prone")).toBe(true);
    // à son tour suivant, sauvegarde réussie : plus neutralisée ; elle se relèvera à son prochain tour
    playerEndTurn(s, seq(roll(20)));
    expect(hasCondition(them(s), "incapacitated")).toBe(false);
    playerEndTurn(s, seq(roll(1), roll(1)));
    expect(hasCondition(them(s), "prone")).toBe(false);
  });

  it("un sort de contrôle est lié à la concentration : le perdre libère la cible", () => {
    const { s } = begin(caster("bard", ["hideous-laughter"]), foe(), 0);
    castSpell(s, "hideous-laughter", seq(roll(1)), { targetId: "foe" });
    expect(them(s).conditions.length).toBe(2);
    me(s).concentrating = { spellId: "hideous-laughter" };
    me(s).hp = 30;
    // dégâts importants : jet de concentration raté
    const rng = seq(roll(1));
    resolveAttack(s, them(s), me(s), { ...sword, damage: { count: 1, sides: 4, bonus: 20 } }, seq(roll(15), 0.9, roll(1)));
    void rng;
    expect(them(s).conditions).toHaveLength(0);
  });

  it("un lanceur neutralisé perd sa concentration", () => {
    const { s } = begin(caster("bard", ["hideous-laughter"]), foe(), 0);
    castSpell(s, "hideous-laughter", seq(roll(1)), { targetId: "foe" });
    applyCondition(s, me(s), { id: "stunned", source: "test" });
    expect(me(s).concentrating).toBeUndefined();
    expect(them(s).conditions).toHaveLength(0);
  });
});

describe("données des états", () => {
  it("chaque état du moteur est décrit et marqué appliqué", () => {
    for (const id of ["poisoned", "prone", "frightened", "blinded", "restrained", "incapacitated", "stunned", "paralyzed"])
      expect(CONDITION_BY_ID[id]?.status, id).toBe("applied");
  });

  it("15 états du SRD, textes non vides, identifiants uniques", () => {
    expect(CONDITIONS).toHaveLength(15);
    expect(new Set(CONDITIONS.map((c) => c.id)).size).toBe(15);
    for (const c of CONDITIONS) {
      expect(c.text.length, c.id).toBeGreaterThan(20);
      expect(c.note.length, c.id).toBeGreaterThan(5);
    }
  });

  it("les nouveaux sorts existent et sont jouables", () => {
    for (const id of ["ray-of-sickness", "entangle", "hideous-laughter"]) expect(SPELL_BY_ID[id]?.effect.kind).not.toBe("none");
  });
});
