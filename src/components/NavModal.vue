<template>
  <Transition name="modal">
    <div class="nav-modal" v-if="store.navOpenState" @click.self="close">
      <div class="modal-content glass-card">
        
        <div class="header-tabs">
          <div 
            class="tab-item" 
            :class="{ 'active': currentView === 'search' }"
            @click="currentView = 'search'"
          >
            <Icon icon="ri:search-line" /> 聚合搜索
          </div>
          <div 
            class="tab-item" 
            :class="{ 'active': currentView === 'nav' }"
            @click="currentView = 'nav'"
          >
            <Icon icon="ri:folder-line" /> 导航列表
          </div>
          <div 
            class="tab-item" 
            :class="{ 'active': currentView === 'add-link' }"
            @click="currentView = 'add-link'"
          >
            <Icon icon="ri:add-line" /> 批量添加链接
          </div>
          <div 
            class="tab-item" 
            :class="{ 'active': currentView === 'add-folder' }"
            @click="currentView = 'add-folder'"
          >
            <Icon icon="ri:folder-add-line" /> 添加文件夹
          </div>
        </div>

        <button class="close-btn" @click="close" aria-label="Close">
          <Icon icon="ri:close-circle-fill" width="32" height="32" />
        </button>

        <div class="scroll-area">
          <Transition name="fade-content" mode="out-in">
            <div v-if="currentView === 'search' || currentView === 'nav'" :key="'search-nav'">
              
              <div class="search-box-wrapper" v-if="currentView === 'search'">
                 <div class="search-box" :class="{ 'focused': isFocused }">
                    <div class="engine-switch" @click.stop="toggleEngineList">
                      <Icon :icon="currentEngine.icon" width="20" height="20" class="engine-icon" />
                      <Icon icon="ri:arrow-down-s-fill" width="14" class="arrow" :class="{ 'rotate': showEngineList }"/>
                      
                      <Transition name="drop">
                        <div class="engine-dropdown" v-if="showEngineList">
                          <div 
                            v-for="(eng, index) in searchEngines" 
                            :key="index"
                            class="engine-item"
                            :class="{ 'active': currentEngine.name === eng.name }"
                            @click.stop="switchEngine(eng)"
                          >
                            <Icon :icon="eng.icon" width="18" />
                            <span>{{ eng.name }}</span>
                          </div>
                        </div>
                      </Transition>
                    </div>

                    <input 
                      type="text" 
                      v-model="keyword" 
                      class="search-input"
                      :placeholder="currentEngine.placeholder"
                      @focus="isFocused = true"
                      @blur="isFocused = false"
                      @keyup.enter="onSearch"
                      ref="searchInputRef"
                    />

                    <button class="search-btn" @click="onSearch" :disabled="!keyword">
                      <Icon icon="ri:search-2-line" width="20" />
                    </button>
                  </div>
              </div>

              <Transition name="fade-content">
                <div v-show="contentReady">
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
                                <Icon v-if="!isUrl(item.icon)" :icon="item.icon || 'ri:link'" width="22" height="22" />
                                <img v-else :src="item.icon" alt="Favicon" width="22" height="22" class="favicon-img" />
                              </div>
                              <span class="link-name">{{ item.name }}</span>
                            </a>
                          </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>

            </div>

            <div v-else-if="currentView === 'add-link'" :key="'add-link'" class="add-form-container">
              <h3 class="form-title">批量添加链接（提交后 Cloudflare Pages 会自动部署）</h3>
              
              <div class="form-item">
                <label for="group">分组 (Category) *</label>
                <select id="group" v-model="selectedGroupTitle" class="high-contrast-select">
                  <option 
                    v-for="(group, index) in categoryList" 
                    :key="index" 
                    :value="group.title"
                  >
                    {{ group.title }}
                  </option>
                </select>
              </div>

              <div class="form-item bulk-input">
                <label for="bulk-links">
                  批量添加链接 (格式: **名称 | URL | IconCode/URL**) *
                  <span class="auto-tip" v-if="parsedLinks.length > 0">（已解析 {{ parsedLinks.length }} 个有效链接）</span>
                  <span class="auto-tip error" v-if="bulkError">{{ bulkError }}</span>
                </label>
                <textarea 
                  id="bulk-links" 
                  v-model="bulkInput" 
                  rows="8" 
                  placeholder="每行输入一个链接，例如：&#10;Google | https://google.com | ri:google-fill&#10;Bing | https://bing.com | https://icons.duckduckgo.com/ip3/bing.com.ico"
                ></textarea>
              </div>

              <div class="form-actions">
                <button 
                  class="save-btn" 
                  @click="onSubmitNewLink"
                  :disabled="parsedLinks.length === 0 || isSaving || !selectedGroupTitle"
                >
                  <Icon v-if="isSaving" icon="ri:loader-4-line" class="spinner-sm" />
                  <span v-else>批量添加到 {{ selectedGroupTitle }} ({{ parsedLinks.length }} 条)</span>
                </button>
              </div>

              <p v-if="saveMessage" :class="['message', isSaving ? 'info' : 'error']">
                  {{ saveMessage }}
              </p>
            </div>


            <div v-else-if="currentView === 'add-folder'" :key="'add-folder'" class="add-form-container">
              <h3 class="form-title">添加新文件夹（将插入到导航列表末尾）</h3>
              
              <div class="form-item">
                <label for="folder-title">文件夹名称 (Title) *</label>
                <input id="folder-title" type="text" v-model="newFolder.title" placeholder="例如：我的项目" />
              </div>

              <div class="form-item">
                <label for="folder-icon">图标 (Iconify Code)</label>
                <input id="folder-icon" type="text" v-model="newFolder.icon" placeholder="例如：ri:box-3-line" />
                <span v-if="newFolder.icon" class="icon-preview"><Icon :icon="newFolder.icon" width="24" /></span>
              </div>

              <div class="form-actions">
                <button 
                  class="save-btn" 
                  @click="onSubmitNewFolder"
                  :disabled="!newFolder.title || isSaving"
                >
                  <Icon v-if="isSaving" icon="ri:loader-4-line" class="spinner-sm" />
                  <span v-else>创建文件夹</span>
                </button>
              </div>
              
              <p v-if="saveMessage" :class="['message', isSaving ? 'info' : 'error']">
                  {{ saveMessage }}
              </p>
            </div>
          </Transition>

          <div v-if="!contentReady && currentView !== 'add-link' && currentView !== 'add-folder'" class="loading-placeholder">
            <Icon icon="ri:loader-4-line" class="spinner" width="30" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue';
import { useGlobalStore } from '@/store';
import { navData } from '@/config/nav';
import { searchEngines } from '@/config/search';
import { Icon } from '@iconify/vue';

const store = useGlobalStore();
const contentReady = ref(false);
const searchInputRef = ref(null);
const currentView = ref('nav'); // 默认显示导航列表，因为搜索框独立了

// 搜索相关状态
const keyword = ref('');
const currentEngine = ref(searchEngines[0]);
const showEngineList = ref(false);
const isFocused = ref(false);

// 批量添加链接状态
const bulkInput = ref('');
const bulkError = ref('');

// 添加文件夹相关状态
const newFolder = ref({ title: '', icon: 'ri:folder-line' });

// 通用状态
const selectedGroupTitle = ref(navData[0]?.title || ''); 
const isSaving = ref(false);
const saveMessage = ref('');


// 链接分类数据
const categoryList = ref(navData.map(item => ({
  ...item,
  collapsed: item.collapsed || false
})));

// 工具函数：判断字符串是否为 URL
const isUrl = (str) => {
  return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('//');
};

// 🌟 解析批量输入的链接
const parsedLinks = computed(() => {
  const lines = bulkInput.value.trim().split('\n').filter(line => line.trim() !== '');
  const links = [];
  bulkError.value = '';

  for (const line of lines) {
    const parts = line.split('|').map(part => part.trim());
    
    if (parts.length < 2) {
      bulkError.value = '格式错误：每行至少需要 [名称 | URL]';
      return [];
    }

    const [name, url, icon = 'ri:link'] = parts;

    if (!url.startsWith('http')) {
      bulkError.value = 'URL 必须以 http:// 或 https:// 开头';
      return [];
    }

    links.push({
      name,
      url,
      icon: icon.trim() || 'ri:link'
    });
  }
  return links;
});


// 弹窗开关监听
watch(() => store.navOpenState, (isOpen) => {
  if (isOpen) {
    contentReady.value = false;
    setTimeout(() => { contentReady.value = true; }, 300);
  } else {
    contentReady.value = false;
    showEngineList.value = false;
    keyword.value = '';
    currentView.value = 'nav';
  }
});

// 切换视图时，重置状态
watch(currentView, (newView) => {
  if (newView !== 'add-link' && newView !== 'add-folder') {
    contentReady.value = false;
    setTimeout(() => { contentReady.value = true; }, 300);
  } else {
    // 重置表单状态
    bulkInput.value = '';
    newFolder.value = { title: '', icon: 'ri:folder-line' };
    saveMessage.value = ''; 
    bulkError.value = '';
  }
});


// 切换引擎下拉显示
const toggleEngineList = () => { showEngineList.value = !showEngineList.value; };
const switchEngine = (eng) => { currentEngine.value = eng; showEngineList.value = false; if (searchInputRef.value) searchInputRef.value.focus(); };
// 执行搜索
const onSearch = () => {
  if (!keyword.value.trim()) return;
  const targetUrl = currentEngine.value.url + encodeURIComponent(keyword.value);
  window.open(targetUrl, '_blank');
};


// 提交新链接（批量处理）
const onSubmitNewLink = async () => {
  if (parsedLinks.value.length === 0 || !selectedGroupTitle.value) return;

  isSaving.value = true;
  saveMessage.value = `正在提交 ${parsedLinks.value.length} 个链接至 GitHub API... (请等待自动部署)`;
  
  try {
    // ⚠️ 负载结构现在是数组 links
    const payload = {
      links: parsedLinks.value, 
      groupTitle: selectedGroupTitle.value,
    };

    const response = await fetch('/api/add-link', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json(); 

    if (response.ok) { 
        saveMessage.value = data.message || `批量添加链接成功！共 ${parsedLinks.value.length} 条。`;
        
        setTimeout(() => {
            bulkInput.value = '';
            saveMessage.value = '';
            currentView.value = 'nav'; 
        }, 2500);
        
    } else {
        saveMessage.value = `❌ 错误 (${response.status}): ${data.message}`; 
    }
    
  } catch (error) {
    saveMessage.value = `网络连接或数据解析错误: ${error.message}`;
  } finally {
    isSaving.value = false;
  }
};

// 提交新文件夹
const onSubmitNewFolder = async () => {
  if (!newFolder.value.title.trim()) return;

  isSaving.value = true;
  saveMessage.value = '正在提交新文件夹至 GitHub API...';
  
  try {
    const payload = {
      title: newFolder.value.title,
      icon: newFolder.value.icon, 
    };

    const response = await fetch('/api/add-group', { // 调用 add-group API
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
        saveMessage.value = data.message || '文件夹添加成功！请等待部署完成。';
        
        setTimeout(() => {
            newFolder.value = { title: '', icon: 'ri:folder-line' };
            saveMessage.value = '';
            currentView.value = 'nav'; 
            window.location.reload(); 
        }, 2500);
        
    } else {
        saveMessage.value = `❌ 错误 (${response.status}): ${data.message}`; 
    }
    
  } catch (error) {
    saveMessage.value = `网络连接或数据解析错误: ${error.message}`;
  } finally {
    isSaving.value = false;
  }
};


onMounted(() => {
  document.addEventListener('click', () => { showEngineList.value = false; });
  if (!selectedGroupTitle.value && categoryList.value.length > 0) {
     selectedGroupTitle.value = categoryList.value[0].title;
  }
});

const close = () => { store.navOpenState = false; };
const toggleGroup = (group) => { group.collapsed = !group.collapsed; };
</script>

<style scoped lang="scss">
/* --- 样式保持不变，新增了表单项样式 --- */
.nav-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 2000; display: flex; justify-content: center; align-items: center; padding: 20px; }
.modal-content { width: 100%; max-width: 850px; height: 80vh; background: rgba(30, 30, 30, 0.85); contain: content; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 16px; display: grid; grid-template-rows: auto 1fr; overflow: hidden; box-shadow: 0 25px 50px rgba(0,0,0,0.5); transform: translateZ(0); }

.header-tabs {
  grid-row: 1; display: flex; justify-content: center; align-items: center; gap: 15px; padding: 10px 0; background: rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.6); z-index: 30;
  .tab-item {
    display: flex; align-items: center; gap: 6px; padding: 8px 15px; border-radius: 8px; font-size: 0.95rem; font-weight: 500; cursor: pointer; transition: all 0.2s;
    &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
    &.active { background: rgba(255, 255, 255, 0.2); color: #fff; font-weight: bold; }
  }
}

.search-box-wrapper {
  padding: 20px 24px; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: center; align-items: center;
}

.close-btn {
  position: absolute; top: 10px; right: 15px; background: none; border: none; padding: 0; color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.3s; z-index: 40;
  &:hover { color: #fff; transform: rotate(90deg); }
}

.search-box {
  width: 100%; max-width: 500px; height: 46px; background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; display: flex;
  align-items: center; padding: 0 6px; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); position: relative;

  &.focused { background: rgba(0, 0, 0, 0.4); border-color: rgba(255, 255, 255, 0.3); box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1); }
}
.engine-switch { display: flex; align-items: center; justify-content: center; gap: 4px; height: 34px; padding: 0 8px; margin-right: 5px; border-radius: 6px; cursor: pointer; color: #ddd; transition: 0.2s; position: relative;
  &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
  .arrow { opacity: 0.6; transition: transform 0.3s; }
  .arrow.rotate { transform: rotate(180deg); }
}
.engine-dropdown {
  position: absolute; top: 120%; left: 0; width: 140px; background: rgba(40, 40, 40, 0.95);
  backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
  padding: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 2px;
  .engine-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 6px; font-size: 0.9rem; color: #ccc; transition: 0.2s;
    &:hover, &.active { background: rgba(255, 255, 255, 0.1); color: #fff; }
  }
}
.search-input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 1rem; height: 100%; padding: 0 10px; &::placeholder { color: rgba(255, 255, 255, 0.3); } }
.search-btn {
  width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.1); border: none; border-radius: 8px; color: #eee; cursor: pointer; transition: 0.2s;
  &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.25); color: #fff; }
  &:active:not(:disabled) { transform: scale(0.95); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

.scroll-area {
  grid-row: 2; overflow-y: auto; padding: 0 24px 20px 24px; position: relative; scroll-behavior: smooth;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
}

.loading-placeholder { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: rgba(255,255,255,0.5); .spinner { animation: spin 1s linear infinite; } }
@keyframes spin { 100% { transform: rotate(360deg); } }

.folder-group {
  margin-bottom: 20px; background: rgba(255, 255, 255, 0.03); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); overflow: hidden;
  opacity: 0; animation: slide-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; animation-delay: var(--delay); 

  .folder-header {
    padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: rgba(255, 255, 255, 0.02); transition: background-color 0.2s; user-select: none;
    &:hover { background: rgba(255, 255, 255, 0.08); }
    .left { display: flex; align-items: center; gap: 10px; .folder-name { font-size: 1rem; font-weight: 600; color: #fff; } .count { font-size: 0.75rem; background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 10px; color: #ddd; } }
    .arrow { color: rgba(255,255,255,0.5); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
  }
  &.is-collapsed .arrow { transform: rotate(-90deg); }
}

.folder-wrapper { display: grid; grid-template-rows: 1fr; transition: grid-template-rows 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); will-change: grid-template-rows; }
.folder-wrapper.wrapper-closed { grid-template-rows: 0fr; }
.folder-inner { overflow: hidden; min-height: 0; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; padding: 20px; padding-top: 5px; }

.nav-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: rgba(0, 0, 0, 0.2); padding: 15px 10px; border-radius: 10px; text-decoration: none; color: #ddd; border: 1px solid transparent; transition: transform 0.2s ease, background-color 0.2s ease;
  &:hover { background: rgba(255, 255, 255, 0.15); border-color: rgba(255, 255, 255, 0.3); transform: translateY(-3px); color: #fff; }
  .icon-box { 
    width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 10px; 
    display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; 
    
    .favicon-img { 
        border-radius: 4px; 
        object-fit: contain;
    }
  }
  &:hover .icon-box { background: rgba(255,255,255,0.9); color: #333; }
  .link-name { font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
}

/* --- 表单区域样式 --- */
.add-form-container {
  padding: 20px; color: #fff; max-width: 500px; margin: 0 auto;
  .form-title { font-size: 1.1rem; font-weight: bold; margin-bottom: 20px; color: rgba(255, 255, 255, 0.9); }
  .form-item {
    margin-bottom: 20px;
    position: relative;

    label { display: block; font-size: 0.9rem; color: rgba(255, 255, 255, 0.7); margin-bottom: 5px; font-weight: 500; }
    input, select, textarea { // 适配 textarea
      width: 100%; padding: 12px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px; color: #fff; font-size: 1rem; outline: none; transition: border-color 0.2s;
      -webkit-appearance: none; appearance: none;
      
      color: #fff; 
      
      &:focus { border-color: #4facfe; }
    }
    select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'%3E%3Cpath fill='white' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 10px top 50%; padding-right: 30px;
    }
    textarea {
      resize: vertical;
      line-height: 1.4;
    }
    .icon-preview {
        position: absolute; top: 32px; right: 10px; 
        display: inline-flex; align-items: center; justify-content: center;
        padding: 5px; background: rgba(0, 0, 0, 0.5); border-radius: 50%;
        color: #fff; border: 1px solid rgba(255,255,255,0.1);
        
        .favicon-img { border-radius: 4px; }
    }
    .auto-tip {
        display: block; margin-top: 5px; font-size: 0.8rem; color: #a0f0a0; 
    }
  }

  .form-actions { margin-top: 30px; }
  .save-btn {
    width: 100%; padding: 15px; background: #4facfe; color: #fff; border: none; border-radius: 8px;
    font-size: 1rem; font-weight: bold; cursor: pointer; transition: all 0.3s; display: flex;
    justify-content: center; align-items: center; gap: 10px;
    &:hover:not(:disabled) { background: #3e9ae0; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
  }
  .spinner-sm { animation: spin 1s linear infinite; }
  
  .message {
    margin-top: 15px; padding: 10px; border-radius: 6px; font-size: 0.9rem; white-space: pre-wrap;
    &.info { background: rgba(255, 215, 0, 0.2); color: #ffd700; border: 1px solid rgba(255, 215, 0, 0.4); }
    &.error { background: rgba(255, 0, 0, 0.2); color: #ff4d4f; border: 1px solid rgba(255, 0, 0, 0.4); }
  }
}

@keyframes slide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-content { animation: pop-up 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); }
.modal-leave-active .modal-content { animation: pop-up 0.3s reverse ease-in; }
.drop-enter-active, .drop-leave-active { transition: all 0.2s ease; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-10px); }
.fade-content-enter-active { transition: opacity 0.4s ease; }
.fade-content-enter-from { opacity: 0; transform: translateY(10px); }
.fade-content-enter-to { opacity: 1; transform: translateY(0); }
@keyframes pop-up { 0% { transform: scale(0.95) translateY(10px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }

@media (max-width: 600px) {
  .modal-content { height: 90vh; width: 95%; }
  .search-input { font-size: 0.9rem; }
  .engine-switch { padding: 0 6px; }
  .engine-icon { width: 18px; height: 18px; }
  .search-header { padding: 10px 15px; }
  .close-btn { right: 10px; top: 8px; }
}
</style>