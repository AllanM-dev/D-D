<template>
  <ion-page>
    <ion-header>
      <ion-toolbar><ion-title>D&amp;D Mobile</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>FOR 16 → mod {{ abilityModifier(16) }} · niveau 5 → maîtrise +{{ proficiencyBonus(5) }}</p>
      <ion-button @click="roll">Lancer un d20</ion-button>
      <p v-if="last !== null">Résultat : {{ last }}</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import { ref } from "vue";
import { rollD20 } from "../engine/dice";
import { abilityModifier, proficiencyBonus } from "../engine/rules";

const last = ref<number | null>(null);
const roll = () => (last.value = rollD20().total);
</script>
