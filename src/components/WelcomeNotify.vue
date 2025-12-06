<template>
  <Transition name="slide-down">
    <div v-if="visible" class="welcome-notify">
      <Icon :icon="greeting.icon" width="12" height="12" class="icon" />
      <span class="text">{{ greeting.text }}{{ t('welcome.message') }}</span>
    </div>
  </Transition>
</template>
<script setup>
import { ref, onMounted, computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const visible = ref(false);
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) {
    return { text: t('welcome.morning'), icon: 'ri:sun-line' };
  } else if (hour >= 11 && hour < 13) {
    return { text: t('welcome.noon'), icon: 'ri:sun-cloudy-line' };
  } else if (hour >= 13 && hour < 17) {
    return { text: t('welcome.afternoon'), icon: 'ri:cup-line' };
  } else if (hour >= 17 && hour < 23) {
    return { text: t('welcome.evening'), icon: 'ri:moon-line' };
  } else {
    return { text: t('welcome.night'), icon: 'ri:moon-cloudy-line' };
  }
});
onMounted(() => {
  setTimeout(() => { visible.value = true; }, 500);
  setTimeout(() => { visible.value = false; }, 3500);
});
</script>
<style scoped lang="scss">
.welcome-notify {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%) scale(0.8) translateZ(0);
  transform-origin: top center;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 24px; 
  padding: 0 10px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  color: #fff;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.5px;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
  .icon {
    color: rgba(255, 255, 255, 0.9);
  }
}
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.8);
}
</style>