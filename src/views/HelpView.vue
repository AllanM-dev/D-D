<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>Aide</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>Tout ce qu'il faut savoir pour jouer, avec la fiche de chaque classe, espèce et historique.</p>
      <ion-list inset>
        <ion-item v-for="s in sections" :key="s.path" button :router-link="s.path" detail>
          <ion-label>
            <h2>{{ s.title }}</h2>
            <p>{{ s.text }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <p class="credit">
        Règles D&amp;D 5.5 (2024) d'après le SRD 5.2 de Wizards of the Coast, sous licence CC-BY-4.0. Projet non officiel.
      </p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonMenuButton, IonPage, IonTitle, IonToolbar } from "@ionic/vue";

const sections = [
  { path: "/help/guide", title: "Utiliser l'application", text: "Créer un personnage, lancer un combat, lancer vos dés, sauvegarde." },
  { path: "/help/rules", title: "Règles de base", text: "Jet de d20, avantage, PV, CA, initiative, jets de mort…" },
  { path: "/help/abilities", title: "Caractéristiques", text: "À quoi servent Force, Dextérité, Constitution, Intelligence, Sagesse, Charisme." },
  { path: "/help/classes", title: "Classes", text: "Les 12 classes : rôle, capacités de niveau 1, caractéristiques à privilégier." },
  { path: "/help/species", title: "Espèces", text: "Les 9 espèces : taille, vitesse et traits." },
  { path: "/help/spells", title: "Sorts", text: "Sorts mineurs et de niveau 1 : effet, portée, durée, et ce que le jeu applique." },
  { path: "/help/conditions", title: "États", text: "Empoisonné, à terre, paralysé… : ce qu'ils font et lesquels le jeu applique." },
  { path: "/help/items", title: "Objets", text: "Potions, trésors et objets de quête : ce qu'ils font et où les trouver." },
  { path: "/help/weapons", title: "Armes", text: "Dégâts, portée et propriétés des armes de départ." },
  { path: "/help/armors", title: "Armures", text: "Armures et boucliers : CA, Dextérité, Force minimale." },
  { path: "/help/backgrounds", title: "Historiques", text: "Les 4 historiques : bonus, compétences et don d'origine." },
];
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.credit { opacity: 0.6; font-size: 0.8rem; margin-top: 24px; }
</style>
