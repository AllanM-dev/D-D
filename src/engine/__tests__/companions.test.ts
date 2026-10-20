import { describe, expect, it } from "vitest";
import { defaultClassChoices } from "../../data/class-choices";
import { CLASSES } from "../../data/classes";
import { COMPANIONS, COMPANION_BY_ID } from "../../data/companions";
import { defaultSpells } from "../../data/spells";
import { type Arena } from "../battlefield";
import { buildSetup } from "../arena";
import { characterToCombatant } from "../attacks";
import { buildCharacter, type Character, type CharacterDraft } from "../character";
import {
  applyDamage, currentCombatant, getCombatant, playerEndTurn, playerOptions, processTurns, resolveAttack, startCombat, type CombatantInit, type CombatState,
} from "../combat";
import { castSpell } from "../spellcasting";
import {
  NO_COMPANION, activeCompanion, recruitedBy, companionAdvice, companionCombatant, companionFlag, companionMaxHp, companionVitals, recruitedCompanions,
} from "../companions";
import { longRest, shortRest, vitalsAfterCombat } from "../rest";
import { availableChoices, resolveChoice, validateStory } from "../story";
import { STORY_BY_ID } from "../../data/stories";

function hero(classId = "fighter", flags: string[] = []): Character {
  const c = CLASSES.find((x) => x.id === classId)!;
  return {
    ...buildCharacter({
      name: "Aria", speciesId: "human", classId, backgroundId: "soldier", method: "standard",
      baseScores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
      classSkills: c.skillChoices.from.filter((s) => s !== "athletics" && s !== "intimidation").slice(0, c.skillChoices.count),
      fightingStyle: "defense", spells: defaultSpells(classId), ...defaultClassChoices(classId, ["athletics", "intimidation"]),
    } as CharacterDraft, "h"),
    story: { flags },
  };
}
const arena: Arena = { rows: Array.from({ length: 7 }, () => ".".repeat(16)) };
const rat = (x: number, patch: Partial<CombatantInit> = {}): CombatantInit => ({
  id: "rat", name: "Rat", side: "enemies", maxHp: 30, ac: 5, initiativeBonus: -30, pos: { x, y: 3 },
  attacks: [{ name: "Morsure", toHit: 5, damage: { count: 1, sides: 4, bonus: 0 }, damageType: "perforant", ranged: false }],
  saveMods: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }, ...patch,
});
/** Héros (premier), compagnon (deuxième), ennemis (derniers). */
function fight(c: Character, foes: CombatantInit[], heroPatch: Partial<CombatantInit> = {}, allyPatch: Partial<CombatantInit> = {}): CombatState {
  const h = { ...characterToCombatant(c), initiativeBonus: 30, pos: { x: 2, y: 3 }, ...heroPatch };
  const ally = { ...companionCombatant(c)!, initiativeBonus: 20, pos: { x: 2, y: 4 }, ...allyPatch };
  return startCombat([h, ally], foes, () => 0.5, arena);
}

describe("recrutement et choix du compagnon", () => {
  it("aucun compagnon tant que personne n'est recruté ; ensuite le premier recruté, ou celui choisi, ou personne", () => {
    expect(activeCompanion(hero())).toBeUndefined();
    expect(companionCombatant(hero())).toBeUndefined();
    const two = hero("fighter", [companionFlag("mila"), companionFlag("ysolde")]);
    expect(recruitedCompanions(two).map((x) => x.id)).toEqual(["mila", "ysolde"]); // ordre de recrutement
    expect(activeCompanion(two)?.id).toBe("mila");
    expect(activeCompanion({ ...two, companion: "mila" })?.id).toBe("mila");
    expect(activeCompanion({ ...two, companion: NO_COMPANION })).toBeUndefined();
    expect(activeCompanion({ ...two, companion: "anselme" })?.id).toBe("mila"); // pas recruté : le choix est ignoré
  });
  it("le compagnon gagne des PV au rythme du héros, et garde ses PV et ses soins entre deux combats", () => {
    const def = COMPANION_BY_ID.anselme;
    expect(companionMaxHp(def, 1)).toBe(9);
    expect(companionMaxHp(def, 2)).toBe(14);
    const c = { ...hero("fighter", [companionFlag("anselme")]), vitals: { hp: 12, hitDice: 1, features: {}, slotsUsed: 0, free: {}, arcaneUsed: false, companions: { anselme: { hp: 4, heals: 1 } } } };
    expect(companionVitals(c, def)).toEqual({ hp: 4, heals: 1 });
    expect(companionCombatant(c)).toMatchObject({ hp: 4, ally: true, side: "party", healing: { uses: 1 } });
  });
});

describe("fiches des compagnons", () => {
  it("chaque compagnon a une description, un indice pour le trouver, une source et des statistiques cohérentes", () => {
    for (const c of COMPANIONS) {
      for (const t of [c.description, c.recruitHint, c.source, c.title, c.roleLabel]) expect(t.length, c.id).toBeGreaterThan(3);
      expect(c.attacks.length, c.id).toBeGreaterThan(0);
      expect(c.hp).toBeGreaterThan(0);
      for (const a of c.attacks) if (a.ranged) expect(a.range, `${c.id}/${a.name}`).toBeDefined();
    }
  });
});

describe("conseils : un compagnon qui complète le personnage", () => {
  it("chaque compagnon est recommandé pour au moins une classe, et aucun ne l'est pour toutes", () => {
    for (const def of COMPANIONS) {
      const rec = CLASSES.filter((cl) => companionAdvice(cl.id, def.id).recommended);
      expect(rec.length, def.id).toBeGreaterThan(0);
      expect(rec.length, def.id).toBeLessThan(CLASSES.length);
    }
  });
  it("un magicien a besoin d'une défenseuse ; un guerrier, d'un soigneur ou d'une archère", () => {
    expect(companionAdvice("wizard", "ysolde", "Magicien")).toMatchObject({ recommended: true });
    expect(companionAdvice("wizard", "ysolde", "Magicien").reason).toContain("magicien");
    expect(companionAdvice("fighter", "ysolde").recommended).toBe(false);
    expect(companionAdvice("fighter", "anselme").recommended).toBe(true);
    expect(companionAdvice("fighter", "mila").recommended).toBe(true);
    expect(companionAdvice("cleric", "anselme").recommended).toBe(false);
  });
});

describe("le compagnon en combat", () => {
  it("joue tout seul : le joueur ne contrôle que son héros", () => {
    const s = fight(hero("fighter", [companionFlag("ysolde")]), [rat(3)]);
    expect(currentCombatant(s).id).toBe("h");
    playerEndTurn(s, () => 0.5);
    expect(currentCombatant(s).id).toBe("h"); // le tour d'Ysolde et celui du rat sont passés
    expect(s.log.some((l) => l.startsWith("Ysolde attaque Rat"))).toBe(true);
    expect(playerOptions(s).canAct).toBe(true);
  });
  it("la défenseuse frappe l'ennemi le plus proche du héros", () => {
    const s = fight(hero("fighter", [companionFlag("ysolde")]), [rat(3), rat(9, { id: "rat2", name: "Rat lointain", pos: { x: 3, y: 6 } })], {}, { pos: { x: 3, y: 5 } });
    playerEndTurn(s, () => 0.5);
    expect(s.log.some((l) => l.startsWith("Ysolde attaque Rat ("))).toBe(true);
  });
  it("à 0 PV, il est hors de combat mais ne meurt jamais ; le combat continue tant que le héros tient", () => {
    const s = fight(hero("fighter", [companionFlag("ysolde")]), [rat(3, { attacks: [{ name: "Croc", toHit: 30, damage: { count: 0, sides: 1, bonus: 50 }, damageType: "perforant", ranged: false }], pos: { x: 3, y: 5 } })], { pos: { x: 10, y: 0 } }, { hp: 3 });
    playerEndTurn(s, () => 0.5);
    const y = getCombatant(s, "compagnon:ysolde");
    expect(y.hp).toBe(0);
    expect(y.dead).toBe(false);
    expect(y.stable).toBe(true);
    expect(s.status).toBe("ongoing");
  });
  it("le soigneur relève le héros tombé, puis lance Flamme sacrée sur un ennemi lointain", () => {
    const c = hero("fighter", [companionFlag("anselme")]);
    const s = fight(c, [rat(12)], { initiativeBonus: 10, hp: 1 }, { initiativeBonus: 20 });
    const h = getCombatant(s, "h");
    // Anselme joue avant le héros : le héros, à 1 PV (moins de la moitié), est soigné.
    expect(s.log.some((l) => l.includes("Anselme lance Soins sur Aria"))).toBe(true);
    expect(h.hp).toBeGreaterThan(1);
    expect(getCombatant(s, "compagnon:anselme").healing!.uses).toBe(2);
    playerEndTurn(s, () => 0.5);
    expect(s.log.some((l) => l.includes("lance Flamme sacrée sur Rat"))).toBe(true);
  });
  it("défaite si le héros meurt, même si le compagnon est debout", () => {
    const s = fight(hero("fighter", [companionFlag("ysolde")]), [rat(14)]);
    applyDamage(s, getCombatant(s, "h"), 999, false); // dégâts massifs : mort sur le coup
    processTurns(s, () => 0.5);
    expect(s.status).toBe("defeat");
  });
  it("un héros soigneur peut soigner son compagnon (Soin des blessures, au contact)", () => {
    const c = hero("cleric", [companionFlag("ysolde")]);
    const s = fight(c, [rat(14)], {}, { hp: 2 });
    castSpell(s, "cure-wounds", () => 0.5, { targetId: "compagnon:ysolde" });
    expect(getCombatant(s, "compagnon:ysolde").hp).toBeGreaterThan(2);
    expect(() => castSpell(s, "cure-wounds", () => 0.5, { targetId: "rat" })).toThrow();
  });
  it("se place à côté du héros sur le terrain", () => {
    const setup = buildSetup(1, undefined, 1);
    expect(setup.allies).toHaveLength(1);
    expect(Math.max(Math.abs(setup.allies[0].x - setup.hero.x), Math.abs(setup.allies[0].y - setup.hero.y))).toBe(1);
  });
});

describe("le compagnon entre les combats", () => {
  it("ses PV et soins sont gardés après le combat, et reviennent avec les repos", () => {
    const c = hero("fighter", [companionFlag("anselme")]);
    const s = fight(c, [rat(14)], {}, { hp: 3 });
    getCombatant(s, "compagnon:anselme").healing!.uses = 1;
    const v = vitalsAfterCombat(c, s);
    expect(v.companions?.anselme).toEqual({ hp: 3, heals: 1 });
    const after = { ...c, vitals: v };
    expect(shortRest(after, 0).vitals.companions?.anselme.hp).toBe(3 + 4);
    expect(companionVitals({ ...after, vitals: longRest(after).vitals }, COMPANION_BY_ID.anselme)).toEqual({ hp: 9, heals: 3 });
  });
});

describe("recrutement dans l'histoire", () => {
  const story = STORY_BY_ID.brumeval;
  it("chaque compagnon peut être recruté quelque part dans l'histoire, et l'histoire reste valide", () => {
    const all = new Set(Object.values(story.scenes).flatMap((sc) => sc.choices.map((ch) => recruitedBy(ch)?.id).filter(Boolean)));
    expect([...all].sort()).toEqual(COMPANIONS.map((c) => c.id).sort());
    expect(validateStory(story, "maire")).toEqual([]);
  });
  it("le recrutement dépend de ce que le joueur a fait", () => {
    const leadsTo = (scene: string, flags: string[], target: string) =>
      availableChoices(story.scenes[scene], flags, { gold: 0, items: {} }).some((v) => v.choice.goto === target);
    // Ysolde : seulement une fois l'enquête acceptée.
    expect(leadsTo("maire", [], "maire-ysolde")).toBe(false);
    expect(leadsTo("maire", ["quete-acceptee"], "maire-ysolde")).toBe(true);
    expect(leadsTo("maire", ["quete-acceptee", "compagnon:ysolde"], "maire-ysolde")).toBe(false);
    // Anselme : il faut le convaincre, à moins de savoir ce qui se cache dans la crypte.
    const direct = (flags: string[]) => availableChoices(story.scenes.anselme, flags).filter((v) => !v.choice.check && recruitedBy(v.choice)).length;
    expect(direct([])).toBe(0);
    expect(direct(["pere-disparu"])).toBe(1);
    expect(direct(["pere-disparu", "tunnel-vu"])).toBe(2);
    // Mila : après le loup de la ferme.
    expect(leadsTo("fermier", ["loup-signale"], "mila")).toBe(false);
    expect(leadsTo("fermier", ["loup-signale", "indice-ferme"], "mila")).toBe(true);
  });
  it("Ysolde : gratuite, sauf si l'on a arraché une forte récompense à la maire", () => {
    const sc = story.scenes["maire-ysolde"];
    const free = availableChoices(sc, ["quete-acceptee"], { gold: 0, items: {} }).map((v) => v.choice);
    expect(free.some((ch) => recruitedBy(ch) && !ch.gold && !ch.unset)).toBe(true);
    const rich = availableChoices(sc, ["quete-acceptee", "recompense-haute"], { gold: 20, items: {} }).map((v) => v.choice).filter((ch) => recruitedBy(ch));
    expect(rich.map((ch) => ch.gold ?? 0)).toContain(-15);
    expect(rich.some((ch) => ch.unset?.includes("recompense-haute"))).toBe(true);
    expect(rich.every((ch) => ch.gold || ch.unset)).toBe(true);
  });
  it("Corentin ne rejoint que celui qui a épargné le pillard et le convainc", () => {
    const sc = story.scenes["tombe-aveu"];
    const choice = sc.choices.find((ch) => recruitedBy(ch)?.id === "corentin")!;
    const win = resolveChoice(sc, sc.choices.indexOf(choice), ["pillard-avoue"], () => 20, () => 0.5);
    expect(win.flags).toContain("compagnon:corentin");
    const lose = resolveChoice(sc, sc.choices.indexOf(choice), ["pillard-avoue"], () => -20, () => 0.5);
    expect(lose.flags).not.toContain("compagnon:corentin");
  });
  it("Anselme : un échec à le convaincre oblige à revenir avec ce que l'on a appris", () => {
    const sc = story.scenes.anselme;
    const persuade = sc.choices.findIndex((ch) => ch.check);
    const ko = resolveChoice(sc, persuade, [], () => -20, () => 0.5);
    expect(ko.flags).toContain("anselme-hesite");
    expect(availableChoices(sc, ko.flags).some((v) => v.index === persuade)).toBe(false);
    expect(availableChoices(sc, [...ko.flags, "pere-disparu"]).some((v) => recruitedBy(v.choice)?.id === "anselme")).toBe(true);
  });
  it("le compagnon actif suit l'ordre de recrutement", () => {
    expect(activeCompanion(hero("wizard", [companionFlag("mila"), companionFlag("ysolde")]))?.id).toBe("mila");
  });
});

describe("Attaque sournoise avec un compagnon", () => {
  it("le roublard l'obtient sans avantage quand son compagnon est au contact de la cible", () => {
    const c = hero("rogue", [companionFlag("ysolde")]);
    const run = (allyPos: { x: number; y: number }) => {
      const s = fight(c, [rat(3)], {}, { pos: allyPos });
      const me = getCombatant(s, "h");
      const finesse = me.attacks.find((a) => a.sneak && !a.ranged)!;
      resolveAttack(s, me, getCombatant(s, "rat"), { ...finesse, toHit: 30 }, () => 0.5);
      return s.rolls.some((r) => r.title.includes("Attaque sournoise"));
    };
    expect(run({ x: 4, y: 3 })).toBe(true); // Ysolde touche le rat
    expect(run({ x: 10, y: 6 })).toBe(false); // trop loin
  });
});
