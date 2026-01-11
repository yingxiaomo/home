import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { initConsole } from '@/utils/console';

if (!window.ColorThief) {
  window.ColorThief = class {
    getColor() { return [0, 0, 0]; }
    getPalette() { return [[0, 0, 0]]; }
  };
}

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#app');

initConsole();