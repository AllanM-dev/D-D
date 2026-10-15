import { createRouter, createWebHistory } from "@ionic/vue-router";
import CharacterCreateView from "../views/CharacterCreateView.vue";
import CharacterSheetView from "../views/CharacterSheetView.vue";
import CreditsView from "../views/CreditsView.vue";
import CombatView from "../views/CombatView.vue";
import HelpDetailView from "../views/HelpDetailView.vue";
import HelpListView from "../views/HelpListView.vue";
import HelpRulesView from "../views/HelpRulesView.vue";
import HelpView from "../views/HelpView.vue";
import HomeView from "../views/HomeView.vue";
import MapView from "../views/MapView.vue";
import StoryView from "../views/StoryView.vue";

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", component: HomeView },
    { path: "/create", component: CharacterCreateView },
    { path: "/character/:id", component: CharacterSheetView },
    { path: "/combat/:id", component: CombatView },
    { path: "/map/:id", component: MapView },
    { path: "/story/:id", component: StoryView },
    { path: "/credits", component: CreditsView },
    { path: "/help", component: HelpView },
    { path: "/help/rules", component: HelpRulesView },
    { path: "/help/abilities", component: HelpRulesView },
    { path: "/help/guide", component: HelpRulesView },
    { path: "/help/:kind", component: HelpListView },
    { path: "/help/:kind/:id", component: HelpDetailView },
  ],
});
