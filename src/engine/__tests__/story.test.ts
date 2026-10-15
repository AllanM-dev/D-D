import { describe, expect, it } from "vitest";
import { MAP_BY_ID } from "../../data/maps";
import { STORIES, STORY_BY_ID, type Scene } from "../../data/stories";
import { liveSpots, lockedCells, planPath, startExploration, stepTo, validateMap } from "../exploration";
import {
  applyEffects, availableChoices, enterScene, meets, onceFlag, resolveChoice, rollCheck, sceneText, unreachableScenes, validateStory,
} from "../story";
import type { Rng } from "../dice";

const roll = (n: number): Rng => () => (n - 0.5) / 20;
const story = STORY_BY_ID.brumeval;
const bonus = (b: number) => () => b;

const mini: Scene = {
  id: "s", title: "t", text: ["a"], textIf: [{ requires: { flags: ["x"] }, text: ["b"] }, { requires: { notFlags: ["x"] }, text: ["c"] }],
  onEnter: ["vu"],
  choices: [
    { text: "un", goto: "s", once: true },
    { text: "deux", goto: "s", requires: { flags: ["x"], notFlags: ["y"] } },
    { text: "test", check: { skill: "persuasion", dc: 12, success: "ok", failure: "ko", onSuccess: { set: ["gagne"], gold: 5 }, onFailure: { set: ["perdu"] } }, set: ["tente"] },
    { text: "combat", fight: { encounterId: "wolf", win: "ok", lose: "ko" } },
    { text: "fin", end: true, gold: -3 },
  ],
};

describe("conditions et effets", () => {
  it("meets : tous les drapeaux requis, aucun interdit", () => {
    expect(meets(undefined, [])).toBe(true);
    expect(meets({ flags: ["a", "b"] }, ["a"])).toBe(false);
    expect(meets({ flags: ["a"], notFlags: ["z"] }, ["a", "z"])).toBe(false);
    expect(meets({ flags: ["a"], notFlags: ["z"] }, ["a"])).toBe(true);
  });
  it("applyEffects pose, retire et cumule l'or sans doublon", () => {
    const r = applyEffects(["a"], { set: ["b", "a"], gold: 5 }, { unset: ["a"], gold: -2 });
    expect(r.flags).toEqual(["b"]);
    expect(r.gold).toBe(3);
  });
  it("le texte dépend des drapeaux", () => {
    expect(sceneText(mini, [])).toEqual(["a", "c"]);
    expect(sceneText(mini, ["x"])).toEqual(["a", "b"]);
  });
  it("les choix filtrés par conditions et usage unique", () => {
    expect(availableChoices(mini, []).map((c) => c.index)).toEqual([0, 2, 3, 4]);
    expect(availableChoices(mini, ["x"]).map((c) => c.index)).toEqual([0, 1, 2, 3, 4]);
    expect(availableChoices(mini, ["x", "y", onceFlag("s", 0)]).map((c) => c.index)).toEqual([2, 3, 4]);
  });
  it("enterScene pose les drapeaux d'arrivée", () => {
    expect(enterScene(mini, [])).toEqual(["vu"]);
  });
});

describe("résolution des choix", () => {
  it("un choix simple va à la scène suivante et retient l'usage unique", () => {
    const o = resolveChoice(mini, 0, [], bonus(0));
    expect(o.next).toBe("s");
    expect(o.flags).toContain(onceFlag("s", 0));
    expect(() => resolveChoice(mini, 0, o.flags, bonus(0))).toThrow();
  });
  it("un choix indisponible est refusé", () => {
    expect(() => resolveChoice(mini, 1, [], bonus(0))).toThrow();
    expect(() => resolveChoice(mini, 99, [], bonus(0))).toThrow();
  });
  it("un test réussi : scène de réussite, effets propres et du choix", () => {
    const o = resolveChoice(mini, 2, [], bonus(2), roll(11)); // 11 + 2 = 13 ≥ 12
    expect(o.check).toMatchObject({ success: true, total: 13, dc: 12, modifier: 2, natural: 11 });
    expect(o.next).toBe("ok");
    expect(o.flags).toEqual(expect.arrayContaining(["tente", "gagne"]));
    expect(o.gold).toBe(5);
  });
  it("un test raté : scène d'échec et effets d'échec", () => {
    const o = resolveChoice(mini, 2, [], bonus(2), roll(9)); // 11 < 12
    expect(o.check?.success).toBe(false);
    expect(o.next).toBe("ko");
    expect(o.flags).toEqual(expect.arrayContaining(["tente", "perdu"]));
    expect(o.flags).not.toContain("gagne");
    expect(o.gold).toBe(0);
  });
  it("le bonus de compétence compte exactement, et le 20 naturel ne suffit pas à lui seul", () => {
    expect(rollCheck("persuasion", 12, 0, roll(12)).success).toBe(true);
    expect(rollCheck("persuasion", 12, 0, roll(11)).success).toBe(false);
    expect(rollCheck("persuasion", 25, 0, roll(20)).success).toBe(false);
  });
  it("combat, fin et or", () => {
    expect(resolveChoice(mini, 3, [], bonus(0)).fight).toEqual({ encounterId: "wolf", win: "ok", lose: "ko" });
    const end = resolveChoice(mini, 4, [], bonus(0));
    expect(end.end).toBe(true);
    expect(end.gold).toBe(-3);
  });
});

describe("histoires", () => {
  it("chaque histoire est valide : scènes existantes, une issue par choix, compétences et rencontres connues", () => {
    for (const s of STORIES) {
      const spots = MAP_BY_ID.brumeval.spots!.filter((x) => x.story === s.id).map((x) => x.scene);
      expect(validateStory(s, spots[0]), s.id).toEqual([]);
      // aucune scène orpheline : tout est atteignable depuis les lieux de la carte
      expect(unreachableScenes(s, spots), s.id).toEqual([]);
    }
  });
  it("détecte une histoire cassée", () => {
    const broken = { id: "b", title: "b", scenes: { a: { id: "a", title: "a", text: ["x"], choices: [{ text: "y", goto: "nulle part" }] }, c: { id: "c", title: "c", text: [], choices: [] } } };
    expect(validateStory(broken, "a").length).toBeGreaterThanOrEqual(3);
  });
  it("tous les lieux de la carte pointent vers une scène existante", () => {
    for (const sp of MAP_BY_ID.brumeval.spots!) expect(STORY_BY_ID[sp.story]?.scenes[sp.scene], sp.id).toBeTruthy();
  });

  it("la quête de Brumeval se joue de bout en bout (or, clé, porte, victoire contre la goule)", () => {
    const scenes = story.scenes;
    const pick = (scene: string, text: string, flags: string[], b = 5, r: Rng = roll(15)) => {
      const i = availableChoices(scenes[scene], flags).find((c) => c.choice.text.startsWith(text))?.index ?? -1;
      expect(i, `${scene} / ${text}`).toBeGreaterThanOrEqual(0);
      return resolveChoice(scenes[scene], i, flags, bonus(b), r);
    };
    let flags: string[] = [];
    let gold = 0;
    const apply = (o: { flags: string[]; gold: number }) => { flags = o.flags; gold += o.gold; };

    apply(pick("maire", "J'accepte", flags));
    expect(flags).toContain("quete-acceptee");
    apply(pick("aubergiste", "La maire m'envoie", flags)); // → aubergiste-cle
    const key = pick("aubergiste-cle", "Le convaincre", flags); // 15 + 5 ≥ 12
    expect(key.next).toBe("aubergiste-cle-ok");
    apply(pick("aubergiste-cle-ok", "Prendre", flags));
    expect(flags).toContain("cle-crypte");
    apply(pick("crypte", "Ouvrir avec la clé", flags));
    expect(flags).toContain("crypte-ouverte");
    // le Maire ne propose pas encore le retour : la goule n'est pas vaincue
    expect(availableChoices(scenes.maire, flags).some((c) => c.choice.text.startsWith("Je reviens"))).toBe(false);
    flags = [...flags, "defeated:ghoul-1"];
    apply(pick("maire", "Je reviens", flags));
    expect(flags).toContain("quete-terminee");
    expect(gold).toBe(20);
    // plus de retour possible une fois la quête terminée
    expect(availableChoices(scenes.maire, flags).some((c) => c.choice.text.startsWith("Je reviens"))).toBe(false);
  });
  it("marchander réussi donne 50 pièces d'or à la fin", () => {
    const scenes = story.scenes;
    const i = scenes["maire-prix"].choices.findIndex((c) => c.text.startsWith("Marchander"));
    const o = resolveChoice(scenes["maire-prix"], i, [], bonus(3), roll(15));
    expect(o.next).toBe("maire-prix-ok");
    const flags = [...o.flags, "recompense-haute", "quete-acceptee", "defeated:ghoul-1"];
    const j = scenes.maire.choices.findIndex((c) => c.text.startsWith("Je reviens") && c.gold === 50);
    expect(resolveChoice(scenes.maire, j, flags, bonus(0)).gold).toBe(50);
  });
});

describe("lieux et portes sur la carte", () => {
  const m = MAP_BY_ID.brumeval;
  it("la carte est valide avec ses lieux et ses verrous", () => {
    expect(validateMap(m)).toEqual([]);
  });
  it("la porte de la crypte est verrouillée puis s'ouvre avec le drapeau", () => {
    expect(lockedCells(m, [])).toHaveLength(1);
    expect(lockedCells(m, ["crypte-ouverte"])).toHaveLength(0);
    expect(liveSpots(m, []).map((s) => s.id)).toContain("crypte");
    expect(liveSpots(m, ["crypte-ouverte"]).map((s) => s.id)).not.toContain("crypte");
  });
  it("on ne marche pas sur un personnage ; viser un lieu mène à côté", () => {
    const st = startExploration(m);
    const plan = planPath(st, { x: 6, y: 8 }, [])!;
    expect(plan.spot?.id).toBe("maire");
    const last = plan.path.at(-1)!;
    expect(Math.max(Math.abs(last.x - 6), Math.abs(last.y - 8))).toBe(1);
    expect(plan.path.some((c) => c.x === 6 && c.y === 8)).toBe(false);
    st.x = last.x; st.y = last.y;
    expect(planPath(st, { x: 6, y: 8 }, [])!.path).toEqual([]);
    expect(() => stepTo(st, { x: 6, y: 8 }, [])).toThrow();
  });
  it("sans la clé, on ne passe pas la porte ; avec le drapeau, oui", () => {
    const st = startExploration(m);
    st.x = 17; st.y = 10;
    expect(() => stepTo(st, { x: 17, y: 11 }, [])).toThrow();
    expect(() => stepTo({ ...st, explored: [...st.explored] }, { x: 17, y: 11 }, ["crypte-ouverte"])).not.toThrow();
  });
});
