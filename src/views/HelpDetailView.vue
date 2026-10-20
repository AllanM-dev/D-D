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
      <div v-else-if="comp" class="hero-art"><Sprite :sprite="comp.sprite" :size="104" :label="comp.name" /></div>

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

        <h3>Capacités de niveau 2</h3>
        <ion-list inset>
          <ion-item v-for="f in LEVEL2_FEATURES[cls.id] ?? []" :key="f.name" lines="full">
            <ion-label class="ion-text-wrap">
              <h2>{{ f.name }}</h2>
              <p>{{ f.text }}</p>
              <p class="status" :class="f.status"><strong>{{ FEATURE_STATUS_LABEL[f.status] }}.</strong> {{ f.note }}</p>
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

      <!-- Monstre -->
      <template v-else-if="mon">
        <ion-list inset>
          <ion-item><ion-label>Points de vie</ion-label><ion-note slot="end">{{ mon.maxHp }}</ion-note></ion-item>
          <ion-item><ion-label>Classe d'armure</ion-label><ion-note slot="end">{{ mon.ac }}</ion-note></ion-item>
          <ion-item><ion-label>Vitesse</ion-label><ion-note slot="end">{{ formatMeters(mon.speed) }}</ion-note></ion-item>
          <ion-item><ion-label>Initiative</ion-label><ion-note slot="end">{{ signed(mon.initiativeBonus) }}</ion-note></ion-item>
        </ion-list>
        <p>{{ mon.text }}</p>
        <h3>Attaques</h3>
        <ion-list inset>
          <ion-item v-for="a in mon.attacks" :key="a.name" lines="full">
            <ion-label class="ion-text-wrap">
              {{ a.name }}
              <p>
                {{ signed(a.toHit) }} au toucher
                <template v-if="a.damage.count">· {{ a.damage.count }}d{{ a.damage.sides }}{{ a.damage.bonus ? signed(a.damage.bonus) : "" }} {{ a.damageType }}</template>
                · {{ a.ranged ? `à distance (${formatMeters(a.range?.[0] ?? 0)})` : "corps à corps" }}
                <template v-if="a.rider"> · inflige : {{ CONDITION_BY_ID[a.rider.condition]?.name ?? a.rider.condition }}<template v-if="a.rider.save"> (jet de {{ a.rider.save.ability }} DD {{ a.rider.save.dc }})</template></template>
                <template v-if="a.saveDamage"> · poison : {{ a.saveDamage.dice[0] }}d{{ a.saveDamage.dice[1] }} (jet de {{ a.saveDamage.ability }} DD {{ a.saveDamage.dc }}, moitié si réussi)</template>
              </p>
            </ion-label>
          </ion-item>
        </ion-list>
        <template v-if="mon.traits?.length || mon.immunities?.length">
          <h3>Capacités appliquées</h3>
          <ion-list inset>
            <ion-item v-for="t in mon.traits" :key="t" lines="full">
              <ion-label class="ion-text-wrap">{{ MONSTER_TRAIT_TEXT[t].name }}<p>{{ MONSTER_TRAIT_TEXT[t].text }}</p></ion-label>
            </ion-item>
            <ion-item v-if="mon.immunities?.length" lines="full">
              <ion-label class="ion-text-wrap">Immunités<p>{{ mon.immunities.map((i) => CONDITION_BY_ID[i]?.name ?? i).join(", ") }}</p></ion-label>
            </ion-item>
          </ion-list>
        </template>
        <p v-if="mon.notApplied" class="status todo"><strong>Pas encore appliqué.</strong> {{ mon.notApplied }}</p>
      </template>

      <!-- Compagnon -->
      <template v-else-if="comp">
        <p><strong>{{ comp.title }}</strong> · {{ comp.roleLabel }}</p>
        <p>{{ comp.description }}</p>
        <ion-list inset>
          <ion-item><ion-label>Points de vie</ion-label><ion-note slot="end">{{ comp.hp }} (+{{ comp.hpPerLevel }} par niveau du héros)</ion-note></ion-item>
          <ion-item><ion-label>Classe d'armure</ion-label><ion-note slot="end">{{ comp.ac }}</ion-note></ion-item>
          <ion-item><ion-label>Vitesse</ion-label><ion-note slot="end">{{ formatMeters(comp.speed) }}</ion-note></ion-item>
          <ion-item><ion-label>Initiative</ion-label><ion-note slot="end">{{ signed(comp.initiativeBonus) }}</ion-note></ion-item>
        </ion-list>
        <h3>En combat</h3>
        <p>{{ TACTIC_TEXT[comp.tactic] }}</p>
        <ion-list inset>
          <ion-item v-for="a in comp.attacks" :key="a.name" lines="full">
            <ion-label class="ion-text-wrap">
              {{ a.name }}
              <p>{{ signed(a.toHit) }} au toucher · {{ a.damage.count }}d{{ a.damage.sides }}{{ a.damage.bonus ? signed(a.damage.bonus) : "" }} {{ a.damageType }} · {{ a.ranged ? `à distance (${formatMeters(a.range?.[0] ?? 0)} / ${formatMeters(a.range?.[1] ?? 0)})` : "corps à corps" }}</p>
            </ion-label>
          </ion-item>
          <ion-item v-if="comp.cantrip" lines="full">
            <ion-label class="ion-text-wrap">{{ comp.cantrip.name }}<p>Sort mineur, {{ formatMeters(comp.cantrip.rangeM) }} : jet de sauvegarde de {{ ABILITY_NAMES[comp.cantrip.ability] }} DD {{ comp.cantrip.dc }}, sinon {{ comp.cantrip.dice[0] }}d{{ comp.cantrip.dice[1] }} dégâts {{ comp.cantrip.damageType }}.</p></ion-label>
          </ion-item>
          <ion-item v-if="comp.healing" lines="full">
            <ion-label class="ion-text-wrap">{{ comp.healing.name }}<p>Au contact : {{ comp.healing.dice[0] }}d{{ comp.healing.dice[1] }} + {{ comp.healing.bonus }} PV, {{ comp.healing.uses }} fois par repos long. Relève un allié à 0 PV.</p></ion-label>
          </ion-item>
        </ion-list>
        <h3>Le rencontrer</h3>
        <p>{{ comp.recruitHint }}</p>
        <h3>Pour quels personnages ?</h3>
        <p>Recommandé pour : {{ recommendedFor.join(", ") }}. Il apporte ce qui manque à ces classes ; avec les autres, il fait un peu doublon, mais reste utile.</p>
        <p class="hint">Statistiques : {{ comp.source }}, converties en mètres.</p>
        <p v-if="comp.notApplied.length" class="status todo"><strong>Pas appliqué.</strong> {{ comp.notApplied.join(" ; ") }}.</p>
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
        <template v-if="WEAPON_MASTERY[wp.id]">
          <h3>Maîtrise d'arme</h3>
          <ion-list inset>
            <ion-item lines="full"><ion-label class="ion-text-wrap"><h2>{{ MASTERY_TEXT[WEAPON_MASTERY[wp.id]].name }}</h2><p>{{ MASTERY_TEXT[WEAPON_MASTERY[wp.id]].text }}</p></ion-label></ion-item>
          </ion-list>
          <p class="note">L'effet n'est actif que si vous maîtrisez cette arme (fiche du personnage, « Maîtrises d'armes »), pour les classes qui y ont droit : guerrier, barbare, paladin, rôdeur, roublard.</p>
        </template>
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
import { ARMORS, CLASS_TRAINING, WEAPONS, WEAPON_MASTERY, type Kit } from "../data/equipment";
import { FIGHTING_STYLES } from "../data/fighting-styles";
import { LEVEL2_FEATURES } from "../data/levels";
import {
  ARMOR_KIND_TEXT, ARMOR_TRAINING_TEXT, BACKGROUND_TEXT, CLASS_FEATURE_TEXT, FEAT_TEXT, FEATURE_STATUS, FEATURE_STATUS_LABEL, SPECIES_TRAIT_TEXT,
  WEAPON_PROPERTY_TEXT, WEAPON_TRAINING_TEXT,
} from "../data/help";
import { CONDITION_BY_ID } from "../data/conditions";
import { MONSTERS } from "../data/monsters";
import { MASTERY_TEXT, MONSTER_TRAIT_TEXT } from "../data/help";
import { ITEM_BY_ID, ITEM_KIND_NAMES } from "../data/items";
import { CLASS_SPELLCASTING, SPELL_BY_ID, isPlayable } from "../data/spells";
import { kitsFor } from "../engine/equipment";
import { SKILLS, type SkillId } from "../data/skills";
import { SPECIES } from "../data/species";
import { KEY_ABILITY_COUNT } from "../engine/advice";
import Illustration from "../components/Illustration.vue";
import Sprite from "../components/Sprite.vue";
import { COMPANION_BY_ID } from "../data/companions";
import { companionAdvice } from "../engine/companions";
import { ABILITY_NAMES, fmtNumber, formatMeters, signed } from "../ui/format";
import { helpArt } from "../ui/helpLists";

const route = useRoute();
const kind = computed(() => String(route.params.kind));
const id = computed(() => String(route.params.id));
const cls = computed(() => (kind.value === "classes" ? CLASSES.find((c) => c.id === id.value) : undefined));
const sp = computed(() => (kind.value === "species" ? SPECIES.find((s) => s.id === id.value) : undefined));
const bg = computed(() => (kind.value === "backgrounds" ? BACKGROUNDS.find((b) => b.id === id.value) : undefined));
const sp2 = computed(() => (kind.value === "spells" ? SPELL_BY_ID[id.value] : undefined));
const mon = computed(() => (kind.value === "monsters" ? MONSTERS.find((m) => m.id === id.value) : undefined));
const comp = computed(() => (kind.value === "companions" ? COMPANION_BY_ID[id.value] : undefined));
const recommendedFor = computed(() => (comp.value ? CLASSES.filter((c) => companionAdvice(c.id, comp.value!.id).recommended).map((c) => c.name) : []));
const TACTIC_TEXT: Record<string, string> = {
  defender: "Elle joue toute seule à son tour : elle va au contact de l'ennemi le plus proche de vous et le frappe, pour vous couvrir.",
  healer: "Il joue tout seul à son tour : il soigne d'abord le membre du groupe le plus mal en point (sous la moitié de ses PV, lui compris), s'il peut l'atteindre ; sinon il lance Flamme sacrée sur l'ennemi le plus proche, et se bat au gourdin en dernier recours.",
  archer: "Elle joue toute seule à son tour : elle tire à l'arc sur l'ennemi le plus proche et, si on l'approche, recule pour continuer à tirer.",
  skirmisher: "Il joue tout seul à son tour : arbalète quand l'ennemi est loin, cimeterre quand il est au contact.",
};
const item = computed(() => (kind.value === "items" ? ITEM_BY_ID[id.value] : undefined));
const cond = computed(() => (kind.value === "conditions" ? CONDITION_BY_ID[id.value] : undefined));
const spellCfg = computed(() => (cls.value ? CLASS_SPELLCASTING[cls.value.id] : undefined));
const TIME_LABEL: Record<string, string> = { action: "Action", bonus: "Action bonus", reaction: "Réaction" };
const className = (id: string) => CLASSES.find((c) => c.id === id)?.name ?? id;
const wp = computed(() => (kind.value === "weapons" ? WEAPONS.find((w) => w.id === id.value) : undefined));
const ar = computed(() => (kind.value === "armors" ? ARMORS.find((a) => a.id === id.value) : undefined));
const heroArt = computed(() => helpArt(kind.value, id.value));
const title = computed(() => comp.value?.name ?? cls.value?.name ?? sp.value?.name ?? bg.value?.name ?? wp.value?.name ?? ar.value?.name ?? sp2.value?.name ?? cond.value?.name ?? item.value?.name ?? mon.value?.name ?? "Aide");
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
