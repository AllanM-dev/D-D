import { defaultClassChoices } from "../../data/class-choices";
import { describe, expect, it } from "vitest";
import { ARMORS, PRICES, WEAPONS } from "../../data/equipment";
import { defaultSpells } from "../../data/spells";
import { CLASSES } from "../../data/classes";
import { armorItemId, getItem, weaponItemId } from "../../data/items";
import { SHOPS, stockExists } from "../../data/shops";
import { characterToCombatant } from "../attacks";
import { buildCharacter, type Character, type CharacterDraft } from "../character";
import { attackCheck, getCombatant, playerAttack, playerOptions, resolveAttack, startCombat, useFeature, type CombatantInit } from "../combat";
import { deriveStats, wearsUntrained } from "../equipment";
import { itemCount } from "../inventory";
import { equipItem, unequip, canEquip, loadoutOf } from "../loadout";
import { buy, buyPrice, sell, sellPrice, sellable } from "../shop";
import type { Rng } from "../dice";

const seq = (...v: number[]): Rng => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };
const roll = (n: number) => (n - 0.5) / 20;

function make(classId: string, scores: Partial<Character["scores"]> = {}, kitId?: string): Character {
  const c = CLASSES.find((x) => x.id === classId)!;
  const draft: CharacterDraft = {
    name: "T", speciesId: "human", classId, backgroundId: "soldier", method: "standard",
    baseScores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
    classSkills: c.skillChoices.from.filter((s) => s !== "athletics" && s !== "intimidation").slice(0, c.skillChoices.count), fightingStyle: "defense", kitId,
    spells: defaultSpells(classId), ...defaultClassChoices(classId, ["athletics", "intimidation"]),
  } as CharacterDraft;
  const built = buildCharacter(draft, "hero");
  if (!Object.keys(scores).length) return built;
  // Scores imposés (hors règles de création) : modificateurs, CA, vitesse et attaques sont recalculés.
  const sc = { ...built.scores, ...scores };
  const modifiers = Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, Math.floor((v - 10) / 2)])) as Character["modifiers"];
  const stats = deriveStats({ classId, scores: sc, modifiers, proficiencyBonus: built.proficiencyBonus, baseSpeed: built.species.speed, fightingStyle: classId === "fighter" ? "defense" : undefined }, loadoutOf(built));
  return { ...built, scores: sc, modifiers, attacks: stats.attacks, armorClass: stats.armorClass, speed: stats.speed };
}
const withBag = (c: Character, bag: Record<string, number>): Character => ({ ...c, inventory: bag });
const apply = (c: Character, patch: ReturnType<typeof equipItem>): Character => ({ ...c, ...patch });
const foe = { id: "foe", name: "Rat", side: "enemies" as const, maxHp: 500, ac: 10, initiativeBonus: -5, attacks: [] };

describe("données d'équipement étendues", () => {
  it("un prix pour chaque arme et armure, des entiers positifs", () => {
    for (const w of WEAPONS) expect(PRICES[w.id], w.id).toBeGreaterThanOrEqual(1);
    for (const a of ARMORS) expect(PRICES[a.id], a.id).toBeGreaterThanOrEqual(1);
    for (const v of Object.values(PRICES)) expect(Number.isInteger(v)).toBe(true);
  });
  it("les objets d'arme et d'armure sont décrits et valent leur prix", () => {
    expect(getItem(weaponItemId("longsword"))).toMatchObject({ name: "Épée longue", kind: "weapon", value: 15 });
    expect(getItem(armorItemId("plate"))).toMatchObject({ kind: "armor", value: 1500 });
    expect(getItem("weapon:inconnue")).toBeUndefined();
  });
  it("les boutiques ne vendent que des articles qui existent et que l'on sait lire", () => {
    for (const s of SHOPS) {
      expect(stockExists(s), s.id).toBe(true);
      for (const id of s.stock) expect(getItem(id), `${s.id}/${id}`).toBeTruthy();
    }
  });
  it("les propriétés d'armes sont cohérentes", () => {
    for (const w of WEAPONS.filter((x) => x.properties.includes("reach"))) expect(w.ranged).toBe(false);
    for (const w of WEAPONS.filter((x) => x.properties.includes("thrown"))) expect(w.range, w.id).toBeTruthy();
  });
});

describe("attaques selon l'équipement", () => {
  const stats = (classId: string, ids: string[], shield = false, scores = { STR: 15, DEX: 14 }) => {
    const base = make(classId, scores);
    return deriveStats(
      { classId, scores: base.scores, modifiers: base.modifiers, proficiencyBonus: 2, baseSpeed: 9 },
      { armor: undefined, shield, weapons: ids.map((id) => ({ id, name: id, qty: 1 })) },
    );
  };
  it("allonge : 2 cases ; une arme sans allonge reste à 1", () => {
    const a = stats("fighter", ["glaive", "longsword"]).attacks;
    expect(a.find((x) => x.weaponId === "glaive")!.reach).toBe(2);
    expect(a.find((x) => x.weaponId === "longsword")!.reach).toBeUndefined();
  });
  it("arme lourde : désavantage sous 13 en Force (mêlée) ou en Dextérité (distance)", () => {
    const weak = make("fighter", { STR: 8 });
    const s = deriveStats({ classId: "fighter", scores: weak.scores, modifiers: weak.modifiers, proficiencyBonus: 2, baseSpeed: 9 }, { shield: false, weapons: [{ id: "greataxe", name: "x", qty: 1 }, { id: "longbow", name: "y", qty: 1 }] });
    expect(s.attacks.find((x) => x.weaponId === "greataxe")!.penalty).toContain("Force");
    expect(s.attacks.find((x) => x.weaponId === "longbow")!.penalty).toBeUndefined(); // Dextérité 14
    expect(stats("fighter", ["greataxe"]).attacks[0].penalty).toBeUndefined();
  });
  it("deux mains : impossible avec un bouclier ; polyvalente : une main avec bouclier", () => {
    const s = stats("fighter", ["greatsword", "longsword"], true).attacks;
    expect(s.find((x) => x.weaponId === "greatsword")!.blocked).toContain("bouclier");
    expect(s.at(-1)!.weaponId).toBe("greatsword"); // les attaques bloquées passent en dernier
    expect(s.find((x) => x.weaponId === "longsword")!.damage.sides).toBe(8);
    expect(stats("fighter", ["greatsword"], false).attacks[0].blocked).toBeUndefined();
  });
  it("combat à deux armes : deux armes légères (ou deux exemplaires), pas avec une seule", () => {
    const two = deriveStats({ classId: "rogue", scores: make("rogue").scores, modifiers: make("rogue").modifiers, proficiencyBonus: 2, baseSpeed: 9 }, { shield: false, weapons: [{ id: "dagger", name: "d", qty: 2 }] });
    expect(two.attacks[0].offhand?.name).toBe("Dague");
    expect(two.attacks[0].offhand!.damage.bonus).toBeLessThanOrEqual(0);
    const mixed = stats("rogue", ["dagger", "shortsword"]).attacks;
    expect(mixed.every((a) => !a.light || a.offhand)).toBe(true);
    expect(stats("rogue", ["dagger"]).attacks.find((a) => a.light)!.offhand).toBeUndefined();
    expect(stats("fighter", ["longsword", "dagger"]).attacks.find((a) => a.weaponId === "longsword")!.offhand).toBeUndefined();
  });
});

describe("équiper et ranger", () => {
  it("ranger l'armure : CA recalculée et armure dans le sac ; la rééquiper la rend", () => {
    const c = make("fighter"); // cotte de mailles (lot A)
    expect(c.equipment.armor?.id).toBe("chain-mail");
    const off = apply(c, unequip(c, { kind: "armor" }));
    expect(off.equipment.armor).toBeUndefined();
    expect(off.armorClass).toBe(10 + off.modifiers.DEX + (off.equipment.shield ? 2 : 0));
    expect(itemCount(off, "armor:chain-mail")).toBe(1);
    const back = apply(off, equipItem(off, "armor:chain-mail"));
    expect(back.armorClass).toBe(c.armorClass);
    expect(itemCount(back, "armor:chain-mail")).toBe(0);
  });
  it("changer d'armure renvoie l'ancienne dans le sac", () => {
    const c = withBag(make("fighter"), { "armor:breastplate": 1 });
    const r = apply(c, equipItem(c, "armor:breastplate"));
    expect(r.equipment.armor?.id).toBe("breastplate");
    expect(itemCount(r, "armor:chain-mail")).toBe(1);
    expect(r.armorClass).toBe(14 + Math.min(c.modifiers.DEX, 2) + (c.equipment.shield ? 2 : 0) + 1); // + Défense
  });
  it("le bouclier : +2 CA, un seul à la fois", () => {
    const c = withBag(make("wizard"), { "armor:shield": 2 });
    const r = apply(c, equipItem(c, "armor:shield"));
    expect(r.equipment.shield).toBe(true);
    expect(r.armorClass).toBe(c.armorClass + 2);
    expect(() => equipItem(r, "armor:shield")).toThrow();
    expect(canEquip(r, "armor:shield")).toBe(false);
    const un = apply(r, unequip(r, { kind: "shield" }));
    expect(un.armorClass).toBe(c.armorClass);
    expect(itemCount(un, "armor:shield")).toBe(2);
  });
  it("une arme équipée devient une attaque ; la ranger la retire (un exemplaire à la fois)", () => {
    const c = withBag(make("fighter"), { "weapon:rapier": 1 });
    const r = apply(c, equipItem(c, "weapon:rapier"));
    expect(r.attacks.some((a) => a.weaponId === "rapier")).toBe(true);
    expect(loadoutOf(r).weapons.some((w) => w.id === "rapier")).toBe(true);
    expect(itemCount(r, "weapon:rapier")).toBe(0);
    const un = apply(r, unequip(r, { kind: "weapon", id: "rapier" }));
    expect(un.attacks.some((a) => a.weaponId === "rapier")).toBe(false);
    expect(itemCount(un, "weapon:rapier")).toBe(1);
    const barb = make("barbarian"); // 4 hachettes
    const one = apply(barb, unequip(barb, { kind: "weapon", id: "handaxe" }));
    expect(one.equipment.weapons.find((w) => w.id === "handaxe")!.qty).toBe(3);
    expect(itemCount(one, "weapon:handaxe")).toBe(1);
  });
  it("erreurs : objet absent, ne s'équipe pas, rien à ranger", () => {
    const c = make("fighter");
    expect(() => equipItem(c, "weapon:rapier")).toThrow();
    expect(() => equipItem(withBag(c, { "healing-potion": 1 }), "healing-potion")).toThrow();
    expect(() => unequip(make("wizard"), { kind: "armor" })).toThrow();
    expect(() => unequip(make("wizard"), { kind: "weapon", id: "longsword" })).toThrow();
  });
  it("le moine et le barbare gardent leur défense sans armure en rangeant le bouclier", () => {
    const monk = make("monk");
    expect(monk.armorClass).toBe(10 + monk.modifiers.DEX + monk.modifiers.WIS);
    const barb = make("barbarian");
    expect(barb.armorClass).toBe(10 + barb.modifiers.DEX + barb.modifiers.CON);
  });
});

describe("armure non maîtrisée et force insuffisante", () => {
  it("un magicien en cotte de mailles : non formé ; le guerrier non", () => {
    const wiz = withBag(make("wizard"), { "armor:chain-mail": 1 });
    expect(wearsUntrained("wizard", wiz.equipment)).toBe(false);
    const worn = apply(wiz, equipItem(wiz, "armor:chain-mail"));
    expect(wearsUntrained("wizard", worn.equipment)).toBe(true);
    expect(wearsUntrained("fighter", make("fighter").equipment)).toBe(false);
    expect(wearsUntrained("wizard", { armor: undefined, shield: true })).toBe(true);
  });
  it("en combat : désavantage aux attaques et sorts bloqués", () => {
    const wiz = withBag(make("wizard"), { "armor:chain-mail": 1 });
    const worn = apply(wiz, equipItem(wiz, "armor:chain-mail"));
    const init = characterToCombatant({ ...worn, spells: { cantrips: ["fire-bolt", "light", "mage-hand"], prepared: ["magic-missile", "shield", "burning-hands", "mage-armor"] } });
    expect(init.untrainedArmor).toBe(true);
    const s = startCombat([init], [foe], () => 0.99);
    const opts = playerOptions(s).spells;
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.every((o) => !o.available && o.reason?.includes("non maîtris"))).toBe(true);
    resolveAttack(s, getCombatant(s, "hero"), getCombatant(s, "foe"), worn.attacks[0], seq(roll(18), roll(3), 0.5));
    const a = s.rolls.filter((r) => r.kind === "attack").at(-1)!;
    expect(a.dice).toHaveLength(2);
    expect(a.note).toContain("armure non maîtrisée");
  });
  it("force insuffisante : la vitesse baisse de 3 m ; avec la force, non", () => {
    const weak = withBag(make("fighter", { STR: 8 }), { "armor:plate": 1 });
    const r = apply(weak, equipItem(weak, "armor:plate"));
    expect(r.speed).toBe(weak.species.speed - 3);
    const strong = withBag(make("fighter", { STR: 17 }), { "armor:plate": 1 });
    expect(apply(strong, equipItem(strong, "armor:plate")).speed).toBe(strong.species.speed);
  });
});

describe("combat : allonge, deux mains, deux armes", () => {
  const arena = { rows: ["..........", "..........", ".........."] };
  const place = (c: Character, dist: number, over: Partial<CombatantInit> = {}) => {
    const h = { ...characterToCombatant(c), pos: { x: 0, y: 1 }, ...over };
    const f: CombatantInit = { ...foe, pos: { x: dist, y: 1 } };
    return startCombat([h], [f], seq(0.99, 0), arena);
  };
  it("une arme à allonge frappe à 3 m, pas une épée", () => {
    const c = withBag(make("fighter"), { "weapon:glaive": 1 });
    const g = apply(c, equipItem(c, "weapon:glaive"));
    const s = place(g, 2);
    const glaive = g.attacks.find((a) => a.weaponId === "glaive")!;
    const sword = g.attacks.find((a) => a.weaponId !== "glaive" && !a.ranged)!;
    expect(attackCheck(s, getCombatant(s, "hero"), getCombatant(s, "foe"), glaive).ok).toBe(true);
    expect(attackCheck(s, getCombatant(s, "hero"), getCombatant(s, "foe"), sword).ok).toBe(false);
    expect(attackCheck(place(g, 3), getCombatant(place(g, 3), "hero"), getCombatant(place(g, 3), "foe"), glaive).ok).toBe(false);
  });
  it("une arme à deux mains avec un bouclier : attaque refusée, même sans terrain", () => {
    const c = withBag(make("fighter"), { "weapon:greatsword": 1, "armor:shield": 1 });
    const shielded = apply(apply(c, equipItem(c, "weapon:greatsword")), { ...equipItem(apply(c, equipItem(c, "weapon:greatsword")), "armor:shield") });
    const idx = shielded.attacks.findIndex((a) => a.weaponId === "greatsword");
    const s = startCombat([characterToCombatant(shielded)], [foe], () => 0.99);
    expect(attackCheck(s, getCombatant(s, "hero"), getCombatant(s, "foe"), shielded.attacks[idx]).ok).toBe(false);
    expect(() => playerAttack(s, "foe", () => 0.5, idx)).toThrow(/bouclier/);
  });
  it("deux dagues : après une attaque à la dague, une seconde attaque en action bonus sans modificateur aux dégâts", () => {
    const rogue = make("rogue", { DEX: 16 }); // 2 dagues, épée courte, arc court
    const s = startCombat([characterToCombatant(rogue)], [foe], () => 0.99);
    const idx = rogue.attacks.findIndex((a) => a.light);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(playerOptions(s).bonus.some((o) => o.id === "offhand")).toBe(false);
    playerAttack(s, "foe", seq(roll(18), 0.5), idx);
    const opt = playerOptions(s).bonus.find((o) => o.id === "offhand");
    expect(opt).toBeTruthy();
    const hpBefore = getCombatant(s, "foe").hp;
    useFeature(s, "offhand", seq(roll(18), 0.99), { targetId: "foe" });
    const dmg = s.rolls.filter((r) => r.kind === "damage").at(-1)!;
    expect(dmg.modifier).toBeLessThanOrEqual(0);
    expect(getCombatant(s, "foe").hp).toBeLessThan(hpBefore);
    expect(playerOptions(s).bonus.some((o) => o.id === "offhand")).toBe(false); // une fois par tour
  });
  it("pas d'attaque à la seconde arme après une arme qui n'est pas légère", () => {
    const f = make("fighter");
    const s = startCombat([characterToCombatant(f)], [foe], () => 0.99);
    playerAttack(s, "foe", seq(roll(18), 0.5), 0);
    expect(playerOptions(s).bonus.some((o) => o.id === "offhand")).toBe(false);
  });
});

describe("boutique", () => {
  const c = withBag({ ...make("fighter"), equipment: { ...make("fighter").equipment, gold: 100 } }, { gem: 2, "cle-crypte": 1, "weapon:dagger": 1, "healing-potion": 1 });
  it("acheter : prix = valeur, or suffisant, article en vente", () => {
    expect(buy(c, "forge", weaponItemId("longsword"))).toEqual({ gold: -15, items: { "weapon:longsword": 1 } });
    expect(() => buy(c, "forge", armorItemId("plate"))).toThrow(/pas en vente/); // hors stock
    expect(() => buy(c, "forge", armorItemId("breastplate"))).toThrow(/assez d'or/);
    expect(() => buy(c, "auberge", weaponItemId("longsword"))).toThrow();
    expect(buyPrice("healing-potion")).toBe(50);
  });
  it("vendre : moitié du prix, jamais les objets de quête, seulement ce que le marchand achète", () => {
    expect(sellPrice(weaponItemId("longsword"))).toBe(7);
    expect(sellPrice("gem")).toBe(5);
    expect(sellPrice(weaponItemId("club"))).toBe(1); // minimum 1 po
    expect(sell(c, "forge", "gem")).toEqual({ gold: 5, items: { gem: -1 } });
    expect(sell(c, "forge", "weapon:dagger")).toEqual({ gold: 1, items: { "weapon:dagger": -1 } });
    expect(() => sell(c, "forge", "cle-crypte")).toThrow();
    expect(() => sell(c, "auberge", "weapon:dagger")).toThrow();
    expect(() => sell(c, "forge", "weapon:rapier")).toThrow();
  });
  it("la liste des objets vendables écarte les objets de quête et les articles refusés", () => {
    expect(sellable(c, "forge").sort()).toEqual(["gem", "weapon:dagger"]);
    expect(sellable(c, "auberge")).toEqual(["gem"]);
    expect(sellable(c, "inconnue")).toEqual([]);
  });
});
