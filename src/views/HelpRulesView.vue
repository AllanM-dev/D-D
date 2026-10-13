<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/help" /></ion-buttons>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end"><ion-menu-button /></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-accordion-group v-if="!abilities" multiple>
        <ion-accordion v-for="r in entries" :key="r.title" :value="r.title">
          <ion-item slot="header"><ion-label class="ion-text-wrap">{{ r.title }}</ion-label></ion-item>
          <div slot="content" class="detail"><p>{{ r.text }}</p></div>
        </ion-accordion>
      </ion-accordion-group>

      <template v-else>
        <p>Chaque personnage a six caractéristiques. Le modificateur (score − 10, divisé par 2, arrondi à l'inférieur) s'ajoute à tes jets.</p>
        <ion-list inset>
          <ion-item v-for="a in ABILITY_HELP" :key="a.id" lines="full">
            <ion-label class="ion-text-wrap">
              <h2>{{ a.name }}</h2>
              <p>{{ a.text }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
        <h3>Compétences</h3>
        <ion-list inset>
          <ion-item v-for="s in SKILLS" :key="s.id">
            <ion-label>{{ s.name }}</ion-label>
            <ion-note slot="end">{{ ABILITY_NAMES[s.ability] }}</ion-note>
          </ion-item>
        </ion-list>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonAccordion, IonAccordionGroup, IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList,
  IonMenuButton, IonNote, IonPage, IonTitle, IonToolbar,
} from "@ionic/vue";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ABILITY_HELP, APP_GUIDE, BASIC_RULES } from "../data/help";
import { SKILLS } from "../data/skills";
import { ABILITY_NAMES } from "../ui/format";

const route = useRoute();
const abilities = computed(() => route.path.endsWith("/abilities"));
const guide = computed(() => route.path.endsWith("/guide"));
const title = computed(() => (abilities.value ? "Caractéristiques" : guide.value ? "Utiliser l'application" : "Règles de base"));
const entries = computed(() => (guide.value ? APP_GUIDE : BASIC_RULES));
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.detail { padding: 0 16px 12px; }
h3 { margin: 20px 0 8px; }
</style>
