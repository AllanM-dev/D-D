<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>D&amp;D Mobile</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-button expand="block" router-link="/create">Créer un personnage</ion-button>

      <ion-list v-if="store.list.length" inset>
        <ion-list-header><ion-label>Mes personnages</ion-label></ion-list-header>
        <ion-item v-for="c in store.list" :key="c.id" button :router-link="`/character/${c.id}`">
          <ion-label>
            <h2>{{ c.name }}</h2>
            <p>{{ c.species.name }} · {{ c.classDef.name }} · niveau {{ c.level }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <p v-else class="ion-text-center">Aucun personnage pour l'instant.</p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonMenuButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import { useCharacters } from "../stores/characters";

const store = useCharacters();
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
</style>
