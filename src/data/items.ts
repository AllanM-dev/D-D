/** Objets du sac à dos. Textes originaux en français. */
import { ARMORS, PRICES, WEAPONS } from "./equipment";

export type ItemKind = "consumable" | "treasure" | "key" | "weapon" | "armor";

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
  {
    id: "pendentif-gedeon", name: "Pendentif d'argent", kind: "key",
    text: "Un pendentif d'argent terni, gravé d'une clé et d'une étoile : l'emblème des gardiens de la crypte de Brumeval.",
    note: "Objet de quête : à rendre à Thibaud, l'aubergiste, qui le reconnaîtra.",
  },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const ITEM_KIND_NAMES: Record<ItemKind, string> = {
  consumable: "Consommable", treasure: "Trésor", key: "Objet de quête", weapon: "Arme", armor: "Armure",
};

export const weaponItemId = (id: string) => `weapon:${id}`;
export const armorItemId = (id: string) => `armor:${id}`;

/**
 * Fiche d'un objet du sac : objets de `ITEMS`, ou arme (`weapon:<id>`) et armure (`armor:<id>`) tirées des données d'équipement.
 */
export function getItem(id: string): ItemDef | undefined {
  if (ITEM_BY_ID[id]) return ITEM_BY_ID[id];
  if (id.startsWith("weapon:")) {
    const w = WEAPONS.find((x) => x.id === id.slice(7));
    return w && { id, name: w.name, kind: "weapon", value: PRICES[w.id], text: `${w.category === "simple" ? "Arme courante" : "Arme de guerre"} : ${w.damage.count}d${w.damage.sides} dégâts ${w.damageType}.`, note: "Se range ou s'équipe depuis la fiche du personnage ; achat et vente chez la forgeronne." };
  }
  if (id.startsWith("armor:")) {
    const a = ARMORS.find((x) => x.id === id.slice(6));
    return a && { id, name: a.name, kind: "armor", value: PRICES[a.id], text: a.kind === "shield" ? "Bouclier : +2 à la CA." : `Armure ${a.kind === "light" ? "légère" : a.kind === "medium" ? "intermédiaire" : "lourde"} : CA de base ${a.baseAc}.`, note: "Se range ou s'équipe depuis la fiche du personnage ; achat et vente chez la forgeronne." };
  }
  return undefined;
}

/** Ce qu'une victoire rapporte : de l'or et des objets. */
export interface Loot {
  gold?: number;
  /** Objets reçus : identifiant → quantité. */
  items?: Record<string, number>;
}
