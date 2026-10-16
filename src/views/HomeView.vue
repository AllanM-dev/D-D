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
          <Illustration slot="start" :art="artKey('class', c.classDef.id)" :size="44" />
          <ion-label>
            <h2>{{ c.name }}</h2>
            <p>{{ c.species.name }} · {{ c.classDef.name }} · niveau {{ c.level }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <p v-else class="ion-text-center">Aucun personnage pour l'instant.</p>

      <div class="save-box">
        <ion-button fill="outline" size="small" :disabled="!store.list.length" @click="doExport">Exporter ma sauvegarde</ion-button>
        <ion-button fill="outline" size="small" @click="picker?.click()">Importer une sauvegarde</ion-button>
        <input ref="picker" type="file" accept="application/json,.json" hidden aria-label="Choisir un fichier de sauvegarde" @change="doImport" />
        <p v-if="message" class="save-msg" role="status">{{ message }}</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { IonButton, IonButtons, IonMenuButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonPage, IonTitle, IonToolbar } from "@ionic/vue";
import Illustration from "../components/Illustration.vue";
import { artKey } from "../data/illustrations";
import { useCharacters } from "../stores/characters";

const store = useCharacters();
const picker = ref<HTMLInputElement>();
const message = ref("");

function doExport() {
  const blob = new Blob([store.exportAll()], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `dd-mobile-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  message.value = "Sauvegarde exportée : le fichier est dans vos téléchargements.";
}

async function doImport(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  const r = store.importAll(await file.text());
  message.value = "error" in r ? r.error : `Sauvegarde importée : ${r.added} personnage(s) ajouté(s), ${r.replaced} remplacé(s).`;
}
</script>

<style scoped>
.save-box { margin-top: 24px; text-align: center; }
.save-msg { font-size: 0.9rem; opacity: 0.85; }
ion-content { --padding-start: 16px; --padding-end: 16px; }
</style>
