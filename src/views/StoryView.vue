<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`/map/${characterId}`" /></ion-buttons>
        <ion-title>{{ story?.title ?? "Histoire" }}</ion-title>
        <ion-buttons slot="end">
          <ion-toggle v-model="animate" aria-label="Animation de mes jets de dés">Mes dés</ion-toggle>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="!character || !story || !scene" class="ion-padding"><p>Scène introuvable.</p></ion-content>
    <ion-content v-else class="ion-padding">
      <p class="purse">{{ character.equipment.gold }} po<template v-if="potions"> · {{ potions }} potion{{ potions > 1 ? "s" : "" }} de soin</template></p>
      <h2>{{ scene.title }}</h2>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <p v-for="(p, i) in paragraphs" :key="i" class="para">{{ p }}</p>

      <!-- Test de compétence en cours -->
      <template v-if="roll">
        <DiceRoll :key="roll.event.id" :event="roll.event" start-mode="button" :next-label="null" @done="afterRoll" />
      </template>

      <div v-else class="choices">
        <ion-button v-for="c in choices" :key="c.index" expand="block" :color="c.choice.fight ? 'danger' : 'primary'" @click="choose(c.index)">
          {{ c.choice.text }}
          <span v-if="c.choice.check" class="tag"> ({{ skillName(c.choice.check.skill) }})</span>
          <span v-else-if="c.choice.fight" class="tag"> (combat)</span>
        </ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToggle, IonToolbar, useIonRouter } from "@ionic/vue";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import DiceRoll from "../components/DiceRoll.vue";
import { STORY_BY_ID } from "../data/stories";
import { defeatEnemy } from "../engine/exploration";
import type { RollEvent } from "../engine/combat";
import { availableChoices, enterScene, resolveChoice, sceneText, skillName, type ChoiceOutcome } from "../engine/story";
import { useCharacters } from "../stores/characters";

const route = useRoute();
const router = useIonRouter();
const store = useCharacters();
const characterId = computed(() => String(route.params.id));
const character = computed(() => store.get(characterId.value));
const story = computed(() => STORY_BY_ID[String(route.query.story ?? "")]);
const sceneId = ref(String(route.query.scene ?? ""));
const scene = computed(() => story.value?.scenes[sceneId.value]);
const flags = computed(() => character.value?.story?.flags ?? []);
const wallet = computed(() => ({ gold: character.value?.equipment.gold ?? 0, items: character.value?.inventory ?? {} }));
const paragraphs = computed(() => (scene.value ? sceneText(scene.value, flags.value, wallet.value) : []));
const choices = computed(() => (scene.value ? availableChoices(scene.value, flags.value, wallet.value) : []));
const potions = computed(() => character.value?.inventory?.["healing-potion"] ?? 0);

// Même préférence que pour le combat : animation de mes jets de dés.
const PREF_KEY = "dd-mobile.animateDice";
const animate = ref((() => { try { return localStorage.getItem(PREF_KEY) !== "0"; } catch { return true; } })());
watch(animate, (v) => { try { localStorage.setItem(PREF_KEY, v ? "1" : "0"); } catch { /* stockage indisponible */ } });

const notice = ref("");
const roll = ref<{ event: RollEvent; outcome: ChoiceOutcome } | null>(null);

// La vue peut être réutilisée par le routeur : on suit l'adresse (la scène demandée change).
let enteredFrom = "";
watch(
  [() => route.fullPath, character],
  () => {
    if (!character.value || !story.value || route.fullPath === enteredFrom) return;
    enteredFrom = route.fullPath;
    roll.value = null;
    notice.value = "";
    goTo(String(route.query.scene ?? ""));
  },
  { immediate: true },
);

function goTo(id: string) {
  const next = story.value?.scenes[id];
  if (!next || !character.value) return;
  sceneId.value = id;
  const entered = enterScene(next, flags.value);
  if (entered.length !== flags.value.length) store.setStory(characterId.value, { flags: entered, gold: 0 });
}

const skillBonus = (id: string) => character.value?.skills.find((s) => s.id === id)?.bonus ?? 0;

let nonce = 0;

function choose(index: number) {
  notice.value = "";
  const outcome = resolveChoice(scene.value!, index, flags.value, skillBonus, Math.random, wallet.value);
  if (outcome.check && animate.value) {
    const c = outcome.check;
    roll.value = {
      outcome,
      event: {
        id: ++nonce, kind: "check", actorId: characterId.value, actorName: character.value!.name, side: "party",
        title: `${skillName(c.skill)} : test de ${character.value!.name}`, sides: 20, dice: c.dice, keptIndex: 0,
        modifier: c.modifier, total: c.total, dc: c.dc, outcome: c.success ? "success" : "failure", logLen: 0, round: 0, after: [],
      },
    };
    return;
  }
  proceed(outcome);
}
const afterRoll = () => { const r = roll.value; roll.value = null; if (r) proceed(r.outcome); };

/** Enregistre les effets du choix puis passe à la suite : scène, combat ou retour à la carte. */
function proceed(o: ChoiceOutcome) {
  if (o.check) notice.value = `${skillName(o.check.skill)} : ${o.check.total} contre DD ${o.check.dc} — ${o.check.success ? "réussi" : "raté"}.`;
  store.setStory(characterId.value, { flags: o.flags, gold: o.gold, items: o.items });
  const id = characterId.value;
  const ex = character.value?.exploration;
  if (ex && o.defeated.length) store.setExploration(id, o.defeated.reduce(defeatEnemy, ex));
  if (o.fight) {
    const s = story.value!.id;
    router.push(`/combat/${id}?encounter=${o.fight.encounterId}&from=story&story=${s}&enemy=${o.fight.enemy ?? ""}&win=${o.fight.win}&lose=${o.fight.lose ?? o.fight.win}&t=${Date.now()}`);
  } else if (o.end || !o.next) {
    router.push(`/map/${id}`);
  } else {
    goTo(o.next);
  }
}
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.purse { float: right; margin: 4px 0 0; font-size: 0.85rem; opacity: 0.8; }
.para { line-height: 1.5; }
.choices { margin-top: 16px; }
.choices ion-button { --white-space: normal; text-transform: none; }
.notice { font-style: italic; opacity: 0.85; border-left: 3px solid var(--ion-color-primary, #3880ff); padding-left: 8px; }
.tag { opacity: 0.8; font-size: 0.85em; margin-left: 4px; }
</style>
