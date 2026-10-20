/**
 * Son de l'application : musique d'ambiance générée et effets sonores synthétisés (Web Audio, aucun fichier).
 * `installSound` se branche au démarrage ; les écrans appellent `setMood` et `playSfx`.
 */
import { watch } from "vue";
import { moodForPath } from "./composer";
import { installAudio, setBusGains } from "./context";
import { setMood, setMusicEnabled } from "./music";
import { gainOf, type SoundSettings } from "./settings";
import { setSfxEnabled } from "./sfx";
import type { Router } from "vue-router";

export { moodForMap, moodForPath, type Mood } from "./composer";
export { setMood } from "./music";
export { playSfx, sfxForRoll, type Sfx } from "./sfx";

/** Branche le son : déblocage au premier geste, ambiance selon l'écran, réglages appliqués en direct. */
export function installSound(router: Router, settings: () => SoundSettings) {
  installAudio();
  router.afterEach((to) => {
    const mood = moodForPath(to.path);
    if (mood) setMood(mood);
  });
  watch(settings, (s) => {
    setBusGains(gainOf(s.musicOn, s.musicVolume), gainOf(s.sfxOn, s.sfxVolume));
    setMusicEnabled(s.musicOn && s.musicVolume > 0);
    setSfxEnabled(s.sfxOn && s.sfxVolume > 0);
  }, { immediate: true, deep: true });
}
