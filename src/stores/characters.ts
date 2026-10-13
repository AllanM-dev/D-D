import { defineStore } from "pinia";
import { ref } from "vue";
import type { Character } from "../engine/character";

const KEY = "dd-mobile.characters";

function load(): Character[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Character[]) : [];
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
  const get = (id: string) => list.value.find((c) => c.id === id);

  return { list, add, remove, get };
});

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
