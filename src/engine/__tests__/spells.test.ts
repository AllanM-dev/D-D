import { defaultClassChoices } from "../../data/class-choices";
import { describe, expect, it } from "vitest";
import { CLASSES } from "../../data/classes";
import { CLASS_SPELLCASTING, SPELLS, SPELL_BY_ID, defaultSpells, isPlayable, spellsFor } from "../../data/spells";
import { buildCharacter, validateDraft, type CharacterDraft } from "../character";
import {
  getCombatant, playerAttack, playerEndTurn, playerOptions, resolveAttack, startCombat, applyDamage,
  type AttackDef, type CombatState, type CombatantInit,
} from "../combat";
import type { Rng } from "../dice";
import { castSpell, castingFor, spellOptionsFor } from "../spellcasting";

const seq = (...v: number[]): Rng => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const D20 = { one: 0, mid: 0.5, twenty: 0.99 };

const MODS = { STR: 0, DEX: 2, CON: 2, INT: 3, WIS: 3, CHA: 3 };
const sword: AttackDef = { name: "Épée", toHit: 5, damage: { count: 1, sides: 8, bonus: 3 }, damageType: "tranchant", ranged: false, ability: "STR" };

function caster(classId: string, cantrips: string[], prepared: string[], over: Partial<CombatantInit> = {}, unarmored = true): CombatantInit {
  return {
    id: "hero", name: "Mage", side: "party", maxHp: 12, ac: 12, initiativeBonus: 5, attacks: [sword], ...over,
    spellcasting: castingFor({
      classId, modifiers: MODS, proficiencyBonus: 2, conSaveBonus: 2, unarmored,
      spells: { cantrips, prepared },
    }),
  };
}
const foe = (over: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "foe", name: "Gobelin", side: "enemies", maxHp: 50, ac: 10, initiativeBonus: 0, attacks: [], saveMods: { DEX: 2, WIS: -1, CON: 0 }, ...over,
});
const fresh = (h: CombatantInit, f = foe()): CombatState => startCombat([h], [f], seq(D20.twenty, D20.one));
const me = (s: CombatState) => getCombatant(s, "hero");
const them = (s: CombatState) => getCombatant(s, "foe");

describe("données des sorts", () => {
  it("identifiants uniques, classes existantes, niveaux 0 ou 1", () => {
    expect(new Set(SPELLS.map((s) => s.id)).size).toBe(SPELLS.length);
    const classIds = new Set(CLASSES.map((c) => c.id));
    for (const s of SPELLS) {
      expect([0, 1]).toContain(s.level);
      expect(s.classes.length, s.id).toBeGreaterThan(0);
      for (const c of s.classes) expect(classIds.has(c), `${s.id} → ${c}`).toBe(true);
      expect(s.description.length, s.id).toBeGreaterThan(20);
      expect(SPELL_BY_ID[s.id]).toBe(s);
    }
  });
  it("chaque classe qui lance des sorts a assez de choix pour remplir ses sorts mineurs et préparés", () => {
    for (const [classId, cfg] of Object.entries(CLASS_SPELLCASTING)) {
      expect(spellsFor(classId, 0).length, `${classId} mineurs`).toBeGreaterThanOrEqual(cfg.cantrips);
      expect(spellsFor(classId, 1).length, `${classId} niveau 1`).toBeGreaterThanOrEqual(cfg.prepared);
      expect(classIds().has(classId)).toBe(true);
    }
  });
  it("les sorts jouables sont sur les listes de leurs classes, et chaque classe a au moins un sort jouable", () => {
    for (const classId of Object.keys(CLASS_SPELLCASTING)) {
      const all = [...spellsFor(classId, 0), ...spellsFor(classId, 1), ...(CLASS_SPELLCASTING[classId].alwaysPrepared ?? []).map((id) => SPELL_BY_ID[id])];
      expect(all.some(isPlayable), classId).toBe(true);
    }
  });
  it("les choix par défaut sont valides pour chaque classe", () => {
    for (const c of CLASSES) {
      const draft: CharacterDraft = {
        name: "T", speciesId: "human", classId: c.id, backgroundId: "soldier", method: "standard",
        baseScores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
        classSkills: c.skillChoices.from.filter((s) => s !== "athletics" && s !== "intimidation").slice(0, c.skillChoices.count),
        fightingStyle: "defense", spells: defaultSpells(c.id), ...defaultClassChoices(c.id, ["athletics", "intimidation"]),
      };
      expect(validateDraft(draft), c.id).toEqual([]);
      const built = buildCharacter(draft, "x");
      expect(!!built.spells, c.id).toBe(!!CLASS_SPELLCASTING[c.id]);
    }
  });
  it("refuse des sorts en trop, en double ou hors liste de classe", () => {
    const base: CharacterDraft = {
      name: "T", speciesId: "human", classId: "wizard", backgroundId: "sage", method: "standard",
      baseScores: { STR: 8, DEX: 13, CON: 14, INT: 15, WIS: 12, CHA: 10 }, bonus: { mode: "2/1", plus2: "INT", plus1: "CON" },
      classSkills: ["investigation", "medicine"], spells: defaultSpells("wizard"),
    };
    expect(validateDraft(base)).toEqual([]);
    expect(validateDraft({ ...base, spells: undefined })).not.toEqual([]);
    expect(validateDraft({ ...base, spells: { ...base.spells!, cantrips: ["fire-bolt", "fire-bolt", "light"] } })).not.toEqual([]);
    expect(validateDraft({ ...base, spells: { ...base.spells!, cantrips: ["fire-bolt", "light", "sacred-flame"] } })).not.toEqual([]); // sort de clerc
    expect(validateDraft({ ...base, spells: { ...base.spells!, prepared: ["magic-missile"] } })).not.toEqual([]);
  });
});
function classIds() { return new Set(CLASSES.map((c) => c.id)); }

describe("capacité d'incantation", () => {
  const input = (classId: string) => ({ classId, modifiers: MODS, proficiencyBonus: 2, conSaveBonus: 2, unarmored: true, spells: { cantrips: [], prepared: [] } });
  it("calcule le DD, le bonus d'attaque et les emplacements", () => {
    expect(castingFor(input("wizard"))).toMatchObject({ ability: "INT", attackBonus: 5, saveDc: 13, slots: { max: 2, used: 0 } });
    expect(castingFor(input("cleric"))).toMatchObject({ ability: "WIS", saveDc: 13 });
    expect(castingFor(input("warlock"))!.slots.max).toBe(1);
    expect(castingFor(input("paladin"))).toMatchObject({ ability: "CHA", slots: { max: 2 } });
    expect(castingFor(input("fighter"))).toBeUndefined();
  });
  it("le rôdeur a Marque du chasseur toujours préparée et deux lancers gratuits", () => {
    const r = castingFor(input("ranger"))!;
    expect(r.prepared).toContain("hunters-mark");
    expect(r.free).toEqual([{ spellId: "hunters-mark", uses: 2, max: 2 }]);
  });
});

describe("sorts d'attaque", () => {
  it("un sort mineur lance un jet d'attaque de sort puis des dégâts, sans emplacement", () => {
    const s = fresh(caster("wizard", ["fire-bolt"], []));
    castSpell(s, "fire-bolt", seq(0.5, 0.5), { targetId: "foe" }); // d20 = 11 + 5 = 16 ≥ 10 ; d10 = 6
    expect(them(s).hp).toBe(44);
    expect(me(s).spellcasting!.slots.used).toBe(0);
    const kinds = s.rolls.filter((r) => r.actorId === "hero" && r.kind !== "initiative").map((r) => r.kind);
    expect(kinds).toEqual(["attack", "damage"]);
    expect(s.rolls.filter((r) => r.kind === "attack").pop()).toMatchObject({ modifier: 5, dc: 10, outcome: "hit" });
    expect(s.round).toBe(2); // action utilisée, aucune action bonus : fin de tour automatique
  });
  it("un raté n'inflige rien", () => {
    const s = fresh(caster("wizard", ["fire-bolt"], []));
    castSpell(s, "fire-bolt", seq(0.1), { targetId: "foe" });
    expect(them(s).hp).toBe(50);
  });
  it("un 20 naturel double les dés de dégâts", () => {
    const s = fresh(caster("wizard", ["fire-bolt"], []));
    castSpell(s, "fire-bolt", seq(D20.twenty, 0.5, 0.5), { targetId: "foe" });
    expect(s.rolls.filter((r) => r.kind === "damage").pop()!.dice).toHaveLength(2);
    expect(them(s).hp).toBe(50 - 12);
  });
  it("la Magie innée donne l'avantage à un sort d'attaque", () => {
    const init = caster("sorcerer", ["fire-bolt"], []);
    const s = fresh(init);
    me(s).innateSorcery = true;
    castSpell(s, "fire-bolt", seq(0.1, 0.9, 0.5), { targetId: "foe" });
    expect(s.rolls.filter((r) => r.kind === "attack").pop()!.dice).toHaveLength(2);
  });
  it("Éclair guidé : 4d6, et la prochaine attaque contre la cible a l'avantage (une seule fois)", () => {
    const s = fresh(caster("cleric", [], ["guiding-bolt"]));
    castSpell(s, "guiding-bolt", seq(0.5, 0.5, 0.5, 0.5, 0.5), { targetId: "foe" });
    expect(them(s).hp).toBe(50 - 4 * 4); // 4d6 : chaque d6 = 4
    expect(them(s).guided).toBe(true);
    expect(me(s).spellcasting!.slots.used).toBe(1);
    resolveAttack(s, me(s), them(s), sword, seq(0.1, 0.9, 0.5));
    expect(s.rolls.filter((r) => r.kind === "attack").pop()!.dice).toHaveLength(2);
    expect(them(s).guided).toBe(false);
  });
  it("Éclair guidé manqué ne guide pas la cible", () => {
    const s = fresh(caster("cleric", [], ["guiding-bolt"]));
    castSpell(s, "guiding-bolt", seq(0.1), { targetId: "foe" });
    expect(them(s).guided).toBe(false);
  });
  it("Projectile magique touche toujours : trois d4 + 3", () => {
    const s = fresh(caster("wizard", [], ["magic-missile"]), foe({ ac: 40 }));
    castSpell(s, "magic-missile", seq(0, 0.5, 0.99), { targetId: "foe" }); // 1, 3, 4
    expect(them(s).hp).toBe(50 - (1 + 3 + 4 + 3));
    const dmg = s.rolls.filter((r) => r.kind === "damage").pop()!;
    expect(dmg).toMatchObject({ dice: [1, 3, 4], modifier: 3, total: 11, sides: 4 });
    expect(s.rolls.some((r) => r.kind === "attack" && r.actorId === "hero")).toBe(false);
  });
});

describe("sorts à jet de sauvegarde", () => {
  it("Flamme sacrée : dégâts si la sauvegarde échoue, rien si elle réussit", () => {
    const s = fresh(caster("cleric", ["sacred-flame"], []));
    castSpell(s, "sacred-flame", seq(0, 0.5), { targetId: "foe" }); // d20 = 1 + 2 = 3 < DD 13 ; d8 = 5
    expect(them(s).hp).toBe(45);
    const save = s.rolls.find((r) => r.kind === "save")!;
    expect(save).toMatchObject({ side: "enemies", dc: 13, modifier: 2, outcome: "failure" });
    const ok = fresh(caster("cleric", ["sacred-flame"], []));
    castSpell(ok, "sacred-flame", seq(0.99), { targetId: "foe" }); // 20 + 2 = 22
    expect(them(ok).hp).toBe(50);
    expect(ok.rolls.some((r) => r.kind === "damage" && r.actorId === "hero")).toBe(false);
  });
  it("Mains brûlantes : 3d6, moitié si la sauvegarde réussit", () => {
    const fail = fresh(caster("wizard", [], ["burning-hands"]));
    castSpell(fail, "burning-hands", seq(0, 0.5, 0.5, 0.5), { targetId: "foe" });
    expect(them(fail).hp).toBe(50 - 12);
    const half = fresh(caster("wizard", [], ["burning-hands"]));
    castSpell(half, "burning-hands", seq(0.99, 0.5, 0.5, 0.5), { targetId: "foe" });
    expect(them(half).hp).toBe(50 - 6);
    expect(half.rolls.filter((r) => r.kind === "damage").pop()).toMatchObject({ rolled: 12, total: 6, note: "moitié : jet de sauvegarde réussi" });
  });
  it("Glas : d12 si la cible a déjà perdu des PV, sinon d8", () => {
    const full = fresh(caster("cleric", ["toll-the-dead"], []));
    castSpell(full, "toll-the-dead", seq(0, 0.99), { targetId: "foe" });
    expect(full.rolls.filter((r) => r.kind === "damage").pop()!.sides).toBe(8);
    const hurt = fresh(caster("cleric", ["toll-the-dead"], []), foe({ maxHp: 50 }));
    them(hurt).hp = 40;
    castSpell(hurt, "toll-the-dead", seq(0, 0.99), { targetId: "foe" });
    expect(hurt.rolls.filter((r) => r.kind === "damage").pop()!.sides).toBe(12);
  });
  it("Moquerie cruelle : désavantage à la prochaine attaque de la cible, une seule fois", () => {
    const s = fresh(caster("bard", ["vicious-mockery"], []), foe({ attacks: [sword] }));
    castSpell(s, "vicious-mockery", seq(0, 0.5, 0.5, 0.5, 0.5), { targetId: "foe" });
    expect(s.log.some((l) => l.includes("ridicule"))).toBe(true);
    // l'ennemi a déjà joué après le sort (fin de tour auto) : son attaque a eu deux d20
    const foeAttack = s.rolls.filter((r) => r.kind === "attack" && r.actorId === "foe")[0];
    expect(foeAttack.dice).toHaveLength(2);
    expect(them(s).mocked).toBe(false);
  });
  it("la sauvegarde d'un monstre utilise son modificateur", () => {
    const s = fresh(caster("cleric", ["toll-the-dead"], []), foe({ saveMods: { WIS: -1 } }));
    castSpell(s, "toll-the-dead", seq(0.6, 0.5), { targetId: "foe" }); // d20 = 13 − 1 = 12 < 13 : échec
    expect(s.rolls.find((r) => r.kind === "save")).toMatchObject({ total: 12, outcome: "failure" });
  });
});

describe("soins et protections", () => {
  it("Soin des blessures : 2d8 + modificateur, plafonné aux PV max, un emplacement", () => {
    const s = fresh(caster("cleric", [], ["cure-wounds"]));
    me(s).hp = 4;
    castSpell(s, "cure-wounds", seq(0.99, 0.99));
    expect(me(s).hp).toBe(12);
    expect(me(s).spellcasting!.slots.used).toBe(1);
    expect(s.rolls.filter((r) => r.kind === "heal").pop()).toMatchObject({ dice: [8, 8], modifier: 3, sides: 8, total: 19 });
  });
  it("les soins ne sont pas proposés à pleins PV", () => {
    const s = fresh(caster("cleric", [], ["cure-wounds"]));
    const opt = spellOptionsFor(s, me(s)).find((o) => o.id === "cure-wounds")!;
    expect(opt).toMatchObject({ available: false });
    expect(opt.reason).toMatch(/maximum/);
    expect(() => castSpell(s, "cure-wounds")).toThrow();
  });
  it("Mot de guérison est une action bonus : le tour reste ouvert", () => {
    const s = fresh(caster("cleric", ["sacred-flame"], ["healing-word"]));
    me(s).hp = 4;
    castSpell(s, "healing-word", seq(0, 0));
    expect(me(s).hp).toBe(4 + 1 + 1 + 3);
    expect(playerOptions(s)).toMatchObject({ canAct: true, canEnd: true });
    castSpell(s, "sacred-flame", seq(0.99), { targetId: "foe" }); // sort mineur d'action : autorisé
    expect(s.round).toBe(2);
  });
  it("Armure du mage : CA 13 + Dextérité, seulement sans armure", () => {
    const s = fresh(caster("wizard", [], ["mage-armor"], { ac: 12 }));
    castSpell(s, "mage-armor", seq(0, D20.one));
    expect(me(s).ac).toBe(13 + 5); // bonus d'initiative du test = Dextérité simulée
    const armored = fresh(caster("wizard", [], ["mage-armor"], { ac: 12 }, false));
    expect(spellOptionsFor(armored, me(armored))[0]).toMatchObject({ available: false });
  });
  it("Bouclier de la foi : +2 CA tant que la concentration dure", () => {
    const s = fresh(caster("cleric", [], ["shield-of-faith"], { ac: 14 }));
    castSpell(s, "shield-of-faith");
    expect(me(s).ac).toBe(16);
    expect(me(s).concentrating?.spellId).toBe("shield-of-faith");
    expect(spellOptionsFor(s, me(s)).find((o) => o.id === "shield-of-faith")).toMatchObject({ available: false });
  });
});

describe("concentration", () => {
  const withShield = () => {
    const s = fresh(caster("cleric", [], ["shield-of-faith"], { ac: 14 }), foe({ attacks: [sword] }));
    castSpell(s, "shield-of-faith", seq(D20.one)); // l'ennemi, ensuite, jouera avec le hasard suivant
    return s;
  };
  it("un jet de sauvegarde de Constitution est demandé quand on est blessé (DD 10 minimum)", () => {
    const s = fresh(caster("cleric", [], ["shield-of-faith"], { ac: 14 }));
    castSpell(s, "shield-of-faith");
    expect(me(s).ac).toBe(16);
    // l'ennemi touche pour 8 dégâts : DD = max(10, 4) = 10 ; d20 = 1 + 2 = 3 → concentration perdue
    resolveAttack(s, getCombatant(s, "foe"), me(s), sword, seq(0.9, 0.5, 0));
    const save = s.rolls.filter((r) => r.kind === "save").pop()!;
    expect(save).toMatchObject({ side: "party", dc: 10, modifier: 2, outcome: "failure", note: "Concentration perdue" });
    expect(me(s).concentrating).toBeUndefined();
    expect(me(s).ac).toBe(14); // le bonus de CA disparaît
  });
  it("une sauvegarde réussie garde la concentration", () => {
    const s = fresh(caster("cleric", [], ["shield-of-faith"], { ac: 14, maxHp: 60 }));
    castSpell(s, "shield-of-faith");
    resolveAttack(s, getCombatant(s, "foe"), me(s), sword, seq(0.99, 0.5, 0.99));
    expect(s.rolls.filter((r) => r.kind === "save").pop()).toMatchObject({ outcome: "success", note: "Concentration maintenue" });
    expect(me(s).concentrating?.spellId).toBe("shield-of-faith");
  });
  it("le DD monte avec les dégâts : la moitié des dégâts quand elle dépasse 10", () => {
    const s = fresh(caster("cleric", [], ["shield-of-faith"], { ac: 14, maxHp: 60 }));
    castSpell(s, "shield-of-faith");
    const big: AttackDef = { ...sword, damage: { count: 1, sides: 4, bonus: 30 } }; // 31 à 34 dégâts
    resolveAttack(s, getCombatant(s, "foe"), me(s), big, seq(0.9, 0));
    expect(s.rolls.filter((r) => r.kind === "save").pop()!.dc).toBe(15);
  });
  it("tomber à 0 PV met fin à la concentration sans jet", () => {
    const s = withShield();
    applyDamage(s, me(s), 12, false);
    expect(me(s).concentrating).toBeUndefined();
    expect(me(s).ac).toBe(14);
  });
  it("lancer un autre sort de concentration met fin au précédent", () => {
    const s = fresh(caster("warlock", [], ["hex"], { ac: 14 }));
    me(s).spellcasting!.slots.max = 3; // le pacte n'a qu'un emplacement : on en ajoute pour ce test
    me(s).spellcasting!.prepared.push("shield-of-faith");
    castSpell(s, "hex", seq(0), { targetId: "foe" });
    expect(me(s).mark?.targetId).toBe("foe");
    me(s).turnState = { action: false, bonus: false, attacked: false, spells: [] }; // tour suivant
    castSpell(s, "shield-of-faith", seq(0));
    expect(me(s).mark).toBeUndefined();
    expect(me(s).concentrating?.spellId).toBe("shield-of-faith");
    expect(me(s).ac).toBe(16);
    expect(s.log.some((l) => l.includes("Maléfice prend fin"))).toBe(true);
  });
});

describe("Maléfice et Marque du chasseur", () => {
  it("Maléfice : +1d6 nécrotique à chaque attaque qui touche la cible, armes et sorts", () => {
    const s = fresh(caster("warlock", ["eldritch-blast"], ["hex"]));
    castSpell(s, "hex", seq(0), { targetId: "foe" });
    expect(me(s).concentrating?.spellId).toBe("hex");
    expect(s.round).toBe(1); // action bonus : le tour reste ouvert
    const before = them(s).hp;
    resolveAttack(s, me(s), them(s), sword, seq(0.5, 0.5, 0.5)); // touche ; d8 = 5 → 8 ; d6 = 4
    expect(before - them(s).hp).toBe(8 + 4);
    const extra = s.rolls.filter((r) => r.kind === "damage").pop()!;
    expect(extra).toMatchObject({ sides: 6, dice: [4], total: 4 });
    expect(extra.title).toMatch(/Maléfice/);
    const spellAtk: AttackDef = { name: "Décharge occulte", toHit: 5, damage: { count: 1, sides: 10, bonus: 0 }, damageType: "force", ranged: true, spell: true };
    resolveAttack(s, me(s), them(s), spellAtk, seq(0.5, 0.5, 0.5));
    expect(s.rolls.filter((r) => r.kind === "damage" && r.actorId === "hero").slice(-1)[0].title).toMatch(/Maléfice/);
  });
  it("Marque du chasseur : seulement les attaques d'arme, et seulement la cible marquée", () => {
    const s = fresh(caster("ranger", [], ["cure-wounds"]), foe());
    s.combatants.push({ ...them(s), id: "foe2", name: "Gobelin 2" });
    castSpell(s, "hunters-mark", seq(0), { targetId: "foe" });
    expect(me(s).spellcasting!.free[0].uses).toBe(1); // lancer gratuit
    expect(me(s).spellcasting!.slots.used).toBe(0);
    const spellAtk: AttackDef = { name: "Sort", toHit: 5, damage: { count: 1, sides: 10, bonus: 0 }, damageType: "feu", ranged: true, spell: true };
    resolveAttack(s, me(s), them(s), spellAtk, seq(0.5, 0.5, 0.5));
    expect(s.rolls.filter((r) => r.kind === "damage" && r.title.includes("Marque")).length).toBe(0);
    resolveAttack(s, me(s), them(s), sword, seq(0.5, 0.5, 0.5));
    expect(s.rolls.filter((r) => r.kind === "damage" && r.title.includes("Marque")).length).toBe(1);
    resolveAttack(s, me(s), getCombatant(s, "foe2"), sword, seq(0.5, 0.5, 0.5));
    expect(s.rolls.filter((r) => r.kind === "damage" && r.title.includes("Marque")).length).toBe(1); // pas la cible marquée
  });
  it("un coup critique double les dés supplémentaires", () => {
    const s = fresh(caster("warlock", [], ["hex"]));
    castSpell(s, "hex", seq(0), { targetId: "foe" });
    resolveAttack(s, me(s), them(s), sword, seq(D20.twenty, 0.5, 0.5, 0.5, 0.5, 0.5));
    expect(s.rolls.filter((r) => r.kind === "damage").pop()!.dice).toHaveLength(2);
  });
  it("la marque disparaît avec la concentration", () => {
    const s = fresh(caster("warlock", [], ["hex"]));
    castSpell(s, "hex", seq(0), { targetId: "foe" });
    applyDamage(s, me(s), 12, false);
    expect(me(s).mark).toBeUndefined();
  });
  it("le rôdeur a trois lancers de Marque du chasseur : deux gratuits puis un emplacement", () => {
    const s = fresh(caster("ranger", [], []));
    const sc = me(s).spellcasting!;
    for (let i = 0; i < 3; i++) {
      me(s).turnState = { action: false, bonus: false, attacked: false, spells: [] };
      castSpell(s, "hunters-mark", seq(0), { targetId: "foe" });
    }
    expect(sc.free[0].uses).toBe(0);
    expect(sc.slots.used).toBe(1);
  });
});

describe("règles de lancement", () => {
  it("un sort de niveau 1 consomme un emplacement ; l'occultiste (magie de pacte) n'en a qu'un", () => {
    const s = fresh(caster("warlock", ["eldritch-blast"], ["hex"]));
    castSpell(s, "hex", seq(0), { targetId: "foe" });
    expect(me(s).spellcasting!.slots).toEqual({ max: 1, used: 1 });
    expect(spellOptionsFor(s, me(s)).find((o) => o.id === "hex")).toMatchObject({ available: false });
  });
  it("sans emplacement, un sort de niveau 1 est refusé mais les sorts mineurs restent possibles", () => {
    const s = fresh(caster("wizard", ["fire-bolt"], ["magic-missile"]));
    me(s).spellcasting!.slots.used = me(s).spellcasting!.slots.max;
    const opts = spellOptionsFor(s, me(s));
    expect(opts.find((o) => o.id === "magic-missile")).toMatchObject({ available: false, reason: "Plus d'emplacement de sort" });
    expect(opts.find((o) => o.id === "fire-bolt")!.available).toBe(true);
    expect(() => castSpell(s, "magic-missile", seq(0), { targetId: "foe" })).toThrow();
  });
  it("après un sort à action bonus, seul un sort mineur d'action est permis", () => {
    const s = fresh(caster("warlock", ["eldritch-blast"], ["hex"]));
    s.combatants[0].spellcasting!.prepared.push("magic-missile");
    s.combatants[0].spellcasting!.slots.max = 3; // le pacte n'a qu'un emplacement : on en ajoute pour isoler la règle testée
    castSpell(s, "hex", seq(0), { targetId: "foe" });
    const opts = spellOptionsFor(s, me(s));
    expect(opts.find((o) => o.id === "magic-missile")).toMatchObject({ available: false });
    expect(opts.find((o) => o.id === "magic-missile")!.reason).toMatch(/action bonus/);
    expect(opts.find((o) => o.id === "eldritch-blast")!.available).toBe(true);
  });
  it("un sort de niveau 1 d'action empêche ensuite un sort à action bonus (et le tour se termine donc seul)", () => {
    const s = fresh(caster("wizard", ["fire-bolt"], ["magic-missile"]));
    s.combatants[0].spellcasting!.prepared.push("shield-of-faith");
    // Avant : le sort à action bonus est possible.
    expect(spellOptionsFor(s, me(s)).find((o) => o.id === "shield-of-faith")!.available).toBe(true);
    castSpell(s, "magic-missile", seq(0.5, 0.5, 0.5), { targetId: "foe" });
    expect(s.round).toBe(2); // plus aucune action bonus permise : fin de tour automatique
    // La restriction elle-même, vérifiée sur un tour où le sort de niveau 1 vient d'être lancé :
    me(s).turnState = { action: true, bonus: false, attacked: false, spells: [{ level: 1, time: "action" }] };
    expect(spellOptionsFor(s, me(s)).find((o) => o.id === "shield-of-faith")).toMatchObject({ available: false });
  });
  it("un sort mineur d'action n'empêche pas un sort à action bonus", () => {
    const s = fresh(caster("cleric", ["sacred-flame"], ["shield-of-faith"]));
    castSpell(s, "sacred-flame", seq(0.99), { targetId: "foe" });
    expect(currentId(s)).toBe("hero");
    expect(spellOptionsFor(s, me(s)).find((o) => o.id === "shield-of-faith")!.available).toBe(true);
    castSpell(s, "shield-of-faith", seq(D20.one));
    expect(s.round).toBe(2);
  });
  it("les sorts à réaction et sans effet ne sont pas proposés", () => {
    const s = fresh(caster("wizard", ["light"], ["shield", "magic-missile"]));
    const ids = spellOptionsFor(s, me(s)).map((o) => o.id);
    expect(ids).toEqual(["magic-missile"]);
  });
  it("refuse une cible invalide, un sort non préparé ou une action déjà utilisée", () => {
    const s = fresh(caster("wizard", ["fire-bolt"], []));
    expect(() => castSpell(s, "fire-bolt", seq(0.5), { targetId: "hero" })).toThrow();
    expect(() => castSpell(s, "fire-bolt", seq(0.5), {})).toThrow();
    expect(() => castSpell(s, "magic-missile", seq(0.5), { targetId: "foe" })).toThrow();
    const used = fresh(caster("wizard", ["fire-bolt"], [], { attacks: [sword] }));
    me(used).turnState.action = true;
    expect(() => castSpell(used, "fire-bolt", seq(0.5), { targetId: "foe" })).toThrow();
  });
  it("lancer un sort empêche d'attaquer ensuite (une seule action), mais pas l'inverse pour un sort à action bonus", () => {
    const s = fresh(caster("warlock", ["eldritch-blast"], ["hex"]));
    playerAttack(s, "foe", seq(D20.one)); // action : attaque ratée
    expect(spellOptionsFor(s, me(s)).find((o) => o.id === "eldritch-blast")).toMatchObject({ available: false, reason: "Action déjà utilisée" });
    expect(spellOptionsFor(s, me(s)).find((o) => o.id === "hex")!.available).toBe(true);
    playerEndTurn(s);
    expect(s.round).toBe(2);
  });
});
function currentId(s: CombatState) { return s.order[s.turn]; }

describe("Magie innée et sorts à sauvegarde", () => {
  it("ajoute 1 au DD des sauvegardes contre les sorts", () => {
    const s = fresh(caster("sorcerer", [], ["burning-hands"]));
    me(s).innateSorcery = true;
    castSpell(s, "burning-hands", seq(0.6, 0.5, 0.5, 0.5), { targetId: "foe" }); // d20 = 13 + 2 = 15
    expect(s.rolls.find((r) => r.kind === "save")).toMatchObject({ dc: 14, total: 15, outcome: "success" });
    const plain = fresh(caster("sorcerer", [], ["burning-hands"]));
    castSpell(plain, "burning-hands", seq(0.3, 0.5, 0.5, 0.5), { targetId: "foe" }); // d20 = 7 + 2 = 9
    expect(plain.rolls.find((r) => r.kind === "save")!.dc).toBe(13);
  });
});
