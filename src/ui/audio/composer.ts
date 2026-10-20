import type { Rng } from "../../engine/dice";

/**
 * Composition de la musique d'ambiance, mesure par mesure : une suite d'accords par ambiance, et des notes tirées
 * au hasard (hasard injecté) dans la gamme. Aucun fichier audio : tout est joué par le synthétiseur (`music.ts`).
 */
export type Mood = "menu" | "village" | "dungeon" | "combat" | "story";
export type Voice = "pad" | "bass" | "lead" | "kick" | "hat";

export interface NoteEvent {
  /** Début, en temps depuis le début de la mesure (0 à 4). */
  beat: number;
  /** Durée en temps. */
  beats: number;
  /** Hauteur MIDI (60 = do central) ; sans objet pour les percussions. */
  midi: number;
  voice: Voice;
  /** Intensité de 0 à 1. */
  velocity: number;
}

export interface MoodDef {
  label: string;
  /** Temps par minute. */
  tempo: number;
  /** Tonique (MIDI). */
  root: number;
  /** Gamme : demi-tons au-dessus de la tonique. */
  scale: number[];
  /** Degré de la gamme (0 = tonique) de l'accord de chaque mesure, en boucle. */
  progression: number[];
  /** Probabilité d'une note de mélodie sur chaque croche. */
  leadDensity: number;
  /** Ligne de basse : rondes (1), noires (4) ou croches (8) ; 0 = aucune. */
  bassNotes: 0 | 1 | 4 | 8;
  drums: boolean;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];

export const MOODS: Record<Mood, MoodDef> = {
  menu: { label: "Accueil", tempo: 64, root: 50, scale: DORIAN, progression: [0, 6, 3, 0], leadDensity: 0.2, bassNotes: 1, drums: false },
  village: { label: "Village", tempo: 84, root: 55, scale: MAJOR, progression: [0, 4, 5, 3], leadDensity: 0.45, bassNotes: 4, drums: false },
  dungeon: { label: "Crypte", tempo: 54, root: 45, scale: PHRYGIAN, progression: [0, 0, 1, 0], leadDensity: 0.12, bassNotes: 1, drums: false },
  combat: { label: "Combat", tempo: 118, root: 52, scale: AEOLIAN, progression: [0, 5, 6, 4], leadDensity: 0.55, bassNotes: 8, drums: true },
  story: { label: "Histoire", tempo: 70, root: 53, scale: LYDIAN, progression: [0, 1, 4, 0], leadDensity: 0.25, bassNotes: 1, drums: false },
};

/** Note d'un degré de la gamme (les degrés au-delà de la gamme montent d'octave). */
export function degreeToMidi(def: Pick<MoodDef, "root" | "scale">, degree: number): number {
  const n = def.scale.length;
  const octave = Math.floor(degree / n);
  return def.root + octave * 12 + def.scale[((degree % n) + n) % n];
}

/** Accord de trois sons (fondamentale, tierce, quinte de la gamme) sur un degré. */
export const chordOf = (def: MoodDef, degree: number): number[] => [0, 2, 4].map((k) => degreeToMidi(def, degree + k));

/** Une mesure de 4 temps de l'ambiance, pour le numéro de mesure `bar`. */
export function composeBar(mood: Mood, bar: number, rng: Rng): NoteEvent[] {
  const def = MOODS[mood];
  const degree = def.progression[bar % def.progression.length];
  const chord = chordOf(def, degree);
  const out: NoteEvent[] = [];
  // Nappe : l'accord tenu toute la mesure, une octave au-dessus de la tonique.
  for (const m of chord) out.push({ beat: 0, beats: 4, midi: m + 12, voice: "pad", velocity: 0.5 });
  // Basse : la fondamentale, une octave plus bas, en rondes, noires ou croches.
  if (def.bassNotes) {
    const step = 4 / def.bassNotes;
    for (let i = 0; i < def.bassNotes; i++) {
      // En croches, la quinte vient de temps en temps relancer la ligne.
      const fifth = def.bassNotes === 8 && i % 4 === 3 && rng() < 0.5;
      out.push({ beat: i * step, beats: step * 0.9, midi: (fifth ? chord[2] : chord[0]) - 12, voice: "bass", velocity: i % 2 === 0 ? 0.8 : 0.6 });
    }
  }
  // Mélodie : sur chaque croche, une note de l'accord (souvent) ou de la gamme, deux octaves au-dessus de la tonique.
  for (let i = 0; i < 8; i++) {
    if (rng() >= def.leadDensity) continue;
    const midi = rng() < 0.7
      ? chord[Math.floor(rng() * chord.length)] + 24
      : degreeToMidi(def, degree + Math.floor(rng() * 7)) + 24;
    out.push({ beat: i / 2, beats: rng() < 0.3 ? 1 : 0.5, midi, voice: "lead", velocity: 0.4 + rng() * 0.3 });
  }
  // Percussions (combat) : grosse caisse sur les temps 1 et 3 (et parfois juste avant le 3), charleston sur les croches.
  if (def.drums) {
    for (const b of [0, 2]) out.push({ beat: b, beats: 0.25, midi: 0, voice: "kick", velocity: 1 });
    if (rng() < 0.4) out.push({ beat: 1.5, beats: 0.25, midi: 0, voice: "kick", velocity: 0.7 });
    for (let i = 0; i < 8; i++) out.push({ beat: i / 2, beats: 0.1, midi: 0, voice: "hat", velocity: i % 2 ? 0.35 : 0.6 });
  }
  return out;
}

/** Fréquence (Hz) d'une note MIDI. */
export const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Ambiance d'un écran, d'après son adresse ; `null` pour la carte, qui choisit selon le lieu (voir `moodForMap`). */
export function moodForPath(path: string): Mood | null {
  if (path.startsWith("/combat")) return "combat";
  if (path.startsWith("/map")) return null;
  if (path.startsWith("/story") || path.startsWith("/shop") || path.startsWith("/levelup")) return "story";
  return "menu";
}

/** Ambiance d'une carte : le village et ses environs, ou un souterrain. */
export const moodForMap = (mapId: string): Mood => (mapId === "brumeval" ? "village" : "dungeon");
