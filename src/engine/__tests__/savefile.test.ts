import { describe, expect, it } from "vitest";
import { CLASSES } from "../../data/classes";
import { defaultSpells } from "../../data/spells";
import { buildCharacter, type Character } from "../character";
import { exportSave, mergeCharacters, parseSave } from "../savefile";

function hero(id: string, name = "T"): Character {
  const c = CLASSES.find((x) => x.id === "fighter")!;
  return { ...buildCharacter({
    name, speciesId: "human", classId: "fighter", backgroundId: "soldier", method: "standard",
    baseScores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
    classSkills: c.skillChoices.from.filter((s) => s !== "athletics" && s !== "intimidation").slice(0, c.skillChoices.count),
    fightingStyle: "defense", spells: defaultSpells("fighter"),
  }, id) };
}

describe("sauvegarde exportable", () => {
  it("fait l'aller-retour export → lecture", () => {
    const list = [hero("a", "Aria"), hero("b", "Bor")];
    const r = parseSave(exportSave(list));
    expect("characters" in r && r.characters.map((c) => c.name)).toEqual(["Aria", "Bor"]);
  });
  it("refuse un texte illisible, un autre format ou une version inconnue", () => {
    expect(parseSave("pas du json")).toHaveProperty("error");
    expect(parseSave(JSON.stringify({ foo: 1 }))).toHaveProperty("error");
    expect(parseSave(JSON.stringify({ app: "dd-mobile", version: 9, characters: [] }))).toHaveProperty("error");
    expect(parseSave(JSON.stringify({ app: "dd-mobile", version: 1, characters: [{ x: 1 }] }))).toHaveProperty("error");
  });
  it("ignore les entrées invalides mais garde les bonnes", () => {
    const text = JSON.stringify({ app: "dd-mobile", version: 1, characters: [{ x: 1 }, hero("a")] });
    const r = parseSave(text);
    expect("characters" in r && r.characters).toHaveLength(1);
  });
  it("fusionne : ajoute les nouveaux, remplace ceux de même identifiant", () => {
    const m = mergeCharacters([hero("a", "Ancien")], [hero("a", "Nouveau"), hero("b")]);
    expect(m.added).toBe(1);
    expect(m.replaced).toBe(1);
    expect(m.list.map((c) => c.name)).toEqual(["Nouveau", "T"]);
  });
});
