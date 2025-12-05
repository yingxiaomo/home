<template>
  <Transition name="modal">
    <div class="nav-modal" v-if="store.navOpenState" @click.self="close">
      <div class="modal-content glass-card">
        
        <div class="header">
          <span class="title">
            <Icon icon="ri:apps-2-line" class="header-icon"/> 
            常用网站
          </span>
          <button class="close-btn" @click="close" aria-label="Close">
            <Icon icon="ri:close-circle-fill" width="28" height="28" />
          </button>
        </div>

        <div class="scroll-area">
          <div 
            class="folder-group" 
            v-for="(group, index) in categoryList" 
            :key="index"
            :class="{ 'is-collapsed': group.collapsed }"
          >
            <div class="folder-header" @click="toggleGroup(group)">
              <div class="left">
                <Icon :icon="group.icon || 'ri:folder-fill'" width="20" class="folder-icon"/>
                <span class="folder-name">{{ group.title }}</span>
                <span class="count">{{ group.items.length }}</span>
              </div>
              <Icon icon="ri:arrow-down-s-line" class="arrow" />
            </div>

            <div class="folder-body" :style="{ maxHeight: group.collapsed ? '0' : '1000px' }">
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
</template>

<script setup>
import { ref, watch } from 'vue';
import { useGlobalStore } from '@/store';
import { navData } from '@/config/nav'; // ✨ 从新文件导入
import { Icon } from '@iconify/vue';

const store = useGlobalStore();

// 初始化数据，为每个分组添加响应式的 collapsed 状态
const categoryList = ref(navData.map(item => ({
  ...item,
  collapsed: item.collapsed || false // 默认展开
})));

const close = () => {
  store.navOpenState = false;
};

const toggleGroup = (group) => {
  group.collapsed = !group.collapsed;
};

// 每次打开弹窗时，可以重置状态或保持不变，这里保持不变
</script>

<style scoped lang="scss">
.nav-modal {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.4); /* 背景调暗 */
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  animation: fade-in 0.3s ease;
}

.modal-content {
  width: 100%;
  max-width: 850px;
  height: 80vh;
  background: rgba(30, 30, 30, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

/* 头部样式 */
.header {
  padding: 18px 24px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;

  .title {
    font-size: 1.2rem;
    font-weight: bold;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
    .header-icon { color: #eee; }
  }

  .close-btn {
    background: none; border: none; padding: 0;
    color: rgba(255,255,255,0.6);
    cursor: pointer;
    transition: 0.3s;
    &:hover { color: #fff; transform: rotate(90deg); }
  }
}

/* 滚动区域 */
.scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  
  /* 滚动条样式 */
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
}

/* 文件夹分组样式 */
.folder-group {
  margin-bottom: 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;

  /* 文件夹标题栏 */
  .folder-header {
    padding: 14px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.02);
    transition: background 0.2s;
    user-select: none;

    &:hover { background: rgba(255, 255, 255, 0.08); }

    .left {
      display: flex;
      align-items: center;
      gap: 10px;
      .folder-name { font-size: 1rem; font-weight: 600; color: #fff; }
      .count { 
        font-size: 0.75rem; 
        background: rgba(255,255,255,0.15); 
        padding: 2px 8px; 
        border-radius: 10px; 
        color: #ddd;
      }
    }

    .arrow {
      color: rgba(255,255,255,0.5);
      transition: transform 0.3s;
    }
  }

  /* 折叠状态处理 */
  &.is-collapsed {
    .arrow { transform: rotate(-90deg); }
    .folder-body { opacity: 0; }
  }

  /* 文件夹内容区（动画容器） */
  .folder-body {
    transition: max-height 0.4s ease, opacity 0.3s ease;
    opacity: 1;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 12px;
    padding: 20px;
    padding-top: 5px;
  }
}

/* 单个链接卡片 */
.nav-item {
  display: flex;
  flex-direction: column; /* 垂直布局更像 APP 图标 */
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
  padding: 15px 10px;
  border-radius: 10px;
  text-decoration: none;
  color: #ddd;
  transition: all 0.3s;
  border: 1px solid transparent;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-3px);
    color: #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  
  .icon-box {
    width: 40px; height: 40px;
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    transition: 0.3s;
  }

  &:hover .icon-box {
    background: rgba(255,255,255,0.9);
    color: #333;
  }
  
  .link-name {
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
}

/* 进出场动画 */
.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-content { animation: pop-up 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28); }
.modal-leave-active .modal-content { animation: pop-up 0.3s reverse; }

@keyframes pop-up {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* 移动端适配 */
@media (max-width: 600px) {
  .modal-content { height: 90vh; width: 95%; }
  .grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .nav-item { padding: 10px 5px; }
  .nav-item .icon-box { width: 32px; height: 32px; }
  .nav-item .link-name { font-size: 0.8rem; }
}
</style>