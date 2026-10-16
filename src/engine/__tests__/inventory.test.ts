import { describe, expect, it } from "vitest";
import { CLASSES } from "../../data/classes";
import { ITEMS, getItem } from "../../data/items";
import { MAPS } from "../../data/maps";
import { STORY_BY_ID } from "../../data/stories";
import { characterToCombatant } from "../attacks";
import { buildCharacter, type Character, type CharacterDraft } from "../character";
import { resolveChoice, validateStory } from "../story";
import { getCombatant, playerOptions, startCombat, useFeature } from "../combat";
import { canDrink, changeItems, describeLoot, drinkPotion, enemyLoot, inventoryOf, itemCount, potionsLeft } from "../inventory";
import type { Rng } from "../dice";

const seq = (...v: number[]): Rng => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };

function hero(over: Partial<Character> = {}): Character {
  const c = CLASSES.find((x) => x.id === "fighter")!;
  const draft: CharacterDraft = {
    name: "T", speciesId: "human", classId: "fighter", backgroundId: "soldier", method: "standard",
    baseScores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
    classSkills: c.skillChoices.from.slice(0, c.skillChoices.count), fightingStyle: "defense",
  };
  return { ...buildCharacter(draft, "hero"), ...over };
}
const foe = { id: "foe", name: "Rat", side: "enemies" as const, maxHp: 500, ac: 30, initiativeBonus: -5, attacks: [] };

describe("objets", () => {
  it("chaque objet est décrit", () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const i of ITEMS) { expect(i.text.length, i.id).toBeGreaterThan(20); expect(i.note.length, i.id).toBeGreaterThan(5); }
  });
  it("changeItems cumule, ne descend pas sous zéro, retire les entrées vides et refuse l'inconnu", () => {
    expect(changeItems({}, { gem: 2 })).toEqual({ gem: 2 });
    expect(changeItems({ gem: 2 }, { gem: -1 })).toEqual({ gem: 1 });
    expect(changeItems({ gem: 1 }, { gem: -5 })).toEqual({});
    expect(() => changeItems({}, { nimportequoi: 1 })).toThrow();
  });
  it("describeLoot", () => {
    expect(describeLoot({ gold: 6 })).toBe("6 po");
    expect(describeLoot({ gold: 15, items: { "healing-potion": 1, gem: 2 } })).toBe("15 po, Potion de soin, Petite gemme × 2");
    expect(describeLoot({})).toBe("");
  });
  it("tout le butin des cartes est valide", () => {
    for (const m of MAPS) for (const e of m.enemies) for (const id of Object.keys(e.loot?.items ?? {})) expect(getItem(id), `${m.id}/${e.id}/${id}`).toBeTruthy();
    expect(enemyLoot("goblin-1")).toEqual({ gold: 6, items: { "weapon:scimitar": 1 } });
    expect(enemyLoot("ghoul-1").items).toEqual({ "healing-potion": 1 });
    expect(enemyLoot("inconnu")).toEqual({});
    expect(enemyLoot("wolf-1")).toEqual({});
  });
});

describe("boire une potion hors combat", () => {
  it("rend 2d4 + 2 PV, plafonné, et consomme la potion", () => {
    const c = hero({ inventory: { "healing-potion": 2 } });
    c.vitals = { hp: 1, hitDice: 1, features: {}, slotsUsed: 0, free: {}, arcaneUsed: false };
    const r = drinkPotion(c, seq(0.5, 0.5)); // d4 → 3 et 3
    expect(r.dice).toEqual([3, 3]);
    expect(r.healed).toBe(Math.min(8, c.maxHp - 1));
    expect(r.vitals.hp).toBe(1 + r.healed);
    expect(itemCount({ inventory: r.inventory }, "healing-potion")).toBe(1);
  });
  it("refuse sans potion ou à PV maximum", () => {
    expect(() => drinkPotion(hero())).toThrow();
    const full = hero({ inventory: { "healing-potion": 1 } });
    expect(() => drinkPotion(full)).toThrow();
    expect(canDrink(full)).toBe(false);
    expect(canDrink({ ...full, vitals: { hp: 2, hitDice: 1, features: {}, slotsUsed: 0, free: {}, arcaneUsed: false } })).toBe(true);
  });
});

describe("potions en combat", () => {
  const wounded = (n: number) => hero({ inventory: { "healing-potion": n }, vitals: { hp: 3, hitDice: 1, features: { "second-wind": 0 }, slotsUsed: 0, free: {}, arcaneUsed: false } });
  it("les potions du sac deviennent une action bonus avec leur nombre", () => {
    const init = characterToCombatant(wounded(2));
    expect(init.features!.find((f) => f.id === "potion")).toMatchObject({ uses: 2, max: 2 });
    const s = startCombat([init], [foe], () => 0.99);
    expect(playerOptions(s).bonus.map((o) => o.id)).toContain("potion");
  });
  it("sans potion, pas d'option ; à PV maximum, pas d'option", () => {
    const none = startCombat([characterToCombatant(hero())], [foe], () => 0.99);
    expect(playerOptions(none).bonus.map((o) => o.id)).not.toContain("potion");
    const full = startCombat([characterToCombatant(hero({ inventory: { "healing-potion": 1 } }))], [foe], () => 0.99);
    expect(playerOptions(full).bonus.map((o) => o.id)).not.toContain("potion");
  });
  it("boire soigne 2d4 + 2, coûte l'action bonus et se décompte", () => {
    const s = startCombat([characterToCombatant(wounded(2))], [foe], () => 0.99);
    useFeature(s, "potion", seq(0.5, 0.5));
    const me = getCombatant(s, "hero");
    expect(me.hp).toBe(Math.min(me.maxHp, 3 + 8));
    expect(potionsLeft(s, "hero")).toBe(1);
    expect(s.rolls.some((r) => r.kind === "heal")).toBe(true);
    expect(me.turnState.bonus).toBe(true);
  });
  it("le héros sans potion n'a pas de compteur de potions", () => {
    const s = startCombat([characterToCombatant(hero())], [foe], () => 0.99);
    expect(potionsLeft(s, "hero")).toBeUndefined();
  });
  it("le sac n'est pas rechargé par les repos : seules les utilisations de classe le sont", () => {
    const c = wounded(2);
    expect(Object.keys(c.vitals!.features)).not.toContain("potion");
  });
});

describe("histoire : or, objets et boutiques", () => {
  const story = STORY_BY_ID.brumeval;
  it("la validation de l'histoire passe (dépenses conditionnées, boutiques connues)", () => {
    expect(validateStory(story, "maire")).toEqual([]);
    const broken = { id: "b", title: "b", scenes: { a: { id: "a", title: "a", text: ["x"], choices: [{ text: "pay", goto: "a", gold: -5 }, { text: "take", goto: "a", items: { gem: -1 } }, { text: "shop", shop: "nulle-part" }] } } };
    expect(validateStory(broken, "a").length).toBe(3);
  });
  it("les choix de boutique mènent à une boutique", () => {
    const shops = Object.values(story.scenes).flatMap((sc) => sc.choices.filter((c) => c.shop).map((c) => c.shop));
    expect(shops.sort()).toEqual(["auberge", "forge"]);
    const aub = story.scenes.aubergiste;
    const i = aub.choices.findIndex((c) => c.shop === "auberge");
    expect(resolveChoice(aub, i, [], () => 0).shop).toBe("auberge");
  });
  it("la clé, le journal, la potion du coffre, la gemme et les armes du butin arrivent dans le sac", () => {
    const wallet = { gold: 0, items: {} };
    const give = (scene: string, text: string) => {
      const i = story.scenes[scene].choices.findIndex((c) => c.text.startsWith(text));
      return resolveChoice(story.scenes[scene], i, [], () => 0, Math.random, wallet).items;
    };
    expect(give("aubergiste-cle-ok", "Prendre la clé")).toEqual({ "cle-crypte": 1 });
    expect(give("aubergiste-pere", "Prendre la clé")).toEqual({ "cle-crypte": 1 });
    expect(give("journal-lecture", "Refermer")).toEqual({ "journal-gedeon": 1 });
    expect(give("coffre", "Prendre la bourse")).toEqual({ "healing-potion": 1 });
    expect(enemyLoot("skeleton-1").items).toEqual({ gem: 1, "weapon:shortsword": 1 });
    expect(enemyLoot("goblin-1").items).toEqual({ "weapon:scimitar": 1 });
  });
  it("inventoryOf copie le sac", () => {
    const c = hero({ inventory: { gem: 1 } });
    const inv = inventoryOf(c);
    inv.gem = 9;
    expect(c.inventory!.gem).toBe(1);
  });
});
