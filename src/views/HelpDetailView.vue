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
      <div v-if="heroArt" class="hero-art"><Illustration :art="heroArt" :size="104" :label="title" /></div>

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
            <ion-label class="ion-text-wrap">
              <h2>{{ f }}</h2>
              <p>{{ CLASS_FEATURE_TEXT[cls.id]?.[f] }}</p>
              <p v-if="FEATURE_STATUS[cls.id]?.[f]" class="status" :class="FEATURE_STATUS[cls.id][f].status">
                <strong>{{ FEATURE_STATUS_LABEL[FEATURE_STATUS[cls.id][f].status] }}.</strong>
                {{ FEATURE_STATUS[cls.id][f].note }}
              </p>
            </ion-label>
          </ion-item>
        </ion-list>

        <template v-if="cls.id === 'fighter'">
          <h3>Styles de combat disponibles</h3>
          <ion-list inset>
            <ion-item v-for="st in FIGHTING_STYLES" :key="st.id" lines="full">
              <ion-label class="ion-text-wrap"><h2>{{ st.name }}</h2><p>{{ st.text }}</p></ion-label>
            </ion-item>
          </ion-list>
        </template>

        <template v-if="spellCfg">
          <h3>Incantation au niveau 1</h3>
          <ion-list inset>
            <ion-item lines="full"><ion-label>Caractéristique d'incantation</ion-label><ion-note slot="end">{{ ABILITY_NAMES[spellCfg.ability] }}</ion-note></ion-item>
            <ion-item lines="full"><ion-label>Sorts mineurs connus</ion-label><ion-note slot="end">{{ spellCfg.cantrips }}</ion-note></ion-item>
            <ion-item lines="full"><ion-label>Sorts de niveau 1 préparés</ion-label><ion-note slot="end">{{ spellCfg.prepared }}</ion-note></ion-item>
            <ion-item lines="none"><ion-label>Emplacements de niveau 1</ion-label><ion-note slot="end">{{ spellCfg.slots }}</ion-note></ion-item>
          </ion-list>
          <p class="note">Les sorts sont décrits dans la section Sorts de l'Aide.</p>
        </template>

        <h3>Maîtrises</h3>
        <ion-list inset>
          <ion-item lines="full"><ion-label class="ion-text-wrap">Armes<p>{{ WEAPON_TRAINING_TEXT[training.weapons] }}</p></ion-label></ion-item>
          <ion-item lines="none"><ion-label class="ion-text-wrap">Armures<p>{{ training.armor.length ? training.armor.map((a) => ARMOR_TRAINING_TEXT[a]).join(", ") : "aucune armure" }}</p></ion-label></ion-item>
        </ion-list>

        <h3>Équipement de départ</h3>
        <ion-list v-for="k in kits" :key="k.id" inset>
          <ion-list-header v-if="kits.length > 1"><ion-label>{{ k.label }}</ion-label></ion-list-header>
          <ion-item v-for="line in kitLines(k)" :key="line" lines="full"><ion-label class="ion-text-wrap">{{ line }}</ion-label></ion-item>
          <ion-item lines="none"><ion-label>{{ k.gold }} po</ion-label></ion-item>
        </ion-list>
      </template>

      <!-- Sort -->
      <template v-else-if="sp2">
        <ion-list inset>
          <ion-item><ion-label>Niveau</ion-label><ion-note slot="end">{{ sp2.level === 0 ? "Sort mineur" : "Niveau 1" }} · {{ sp2.school }}</ion-note></ion-item>
          <ion-item><ion-label>Incantation</ion-label><ion-note slot="end">{{ TIME_LABEL[sp2.time] }}</ion-note></ion-item>
          <ion-item><ion-label>Portée</ion-label><ion-note slot="end">{{ sp2.range }}</ion-note></ion-item>
          <ion-item><ion-label>Durée</ion-label><ion-note slot="end">{{ sp2.duration }}</ion-note></ion-item>
          <ion-item><ion-label class="ion-text-wrap">Classes<p>{{ sp2.classes.map(className).join(", ") }}</p></ion-label></ion-item>
        </ion-list>
        <p>{{ sp2.description }}</p>
        <p class="status" :class="isPlayable(sp2) ? 'applied' : 'todo'">
          <strong>{{ isPlayable(sp2) ? "Jouable en combat." : "Pas encore jouable en combat." }}</strong>
          {{ sp2.note ?? "" }}
        </p>
      </template>

      <!-- Objet -->
      <template v-else-if="item">
        <ion-list inset>
          <ion-item><ion-label>Type</ion-label><ion-note slot="end">{{ ITEM_KIND_NAMES[item.kind] }}</ion-note></ion-item>
          <ion-item v-if="item.value"><ion-label>Valeur</ion-label><ion-note slot="end">{{ item.value }} po</ion-note></ion-item>
        </ion-list>
        <p>{{ item.text }}</p>
        <p class="status applied"><strong>Dans l'application.</strong> {{ item.note }}</p>
      </template>

      <!-- État -->
      <template v-else-if="cond">
        <p>{{ cond.text }}</p>
        <p class="status" :class="cond.status">
          <strong>{{ cond.status === "applied" ? "Appliqué en combat." : "Pas encore appliqué." }}</strong>
          {{ cond.note }}
        </p>
      </template>

      <!-- Arme -->
      <template v-else-if="wp">
        <ion-list inset>
          <ion-item><ion-label>Catégorie</ion-label><ion-note slot="end">{{ wp.category === "simple" ? "Arme courante" : "Arme de guerre" }}</ion-note></ion-item>
          <ion-item><ion-label>Type</ion-label><ion-note slot="end">{{ wp.ranged ? "À distance" : "Corps à corps" }}</ion-note></ion-item>
          <ion-item><ion-label>Dégâts</ion-label><ion-note slot="end">{{ wp.damage.count }}d{{ wp.damage.sides }} {{ wp.damageType }}{{ wp.versatileSides ? ` (1d${wp.versatileSides} à deux mains)` : "" }}</ion-note></ion-item>
          <ion-item v-if="wp.range"><ion-label>Portée</ion-label><ion-note slot="end">{{ fmtNumber(wp.range[0]) }} / {{ formatMeters(wp.range[1]) }}</ion-note></ion-item>
        </ion-list>
        <template v-if="wp.properties.length">
          <h3>Propriétés</h3>
          <ion-list inset>
            <ion-item v-for="p in wp.properties" :key="p" lines="full">
              <ion-label class="ion-text-wrap"><h2>{{ WEAPON_PROPERTY_TEXT[p].name }}</h2><p>{{ WEAPON_PROPERTY_TEXT[p].text }}</p></ion-label>
            </ion-item>
          </ion-list>
        </template>
        <p v-else class="note">Aucune propriété particulière.</p>
        <p class="note">Maîtrisée par les classes dont la fiche mentionne ce type d'arme.</p>
      </template>

      <!-- Armure -->
      <template v-else-if="ar">
        <ion-list inset>
          <ion-item><ion-label>Type</ion-label><ion-note slot="end">{{ ARMOR_KIND_TEXT[ar.kind].name }}</ion-note></ion-item>
          <ion-item><ion-label>{{ ar.kind === "shield" ? "Bonus de CA" : "CA de base" }}</ion-label><ion-note slot="end">{{ ar.kind === "shield" ? "+" : "" }}{{ ar.baseAc }}</ion-note></ion-item>
          <ion-item v-if="ar.minStr"><ion-label>Force minimale</ion-label><ion-note slot="end">{{ ar.minStr }}</ion-note></ion-item>
          <ion-item v-if="ar.stealthDisadvantage"><ion-label>Discrétion</ion-label><ion-note slot="end">Désavantage (pas encore appliqué)</ion-note></ion-item>
        </ion-list>
        <p>{{ ARMOR_KIND_TEXT[ar.kind].text }}</p>
      </template>

      <!-- Espèce -->
      <template v-else-if="sp">
        <p>{{ sp.description }}</p>
        <ion-list inset>
          <ion-item><ion-label>Taille</ion-label><ion-note slot="end">{{ sp.size }}</ion-note></ion-item>
          <ion-item><ion-label>Vitesse</ion-label><ion-note slot="end">{{ formatMeters(sp.speed) }}</ion-note></ion-item>
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
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader, IonMenuButton, IonNote,
  IonPage, IonTitle, IonToolbar,
} from "@ionic/vue";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { BACKGROUNDS } from "../data/backgrounds";
import { CLASSES } from "../data/classes";
import { ARMORS, CLASS_TRAINING, WEAPONS, type Kit } from "../data/equipment";
import { FIGHTING_STYLES } from "../data/fighting-styles";
import {
  ARMOR_KIND_TEXT, ARMOR_TRAINING_TEXT, BACKGROUND_TEXT, CLASS_FEATURE_TEXT, FEAT_TEXT, FEATURE_STATUS, FEATURE_STATUS_LABEL, SPECIES_TRAIT_TEXT,
  WEAPON_PROPERTY_TEXT, WEAPON_TRAINING_TEXT,
} from "../data/help";
import { CONDITION_BY_ID } from "../data/conditions";
import { ITEM_BY_ID, ITEM_KIND_NAMES } from "../data/items";
import { CLASS_SPELLCASTING, SPELL_BY_ID, isPlayable } from "../data/spells";
import { kitsFor } from "../engine/equipment";
import { SKILLS, type SkillId } from "../data/skills";
import { SPECIES } from "../data/species";
import { KEY_ABILITY_COUNT } from "../engine/advice";
import Illustration from "../components/Illustration.vue";
import { ABILITY_NAMES, fmtNumber, formatMeters } from "../ui/format";
import { helpArt } from "../ui/helpLists";

const route = useRoute();
const kind = computed(() => String(route.params.kind));
const id = computed(() => String(route.params.id));
const cls = computed(() => (kind.value === "classes" ? CLASSES.find((c) => c.id === id.value) : undefined));
const sp = computed(() => (kind.value === "species" ? SPECIES.find((s) => s.id === id.value) : undefined));
const bg = computed(() => (kind.value === "backgrounds" ? BACKGROUNDS.find((b) => b.id === id.value) : undefined));
const sp2 = computed(() => (kind.value === "spells" ? SPELL_BY_ID[id.value] : undefined));
const item = computed(() => (kind.value === "items" ? ITEM_BY_ID[id.value] : undefined));
const cond = computed(() => (kind.value === "conditions" ? CONDITION_BY_ID[id.value] : undefined));
const spellCfg = computed(() => (cls.value ? CLASS_SPELLCASTING[cls.value.id] : undefined));
const TIME_LABEL: Record<string, string> = { action: "Action", bonus: "Action bonus", reaction: "Réaction" };
const className = (id: string) => CLASSES.find((c) => c.id === id)?.name ?? id;
const wp = computed(() => (kind.value === "weapons" ? WEAPONS.find((w) => w.id === id.value) : undefined));
const ar = computed(() => (kind.value === "armors" ? ARMORS.find((a) => a.id === id.value) : undefined));
const heroArt = computed(() => helpArt(kind.value, id.value));
const title = computed(() => cls.value?.name ?? sp.value?.name ?? bg.value?.name ?? wp.value?.name ?? ar.value?.name ?? sp2.value?.name ?? cond.value?.name ?? item.value?.name ?? "Aide");
const training = computed(() => CLASS_TRAINING[cls.value?.id ?? ""]);
const kits = computed(() => (cls.value ? kitsFor(cls.value.id) : []));
const kitLines = (k: Kit) =>
  k.entries.map((e) =>
    "weapon" in e ? `${WEAPONS.find((w) => w.id === e.weapon)!.name}${e.qty && e.qty > 1 ? ` × ${e.qty}` : ""}`
    : "armor" in e ? ARMORS.find((a) => a.id === e.armor)!.name
    : `${e.gear}${e.qty && e.qty > 1 ? ` × ${e.qty}` : ""}`);
const skillName = (s: SkillId) => SKILLS.find((x) => x.id === s)!.name;
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
h3 { margin: 20px 0 8px; }
.hero-art { display: flex; justify-content: center; margin: 4px 0 12px; }
.note { opacity: 0.8; font-size: 0.9rem; }
.status { margin-top: 4px; }
.status.applied strong { color: var(--ion-color-success, #2dd36f); }
.status.partial strong { color: var(--ion-color-warning, #ffc409); }
.status.todo strong { opacity: 0.7; }
.star { color: var(--ion-color-warning, #fc0); }
</style>
