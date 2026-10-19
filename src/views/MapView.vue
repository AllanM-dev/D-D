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
              :style="{ width: TILE + 'px', height: TILE + 'px', backgroundImage: tileBackground(grid.tiles, x, y) }"
              @click="tap(x, y)"
            >
              <template v-if="spotAt(x, y) && !(ex.x === x && ex.y === y)">
                <span v-if="isNpc(spotAt(x, y)!.id)" class="figure npc-fig" :title="spotAt(x, y)!.label">
                  <span class="base" />
                  <Sprite :sprite="npcSpriteKey(spotAt(x, y)!.id)" :size="TILE + 4" :label="spotAt(x, y)!.label" />
                  <span class="badge" aria-hidden="true">!</span>
                </span>
                <span v-else class="spot" role="img" :aria-label="spotAt(x, y)!.label" :title="spotAt(x, y)!.label">!</span>
              </template>
              <span v-else-if="doorHint(x, y)" class="door-hint" role="img" :aria-label="doorHint(x, y)!" :title="doorHint(x, y)!">!</span>
            </div>
          </template>
          <!-- Personnages mobiles : ils glissent d'une case à l'autre (le héros qui marche, les ennemis qui approchent). -->
          <div
            v-for="a in actors"
            :key="a.id"
            class="actor"
            :class="[a.kind, { moving: a.kind === 'hero' && heroMoving }]"
            :style="{ width: TILE + 'px', height: TILE + 'px', transform: `translate(${a.x * TILE}px, ${a.y * TILE}px)` }"
            :title="a.name"
          >
            <span class="base" />
            <Sprite :sprite="a.sprite" :size="TILE + 4" :label="a.name" />
          </div>
        </div>
      </div>

      <ul class="legend" aria-label="Légende de la carte">
        <li><span class="spot sm">!</span> Lieu ou personnage à qui parler (sur une porte : quelqu'un à l'intérieur)</li>
        <li><span class="swatch locked-sw"></span> Passage verrouillé</li>
        <li><span class="swatch enemy-sw"></span> Ennemi (socle rouge)</li>
        <li><span class="swatch folk-sw"></span> Habitant ou animal (socle gris) : touchez-le pour l'écouter</li>
        <li><span class="swatch hero-sw"></span> Vous (socle bleu)</li>
        <li><span class="swatch fog-sw"></span> Zone inexplorée</li>
      </ul>

      <p class="message" aria-live="polite">{{ message }}</p>
      <ion-button v-if="pending?.enemy" expand="block" color="danger" fill="outline" @click="engageFromHere">
        Attaquer d'ici ({{ formatMeters(cellMeters(Math.max(Math.abs(pending.target.x - ex.x), Math.abs(pending.target.y - ex.y)))) }}) : arc, sort…
      </ion-button>
      <p class="hint">Touchez une case pour voir le trajet, touchez-la une seconde fois pour y aller (1 case = 1,5 m). Même chose pour un ennemi à combattre ou un « ! » pour parler ou agir. Touchez ailleurs pour changer de destination. Les zones sombres ne sont pas encore explorées.</p>
      <ion-button expand="block" fill="outline" :router-link="`/character/${character.id}`">Fiche et repos</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, onIonViewWillEnter, onIonViewWillLeave, useIonRouter,
} from "@ionic/vue";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { clone } from "../engine/clone";
import Sprite from "../components/Sprite.vue";
import { ENCOUNTERS } from "../data/encounters";
import { artKey } from "../data/illustrations";
import { NPC_SPRITES, folkSpriteKey, heroSpriteKey, npcSpriteKey } from "../ui/sprites";
import { folkLine, folkStep, startFolk, type FolkPos } from "../engine/folk";
import { MAP_BY_ID } from "../data/maps";
import { MONSTERS } from "../data/monsters";
import {
  cellMeters, key, liveSpots, livingEnemies, lockedCells, parseMap, planPath, startExploration, stepTo, travelTo, visibleCells, type Cell, type ExplorationState,
} from "../engine/exploration";
import { vitalsOf } from "../engine/rest";
import { useCharacters } from "../stores/characters";
import { formatMeters } from "../ui/format";
import { tileBackground } from "../ui/tileArt";
import "../ui/tiles.css";

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
/** « ! » sur une porte vue dont le personnage, à l'intérieur, n'est pas encore visible. */
const doorHint = (x: number, y: number) => {
  if (fog(x, y) === "unknown") return "";
  const sp = liveSpots(map.value, flags.value).find((s) => s.door?.x === x && s.door?.y === y);
  return sp && !visible.value.has(`${sp.x},${sp.y}`) ? `${sp.label} : entrez par cette porte` : "";
};
const heroMoving = ref(false);

// --- habitants qui se promènent : décor vivant, ils ne gênent pas la marche
const folkPos = ref<FolkPos[]>([]);
const folkDef = (id: string) => (map.value.folk ?? []).find((f) => f.id === id);
watch(() => map.value.id, () => { folkPos.value = startFolk(map.value); }, { immediate: true });
let folkTimer: ReturnType<typeof setInterval> | undefined;
function folkTick() {
  if (!ex.value) return;
  const avoid: Cell[] = [{ x: ex.value.x, y: ex.value.y }, ...liveSpots(map.value, flags.value), ...livingEnemies(map.value, ex.value)];
  folkPos.value = folkStep(map.value, folkPos.value, avoid, Math.random);
}
const startFolkTimer = () => { if (!folkTimer && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) folkTimer = setInterval(folkTick, 1300); };
const stopFolkTimer = () => { if (folkTimer) { clearInterval(folkTimer); folkTimer = undefined; } };
onIonViewWillEnter(startFolkTimer);
onIonViewWillLeave(stopFolkTimer);
onBeforeUnmount(stopFolkTimer);
startFolkTimer();
/** Habitant visible sur cette case : le toucher le fait parler. */
const folkAt = (x: number, y: number) => folkPos.value.find((f) => f.x === x && f.y === y && visible.value.has(`${x},${y}`));
const actors = computed(() => {
  if (!ex.value || !character.value) return [];
  const foes = livingEnemies(map.value, ex.value)
    .filter((e) => visible.value.has(key(e)))
    .map((e) => ({ id: e.id, kind: "enemy" as const, x: e.x, y: e.y, sprite: monsterOf(e.encounterId).art, name: monsterOf(e.encounterId).name }));
  const villagers = folkPos.value
    .filter((f) => visible.value.has(key(f)))
    .map((f) => { const d = folkDef(f.id)!; return { id: f.id, kind: "folk" as const, x: f.x, y: f.y, sprite: folkSpriteKey(d.sprite), name: d.name }; });
  return [
    ...villagers,
    ...foes,
    { id: "hero", kind: "hero" as const, x: ex.value.x, y: ex.value.y, sprite: heroSpriteKey(character.value.species.id, character.value.classDef.id), name: character.value.name },
  ];
});
const isNpc = (id: string) => NPC_SPRITES.includes(id);
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
const pending = ref<{ target: Cell; path: Cell[]; enemy?: { id: string; encounterId: string } } | null>(null);
const routeCells = computed(() => new Set((pending.value?.path ?? []).map(key)));
const onRoute = (x: number, y: number) => routeCells.value.has(`${x},${y}`);
const isDest = (x: number, y: number) => pending.value?.target.x === x && pending.value?.target.y === y;
onIonViewWillEnter(() => { pending.value = null; });

/** Premier toucher : on montre le trajet ; le second, au même endroit, déplace le personnage. */
function tap(x: number, y: number) {
  if (!ex.value || !character.value) return;
  if (walking) { cancel = true; pending.value = null; return; }
  const talker = folkAt(x, y);
  if (talker) {
    const d = folkDef(talker.id)!;
    pending.value = null;
    message.value = `${d.name} : ${folkLine(d, Math.random)}`;
    return;
  }
  const target: Cell = { x, y };
  if (pending.value && pending.value.target.x === x && pending.value.target.y === y) {
    pending.value = null;
    return go(target);
  }
  if (!explored.value.has(key(target))) { pending.value = null; message.value = "Vous ne savez pas encore ce qu'il y a là-bas."; return; }
  const plan = planPath(ex.value, target, flags.value);
  if (!plan) { pending.value = null; message.value = "Vous ne pouvez pas aller là."; return; }
  if (!plan.enemy && !plan.spot && plan.path.length === 0) { pending.value = null; return; }
  pending.value = { target, path: plan.path, enemy: plan.enemy ? { id: plan.enemy.id, encounterId: plan.enemy.encounterId } : undefined };
  const dist = formatMeters(cellMeters(plan.path.length));
  if (plan.enemy) message.value = `Combattre : ${monsterOf(map.value.enemies.find((e) => e.id === plan.enemy!.id)!.encounterId).name} (${dist}). Touchez à nouveau pour confirmer.`;
  else if (plan.spot) message.value = `${plan.spot.label} (${dist}). Touchez à nouveau pour confirmer.`;
  else message.value = `Aller ici : ${dist}. Touchez à nouveau pour confirmer.`;
}

/** Lance le combat sans s'approcher : on tire ou on lance un sort depuis sa position (la distance compte pour les armes et les sorts). */
function engageFromHere() {
  const e = pending.value?.enemy;
  if (!e) return;
  pending.value = null;
  startFight(e.id, e.encounterId);
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
  heroMoving.value = true;
  cancel = false;
  message.value = "";
  let steps = 0;
  let arrived = false;
  const next: ExplorationState = clone(ex.value);
  const chasers = new Set(Object.keys(next.foes ?? {})); // ceux qui poursuivent déjà ne font pas arrêter la marche
  // Le trajet est recalculé à chaque pas : un ennemi qui approche peut changer la route, ou la cible elle-même.
  for (let guard = 0; guard < 400; guard++) {
    if (cancel) break;
    const dest: Cell = enemy ? livingEnemies(map.value, next).find((e) => e.id === enemy.id) ?? target : target;
    const cur = planPath(next, dest, flags.value);
    if (!cur) { message.value = "Le chemin est coupé."; break; }
    if (cur.path.length === 0) { arrived = true; break; }
    const res = stepTo(next, cur.path[0], flags.value);
    steps += 1;
    walked.value += 1;
    store.setExploration(characterId.value, next);
    centerOnHero();
    if (res.ambush) {
      walking = false;
      heroMoving.value = false;
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
    const fresh = res.chased.filter((e) => !chasers.has(e.id));
    if (fresh.length) {
      fresh.forEach((e) => chasers.add(e.id));
      message.value = `${fresh.map((e) => monsterOf(e.encounterId).name).join(", ")} ${fresh.length > 1 ? "vous poursuivent" : "vous poursuit"} !`;
      break;
    }
    await sleep(STEP_MS);
  }
  walking = false;
  heroMoving.value = false;
  if (!message.value) message.value = steps ? `Vous avez marché ${formatMeters(cellMeters(steps))}.` : "";
  if (!cancel && arrived) {
    if (enemy) startFight(enemy.id, enemy.encounterId);
    else if (plan.spot) openSpot(plan.spot);
  }
}
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.status { margin: 0 0 8px; }
.scroller { max-height: 58vh; overflow: auto; border-radius: 8px; border: 1px solid var(--ion-color-step-200, #444); background: #000; touch-action: pan-x pan-y; }
.tile.seen::after, .tile.unknown::after { content: ""; position: absolute; inset: 0; pointer-events: none; }
.tile.seen::after { background: #000a; }
.tile.unknown::after { background: #000; }
.tile.route::before { content: ""; position: absolute; width: 8px; height: 8px; border-radius: 50%; background: #ffd54a; opacity: 0.9; z-index: 2; pointer-events: none; }
.tile.dest { outline: 2px dashed #fff; outline-offset: -3px; z-index: 1; }
.tile.hero { z-index: 1; }
.spot { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #ffd54a; color: #3a2a00; font-weight: 800; box-shadow: 0 0 0 2px #3a2a00, 0 0 6px #ffd54a; }
.tile.locked { box-shadow: inset 0 0 0 3px #c0392b; }
.grid { position: relative; }
.actor { position: absolute; left: 0; top: 0; z-index: 3; display: flex; align-items: flex-end; justify-content: center; pointer-events: none; transition: transform 140ms linear; }
.actor :deep(.sprite) { position: relative; z-index: 1; margin-bottom: 1px; filter: drop-shadow(0 1px 1px #0008); animation: idle 2.4s ease-in-out infinite; }
.actor.moving :deep(.sprite) { animation: step 0.28s ease-in-out infinite; }
.actor.hero::before { content: ""; position: absolute; left: 50%; top: 50%; width: 160px; height: 160px; margin: -80px 0 0 -80px; border-radius: 50%; background: radial-gradient(circle, #ffd37a55 0, #ffd37a00 70%); }
.actor.hero .base { box-shadow: 0 0 0 2px #4aa3ff; }
.actor.enemy .base { box-shadow: 0 0 0 2px #e0554f; }
.actor.folk .base { box-shadow: 0 0 0 1.5px #9aa0a8; }
@keyframes idle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
@keyframes step { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-3px) rotate(2deg); } }
@media (prefers-reduced-motion: reduce) { .actor { transition: none; } .actor :deep(.sprite) { animation: none !important; } }
.figure { position: relative; display: flex; align-items: flex-end; justify-content: center; width: 100%; height: 100%; }
.figure :deep(.sprite) { position: relative; z-index: 1; margin-bottom: 1px; filter: drop-shadow(0 1px 1px #0008); }
.base { position: absolute; left: 3px; right: 3px; bottom: 0; height: 9px; border-radius: 50%; background: #0006; box-shadow: 0 0 0 2px var(--team, #fff8); }
.hero-fig { --team: #4aa3ff; }
.enemy { --team: #e0554f; }
.npc-fig { --team: #ffd54a; }
.door-hint { display: grid; place-items: center; width: 14px; height: 14px; border-radius: 50%; background: #ffd54a; color: #3a2a00; font-size: 11px; font-weight: 800; box-shadow: 0 0 0 1.5px #3a2a00; position: relative; top: 4px; }
.badge { position: absolute; top: -3px; right: -1px; z-index: 2; display: grid; place-items: center; width: 13px; height: 13px; border-radius: 50%; background: #ffd54a; color: #3a2a00; font-size: 10px; font-weight: 800; box-shadow: 0 0 0 1.5px #3a2a00; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 14px; list-style: none; margin: 8px 0 0; padding: 0; font-size: 0.8rem; opacity: 0.85; }
.legend li { display: flex; align-items: center; gap: 5px; }
.spot.sm { width: 16px; height: 16px; font-size: 0.7rem; box-shadow: 0 0 0 1px #3a2a00; }
.swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; }
.locked-sw { background: #7a4a22; box-shadow: inset 0 0 0 3px #c0392b; }
.enemy-sw { background: #f44; border-radius: 50%; }
.folk-sw { background: #9aa0a8; border-radius: 50%; }
.hero-sw { background: #4aa3ff; border-radius: 50%; }
.fog-sw { background: #000; border: 1px solid #888; }
.message { min-height: 1.4em; margin: 10px 0 0; }
.hint { opacity: 0.75; font-size: 0.85rem; }
</style>
