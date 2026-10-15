<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`/character/${characterId}`" /></ion-buttons>
        <ion-title>{{ map?.name ?? "Carte" }}</ion-title>
        <ion-buttons slot="end"><ion-menu-button /></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="!character || !map || !ex" class="ion-padding"><p>Carte introuvable.</p></ion-content>
    <ion-content v-else class="ion-padding">
      <p class="status">
        <strong>{{ character.name }}</strong> · {{ vitals.hp }}/{{ character.maxHp }} PV
        <template v-if="walked"> · {{ formatMeters(cellMeters(walked)) }} parcourus</template>
      </p>

      <div ref="scroller" class="scroller" role="application" :aria-label="`Carte : ${map.name}`">
        <div class="grid" :style="{ gridTemplateColumns: `repeat(${grid.width}, ${TILE}px)` }">
          <template v-for="(row, y) in grid.tiles" :key="y">
            <div
              v-for="(kind, x) in row"
              :key="`${x},${y}`"
              class="tile"
              :class="[kind, fog(x, y), { hero: ex.x === x && ex.y === y, locked: isLocked(x, y), route: onRoute(x, y), dest: isDest(x, y) }]"
              :style="{ width: TILE + 'px', height: TILE + 'px' }"
              @click="tap(x, y)"
            >
              <Illustration v-if="ex.x === x && ex.y === y" :art="artKey('class', character.classDef.id)" :size="TILE - 4" :label="character.name" />
              <span v-else-if="spotAt(x, y)" class="spot" role="img" :aria-label="spotAt(x, y)!.label" :title="spotAt(x, y)!.label">!</span>
              <span v-else-if="enemyAt(x, y)" class="enemy" :title="enemyAt(x, y)!.name">
                <Illustration :art="enemyAt(x, y)!.art" :size="TILE - 4" :label="enemyAt(x, y)!.name" />
              </span>
            </div>
          </template>
        </div>
      </div>

      <p class="message" aria-live="polite">{{ message }}</p>
      <p class="hint">Touchez une case pour voir le trajet, touchez-la une seconde fois pour y aller (1 case = 1,5 m). Même chose pour un ennemi à combattre ou un « ! » pour parler ou agir. Touchez ailleurs pour changer de destination. Les zones sombres ne sont pas encore explorées.</p>
      <ion-button expand="block" fill="outline" :router-link="`/character/${character.id}`">Fiche et repos</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, onIonViewWillEnter, useIonRouter,
} from "@ionic/vue";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import Illustration from "../components/Illustration.vue";
import { ENCOUNTERS } from "../data/encounters";
import { artKey } from "../data/illustrations";
import { MAP_BY_ID } from "../data/maps";
import { MONSTERS } from "../data/monsters";
import {
  cellMeters, key, liveSpots, livingEnemies, lockedCells, parseMap, planPath, startExploration, stepTo, travelTo, visibleCells, type Cell, type ExplorationState,
} from "../engine/exploration";
import { vitalsOf } from "../engine/rest";
import { useCharacters } from "../stores/characters";
import { formatMeters } from "../ui/format";

const TILE = 32;
const STEP_MS = 140;

const route = useRoute();
const router = useIonRouter();
const store = useCharacters();
const characterId = computed(() => String(route.params.id));
const character = computed(() => store.get(characterId.value));
const vitals = computed(() => vitalsOf(character.value!));
const map = computed(() => MAP_BY_ID[character.value?.exploration?.mapId ?? "brumeval"]);
const grid = computed(() => parseMap(map.value));
const ex = computed<ExplorationState | undefined>(() => character.value?.exploration);

// Première visite : le héros est posé au départ de la carte.
watch(character, (c) => { if (c && !c.exploration) store.setExploration(c.id, startExploration(MAP_BY_ID.brumeval)); }, { immediate: true });

const message = ref("");
onIonViewWillEnter(() => { message.value = ""; });
const walked = ref(0);
const scroller = ref<HTMLElement | null>(null);
let walking = false;
let cancel = false;
onBeforeUnmount(() => { cancel = true; });

const visible = computed(() => (ex.value ? visibleCells(grid.value, ex.value) : new Set<string>()));
const explored = computed(() => new Set(ex.value?.explored ?? []));
const fog = (x: number, y: number) => {
  const k = `${x},${y}`;
  return visible.value.has(k) ? "" : explored.value.has(k) ? "seen" : "unknown";
};

function monsterOf(encounterId: string) {
  const enc = ENCOUNTERS.find((e) => e.id === encounterId)!;
  const m = MONSTERS.find((x) => x.id === enc.monsters[0].monsterId)!;
  return { enc, art: artKey("monster", m.id), name: m.name };
}
const visibleEnemyMap = computed(() => {
  const out = new Map<string, { id: string; art: string; name: string }>();
  if (!ex.value) return out;
  for (const e of livingEnemies(map.value, ex.value)) {
    if (visible.value.has(key(e))) out.set(key(e), { id: e.id, ...monsterOf(e.encounterId) });
  }
  return out;
});
const enemyAt = (x: number, y: number) => visibleEnemyMap.value.get(`${x},${y}`);
const flags = computed(() => character.value?.story?.flags ?? []);
const spotAt = (x: number, y: number) =>
  liveSpots(map.value, flags.value).find((s) => s.x === x && s.y === y && visible.value.has(`${x},${y}`));
const isLocked = (x: number, y: number) => lockedCells(map.value, flags.value).some((l) => l.x === x && l.y === y);

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
function centerOnHero() {
  nextTick(() => scroller.value?.querySelector(".hero")?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" }));
}
watch(() => scroller.value, centerOnHero);

function startFight(enemyId: string, encounterId: string) {
  message.value = `${ENCOUNTERS.find((e) => e.id === encounterId)!.name} : le combat commence !`;
  router.push(`/combat/${characterId.value}?encounter=${encounterId}&enemy=${enemyId}&from=map&t=${Date.now()}`);
}

function openSpot(spot: { story: string; scene: string; label: string }) {
  message.value = spot.label;
  router.push(`/story/${characterId.value}?story=${spot.story}&scene=${spot.scene}&t=${Date.now()}`);
}

/** Destination choisie au premier toucher, en attente de confirmation (second toucher au même endroit). */
const pending = ref<{ target: Cell; path: Cell[] } | null>(null);
const routeCells = computed(() => new Set((pending.value?.path ?? []).map(key)));
const onRoute = (x: number, y: number) => routeCells.value.has(`${x},${y}`);
const isDest = (x: number, y: number) => pending.value?.target.x === x && pending.value?.target.y === y;
onIonViewWillEnter(() => { pending.value = null; });

/** Premier toucher : on montre le trajet ; le second, au même endroit, déplace le personnage. */
function tap(x: number, y: number) {
  if (!ex.value || !character.value) return;
  if (walking) { cancel = true; pending.value = null; return; }
  const target: Cell = { x, y };
  if (pending.value && pending.value.target.x === x && pending.value.target.y === y) {
    pending.value = null;
    return go(target);
  }
  if (!explored.value.has(key(target))) { pending.value = null; message.value = "Vous ne savez pas encore ce qu'il y a là-bas."; return; }
  const plan = planPath(ex.value, target, flags.value);
  if (!plan) { pending.value = null; message.value = "Vous ne pouvez pas aller là."; return; }
  if (!plan.enemy && !plan.spot && plan.path.length === 0) { pending.value = null; return; }
  pending.value = { target, path: plan.path };
  const dist = formatMeters(cellMeters(plan.path.length));
  if (plan.enemy) message.value = `Combattre : ${monsterOf(map.value.enemies.find((e) => e.id === plan.enemy!.id)!.encounterId).name} (${dist}). Touchez à nouveau pour confirmer.`;
  else if (plan.spot) message.value = `${plan.spot.label} (${dist}). Touchez à nouveau pour confirmer.`;
  else message.value = `Aller ici : ${dist}. Touchez à nouveau pour confirmer.`;
}

async function go(target: Cell) {
  if (!ex.value || !character.value) return;
  const plan = planPath(ex.value, target, flags.value);
  if (!plan) { message.value = "Vous ne pouvez pas aller là."; return; }
  const enemy = plan.enemy ? map.value.enemies.find((e) => e.id === plan.enemy!.id)! : undefined;
  if (enemy && plan.path.length === 0) return startFight(enemy.id, enemy.encounterId);
  if (plan.spot && plan.path.length === 0) return openSpot(plan.spot);
  if (plan.path.length === 0) return;

  walking = true;
  cancel = false;
  message.value = "";
  let steps = 0;
  const next: ExplorationState = JSON.parse(JSON.stringify(ex.value));
  for (const cell of plan.path) {
    if (cancel) break;
    const res = stepTo(next, cell, flags.value);
    steps += 1;
    walked.value += 1;
    store.setExploration(characterId.value, next);
    centerOnHero();
    if (res.ambush) {
      walking = false;
      return startFight(res.ambush.id, res.ambush.encounterId);
    }
    if (res.travel) {
      Object.assign(next, travelTo(next, res.travel));
      store.setExploration(characterId.value, next);
      message.value = res.travel.label;
      centerOnHero();
      break;
    }
    if (res.spotted.length) {
      message.value = `Vous apercevez : ${res.spotted.map((e) => monsterOf(e.encounterId).name).join(", ")}.`;
      break;
    }
    await sleep(STEP_MS);
  }
  walking = false;
  if (!message.value) message.value = steps ? `Vous avez marché ${formatMeters(cellMeters(steps))}.` : "";
  if (!cancel && steps === plan.path.length) {
    if (enemy) startFight(enemy.id, enemy.encounterId);
    else if (plan.spot) openSpot(plan.spot);
  }
}
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.status { margin: 0 0 8px; }
.scroller { max-height: 58vh; overflow: auto; border-radius: 8px; border: 1px solid var(--ion-color-step-200, #444); background: #000; touch-action: pan-x pan-y; }
.grid { display: grid; width: max-content; }
.tile { position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box; cursor: pointer; }
.tile.grass { background: #4f7f3a; }
.tile.path { background: #b59a63; }
.tile.floor { background: #8a8a92; background-image: linear-gradient(#0002 1px, transparent 1px), linear-gradient(90deg, #0002 1px, transparent 1px); background-size: 16px 16px; }
.tile.wall { background: #55555c; background-image: repeating-linear-gradient(0deg, #0004 0 2px, transparent 2px 10px), repeating-linear-gradient(90deg, #0003 0 2px, transparent 2px 16px); }
.tile.door { background: #7a4a22; border: 3px solid #4a2c12; }
.tile.tree { background: radial-gradient(circle at 50% 45%, #2f6a2a 0 55%, #1d4a1c 56% 100%); }
.tile.water { background: repeating-linear-gradient(135deg, #2f6fb5 0 6px, #3a80c7 6px 12px); cursor: default; }
.tile.stairs { background: repeating-linear-gradient(0deg, #6d6d78 0 5px, #8d8d98 5px 10px); }
.tile.bridge { background: repeating-linear-gradient(90deg, #8b6a3a 0 6px, #6f5230 6px 8px); }
.tile.wall, .tile.tree { cursor: default; }
.tile.seen::after, .tile.unknown::after { content: ""; position: absolute; inset: 0; pointer-events: none; }
.tile.seen::after { background: #000a; }
.tile.unknown::after { background: #000; }
.tile.route::before { content: ""; position: absolute; width: 8px; height: 8px; border-radius: 50%; background: #ffd54a; opacity: 0.9; z-index: 2; pointer-events: none; }
.tile.dest { outline: 2px dashed #fff; outline-offset: -3px; z-index: 1; }
.tile.hero { outline: 2px solid #ffd54a; outline-offset: -2px; z-index: 1; }
.spot { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #ffd54a; color: #3a2a00; font-weight: 800; box-shadow: 0 0 0 2px #3a2a00, 0 0 6px #ffd54a; }
.tile.locked { box-shadow: inset 0 0 0 3px #c0392b; }
.enemy { display: flex; filter: drop-shadow(0 0 3px #f44); }
.message { min-height: 1.4em; margin: 10px 0 0; }
.hint { opacity: 0.75; font-size: 0.85rem; }
</style>
