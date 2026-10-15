import { describe, expect, it } from "vitest";
import { MAPS, MAP_BY_ID } from "../../data/maps";
import { rangeMeters, SPELL_BY_ID } from "../../data/spells";
import { buildSetup } from "../arena";
import { CLEARING, freeCellsNear, hasLineOfSight, speedCells, type Arena } from "../battlefield";
import {
  applyCondition, attackCheck, getCombatant, movementLeft, planMove, playerAttack, playerDash, playerDisengage, playerEndTurn, playerMove,
  playerOptions, resolveAttack, startCombat, type AttackDef, type CombatState, type CombatantInit,
} from "../combat";
import type { Rng } from "../dice";
import { startExploration } from "../exploration";
import { castSpell, castingFor } from "../spellcasting";

const seq = (...v: number[]): Rng => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const roll = (n: number) => (n - 0.5) / 20;
const sword: AttackDef = { name: "Épée", toHit: 5, damage: { count: 1, sides: 8, bonus: 3 }, damageType: "tranchant", ranged: false };
const bow: AttackDef = { name: "Arc court", toHit: 5, damage: { count: 1, sides: 6, bonus: 2 }, damageType: "perforant", ranged: true, range: [24, 96] };
const bite: AttackDef = { name: "Morsure", toHit: 4, damage: { count: 1, sides: 6, bonus: 2 }, damageType: "perforant", ranged: false };

/** Terrain 15 × 5 sans obstacle, avec un mur au milieu de la rangée du haut. */
const FIELD: Arena = { rows: ["...............", "...............", "...............", "...............", "..............."] };
const WALLED: Arena = { rows: ["....#....", "....#....", "....#....", "....#....", "....#...."] };

const hero = (x: number, y: number, over: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "hero", name: "Héros", side: "party", maxHp: 30, ac: 10, initiativeBonus: 5, attacks: [sword, bow], speed: 9, pos: { x, y },
  saveMods: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }, ...over,
});
const foe = (x: number, y: number, over: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "foe", name: "Loup", side: "enemies", maxHp: 40, ac: 10, initiativeBonus: -5, attacks: [bite], speed: 9, pos: { x, y }, saveMods: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }, ...over,
});
/** Le héros joue en premier, puis le hasard donné. */
const begin = (h: CombatantInit, f: CombatantInit[], arena: Arena = FIELD, ...rest: number[]): { s: CombatState; rng: Rng } => {
  const rng = seq(0.99, ...f.map(() => 0), ...rest);
  return { s: startCombat([h], f, rng, arena), rng };
};
const me = (s: CombatState) => getCombatant(s, "hero");
const them = (s: CombatState, id = "foe") => getCombatant(s, id);

describe("terrain et distances", () => {
  it("un combat sur un terrain exige une position pour chacun", () => {
    expect(() => startCombat([{ ...hero(1, 1), pos: undefined }], [foe(3, 1)], () => 0.5, FIELD)).toThrow();
  });
  it("vitesse en cases : 9 m = 6 cases, 6 m = 4, 12 m = 8", () => {
    expect([9, 6, 12, 10.5].map(speedCells)).toEqual([6, 4, 8, 7]);
  });
  it("la ligne de vue est coupée par un mur", () => {
    expect(hasLineOfSight(FIELD, { x: 0, y: 2 }, { x: 14, y: 2 })).toBe(true);
    expect(hasLineOfSight(WALLED, { x: 0, y: 2 }, { x: 8, y: 2 })).toBe(false);
    expect(hasLineOfSight(WALLED, { x: 3, y: 2 }, { x: 4, y: 2 })).toBe(true); // le mur lui-même est visible
  });
  it("portée des sorts lue dans leur texte", () => {
    expect(rangeMeters({ range: "36 m" })).toBe(36);
    expect(rangeMeters({ range: "Contact" })).toBe(1.5);
    expect(rangeMeters({ range: "Cône de 4,5 m" })).toBe(4.5);
    expect(rangeMeters({ range: "Soi-même" })).toBeUndefined();
    expect(rangeMeters({ range: "Soi-même (9 m)" })).toBeUndefined();
  });
});

describe("portée des attaques", () => {
  it("corps à corps : seulement au contact", () => {
    const { s } = begin(hero(2, 2), [foe(3, 2)]);
    expect(attackCheck(s, me(s), them(s), sword).ok).toBe(true);
    them(s).pos = { x: 4, y: 2 };
    const far = attackCheck(s, me(s), them(s), sword);
    expect(far.ok).toBe(false);
    expect(far.reason).toContain("Hors de portée");
    expect(() => playerAttack(s, "foe", () => 0.5, 0)).toThrow();
  });
  it("à distance : portée normale sans désavantage, longue portée avec, au-delà impossible", () => {
    const { s } = begin(hero(0, 2), [foe(5, 2)], { rows: ["." .repeat(80), ".".repeat(80), ".".repeat(80)] });
    expect(attackCheck(s, me(s), them(s), bow)).toMatchObject({ ok: true, disadvantage: [] }); // 7,5 m
    them(s).pos = { x: 20, y: 2 }; // 30 m : entre 24 et 96
    expect(attackCheck(s, me(s), them(s), bow)).toMatchObject({ ok: true, disadvantage: ["longue portée"] });
    them(s).pos = { x: 70, y: 2 }; // 105 m
    expect(attackCheck(s, me(s), them(s), bow).ok).toBe(false);
  });
  it("un mur empêche de tirer", () => {
    const { s } = begin(hero(1, 2), [foe(7, 2)], WALLED);
    const c = attackCheck(s, me(s), them(s), bow);
    expect(c.ok).toBe(false);
    expect(c.reason).toBe("Pas de ligne de vue");
  });
  it("tirer au contact d'un ennemi donne un désavantage (deux d20, le plus bas)", () => {
    const { s } = begin(hero(2, 2), [foe(3, 2)]);
    expect(attackCheck(s, me(s), them(s), bow).disadvantage).toEqual(["ennemi au contact"]);
    resolveAttack(s, me(s), them(s), bow, seq(roll(18), roll(3), 0.5));
    const a = s.rolls.filter((r) => r.kind === "attack").at(-1)!;
    expect(a.dice).toHaveLength(2);
    expect(a.dice[a.keptIndex]).toBe(3);
    expect(a.note).toContain("ennemi au contact");
  });
  it("une arme sans portée enregistrée (ancienne sauvegarde) retrouve celle de l'arme par son nom", () => {
    const old: AttackDef = { name: "Arc long", toHit: 5, damage: { count: 1, sides: 8, bonus: 2 }, damageType: "perforant", ranged: true };
    const { s } = begin(hero(0, 2, { attacks: [old] }), [foe(10, 2)], { rows: ["." .repeat(40), ".".repeat(40), ".".repeat(40)] });
    expect(attackCheck(s, me(s), them(s), old).ok).toBe(true); // 15 m, arc long : 45 m
  });
});

describe("déplacement du joueur", () => {
  it("coût en mètres, trajet et limite de vitesse", () => {
    const { s } = begin(hero(0, 2), [foe(14, 2)]);
    expect(movementLeft(me(s))).toBe(6);
    const ok = planMove(s, me(s), { x: 4, y: 2 });
    expect(ok).toMatchObject({ ok: true, meters: 6 });
    const far = planMove(s, me(s), { x: 8, y: 2 });
    expect(far.ok).toBe(false);
    expect(far.reason).toContain("Trop loin");
    expect(planMove(s, me(s), { x: 0, y: 2 }).ok).toBe(false);
  });
  it("on ne traverse pas un ennemi et on contourne", () => {
    const { s } = begin(hero(0, 2), [foe(2, 2)]);
    const p = planMove(s, me(s), { x: 4, y: 2 });
    expect(p.ok).toBe(true);
    expect(p.path.some((c) => c.x === 2 && c.y === 2)).toBe(false);
    expect(planMove(s, me(s), { x: 2, y: 2 }).ok).toBe(false); // case occupée
  });
  it("se déplacer consomme le mouvement ; Foncer le double ; entravé : 0", () => {
    const { s } = begin(hero(0, 2), [foe(14, 2)]);
    playerMove(s, { x: 4, y: 2 });
    expect(me(s).pos).toEqual({ x: 4, y: 2 });
    expect(movementLeft(me(s))).toBe(2);
    expect(() => playerMove(s, { x: 8, y: 2 })).toThrow();
    playerDash(s);
    expect(movementLeft(me(s))).toBe(8);
    expect(me(s).turnState.action).toBe(true);
    const r = begin(hero(0, 2), [foe(14, 2)]);
    applyCondition(r.s, me(r.s), { id: "restrained", source: "t" });
    expect(movementLeft(me(r.s))).toBe(0);
  });
  it("le tour ne se termine pas tout seul tant qu'il reste du déplacement", () => {
    const { s } = begin(hero(2, 2), [foe(3, 2)], FIELD, roll(15), roll(2));
    playerAttack(s, "foe", seq(roll(15), 0.5), 0);
    expect(s.round).toBe(1);
    expect(playerOptions(s).canEnd).toBe(true);
    expect(playerOptions(s).movementCells).toBe(6);
    playerMove(s, { x: 0, y: 4 });
    playerEndTurn(s, seq(roll(2)));
    expect(s.round).toBe(2);
  });
  it("sans mouvement restant, l'action utilisée termine le tour comme avant", () => {
    const { s } = begin(hero(2, 2), [foe(3, 2)]);
    playerMove(s, { x: 0, y: 0 }); // 2 cases
    playerDash(s, seq(roll(2))); // plus 6 cases : encore du mouvement, le tour continue
    expect(s.round).toBe(1);
    playerMove(s, { x: 10, y: 0 });
    expect(movementLeft(me(s))).toBe(0);
  });
});

describe("attaques d'opportunité", () => {
  it("quitter la portée d'un ennemi lui donne une attaque d'opportunité", () => {
    const { s } = begin(hero(2, 2), [foe(3, 2)]);
    const hp = me(s).hp;
    playerMove(s, { x: 0, y: 2 }, seq(roll(18), 0.5));
    expect(s.log.some((l) => l.includes("attaque d'opportunité"))).toBe(true);
    expect(me(s).hp).toBeLessThan(hp);
    expect(me(s).pos).toEqual({ x: 0, y: 2 });
    expect(them(s).turnState.reaction).toBe(true);
  });
  it("pas d'attaque d'opportunité en restant à son contact, ni après Se désengager", () => {
    const stay = begin(hero(2, 2), [foe(3, 2)]);
    playerMove(stay.s, { x: 2, y: 3 });
    expect(stay.s.log.some((l) => l.includes("s'éloigne"))).toBe(false);
    const dis = begin(hero(2, 2), [foe(3, 2)]);
    playerDisengage(dis.s, seq(roll(2)));
    playerMove(dis.s, { x: 0, y: 2 });
    expect(dis.s.log.some((l) => l.includes("s'éloigne"))).toBe(false);
    expect(dis.s.log.some((l) => l.includes("se désengage"))).toBe(true);
  });
  it("une seule attaque d'opportunité par round pour un même ennemi", () => {
    const { s } = begin(hero(2, 2), [foe(3, 2)]);
    playerMove(s, { x: 2, y: 4 }, seq(roll(2))); // quitte (3,2) → première attaque (ratée)
    playerMove(s, { x: 3, y: 3 }, seq(roll(2)));
    playerMove(s, { x: 3, y: 4 }, seq(roll(2)));
    expect(s.log.filter((l) => l.includes("opportunité")).length).toBeLessThanOrEqual(2);
    expect(them(s).turnState.reaction).toBe(true);
  });
  it("un héros mis à terre par l'attaque d'opportunité n'avance pas", () => {
    const { s } = begin(hero(2, 2, { maxHp: 1 }), [foe(3, 2)]);
    playerMove(s, { x: 0, y: 2 }, seq(roll(19), 0.99));
    expect(me(s).hp).toBe(0);
    expect(me(s).pos).toEqual({ x: 2, y: 2 });
    // le tour du héros terminé, ce n'est plus à lui de jouer (jet de mort passé automatiquement)
    expect(playerOptions(s).canAct).toBe(false);
  });
});

describe("les ennemis sur le terrain", () => {
  it("un ennemi lointain s'approche de toute sa vitesse, sans attaquer s'il n'arrive pas au contact", () => {
    const { s } = begin(hero(0, 2), [foe(14, 2)], FIELD);
    playerEndTurn(s, seq(0.5));
    expect(them(s).pos).toEqual({ x: 8, y: 2 }); // 6 cases
    expect(s.log.some((l) => l.includes("s'approche"))).toBe(true);
    expect(s.log.some((l) => l.includes("ne peut pas atteindre"))).toBe(true);
    expect(s.rolls.some((r) => r.kind === "move")).toBe(true);
    expect(me(s).hp).toBe(30);
  });
  it("un ennemi qui arrive au contact attaque dans le même tour", () => {
    const { s } = begin(hero(0, 2), [foe(5, 2)], FIELD);
    playerEndTurn(s, seq(roll(18), 0.5));
    expect(them(s).pos).toEqual({ x: 1, y: 2 });
    expect(s.rolls.some((r) => r.kind === "attack" && r.actorId === "foe")).toBe(true);
  });
  it("la vitesse de l'ennemi compte : un zombie (6 m) fait 4 cases", () => {
    const { s } = begin(hero(0, 2), [foe(14, 2, { speed: 6 })], FIELD);
    playerEndTurn(s, seq(0.5));
    expect(them(s).pos).toEqual({ x: 10, y: 2 });
  });
  it("un ennemi entravé ne bouge pas", () => {
    const { s } = begin(hero(0, 2), [foe(14, 2)], FIELD);
    applyCondition(s, them(s), { id: "restrained", source: "t" });
    playerEndTurn(s, seq(0.5));
    expect(them(s).pos).toEqual({ x: 14, y: 2 });
  });
  it("derrière un mur sans passage, l'ennemi ne peut pas atteindre sa cible", () => {
    const solid: Arena = { rows: ["....#....", "....#....", "....#....", "....#....", "....#...."] };
    const { s } = begin(hero(0, 2), [foe(8, 2)], solid);
    playerEndTurn(s, seq(0.5));
    expect(them(s).pos).toEqual({ x: 8, y: 2 });
    expect(s.log.some((l) => l.includes("ne peut pas atteindre"))).toBe(true);
  });
  it("les ennemis ne se superposent pas", () => {
    const { s } = begin(hero(0, 2), [foe(5, 2), foe(5, 3, { id: "foe2", name: "Loup 2" })], FIELD);
    playerEndTurn(s, seq(roll(2)));
    const a = them(s).pos!, b = them(s, "foe2").pos!;
    expect(`${a.x},${a.y}`).not.toBe(`${b.x},${b.y}`);
  });
  it("plusieurs héros : l'ennemi cible le plus proche", () => {
    const h2: CombatantInit = { ...hero(10, 2), id: "h2", name: "Second", initiativeBonus: 4 };
    const s = startCombat([hero(0, 2), h2], [foe(12, 2)], seq(0.99, 0.9, 0), FIELD);
    playerEndTurn(s, seq(0.5));
    if (s.order[s.turn] === "h2") playerEndTurn(s, seq(0.5));
    expect(them(s).pos!.x).toBeGreaterThan(8); // il va vers h2, tout proche
  });
});

describe("sorts à distance", () => {
  const mage = (x: number, y: number): CombatantInit => ({
    ...hero(x, y), name: "Mage", attacks: [sword],
    spellcasting: castingFor({ classId: "wizard", modifiers: { STR: 0, DEX: 2, CON: 2, INT: 3, WIS: 3, CHA: 3 }, proficiencyBonus: 2, conSaveBonus: 2, unarmored: true, spells: { cantrips: ["fire-bolt"], prepared: ["burning-hands", "magic-missile"] } }),
  });
  it("un sort hors de portée est refusé sans rien dépenser", () => {
    const { s } = begin(mage(0, 2), [foe(5, 2)], FIELD);
    expect(() => castSpell(s, "burning-hands", seq(0.5), { targetId: "foe" })).toThrow(); // 4,5 m = 3 cases
    expect(me(s).spellcasting!.slots.used).toBe(0);
    expect(() => castSpell(s, "magic-missile", seq(0.5), { targetId: "foe" })).not.toThrow(); // 36 m
    expect(me(s).spellcasting!.slots.used).toBe(1);
  });
  it("un sort mineur d'attaque à distance profite de sa portée (36 m)", () => {
    const { s } = begin(mage(0, 2), [foe(14, 2)], FIELD);
    expect(() => castSpell(s, "fire-bolt", seq(roll(15), 0.5), { targetId: "foe" })).not.toThrow();
  });
  it("pas de ligne de vue : le sort est refusé", () => {
    const { s } = begin(mage(1, 2), [foe(7, 2)], WALLED);
    expect(() => castSpell(s, "magic-missile", seq(0.5), { targetId: "foe" })).toThrow(/ligne de vue/);
  });
  it("la portée existe pour tous les sorts à cible ennemie", () => {
    for (const sp of Object.values(SPELL_BY_ID)) if (sp.effect.kind === "attack" || sp.effect.kind === "save" || sp.effect.kind === "missiles") expect(rangeMeters(sp), sp.id).toBeGreaterThan(0);
  });
});

describe("mise en place du terrain", () => {
  it("combat libre : une clairière, le héros à gauche, l'ennemi à droite", () => {
    const setup = buildSetup(1);
    expect(setup.arena).toBe(CLEARING);
    expect(setup.hero.x).toBeLessThan(setup.enemies[0].x);
  });
  it("lancé depuis la carte : le héros et l'ennemi gardent leur place", () => {
    const m = MAP_BY_ID.brumeval;
    const ex = startExploration(m);
    const wolf = m.enemies.find((e) => e.id === "wolf-1")!;
    const setup = buildSetup(1, { exploration: ex, enemyCell: wolf });
    expect(setup.arena.rows).toEqual([...m.rows]);
    expect(setup.hero).toEqual({ x: ex.x, y: ex.y });
    expect(setup.enemies[0]).toEqual({ x: wolf.x, y: wolf.y });
  });
  it("plusieurs ennemis : cases distinctes, libres, autour du premier", () => {
    const setup = buildSetup(3);
    const keys = new Set([setup.hero, ...setup.enemies].map((c) => `${c.x},${c.y}`));
    expect(keys.size).toBe(4);
    for (const e of setup.enemies.slice(1)) expect(Math.max(Math.abs(e.x - setup.enemies[0].x), Math.abs(e.y - setup.enemies[0].y))).toBeLessThanOrEqual(2);
  });
  it("sans case d'ennemi sur la carte (combat d'histoire) : à 3 cases du héros au moins", () => {
    const m = MAP_BY_ID.brumeval;
    const setup = buildSetup(1, { exploration: startExploration(m) });
    expect(Math.max(Math.abs(setup.enemies[0].x - setup.hero.x), Math.abs(setup.enemies[0].y - setup.hero.y))).toBeGreaterThanOrEqual(3);
  });
  it("chaque carte offre assez de place autour de chaque ennemi pour une rencontre de deux", () => {
    for (const m of MAPS) for (const e of m.enemies) expect(() => buildSetup(2, { exploration: startExploration(m), enemyCell: e }), `${m.id}/${e.id}`).not.toThrow();
    expect(freeCellsNear(CLEARING, { x: 5, y: 4 }, new Set()).length).toBeGreaterThan(20);
  });
});
