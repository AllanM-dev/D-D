import { MOODS, composeBar, midiToHz, type Mood, type NoteEvent } from "./composer";
import { audio, buses, noiseBuffer, whenReady } from "./context";

/**
 * Lecteur de la musique d'ambiance : il compose quelques fractions de seconde à l'avance (`composeBar`) et confie
 * les notes au synthétiseur du navigateur. Changer d'ambiance fait un fondu enchaîné.
 */
interface Playing {
  mood: Mood;
  out: GainNode;
  echo: AudioNode;
  timer: ReturnType<typeof setInterval>;
  bar: number;
  nextBar: number;
}

const LOOKAHEAD = 0.6; // secondes composées à l'avance
const FADE = 1.5;
let wanted: Mood = "menu";
let enabled = true;
let playing: Playing | null = null;

function voice(c: AudioContext, p: Playing, ev: NoteEvent, t: number, beat: number) {
  const dur = ev.beats * beat;
  const g = c.createGain();
  g.connect(p.out);
  if (ev.voice === "kick") {
    const o = c.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.7 * ev.velocity, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.25);
    return;
  }
  if (ev.voice === "hat") {
    const n = c.createBufferSource();
    n.buffer = noiseBuffer(c);
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    g.gain.setValueAtTime(0.07 * ev.velocity, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(hp).connect(g);
    n.start(t, Math.random() * 0.5);
    n.stop(t + 0.06);
    return;
  }
  const f = midiToHz(ev.midi);
  if (ev.voice === "pad") {
    // Nappe : deux oscillateurs légèrement désaccordés, filtrés, qui montent et s'éteignent lentement.
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = p.mood === "dungeon" ? 520 : 1100;
    for (const [type, detune] of [["triangle", 0], ["sawtooth", 7]] as const) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = detune;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 1.6);
    }
    lp.connect(g);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09 * ev.velocity, t + Math.min(1, dur / 2));
    g.gain.setValueAtTime(0.09 * ev.velocity, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 1.5);
    return;
  }
  const o = c.createOscillator();
  o.type = ev.voice === "bass" ? "triangle" : p.mood === "dungeon" ? "sine" : "triangle";
  o.frequency.value = f;
  o.connect(g);
  const peak = ev.voice === "bass" ? 0.32 : 0.17;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak * ev.velocity, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.15, dur * (ev.voice === "lead" ? 1.6 : 1)));
  if (ev.voice === "lead") g.connect(p.echo); // la mélodie résonne un peu
  o.start(t);
  o.stop(t + dur * 1.7 + 0.2);
}

function tick(p: Playing) {
  const c = audio();
  if (!c) return;
  const def = MOODS[p.mood];
  const beat = 60 / def.tempo;
  if (p.nextBar < c.currentTime) p.nextBar = c.currentTime + 0.05; // retour d'arrière-plan : on repart maintenant
  while (p.nextBar < c.currentTime + LOOKAHEAD) {
    for (const ev of composeBar(p.mood, p.bar, Math.random)) voice(c, p, ev, p.nextBar + ev.beat * beat, beat);
    p.bar += 1;
    p.nextBar += 4 * beat;
  }
}

function stop(fade = FADE) {
  const c = audio();
  const p = playing;
  playing = null;
  if (!p) return;
  clearInterval(p.timer);
  if (c) {
    p.out.gain.cancelScheduledValues(c.currentTime);
    p.out.gain.setValueAtTime(p.out.gain.value, c.currentTime);
    p.out.gain.linearRampToValueAtTime(0, c.currentTime + fade);
  }
  setTimeout(() => p.out.disconnect(), (fade + 2) * 1000);
}

function start() {
  const c = audio();
  const b = buses();
  if (!c || !b || !enabled) return;
  if (playing?.mood === wanted) return;
  stop();
  const out = c.createGain();
  out.gain.setValueAtTime(0, c.currentTime);
  out.gain.linearRampToValueAtTime(1, c.currentTime + FADE);
  out.connect(b.music);
  // Écho de la mélodie : retard de trois croches, qui s'éteint peu à peu.
  const delay = c.createDelay(2);
  delay.delayTime.value = (60 / MOODS[wanted].tempo) * 1.5;
  const feedback = c.createGain();
  feedback.gain.value = 0.3;
  const wet = c.createGain();
  wet.gain.value = 0.35;
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(out);
  const p: Playing = { mood: wanted, out, echo: delay, bar: 0, nextBar: c.currentTime + 0.1, timer: setInterval(() => tick(p), 100) };
  playing = p;
  tick(p);
}

/** Ambiance voulue pour l'écran affiché (jouée dès que le son est disponible). */
export function setMood(mood: Mood) {
  wanted = mood;
  start();
}

/** Coupe ou relance la musique (le volume, lui, se règle sur le bus). */
export function setMusicEnabled(on: boolean) {
  enabled = on;
  if (on) start();
  else stop(0.5);
}

whenReady(start);
