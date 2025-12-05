<template>
  <Transition name="modal">
    <div class="nav-modal" v-if="store.navOpenState" @click.self="close">
      <div class="modal-content glass-card">
        
        <div class="header">
          <span class="title">
            <Icon icon="ri:apps-2-line" class="header-icon"/> 
            全部导航
          </span>
          <button class="close-btn" @click="close" aria-label="Close">
            <Icon icon="ri:close-circle-fill" width="28" height="28" />
          </button>
        </div>

        <div class="scroll-area">
          <Transition name="fade-content">
            <div v-show="contentReady">
              <div v-memo="[categoryList]">
                <div 
                  class="folder-group" 
                  v-for="(group, index) in categoryList" 
                  :key="index"
                  :class="{ 'is-collapsed': group.collapsed }"
                  :style="{ '--delay': index * 0.03 + 's' }" 
                >
                  <div class="folder-header" @click="toggleGroup(group)">
                    <div class="left">
                      <Icon :icon="group.icon || 'ri:folder-fill'" width="20" class="folder-icon"/>
                      <span class="folder-name">{{ group.title }}</span>
                      <span class="count">{{ group.items.length }}</span>
                    </div>
                    <Icon icon="ri:arrow-down-s-line" class="arrow" />
                  </div>

                  <div class="folder-wrapper" :class="{ 'wrapper-closed': group.collapsed }">
                     <div class="folder-inner">
                        <div class="grid">
                          <a 
                            v-for="(item, idx) in group.items" 
                            :key="idx" 
                            :href="item.url" 
                            target="_blank"
                            class="nav-item"
                          >
                            <div class="icon-box">
                              <Icon :icon="item.icon || 'ri:link'" width="22" height="22" />
                            </div>
                            <span class="link-name">{{ item.name }}</span>
                          </a>
                        </div>
                     </div>
                  </div>

                </div>
              </div>
            </div>
          </Transition>
          
          <div v-if="!contentReady" class="loading-placeholder">
            <Icon icon="ri:loader-4-line" class="spinner" width="30" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, shallowRef, watch, triggerRef } from 'vue'; // 引入 shallowRef 和 triggerRef
import { useGlobalStore } from '@/store';
import { navData } from '@/config/nav'; 
import { Icon } from '@iconify/vue';

const store = useGlobalStore();
const contentReady = ref(false);

// 🚀 优化点 3：使用 shallowRef 替代 ref
// navData 是巨大的静态数据，我们不需要 Vue 深度监听它的每一个属性
// 这能节省大量的内存和初始化时间
const categoryList = shallowRef(navData.map(item => ({
  ...item,
  collapsed: item.collapsed || false 
})));

watch(() => store.navOpenState, (isOpen) => {
  if (isOpen) {
    contentReady.value = false;
    // 稍微缩短等待时间，配合瀑布流动画会很流畅
    setTimeout(() => {
      contentReady.value = true;
    }, 300); 
  } else {
    contentReady.value = false;
  }
});

const close = () => {
  store.navOpenState = false;
};

const toggleGroup = (group) => {
  // 因为使用了 shallowRef，直接修改属性 Vue 检测不到
  group.collapsed = !group.collapsed;
  // 手动触发更新，虽然多了一行代码，但对于大列表性能提升巨大
  triggerRef(categoryList); 
};
</script>

<style scoped lang="scss">
.nav-modal {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.7); 
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 850px;
  height: 80vh;
  background: rgba(30, 30, 30, 0.85); 
  /* 🚀 优化点 4：CSS 渲染优化
     contain: content; 告诉浏览器这个盒子内部布局与外部无关
     这减少了浏览器计算重排（Reflow）的范围
  */
  contain: content; 
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0,0,0,0.5);
  transform: translateZ(0); 
}

.header {
  padding: 18px 24px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  .title { font-size: 1.2rem; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 10px; }
  .close-btn { background: none; border: none; padding: 0; color: rgba(255,255,255,0.6); cursor: pointer; transition: color 0.2s; &:hover { color: #fff; } }
}

.scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  position: relative;
  /* 优化滚动性能 */
  scroll-behavior: smooth;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
}

.loading-placeholder { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: rgba(255,255,255,0.5); .spinner { animation: spin 1s linear infinite; } }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* 文件夹样式 */
.folder-group {
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  
  /* 🚀 优化点 5：瀑布流进场动画
     默认 opacity: 0，通过 slide-in 动画滑入
     delay 由行内样式控制
  */
  opacity: 0;
  animation: slide-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  animation-delay: var(--delay); 

  .folder-header {
    padding: 14px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.02);
    transition: background-color 0.2s; 
    user-select: none;

    &:hover { background: rgba(255, 255, 255, 0.08); }

    .left { display: flex; align-items: center; gap: 10px; .folder-name { font-size: 1rem; font-weight: 600; color: #fff; } .count { font-size: 0.75rem; background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 10px; color: #ddd; } }
    .arrow { color: rgba(255,255,255,0.5); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
  }

  &.is-collapsed .arrow { transform: rotate(-90deg); }
}

/* Grid 动画折叠 (保持不变，性能最好) */
.folder-wrapper {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: grid-template-rows; /* 提示浏览器优化 */
}

.folder-wrapper.wrapper-closed {
  grid-template-rows: 0fr;
}

.folder-inner { overflow: hidden; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  padding: 20px;
  padding-top: 5px;
}

.nav-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  background: rgba(0, 0, 0, 0.2); padding: 15px 10px; border-radius: 10px; text-decoration: none; color: #ddd;
  border: 1px solid transparent;
  
  /* 🚀 优化点 6：减少交互时的重绘范围 
     只过渡必要的属性
  */
  transition: transform 0.2s ease, background-color 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-3px);
    color: #fff;
  }
  
  .icon-box { width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; }
  &:hover .icon-box { background: rgba(255,255,255,0.9); color: #333; }
  .link-name { font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
}

/* 进场动画关键帧 */
@keyframes slide-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 弹窗本身动画 */
.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-content { animation: pop-up 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); }
.modal-leave-active .modal-content { animation: pop-up 0.3s reverse ease-in; }

@keyframes pop-up {
  0% { transform: scale(0.95) translateY(10px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

@media (max-width: 600px) {
  .modal-content { height: 90vh; width: 95%; }
  .grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
}
</style>