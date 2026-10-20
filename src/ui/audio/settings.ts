/** Réglages du son, enregistrés dans le stockage local (séparément des personnages). */
export interface SoundSettings {
  musicOn: boolean;
  /** Volume de la musique, de 0 à 1. */
  musicVolume: number;
  sfxOn: boolean;
  /** Volume des effets sonores, de 0 à 1. */
  sfxVolume: number;
}

export const SOUND_KEY = "dd-mobile.sound";
export const DEFAULT_SOUND: SoundSettings = { musicOn: true, musicVolume: 0.6, sfxOn: true, sfxVolume: 0.8 };

const clamp01 = (n: unknown, fallback: number) => (typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback);

/** Lit des réglages enregistrés : une valeur absente ou abîmée reprend sa valeur par défaut. */
export function parseSound(raw: string | null): SoundSettings {
  let data: Partial<SoundSettings> = {};
  try {
    data = raw ? (JSON.parse(raw) as Partial<SoundSettings>) ?? {} : {};
  } catch {
    data = {};
  }
  return {
    musicOn: typeof data.musicOn === "boolean" ? data.musicOn : DEFAULT_SOUND.musicOn,
    musicVolume: clamp01(data.musicVolume, DEFAULT_SOUND.musicVolume),
    sfxOn: typeof data.sfxOn === "boolean" ? data.sfxOn : DEFAULT_SOUND.sfxOn,
    sfxVolume: clamp01(data.sfxVolume, DEFAULT_SOUND.sfxVolume),
  };
}

/** Gain réel d'un volume : la perception du volume n'est pas linéaire, on suit une courbe au carré. */
export const gainOf = (on: boolean, volume: number) => (on ? volume * volume : 0);
