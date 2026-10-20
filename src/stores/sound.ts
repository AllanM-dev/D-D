import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { DEFAULT_SOUND, SOUND_KEY, parseSound, type SoundSettings } from "../ui/audio/settings";

function load(): SoundSettings {
  try {
    return parseSound(localStorage.getItem(SOUND_KEY));
  } catch {
    return { ...DEFAULT_SOUND };
  }
}

/** Réglages du son (musique, effets), enregistrés à chaque changement. */
export const useSound = defineStore("sound", () => {
  const settings = ref<SoundSettings>(load());
  watch(settings, (s) => {
    try {
      localStorage.setItem(SOUND_KEY, JSON.stringify(s));
    } catch {
      /* stockage indisponible : les réglages restent pour cette session */
    }
  }, { deep: true });
  const reset = () => { settings.value = { ...DEFAULT_SOUND }; };
  return { settings, reset };
});
