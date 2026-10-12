import type { Place, TransportMode } from "./types";

// 坐标转换常量：WGS84 转 GCJ02（火星坐标系，适配高德底图）
const PI = 3.1415926535897932384626;
const A = 6378245.0;
const EE = 0.00669342162296594323;

function isInChina(lon: number, lat: number): boolean {
  return lon >= 73.66 && lon <= 135.05 && lat >= 3.86 && lat <= 53.55;
}

function wgs84ToGcj02(lon: number, lat: number): [number, number] {
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
 * Haversine 公式：计算两点球面直线距离（单位：公里）
 * 用于OSRM接口失败时的降级估算
 */
function haversineDistance(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371; // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 路线计算结果类型定义
export interface RouteResult {
  coordinates: [number, number][]; // 路线坐标点（GCJ02坐标系）
  distance: number; // 总距离（公里）
  duration: number; // 预计行驶时长（分钟）
}

// OSRM 开源路由服务地址
const OSRM_BASE_URL = "https://router.project-osrm.org";

/**
 * 构建真实自驾路线
 * @param places 途经景点列表
 * @param mode 交通模式（当前仅支持自驾，保留参数兼容扩展）
 * @returns 路线详情
 */
export async function buildRealRoute(
  places: Place[],
  mode: TransportMode = 'driving'
): Promise<RouteResult> {
  void mode;
  // 点位不足2个，返回空结果
  if (places.length < 2) {
    return { coordinates: [], distance: 0, duration: 0 };
  }

  // 拼接OSRM要求的坐标串格式：经度,纬度;经度,纬度
  const coordsStr = places.map(p => `${p.lon},${p.lat}`).join(';');

  try {
    const response = await fetch(
      `${OSRM_BASE_URL}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=false`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) {
      throw new Error(`OSRM请求失败，状态码：${response.status}`);
    }

    const data = await response.json();
    const routeInfo = data.routes?.[0];

    if (!routeInfo || !routeInfo.geometry?.coordinates) {
      throw new Error("OSRM未返回有效路线数据");
    }

    // 坐标批量转换为高德GCJ02坐标系
    const gcjCoords: [number, number][] = routeInfo.geometry.coordinates.map(
      ([lon, lat]: [number, number]) => wgs84ToGcj02(lon, lat)
    );

    // OSRM返回：distance单位米 → 转公里；duration单位秒 → 转分钟
    const distanceKm = Number((routeInfo.distance / 1000).toFixed(1));
    const durationMin = Math.round(routeInfo.duration / 60);

    console.log(`✅ 路线计算完成：距离 ${distanceKm}km，预计 ${durationMin}分钟`);
    return {
      coordinates: gcjCoords,
      distance: distanceKm,
      duration: durationMin
    };

  } catch (error) {
    console.error('❌ OSRM路线计算失败，启用降级估算：', error);
    
    // 降级方案：直线距离 × 1.3道路弯曲系数，按30km/h市区均速估算时长
    let totalStraightDist = 0;
    for (let i = 0; i < places.length - 1; i++) {
      totalStraightDist += haversineDistance(
        places[i].lon, places[i].lat,
        places[i+1].lon, places[i+1].lat
      );
    }
    const estimateDist = Number((totalStraightDist * 1.3).toFixed(1));
    const estimateDuration = Math.round((estimateDist / 30) * 60);

    return {
      coordinates: places.map(p => wgs84ToGcj02(p.lon, p.lat)),
      distance: estimateDist,
      duration: estimateDuration
    };
  }
}
