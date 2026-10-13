import { describe, expect, it } from "vitest";
import { ENCOUNTERS, buildEnemies } from "../../data/encounters";
import { MONSTERS } from "../../data/monsters";
import { characterToCombatant } from "../attacks";
import { buildCharacter, type CharacterDraft } from "../character";
import {
  applyDamage, currentCombatant, getCombatant, makeCombatant, playerAttack, playerDodge, processTurns, resolveAttack,
  rollDamage, startCombat, type AttackDef, type CombatState, type CombatantInit,
} from "../combat";
import { seededRng, type Rng } from "../dice";

/** RNG qui rejoue une liste de flottants (puis répète le dernier). */
const seq = (...v: number[]): Rng => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const D20 = { one: 0, mid: 0.5, twenty: 0.99 }; // d20 : 1, 11, 20
const sword: AttackDef = { name: "Épée", toHit: 5, damage: { count: 1, sides: 8, bonus: 3 }, damageType: "tranchant", ranged: false };
const bow: AttackDef = { ...sword, name: "Arc", ranged: true };

const hero = (over: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "hero", name: "Héros", side: "party", maxHp: 12, ac: 14, initiativeBonus: 5, attacks: [sword], ...over,
});
const foe = (over: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "foe", name: "Gobelin", side: "enemies", maxHp: 7, ac: 15, initiativeBonus: 0, attacks: [sword], ...over,
});
/** Combat où le héros joue en premier, sans consommer de hasard. */
function fresh(h = hero(), f = foe()): CombatState {
  return startCombat([h], [f], seq(D20.twenty, D20.one));
}

describe("initiative", () => {
  it("trie par initiative puis bonus, joueur d'abord à égalité", () => {
    const s = startCombat([hero({ initiativeBonus: 2 })], [foe({ initiativeBonus: 2 })], seq(0.5, 0.5));
    expect(s.order).toEqual(["hero", "foe"]);
    const s2 = startCombat([hero({ initiativeBonus: 0 })], [foe({ initiativeBonus: 4 })], seq(0.5, 0.5));
    expect(s2.order[0]).toBe("foe");
  });
});

describe("dégâts", () => {
  it("double les dés sur critique mais pas le bonus", () => {
    // d8 → 0.5 => 5 ; 1 dé : 5+3 = 8 ; critique : 2 dés = 10+3 = 13
    expect(rollDamage(sword.damage, false, seq(0.5))).toBe(8);
    expect(rollDamage(sword.damage, true, seq(0.5))).toBe(13);
  });
  it("un ennemi meurt à 0 PV", () => {
    const s = fresh();
    applyDamage(s, getCombatant(s, "foe"), 99, false);
    expect(getCombatant(s, "foe")).toMatchObject({ hp: 0, dead: true });
  });
  it("un joueur tombe inconscient à 0 PV", () => {
    const s = fresh();
    const h = getCombatant(s, "hero");
    applyDamage(s, h, 12, false);
    expect(h).toMatchObject({ hp: 0, dead: false });
  });
  it("mort instantanée si le surplus atteint les PV max", () => {
    const s = fresh();
    const h = getCombatant(s, "hero");
    applyDamage(s, h, 24, false); // surplus 12 >= max 12
    expect(h.dead).toBe(true);
  });
  it("un coup à terre = 1 échec, un critique = 2, trois échecs = mort", () => {
    const s = fresh();
    const h = getCombatant(s, "hero");
    applyDamage(s, h, 12, false);
    applyDamage(s, h, 2, false);
    expect(h.deathSaves.failures).toBe(1);
    applyDamage(s, h, 2, true);
    expect(h.dead).toBe(true);
  });
});

describe("attaque", () => {
  const attackWith = (state: CombatState, rolls: number[], attack = sword) => {
    resolveAttack(state, getCombatant(state, "hero"), getCombatant(state, "foe"), attack, seq(...rolls));
  };
  it("touche si le total atteint la CA", () => {
    const s = fresh();
    attackWith(s, [0.45, 0.99]); // d20 = 10 → 15 = CA ; d8 = 8 → 11 dégâts
    expect(getCombatant(s, "foe").dead).toBe(true);
  });
  it("rate si le total est inférieur à la CA", () => {
    const s = fresh();
    attackWith(s, [0.4]); // d20 = 9 → 14 < 15
    expect(getCombatant(s, "foe").hp).toBe(7);
  });
  it("un 1 naturel rate toujours, un 20 touche toujours", () => {
    const s = fresh(hero(), foe({ ac: 1 }));
    attackWith(s, [D20.one]);
    expect(getCombatant(s, "foe").hp).toBe(7);
    const s2 = fresh(hero(), foe({ ac: 40, maxHp: 100 }));
    attackWith(s2, [D20.twenty, D20.twenty, D20.twenty, D20.twenty]); // critique : 2d8+3 = 19
    expect(getCombatant(s2, "foe").hp).toBe(100 - 19);
  });
  it("l'esquive impose un désavantage (garde le pire des deux d20)", () => {
    const s = fresh(hero(), foe({ ac: 12, maxHp: 100 }));
    getCombatant(s, "foe").dodging = true;
    attackWith(s, [D20.twenty, D20.one]); // pire = 1 → raté
    expect(getCombatant(s, "foe").hp).toBe(100);
  });
  it("avantage au corps à corps contre un joueur à terre, et coup toujours critique", () => {
    const s = fresh();
    const h = getCombatant(s, "hero");
    h.hp = 0;
    // d20 avec avantage : 1 puis 12 → 12+5 = 17 ≥ CA 14 ; critique : 2d8+3 (dés à 1) = 5 → 2 échecs
    resolveAttack(s, getCombatant(s, "foe"), h, sword, seq(D20.one, 0.55, 0, 0));
    expect(h.deathSaves.failures).toBe(2);
  });
  it("pas d'avantage à distance contre un joueur à terre", () => {
    const s = fresh();
    const h = getCombatant(s, "hero");
    h.hp = 0;
    resolveAttack(s, getCombatant(s, "foe"), h, bow, seq(D20.one, D20.twenty)); // un seul d20 lancé : 1 → raté
    expect(h.deathSaves.failures).toBe(0);
  });
});

describe("déroulement", () => {
  it("l'ennemi riposte après l'action du joueur", () => {
    const s = fresh(hero({ ac: 1 }), foe({ ac: 30, maxHp: 50 }));
    // Héros rate (d20 = 1) ; ennemi : cible (rng), d20 = 20 (critique), 2d8 à 1 → 2 + 3 = 5 dégâts
    playerAttack(s, "foe", seq(D20.one, 0, D20.twenty, 0, 0));
    expect(getCombatant(s, "hero").hp).toBe(12 - 5);
    expect(currentCombatant(s).id).toBe("hero"); // c'est de nouveau au joueur
    expect(s.round).toBe(2);
  });
  it("victoire quand le dernier ennemi tombe", () => {
    const s = fresh();
    playerAttack(s, "foe", seq(D20.twenty, 0.99, 0.99));
    expect(s.status).toBe("victory");
    expect(() => playerDodge(s)).toThrow();
  });
  it("défaite quand le joueur est mort", () => {
    const s = fresh(hero({ maxHp: 3, ac: 1 }), foe({ ac: 30, maxHp: 50 }));
    playerAttack(s, "foe", seq(D20.one, 0, D20.twenty, 0.99, 0.99));
    // PV 3 : coup critique ≥ 3 dégâts ET surplus >= 3 → mort instantanée
    expect(s.status).toBe("defeat");
  });
  describe("jets de mort", () => {
    /** Héros à terre dont c'est le tour, face à un ennemi inoffensif. */
    const downed = () => {
      const s = startCombat([hero({ initiativeBonus: 20 })], [foe({ initiativeBonus: -20, attacks: [] })], seq(0.5, 0.5));
      getCombatant(s, "hero").hp = 0;
      return s;
    };
    it("un 20 naturel relève le héros avec 1 PV", () => {
      const s = downed();
      processTurns(s, seq(D20.twenty));
      expect(getCombatant(s, "hero").hp).toBe(1);
      expect(s.status).toBe("ongoing");
    });
    it("trois réussites stabilisent (et sans autre combattant debout, c'est la défaite)", () => {
      const s = downed();
      processTurns(s, seq(D20.mid)); // d20 = 11 : réussite à chaque fois
      expect(getCombatant(s, "hero")).toMatchObject({ stable: true, dead: false, hp: 0 });
      expect(s.status).toBe("defeat");
    });
    it("un 1 naturel compte pour deux échecs : deux jets suffisent à mourir", () => {
      const s = downed();
      processTurns(s, seq(D20.one));
      expect(getCombatant(s, "hero").dead).toBe(true);
      expect(s.status).toBe("defeat");
    });
  });
  it("ne boucle jamais : des centaines de combats se terminent", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = seededRng(seed);
      const s = startCombat([hero({ maxHp: 8, ac: 11 })], buildEnemies(ENCOUNTERS.find((e) => e.id === "goblins")!), rng);
      let guard = 0;
      while (s.status === "ongoing" && guard++ < 200) {
        const target = s.combatants.find((c) => c.side === "enemies" && !c.dead)!;
        playerAttack(s, target.id, rng);
      }
      expect(s.status).not.toBe("ongoing");
    }
  });
});

describe("jets de dés (animation)", () => {
  it("enregistre un jet d'initiative par combattant", () => {
    const s = fresh();
    const init = s.rolls.filter((r) => r.kind === "initiative");
    expect(init.map((r) => r.actorId).sort()).toEqual(["foe", "hero"]);
    expect(init.find((r) => r.actorId === "hero")).toMatchObject({ sides: 20, dice: [20], modifier: 5, total: 25 });
  });
  it("un coup touché produit un jet d'attaque puis un jet de dégâts, avec l'état au bon moment", () => {
    const s = fresh(hero(), foe({ ac: 10, maxHp: 50 }));
    const before = s.rolls.length;
    resolveAttack(s, getCombatant(s, "hero"), getCombatant(s, "foe"), sword, seq(0.5, 0.5)); // d20 = 11, d8 = 5
    const [atk, dmg] = s.rolls.slice(before);
    expect(atk).toMatchObject({ kind: "attack", dice: [11], total: 16, dc: 10, outcome: "hit" });
    expect(dmg).toMatchObject({ kind: "damage", sides: 8, dice: [5], modifier: 3, total: 8 });
    expect(atk.after.find((c) => c.id === "foe")!.hp).toBe(50); // les PV baissent seulement au jet de dégâts
    expect(dmg.after.find((c) => c.id === "foe")!.hp).toBe(42);
    expect(atk.logLen).toBeLessThan(dmg.logLen);
  });
  it("un raté ne produit qu'un jet d'attaque ; un critique lance les dés doublés", () => {
    const s = fresh(hero(), foe({ ac: 15, maxHp: 50 }));
    const n = s.rolls.length;
    resolveAttack(s, getCombatant(s, "hero"), getCombatant(s, "foe"), sword, seq(0.2));
    expect(s.rolls.slice(n)).toHaveLength(1);
    expect(s.rolls[n]).toMatchObject({ outcome: "miss" });
    resolveAttack(s, getCombatant(s, "hero"), getCombatant(s, "foe"), sword, seq(D20.twenty, 0.5, 0.5));
    const dmg = s.rolls[s.rolls.length - 1];
    expect(dmg.dice).toHaveLength(2);
    expect(dmg.outcome).toBe("crit");
  });
  it("enregistre le round de chaque jet", () => {
    const s = fresh(hero({ ac: 1 }), foe({ ac: 30, maxHp: 50 }));
    playerAttack(s, "foe", seq(D20.one, 0, D20.one));
    expect(s.rolls.filter((r) => r.kind === "attack").map((r) => r.round)).toEqual([1, 1]);
    expect(s.round).toBe(2);
  });
  it("avec avantage, les deux d20 sont enregistrés et le dé retenu est indiqué", () => {
    const s = fresh(hero(), foe({ ac: 40, maxHp: 50 }));
    getCombatant(s, "foe").dodging = true; // désavantage : on garde le plus petit
    resolveAttack(s, getCombatant(s, "hero"), getCombatant(s, "foe"), sword, seq(0.9, 0.2));
    const atk = s.rolls[s.rolls.length - 1];
    expect(atk.dice).toEqual([19, 5]);
    expect(atk.keptIndex).toBe(1);
  });
  it("enregistre les jets de mort", () => {
    const s = startCombat([hero({ initiativeBonus: 20 })], [foe({ initiativeBonus: -20, attacks: [] })], seq(0.5, 0.5));
    getCombatant(s, "hero").hp = 0;
    const n = s.rolls.length;
    processTurns(s, seq(D20.twenty));
    expect(s.rolls[n]).toMatchObject({ kind: "deathSave", dice: [20], outcome: "crit" });
  });
});

describe("personnage → combattant", () => {
  const base: CharacterDraft = {
    name: "T", speciesId: "human", classId: "wizard", backgroundId: "sage", method: "standard",
    baseScores: { STR: 8, DEX: 13, CON: 14, INT: 15, WIS: 12, CHA: 10 },
    bonus: { mode: "2/1", plus2: "INT", plus1: "CON" }, classSkills: ["investigation", "medicine"],
  };
  it("le magicien combat d'abord avec son trait de feu, sans modificateur aux dégâts", () => {
    const c = buildCharacter(base, "w");
    expect(c.attacks[0]).toMatchObject({ name: "Trait de feu", toHit: 3 + 2, damage: { sides: 10, bonus: 0 }, ranged: true });
    expect(characterToCombatant(c)).toMatchObject({ maxHp: 8, ac: 11, initiativeBonus: 1 });
    expect(characterToCombatant(c).attacks.length).toBe(c.attacks.length);
  });
  it("le guerrier en cotte de mailles a la CA de l'armure et plusieurs attaques", () => {
    const c = buildCharacter(
      { ...base, classId: "fighter", backgroundId: "soldier", baseScores: { STR: 10, DEX: 15, CON: 14, INT: 8, WIS: 12, CHA: 13 },
        bonus: { mode: "2/1", plus2: "STR", plus1: "CON" }, classSkills: ["perception", "survival"] }, "f");
    expect(c.armorClass).toBe(16);
    expect(characterToCombatant(c).ac).toBe(16);
    expect(c.attacks.length).toBeGreaterThan(2);
  });
  it("les données de monstres et de rencontres sont cohérentes", () => {
    for (const e of ENCOUNTERS) expect(buildEnemies(e).length).toBeGreaterThan(0);
    for (const m of MONSTERS) expect(makeCombatant({ ...m, side: "enemies" }).hp).toBe(m.maxHp);
  });
});
