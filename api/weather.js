export default async function handler(req, res) {
  // 1. 获取用户 IP (Vercel 会自动处理 x-forwarded-for)
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ip = clientIP.split(',')[0].trim();

  // 2. 环境变量
  const qweatherKey = process.env.VITE_QWEATHER_KEY;
  const qweatherHost = process.env.VITE_QWEATHER_HOST || 'https://devapi.qweather.com';

  if (!qweatherKey) {
    return res.status(500).json({ success: false, message: 'Server Config Error: Missing QWeather Key' });
  }

  try {
    // 3. 第三方 IP 定位 (Vore)
    let locationID = null;
    let cityName = '未知城市';

    try {
        // Vercel 有时会直接提供地理位置 Header，优先尝试
        const vercelCity = req.headers['x-vercel-ip-city'];
        if (vercelCity) {
            cityName = decodeURIComponent(vercelCity);
        } else {
            const voreUrl = `https://api.vore.top/api/IPdata?ip=${ip}`;
            const voreRes = await fetch(voreUrl);
            const voreData = await voreRes.json();
            
            if (voreData.code === 200 && voreData.ipdata) {
                cityName = voreData.ipdata.info2 || voreData.ipdata.info1;
                cityName = cityName.replace(/市$/, '');
            }
        }
    } catch (e) {
        console.warn('IP lookup failed:', e.message);
    }

    if (!cityName || cityName === '未知城市') {
        cityName = '北京';
    }

    // 4. 和风天气 - 城市搜索 API
    const geoUrl = `${qweatherHost}/geo/v2/city/lookup?location=${encodeURIComponent(cityName)}&key=${qweatherKey}&lang=zh`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (geoData.code === '200' && geoData.location && geoData.location.length > 0) {
        locationID = geoData.location[0].id;
        cityName = geoData.location[0].name;
    } else {
        return res.status(404).json({ success: false, message: 'City Lookup Failed' });
    }

    // 5. 和风天气 - 实况 API
    const weatherUrl = `${qweatherHost}/v7/weather/now?location=${locationID}&key=${qweatherKey}&lang=zh`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    if (weatherData.code === '200') {
        const now = weatherData.now;
        return res.status(200).json({
            success: true,
            data: {
                city: cityName,
                weather: now.text,
                temperature: now.temp,
                wind: `${now.windDir} ${now.windScale}级`,
                updateTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                ip: ip,
                source: '和风天气 (Vercel)'
            }
        });
    } else {
        return res.status(500).json({ success: false, message: `QWeather API Error: ${weatherData.code}` });
    }

  } catch (error) {
    return res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
}