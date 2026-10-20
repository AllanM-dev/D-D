/**
 * Contexte audio partagé et ses deux bus (musique, effets). Le navigateur n'autorise le son qu'après un geste
 * du joueur : le contexte est créé (ou relancé) au premier toucher, puis mis en pause quand l'application passe
 * en arrière-plan.
 */
type Listener = () => void;

let ctx: AudioContext | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
const onReady: Listener[] = [];
let started = false;
const gains = { music: 0, sfx: 0 };

const AudioCtor = (): typeof AudioContext | undefined =>
  typeof window === "undefined" ? undefined : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

/** Contexte prêt à jouer, ou `null` (pas encore de geste du joueur, ou pas de Web Audio). */
export const audio = () => (ctx && ctx.state === "running" ? ctx : null);
export const buses = () => (musicBus && sfxBus ? { music: musicBus, sfx: sfxBus } : null);

/** Bruit blanc d'une seconde, réutilisé par les percussions et les effets. */
export function noiseBuffer(c: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === c.sampleRate) return noise;
  noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

/** Appelé quand le son devient disponible (premier geste du joueur). */
export function whenReady(fn: Listener) {
  onReady.push(fn);
  if (audio()) fn();
}

/** Règle le volume des bus (en douceur, pour éviter les claquements). */
export function setBusGains(music: number, sfx: number) {
  gains.music = music;
  gains.sfx = sfx;
  if (!ctx || !musicBus || !sfxBus) return;
  musicBus.gain.setTargetAtTime(music, ctx.currentTime, 0.1);
  sfxBus.gain.setTargetAtTime(sfx, ctx.currentTime, 0.02);
}

async function unlock() {
  const Ctor = AudioCtor();
  if (!Ctor) return;
  if (!ctx) {
    ctx = new Ctor();
    const master = ctx.createDynamicsCompressor(); // évite la saturation quand musique et effets se superposent
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.gain.value = gains.music;
    sfxBus.gain.value = gains.sfx;
    musicBus.connect(master);
    sfxBus.connect(master);
  }
  const wasRunning = ctx.state === "running" && started;
  if (ctx.state !== "running") await ctx.resume().catch(() => undefined);
  // Les écouteurs ne sont prévenus qu'au passage à « prêt » (premier geste, retour au premier plan).
  if (ctx.state === "running" && !wasRunning) {
    started = true;
    for (const fn of onReady) fn();
  }
}

/** Branche le déblocage au premier geste et la pause en arrière-plan. À appeler une fois au démarrage. */
export function installAudio() {
  if (typeof document === "undefined" || !AudioCtor()) return;
  const gesture = () => { void unlock(); };
  for (const ev of ["pointerdown", "keydown", "touchend"]) document.addEventListener(ev, gesture, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) { started = false; void ctx.suspend(); }
    else void unlock();
  });
}
