import { getItem, type Loot } from "../data/items";
import { MAPS } from "../data/maps";
import type { Character } from "./character";
import { getCombatant, type CombatState } from "./combat";
import { rollDie, type Rng } from "./dice";
import { vitalsOf, type Vitals } from "./rest";

export type Inventory = Record<string, number>;

export const inventoryOf = (c: Pick<Character, "inventory">): Inventory => ({ ...(c.inventory ?? {}) });
export const itemCount = (c: Pick<Character, "inventory">, id: string) => c.inventory?.[id] ?? 0;

/** Ajoute (ou retire, si négatif) des objets ; les quantités ne descendent jamais sous zéro et les entrées vides disparaissent. */
export function changeItems(inv: Inventory, delta: Record<string, number>): Inventory {
  const out = { ...inv };
  for (const [id, n] of Object.entries(delta)) {
    if (!getItem(id)) throw new Error(`Objet inconnu : ${id}`);
    const q = Math.max(0, (out[id] ?? 0) + n);
    if (q) out[id] = q;
    else delete out[id];
  }
  return out;
}

/** Texte du butin : « 12 po, Potion de soin × 2 ». */
export function describeLoot(loot: Loot): string {
  const parts: string[] = [];
  if (loot.gold) parts.push(`${loot.gold} po`);
  for (const [id, n] of Object.entries(loot.items ?? {})) parts.push(n > 1 ? `${getItem(id)?.name ?? id} × ${n}` : (getItem(id)?.name ?? id));
  return parts.join(", ");
}

export interface PotionResult {
  vitals: Vitals;
  inventory: Inventory;
  dice: number[];
  healed: number;
}

/** Boire une potion de soin hors combat : 2d4 + 2 PV, plafonnés aux PV maximum. */
export function drinkPotion(c: Character, rng: Rng = Math.random): PotionResult {
  if (itemCount(c, "healing-potion") < 1) throw new Error("Aucune potion de soin.");
  const v = vitalsOf(c);
  if (v.hp >= c.maxHp) throw new Error("Points de vie déjà au maximum.");
  const dice = [rollDie(4, rng), rollDie(4, rng)];
  const healed = Math.min(c.maxHp - v.hp, dice[0] + dice[1] + 2);
  return {
    vitals: { ...v, hp: v.hp + healed },
    inventory: changeItems(inventoryOf(c), { "healing-potion": -1 }),
    dice, healed,
  };
}

/** Un héros peut-il boire une potion maintenant ? */
export const canDrink = (c: Character) => itemCount(c, "healing-potion") > 0 && vitalsOf(c).hp < c.maxHp;

/** Butin laissé par un ennemi de la carte (identifiant de la carte). */
export function enemyLoot(enemyId: string): Loot {
  for (const m of MAPS) {
    const e = m.enemies.find((x) => x.id === enemyId);
    if (e) return e.loot ?? {};
  }
  return {};
}

/** Potions qu'il reste au héros à la fin d'un combat (undefined s'il n'en avait pas au départ). */
export function potionsLeft(state: CombatState, heroId: string): number | undefined {
  return getCombatant(state, heroId).features.find((f) => f.id === "potion")?.uses;
}
