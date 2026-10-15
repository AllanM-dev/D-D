/** Objets du sac à dos. Textes originaux en français. */

export type ItemKind = "consumable" | "treasure" | "key";

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  /** Ce que c'est et à quoi ça sert. */
  text: string;
  /** Valeur indicative en pièces d'or. */
  value?: number;
  /** Ce que fait l'application de cet objet. */
  note: string;
}

export const ITEMS: readonly ItemDef[] = [
  {
    id: "healing-potion", name: "Potion de soin", kind: "consumable", value: 50,
    text: "Un liquide rouge qui rend 2d4 + 2 PV à celui qui la boit. En combat, la boire coûte une action bonus.",
    note: "Utilisable depuis la fiche (hors combat) et en action bonus pendant un combat.",
  },
  {
    id: "gem", name: "Petite gemme", kind: "treasure", value: 10,
    text: "Une pierre taillée qui brille doucement. Elle ne sert à rien d'autre qu'à être vendue.",
    note: "À vendre à l'aubergiste de Brumeval.",
  },
  {
    id: "cle-crypte", name: "Clé de la crypte", kind: "key",
    text: "Une grosse clé rouillée, héritée de père en fils par Thibaud, l'aubergiste de Brumeval.",
    note: "Objet de quête : l'histoire s'en sert pour ouvrir la porte de la crypte.",
  },
  {
    id: "journal-gedeon", name: "Journal de Gédéon", kind: "key",
    text: "Le cahier du gardien de la crypte, couvert de poussière. Il contient la prière du repos.",
    note: "Objet de quête : lu, il permet d'apaiser le gardien de la crypte.",
  },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const ITEM_KIND_NAMES: Record<ItemKind, string> = { consumable: "Consommable", treasure: "Trésor", key: "Objet de quête" };

/** Ce qu'une victoire rapporte : de l'or et des objets. */
export interface Loot {
  gold?: number;
  /** Objets reçus : identifiant → quantité. */
  items?: Record<string, number>;
}
