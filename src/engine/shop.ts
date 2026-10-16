import { getItem } from "../data/items";
import { SHOP_BY_ID } from "../data/shops";
import type { Character } from "./character";
import { itemCount } from "./inventory";

/** Prix d'achat : la valeur de l'objet. */
export const buyPrice = (itemId: string) => getItem(itemId)?.value ?? 0;
/** Prix de vente : la moitié de la valeur (au moins 1 po pour un objet qui en vaut). */
export const sellPrice = (itemId: string) => {
  const v = getItem(itemId)?.value ?? 0;
  return v > 0 ? Math.max(1, Math.floor(v / 2)) : 0;
};

export interface Trade {
  /** Or gagné (positif) ou dépensé (négatif). */
  gold: number;
  items: Record<string, number>;
}

export function buy(c: Pick<Character, "equipment">, shopId: string, itemId: string): Trade {
  const shop = SHOP_BY_ID[shopId];
  if (!shop?.stock.includes(itemId)) throw new Error("Cet objet n'est pas en vente ici.");
  const price = buyPrice(itemId);
  if (c.equipment.gold < price) throw new Error("Pas assez d'or.");
  return { gold: -price, items: { [itemId]: 1 } };
}

export function sell(c: Pick<Character, "inventory">, shopId: string, itemId: string): Trade {
  const shop = SHOP_BY_ID[shopId];
  const def = getItem(itemId);
  if (!shop || !def) throw new Error("Objet inconnu.");
  if (itemCount(c, itemId) < 1) throw new Error("Vous n'avez pas cet objet.");
  if (def.kind === "key" || !shop.buys.includes(def.kind) || sellPrice(itemId) <= 0) throw new Error("Le marchand n'en veut pas.");
  return { gold: sellPrice(itemId), items: { [itemId]: -1 } };
}

/** Objets du sac que ce marchand rachète. */
export function sellable(c: Pick<Character, "inventory">, shopId: string): string[] {
  const shop = SHOP_BY_ID[shopId];
  if (!shop) return [];
  return Object.keys(c.inventory ?? {}).filter((id) => {
    const d = getItem(id);
    return !!d && d.kind !== "key" && shop.buys.includes(d.kind) && sellPrice(id) > 0;
  });
}
