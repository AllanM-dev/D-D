<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`/character/${characterId}`" /></ion-buttons>
        <ion-title>{{ state ? `Combat · round ${state.round}` : "Combat" }}</ion-title>
        <ion-buttons slot="end">
          <ion-toggle v-model="animateDice" aria-label="Animation des dés">Dés</ion-toggle>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="!character" class="ion-padding"><p>Personnage introuvable.</p></ion-content>

    <!-- Choix de la rencontre -->
    <ion-content v-else-if="!state" class="ion-padding">
      <p>{{ character.name }} · {{ character.classDef.name }} · {{ character.maxHp }} PV · CA {{ character.armorClass }}</p>
      <p class="hint">
        Attaque : {{ attack.name }} ({{ signed(attack.toHit) }} pour toucher, {{ attack.damage.count }}d{{ attack.damage.sides }}{{ attack.damage.bonus ? signed(attack.damage.bonus) : "" }}).
        Les PV sont remis à fond au début de chaque combat. L'équipement n'est pas encore géré : la CA est celle d'un personnage sans armure.
      </p>
      <ion-list inset>
        <ion-list-header><ion-label>Choisir une rencontre</ion-label></ion-list-header>
        <ion-item v-for="e in ENCOUNTERS" :key="e.id" button @click="start(e)">
          <ion-label>
            <h2>{{ e.name }}</h2>
            <p>{{ describe(e) }}</p>
          </ion-label>
          <ion-badge slot="end" :color="badge[e.difficulty]">{{ e.difficulty }}</ion-badge>
        </ion-item>
      </ion-list>
    </ion-content>

    <!-- Combat -->
    <ion-content v-else class="ion-padding">
      <ion-list inset>
        <ion-item v-for="c in orderedCombatants" :key="c.id" :class="{ active: c.id === currentId && !busy && state.status === 'ongoing' }">
          <ion-label>
            <h2>
              <span v-if="c.id === currentId && !busy && state.status === 'ongoing'">▶ </span>{{ c.name }}
              <small>CA {{ c.ac }} · init {{ c.initiative }}</small>
            </h2>
            <ion-progress-bar :value="c.maxHp ? c.hp / c.maxHp : 0" :color="c.side === 'party' ? 'success' : 'danger'" />
            <p>
              <template v-if="c.dead">☠ Mort</template>
              <template v-else-if="c.hp === 0 && c.side === 'party'">
                {{ c.stable ? "Inconscient, stable" : `À terre · jets de mort ${c.deathSaves.successes}✓ ${c.deathSaves.failures}✗` }}
              </template>
              <template v-else>{{ c.hp }} / {{ c.maxHp }} PV<template v-if="c.dodging"> · esquive</template></template>
            </p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- Lancer de dés -->
      <DiceRoll v-if="currentRoll" :key="currentRoll.id" :event="currentRoll" :animate="animateDice" @done="nextRoll" />
      <ion-button v-if="busy" expand="block" fill="clear" size="small" @click="skipAll">Passer l'animation</ion-button>

      <!-- Actions -->
      <div v-else-if="state.status === 'ongoing'" class="actions">
        <h3>À vous de jouer, {{ currentName }}</h3>
        <p class="hint">Attaquer : {{ attack.name }} · Choisissez une cible</p>
        <ion-button v-for="e in livingEnemies" :key="e.id" expand="block" @click="attackTarget(e.id)">
          Attaquer {{ e.name }} ({{ e.hp }}/{{ e.maxHp }} PV, CA {{ e.ac }})
        </ion-button>
        <ion-button expand="block" fill="outline" @click="dodge">Esquiver (désavantage aux attaques contre vous)</ion-button>
      </div>
      <div v-else-if="finished" class="result" :class="state.status">
        <h2>{{ state.status === "victory" ? "Victoire !" : "Défaite…" }}</h2>
        <ion-button expand="block" @click="state = null">Nouveau combat</ion-button>
        <ion-button expand="block" fill="outline" :router-link="`/character/${characterId}`">Retour à la fiche</ion-button>
      </div>

      <ion-list inset>
        <ion-list-header><ion-label>Journal</ion-label></ion-list-header>
        <ion-item v-for="(line, i) in logReversed" :key="i" lines="none"><ion-label class="ion-text-wrap log">{{ line }}</ion-label></ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton, IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader,
  IonPage, IonProgressBar, IonTitle, IonToggle, IonToolbar,
} from "@ionic/vue";
import { computed, ref, watch } from "vue";
import DiceRoll from "../components/DiceRoll.vue";
import { useRoute } from "vue-router";
import { ENCOUNTERS, buildEnemies, type EncounterDef } from "../data/encounters";
import { MONSTERS } from "../data/monsters";
import { characterToCombatant, defaultAttack } from "../engine/attacks";
import { currentCombatant, playerAttack, playerDodge, startCombat, type Combatant, type CombatState, type RollEvent } from "../engine/combat";
import { useCharacters } from "../stores/characters";
import { signed } from "../ui/format";

const route = useRoute();
const store = useCharacters();
const characterId = computed(() => String(route.params.id));
const character = computed(() => store.get(characterId.value));
const attack = computed(() => defaultAttack(character.value!));

const state = ref<CombatState | null>(null);
const badge = { Facile: "success", Moyen: "warning", Difficile: "danger" } as const;

const describe = (e: EncounterDef) =>
  e.monsters.map((m) => `${m.count} × ${MONSTERS.find((x) => x.id === m.monsterId)!.name}`).join(", ");

// --- animation des dés : l'état du moteur est déjà à jour, mais l'affichage est rejoué jet par jet
const PREF_KEY = "dd-mobile.animateDice";
const reducedMotion = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
function loadPref(): boolean {
  try {
    const v = localStorage.getItem(PREF_KEY);
    return v === null ? !reducedMotion : v === "1";
  } catch {
    return !reducedMotion;
  }
}
const animateDice = ref(loadPref());
watch(animateDice, (v) => {
  try { localStorage.setItem(PREF_KEY, v ? "1" : "0"); } catch { /* stockage indisponible */ }
});

const currentRoll = ref<RollEvent | null>(null);
/** Affichage figé sur l'état qui suit le jet en cours ; null = on montre l'état réel. */
const shown = ref<{ combatants: Combatant[]; logLen: number } | null>(null);
const busy = computed(() => currentRoll.value !== null);
let queue: RollEvent[] = [];
let stepDone: (() => void) | null = null;

function showRoll(ev: RollEvent): Promise<void> {
  currentRoll.value = ev;
  return new Promise((resolve) => (stepDone = resolve));
}
const nextRoll = () => stepDone?.();
function skipAll() {
  queue = [];
  nextRoll();
}

/** Joue les jets (déjà calculés par le moteur) l'un après l'autre, en mettant l'affichage à jour après chacun. */
async function play(events: RollEvent[]) {
  queue = [...events];
  while (queue.length) {
    const ev = queue.shift()!;
    await showRoll(ev);
    // L'initiative est déjà affichée (liste triée) : on ne remplace l'affichage qu'à partir des attaques.
    if (ev.kind !== "initiative") shown.value = { combatants: ev.after, logLen: ev.logLen };
  }
  currentRoll.value = null;
  shown.value = null;
}

const orderedCombatants = computed(() => {
  if (!state.value) return [];
  const list = shown.value?.combatants ?? state.value.combatants;
  return state.value.order.map((id) => list.find((c) => c.id === id)!);
});
const currentId = computed(() => (state.value ? state.value.order[state.value.turn] : ""));
const currentName = computed(() => (state.value ? currentCombatant(state.value).name : ""));
const livingEnemies = computed(() => state.value?.combatants.filter((c) => c.side === "enemies" && !c.dead) ?? []);
const logReversed = computed(() => {
  const log = state.value?.log ?? [];
  return log.slice(0, shown.value?.logLen ?? log.length).reverse();
});
const finished = computed(() => !!state.value && state.value.status !== "ongoing" && !busy.value);

async function act(run: (s: CombatState) => void) {
  const s = state.value!;
  const before = s.rolls.length;
  // Fige l'affichage sur l'état d'avant l'action : les PV ne bougent qu'au fil des jets.
  shown.value = { combatants: JSON.parse(JSON.stringify(s.combatants)), logLen: s.log.length };
  run(s);
  await play(s.rolls.slice(before));
}

async function start(e: EncounterDef) {
  const s = startCombat([characterToCombatant(character.value!)], buildEnemies(e));
  state.value = s;
  // Affichage de départ : tout le monde à pleins PV (les ennemis qui jouent en premier le seront après leur jet).
  const fresh: Combatant[] = JSON.parse(JSON.stringify(s.combatants));
  for (const c of fresh) Object.assign(c, { hp: c.maxHp, dead: false, stable: false, dodging: false, deathSaves: { successes: 0, failures: 0 } });
  shown.value = { combatants: fresh, logLen: 0 };
  await play(s.rolls);
}
const attackTarget = (id: string) => act((s) => playerAttack(s, id));
const dodge = () => act((s) => playerDodge(s));
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.hint { opacity: 0.8; font-size: 0.9rem; }
.active { --background: var(--ion-color-step-150, #333); }
h2 small { opacity: 0.7; font-weight: normal; font-size: 0.8rem; margin-left: 6px; }
.actions { margin: 12px 0; }
.result { text-align: center; margin: 12px 0; }
.result.victory h2 { color: var(--ion-color-success); }
.result.defeat h2 { color: var(--ion-color-danger); }
.log { font-size: 0.85rem; }
</style>
