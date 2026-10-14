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
      <div class="hero">
        <Illustration :art="artKey('species', c.species.id)" :size="68" :label="`Espèce : ${c.species.name}`" />
        <Illustration :art="artKey('class', c.classDef.id)" :size="68" :label="`Classe : ${c.classDef.name}`" />
        <div class="who">
          <h2>{{ c.name }}</h2>
          <p>{{ c.species.name }} · {{ c.classDef.name }}<br />{{ c.background.name }} · niveau {{ c.level }}</p>
        </div>
      </div>

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
        <ion-list-header><ion-label>Capacités de classe</ion-label></ion-list-header>
        <ion-item v-if="style" lines="full">
          <ion-label class="ion-text-wrap">Style de combat : {{ style.name }}<p>{{ style.text }}</p></ion-label>
        </ion-item>
        <ion-item v-for="f in c.classDef.features" :key="f" lines="full">
          <ion-label class="ion-text-wrap">
            {{ f }}
            <p>{{ FEATURE_STATUS[c.classDef.id]?.[f]?.note ?? CLASS_FEATURE_TEXT[c.classDef.id]?.[f] }}</p>
          </ion-label>
          <ion-note slot="end">{{ statusShort(f) }}</ion-note>
        </ion-item>
      </ion-list>

      <ion-list v-if="casting" inset>
        <ion-list-header><ion-label>Sorts</ion-label></ion-list-header>
        <ion-item lines="full">
          <ion-label class="ion-text-wrap">
            {{ ABILITY_NAMES[casting.ability] }} · DD {{ casting.saveDc }} · attaque de sort {{ signed(casting.attackBonus) }}
            <p>{{ casting.slots.max }} emplacement{{ casting.slots.max > 1 ? "s" : "" }} de niveau 1</p>
          </ion-label>
        </ion-item>
        <ion-item v-for="sp in knownSpells" :key="sp.id" lines="full">
          <ion-label class="ion-text-wrap">
            {{ sp.name }}
            <p>{{ sp.level === 0 ? "Sort mineur" : "Niveau 1" }} · {{ sp.description }}</p>
          </ion-label>
          <ion-note slot="end">{{ isPlayable(sp) ? "Jouable" : "À venir" }}</ion-note>
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
import Illustration from "../components/Illustration.vue";
import { FIGHTING_STYLES } from "../data/fighting-styles";
import { SPELL_BY_ID, isPlayable } from "../data/spells";
import { castingFor } from "../engine/spellcasting";
import { artKey } from "../data/illustrations";
import { CLASS_FEATURE_TEXT, FEATURE_STATUS } from "../data/help";
import { ABILITIES } from "../engine/rules";
import { ABILITY_NAMES, fmtNumber, signed } from "../ui/format";
import { useCharacters } from "../stores/characters";

const store = useCharacters();
const router = useIonRouter();
const route = useRoute();
const c = computed(() => store.get(String(route.params.id)));
const casting = computed(() =>
  c.value
    ? castingFor({
        classId: c.value.classDef.id, modifiers: c.value.modifiers, proficiencyBonus: c.value.proficiencyBonus,
        conSaveBonus: c.value.saves.CON.bonus, unarmored: !c.value.equipment.armor, spells: c.value.spells ?? { cantrips: [], prepared: [] },
      })
    : undefined,
);
const knownSpells = computed(() =>
  casting.value ? [...casting.value.cantrips, ...casting.value.prepared].map((id) => SPELL_BY_ID[id]).filter(Boolean) : [],
);
const style = computed(() => FIGHTING_STYLES.find((st) => st.id === c.value?.fightingStyle));
const statusShort = (feature: string) => {
  const st = FEATURE_STATUS[c.value!.classDef.id]?.[feature]?.status;
  return st === "applied" ? "Actif" : st === "partial" ? "Partiel" : "À venir";
};

function del() {
  if (c.value && window.confirm(`Supprimer ${c.value.name} ?`)) {
    store.remove(c.value.id);
    router.replace("/");
  }
}
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.hero { display: flex; align-items: center; gap: 10px; margin: 4px 0 8px; }
.hero .who { min-width: 0; }
.hero h2 { margin: 0; }
.hero p { margin: 2px 0 0; opacity: 0.8; font-size: 0.9rem; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; margin: 12px 0; }
.stats div { background: var(--ion-color-step-100, #222); border-radius: 8px; padding: 8px; }
.stats strong { display: block; font-size: 1.4rem; }
.stats small { opacity: 0.7; }
</style>
