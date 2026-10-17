<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`/map/${characterId}`" /></ion-buttons>
        <ion-title>{{ shop?.name ?? "Boutique" }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="!character || !shop" class="ion-padding"><p>Boutique introuvable.</p></ion-content>
    <ion-content v-else class="ion-padding">
      <p class="purse">{{ character.equipment.gold }} po</p>
      <p>{{ shop.text }}</p>
      <ion-segment v-model="tab" class="tabs">
        <ion-segment-button value="buy"><ion-label>Acheter</ion-label></ion-segment-button>
        <ion-segment-button value="sell"><ion-label>Vendre</ion-label></ion-segment-button>
      </ion-segment>
      <p v-if="message" class="msg" role="status">{{ message }}</p>

      <ion-list v-if="tab === 'buy'" inset>
        <ion-item v-for="id in shop.stock" :key="id" lines="full">
          <ion-label class="ion-text-wrap">
            {{ getItem(id)?.name }}
            <p>{{ blurb(id) }}</p>
            <p v-if="warn(id)" class="warn">{{ warn(id) }}</p>
          </ion-label>
          <ion-button slot="end" size="small" :disabled="character.equipment.gold < buyPrice(id)" @click="doBuy(id)">{{ buyPrice(id) }} po</ion-button>
        </ion-item>
      </ion-list>

      <ion-list v-else inset>
        <ion-item v-for="id in sellableIds" :key="id" lines="full">
          <ion-label class="ion-text-wrap">
            {{ getItem(id)?.name }}<template v-if="(character.inventory?.[id] ?? 0) > 1"> × {{ character.inventory?.[id] }}</template>
            <p>{{ blurb(id) }}</p>
          </ion-label>
          <ion-button slot="end" size="small" color="secondary" @click="doSell(id)">{{ sellPrice(id) }} po</ion-button>
        </ion-item>
        <ion-item v-if="!sellableIds.length" lines="none"><ion-label class="ion-text-wrap"><p>Rien dans votre sac que ce marchand rachète. Les objets équipés se rangent d'abord depuis la fiche du personnage.</p></ion-label></ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToolbar,
} from "@ionic/vue";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { ARMORS, WEAPONS } from "../data/equipment";
import { getItem } from "../data/items";
import { SHOP_BY_ID } from "../data/shops";
import { armorTrained, isWeaponProficient } from "../engine/equipment";
import { buy, buyPrice, sell, sellPrice, sellable } from "../engine/shop";
import { useCharacters } from "../stores/characters";

const route = useRoute();
const store = useCharacters();
const characterId = computed(() => String(route.params.id));
const character = computed(() => store.get(characterId.value));
const shop = computed(() => SHOP_BY_ID[String(route.query.shop ?? "")]);
const tab = ref<"buy" | "sell">("buy");
const message = ref("");
const sellableIds = computed(() => (character.value ? sellable(character.value, shop.value?.id ?? "") : []));

/** Description courte d'un article. */
function blurb(id: string): string {
  const d = getItem(id)!;
  const base = id.startsWith("weapon:") ? weaponBlurb(id.slice(7)) : id.startsWith("armor:") ? armorBlurb(id.slice(6)) : d.text;
  return base;
}
function weaponBlurb(id: string) {
  const w = WEAPONS.find((x) => x.id === id)!;
  return `${w.category === "simple" ? "Courante" : "De guerre"} · ${w.damage.count}d${w.damage.sides} ${w.damageType}${w.ranged ? " · à distance" : ""}`;
}
function armorBlurb(id: string) {
  const a = ARMORS.find((x) => x.id === id)!;
  return a.kind === "shield" ? "Bouclier · +2 CA" : `${a.kind === "light" ? "Légère" : a.kind === "medium" ? "Intermédiaire" : "Lourde"} · CA ${a.baseAc}${a.minStr ? ` · Force ${a.minStr} requise` : ""}`;
}
/** Avertit quand la classe ne sait pas se servir de l'article. */
function warn(id: string): string {
  const c = character.value;
  if (!c) return "";
  if (id.startsWith("weapon:")) {
    const w = WEAPONS.find((x) => x.id === id.slice(7))!;
    return isWeaponProficient(c.classDef.id, w, c.order) ? "" : "Vous n'en avez pas la maîtrise (pas de bonus de maîtrise).";
  }
  if (id.startsWith("armor:")) {
    const a = ARMORS.find((x) => x.id === id.slice(6))!;
    return armorTrained(c.classDef.id, a.kind, c.order) ? "" : "Non maîtrisée : désavantage aux attaques et aucun sort.";
  }
  return "";
}

function doBuy(id: string) {
  try {
    const t = buy(character.value!, shop.value.id, id);
    store.addLoot(characterId.value, { gold: t.gold, items: t.items });
    message.value = `Acheté : ${getItem(id)!.name} (${-t.gold} po).`;
  } catch (e) { message.value = (e as Error).message; }
}
function doSell(id: string) {
  try {
    const t = sell(character.value!, shop.value.id, id);
    store.addLoot(characterId.value, { gold: t.gold, items: t.items });
    message.value = `Vendu : ${getItem(id)!.name} (+${t.gold} po).`;
  } catch (e) { message.value = (e as Error).message; }
}
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.purse { float: right; margin: 4px 0 0; font-weight: 600; }
.tabs { margin: 8px 0; }
.msg { font-style: italic; }
.warn { color: var(--ion-color-warning, #ffc409); }
</style>
