import { ARMORS, WEAPONS } from "./equipment";
import { armorItemId, weaponItemId, type ItemKind } from "./items";

export interface ShopDef {
  id: string;
  name: string;
  text: string;
  /** Objets en vente (identifiants d'objets). */
  stock: string[];
  /** Types d'objets que le marchand rachète (jamais les objets de quête). */
  buys: ItemKind[];
}

const allWeapons = (ids: string[]) => ids.map(weaponItemId);

export const SHOPS: readonly ShopDef[] = [
  {
    id: "auberge",
    name: "L'auberge de Thibaud",
    text: "Quelques fioles sur le comptoir et une balance. « Je ne marchande pas. »",
    stock: ["healing-potion"],
    buys: ["treasure"],
  },
  {
    id: "forge",
    name: "La forge de Maëlle",
    text: "Des armes accrochées aux murs, des armures sur des mannequins de bois. La forgeronne essuie ses mains noires de suie : « Regardez, touchez, mais payez avant de partir. »",
    stock: [
      ...allWeapons(["club", "dagger", "handaxe", "mace", "quarterstaff", "spear", "shortbow", "light-crossbow", "shortsword", "scimitar", "rapier", "longsword", "battleaxe", "warhammer", "morningstar", "trident", "whip", "glaive", "halberd", "greataxe", "greatsword", "maul", "longbow"]),
      ...["padded", "leather", "studded-leather", "hide", "chain-shirt", "breastplate", "ring-mail", "chain-mail", "shield"].map(armorItemId),
    ],
    buys: ["weapon", "armor", "treasure"],
  },
];

export const SHOP_BY_ID: Record<string, ShopDef> = Object.fromEntries(SHOPS.map((s) => [s.id, s]));

/** Les identifiants d'armes et d'armures du stock existent dans les données d'équipement. */
export const stockExists = (shop: ShopDef) =>
  shop.stock.every((id) => (id.startsWith("weapon:") ? WEAPONS.some((w) => w.id === id.slice(7)) : id.startsWith("armor:") ? ARMORS.some((a) => a.id === id.slice(6)) : true));
