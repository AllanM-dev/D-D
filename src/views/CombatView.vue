<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`/character/${characterId}`" /></ion-buttons>
        <ion-title>{{ state ? `Combat · round ${state.round}` : "Combat" }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="!character" class="ion-padding"><p>Personnage introuvable.</p></ion-content>

    <!-- Choix de la rencontre -->
    <ion-content v-else-if="!state" class="ion-padding">
      <p>{{ character.name }} · {{ character.classDef.name }} · {{ character.maxHp }} PV · CA {{ character.armorClass }}</p>
      <p class="hint">
        Attaque : {{ attack.name }} ({{ signed(attack.toHit) }} pour toucher, {{ attack.damage.count }}d{{ attack.damage.sides }}{{ attack.damage.bonus ? signed(attack.damage.bonus) : "" }}).
        Les PV sont remis à fond au début de chaque combat. L'équipement n'est pas encore géré : la CA est celle d'un personnage sans armure.
      </p>
      <ion-list inset>
        <ion-list-header><ion-label>Choisir une rencontre</ion-label></ion-list-header>
        <ion-item v-for="e in ENCOUNTERS" :key="e.id" button @click="start(e)">
          <ion-label>
            <h2>{{ e.name }}</h2>
            <p>{{ describe(e) }}</p>
          </ion-label>
          <ion-badge slot="end" :color="badge[e.difficulty]">{{ e.difficulty }}</ion-badge>
        </ion-item>
      </ion-list>
    </ion-content>

    <!-- Combat -->
    <ion-content v-else class="ion-padding">
      <ion-list inset>
        <ion-item v-for="c in orderedCombatants" :key="c.id" :class="{ active: c.id === currentId && state.status === 'ongoing' }">
          <ion-label>
            <h2>
              <span v-if="c.id === currentId && state.status === 'ongoing'">▶ </span>{{ c.name }}
              <small>CA {{ c.ac }} · init {{ c.initiative }}</small>
            </h2>
            <ion-progress-bar :value="c.maxHp ? c.hp / c.maxHp : 0" :color="c.side === 'party' ? 'success' : 'danger'" />
            <p>
              <template v-if="c.dead">☠ Mort</template>
              <template v-else-if="c.hp === 0 && c.side === 'party'">
                {{ c.stable ? "Inconscient, stable" : `À terre · jets de mort ${c.deathSaves.successes}✓ ${c.deathSaves.failures}✗` }}
              </template>
              <template v-else>{{ c.hp }} / {{ c.maxHp }} PV<template v-if="c.dodging"> · esquive</template></template>
            </p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- Actions -->
      <div v-if="state.status === 'ongoing'" class="actions">
        <h3>À vous de jouer, {{ currentName }}</h3>
        <p class="hint">Attaquer : {{ attack.name }} · Choisissez une cible</p>
        <ion-button v-for="e in livingEnemies" :key="e.id" expand="block" @click="attackTarget(e.id)">
          Attaquer {{ e.name }} ({{ e.hp }}/{{ e.maxHp }} PV, CA {{ e.ac }})
        </ion-button>
        <ion-button expand="block" fill="outline" @click="dodge">Esquiver (désavantage aux attaques contre vous)</ion-button>
      </div>
      <div v-else class="result" :class="state.status">
        <h2>{{ state.status === "victory" ? "Victoire !" : "Défaite…" }}</h2>
        <ion-button expand="block" @click="state = null">Nouveau combat</ion-button>
        <ion-button expand="block" fill="outline" :router-link="`/character/${characterId}`">Retour à la fiche</ion-button>
      </div>

      <ion-list inset>
        <ion-list-header><ion-label>Journal</ion-label></ion-list-header>
        <ion-item v-for="(line, i) in logReversed" :key="i" lines="none"><ion-label class="ion-text-wrap log">{{ line }}</ion-label></ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton, IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader,
  IonPage, IonProgressBar, IonTitle, IonToolbar,
} from "@ionic/vue";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { ENCOUNTERS, buildEnemies, type EncounterDef } from "../data/encounters";
import { MONSTERS } from "../data/monsters";
import { characterToCombatant, defaultAttack } from "../engine/attacks";
import { currentCombatant, playerAttack, playerDodge, startCombat, type CombatState } from "../engine/combat";
import { useCharacters } from "../stores/characters";
import { signed } from "../ui/format";

const route = useRoute();
const store = useCharacters();
const characterId = computed(() => String(route.params.id));
const character = computed(() => store.get(characterId.value));
const attack = computed(() => defaultAttack(character.value!));

const state = ref<CombatState | null>(null);
const badge = { Facile: "success", Moyen: "warning", Difficile: "danger" } as const;

const describe = (e: EncounterDef) =>
  e.monsters.map((m) => `${m.count} × ${MONSTERS.find((x) => x.id === m.monsterId)!.name}`).join(", ");

const orderedCombatants = computed(() =>
  state.value ? state.value.order.map((id) => state.value!.combatants.find((c) => c.id === id)!) : [],
);
const currentId = computed(() => (state.value ? state.value.order[state.value.turn] : ""));
const currentName = computed(() => (state.value ? currentCombatant(state.value).name : ""));
const livingEnemies = computed(() => state.value?.combatants.filter((c) => c.side === "enemies" && !c.dead) ?? []);
const logReversed = computed(() => [...(state.value?.log ?? [])].reverse());

function start(e: EncounterDef) {
  state.value = startCombat([characterToCombatant(character.value!)], buildEnemies(e));
}
const attackTarget = (id: string) => playerAttack(state.value!, id);
const dodge = () => playerDodge(state.value!);
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.hint { opacity: 0.8; font-size: 0.9rem; }
.active { --background: var(--ion-color-step-150, #333); }
h2 small { opacity: 0.7; font-weight: normal; font-size: 0.8rem; margin-left: 6px; }
.actions { margin: 12px 0; }
.result { text-align: center; margin: 12px 0; }
.result.victory h2 { color: var(--ion-color-success); }
.result.defeat h2 { color: var(--ion-color-danger); }
.log { font-size: 0.85rem; }
</style>
