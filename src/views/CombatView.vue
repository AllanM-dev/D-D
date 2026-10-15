<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="fromMap || fromStory ? `/map/${characterId}` : `/character/${characterId}`" /></ion-buttons>
        <ion-title>{{ state ? `Combat · round ${shown?.round ?? state.round}` : "Combat" }}</ion-title>
        <ion-buttons slot="end">
          <ion-toggle v-model="animateDice" aria-label="Animation de mes jets de dés">Mes dés</ion-toggle>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="!character" class="ion-padding"><p>Personnage introuvable.</p></ion-content>

    <!-- Choix de la rencontre -->
    <ion-content v-else-if="!state" class="ion-padding">
      <p>{{ character.name }} · {{ character.classDef.name }} · {{ vitals.hp }}/{{ character.maxHp }} PV · CA {{ character.armorClass }}</p>
      <p class="hint">
        Équipement : {{ outfit }}. Vous choisirez votre arme ou votre sort à chaque attaque.
        Vous combattez avec les PV et les ressources qu'il vous reste : reposez-vous entre deux combats (fiche du personnage).
      </p>
      <ion-list inset>
        <ion-list-header><ion-label>Choisir une rencontre</ion-label></ion-list-header>
        <ion-item v-for="e in ENCOUNTERS" :key="e.id" button @click="start(e)">
          <Illustration slot="start" :art="artKey('monster', e.monsters[0].monsterId)" :size="44" />
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
        <ion-item v-for="c in orderedCombatants" :key="c.id" :class="{ active: c.id === currentId && !busy && state.status === 'ongoing' }">
          <Illustration v-if="c.art" slot="start" :art="c.art" :size="44" />
          <ion-label>
            <h2>
              <span v-if="c.id === currentId && !busy && state.status === 'ongoing'">▶ </span>{{ c.name }}
              <small>CA {{ c.ac }} · init {{ c.initiative }}</small>
            </h2>
            <ion-progress-bar :value="c.maxHp ? c.hp / c.maxHp : 0" :color="c.side === 'party' ? 'success' : 'danger'" />
            <p>
              <template v-if="c.dead">☠ Mort</template>
              <template v-else-if="c.hp === 0 && c.side === 'party'">
                {{ c.stable ? "Inconscient, stable" : `À terre · jets de mort ${c.deathSaves.successes}✓ ${c.deathSaves.failures}✗` }}
              </template>
              <template v-else>
                {{ c.hp }} / {{ c.maxHp }} PV
                <template v-if="c.dodging"> · esquive</template>
                <template v-if="c.raging"> · en rage</template>
                <template v-if="c.innateSorcery"> · magie innée</template>
                <template v-if="c.spellcasting"> · emplacements {{ c.spellcasting.slots.max - c.spellcasting.slots.used }}/{{ c.spellcasting.slots.max }}</template>
                <template v-if="c.concentrating"> · concentré : {{ spellName(c.concentrating.spellId) }}</template>
                <template v-if="isMarked(c.id)"> · marqué</template>
                <template v-if="c.guided"> · éclairé</template>
                <template v-if="c.mocked"> · tourné en ridicule</template>
                <template v-for="cond in c.conditions" :key="cond.id"> · <strong class="cond">{{ conditionName(cond.id) }}</strong></template>
              </template>
            </p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- Lancer de dés -->
      <DiceRoll v-if="currentRoll" :key="currentRoll.id" :event="currentRoll" :start-mode="startMode" :next-label="nextLabel" @done="nextRoll" />
      <ion-button v-if="busy" expand="block" fill="clear" size="small" @click="skipAll">Passer l'animation</ion-button>

      <!-- Réaction -->
      <div v-else-if="state.status === 'ongoing' && state.pending" class="actions reaction">
        <h3>Réaction ?</h3>
        <p>{{ state.pending.summary }}</p>
        <ion-button v-for="o in state.pending.options" :key="o.id" expand="block" color="tertiary" @click="react(o.id)">
          Lancer {{ o.name }} ({{ o.detail }})
        </ion-button>
        <ion-button expand="block" fill="outline" @click="react(null)">Ne pas réagir</ion-button>
      </div>

      <!-- Actions -->
      <div v-else-if="state.status === 'ongoing' && options" class="actions">
        <h3>À vous de jouer, {{ currentName }}</h3>

        <!-- Action bonus -->
        <template v-if="options.bonus.length">
          <h4>Action bonus</h4>
          <template v-for="o in options.bonus" :key="o.id">
            <div v-if="o.amountMax" class="stepper">
              <ion-button size="small" fill="outline" :disabled="layAmount(o.amountMax) <= 1" @click="layDelta(-1, o.amountMax)">−</ion-button>
              <span>{{ layAmount(o.amountMax) }} PV</span>
              <ion-button size="small" fill="outline" :disabled="layAmount(o.amountMax) >= o.amountMax" @click="layDelta(1, o.amountMax)">+</ion-button>
              <ion-button class="grow" @click="layOnHands(o.amountMax)">{{ o.label }} ({{ o.detail }})</ion-button>
            </div>
            <template v-else-if="o.needsTarget">
              <ion-button v-for="e in livingEnemies" :key="e.id" expand="block" @click="bonusStrike(e.id)">
                {{ o.label }} : {{ e.name }}
              </ion-button>
            </template>
            <ion-button v-else expand="block" @click="bonus(o.id)">{{ o.label }} ({{ o.detail }})</ion-button>
          </template>
        </template>

        <!-- Sorts -->
        <template v-if="availableSpells.length">
          <h4>Sorts</h4>
          <ion-item lines="none">
            <ion-select v-model="spellId" label="Sort" label-placement="stacked" interface="action-sheet">
              <ion-select-option v-for="o in options.spells" :key="o.id" :value="o.id" :disabled="!o.available">
                {{ o.name }} · {{ o.detail }}{{ o.time === "bonus" ? " · action bonus" : "" }}{{ o.available ? "" : " — " + o.reason }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <template v-if="pickedSpell">
            <p class="hint">{{ SPELL_BY_ID[pickedSpell.id].description }}</p>
            <template v-if="pickedSpell.target === 'enemy'">
              <ion-button v-for="e in livingEnemies" :key="e.id" expand="block" color="tertiary" @click="cast(pickedSpell.id, e.id)">
                {{ pickedSpell.name }} sur {{ e.name }}{{ pickedSpell.time === "bonus" ? " (action bonus)" : "" }}
              </ion-button>
            </template>
            <ion-button v-else expand="block" color="tertiary" @click="cast(pickedSpell.id)">
              Lancer {{ pickedSpell.name }}{{ pickedSpell.time === "bonus" ? " (action bonus)" : "" }}
            </ion-button>
          </template>
        </template>

        <!-- Action -->
        <template v-if="options.canAct">
          <h4>Action</h4>
          <ion-item v-if="attacks.length > 1" lines="none">
            <ion-select v-model="attackIndex" label="Arme ou sort" label-placement="stacked" interface="action-sheet">
              <ion-select-option v-for="(a, i) in attacks" :key="a.name" :value="i">{{ attackLabel(a) }}</ion-select-option>
            </ion-select>
          </ion-item>
          <p v-else class="hint">Attaque : {{ attackLabel(attacks[0]) }}</p>
          <p class="hint">Choisissez une cible.</p>
          <ion-button v-for="e in livingEnemies" :key="e.id" expand="block" @click="attackTarget(e.id)">
            Attaquer {{ e.name }} ({{ e.hp }}/{{ e.maxHp }} PV, CA {{ e.ac }})
          </ion-button>
          <ion-button expand="block" fill="outline" @click="dodge">Esquiver (désavantage aux attaques contre vous)</ion-button>
        </template>

        <ion-button v-if="options.canEnd" expand="block" fill="clear" @click="endTurn">Terminer le tour</ion-button>
      </div>
      <div v-else-if="finished" class="result" :class="state.status">
        <h2>{{ state.status === "victory" ? "Victoire !" : "Défaite…" }}</h2>
        <p v-if="lootText && state.status === 'victory'" class="loot">Butin : {{ lootText }}</p>
        <template v-if="fromStory">
          <p v-if="state.status === 'defeat'" class="hint">Vous perdez connaissance… (1 PV).</p>
          <ion-button expand="block" :router-link="continueStory">Continuer l'histoire</ion-button>
          <ion-button expand="block" fill="outline" :router-link="`/character/${characterId}`">Fiche et repos</ion-button>
        </template>
        <template v-else-if="fromMap">
          <p v-if="state.status === 'defeat'" class="hint">Vous vous réveillez au village, à bout de forces (1 PV).</p>
          <ion-button expand="block" :router-link="`/map/${characterId}`">Retour à la carte</ion-button>
          <ion-button expand="block" fill="outline" :router-link="`/character/${characterId}`">Fiche et repos</ion-button>
        </template>
        <template v-else>
          <ion-button expand="block" @click="state = null">Nouveau combat</ion-button>
          <ion-button expand="block" fill="outline" :router-link="`/character/${characterId}`">Retour à la fiche</ion-button>
        </template>
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
  IonPage, IonProgressBar, IonSelect, IonSelectOption, IonTitle, IonToggle, IonToolbar,
} from "@ionic/vue";
import { computed, ref, watch } from "vue";
import DiceRoll from "../components/DiceRoll.vue";
import Illustration from "../components/Illustration.vue";
import { artKey } from "../data/illustrations";
import { SPELL_BY_ID } from "../data/spells";
import { castSpell } from "../engine/spellcasting";
import { useRoute } from "vue-router";
import { ENCOUNTERS, buildEnemies, type EncounterDef } from "../data/encounters";
import { MONSTERS } from "../data/monsters";
import { characterToCombatant } from "../engine/attacks";
import { defeatEnemy, retreatToStart } from "../engine/exploration";
import { applyEffects } from "../engine/story";
import { changeItems, describeLoot, enemyLoot, inventoryOf, potionsLeft } from "../engine/inventory";
import { vitalsAfterCombat, vitalsOf } from "../engine/rest";
import {
  conditionName, currentCombatant, playerAttack, playerDodge, playerEndTurn, playerOptions, resolveReaction, startCombat, useFeature,
  type Combatant, type CombatState, type FeatureId, type RollEvent,
} from "../engine/combat";
import { useCharacters } from "../stores/characters";
import { ROLL_BUTTON_LABEL, signed } from "../ui/format";

const route = useRoute();
const store = useCharacters();
const characterId = computed(() => String(route.params.id));
const character = computed(() => store.get(characterId.value));
const vitals = computed(() => vitalsOf(character.value!));
const attacks = computed(() => character.value?.attacks ?? []);
const attackIndex = ref(0);
const attackLabel = (a: (typeof attacks.value)[number]) =>
  `${a.name} · ${signed(a.toHit)} · ${a.damage.count}d${a.damage.sides}${a.damage.bonus ? signed(a.damage.bonus) : ""}${a.ranged ? " · distance" : ""}`;

const state = ref<CombatState | null>(null);
const badge = { Facile: "success", Moyen: "warning", Difficile: "danger" } as const;

const describe = (e: EncounterDef) =>
  e.monsters.map((m) => `${m.count} × ${MONSTERS.find((x) => x.id === m.monsterId)!.name}`).join(", ");

// --- animation des dés : l'état du moteur est déjà à jour, mais l'affichage est rejoué jet par jet
const PREF_KEY = "dd-mobile.animateDice";
const reducedMotion = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
function loadPref(): boolean {
  try {
    const v = localStorage.getItem(PREF_KEY);
    return v === null ? !reducedMotion : v === "1";
  } catch {
    return !reducedMotion;
  }
}
const animateDice = ref(loadPref());
watch(animateDice, (v) => {
  try { localStorage.setItem(PREF_KEY, v ? "1" : "0"); } catch { /* stockage indisponible */ }
});

const currentRoll = ref<RollEvent | null>(null);
const startMode = ref<"button" | "auto">("button");
const nextLabel = ref<string | null>(null);
/** Affichage figé sur l'état qui suit le jet en cours ; null = on montre l'état réel. */
const shown = ref<{ combatants: Combatant[]; logLen: number; round: number } | null>(null);
const busy = ref(false);
let queue: RollEvent[] = [];
let stepDone: (() => void) | null = null;
let skipping = false;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function showRoll(ev: RollEvent): Promise<void> {
  currentRoll.value = ev;
  return new Promise((resolve) => (stepDone = resolve));
}
const nextRoll = () => stepDone?.();
function skipAll() {
  skipping = true;
  queue = [];
  nextRoll();
}

/** Met l'affichage (PV, journal) à l'état qui suit ce jet. */
function reveal(ev: RollEvent) {
  // L'initiative est déjà affichée (liste triée) : on ne remplace l'affichage qu'à partir des attaques.
  if (ev.kind !== "initiative") shown.value = { combatants: ev.after, logLen: ev.logLen, round: ev.round };
}

/**
 * Rejoue les jets (déjà calculés par le moteur). Seuls vos jets ont une scène de dés, déclenchée par un bouton ;
 * ceux des ennemis mettent simplement l'affichage à jour, avec une courte pause pour suivre le journal.
 */
async function play(events: RollEvent[]) {
  skipping = false;
  busy.value = true;
  queue = [...events];
  let auto = false; // vrai si le joueur vient d'appuyer sur « Lancer… » pour ce jet
  while (queue.length) {
    const ev = queue.shift()!;
    const mine = ev.side === "party";
    if (!animateDice.value || skipping) {
      reveal(ev);
    } else if (mine) {
      const next = queue[0];
      const nextMine = !!next && next.side === "party";
      nextLabel.value = nextMine ? ROLL_BUTTON_LABEL[next.kind] : null;
      startMode.value = auto ? "auto" : "button";
      await showRoll(ev);
      reveal(ev);
      auto = nextMine;
      if (!nextMine) currentRoll.value = null;
    } else {
      auto = false;
      reveal(ev);
      if (ev.kind !== "initiative") await sleep(500);
    }
  }
  currentRoll.value = null;
  shown.value = null;
  busy.value = false;
}

const orderedCombatants = computed(() => {
  if (!state.value) return [];
  const list = shown.value?.combatants ?? state.value.combatants;
  return state.value.order.map((id) => list.find((c) => c.id === id)!);
});
const currentId = computed(() => (state.value ? state.value.order[state.value.turn] : ""));
const currentName = computed(() => (state.value ? currentCombatant(state.value).name : ""));
const livingEnemies = computed(() => state.value?.combatants.filter((c) => c.side === "enemies" && !c.dead) ?? []);
const logReversed = computed(() => {
  const log = state.value?.log ?? [];
  return log.slice(0, shown.value?.logLen ?? log.length).reverse();
});
const finished = computed(() => !!state.value && state.value.status !== "ongoing" && !busy.value);

async function act(run: (s: CombatState) => void) {
  const s = state.value!;
  const before = s.rolls.length;
  // Fige l'affichage sur l'état d'avant l'action : les PV ne bougent qu'au fil des jets.
  shown.value = { combatants: JSON.parse(JSON.stringify(s.combatants)), logLen: s.log.length, round: s.round };
  run(s);
  await play(s.rolls.slice(before));
}

const outfit = computed(() => {
  const eq = character.value?.equipment;
  if (!eq) return "aucun";
  const parts = [eq.armor?.name, eq.shield ? "Bouclier" : undefined].filter(Boolean);
  return `${parts.length ? parts.join(" + ") : "aucune armure"}, CA ${character.value!.armorClass}`;
});

async function start(e: EncounterDef) {
  attackIndex.value = 0;
  const s = startCombat([characterToCombatant(character.value!)], buildEnemies(e));
  state.value = s;
  // Affichage de départ : tout le monde à pleins PV (les ennemis qui jouent en premier le seront après leur jet).
  const fresh: Combatant[] = JSON.parse(JSON.stringify(s.combatants));
  const startHp = vitalsOf(character.value!).hp;
  for (const c of fresh) Object.assign(c, { hp: c.side === "party" ? startHp : c.maxHp, dead: false, stable: false, dodging: false, deathSaves: { successes: 0, failures: 0 } });
  shown.value = { combatants: fresh, logLen: 0, round: 1 };
  await play(s.rolls);
}
// Le combat terminé, les PV et ressources restantes sont reportés sur le personnage.
watch(() => state.value?.status, (st) => {
  if (!st || st === "ongoing" || !character.value) return;
  store.setVitals(character.value.id, vitalsAfterCombat(character.value, state.value!));
  // Venu de la carte : l'ennemi vaincu disparaît ; en cas de défaite, le héros se réveille au départ.
  const ex = character.value.exploration;
  if ((fromMap.value || fromStory.value) && ex) {
    if (st === "victory" && enemyParam.value) store.setExploration(character.value.id, defeatEnemy(ex, enemyParam.value));
    else if (st === "defeat") store.setExploration(character.value.id, retreatToStart(ex));
  }
  // Potions bues pendant le combat : le sac à dos est mis à jour.
  const left = potionsLeft(state.value!, character.value.id);
  if (left !== undefined) store.setInventory(character.value.id, changeItems(inventoryOf(character.value), { "healing-potion": left - (character.value.inventory?.["healing-potion"] ?? 0) }));
  // Butin de l'ennemi vaincu.
  lootText.value = "";
  if ((fromMap.value || fromStory.value) && st === "victory" && enemyParam.value) {
    const loot = enemyLoot(enemyParam.value);
    lootText.value = describeLoot(loot);
    store.addLoot(character.value.id, loot);
  }
  // L'ennemi vaincu laisse un drapeau dans l'histoire (`defeated:<id>`).
  if ((fromMap.value || fromStory.value) && st === "victory" && enemyParam.value) {
    store.setStory(character.value.id, { flags: applyEffects(character.value.story?.flags ?? [], { defeat: [enemyParam.value] }).flags, gold: 0 });
  }
});
// Rencontre lancée depuis la carte : le combat démarre tout de suite.
const lootText = ref("");
const fromMap = computed(() => route.query.from === "map");
const fromStory = computed(() => route.query.from === "story");
const continueStory = computed(() => {
  const q = route.query;
  const scene = state.value?.status === "victory" ? q.win : q.lose;
  return `/story/${characterId.value}?story=${q.story}&scene=${scene}&t=${Date.now()}`;
});
const enemyParam = computed(() => String(route.query.enemy ?? ""));
let launched = "";
watch(
  [character, () => route.fullPath],
  ([c]) => {
    const q = route.query;
    const e = ENCOUNTERS.find((x) => x.id === q.encounter);
    // `t` change à chaque lancement : la vue peut être réutilisée par le routeur.
    const id = `${q.encounter}:${q.enemy}:${q.t}`;
    if (c && e && (fromMap.value || fromStory.value) && id !== launched) {
      launched = id;
      state.value = null;
      start(e);
    }
  },
  { immediate: true },
);
const attackTarget = (id: string) => act((s) => playerAttack(s, id, Math.random, attackIndex.value));
const react = (id: string | null) => act((s) => resolveReaction(s, id));
const dodge = () => act((s) => playerDodge(s));
const endTurn = () => act((s) => playerEndTurn(s));

// --- actions bonus
const options = computed(() => (state.value ? playerOptions(state.value) : null));
const bonus = (id: FeatureId) => act((s) => useFeature(s, id));

// --- sorts
const spellId = ref("");
const availableSpells = computed(() => options.value?.spells.filter((o) => o.available) ?? []);
/** Le sort choisi s'il est encore possible, sinon le premier sort possible. */
const pickedSpell = computed(() => availableSpells.value.find((o) => o.id === spellId.value) ?? availableSpells.value[0]);
// Le sélecteur affiche toujours le sort réellement choisi (le premier possible tant que rien n'est choisi ou si le choix devient impossible).
watch(availableSpells, (list) => { if (!list.some((o) => o.id === spellId.value)) spellId.value = list[0]?.id ?? ""; }, { immediate: true });
const cast = (id: string, targetId?: string) => act((s) => castSpell(s, id, Math.random, { targetId }));
const spellName = (id: string) => SPELL_BY_ID[id]?.name ?? id;
const isMarked = (id: string) => !!state.value?.combatants.some((x) => x.mark?.targetId === id);
const bonusStrike = (targetId: string) => act((s) => useFeature(s, "martial-arts", Math.random, { targetId }));
/** Quantité de soins choisie (imposition des mains), toujours ramenée entre 1 et le maximum utile. */
const layChoice = ref(5);
const layAmount = (max: number) => Math.min(Math.max(1, layChoice.value), max);
const layDelta = (d: number, max: number) => { layChoice.value = Math.min(Math.max(1, layAmount(max) + d), max); };
const layOnHands = (max: number) => act((s) => useFeature(s, "lay-on-hands", Math.random, { amount: layAmount(max) }));
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.loot { font-weight: 600; }
.cond { color: var(--ion-color-warning, #ffc409); }
.hint { opacity: 0.8; font-size: 0.9rem; }
.active { --background: var(--ion-color-step-150, #333); }
h2 small { opacity: 0.7; font-weight: normal; font-size: 0.8rem; margin-left: 6px; }
.actions { margin: 12px 0; }
.actions h4 { margin: 14px 0 6px; opacity: 0.8; font-size: 0.95rem; }
.stepper { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 6px 0; }
.stepper .grow { flex: 1 1 160px; }
.result { text-align: center; margin: 12px 0; }
.result.victory h2 { color: var(--ion-color-success); }
.result.defeat h2 { color: var(--ion-color-danger); }
.log { font-size: 0.85rem; }
</style>
