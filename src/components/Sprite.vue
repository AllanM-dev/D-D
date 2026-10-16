<template>
  <svg v-if="body" class="sprite" viewBox="-2 -4 36 36" :width="size" :height="size" :role="label ? 'img' : undefined" :aria-label="label || undefined" :aria-hidden="label ? undefined : 'true'" v-html="body" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { spriteSvg } from "../ui/sprites";

const props = withDefaults(defineProps<{ sprite?: string; size?: number; label?: string }>(), { size: 36 });
const body = computed(() => spriteSvg(props.sprite));
</script>

<style scoped>
.sprite { display: block; overflow: visible; flex: none; }
</style>
