<template>
  <div ref="scroller" class="scroller" role="application" aria-label="Terrain du combat">
    <div class="grid" :style="{ gridTemplateColumns: `repeat(${grid.width}, ${TILE}px)` }">
      <template v-for="(row, y) in grid.tiles" :key="y">
        <div
          v-for="(kind, x) in row"
          :key="`${x},${y}`"
          class="tile"
          :class="[kind, { route: onRoute(x, y), dest: isDest(x, y) }]"
          :style="{ width: TILE + 'px', height: TILE + 'px', backgroundImage: tileBackground(grid.tiles, x, y) }"
          @click="emit('tap', { x, y })"
        >
        </div>
      </template>
      <!-- Combattants : ils glissent d'une case à l'autre, clignotent quand ils sont touchés et s'effacent quand ils tombent. -->
      <TransitionGroup name="actor" tag="div" class="actors">
        <div
          v-for="c in living"
          :key="c.id"
          class="token"
          :class="[c.side, { active: c.id === activeId, hurt: hurt.has(c.id) }]"
          :style="{ width: TILE + 'px', height: TILE + 'px', transform: `translate(${c.pos!.x * TILE}px, ${c.pos!.y * TILE}px)` }"
          :title="c.name"
        >
          <span class="base" />
          <Sprite v-if="c.sprite" :sprite="c.sprite" :size="TILE + 4" :label="c.name" />
          <Illustration v-else-if="c.art" :art="c.art" :size="TILE - 6" :label="c.name" />
          <span class="hpbar" aria-hidden="true"><i :style="{ width: Math.max(0, Math.round((c.hp / c.maxHp) * 100)) + '%' }" /></span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import Illustration from "./Illustration.vue";
import Sprite from "./Sprite.vue";
import { gridOf, type Arena } from "../engine/battlefield";
import type { Combatant } from "../engine/combat";
import type { Cell } from "../engine/exploration";
import { tileBackground } from "../ui/tileArt";
import "../ui/tiles.css";

const TILE = 32;
const props = defineProps<{
  arena: Arena;
  combatants: Combatant[];
  activeId: string;
  /** Trajet prévu (points jaunes) et destination (pointillés). */
  route?: Cell[];
  dest?: Cell | null;
}>();
const emit = defineEmits<{ tap: [Cell] }>();

const grid = computed(() => gridOf(props.arena));
const scroller = ref<HTMLElement | null>(null);
const living = computed(() => props.combatants.filter((c) => c.pos && !c.dead));
// Un combattant qui perd des PV clignote brièvement.
const hurt = ref(new Set<string>());
const lastHp = new Map<string, number>();
watch(() => props.combatants.map((c) => `${c.id}:${c.hp}`).join("|"), () => {
  for (const c of props.combatants) {
    const before = lastHp.get(c.id);
    if (before !== undefined && c.hp < before) {
      hurt.value = new Set([...hurt.value, c.id]);
      setTimeout(() => { const next = new Set(hurt.value); next.delete(c.id); hurt.value = next; }, 500);
    }
    lastHp.set(c.id, c.hp);
  }
}, { immediate: true });
const routeKeys = computed(() => new Set((props.route ?? []).map((c) => `${c.x},${c.y}`)));
const onRoute = (x: number, y: number) => routeKeys.value.has(`${x},${y}`);
const isDest = (x: number, y: number) => props.dest?.x === x && props.dest?.y === y;

function centerOnActive() {
  nextTick(() => scroller.value?.querySelector(".token.active")?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" }));
}
watch(() => props.activeId, centerOnActive);
watch(scroller, centerOnActive);
</script>

<style scoped>
.scroller { max-height: 42vh; overflow: auto; border-radius: 8px; border: 1px solid var(--ion-color-step-200, #444); background: #000; touch-action: pan-x pan-y; margin: 8px 0; }
.grid { position: relative; }
.actors { position: absolute; left: 0; top: 0; pointer-events: none; }
.token { position: absolute; left: 0; top: 0; z-index: 3; display: flex; align-items: flex-end; justify-content: center; transition: transform 160ms linear, opacity 0.35s ease; }
.token :deep(.sprite) { position: relative; margin-bottom: 1px; z-index: 1; filter: drop-shadow(0 1px 1px #0008); animation: idle 2.4s ease-in-out infinite; }
.token.hurt :deep(.sprite) { animation: hurt 0.5s ease; }
.actor-leave-to { opacity: 0; }
.actor-leave-to :deep(.sprite) { transform: translateY(4px) rotate(8deg); }
@keyframes idle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
@keyframes hurt {
  0% { filter: drop-shadow(0 0 5px #f33) brightness(2); transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-2px); }
  100% { filter: drop-shadow(0 1px 1px #0008); transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) { .token { transition: none; } .token :deep(.sprite) { animation: none !important; } }
.base { position: absolute; left: 3px; right: 3px; bottom: 0; height: 9px; border-radius: 50%; background: #0006; box-shadow: 0 0 0 2px var(--team, #fff8); }
.token.enemies { --team: #e0554f; }
.token.party { --team: #4aa3ff; }
.token.active .base { box-shadow: 0 0 0 2px #ffd54a, 0 0 8px 2px #ffd54a; }
.hpbar { position: absolute; left: 4px; right: 4px; top: -1px; height: 3px; border-radius: 2px; background: #000a; z-index: 2; overflow: hidden; }
.hpbar i { display: block; height: 100%; background: #4cd964; }
.token.enemies .hpbar i { background: #ff5a4f; }
.tile.route::before { content: ""; position: absolute; width: 8px; height: 8px; border-radius: 50%; background: #ffd54a; opacity: 0.9; z-index: 2; pointer-events: none; }
.tile.dest { outline: 2px dashed #fff; outline-offset: -3px; z-index: 1; }
</style>
