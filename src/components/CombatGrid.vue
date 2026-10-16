<template>
  <div ref="scroller" class="scroller" role="application" aria-label="Terrain du combat">
    <div class="grid" :style="{ gridTemplateColumns: `repeat(${grid.width}, ${TILE}px)` }">
      <template v-for="(row, y) in grid.tiles" :key="y">
        <div
          v-for="(kind, x) in row"
          :key="`${x},${y}`"
          class="tile"
          :class="[kind, { route: onRoute(x, y), dest: isDest(x, y) }]"
          :style="{ width: TILE + 'px', height: TILE + 'px' }"
          @click="emit('tap', { x, y })"
        >
          <span v-if="at(x, y)" class="token" :class="[at(x, y)!.side, { active: at(x, y)!.id === activeId }]" :title="at(x, y)!.name">
            <Illustration v-if="at(x, y)!.art" :art="at(x, y)!.art" :size="TILE - 6" :label="at(x, y)!.name" />
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import Illustration from "./Illustration.vue";
import { gridOf, type Arena } from "../engine/battlefield";
import type { Combatant } from "../engine/combat";
import type { Cell } from "../engine/exploration";
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
const at = (x: number, y: number) => living.value.find((c) => c.pos!.x === x && c.pos!.y === y);
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
.token { display: flex; border-radius: 50%; }
.token.enemies { filter: drop-shadow(0 0 3px #f44); }
.token.party { filter: drop-shadow(0 0 3px #4af); }
.token.active { outline: 2px solid #ffd54a; outline-offset: 1px; }
.tile.route::before { content: ""; position: absolute; width: 8px; height: 8px; border-radius: 50%; background: #ffd54a; opacity: 0.9; z-index: 2; pointer-events: none; }
.tile.dest { outline: 2px dashed #fff; outline-offset: -3px; z-index: 1; }
</style>
