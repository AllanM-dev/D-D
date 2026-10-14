<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>Crédits</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>Merci aux auteurs dont le travail libre rend cette application possible.</p>
      <ion-list v-for="c in CREDITS" :key="c.title" inset>
        <ion-list-header><ion-label>{{ c.title }}</ion-label></ion-list-header>
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <p class="text">{{ c.text }}</p>
            <p v-if="c.notice" class="notice">{{ c.notice }}</p>
            <p v-if="c.links.length" class="links">
              <a v-for="l in c.links" :key="l.url" :href="l.url" target="_blank" rel="noopener noreferrer">{{ l.label }}</a>
            </p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonMenuButton, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import { CREDITS } from "../data/credits";
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.text { white-space: normal; color: var(--ion-text-color, #ddd); }
.notice { white-space: normal; font-size: 0.8rem; opacity: 0.75; font-style: italic; }
.links { margin-top: 8px; display: flex; gap: 16px; flex-wrap: wrap; }
.links a { color: var(--ion-color-primary, #4d8dff); }
</style>
