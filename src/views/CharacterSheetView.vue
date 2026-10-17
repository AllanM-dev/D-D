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
        <div><strong>{{ vitals.hp }}/{{ c.maxHp }}</strong><small>PV</small></div>
        <div><strong>{{ c.armorClass }}</strong><small>CA</small></div>
        <div><strong>{{ signed(c.initiative) }}</strong><small>Initiative</small></div>
        <div><strong>{{ fmtNumber(c.speed) }}</strong><small>Vitesse (m)</small></div>
        <div><strong>{{ signed(c.proficiencyBonus) }}</strong><small>Maîtrise</small></div>
        <div><strong>{{ c.passivePerception }}</strong><small>Perc. passive</small></div>
      </div>

      <ion-button expand="block" :router-link="`/map/${c.id}`">Explorer la carte</ion-button>
      <ion-button expand="block" fill="outline" :router-link="`/combat/${c.id}`">Lancer un combat</ion-button>

      <ion-list inset>
        <ion-list-header><ion-label>Ressources et repos</ion-label></ion-list-header>
        <ion-item lines="full">
          <ion-label class="ion-text-wrap">
            Dés de vie : {{ vitals.hitDice }}/{{ hitDiceMax(c) }} (d{{ c.classDef.hitDie }})
            <p v-for="r in resources" :key="r">{{ r }}</p>
          </ion-label>
        </ion-item>
        <ion-item lines="full">
          <ion-label class="ion-text-wrap">
            Repos court (1 heure)
            <p>Dépensez des dés de vie pour regagner des PV ; quelques capacités reviennent.</p>
          </ion-label>
        </ion-item>
        <div class="rest-row">
          <ion-button size="small" fill="outline" :disabled="spend <= 0" aria-label="Un dé de moins" data-t="minus" @click="spend--">−</ion-button>
          <span>{{ spend }} dé{{ spend > 1 ? "s" : "" }} de vie</span>
          <ion-button size="small" fill="outline" :disabled="spend >= vitals.hitDice" aria-label="Un dé de plus" data-t="plus" @click="spend++">+</ion-button>
          <ion-button size="small" class="grow" @click="short">Repos court</ion-button>
        </div>
        <ion-item lines="full">
          <ion-label class="ion-text-wrap">
            Repos long (8 heures)
            <p>Tous les PV, toutes les capacités et tous les emplacements de sort reviennent, ainsi que la moitié des dés de vie (au moins un).</p>
          </ion-label>
        </ion-item>
        <div class="rest-row"><ion-button size="small" expand="block" class="grow" @click="long">Repos long</ion-button></div>
        <ion-item v-if="restReport" lines="none">
          <ion-label class="ion-text-wrap report">{{ restReport }}</ion-label>
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header><ion-label>Sac à dos</ion-label></ion-list-header>
        <ion-item lines="full"><ion-label>Pièces d'or</ion-label><ion-note slot="end">{{ c.equipment.gold }} po</ion-note></ion-item>
        <ion-item v-for="b in bag" :key="b.def.id" lines="full">
          <ion-label class="ion-text-wrap">
            {{ b.def.name }}<template v-if="b.n > 1"> × {{ b.n }}</template>
            <p>{{ ITEM_KIND_NAMES[b.def.kind] }}<template v-if="b.def.value"> · {{ b.def.value }} po</template> · {{ b.def.text }}</p>
          </ion-label>
          <ion-button v-if="b.def.id === 'healing-potion'" slot="end" size="small" :disabled="!canDrink(c)" @click="drink">Boire</ion-button>
          <ion-button v-else-if="b.def.kind === 'weapon' || b.def.kind === 'armor'" slot="end" size="small" :disabled="!canEquip(c, b.def.id)" @click="wear(b.def.id)">Équiper</ion-button>
        </ion-item>
        <ion-item v-if="!bag.length" lines="none"><ion-label class="ion-text-wrap"><p>Aucun objet pour l'instant.</p></ion-label></ion-item>
        <ion-item v-if="bagReport" lines="none"><ion-label class="ion-text-wrap report">{{ bagReport }}</ion-label></ion-item>
      </ion-list>

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
          <ion-label>{{ s.expert ? "◉ " : s.proficient ? "● " : "○ " }}{{ s.name }} <small>({{ s.ability }})</small></ion-label>
          <ion-note slot="end">{{ signed(s.bonus) }}</ion-note>
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header><ion-label>Capacités de classe</ion-label></ion-list-header>
        <ion-item v-if="style" lines="full">
          <ion-label class="ion-text-wrap">Style de combat : {{ style.name }}<p>{{ style.text }}</p></ion-label>
        </ion-item>
        <ion-item v-if="orderChoice" lines="full">
          <ion-label class="ion-text-wrap">{{ c.classDef.id === "cleric" ? "Ordre divin" : "Ordre primordial" }} : {{ orderChoice.name }}<p>{{ orderChoice.text }}</p></ion-label>
        </ion-item>
        <ion-item v-if="invocationChoice" lines="full">
          <ion-label class="ion-text-wrap">Invocation occulte : {{ invocationChoice.name }}<p>{{ invocationChoice.text }}</p></ion-label>
        </ion-item>
        <ion-item v-if="c.expertise?.length" lines="full">
          <ion-label class="ion-text-wrap">Expertise : {{ expertiseNames }}<p>Bonus de maîtrise doublé (◉ dans la liste des compétences).</p></ion-label>
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

      <ion-list v-if="masteryMax" inset>
        <ion-list-header><ion-label>Maîtrises d'armes ({{ masteryList.length }}/{{ masteryMax }})</ion-label></ion-list-header>
        <ion-item lines="full"><ion-label class="ion-text-wrap"><p>Vous maîtrisez l'effet spécial de {{ masteryMax }} arme{{ masteryMax > 1 ? "s" : "" }} : cochez celles que vous voulez. L'effet s'applique quand vous attaquez avec cette arme.</p></ion-label></ion-item>
        <ion-item v-for="w in masterable" :key="w.id" lines="full">
          <ion-checkbox :checked="masteryList.includes(w.id)" :disabled="!masteryList.includes(w.id) && masteryList.length >= masteryMax" label-placement="end" justify="start" @ionChange="toggleMastery(w.id, $event.detail.checked)">
            <span class="ion-text-wrap">{{ w.name }} — {{ MASTERY_TEXT[WEAPON_MASTERY[w.id]].name }}</span>
          </ion-checkbox>
        </ion-item>
        <ion-item v-if="masteryReport" lines="none"><ion-label class="ion-text-wrap report">{{ masteryReport }}</ion-label></ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header><ion-label>Attaques</ion-label></ion-list-header>
        <ion-item v-for="a in c.attacks" :key="a.name" lines="full">
          <ion-label class="ion-text-wrap">
            {{ a.name }}
            <p>{{ a.damage.count }}d{{ a.damage.sides }}{{ a.damage.bonus ? signed(a.damage.bonus) : "" }} {{ a.damageType }}{{ a.ranged ? " · à distance" : " · corps à corps" }}<template v-if="a.reach"> · allonge {{ formatMeters(a.reach * 1.5) }}</template><template v-if="a.offhand"> · seconde arme possible (action bonus)</template><template v-if="a.mastery"> · maîtrise : {{ MASTERY_TEXT[a.mastery].name }}</template><template v-if="a.sneak && c.classDef.id === 'rogue'"> · attaque sournoise possible</template></p>
            <p v-if="a.blocked" class="warn">{{ a.blocked }}</p>
            <p v-else-if="a.penalty" class="warn">Désavantage : {{ a.penalty }}</p>
          </ion-label>
          <ion-note slot="end">{{ signed(a.toHit) }}</ion-note>
        </ion-item>
      </ion-list>

      <ion-list inset>
        <ion-list-header><ion-label>Équipement</ion-label></ion-list-header>
        <ion-item lines="full">
          <ion-label class="ion-text-wrap">Armure<p>{{ c.equipment.armor?.name ?? "Aucune" }}</p></ion-label>
          <ion-button v-if="c.equipment.armor" slot="end" size="small" fill="outline" @click="stow({ kind: 'armor' })">Ranger</ion-button>
        </ion-item>
        <ion-item lines="full">
          <ion-label class="ion-text-wrap">Bouclier<p>{{ c.equipment.shield ? "Oui (+2 CA)" : "Non" }}</p></ion-label>
          <ion-button v-if="c.equipment.shield" slot="end" size="small" fill="outline" @click="stow({ kind: 'shield' })">Ranger</ion-button>
        </ion-item>
        <ion-item v-if="untrained" lines="full">
          <ion-label class="ion-text-wrap warn">Armure ou bouclier non maîtrisé : désavantage à vos attaques et aucun sort jusqu'à ce que vous l'ôtiez.</ion-label>
        </ion-item>
        <ion-item v-if="armorSlow" lines="full">
          <ion-label class="ion-text-wrap warn">Force insuffisante pour cette armure : vitesse réduite de 3 m.</ion-label>
        </ion-item>
        <ion-item v-for="w in c.equipment.weapons" :key="w.id" lines="full">
          <ion-label class="ion-text-wrap">{{ w.name }}<template v-if="w.qty > 1"> × {{ w.qty }}</template></ion-label>
          <ion-button slot="end" size="small" fill="outline" @click="stow({ kind: 'weapon', id: w.id })">Ranger</ion-button>
        </ion-item>
        <ion-item v-for="g in c.equipment.gear" :key="g.name" lines="full">
          <ion-label class="ion-text-wrap">{{ g.name }}</ion-label><ion-note v-if="g.qty > 1" slot="end">× {{ g.qty }}</ion-note>
        </ion-item>
        <ion-item v-if="bagReport" lines="full"><ion-label class="ion-text-wrap report">{{ bagReport }}</ion-label></ion-item>
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
  IonBackButton, IonButton, IonCheckbox, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonListHeader,
  IonMenuButton, IonNote, IonPage, IonTitle, IonToolbar, useIonRouter,
} from "@ionic/vue";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import Illustration from "../components/Illustration.vue";
import { INVOCATIONS, ORDERS } from "../data/class-choices";
import { FIGHTING_STYLES } from "../data/fighting-styles";
import { SPELL_BY_ID, isPlayable } from "../data/spells";
import { castingFor } from "../engine/spellcasting";
import { getItem, ITEM_KIND_NAMES } from "../data/items";
import { ARMORS, MASTERY_COUNT, WEAPON_MASTERY } from "../data/equipment";
import { MASTERY_TEXT } from "../data/help";
import { masterableWeapons, wearsUntrained } from "../engine/equipment";
import { canDrink, drinkPotion } from "../engine/inventory";
import { canEquip, equipItem, masteriesOf, setMasteries, unequip, type Slot } from "../engine/loadout";
import { hitDiceMax, longRest, shortRest, vitalsOf, type RestResult } from "../engine/rest";
import { FEATURE_LABELS } from "../engine/combat";
import { featuresFor } from "../engine/features";
import { artKey } from "../data/illustrations";
import { CLASS_FEATURE_TEXT, FEATURE_STATUS } from "../data/help";
import { ABILITIES } from "../engine/rules";
import { ABILITY_NAMES, fmtNumber, formatMeters, signed } from "../ui/format";
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
const vitals = computed(() => vitalsOf(c.value!));
const resources = computed(() => {
  const ch = c.value!;
  const out = featuresFor(ch.classDef.id, ch.level, ch.modifiers)
    .filter((f) => !f.unlimited)
    .map((f) => `${FEATURE_LABELS[f.id]} : ${vitals.value.features[f.id] ?? f.max}/${f.max}`);
  if (casting.value) {
    out.push(`Emplacements de niveau 1 : ${Math.max(0, casting.value.slots.max - vitals.value.slotsUsed)}/${casting.value.slots.max}`);
    for (const f of casting.value.free) out.push(`${SPELL_BY_ID[f.spellId]?.name ?? f.spellId} gratuit : ${vitals.value.free[f.spellId] ?? f.max}/${f.max}`);
  }
  return out;
});
const bag = computed(() =>
  Object.entries(c.value?.inventory ?? {}).map(([id, n]) => ({ def: getItem(id)!, n })).filter((b) => b.def),
);
const bagReport = ref("");
const untrained = computed(() => (c.value ? wearsUntrained(c.value.classDef.id, c.value.equipment, c.value.order) : false));
const armorSlow = computed(() => {
  const a = c.value?.equipment.armor && ARMORS.find((x) => x.id === c.value!.equipment.armor!.id);
  return !!a && !!a.minStr && c.value!.scores.STR < a.minStr;
});
function wear(id: string) {
  try { store.applyLoadout(c.value!.id, equipItem(c.value!, id)); bagReport.value = `Équipé : ${getItem(id)!.name} (CA ${c.value!.armorClass}).`; }
  catch (e) { bagReport.value = (e as Error).message; }
}
function stow(slot: Slot) {
  try { store.applyLoadout(c.value!.id, unequip(c.value!, slot)); bagReport.value = `Rangé dans le sac (CA ${c.value!.armorClass}).`; }
  catch (e) { bagReport.value = (e as Error).message; }
}
function drink() {
  const r = drinkPotion(c.value!);
  store.setVitals(c.value!.id, r.vitals);
  store.setInventory(c.value!.id, r.inventory);
  bagReport.value = `Potion de soin : ${r.dice.join(" + ")} + 2 = ${r.dice[0] + r.dice[1] + 2}, ${r.healed} PV regagnés (${r.vitals.hp}/${c.value!.maxHp}).`;
}
const masteryMax = computed(() => (c.value ? MASTERY_COUNT[c.value.classDef.id] ?? 0 : 0));
const masterable = computed(() => (c.value ? masterableWeapons(c.value.classDef.id, c.value.order) : []));
const masteryList = computed(() => (c.value ? masteriesOf(c.value) : []));
const masteryReport = ref("");
function toggleMastery(id: string, on: boolean) {
  const next = on ? [...masteryList.value, id] : masteryList.value.filter((x) => x !== id);
  try {
    store.applyLoadout(c.value!.id, setMasteries(c.value!, next));
    masteryReport.value = `${MASTERY_TEXT[WEAPON_MASTERY[id]].name} : ${MASTERY_TEXT[WEAPON_MASTERY[id]].text}`;
  } catch (e) { masteryReport.value = (e as Error).message; }
}
const spend = ref(0);
watch(() => vitals.value.hitDice, (n) => { if (spend.value > n) spend.value = n; });
const restReport = ref("");
function apply(r: RestResult, title: string) {
  store.setVitals(c.value!.id, r.vitals);
  const dice = r.rolls.map((x) => `d${x.sides} ${x.die}${x.modifier ? (x.modifier > 0 ? "+" : "−") + Math.abs(x.modifier) : ""} = ${x.healed} PV`).join(" ; ");
  const parts = [dice, r.recovered.length ? `Récupéré : ${r.recovered.join(", ")}.` : ""].filter(Boolean);
  restReport.value = `${title} : ${r.healed} PV regagnés (${vitals.value.hp}/${c.value!.maxHp}).${parts.length ? " " + parts.join(" ") : ""}`;
}
function short() { apply(shortRest(c.value!, spend.value), "Repos court"); spend.value = Math.min(spend.value, vitals.value.hitDice); }
function long() { apply(longRest(c.value!), "Repos long"); }
const knownSpells = computed(() =>
  casting.value ? [...casting.value.cantrips, ...casting.value.prepared].map((id) => SPELL_BY_ID[id]).filter(Boolean) : [],
);
const orderChoice = computed(() => (c.value?.order ? ORDERS[c.value.classDef.id]?.find((o) => o.id === c.value!.order) : undefined));
const expertiseNames = computed(() => (c.value?.expertise ?? []).map((id) => c.value!.skills.find((s) => s.id === id)?.name).join(", "));
const invocationChoice = computed(() => INVOCATIONS.find((i) => i.id === c.value?.invocation));
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
.rest-row { display: flex; align-items: center; gap: 8px; padding: 4px 16px 10px; }
.rest-row .grow { flex: 1; }
.report { font-size: 0.9rem; }
.warn { color: var(--ion-color-warning, #ffc409); font-size: 0.9rem; }
</style>
