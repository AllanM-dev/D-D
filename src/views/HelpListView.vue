<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/help" /></ion-buttons>
        <ion-title>{{ kind ? HELP_KINDS[kind].title : "Aide" }}</ion-title>
        <ion-buttons slot="end"><ion-menu-button /></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list v-if="kind" inset>
        <ion-item v-for="e in helpEntries(kind)" :key="e.id" button detail :router-link="`/help/${kind}/${e.id}`">
          <ion-label class="ion-text-wrap">
            <h2>{{ e.name }}</h2>
            <p>{{ e.summary }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <p v-else>Page d'aide introuvable.</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { HELP_KINDS, helpEntries, isHelpKind } from "../ui/helpLists";

const route = useRoute();
const kind = computed(() => (isHelpKind(String(route.params.kind)) ? (String(route.params.kind) as keyof typeof HELP_KINDS) : null));
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
</style>
