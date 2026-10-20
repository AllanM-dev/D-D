import { describe, expect, it } from "vitest";
import { MAPS } from "../../data/maps";
import { MOODS, chordOf, composeBar, degreeToMidi, midiToHz, moodForMap, moodForPath, type Mood } from "../audio/composer";
import { DEFAULT_SOUND, gainOf, parseSound } from "../audio/settings";
import { sfxForRoll } from "../audio/sfx";

/** Hasard reproductible. */
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}
const moods = Object.keys(MOODS) as Mood[];

describe("composition de la musique", () => {
  it("chaque note reste dans la mesure et dans la gamme de l'ambiance", () => {
    for (const mood of moods) {
      const def = MOODS[mood];
      const inScale = new Set(def.scale);
      const rng = seeded(7);
      for (let bar = 0; bar < 16; bar++) {
        for (const n of composeBar(mood, bar, rng)) {
          expect(n.beat, mood).toBeGreaterThanOrEqual(0);
          expect(n.beat, mood).toBeLessThan(4);
          expect(n.velocity).toBeGreaterThan(0);
          expect(n.velocity).toBeLessThanOrEqual(1);
          if (n.voice === "kick" || n.voice === "hat") continue;
          expect(inScale.has((((n.midi - def.root) % 12) + 12) % 12), `${mood} ${n.midi}`).toBe(true);
          expect(n.midi).toBeGreaterThan(20);
          expect(n.midi).toBeLessThan(100);
        }
      }
    }
  });
  it("le même hasard donne la même musique", () => {
    expect(composeBar("village", 3, seeded(1))).toEqual(composeBar("village", 3, seeded(1)));
  });
  it("percussions au combat seulement ; la nappe suit la suite d'accords", () => {
    for (const mood of moods) {
      const notes = composeBar(mood, 0, seeded(3));
      expect(notes.some((n) => n.voice === "kick"), mood).toBe(MOODS[mood].drums);
      expect(notes.filter((n) => n.voice === "pad").length, mood).toBe(3);
    }
    const def = MOODS.village;
    const pads = composeBar("village", 1, seeded(3)).filter((n) => n.voice === "pad").map((n) => n.midi - 12);
    expect(pads).toEqual(chordOf(def, def.progression[1]));
  });
  it("degrés, octaves et fréquences", () => {
    const def = { root: 60, scale: [0, 2, 4, 5, 7, 9, 11] };
    expect(degreeToMidi(def, 0)).toBe(60);
    expect(degreeToMidi(def, 7)).toBe(72);
    expect(degreeToMidi(def, -1)).toBe(59);
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(midiToHz(81)).toBeCloseTo(880);
  });
});

describe("ambiance selon l'écran", () => {
  it("combat, histoire, accueil ; la carte choisit selon le lieu", () => {
    expect(moodForPath("/combat/abc")).toBe("combat");
    expect(moodForPath("/story/abc")).toBe("story");
    expect(moodForPath("/")).toBe("menu");
    expect(moodForPath("/help/classes")).toBe("menu");
    expect(moodForPath("/map/abc")).toBeNull();
    expect(moodForMap("brumeval")).toBe("village");
    for (const m of MAPS) expect(moods).toContain(moodForMap(m.id));
    expect(moodForMap("crypte")).toBe("dungeon");
  });
});

describe("bruitages des jets", () => {
  it("du point de vue du joueur", () => {
    expect(sfxForRoll({ kind: "attack", outcome: "hit", side: "party" })).toBe("hit");
    expect(sfxForRoll({ kind: "attack", outcome: "crit", side: "party" })).toBe("crit");
    expect(sfxForRoll({ kind: "attack", outcome: "hit", side: "enemies" })).toBe("hurt");
    expect(sfxForRoll({ kind: "attack", outcome: "fumble", side: "enemies" })).toBe("miss");
    expect(sfxForRoll({ kind: "save", outcome: "failure", side: "enemies" })).toBe("success"); // l'ennemi rate sa sauvegarde
    expect(sfxForRoll({ kind: "save", outcome: "failure", side: "party" })).toBe("failure");
    expect(sfxForRoll({ kind: "heal", outcome: "success", side: "party" })).toBe("heal");
    expect(sfxForRoll({ kind: "damage", outcome: "hit", side: "party" })).toBeNull();
    expect(sfxForRoll({ kind: "initiative", side: "party" })).toBeNull();
  });
});

describe("réglages du son", () => {
  it("valeurs par défaut, valeurs abîmées, volumes bornés", () => {
    expect(parseSound(null)).toEqual(DEFAULT_SOUND);
    expect(parseSound("pas du json")).toEqual(DEFAULT_SOUND);
    expect(parseSound(JSON.stringify({ musicOn: false, musicVolume: 3, sfxVolume: -1, sfxOn: "oui" }))).toEqual({ ...DEFAULT_SOUND, musicOn: false, musicVolume: 1, sfxVolume: 0 });
  });
  it("le volume suit une courbe, et coupé vaut zéro", () => {
    expect(gainOf(true, 0.5)).toBeCloseTo(0.25);
    expect(gainOf(false, 1)).toBe(0);
  });
});
