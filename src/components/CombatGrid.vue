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
          <span v-if="at(x, y)" class="token" :class="[at(x, y)!.side, { active: at(x, y)!.id === activeId }]" :title="at(x, y)!.name">
            <span class="base" />
            <Sprite v-if="at(x, y)!.sprite" :sprite="at(x, y)!.sprite" :size="TILE + 4" :label="at(x, y)!.name" />
            <Illustration v-else-if="at(x, y)!.art" :art="at(x, y)!.art" :size="TILE - 6" :label="at(x, y)!.name" />
            <span class="hpbar" aria-hidden="true"><i :style="{ width: Math.max(0, Math.round((at(x, y)!.hp / at(x, y)!.maxHp) * 100)) + '%' }" /></span>
          </span>
        </div>
      </template>
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
.token { position: relative; display: flex; align-items: flex-end; justify-content: center; width: 100%; height: 100%; }
.token :deep(.sprite) { position: relative; margin-bottom: 1px; z-index: 1; filter: drop-shadow(0 1px 1px #0008); }
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
