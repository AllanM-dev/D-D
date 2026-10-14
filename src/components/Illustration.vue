<template>
  <svg
    v-if="art"
    class="illustration"
    viewBox="0 0 64 64"
    :width="size"
    :height="size"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    :style="{ '--top': top, '--bottom': bottom, '--edge': edge }"
  >
    <defs>
      <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="top" />
        <stop offset="1" :stop-color="bottom" />
      </linearGradient>
    </defs>
    <circle v-if="shape === 'circle'" cx="32" cy="32" r="31" :fill="`url(#${gid})`" :stroke="edge" stroke-width="2" />
    <rect v-else-if="shape === 'square'" x="1.5" y="1.5" width="61" height="61" rx="15" :fill="`url(#${gid})`" :stroke="edge" stroke-width="2" />
    <path v-else d="M32 1.5 L58 16 V48 L32 62.5 L6 48 V16 Z" :fill="`url(#${gid})`" :stroke="edge" stroke-width="2" stroke-linejoin="round" />
    <g class="glyph" v-html="art.glyph" />
  </svg>
</template>

<script setup lang="ts">
import { computed, useId } from "vue";
import { getArt, type ArtKind } from "../data/illustrations";

const props = withDefaults(defineProps<{ art?: string; size?: number; label?: string }>(), { size: 48 });

const gid = `ill-${useId()}`;
const data = computed(() => getArt(props.art));
const kind = computed(() => (props.art?.split(":")[0] ?? "class") as ArtKind);
/** Forme du badge selon le type : cercle (classes, monstres), carré arrondi (espèces), écu (historiques). */
const shape = computed(() => (kind.value === "species" ? "square" : kind.value === "background" ? "shield" : "circle"));
const hue = computed(() => data.value?.hue ?? 220);
const top = computed(() => `hsl(${hue.value} 48% ${kind.value === "monster" ? 34 : 40}%)`);
const bottom = computed(() => `hsl(${hue.value} 52% ${kind.value === "monster" ? 17 : 22}%)`);
const edge = computed(() => (kind.value === "monster" ? "#e0554f" : `hsl(${hue.value} 40% 70%)`));
const art = computed(() => data.value);
</script>

<style scoped>
.illustration { flex: none; display: block; }
.glyph { color: #f4efe4; }
</style>
