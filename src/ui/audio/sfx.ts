import { audio, buses, noiseBuffer } from "./context";

/** Effets sonores, tous synthétisés (aucun fichier audio). */
export type Sfx =
  | "dice" | "hit" | "crit" | "miss" | "hurt" | "heal" | "success" | "failure" | "spell"
  | "step" | "coin" | "victory" | "defeat" | "levelup";

let enabled = true;
export const setSfxEnabled = (on: boolean) => { enabled = on; };

interface ToneOpts { type?: OscillatorType; freq: number; to?: number; at?: number; dur: number; gain: number; attack?: number }
function tone(c: AudioContext, out: AudioNode, o: ToneOpts) {
  const t = c.currentTime + (o.at ?? 0);
  const osc = c.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.gain, t + (o.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.001, t + o.dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + o.dur + 0.05);
}

interface NoiseOpts { at?: number; dur: number; gain: number; filter: BiquadFilterType; freq: number; to?: number; q?: number }
function noise(c: AudioContext, out: AudioNode, o: NoiseOpts) {
  const t = c.currentTime + (o.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = o.filter;
  f.frequency.setValueAtTime(o.freq, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
  f.Q.value = o.q ?? 1;
  const g = c.createGain();
  g.gain.setValueAtTime(o.gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + o.dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + o.dur + 0.05);
}

/** Petite mélodie : une note par entrée (Hz), à intervalle régulier. */
const notes = (c: AudioContext, out: AudioNode, freqs: number[], gap: number, dur: number, gain: number, type: OscillatorType = "triangle") =>
  freqs.forEach((freq, i) => tone(c, out, { type, freq, at: i * gap, dur, gain }));

const RECIPES: Record<Sfx, (c: AudioContext, out: AudioNode) => void> = {
  // Dés qui roulent sur la table : quelques petits chocs, puis l'arrêt.
  dice: (c, out) => {
    for (let i = 0; i < 6; i++) noise(c, out, { at: i * 0.07 + Math.random() * 0.03, dur: 0.035, gain: 0.25, filter: "bandpass", freq: 2200 + Math.random() * 1800, q: 4 });
    noise(c, out, { at: 0.46, dur: 0.06, gain: 0.3, filter: "bandpass", freq: 1600, q: 3 });
  },
  hit: (c, out) => {
    noise(c, out, { dur: 0.12, gain: 0.5, filter: "lowpass", freq: 1400, to: 300 });
    tone(c, out, { freq: 190, to: 60, dur: 0.16, gain: 0.5 });
  },
  crit: (c, out) => {
    RECIPES.hit(c, out);
    notes(c, out, [988, 1319], 0.07, 0.3, 0.18, "square");
  },
  miss: (c, out) => noise(c, out, { dur: 0.28, gain: 0.18, filter: "bandpass", freq: 500, to: 2600, q: 2 }),
  hurt: (c, out) => {
    tone(c, out, { type: "sawtooth", freq: 260, to: 110, dur: 0.22, gain: 0.16 });
    noise(c, out, { dur: 0.1, gain: 0.3, filter: "lowpass", freq: 900 });
  },
  heal: (c, out) => notes(c, out, [523, 659, 784, 1047], 0.08, 0.45, 0.12, "sine"),
  success: (c, out) => notes(c, out, [784, 1047], 0.09, 0.3, 0.14),
  failure: (c, out) => notes(c, out, [330, 262], 0.12, 0.35, 0.14),
  // Sort : un scintillement de notes aiguës qui montent.
  spell: (c, out) => {
    for (let i = 0; i < 7; i++) tone(c, out, { freq: 900 + i * 180 + Math.random() * 80, to: 1400 + i * 220, at: i * 0.045, dur: 0.35, gain: 0.05, attack: 0.02 });
    noise(c, out, { dur: 0.5, gain: 0.05, filter: "highpass", freq: 5000 });
  },
  step: (c, out) => noise(c, out, { dur: 0.045, gain: 0.12, filter: "lowpass", freq: 700 }),
  coin: (c, out) => notes(c, out, [1568, 2093], 0.07, 0.25, 0.08, "square"),
  victory: (c, out) => {
    notes(c, out, [523, 659, 784], 0.12, 0.3, 0.13);
    for (const f of [523, 659, 784, 1047]) tone(c, out, { type: "triangle", freq: f, at: 0.36, dur: 1.2, gain: 0.07, attack: 0.03 });
  },
  defeat: (c, out) => notes(c, out, [440, 349, 294, 220], 0.28, 0.7, 0.12, "sine"),
  levelup: (c, out) => {
    notes(c, out, [523, 659, 784, 1047, 1319], 0.08, 0.3, 0.12);
    for (const f of [523, 784, 1047, 1319]) tone(c, out, { type: "triangle", freq: f, at: 0.42, dur: 1.4, gain: 0.06, attack: 0.04 });
  },
};

/** Joue un effet sonore (rien si les effets sont coupés ou si le son n'est pas encore disponible). */
export function playSfx(name: Sfx) {
  const c = audio();
  const b = buses();
  if (!enabled || !c || !b) return;
  RECIPES[name](c, b.sfx);
}

/**
 * Effet sonore d'un jet révélé, du point de vue du joueur : votre coup qui porte sonne comme un coup, celui d'un ennemi
 * comme une blessure ; un jet de sauvegarde raté par un ennemi est une bonne nouvelle.
 */
export function sfxForRoll(ev: { kind: string; outcome?: string; side: "party" | "enemies" }): Sfx | null {
  const mine = ev.side === "party";
  switch (ev.kind) {
    case "attack":
      if (!ev.outcome) return null;
      if (ev.outcome === "miss" || ev.outcome === "fumble") return "miss";
      return mine ? (ev.outcome === "crit" ? "crit" : "hit") : "hurt";
    case "heal":
      return "heal";
    case "save":
    case "check":
    case "deathSave": {
      if (!ev.outcome) return null;
      const passed = ev.outcome === "success" || ev.outcome === "crit";
      return passed === mine ? "success" : "failure";
    }
    default:
      return null; // les dégâts suivent le jet d'attaque, déjà sonorisé
  }
}
