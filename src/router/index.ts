import { createRouter, createWebHistory } from "@ionic/vue-router";
import CharacterCreateView from "../views/CharacterCreateView.vue";
import CharacterSheetView from "../views/CharacterSheetView.vue";
import CombatView from "../views/CombatView.vue";
import HomeView from "../views/HomeView.vue";

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", component: HomeView },
    { path: "/create", component: CharacterCreateView },
    { path: "/character/:id", component: CharacterSheetView },
    { path: "/combat/:id", component: CombatView },
  ],
});
