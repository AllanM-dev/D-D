import { ARMORS, WEAPONS } from "../data/equipment";
import { armorItemId, weaponItemId } from "../data/items";
import type { Character } from "./character";
import { deriveStats, type EquipmentInput, type Loadout } from "./equipment";
import { changeItems, inventoryOf, itemCount } from "./inventory";

/** Ce que change un changement d'équipement sur le personnage. */
export type LoadoutPatch = Pick<Character, "equipment" | "attacks" | "armorClass" | "speed"> & { inventory: Record<string, number> };

export const loadoutOf = (c: Pick<Character, "equipment">): Loadout => ({
  armor: c.equipment.armor, shield: c.equipment.shield, weapons: c.equipment.weapons.map((w) => ({ ...w })),
});

const inputOf = (c: Character): EquipmentInput => ({
  classId: c.classDef.id, scores: c.scores, modifiers: c.modifiers, proficiencyBonus: c.proficiencyBonus, baseSpeed: c.species.speed,
  fightingStyle: c.classDef.id === "fighter" ? c.fightingStyle : undefined,
});

/** Applique un équipement au personnage : CA, vitesse et attaques sont recalculées. */
function apply(c: Character, loadout: Loadout, inventory: Record<string, number>): LoadoutPatch {
  const stats = deriveStats(inputOf(c), loadout);
  return {
    equipment: { ...c.equipment, armor: loadout.armor, shield: loadout.shield, weapons: loadout.weapons },
    attacks: stats.attacks, armorClass: stats.armorClass, speed: stats.speed, inventory,
  };
}

/** Équipe un objet du sac à dos (arme en main, armure endossée, bouclier au bras) ; l'ancienne armure retourne dans le sac. */
export function equipItem(c: Character, itemId: string): LoadoutPatch {
  if (itemCount(c, itemId) < 1) throw new Error("Cet objet n'est pas dans le sac.");
  const loadout = loadoutOf(c);
  let inv = changeItems(inventoryOf(c), { [itemId]: -1 });
  if (itemId.startsWith("weapon:")) {
    const w = WEAPONS.find((x) => x.id === itemId.slice(7));
    if (!w) throw new Error("Arme inconnue.");
    const have = loadout.weapons.find((x) => x.id === w.id);
    if (have) have.qty += 1;
    else loadout.weapons.push({ id: w.id, name: w.name, qty: 1 });
  } else if (itemId.startsWith("armor:")) {
    const a = ARMORS.find((x) => x.id === itemId.slice(6));
    if (!a) throw new Error("Armure inconnue.");
    if (a.kind === "shield") {
      if (loadout.shield) throw new Error("Un bouclier est déjà porté.");
      loadout.shield = true;
    } else {
      if (loadout.armor) inv = changeItems(inv, { [armorItemId(loadout.armor.id)]: 1 });
      loadout.armor = { id: a.id, name: a.name };
    }
  } else {
    throw new Error("Cet objet ne s'équipe pas.");
  }
  return apply(c, loadout, inv);
}

export type Slot = { kind: "armor" } | { kind: "shield" } | { kind: "weapon"; id: string };

/** Range un équipement dans le sac à dos. */
export function unequip(c: Character, slot: Slot): LoadoutPatch {
  const loadout = loadoutOf(c);
  let inv = inventoryOf(c);
  if (slot.kind === "armor") {
    if (!loadout.armor) throw new Error("Aucune armure portée.");
    inv = changeItems(inv, { [armorItemId(loadout.armor.id)]: 1 });
    loadout.armor = undefined;
  } else if (slot.kind === "shield") {
    if (!loadout.shield) throw new Error("Aucun bouclier porté.");
    inv = changeItems(inv, { [armorItemId("shield")]: 1 });
    loadout.shield = false;
  } else {
    const w = loadout.weapons.find((x) => x.id === slot.id);
    if (!w) throw new Error("Arme introuvable.");
    inv = changeItems(inv, { [weaponItemId(w.id)]: 1 });
    w.qty -= 1;
    loadout.weapons = loadout.weapons.filter((x) => x.qty > 0);
  }
  return apply(c, loadout, inv);
}

/** Peut-on équiper cet objet maintenant ? */
export const canEquip = (c: Character, itemId: string) => {
  if (itemCount(c, itemId) < 1) return false;
  if (itemId === armorItemId("shield")) return !c.equipment.shield;
  return itemId.startsWith("weapon:") || itemId.startsWith("armor:");
};
