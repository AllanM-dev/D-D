<template>
  <ion-app>
    <ion-menu content-id="main-content" side="start">
      <ion-header>
        <ion-toolbar><ion-title>Menu</ion-title></ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-menu-toggle v-for="item in items" :key="item.path" :auto-hide="false">
            <ion-item button :router-link="item.path" router-direction="root" lines="none" :detail="false">
              <ion-label :class="{ sub: item.sub }">{{ item.label }}</ion-label>
            </ion-item>
          </ion-menu-toggle>
        </ion-list>
      </ion-content>
    </ion-menu>
    <ion-router-outlet id="main-content" />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonContent, IonHeader, IonItem, IonLabel, IonList, IonMenu, IonMenuToggle, IonRouterOutlet, IonTitle, IonToolbar } from "@ionic/vue";

const items = [
  { path: "/", label: "Accueil", sub: false },
  { path: "/help", label: "Aide", sub: false },
  { path: "/help/guide", label: "Utiliser l'application", sub: true },
  { path: "/help/rules", label: "Règles de base", sub: true },
  { path: "/help/classes", label: "Classes", sub: true },
  { path: "/help/species", label: "Espèces", sub: true },
  { path: "/help/backgrounds", label: "Historiques", sub: true },
  { path: "/help/abilities", label: "Caractéristiques", sub: true },
];
</script>

<style scoped>
.sub { padding-left: 16px; opacity: 0.85; }
</style>
