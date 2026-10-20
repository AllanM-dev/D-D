<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>Réglages</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list inset>
        <ion-list-header><ion-label>Musique d'ambiance</ion-label></ion-list-header>
        <ion-item>
          <ion-toggle v-model="s.musicOn">Musique</ion-toggle>
        </ion-item>
        <ion-item>
          <ion-range v-model="musicPct" :min="0" :max="100" :step="5" :disabled="!s.musicOn" aria-label="Volume de la musique" label-placement="start" label="Volume">
            <span slot="end" class="pct">{{ musicPct }} %</span>
          </ion-range>
        </ion-item>
        <ion-item lines="none">
          <ion-label class="ion-text-wrap"><p>La musique change selon le lieu : accueil, village, crypte, histoire et combat. Elle est composée en direct par l'application.</p></ion-label>
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header><ion-label>Effets sonores</ion-label></ion-list-header>
        <ion-item>
          <ion-toggle v-model="s.sfxOn">Effets sonores</ion-toggle>
        </ion-item>
        <ion-item>
          <ion-range v-model="sfxPct" :min="0" :max="100" :step="5" :disabled="!s.sfxOn" aria-label="Volume des effets sonores" label-placement="start" label="Volume">
            <span slot="end" class="pct">{{ sfxPct }} %</span>
          </ion-range>
        </ion-item>
        <ion-item lines="none">
          <ion-button fill="outline" size="small" :disabled="!s.sfxOn" @click="playSfx('dice')">Essayer : dés</ion-button>
          <ion-button fill="outline" size="small" :disabled="!s.sfxOn" @click="playSfx('crit')">Coup critique</ion-button>
          <ion-button fill="outline" size="small" :disabled="!s.sfxOn" @click="playSfx('levelup')">Niveau</ion-button>
        </ion-item>
      </ion-list>

      <p class="hint">Le son démarre au premier toucher de l'écran (une règle des navigateurs) et se met en pause quand l'application passe en arrière-plan.</p>
      <ion-button expand="block" fill="clear" @click="sound.reset()">Rétablir les réglages par défaut</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonMenuButton, IonPage, IonRange, IonTitle, IonToggle, IonToolbar } from "@ionic/vue";
import { computed } from "vue";
import { useSound } from "../stores/sound";
import { playSfx } from "../ui/audio";

const sound = useSound();
const s = computed(() => sound.settings);
/** Les curseurs vont de 0 à 100 % ; les réglages sont enregistrés de 0 à 1. */
const percent = (key: "musicVolume" | "sfxVolume") => computed({
  get: () => Math.round(sound.settings[key] * 100),
  set: (v: number) => { sound.settings[key] = Math.min(100, Math.max(0, Number(v))) / 100; },
});
const musicPct = percent("musicVolume");
const sfxPct = percent("sfxVolume");
</script>

<style scoped>
.pct { min-width: 3.2em; text-align: right; font-variant-numeric: tabular-nums; }
.hint { font-size: 0.9rem; opacity: 0.8; margin: 8px 16px; }
</style>
