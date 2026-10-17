import { defaultClassChoices } from "../../data/class-choices";
import { describe, expect, it } from "vitest";
import { CLASSES } from "../../data/classes";
import { MASTERY_COUNT, WEAPON_MASTERY, WEAPONS, type Mastery } from "../../data/equipment";
import { MONSTER_TRAIT_TEXT } from "../../data/help";
import { ENCOUNTERS, buildEnemies } from "../../data/encounters";
import { MONSTERS } from "../../data/monsters";
import type { Arena } from "../battlefield";
import { characterToCombatant } from "../attacks";
import { buildCharacter, type Character, type CharacterDraft } from "../character";
import {
  applyCondition, getCombatant, hasCondition, movementLeft, playerAttack, playerBreakFree, playerEndTurn, playerOptions, resolveAttack,
  rollSave, startCombat, useFeature, type AttackDef, type CombatState, type CombatantInit,
} from "../combat";
import { defaultMasteries, masterableWeapons } from "../equipment";
import { featuresFor } from "../features";
import { migrateMasteries, setMasteries } from "../loadout";
import type { Rng } from "../dice";
import { defaultSpells } from "../../data/spells";

const seq = (...v: number[]): Rng => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const roll = (n: number) => (n - 0.5) / 20;
const FIELD: Arena = { rows: ["...............", "...............", "...............", "...............", "..............."] };
const WALL_END: Arena = { rows: ["....#", "....#", "....#"] };

const attack = (over: Partial<AttackDef> = {}): AttackDef => ({
  name: "Épée", toHit: 5, damage: { count: 1, sides: 8, bonus: 3 }, damageType: "tranchant", ranged: false, ability: "STR", ...over,
});
const hero = (x: number, y: number, over: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "hero", name: "Héros", side: "party", maxHp: 30, ac: 10, initiativeBonus: 5, attacks: [attack()], speed: 9, pos: { x, y },
  saveMods: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }, ...over,
});
const foe = (x: number, y: number, over: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "foe", name: "Cible", side: "enemies", maxHp: 60, ac: 10, initiativeBonus: -5, attacks: [attack({ name: "Coup" })], speed: 9, pos: { x, y },
  saveMods: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }, ...over,
});
const begin = (h: CombatantInit, f: CombatantInit[], arena: Arena | undefined = FIELD): CombatState =>
  startCombat([h], f, seq(0.99, ...f.map(() => 0)), arena);
const me = (s: CombatState) => getCombatant(s, "hero");
const them = (s: CombatState, id = "foe") => getCombatant(s, id);
const lastDamage = (s: CombatState) => s.rolls.filter((r) => r.kind === "damage").at(-1)!;

function make(classId: string, kitId?: string): Character {
  const c = CLASSES.find((x) => x.id === classId)!;
  return buildCharacter({
    name: "T", speciesId: "human", classId, backgroundId: "soldier", method: "standard",
    baseScores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
    classSkills: c.skillChoices.from.filter((s) => s !== "athletics" && s !== "intimidation").slice(0, c.skillChoices.count),
    fightingStyle: "defense", kitId, spells: defaultSpells(classId), ...defaultClassChoices(classId, ["athletics", "intimidation"]),
  } as CharacterDraft, "hero");
}

describe("Attaque sournoise", () => {
  const rogue = (over: Partial<CombatantInit> = {}) => hero(1, 2, { sneakDice: 1, attacks: [attack({ name: "Rapière", ability: "DEX", sneak: true })], ...over });
  it("avec l'avantage et une arme éligible : 1d6 en plus, une fois par tour", () => {
    const s = begin(rogue(), [foe(2, 2)]);
    applyCondition(s, them(s), { id: "restrained", source: "t" }); // avantage contre une cible entravée
    playerAttack(s, "foe", seq(roll(15), roll(15), 0.5, 0.5), 0);
    const sneak = s.rolls.filter((r) => r.title.includes("Attaque sournoise"));
    expect(sneak).toHaveLength(1);
    expect(sneak[0].dice).toHaveLength(1);
    expect(me(s).turnState.sneakUsed).toBe(true);
    // deuxième attaque du même tour (bonus d'action simulé) : pas de nouveau 1d6
    resolveAttack(s, me(s), them(s), me(s).attacks[0], seq(roll(15), roll(15), 0.5, 0.5));
    expect(s.rolls.filter((r) => r.title.includes("Attaque sournoise"))).toHaveLength(1);
  });
  it("pas sans avantage, pas avec une arme non éligible, pas avec désavantage", () => {
    const plain = begin(rogue(), [foe(2, 2)]);
    resolveAttack(plain, me(plain), them(plain), me(plain).attacks[0], seq(roll(15), 0.5));
    expect(plain.rolls.some((r) => r.title.includes("sournoise"))).toBe(false);
    const heavy = begin(hero(1, 2, { sneakDice: 1, attacks: [attack({ sneak: undefined })] }), [foe(2, 2)]);
    applyCondition(heavy, them(heavy), { id: "restrained", source: "t" });
    resolveAttack(heavy, me(heavy), them(heavy), me(heavy).attacks[0], seq(roll(15), roll(15), 0.5));
    expect(heavy.rolls.some((r) => r.title.includes("sournoise"))).toBe(false);
    const dis = begin(rogue(), [foe(2, 2)]);
    applyCondition(dis, them(dis), { id: "restrained", source: "t" });
    applyCondition(dis, me(dis), { id: "poisoned", source: "t" }); // avantage + désavantage s'annulent
    resolveAttack(dis, me(dis), them(dis), me(dis).attacks[0], seq(roll(15), 0.5));
    expect(dis.rolls.some((r) => r.title.includes("sournoise"))).toBe(false);
  });
  it("le coup critique double le dé ; l'attaque ratée n'en ajoute pas", () => {
    const crit = begin(rogue(), [foe(2, 2)]);
    applyCondition(crit, them(crit), { id: "restrained", source: "t" });
    resolveAttack(crit, me(crit), them(crit), me(crit).attacks[0], seq(roll(20), roll(20), 0.5, 0.5, 0.5, 0.5));
    expect(crit.rolls.find((r) => r.title.includes("sournoise"))!.dice).toHaveLength(2);
    const miss = begin(rogue(), [foe(2, 2)]);
    applyCondition(miss, them(miss), { id: "restrained", source: "t" });
    resolveAttack(miss, me(miss), them(miss), me(miss).attacks[0], seq(roll(2), roll(2)));
    expect(miss.rolls.some((r) => r.title.includes("sournoise"))).toBe(false);
  });
  it("le roublard et son équipement : sneakDice et armes éligibles (finesse ou distance) seulement", () => {
    const r = make("rogue");
    expect(characterToCombatant(r).sneakDice).toBe(1);
    expect(r.attacks.filter((a) => a.sneak).length).toBeGreaterThan(0);
    expect(r.attacks.find((a) => a.weaponId === "shortsword")?.sneak).toBe(true); // finesse
    expect(make("fighter").attacks.every((a) => !a.sneak || a.ranged || a.weaponId === "scimitar" || a.weaponId === "rapier")).toBe(true);
    expect(characterToCombatant(make("fighter")).sneakDice).toBeUndefined();
  });
});

describe("Inspiration bardique", () => {
  it("le barde reçoit des utilisations égales à son modificateur de Charisme (au moins 1)", () => {
    expect(featuresFor("bard", 1, { CHA: 3 })[0]).toMatchObject({ id: "bardic-inspiration", uses: 3, max: 3 });
    expect(featuresFor("bard", 1, { CHA: -1 })[0].uses).toBe(1);
    expect(featuresFor("fighter").some((f) => f.id === "bardic-inspiration")).toBe(false);
  });
  it("action bonus : dé d'inspiration en réserve, une utilisation en moins, pas deux dés à la fois", () => {
    const s = begin(hero(1, 2, { features: [{ id: "bardic-inspiration", uses: 2, max: 2 }] }), [foe(2, 2)]);
    expect(playerOptions(s).bonus.map((o) => o.id)).toContain("bardic-inspiration");
    useFeature(s, "bardic-inspiration", seq(0.5));
    expect(me(s).inspiration).toBe(6);
    expect(me(s).features[0].uses).toBe(1);
    expect(playerOptions(s).bonus.map((o) => o.id)).not.toContain("bardic-inspiration");
  });
  it("transforme une attaque ratée de peu en réussite, et le dé est consommé", () => {
    const s = begin(hero(1, 2), [foe(2, 2, { ac: 16 })]);
    me(s).inspiration = 6;
    // 8 + 5 = 13 contre CA 16 : raté ; d6 = 5 → 18 : touché
    resolveAttack(s, me(s), them(s), me(s).attacks[0], seq(roll(8), 0.75, 0.5));
    const a = s.rolls.filter((r) => r.kind === "attack").at(-1)!;
    expect(a.outcome).toBe("hit");
    expect(a.note).toContain("Inspiration bardique +5");
    expect(me(s).inspiration).toBeUndefined();
  });
  it("garde le dé quand il ne suffit pas", () => {
    const s = begin(hero(1, 2), [foe(2, 2, { ac: 25 })]);
    me(s).inspiration = 6;
    resolveAttack(s, me(s), them(s), me(s).attacks[0], seq(roll(8), 0.99));
    expect(s.rolls.filter((r) => r.kind === "attack").at(-1)!.outcome).toBe("miss");
    expect(me(s).inspiration).toBe(6);
  });
  it("sauve aussi un jet de sauvegarde raté de peu", () => {
    const s = begin(hero(1, 2), [foe(2, 2)]);
    me(s).inspiration = 6;
    const r = rollSave(s, me(s), "DEX", 12, seq(roll(9), 0.99)); // 9 < 12, d6 = 6 → 15
    expect(r.success).toBe(true);
    expect(me(s).inspiration).toBeUndefined();
  });
});

describe("maîtrises d'armes : données et choix", () => {
  it("chaque arme avec une maîtrise existe ; chaque maîtrise a un texte d'aide", async () => {
    const { MASTERY_TEXT } = await import("../../data/help");
    for (const [id, m] of Object.entries(WEAPON_MASTERY)) {
      expect(WEAPONS.some((w) => w.id === id), id).toBe(true);
      expect(MASTERY_TEXT[m]?.text.length, m).toBeGreaterThan(20);
    }
  });
  it("cinq classes ont des maîtrises : 3 pour le guerrier, 2 pour les autres", () => {
    expect(MASTERY_COUNT).toEqual({ barbarian: 2, fighter: 3, paladin: 2, ranger: 2, rogue: 2 });
    expect(masterableWeapons("wizard")).toEqual([]);
    expect(masterableWeapons("fighter").length).toBeGreaterThan(masterableWeapons("rogue").length);
  });
  it("les maîtrises par défaut viennent des armes du lot de départ", () => {
    expect(defaultMasteries("fighter", ["longsword", "handaxe", "dagger", "longbow", "greataxe"])).toEqual(["longsword", "handaxe", "dagger"]);
    expect(defaultMasteries("wizard", ["dagger"])).toEqual([]);
    expect(defaultMasteries("rogue", ["greataxe", "dagger"])).toEqual(["dagger"]); // le roublard ne manie pas la hache à deux mains
  });
  it("le personnage créé a ses maîtrises et ses attaques les portent", () => {
    const f = make("fighter");
    expect(f.masteries!.length).toBeLessThanOrEqual(3);
    for (const a of f.attacks) if (a.weaponId && f.masteries!.includes(a.weaponId)) expect(a.mastery, a.weaponId).toBe(WEAPON_MASTERY[a.weaponId]);
    for (const a of f.attacks) if (a.weaponId && !f.masteries!.includes(a.weaponId)) expect(a.mastery).toBeUndefined();
    expect(make("wizard").masteries).toBeUndefined();
  });
  it("choisir ses maîtrises : au plus le nombre permis, que des armes maîtrisables, attaques recalculées", () => {
    const f = make("fighter");
    const carried = f.equipment.weapons[0].id;
    const p = setMasteries(f, [carried]);
    expect(p.masteries).toEqual([carried]);
    expect(p.attacks.filter((a) => a.mastery).map((a) => a.weaponId)).toEqual([carried]);
    expect(() => setMasteries(f, ["longsword", "dagger", "handaxe", "club"])).toThrow(/Au plus/);
    expect(() => setMasteries(make("rogue"), ["greataxe"])).toThrow();
  });
  it("les anciennes sauvegardes reçoivent un choix par défaut ; les classes sans maîtrise sont laissées telles quelles", () => {
    const old: Character = { ...make("fighter"), masteries: undefined };
    const migrated = migrateMasteries(old);
    expect(migrated.masteries!.length).toBeGreaterThan(0);
    expect(migrated.attacks.some((a) => a.mastery)).toBe(true);
    const wiz = make("wizard");
    expect(migrateMasteries(wiz)).toBe(wiz);
  });
});

describe("maîtrises d'armes : effets en combat", () => {
  const withMastery = (m: Mastery, over: Partial<AttackDef> = {}) => attack({ mastery: m, ...over });
  const setup = (m: Mastery, over: Partial<AttackDef> = {}, f: CombatantInit[] = [foe(2, 2)], arena: Arena | undefined = FIELD) =>
    begin(hero(1, 2, { attacks: [withMastery(m, over)] }), f, arena);
  const hit = (s: CombatState, ...rest: number[]) => playerAttack(s, "foe", seq(roll(15), ...rest), 0);

  it("Écorchure : un coup raté inflige le modificateur", () => {
    const s = setup("graze");
    const hp = them(s).hp;
    playerAttack(s, "foe", seq(roll(2)), 0);
    expect(hp - them(s).hp).toBe(3);
    expect(lastDamage(s).title).toContain("Écorchure");
  });
  it("Écorchure : rien sans la maîtrise ni quand le coup touche", () => {
    const s = begin(hero(1, 2), [foe(2, 2)]);
    const hp = them(s).hp;
    playerAttack(s, "foe", seq(roll(2)), 0);
    expect(them(s).hp).toBe(hp);
  });
  it("Gêne : la prochaine attaque contre la même cible a l'avantage, une seule fois", () => {
    const s = setup("vex");
    hit(s, 0.5);
    expect(me(s).vexTargetId).toBe("foe");
    resolveAttack(s, me(s), them(s), me(s).attacks[0], seq(roll(2), roll(3)));
    const a = s.rolls.filter((r) => r.kind === "attack").at(-1)!;
    expect(a.dice).toHaveLength(2);
    expect(a.note).toContain("gêne");
    expect(me(s).vexTargetId).toBeUndefined();
  });
  it("Sape : la cible a un désavantage à sa prochaine attaque", () => {
    const s = setup("sap");
    hit(s, 0.5);
    expect(them(s).mocked).toBe(true);
  });
  it("Ralentissement : −3 m de vitesse jusqu'au prochain tour du héros", () => {
    const s = setup("slow");
    hit(s, 0.5);
    expect(them(s).slowedUntilRound).toBe(s.round + 1);
    expect(movementLeft(them(s), s)).toBe(movementLeft(them(s)) - 2);
  });
  it("Renversement : la cible tombe à terre si elle rate son jet de Constitution", () => {
    const ko = setup("topple");
    hit(ko, 0.5, roll(1));
    expect(hasCondition(them(ko), "prone")).toBe(true);
    const ok = setup("topple");
    hit(ok, 0.5, roll(20));
    expect(hasCondition(them(ok), "prone")).toBe(false);
  });
  it("Poussée : la cible recule de 2 cases, arrêtée par un obstacle ou une créature", () => {
    const s = begin(hero(1, 1, { attacks: [withMastery("push")] }), [foe(2, 1)]);
    hit(s, 0.5);
    expect(them(s).pos).toEqual({ x: 4, y: 1 });
    const wall = begin(hero(2, 1, { attacks: [withMastery("push")] }), [foe(3, 1)], WALL_END);
    playerAttack(wall, "foe", seq(roll(15), 0.5), 0);
    expect(them(wall).pos).toEqual({ x: 3, y: 1 }); // le mur est juste derrière
    expect(wall.log.some((l) => l.includes("repoussé"))).toBe(false);
  });
  it("Enchaînement : une seconde créature au contact de la première est frappée, une fois par tour", () => {
    const s = setup("cleave", {}, [foe(2, 2), foe(2, 1, { id: "foe2", name: "Autre" })]);
    hit(s, 0.5, roll(15), 0.5);
    const hits = s.rolls.filter((r) => r.kind === "attack" && r.actorId === "hero");
    expect(hits).toHaveLength(2);
    expect(hits[1].title).toContain("enchaînement");
    const dmg = s.rolls.filter((r) => r.kind === "damage").at(-1)!;
    expect(dmg.modifier).toBeLessThanOrEqual(0); // pas de modificateur aux dégâts
    expect(me(s).turnState.cleaved).toBe(true);
  });
  it("Enchaînement : rien sans seconde cible, ni à distance, ni sans terrain", () => {
    const alone = setup("cleave");
    hit(alone, 0.5);
    expect(alone.rolls.filter((r) => r.kind === "attack" && r.actorId === "hero")).toHaveLength(1);
    const noArena = begin(hero(1, 2, { attacks: [withMastery("cleave")] }), [foe(2, 2), foe(2, 1, { id: "f2", name: "A" })], undefined);
    expect(() => playerAttack(noArena, "foe", seq(roll(15), 0.5), 0)).not.toThrow();
  });
  it("Entaille : la seconde arme ne coûte pas l'action bonus", () => {
    const off = { name: "Dague", toHit: 5, damage: { count: 1, sides: 4, bonus: 0 }, damageType: "perforant", ability: "DEX" as const };
    const s = begin(hero(1, 2, { attacks: [withMastery("nick", { light: true, offhand: off })] }), [foe(2, 2)]);
    playerAttack(s, "foe", seq(roll(15), 0.5), 0);
    expect(playerOptions(s).bonus.map((o) => o.id)).toContain("offhand");
    useFeature(s, "offhand", seq(roll(15), 0.5), { targetId: "foe" });
    expect(me(s).turnState.bonus).toBe(false); // l'action bonus reste disponible
  });
  it("sans Entaille, la seconde arme coûte l'action bonus", () => {
    const off = { name: "Dague", toHit: 5, damage: { count: 1, sides: 4, bonus: 0 }, damageType: "perforant", ability: "DEX" as const };
    const s = begin(hero(1, 2, { attacks: [attack({ light: true, offhand: off })] }), [foe(2, 2)]);
    playerAttack(s, "foe", seq(roll(15), 0.5), 0);
    useFeature(s, "offhand", seq(roll(15), 0.5), { targetId: "foe" });
    expect(me(s).turnState.bonus).toBe(true);
  });
});

describe("capacités de monstres", () => {
  it("chaque capacité appliquée a un texte d'aide ; chaque monstre est décrit", () => {
    for (const m of MONSTERS) {
      expect(m.text.length, m.id).toBeGreaterThan(20);
      for (const t of m.traits ?? []) expect(MONSTER_TRAIT_TEXT[t]?.text, `${m.id}/${t}`).toBeTruthy();
    }
    expect(MONSTERS.find((m) => m.id === "wolf")!.traits).toContain("pack-tactics");
    expect(MONSTERS.find((m) => m.id === "zombie")!.traits).toContain("undead-fortitude");
    expect(MONSTERS.find((m) => m.id === "orc")!.traits).toContain("aggressive");
  });
  it("les rencontres transmettent les capacités aux ennemis", () => {
    const e = buildEnemies(ENCOUNTERS.find((x) => x.id === "kobolds")!);
    expect(e).toHaveLength(3);
    expect(e[0].traits).toContain("pack-tactics");
  });

  it("tactique de meute : avantage quand un allié est au contact de la cible, pas autrement ni sans terrain", () => {
    const k = (id: string, x: number, y: number): CombatantInit => foe(x, y, { id, name: id, traits: ["pack-tactics"] });
    const s = startCombat([hero(5, 2)], [k("a", 4, 2), k("b", 6, 2)], seq(0.99, 0, 0), FIELD);
    resolveAttack(s, them(s, "a"), me(s), them(s, "a").attacks[0], seq(roll(5), roll(15), 0.5));
    let a = s.rolls.filter((r) => r.kind === "attack").at(-1)!;
    expect(a.dice).toHaveLength(2);
    expect(a.note).toContain("tactique de meute");
    const lone = startCombat([hero(5, 2)], [k("a", 4, 2)], seq(0.99, 0), FIELD);
    resolveAttack(lone, them(lone, "a"), me(lone), them(lone, "a").attacks[0], seq(roll(15), 0.5));
    a = lone.rolls.filter((r) => r.kind === "attack").at(-1)!;
    expect(a.dice).toHaveLength(1);
    const noArena = startCombat([hero(5, 2, { pos: undefined })], [k("a", 4, 2), k("b", 6, 2)].map((x) => ({ ...x, pos: undefined })), seq(0.99, 0, 0));
    resolveAttack(noArena, them(noArena, "a"), me(noArena), them(noArena, "a").attacks[0], seq(roll(15), 0.5));
    expect(noArena.rolls.filter((r) => r.kind === "attack").at(-1)!.dice).toHaveLength(1);
  });
  it("robustesse des morts-vivants : reste à 1 PV sur un jet réussi, pas sur un critique ni des dégâts radiants", () => {
    const z = (): CombatantInit => foe(2, 2, { maxHp: 5, traits: ["undead-fortitude"] });
    const save = begin(hero(1, 2), [z()]);
    resolveAttack(save, me(save), them(save), me(save).attacks[0], seq(roll(15), 0.99, roll(20)));
    expect(them(save).dead).toBe(false);
    expect(them(save).hp).toBe(1);
    const fail = begin(hero(1, 2), [z()]);
    resolveAttack(fail, me(fail), them(fail), me(fail).attacks[0], seq(roll(15), 0.99, roll(1)));
    expect(them(fail).dead).toBe(true);
    const crit = begin(hero(1, 2), [z()]);
    resolveAttack(crit, me(crit), them(crit), me(crit).attacks[0], seq(roll(20), 0.99, 0.99, roll(20)));
    expect(them(crit).dead).toBe(true);
    const radiant = begin(hero(1, 2, { attacks: [attack({ damageType: "radiant" })] }), [z()]);
    resolveAttack(radiant, me(radiant), them(radiant), me(radiant).attacks[0], seq(roll(15), 0.99, roll(20)));
    expect(them(radiant).dead).toBe(true);
  });
  it("agressif : l'orc parcourt deux fois sa vitesse pour atteindre le héros", () => {
    const orc = (agg: boolean) => begin(hero(0, 2), [foe(13, 2, { traits: agg ? ["aggressive"] : [] })]);
    const a = orc(true);
    playerEndTurn(a, seq(roll(2)));
    expect(them(a).pos!.x).toBe(1); // 12 cases parcourues, au contact
    const b = orc(false);
    playerEndTurn(b, seq(roll(2)));
    expect(them(b).pos!.x).toBe(7); // 6 cases
  });
  it("araignée géante : la toile entrave de loin, le héros peut s'en libérer ; la morsure empoisonne les PV", () => {
    const spider = MONSTERS.find((m) => m.id === "giant-spider")!;
    const init: CombatantInit = { id: "foe", name: spider.name, side: "enemies", maxHp: spider.maxHp, ac: spider.ac, initiativeBonus: -5, attacks: spider.attacks, speed: spider.speed, pos: { x: 6, y: 2 }, saveMods: spider.saves };
    const s = begin(hero(0, 2), [init]);
    playerEndTurn(s, seq(roll(15), roll(15), 0.5, roll(2))); // toile : touche, DEX ratée → entravé
    expect(hasCondition(me(s), "restrained")).toBe(true);
    expect(me(s).conditions.find((c) => c.id === "restrained")!.escape).toEqual({ ability: "STR", dc: 12 });
    expect(movementLeft(me(s), s)).toBe(0);
    playerBreakFree(s, seq(roll(20)));
    expect(hasCondition(me(s), "restrained")).toBe(false);
    expect(() => playerBreakFree(s)).toThrow();
  });
  it("morsure d'araignée : dégâts de poison sur jet de Constitution, moitié si réussi", () => {
    const spider = MONSTERS.find((m) => m.id === "giant-spider")!;
    const bite = spider.attacks[0];
    const run = (conRoll: number) => {
      const s = begin(hero(1, 2, { maxHp: 100, saveMods: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 } }), [{ ...foe(2, 2), attacks: [bite] }]);
      resolveAttack(s, them(s), me(s), bite, seq(roll(15), 0.5, conRoll, 0.95, 0.95), { opportunity: true });
      return 100 - me(s).hp;
    };
    const failed = run(roll(2));
    const saved = run(roll(19));
    expect(failed - saved).toBeGreaterThan(0);
    expect(failed - saved).toBe(Math.ceil(16 / 2)); // 2d8 = 16 : plein tarif contre moitié (8)
  });
});

describe("compteur de bestiaire", () => {
  it("dix monstres au bestiaire et deux nouvelles rencontres", () => {
    expect(MONSTERS).toHaveLength(10);
    expect(ENCOUNTERS.some((e) => e.id === "spider")).toBe(true);
  });
});

describe("mains nues", () => {
  it("sans arme en main, il reste toujours une attaque (1 + Force)", () => {
    const f = make("fighter");
    const bare = { ...f, equipment: { ...f.equipment, weapons: [] } };
    const patch = setMasteries(bare, []);
    expect(patch.attacks).toHaveLength(1);
    expect(patch.attacks[0]).toMatchObject({ name: "Coup à mains nues", damage: { count: 0, sides: 4, bonus: 1 + f.modifiers.STR } });
    expect(f.attacks.at(-1)!.name).toBe("Coup à mains nues"); // toujours en dernier choix
  });
});
