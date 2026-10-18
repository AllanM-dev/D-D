<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`/character/${id}`" /></ion-buttons>
        <ion-title>Montée de niveau</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content v-if="!c" class="ion-padding"><p>Personnage introuvable.</p></ion-content>
    <ion-content v-else-if="!canLevelUp(c)" class="ion-padding">
      <p>{{ c.name }} n'a pas encore assez d'expérience pour monter de niveau ({{ xpOf(c) }}{{ nextXp ? ` / ${nextXp}` : "" }} points).</p>
      <p v-if="c.level >= MAX_LEVEL" class="hint">Le niveau {{ MAX_LEVEL }} est le maximum jouable pour l'instant : il manque encore les sorts de niveau 2 et les sous-classes.</p>
      <ion-button expand="block" :router-link="`/character/${id}`">Retour à la fiche</ion-button>
    </ion-content>
    <ion-content v-else class="ion-padding">
      <div class="head">
        <Sprite :sprite="heroSpriteKey(c.species.id, c.classDef.id)" :size="84" :label="c.name" />
        <div>
          <h2>{{ c.name }} passe au niveau {{ c.level + 1 }}</h2>
          <p>{{ c.species.name }} · {{ c.classDef.name }} · {{ xpOf(c) }} points d'expérience</p>
        </div>
      </div>

      <h3>Ce que vous gagnez</h3>
      <ion-list inset>
        <ion-item lines="full"><ion-label class="ion-text-wrap">+{{ gain }} points de vie maximum<p>Moyenne du dé de vie (d{{ c.classDef.hitDie }}) + Constitution. Vos PV passent de {{ c.maxHp }} à {{ c.maxHp + gain }}.</p></ion-label></ion-item>
        <ion-item lines="full"><ion-label class="ion-text-wrap">+1 dé de vie<p>Pour les repos courts : {{ c.level + 1 }} au total.</p></ion-label></ion-item>
        <ion-item v-if="counts" lines="full"><ion-label class="ion-text-wrap">Sorts<p>{{ counts }}</p></ion-label></ion-item>
        <ion-item v-for="f in features" :key="f.name" lines="full">
          <ion-label class="ion-text-wrap">
            {{ f.name }} <span class="tag" :class="f.status">{{ STATUS[f.status] }}</span>
            <p>{{ f.text }}</p>
            <p class="note">{{ f.note }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <template v-if="needs.expertise">
        <h3>{{ needs.expertise.label }} ({{ picked.length }}/{{ needs.expertise.count }})</h3>
        <p class="hint">Le bonus de maîtrise est doublé pour {{ needs.expertise.count > 1 ? "ces compétences" : "cette compétence" }}.</p>
        <ion-list inset>
          <ion-item v-for="s in needs.expertise.from" :key="s">
            <ion-checkbox :checked="picked.includes(s)" :disabled="!picked.includes(s) && picked.length >= needs.expertise.count" @ion-change="toggle(picked, s, $event.detail.checked)">{{ skillName(s) }}</ion-checkbox>
          </ion-item>
        </ion-list>
      </template>

      <template v-if="needs.fightingStyle">
        <h3>Style de combat</h3>
        <ion-segment v-model="style">
          <ion-segment-button v-for="st in FIGHTING_STYLES" :key="st.id" :value="st.id"><ion-label>{{ st.name }}</ion-label></ion-segment-button>
        </ion-segment>
        <p class="hint">{{ FIGHTING_STYLES.find((s) => s.id === style)?.text }}</p>
      </template>

      <template v-if="needs.spells">
        <h3>Nouveaux sorts préparés ({{ spells.length }}/{{ needs.spells.count }})</h3>
        <ion-list inset>
          <ion-item v-for="id in needs.spells.from" :key="id" lines="full">
            <ion-checkbox label-placement="end" justify="start" :checked="spells.includes(id)" :disabled="!spells.includes(id) && spells.length >= needs.spells.count" @ion-change="toggle(spells, id, $event.detail.checked)">
              <div class="spell">
                <strong>{{ SPELL_BY_ID[id].name }}</strong>
                <span v-if="!isPlayable(SPELL_BY_ID[id])" class="tag">sans effet en combat</span>
                <small>{{ SPELL_BY_ID[id].description }}</small>
              </div>
            </ion-checkbox>
          </ion-item>
        </ion-list>
      </template>

      <ion-note v-if="errors.length" color="danger" class="errors"><div v-for="e in errors" :key="e">• {{ e }}</div></ion-note>
      <ion-button expand="block" color="success" :disabled="errors.length > 0" @click="confirm">Passer au niveau {{ c.level + 1 }}</ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToolbar, useIonRouter } from "@ionic/vue";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import Sprite from "../components/Sprite.vue";
import { FIGHTING_STYLES, type FightingStyleId } from "../data/fighting-styles";
import { LEVEL2_FEATURES, MAX_LEVEL, xpForNext } from "../data/levels";
import { SKILLS, type SkillId } from "../data/skills";
import { SPELL_BY_ID, isPlayable, spellCountsFor } from "../data/spells";
import { canLevelUp, hpGainFor, levelUp, levelUpNeeds, validateLevelUp, xpOf } from "../engine/levelup";
import { useCharacters } from "../stores/characters";
import { heroSpriteKey } from "../ui/sprites";

const route = useRoute();
const router = useIonRouter();
const store = useCharacters();
const id = computed(() => String(route.params.id));
const c = computed(() => store.get(id.value));
const nextXp = computed(() => (c.value ? xpForNext(c.value.level) : undefined));
const STATUS = { applied: "jouable", partial: "en partie", todo: "pas encore" } as const;
const skillName = (s: SkillId) => SKILLS.find((x) => x.id === s)!.name;

const needs = computed(() => (c.value && canLevelUp(c.value) ? levelUpNeeds(c.value) : {}));
const gain = computed(() => (c.value ? hpGainFor(c.value) : 0));
const features = computed(() => (c.value ? LEVEL2_FEATURES[c.value.classDef.id] ?? [] : []));
const counts = computed(() => {
  if (!c.value || !c.value.spells) return "";
  const a = spellCountsFor(c.value.classDef.id, c.value.level);
  const b = spellCountsFor(c.value.classDef.id, c.value.level + 1);
  return `Emplacements de niveau 1 : ${a.slots} → ${b.slots} · sorts préparés : ${a.prepared} → ${b.prepared}`;
});

const picked = ref<SkillId[]>([]);
const spells = ref<string[]>([]);
const style = ref<FightingStyleId>("defense");
watch(c, () => { picked.value = []; spells.value = []; }, { immediate: true });
function toggle<T>(list: T[], v: T, checked: boolean) {
  const i = list.indexOf(v);
  if (checked && i < 0) list.push(v);
  else if (!checked && i >= 0) list.splice(i, 1);
}

const choices = computed(() => ({
  ...(needs.value.expertise ? { expertise: [...picked.value] } : {}),
  ...(needs.value.fightingStyle ? { fightingStyle: style.value } : {}),
  ...(needs.value.spells ? { spells: [...spells.value] } : {}),
}));
const errors = computed(() => (c.value ? validateLevelUp(c.value, choices.value) : []));

function confirm() {
  if (!c.value || errors.value.length) return;
  store.replace(levelUp(JSON.parse(JSON.stringify(c.value)), choices.value).character);
  router.replace(`/character/${id.value}`);
}
</script>

<style scoped>
ion-content { --padding-start: 16px; --padding-end: 16px; }
.head { display: flex; align-items: center; gap: 12px; }
.head h2 { margin: 0; }
.head p { margin: 2px 0 0; opacity: 0.8; }
.hint, .note { opacity: 0.75; font-size: 0.9rem; }
.tag { font-size: 0.7rem; padding: 1px 6px; border-radius: 8px; background: #555; margin-left: 4px; }
.tag.applied { background: #2e7d32; }
.tag.partial { background: #b8860b; }
.spell { display: flex; flex-direction: column; gap: 2px; padding: 6px 0; }
.spell small { opacity: 0.75; white-space: normal; }
.errors { display: block; margin: 12px 0; }
</style>
