<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`/help/${kind}`" /></ion-buttons>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end"><ion-menu-button /></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <!-- Classe -->
      <template v-if="cls">
        <p>{{ cls.description }}</p>
        <ion-list inset>
          <ion-item><ion-label>Dé de vie</ion-label><ion-note slot="end">d{{ cls.hitDie }}</ion-note></ion-item>
          <ion-item><ion-label>Jets de sauvegarde maîtrisés</ion-label><ion-note slot="end">{{ cls.savingThrows.map((a) => ABILITY_NAMES[a]).join(", ") }}</ion-note></ion-item>
          <ion-item>
            <ion-label class="ion-text-wrap">
              Compétences à choisir : {{ cls.skillChoices.count }}
              <p>{{ cls.skillChoices.from.length === SKILLS.length ? "au choix parmi toutes les compétences" : "parmi " + cls.skillChoices.from.map(skillName).join(", ") }}</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <h3>Caractéristiques à privilégier</h3>
        <ion-list inset>
          <ion-item v-for="(a, i) in cls.priority" :key="a">
            <ion-label><span v-if="i < KEY_ABILITY_COUNT" class="star">★ </span>{{ i + 1 }}. {{ ABILITY_NAMES[a] }}</ion-label>
          </ion-item>
        </ion-list>
        <p class="note">{{ cls.advice }}</p>

        <h3>Capacités de niveau 1</h3>
        <ion-list inset>
          <ion-item v-for="f in cls.features" :key="f" lines="full">
            <ion-label class="ion-text-wrap"><h2>{{ f }}</h2><p>{{ CLASS_FEATURE_TEXT[cls.id]?.[f] }}</p></ion-label>
          </ion-item>
        </ion-list>
      </template>

      <!-- Espèce -->
      <template v-else-if="sp">
        <p>{{ sp.description }}</p>
        <ion-list inset>
          <ion-item><ion-label>Taille</ion-label><ion-note slot="end">{{ sp.size }}</ion-note></ion-item>
          <ion-item><ion-label>Vitesse</ion-label><ion-note slot="end">{{ sp.speed }} pieds ({{ (sp.speed * 0.3).toFixed(1).replace(".0", "") }} m)</ion-note></ion-item>
        </ion-list>
        <h3>Traits</h3>
        <ion-list inset>
          <ion-item v-for="t in sp.traits" :key="t" lines="full">
            <ion-label class="ion-text-wrap"><h2>{{ t }}</h2><p>{{ SPECIES_TRAIT_TEXT[sp.id]?.[t] }}</p></ion-label>
          </ion-item>
        </ion-list>
        <p class="note">Les traits d'espèce sont décrits ici à titre d'information : le jeu ne les applique pas encore automatiquement.</p>
      </template>

      <!-- Historique -->
      <template v-else-if="bg">
        <p>{{ BACKGROUND_TEXT[bg.id] }}</p>
        <ion-list inset>
          <ion-item>
            <ion-label class="ion-text-wrap">
              Bonus de caractéristiques
              <p>+2 / +1 ou +1 / +1 / +1 parmi : {{ bg.abilityOptions.map((a) => ABILITY_NAMES[a]).join(", ") }}</p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label class="ion-text-wrap">
              Compétences accordées
              <p>{{ bg.skills.map(skillName).join(", ") }}</p>
            </ion-label>
          </ion-item>
        </ion-list>
        <h3>Don d'origine</h3>
        <ion-list inset>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap"><h2>{{ bg.originFeat }}</h2><p>{{ FEAT_TEXT[bg.originFeat] }}</p></ion-label>
          </ion-item>
        </ion-list>
      </template>

      <p v-else>Fiche introuvable.</p>

      <ion-button v-if="cls || sp || bg" expand="block" fill="outline" router-link="/create">Créer un personnage</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonMenuButton, IonNote,
  IonPage, IonTitle, IonToolbar,
} from "@ionic/vue";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { BACKGROUNDS } from "../data/backgrounds";
import { CLASSES } from "../data/classes";
import { BACKGROUND_TEXT, CLASS_FEATURE_TEXT, FEAT_TEXT, SPECIES_TRAIT_TEXT } from "../data/help";
import { SKILLS, type SkillId } from "../data/skills";
import { SPECIES } from "../data/species";
import { KEY_ABILITY_COUNT } from "../engine/advice";
import { ABILITY_NAMES } from "../ui/format";

const route = useRoute();
const kind = computed(() => String(route.params.kind));
const id = computed(() => String(route.params.id));
const cls = computed(() => (kind.value === "classes" ? CLASSES.find((c) => c.id === id.value) : undefined));
const sp = computed(() => (kind.value === "species" ? SPECIES.find((s) => s.id === id.value) : undefined));
const bg = computed(() => (kind.value === "backgrounds" ? BACKGROUNDS.find((b) => b.id === id.value) : undefined));
const title = computed(() => cls.value?.name ?? sp.value?.name ?? bg.value?.name ?? "Aide");
const skillName = (s: SkillId) => SKILLS.find((x) => x.id === s)!.name;
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
h3 { margin: 20px 0 8px; }
.note { opacity: 0.8; font-size: 0.9rem; }
.star { color: var(--ion-color-warning, #fc0); }
</style>
