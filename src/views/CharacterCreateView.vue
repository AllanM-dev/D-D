<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/" /></ion-buttons>
        <ion-title>Nouveau personnage</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <!-- Identité -->
      <ion-list inset>
        <ion-item>
          <ion-input v-model="draft.name" label="Nom" label-placement="stacked" placeholder="Aldric" />
        </ion-item>
        <ion-item>
          <ion-select v-model="draft.speciesId" label="Espèce" label-placement="stacked" interface="action-sheet">
            <ion-select-option v-for="s in SPECIES" :key="s.id" :value="s.id">{{ s.name }}</ion-select-option>
          </ion-select>
          <ion-button slot="end" fill="clear" aria-label="Décrire les espèces" @click="info = 'species'">
            <ion-icon slot="icon-only" :icon="informationCircleOutline" />
          </ion-button>
        </ion-item>
        <ion-item>
          <ion-select v-model="draft.classId" label="Classe" label-placement="stacked" interface="action-sheet">
            <ion-select-option v-for="c in CLASSES" :key="c.id" :value="c.id">{{ c.name }} (d{{ c.hitDie }})</ion-select-option>
          </ion-select>
          <ion-button slot="end" fill="clear" aria-label="Décrire les classes" @click="info = 'class'">
            <ion-icon slot="icon-only" :icon="informationCircleOutline" />
          </ion-button>
        </ion-item>
        <ion-item>
          <ion-select v-model="draft.backgroundId" label="Historique" label-placement="stacked" interface="action-sheet">
            <ion-select-option v-for="b in BACKGROUNDS" :key="b.id" :value="b.id">{{ b.name }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <!-- Caractéristiques -->
      <h3>Caractéristiques</h3>
      <ion-segment v-model="draft.method">
        <ion-segment-button value="standard"><ion-label>Tableau</ion-label></ion-segment-button>
        <ion-segment-button value="pointbuy"><ion-label>Points</ion-label></ion-segment-button>
        <ion-segment-button value="roll"><ion-label>Dés</ion-label></ion-segment-button>
      </ion-segment>

      <p v-if="draft.method === 'pointbuy'" class="hint">
        Points restants : <strong>{{ POINT_BUY_BUDGET - spent }}</strong> / {{ POINT_BUY_BUDGET }} (scores de 8 à 15)
      </p>
      <p v-else-if="draft.method === 'standard'" class="hint">Répartissez 15, 14, 13, 12, 10, 8.</p>
      <div v-else class="hint">
        <ion-button size="small" @click="rollPool">{{ draft.rolledPool ? "Relancer" : "Tirer les dés" }} (4d6, on retire le plus bas)</ion-button>
        <p v-if="draft.rolledPool">Valeurs : {{ draft.rolledPool.join(", ") }}</p>
      </div>

      <div v-if="classDef" class="advice">
        <strong>Conseil pour {{ classDef.name }}</strong>
        <p>
          Caractéristiques clés : ★ {{ keyAbilities(classDef.priority).map((a) => ABILITY_NAMES[a]).join(" et ") }}.
          {{ classDef.advice }}
        </p>
      </div>
      <p v-else class="hint">Choisissez une classe pour recevoir un conseil de répartition.</p>

      <ion-list inset>
        <ion-item v-for="a in ABILITIES" :key="a">
          <ion-label>
            <span v-if="isKey(a)" class="star" title="Caractéristique clé pour cette classe">★ </span>{{ ABILITY_NAMES[a] }}
            <p>{{ final[a] > 0 ? `Total ${final[a]} (${signed(abilityModifier(final[a]))})` : "—" }}</p>
          </ion-label>
          <template v-if="draft.method === 'pointbuy'">
            <ion-button size="small" fill="outline" :disabled="draft.baseScores[a] <= POINT_BUY_MIN" @click="step(a, -1)">−</ion-button>
            <span class="score">{{ draft.baseScores[a] }}</span>
            <ion-button size="small" fill="outline" :disabled="!canIncrease(a)" @click="step(a, 1)">+</ion-button>
          </template>
          <ion-select
            v-else
            slot="end"
            :value="draft.baseScores[a] || undefined"
            placeholder="Choisir"
            interface="popover"
            @ion-change="assign(a, Number($event.detail.value))"
          >
            <ion-select-option v-for="(v, i) in poolValues" :key="i" :value="v" :disabled="!available(a, v)">{{ v }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <!-- Bonus d'historique -->
      <template v-if="background">
        <h3>Bonus de l'historique ({{ background.name }})</h3>
        <ion-segment v-model="draft.bonus.mode" @ion-change="setBonusMode">
          <ion-segment-button value="2/1"><ion-label>+2 / +1</ion-label></ion-segment-button>
          <ion-segment-button value="1/1/1"><ion-label>+1 / +1 / +1</ion-label></ion-segment-button>
        </ion-segment>
        <ion-list v-if="draft.bonus.mode === '2/1'" inset>
          <ion-item>
            <ion-select v-model="draft.bonus.plus2" label="+2 à" interface="popover">
              <ion-select-option v-for="a in background.abilityOptions" :key="a" :value="a">{{ ABILITY_NAMES[a] }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-select v-model="draft.bonus.plus1" label="+1 à" interface="popover">
              <ion-select-option v-for="a in background.abilityOptions" :key="a" :value="a">{{ ABILITY_NAMES[a] }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>
        <p v-else class="hint">+1 à {{ background.abilityOptions.map((a) => ABILITY_NAMES[a]).join(", ") }}.</p>
        <p class="hint">Don d'origine : {{ background.originFeat }} · Compétences : {{ background.skills.map(skillName).join(", ") }}</p>
      </template>

      <!-- Compétences de classe -->
      <template v-if="classDef">
        <h3>Compétences de classe ({{ draft.classSkills.length }}/{{ classDef.skillChoices.count }})</h3>
        <ion-list inset>
          <ion-item v-for="id in classSkillOptions" :key="id">
            <ion-checkbox
              :checked="draft.classSkills.includes(id)"
              :disabled="!draft.classSkills.includes(id) && draft.classSkills.length >= classDef.skillChoices.count"
              @ion-change="toggleSkill(id, $event.detail.checked)"
            >{{ skillName(id) }}</ion-checkbox>
          </ion-item>
        </ion-list>
      </template>

      <ion-note v-if="errors.length" color="danger" class="errors">
        <div v-for="e in errors" :key="e">• {{ e }}</div>
      </ion-note>
      <ion-button expand="block" :disabled="errors.length > 0" @click="create">Créer le personnage</ion-button>

      <ion-modal :is-open="info !== null" @did-dismiss="info = null">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ info === "species" ? "Espèces" : "Classes" }}</ion-title>
            <ion-buttons slot="end"><ion-button @click="info = null">Fermer</ion-button></ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-accordion-group v-if="info === 'species'" :value="draft.speciesId || undefined">
            <ion-accordion v-for="s in SPECIES" :key="s.id" :value="s.id">
              <ion-item slot="header"><ion-label>{{ s.name }}</ion-label></ion-item>
              <div slot="content" class="detail">
                <p>{{ s.description }}</p>
                <p><small>Taille : {{ s.size }} · Vitesse : {{ s.speed }} ft</small></p>
                <ul><li v-for="t in s.traits" :key="t">{{ t }}</li></ul>
                <p><small>Les traits sont indiqués à titre d'information : ils ne sont pas encore appliqués automatiquement.</small></p>
                <ion-button size="small" @click="choose('species', s.id)">Choisir cette espèce</ion-button>
              </div>
            </ion-accordion>
          </ion-accordion-group>
          <ion-accordion-group v-else-if="info === 'class'" :value="draft.classId || undefined">
            <ion-accordion v-for="c in CLASSES" :key="c.id" :value="c.id">
              <ion-item slot="header"><ion-label>{{ c.name }}</ion-label></ion-item>
              <div slot="content" class="detail">
                <p>{{ c.description }}</p>
                <p><small>
                  Dé de vie : d{{ c.hitDie }} · Sauvegardes : {{ c.savingThrows.map((a) => ABILITY_NAMES[a]).join(", ") }}
                  · Caractéristiques clés : {{ keyAbilities(c.priority).map((a) => ABILITY_NAMES[a]).join(", ") }}
                </small></p>
                <ul><li v-for="f in c.features" :key="f">{{ f }}</li></ul>
                <p>{{ c.advice }}</p>
                <ion-button size="small" @click="choose('class', c.id)">Choisir cette classe</ion-button>
              </div>
            </ion-accordion>
          </ion-accordion-group>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonAccordion, IonAccordionGroup, IonBackButton, IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonIcon,
  IonInput, IonItem, IonLabel, IonList, IonModal, IonNote, IonPage, IonSegment, IonSegmentButton, IonSelect,
  IonSelectOption, IonTitle, IonToolbar, useIonRouter,
} from "@ionic/vue";
import { informationCircleOutline } from "ionicons/icons";
import { computed, reactive, ref, watch } from "vue";
import { BACKGROUNDS } from "../data/backgrounds";
import { CLASSES } from "../data/classes";
import { SKILLS, type SkillId } from "../data/skills";
import { SPECIES } from "../data/species";
import {
  POINT_BUY_BUDGET, POINT_BUY_MAX, POINT_BUY_MIN, STANDARD_ARRAY, defaultScores, pointBuyCost, pointBuyTotal, rollAbilityPool,
} from "../engine/abilities";
import { keyAbilities } from "../engine/advice";
import { applyBackgroundBonus, buildCharacter, validateDraft, type CharacterDraft } from "../engine/character";
import { ABILITIES, abilityModifier, type Ability } from "../engine/rules";
import { newId, useCharacters } from "../stores/characters";
import { ABILITY_NAMES, signed } from "../ui/format";

const store = useCharacters();
const router = useIonRouter();

const draft = reactive<CharacterDraft>({
  name: "",
  speciesId: "",
  classId: "",
  backgroundId: "",
  method: "standard",
  baseScores: defaultScores(0),
  rolledPool: undefined,
  bonus: { mode: "2/1", plus2: "STR", plus1: "CON" },
  classSkills: [],
});

const info = ref<"species" | "class" | null>(null);

const classDef = computed(() => CLASSES.find((c) => c.id === draft.classId));
const background = computed(() => BACKGROUNDS.find((b) => b.id === draft.backgroundId));
const skillName = (id: SkillId) => SKILLS.find((s) => s.id === id)!.name;

const classSkillOptions = computed(() =>
  (classDef.value?.skillChoices.from ?? []).filter((s) => !background.value?.skills.includes(s)),
);

const poolValues = computed<number[]>(() =>
  draft.method === "standard" ? [...STANDARD_ARRAY] : (draft.rolledPool ?? []),
);

// Les scores recommencent de zéro quand la méthode change.
watch(() => draft.method, (m) => {
  draft.baseScores = defaultScores(m === "pointbuy" ? POINT_BUY_MIN : 0);
  draft.rolledPool = undefined;
});

// Réinitialise le bonus d'historique et retire les compétences devenues invalides.
watch(() => draft.backgroundId, () => {
  const [first, second] = background.value?.abilityOptions ?? ["STR", "CON"];
  draft.bonus = { mode: "2/1", plus2: first, plus1: second };
  pruneSkills();
});
watch(() => draft.classId, () => { draft.classSkills = []; });

function pruneSkills() {
  draft.classSkills = draft.classSkills.filter((s) => classSkillOptions.value.includes(s));
}

function setBonusMode() {
  if (draft.bonus.mode === "2/1" && background.value) {
    const [first, second] = background.value.abilityOptions;
    draft.bonus = { mode: "2/1", plus2: first, plus1: second };
  } else {
    draft.bonus = { mode: "1/1/1" };
  }
}

// --- achat de points
const spent = computed(() => (draft.method === "pointbuy" ? pointBuyTotal(draft.baseScores) : 0));
function canIncrease(a: Ability) {
  const score = draft.baseScores[a];
  return score < POINT_BUY_MAX && spent.value - pointBuyCost(score) + pointBuyCost(score + 1) <= POINT_BUY_BUDGET;
}
function step(a: Ability, delta: 1 | -1) {
  draft.baseScores[a] += delta;
}

// --- tableau standard / tirage
function rollPool() {
  draft.rolledPool = rollAbilityPool();
  draft.baseScores = defaultScores(0);
}
function assign(a: Ability, value: number) {
  if (Number.isFinite(value)) draft.baseScores[a] = value;
}
/** Une valeur du pool reste disponible tant que le nombre d'usages par les autres caractéristiques est inférieur à son nombre d'occurrences. */
function available(a: Ability, v: number) {
  const total = poolValues.value.filter((x) => x === v).length;
  const used = ABILITIES.filter((o) => o !== a && draft.baseScores[o] === v).length;
  return used < total;
}

// --- conseils et descriptions
const isKey = (a: Ability) => !!classDef.value && keyAbilities(classDef.value.priority).includes(a);

function choose(kind: "species" | "class", id: string) {
  if (kind === "species") draft.speciesId = id;
  else draft.classId = id;
  info.value = null;
}

function toggleSkill(id: SkillId, checked: boolean) {
  const has = draft.classSkills.includes(id);
  if (checked && !has) draft.classSkills.push(id);
  else if (!checked && has) draft.classSkills = draft.classSkills.filter((s) => s !== id);
}

const final = computed(() => {
  const bg = background.value;
  const withBonus = bg ? applyBackgroundBonus(draft.baseScores, bg, draft.bonus) : { ...draft.baseScores };
  // Une caractéristique non encore attribuée (0) reste à 0 : on n'affiche pas son bonus.
  return Object.fromEntries(ABILITIES.map((a) => [a, draft.baseScores[a] > 0 ? Math.min(20, withBonus[a]) : 0])) as Record<Ability, number>;
});

const errors = computed(() => validateDraft(draft));

function create() {
  const c = buildCharacter(JSON.parse(JSON.stringify(draft)) as CharacterDraft, newId());
  store.add(c);
  router.replace(`/character/${c.id}`);
}
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.advice { background: var(--ion-color-step-100, #222); border-radius: 8px; padding: 12px; margin: 12px 0; }
.advice p { margin: 6px 0 0; }
.star { color: var(--ion-color-warning, #fc0); }
.detail { padding: 0 16px 16px; }
h3 { margin: 20px 0 8px; }
.hint { opacity: 0.8; font-size: 0.9rem; }
.score { min-width: 2ch; text-align: center; margin: 0 8px; }
.errors { display: block; margin: 12px 0; }
</style>
