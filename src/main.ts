import { IonicVue } from "@ionic/vue";
import "@ionic/vue/css/core.css";
import "@ionic/vue/css/normalize.css";
import "@ionic/vue/css/structure.css";
import "@ionic/vue/css/typography.css";
import "@ionic/vue/css/palettes/dark.always.css";
import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { useSound } from "./stores/sound";
import { installSound } from "./ui/audio";

const app = createApp(App).use(IonicVue).use(createPinia()).use(router);
const sound = useSound();
installSound(router, () => sound.settings);
app.mount("#app");
