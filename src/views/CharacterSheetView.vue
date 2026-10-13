<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/" /></ion-buttons>
        <ion-title>{{ c?.name ?? "Personnage" }}</ion-title>
        <ion-buttons slot="end"><ion-menu-button /></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content v-if="c" class="ion-padding">
      <p>{{ c.species.name }} · {{ c.classDef.name }} · {{ c.background.name }} · niveau {{ c.level }}</p>

      <div class="stats">
        <div><strong>{{ c.maxHp }}</strong><small>PV</small></div>
        <div><strong>{{ c.armorClass }}</strong><small>CA</small></div>
        <div><strong>{{ signed(c.initiative) }}</strong><small>Initiative</small></div>
        <div><strong>{{ c.speed }}</strong><small>Vitesse (ft)</small></div>
        <div><strong>{{ signed(c.proficiencyBonus) }}</strong><small>Maîtrise</small></div>
        <div><strong>{{ c.passivePerception }}</strong><small>Perc. passive</small></div>
      </div>

      <ion-button expand="block" :router-link="`/combat/${c.id}`">Lancer un combat</ion-button>

      <ion-list inset>
        <ion-list-header><ion-label>Caractéristiques et sauvegardes</ion-label></ion-list-header>
        <ion-item v-for="a in ABILITIES" :key="a">
          <ion-label>
            {{ ABILITY_NAMES[a] }}
            <p>Sauvegarde {{ signed(c.saves[a].bonus) }}{{ c.saves[a].proficient ? " (maîtrisée)" : "" }}</p>
          </ion-label>
          <ion-note slot="end">{{ c.scores[a] }} ({{ signed(c.modifiers[a]) }})</ion-note>
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header><ion-label>Compétences</ion-label></ion-list-header>
        <ion-item v-for="s in c.skills" :key="s.id">
          <ion-label>{{ s.proficient ? "● " : "○ " }}{{ s.name }} <small>({{ s.ability }})</small></ion-label>
          <ion-note slot="end">{{ signed(s.bonus) }}</ion-note>
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header><ion-label>Don d'origine</ion-label></ion-list-header>
        <ion-item><ion-label>{{ c.originFeat }}</ion-label></ion-item>
      </ion-list>

      <ion-button expand="block" color="danger" fill="outline" @click="del">Supprimer ce personnage</ion-button>
    </ion-content>
    <ion-content v-else class="ion-padding"><p>Personnage introuvable.</p></ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader,
  IonMenuButton, IonNote, IonPage, IonTitle, IonToolbar, useIonRouter,
} from "@ionic/vue";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ABILITIES } from "../engine/rules";
import { ABILITY_NAMES, signed } from "../ui/format";
import { useCharacters } from "../stores/characters";

const store = useCharacters();
const router = useIonRouter();
const route = useRoute();
const c = computed(() => store.get(String(route.params.id)));

function del() {
  if (c.value && window.confirm(`Supprimer ${c.value.name} ?`)) {
    store.remove(c.value.id);
    router.replace("/");
  }
}
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; margin: 12px 0; }
.stats div { background: var(--ion-color-step-100, #222); border-radius: 8px; padding: 8px; }
.stats strong { display: block; font-size: 1.4rem; }
.stats small { opacity: 0.7; }
</style>
