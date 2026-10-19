import { describe, expect, it } from "vitest";
import { CLASSES } from "../../data/classes";
import { defaultSpells } from "../../data/spells";
import { buildCharacter, type Character } from "../character";
import { clone } from "../clone";
import { migrate } from "../migrate";
import { exportSave, parseSave } from "../savefile";

function hero(): Character {
  const c = CLASSES.find((x) => x.id === "fighter")!;
  return buildCharacter({
    name: "Ancien", speciesId: "human", classId: "fighter", backgroundId: "soldier", method: "standard",
    baseScores: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
    classSkills: c.skillChoices.from.filter((s) => s !== "athletics" && s !== "intimidation").slice(0, c.skillChoices.count),
    fightingStyle: "defense", spells: defaultSpells("fighter"),
  }, "old");
}

/** Personnage tel qu'enregistré avant l'expérience et les maîtrises d'arme. */
function oldSave(): Character {
  const c = { ...hero(), exploration: { mapId: "brumeval", x: 0, y: 0, explored: [], defeated: ["wolf-1"] }, story: { flags: [] } } as Character;
  delete (c as Partial<Character>).xp;
  delete (c as Partial<Character>).masteries;
  return c;
}

describe("migration des sauvegardes", () => {
  it("met à niveau un ancien personnage : expérience rétroactive et maîtrises par défaut", () => {
    const m = migrate(oldSave());
    expect(m.xp).toBe(50);
    expect(m.masteries?.length).toBeGreaterThan(0);
  });
  it("ne change rien quand on l'applique deux fois", () => {
    const once = migrate(oldSave());
    expect(migrate(clone(once))).toEqual(once);
  });
  it("s'applique aussi aux personnages importés d'un fichier", () => {
    const r = parseSave(exportSave([oldSave()]));
    if ("error" in r) throw new Error(r.error);
    expect(r.characters.map(migrate)[0].xp).toBe(50);
  });
});

describe("copie profonde", () => {
  it("rend un objet indépendant de l'original", () => {
    const a = { x: [1, { y: 2 }] };
    const b = clone(a);
    (b.x[1] as { y: number }).y = 3;
    expect(a).toEqual({ x: [1, { y: 2 }] });
  });
});
