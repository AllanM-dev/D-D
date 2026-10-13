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
        <div><strong>{{ fmtNumber(c.speed) }}</strong><small>Vitesse (m)</small></div>
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
        <ion-list-header><ion-label>Attaques</ion-label></ion-list-header>
        <ion-item v-for="a in c.attacks" :key="a.name" lines="full">
          <ion-label class="ion-text-wrap">
            {{ a.name }}
            <p>{{ a.damage.count }}d{{ a.damage.sides }}{{ a.damage.bonus ? signed(a.damage.bonus) : "" }} {{ a.damageType }}{{ a.ranged ? " · à distance" : " · corps à corps" }}</p>
          </ion-label>
          <ion-note slot="end">{{ signed(a.toHit) }}</ion-note>
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header><ion-label>Équipement</ion-label></ion-list-header>
        <ion-item lines="full"><ion-label>Armure</ion-label><ion-note slot="end">{{ c.equipment.armor?.name ?? "Aucune" }}</ion-note></ion-item>
        <ion-item lines="full"><ion-label>Bouclier</ion-label><ion-note slot="end">{{ c.equipment.shield ? "Oui (+2 CA)" : "Non" }}</ion-note></ion-item>
        <ion-item v-for="w in c.equipment.weapons" :key="w.id" lines="full">
          <ion-label>{{ w.name }}</ion-label><ion-note v-if="w.qty > 1" slot="end">× {{ w.qty }}</ion-note>
        </ion-item>
        <ion-item v-for="g in c.equipment.gear" :key="g.name" lines="full">
          <ion-label class="ion-text-wrap">{{ g.name }}</ion-label><ion-note v-if="g.qty > 1" slot="end">× {{ g.qty }}</ion-note>
        </ion-item>
        <ion-item lines="none"><ion-label>Pièces d'or</ion-label><ion-note slot="end">{{ c.equipment.gold }} po</ion-note></ion-item>
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
import { ABILITY_NAMES, fmtNumber, signed } from "../ui/format";
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
