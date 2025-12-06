// src/config/index.js
import { globalPlaylist } from './music';
import siteData from './site-data.json';

/**
 * -----------------------------------------------------------------------------
 * 全局配置文件 (适配器模式)
 * -----------------------------------------------------------------------------
 * 数据源已迁移至 site-data.json，此处仅做导出适配，
 * 以保持对原有代码的兼容性，并注入部分无法 JSON 化的动态配置（如 music.global）。
 */

export const siteConfig = siteData.siteConfig;
export const apiEndpoints = siteData.apiEndpoints;

export const musicConfig = {
  ...siteData.musicConfig,
  // 环境变量覆盖
  api: import.meta.env.VITE_MUSIC_API || siteData.musicConfig.api,
  // 注入 JS 模块
  global: globalPlaylist
};

export const themeConfig = siteData.themeConfig;
export const socialLinks = siteData.socialLinks;
export const siteLinks = siteData.siteLinks;