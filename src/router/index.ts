import { createRouter, createWebHistory } from "@ionic/vue-router";
import HomeView from "../views/HomeView.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [{ path: "/", component: HomeView }],
});
