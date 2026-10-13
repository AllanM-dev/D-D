<template>
  <div class="stage" role="status" aria-live="polite">
    <p class="title">{{ event.title }}</p>

    <div class="dice">
      <div
        v-for="(value, i) in shown"
        :key="i"
        class="die"
        :class="[{ rolling: phase === 'rolling', dropped: phase === 'settled' && isDropped(i) }, settledClass]"
      >
        <span>{{ value }}</span>
      </div>
    </div>
    <p v-if="event.sides" class="sides">
      d{{ event.sides }}<template v-if="event.dice.length > 1 && event.sides === 20"> · on garde le {{ keepsHighest ? "meilleur" : "pire" }}</template>
    </p>

    <template v-if="phase === 'settled'">
      <p class="calc">{{ calc }}</p>
      <p v-if="outcomeText" class="outcome" :class="event.outcome">{{ outcomeText }}</p>
    </template>
    <p v-else-if="phase === 'rolling'" class="calc">…</p>

    <ion-button v-if="phase === 'ready'" expand="block" @click="roll">{{ ROLL_BUTTON_LABEL[event.kind] }}</ion-button>
    <ion-button v-else-if="phase === 'rolling'" expand="block" fill="outline" @click="settle">Voir le résultat</ion-button>
    <ion-button v-else expand="block" @click="finish">{{ nextLabel ?? "Continuer" }}</ion-button>
  </div>
</template>

<script setup lang="ts">
import { IonButton } from "@ionic/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { RollEvent } from "../engine/combat";
import { ROLL_BUTTON_LABEL, signed } from "../ui/format";

const props = defineProps<{
  event: RollEvent;
  /** « button » : le joueur doit appuyer pour lancer ; « auto » : il vient d'appuyer sur « Lancer… » à l'étape précédente. */
  startMode: "button" | "auto";
  /** Libellé du bouton de suite quand le jet suivant est aussi un jet du joueur. */
  nextLabel: string | null;
}>();
const emit = defineEmits<{ done: [] }>();

const reducedMotion = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const ROLL_MS = reducedMotion ? 250 : 750;

type Phase = "ready" | "rolling" | "settled";
const phase = ref<Phase>(props.startMode === "button" ? "ready" : "rolling");
const randoms = ref<(number | string)[]>(props.event.dice.map(() => "?"));
let tick: ReturnType<typeof setInterval> | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let finished = false;

const shown = computed(() => (phase.value === "settled" ? props.event.dice : randoms.value));
const keepsHighest = computed(() => props.event.dice[props.event.keptIndex] === Math.max(...props.event.dice));
const isDropped = (i: number) => props.event.dice.length > 1 && props.event.sides === 20 && i !== props.event.keptIndex;
const settledClass = computed(() => (phase.value === "settled" ? props.event.outcome ?? "" : ""));

const kept = computed(() =>
  props.event.sides === 20 && props.event.dice.length > 1 ? props.event.dice[props.event.keptIndex] : null,
);

const calc = computed(() => {
  const e = props.event;
  const base = kept.value ?? e.dice.join(" + ");
  const mod = e.modifier ? ` ${signed(e.modifier).replace("-", "− ").replace("+", "+ ")}` : "";
  const dc = e.dc !== undefined ? ` contre CA ${e.dc}` : "";
  const unit = e.kind === "damage" ? " dégâts" : "";
  return `${base}${mod} = ${e.total}${dc}${unit}`;
});

const OUTCOMES: Record<string, string> = {
  hit: "Touché !", miss: "Raté", crit: "Coup critique !", fumble: "Échec critique",
  success: "Réussite", failure: "Échec",
};
const outcomeText = computed(() => {
  const e = props.event;
  if (!e.outcome) return "";
  if (e.kind === "damage") return e.outcome === "crit" ? "Dégâts critiques !" : "";
  if (e.kind === "deathSave" && e.outcome === "crit") return "Vous vous relevez !";
  return OUTCOMES[e.outcome] ?? "";
});

function roll() {
  phase.value = "rolling";
  if (!reducedMotion) {
    tick = setInterval(() => {
      randoms.value = props.event.dice.map(() => 1 + Math.floor(Math.random() * props.event.sides));
    }, 70);
  }
  timer = setTimeout(settle, ROLL_MS);
}

function settle() {
  if (phase.value !== "rolling") return;
  clearInterval(tick);
  clearTimeout(timer);
  phase.value = "settled";
}

function finish() {
  if (finished) return;
  finished = true;
  emit("done");
}

onMounted(() => {
  if (props.startMode === "auto") roll();
});
onBeforeUnmount(() => {
  clearInterval(tick);
  clearTimeout(timer);
});
</script>

<style scoped>
.stage {
  background: var(--ion-color-step-100, #222);
  border-radius: 12px;
  padding: 12px;
  margin: 12px 0;
  text-align: center;
  user-select: none;
}
.title { margin: 0 0 8px; font-weight: 600; }
.dice { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; min-height: 76px; align-items: center; }
.die {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  font-size: 1.6rem;
  font-weight: 700;
  color: #111;
  background: #f4f5f8;
  clip-path: polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
  transition: background 0.2s, opacity 0.2s, transform 0.2s;
}
.die.rolling { animation: tumble 0.5s linear infinite; }
.die.hit, .die.success { background: var(--ion-color-success, #2dd36f); }
.die.miss, .die.failure { background: var(--ion-color-medium, #92949c); }
.die.crit { background: var(--ion-color-warning, #ffc409); transform: scale(1.12); }
.die.fumble { background: var(--ion-color-danger, #eb445a); }
.die.dropped { opacity: 0.35; transform: scale(0.85); }
.sides { margin: 6px 0 0; opacity: 0.7; font-size: 0.85rem; }
.calc { margin: 8px 0 0; font-size: 1.05rem; }
.outcome { margin: 4px 0 8px; font-weight: 700; font-size: 1.1rem; }
.outcome.hit, .outcome.success { color: var(--ion-color-success, #2dd36f); }
.outcome.crit { color: var(--ion-color-warning, #ffc409); }
.outcome.miss, .outcome.failure { color: var(--ion-color-medium, #92949c); }
.outcome.fumble { color: var(--ion-color-danger, #eb445a); }
ion-button { margin-top: 10px; }

@keyframes tumble {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(90deg) scale(1.15); }
  50% { transform: rotate(180deg) scale(0.9); }
  75% { transform: rotate(270deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .die.rolling { animation: none; }
}
</style>
