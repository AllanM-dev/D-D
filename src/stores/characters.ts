import { defineStore } from "pinia";
import { ref } from "vue";
import type { Character } from "../engine/character";
import { migrateSpells } from "../engine/character";
import { migrateCharacter } from "../engine/equipment";
import type { ExplorationState } from "../engine/exploration";
import type { Vitals } from "../engine/rest";
import type { Applied } from "../engine/story";
import type { Loot } from "../data/items";
import type { LoadoutPatch } from "../engine/loadout";
import { changeItems, inventoryOf } from "../engine/inventory";

const KEY = "dd-mobile.characters";

function load(): Character[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Character[]).map((c) => migrateSpells(migrateCharacter(c))) : [];
  } catch {
    return [];
  }
}

export const useCharacters = defineStore("characters", () => {
  const list = ref<Character[]>(load());

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.value));
    } catch {
      /* stockage indisponible (navigation privée…) : la liste reste en mémoire */
    }
  }
  const add = (c: Character) => { list.value.push(c); persist(); };
  const remove = (id: string) => { list.value = list.value.filter((c) => c.id !== id); persist(); };
  const setVitals = (id: string, v: Vitals) => {
    const c = list.value.find((x) => x.id === id);
    if (c) { c.vitals = v; persist(); }
  };
  const setExploration = (id: string, e: ExplorationState) => {
    const c = list.value.find((x) => x.id === id);
    if (c) { c.exploration = JSON.parse(JSON.stringify(e)); persist(); }
  };
  /** Enregistre les drapeaux de l'histoire, l'or et les objets gagnés ou dépensés. */
  const setStory = (id: string, a: Pick<Applied, "flags" | "gold"> & { items?: Record<string, number> }) => {
    const c = list.value.find((x) => x.id === id);
    if (!c) return;
    c.story = { flags: [...a.flags] };
    if (a.gold) c.equipment.gold = Math.max(0, c.equipment.gold + a.gold);
    if (a.items && Object.keys(a.items).length) c.inventory = changeItems(inventoryOf(c), a.items);
    persist();
  };
  /** Ajoute un butin (or et objets) au personnage. */
  const addLoot = (id: string, loot: Loot) => {
    const c = list.value.find((x) => x.id === id);
    if (!c) return;
    if (loot.gold) c.equipment.gold += loot.gold;
    if (loot.items) c.inventory = changeItems(inventoryOf(c), loot.items);
    persist();
  };
  /** Applique un changement d'équipement (armes, armure, bouclier, attaques, CA, vitesse) et le nouveau contenu du sac. */
  const applyLoadout = (id: string, patch: LoadoutPatch) => {
    const c = list.value.find((x) => x.id === id);
    if (!c) return;
    c.equipment = patch.equipment;
    c.attacks = patch.attacks;
    c.armorClass = patch.armorClass;
    c.speed = patch.speed;
    c.inventory = { ...patch.inventory };
    persist();
  };
  /** Remplace le sac à dos (et les PV) après avoir bu une potion ou combattu. */
  const setInventory = (id: string, inventory: Record<string, number>) => {
    const c = list.value.find((x) => x.id === id);
    if (c) { c.inventory = { ...inventory }; persist(); }
  };
  const get = (id: string) => list.value.find((c) => c.id === id);

  return { list, add, remove, get, setVitals, setExploration, setStory, addLoot, setInventory, applyLoadout };
});

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
