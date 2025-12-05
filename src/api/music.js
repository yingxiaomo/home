import { musicConfig } from '@/config';
export const getPlayerList = async () => {
  const { api, server, type, id } = musicConfig;  
  try {
    const res = await fetch(`${api}?server=${server}&type=${type}&id=${id}`);
    const data = await res.json();
    if (!data || data.length === 0) return [];
    return data.map((v) => ({
      name: v.name || v.title,
      artist: v.artist || v.author,
      url: v.url,
      cover: v.cover || v.pic,
      lrc: v.lrc,
    }));
  } catch (error) {
    console.error("获取歌单失败", error);
    return [];
  }
};