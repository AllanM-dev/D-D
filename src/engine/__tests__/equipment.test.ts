import { describe, expect, it } from "vitest";
import { ARMORS, CLASS_TRAINING, STARTING_KITS, WEAPONS } from "../../data/equipment";
import { CLASSES } from "../../data/classes";
import { buildCharacter, validateDraft, type CharacterDraft } from "../character";
import { computeEquipment, getKit, isWeaponProficient, migrateCharacter, type EquipmentInput } from "../equipment";
import { abilityModifier } from "../rules";
import type { AbilityScores } from "../abilities";

const mods = (s: AbilityScores): AbilityScores =>
  ({ STR: abilityModifier(s.STR), DEX: abilityModifier(s.DEX), CON: abilityModifier(s.CON), INT: abilityModifier(s.INT), WIS: abilityModifier(s.WIS), CHA: abilityModifier(s.CHA) });

const input = (classId: string, scores: Partial<AbilityScores> = {}, baseSpeed = 30): EquipmentInput => {
  const full: AbilityScores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10, ...scores };
  return { classId, scores: full, modifiers: mods(full), proficiencyBonus: 2, baseSpeed };
};
const ac = (classId: string, scores: Partial<AbilityScores> = {}, kitId?: string) =>
  computeEquipment(input(classId, scores), kitId).armorClass;

describe("données d'équipement", () => {
  it("chaque classe a un équipement de départ et des maîtrises", () => {
    for (const c of CLASSES) {
      expect(STARTING_KITS[c.id]?.length, c.id).toBeGreaterThan(0);
      expect(CLASS_TRAINING[c.id], c.id).toBeTruthy();
    }
  });
  it("les lots ne citent que des armes et armures qui existent", () => {
    for (const kits of Object.values(STARTING_KITS))
      for (const k of kits)
        for (const e of k.entries) {
          if ("weapon" in e) expect(WEAPONS.some((w) => w.id === e.weapon), e.weapon).toBe(true);
          if ("armor" in e) expect(ARMORS.some((a) => a.id === e.armor), e.armor).toBe(true);
        }
  });
  it("une classe sait toujours se servir de son équipement de départ", () => {
    for (const c of CLASSES)
      for (const k of STARTING_KITS[c.id])
        for (const e of k.entries) {
          if ("weapon" in e) expect(isWeaponProficient(c.id, WEAPONS.find((w) => w.id === e.weapon)!), `${c.id}/${e.weapon}`).toBe(true);
          if ("armor" in e) {
            const kind = ARMORS.find((a) => a.id === e.armor)!.kind;
            expect(CLASS_TRAINING[c.id].armor, `${c.id}/${e.armor}`).toContain(kind);
          }
        }
  });
});

describe("classe d'armure", () => {
  it("sans armure : 10 + Dextérité", () => {
    expect(ac("wizard", { DEX: 14 })).toBe(12);
  });
  it("armure légère : base + Dextérité", () => {
    expect(ac("rogue", { DEX: 16 })).toBe(11 + 3);
  });
  it("armure intermédiaire : Dextérité plafonnée à +2, plus le bouclier", () => {
    expect(ac("cleric", { DEX: 18 })).toBe(13 + 2 + 2);
  });
  it("armure lourde : pas de Dextérité ; avec bouclier +2", () => {
    expect(ac("fighter", { DEX: 18 })).toBe(16);
    expect(ac("paladin", { DEX: 8 })).toBe(18);
  });
  it("le lot B du guerrier donne une armure légère", () => {
    expect(ac("fighter", { DEX: 14 }, "B")).toBe(12 + 2);
  });
  it("défense sans armure du barbare et du moine", () => {
    expect(ac("barbarian", { DEX: 14, CON: 16 })).toBe(10 + 2 + 3);
    expect(ac("monk", { DEX: 16, WIS: 14 })).toBe(10 + 3 + 2);
  });
  it("le druide en cuir avec bouclier", () => {
    expect(ac("druid", { DEX: 12 })).toBe(11 + 1 + 2);
  });
  it("la cotte de mailles ralentit sous Force 13", () => {
    expect(computeEquipment(input("fighter", { STR: 8 })).speed).toBe(20);
    expect(computeEquipment(input("fighter", { STR: 13 })).speed).toBe(30);
    expect(computeEquipment(input("fighter", { STR: 8 }), "B").speed).toBe(30);
  });
});

describe("attaques", () => {
  const find = (r: ReturnType<typeof computeEquipment>, name: string) => r.attacks.find((a) => a.name === name)!;
  it("le magicien a le trait de feu (Intelligence) et ses dagues", () => {
    const r = computeEquipment(input("wizard", { INT: 16, DEX: 14, STR: 8 }));
    expect(find(r, "Trait de feu")).toMatchObject({ toHit: 3 + 2, damage: { sides: 10, bonus: 0 }, ranged: true });
    expect(find(r, "Dague")).toMatchObject({ toHit: 2 + 2, damage: { sides: 4, bonus: 2 } }); // finesse : Dextérité
  });
  it("une arme à distance utilise la Dextérité", () => {
    const r = computeEquipment(input("ranger", { DEX: 16, STR: 8 }));
    expect(find(r, "Arc long")).toMatchObject({ toHit: 3 + 2, damage: { count: 1, sides: 8, bonus: 3 }, ranged: true });
  });
  it("une arme de mêlée sans finesse utilise la Force, même avec une grande Dextérité", () => {
    const r = computeEquipment(input("fighter", { STR: 12, DEX: 18 }));
    expect(find(r, "Épée à deux mains")).toMatchObject({ toHit: 1 + 2, damage: { count: 2, sides: 6, bonus: 1 } });
  });
  it("le roublard utilise la Dextérité avec une arme à finesse", () => {
    const r = computeEquipment(input("rogue", { STR: 8, DEX: 16 }));
    expect(find(r, "Épée courte")).toMatchObject({ toHit: 3 + 2, damage: { bonus: 3 } });
  });
  it("le moine frappe à mains nues avec 1d6 + Dextérité", () => {
    const r = computeEquipment(input("monk", { DEX: 16, STR: 8 }));
    expect(find(r, "Frappe à mains nues")).toMatchObject({ toHit: 3 + 2, damage: { count: 1, sides: 6, bonus: 3 }, ranged: false });
    expect(find(r, "Lance").toHit).toBe(3 + 2); // arme de moine : Dextérité
  });
  it("une arme polyvalente passe à deux mains sans bouclier", () => {
    expect(find(computeEquipment(input("wizard")), "Bâton").damage.sides).toBe(8);
    expect(find(computeEquipment(input("druid")), "Bâton").damage.sides).toBe(6); // bouclier
  });
  it("une arme de jet a une variante à distance", () => {
    const r = computeEquipment(input("barbarian", { STR: 16 }));
    expect(find(r, "Hachette")).toMatchObject({ ranged: false });
    expect(find(r, "Hachette (lancer)")).toMatchObject({ ranged: true, toHit: 3 + 2 });
  });
  it("propose en premier l'attaque la plus intéressante", () => {
    expect(computeEquipment(input("fighter", { STR: 16 })).attacks[0].name).toBe("Épée à deux mains");
    expect(computeEquipment(input("wizard", { INT: 16 })).attacks[0].name).toBe("Trait de feu");
  });
});

describe("inventaire et personnage", () => {
  it("regroupe les armes identiques et garde l'or", () => {
    const r = computeEquipment(input("barbarian"));
    expect(r.equipment.weapons).toContainEqual({ id: "handaxe", name: "Hachette", qty: 4 });
    expect(r.equipment.gold).toBe(15);
    expect(r.equipment.armor).toBeUndefined();
  });
  it("refuse un lot inconnu", () => {
    expect(() => getKit("fighter", "Z")).toThrow();
    const draft: CharacterDraft = {
      name: "T", speciesId: "human", classId: "fighter", backgroundId: "soldier", method: "standard",
      baseScores: { STR: 15, DEX: 13, CON: 14, INT: 8, WIS: 10, CHA: 12 }, bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
      classSkills: ["perception", "survival"], kitId: "Z",
    };
    expect(validateDraft(draft)).not.toEqual([]);
    expect(validateDraft({ ...draft, kitId: "B" })).toEqual([]);
    expect(buildCharacter({ ...draft, kitId: "B" }, "x").equipment.armor?.id).toBe("studded-leather");
  });
  it("donne un équipement aux personnages sauvegardés avant cette fonctionnalité", () => {
    const old = buildCharacter(
      { name: "Ancien", speciesId: "human", classId: "wizard", backgroundId: "sage", method: "standard",
        baseScores: { STR: 8, DEX: 13, CON: 14, INT: 15, WIS: 12, CHA: 10 }, bonus: { mode: "2/1", plus2: "INT", plus1: "CON" },
        classSkills: ["investigation", "medicine"] }, "old");
    const legacy: Record<string, unknown> = { ...old };
    delete legacy.equipment;
    delete legacy.attacks;
    const migrated = migrateCharacter(legacy as unknown as typeof old);
    expect(migrated.attacks.length).toBeGreaterThan(0);
    expect(migrated.equipment.gold).toBe(5);
    // un personnage déjà équipé n'est pas modifié
    expect(migrateCharacter(old)).toBe(old);
  });
});
