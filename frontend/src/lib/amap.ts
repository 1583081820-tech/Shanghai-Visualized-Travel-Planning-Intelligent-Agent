// src/lib/amap.ts
import type { Place, TransitPlan, TransitSegment, PlaceCategory } from "./types";
import { cacheGet, cacheSet } from "./cache";

const AMAP_BASE_URL = "/amap/v3";
const API_KEY = import.meta.env.VITE_AMAP_WEB_KEY;

// 全局请求队列（限流，避免高德API QPS超限）
let requestQueue = Promise.resolve();
const GLOBAL_REQUEST_DELAY = 1000; // 1秒间隔，适配高德免费版QPS限制

/**
 * 带全局限流的fetch函数
 */
async function throttledFetch(url: string, options?: RequestInit): Promise<Response> {
  requestQueue = requestQueue.then(() => 
    new Promise(resolve => setTimeout(resolve, GLOBAL_REQUEST_DELAY))
  );
  await requestQueue;
  return fetch(url, options);
}

/**
 * 高德坐标转换（WGS84 → GCJ02）
 */
export function wgs84ToGcj02(lon: number, lat: number): [number, number] {
  const PI = 3.1415926535897932384626;
  const A = 6378245.0;
  const EE = 0.00669342162296594323;

  function isInChina(lon: number, lat: number): boolean {
    return lon >= 73.66 && lon <= 135.05 && lat >= 3.86 && lat <= 53.55;
  }

  if (!isInChina(lon, lat)) return [lon, lat];

  function transformLat(x: number, y: number): number {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320.0 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLon(x: number, y: number): number {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
  }

  const dLat = transformLat(lon - 105.0, lat - 35.0);
  const dLon = transformLon(lon - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const dLat2 = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  const dLon2 = (dLon * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
  
  return [Number((lon + dLon2).toFixed(6)), Number((lat + dLat2).toFixed(6))];
}

/**
 * 高德坐标反向转换（GCJ02 → WGS84）
 */
export function gcj02ToWgs84(lon: number, lat: number): [number, number] {
  const [gcjLon, gcjLat] = wgs84ToGcj02(lon, lat);
  const dLon = gcjLon - lon;
  const dLat = gcjLat - lat;
  return [Number((lon - dLon).toFixed(6)), Number((lat - dLat).toFixed(6))];
}

/**
 * ✅ 唯一的基础路线计算函数（自驾模式，返回坐标数组）
 * 完全适配你的DayPlan.routes类型要求
 */
export async function getRoute(
  origin: [number, number],
  destination: [number, number]
): Promise<[number, number][]> {
  const cacheKey = `route_${origin[0].toFixed(6)}_${origin[1].toFixed(6)}_${destination[0].toFixed(6)}_${destination[1].toFixed(6)}`;
  const cached = cacheGet<[number, number][]>(cacheKey);
  if (cached) {
    console.log('✅ 从缓存获取自驾路线');
    return cached;
  }

  try {
    const [oLon, oLat] = wgs84ToGcj02(origin[0], origin[1]);
    const [dLon, dLat] = wgs84ToGcj02(destination[0], destination[1]);

    const response = await throttledFetch(
      `${AMAP_BASE_URL}/direction/driving?key=${API_KEY}&origin=${oLon},${oLat}&destination=${dLon},${dLat}&strategy=0&extensions=base`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) throw new Error(`路线API请求失败: ${response.status}`);
    const data = await response.json();

    if (data.status !== "1" || !data.route?.paths?.length) {
      console.warn('⚠️ 路线获取失败，使用直线降级');
      const result = [origin, destination];
      cacheSet(cacheKey, result, 1000 * 60 * 60 * 2);
      return result;
    }

    const path = data.route.paths[0];
    const coords = parsePolyline(path.polyline || "");
    const wgsCoords = coords.map(coord => gcj02ToWgs84(coord[0], coord[1]));
    
    console.log(`✅ 自驾路线坐标点数: ${wgsCoords.length}`);
    cacheSet(cacheKey, wgsCoords, 1000 * 60 * 60 * 2);
    return wgsCoords;
  } catch (error) {
    console.error("❌ 获取路线失败:", error);
    const result = [origin, destination];
    cacheSet(cacheKey, result, 1000 * 60 * 60 * 2);
    return result;
  }
}

/**
 * ✅ 获取路线详情（包含时长和距离，适配TransitPlan类型）
 * 用于行程估算和显示
 */
export async function getRouteDetails(
  origin: [number, number],
  destination: [number, number]
): Promise<TransitPlan> {
  try {
    const [oLon, oLat] = wgs84ToGcj02(origin[0], origin[1]);
    const [dLon, dLat] = wgs84ToGcj02(destination[0], destination[1]);

    const response = await throttledFetch(
      `${AMAP_BASE_URL}/direction/driving?key=${API_KEY}&origin=${oLon},${oLat}&destination=${dLon},${dLat}&strategy=0&extensions=base`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) throw new Error(`路线详情API请求失败: ${response.status}`);
    const data = await response.json();

    if (data.status !== "1" || !data.route?.paths?.length) {
      return fallbackRoutePlan();
    }

    const path = data.route.paths[0];
    const segments: TransitSegment[] = [{
      mode: "driving",
      duration: Math.round(parseInt(path.duration || "0") / 60)
    }];

    return {
      duration: Math.round(parseInt(path.duration || "0") / 60),
      distance: parseInt(path.distance || "0"),
      segments
    };
  } catch (error) {
    console.error("❌ 获取路线详情失败:", error);
    return fallbackRoutePlan();
  }
}

/**
 * 获取景点周边停车场
 */
export async function getNearbyParking(
  location: [number, number],
  radius: number = 1000
): Promise<Place[]> {
  const cacheKey = `parking_${location[0].toFixed(6)}_${location[1].toFixed(6)}_${radius}`;
  const cached = cacheGet<Place[]>(cacheKey);
  if (cached) {
    console.log('✅ 从缓存获取停车场信息');
    return cached;
  }
  
  try {
    const [lon, lat] = wgs84ToGcj02(location[0], location[1]);
    const response = await throttledFetch(
      `${AMAP_BASE_URL}/place/around?key=${API_KEY}&location=${lon},${lat}&keywords=停车场&types=150900&radius=${radius}&offset=10&page=1&sortrule=distance`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) throw new Error(`停车场API请求失败: ${response.status}`);
    const data = await response.json();

    if (data.status !== "1" || !data.pois?.length) {
      return [];
    }

    const result: Place[] = data.pois.map((poi: any) => {
      const [gcjLon, gcjLat] = poi.location.split(",").map(parseFloat);
      const [wgsLon, wgsLat] = gcj02ToWgs84(gcjLon, gcjLat);
      
      return {
        id: poi.id,
        name: poi.name,
        category: "other" as PlaceCategory,
        lat: wgsLat,
        lon: wgsLon,
        address: poi.address,
        openNow: null,
        ticketCny: null,
        source: "amap",
        distance: parseInt(poi.distance || "0")
      };
    });
    
    cacheSet(cacheKey, result, 1000 * 60 * 60 * 2);
    return result;
  } catch (error) {
    console.error("获取停车场信息失败:", error);
    return [];
  }
}

/**
 * 获取指定坐标最近的地铁站
 */
export async function getNearestSubwayStation(
  location: [number, number]
): Promise<Place | null> {
  const cacheKey = `subway_${location[0].toFixed(6)}_${location[1].toFixed(6)}`;
  const cached = cacheGet<Place>(cacheKey);
  if (cached) {
    console.log('✅ 从缓存获取地铁站信息');
    return cached;
  }
  
  try {
    const [lon, lat] = wgs84ToGcj02(location[0], location[1]);
    const response = await throttledFetch(
      `${AMAP_BASE_URL}/place/around?key=${API_KEY}&location=${lon},${lat}&keywords=地铁站&types=150500&radius=5000&offset=1&page=1&sortrule=distance`,
      { signal: AbortSignal.timeout(8000) }
    );
    
    if (!response.ok) throw new Error(`地铁站API请求失败: ${response.status}`);
    const data = await response.json();
    
    if (data.status !== "1" || !data.pois?.length) {
      return null;
    }
    
    const poi = data.pois[0];
    const [gcjLon, gcjLat] = poi.location.split(",").map(parseFloat);
    const [wgsLon, wgsLat] = gcj02ToWgs84(gcjLon, gcjLat);
    
    const result: Place = {
      id: poi.id,
      name: poi.name,
      category: "other" as PlaceCategory,
      lat: wgsLat,
      lon: wgsLon,
      address: poi.address,
      openNow: null,
      ticketCny: null,
      source: "amap",
      distance: parseInt(poi.distance || "0")
    };
    
    cacheSet(cacheKey, result, 1000 * 60 * 60 * 24);
    return result;
  } catch (error) {
    console.error("获取最近地铁站失败:", error);
    return null;
  }
}

/**
 * Polyline解码 + 智能抽稀（平衡精度和性能，避免WebGL崩溃）
 */
function parsePolyline(polyline: string): [number, number][] {
  if (!polyline || polyline.length === 0) {
    return [];
  }
  
  const coordinates: [number, number][] = [];
  let index = 0;
  const len = polyline.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    
    do {
      if (index >= len) break;
      b = polyline.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    if (index >= len) break;
    
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      if (index >= len) break;
      b = polyline.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    if (index >= len) break;
    
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push([lng * 1e-6, lat * 1e-6]);
  }
  
  // 智能抽稀：长路线多抽稀，短路线保精度
  if (coordinates.length > 500) {
    return coordinates.filter((_, i) => i % 3 === 0 || i === coordinates.length - 1);
  } else if (coordinates.length > 200) {
    return coordinates.filter((_, i) => i % 2 === 0 || i === coordinates.length - 1);
  }
  
  return coordinates;
}

/**
 * 降级方案：兜底的路线详情
 */
function fallbackRoutePlan(): TransitPlan {
  return {
    duration: 60,
    distance: 0,
    segments: [{
      mode: "driving",
      duration: 60
    }]
  };
}

// ==================== 天气 API ====================

/**
 * 实时天气数据类型
 */
export interface LiveWeatherData {
  province: string;
  city: string;
  adcode: string;
  weather: string;
  temperature: string;
  winddirection: string;
  windpower: string;
  humidity: string;
  reporttime: string;
  temperature_float?: string;
  humidity_float?: string;
}

/**
 * 预报天气数据类型
 */
export interface ForecastDayData {
  date: string;
  week: string;
  dayweather: string;
  nightweather: string;
  daytemp: string;
  nighttemp: string;
  daywind: string;
  nightwind: string;
  daypower: string;
  nightpower: string;
  daytemp_float?: string;
  nighttemp_float?: string;
}

/**
 * 获取实时天气
 * @param cityAdcode 城市编码，上海默认 310100
 */
export async function getLiveWeather(
  cityAdcode: string = "310100"
): Promise<LiveWeatherData | null> {
  const cacheKey = `weather_live_${cityAdcode}`;
  const cached = cacheGet<LiveWeatherData>(cacheKey);
  if (cached) {
    console.log('✅ 从缓存获取实时天气');
    return cached;
  }

  try {
    const response = await throttledFetch(
      `${AMAP_BASE_URL}/weather/weatherInfo?key=${API_KEY}&city=${cityAdcode}&extensions=base`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) throw new Error(`实时天气API请求失败: ${response.status}`);
    const data = await response.json();

    if (data.status !== "1" || !data.lives?.length) {
      console.warn('⚠️ 获取实时天气失败');
      return null;
    }

    const live = data.lives[0];
    const result: LiveWeatherData = {
      province: live.province,
      city: live.city,
      adcode: live.adcode,
      weather: live.weather,
      temperature: live.temperature,
      winddirection: live.winddirection,
      windpower: live.windpower,
      humidity: live.humidity,
      reporttime: live.reporttime,
      temperature_float: live.temperature_float,
      humidity_float: live.humidity_float,
    };

    // 缓存 10 分钟
    cacheSet(cacheKey, result, 1000 * 60 * 10);
    return result;
  } catch (error) {
    console.error("❌ 获取实时天气失败:", error);
    return null;
  }
}

/**
 * 获取天气预报（未来3-4天）
 * @param cityAdcode 城市编码，上海默认 310100
 */
export async function getForecastWeather(
  cityAdcode: string = "310100"
): Promise<ForecastDayData[]> {
  const cacheKey = `weather_forecast_${cityAdcode}`;
  const cached = cacheGet<ForecastDayData[]>(cacheKey);
  if (cached) {
    console.log('✅ 从缓存获取天气预报');
    return cached;
  }

  try {
    const response = await throttledFetch(
      `${AMAP_BASE_URL}/weather/weatherInfo?key=${API_KEY}&city=${cityAdcode}&extensions=all`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) throw new Error(`天气预报API请求失败: ${response.status}`);
    const data = await response.json();

    if (data.status !== "1" || !data.forecasts?.length) {
      console.warn('⚠️ 获取天气预报失败');
      return [];
    }

    const forecast = data.forecasts[0];
    const casts = forecast.casts || [];

    const result: ForecastDayData[] = casts.map((cast: any) => ({
      date: cast.date,
      week: cast.week,
      dayweather: cast.dayweather,
      nightweather: cast.nightweather,
      daytemp: cast.daytemp,
      nighttemp: cast.nighttemp,
      daywind: cast.daywind,
      nightwind: cast.nightwind,
      daypower: cast.daypower,
      nightpower: cast.nightpower,
      daytemp_float: cast.daytemp_float,
      nighttemp_float: cast.nighttemp_float,
    }));

    // 缓存 30 分钟
    cacheSet(cacheKey, result, 1000 * 60 * 30);
    return result;
  } catch (error) {
    console.error("❌ 获取天气预报失败:", error);
    return [];
  }
}