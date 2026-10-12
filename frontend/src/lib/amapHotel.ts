// src/lib/amapHotel.ts
import { cacheSet } from "./cache";
import type { Hotel } from "./types";
import { wgs84ToGcj02 } from "./amap";

const AMAP_CONFIG = {
  apiKey: import.meta.env.VITE_AMAP_WEB_KEY || "",
  baseUrl: "/amap/v3",
  timeout: 8000,
  cacheExpire: 1000 * 60 * 60 * 2,
};

// 主流连锁酒店品牌 & 品牌归属
const HOTEL_BRANDS = [
  "汉庭", "全季", "如家", "锦江之星", "7天", "格林豪泰", "亚朵", "维也纳",
  "桔子", "宜必思", "莫泰", "星程", "海友", "IU", "喆啡"
];

export const fetchNearbyHotels = async (
  lon: number,
  lat: number,
  _brands?: string[],
  radius: number = 5000
): Promise<Hotel[]> => {
  const cacheKey = `hotels_fix_${lon.toFixed(4)}_${lat.toFixed(4)}_${Date.now()}`;
  
  console.log("=== 开始搜索附近酒店 ===");
  console.log("坐标:", lon, lat);

  try {
    const [gcjLon, gcjLat] = wgs84ToGcj02(lon, lat);
    
    const response = await fetch(
      `${AMAP_CONFIG.baseUrl}/place/around?key=${AMAP_CONFIG.apiKey}&location=${gcjLon},${gcjLat}&keywords=酒店&radius=${radius}&limit=20`,
      { signal: AbortSignal.timeout(AMAP_CONFIG.timeout) }
    );

    const data = await response.json();
    console.log("高德返回状态:", data.status);
    console.log("原始POI数量:", data.pois?.length || 0);

    if (data.status !== "1" || !data.pois || data.pois.length === 0) {
      console.log("⚠️ API无酒店数据");
      return [];
    }

    // 1. 基础过滤：只保留名称含「酒店」的POI
    let realHotels = data.pois.filter((poi: any) => poi.name.includes("酒店"));

    // 2. 去重：剔除带「大堂」「前台」等附属点位
    realHotels = realHotels.filter((poi: any) => {
      const name = poi.name;
      return !name.includes("大堂") && !name.includes("前台") && !name.includes("接待");
    });

    console.log("过滤后有效酒店数量:", realHotels.length);

    // 3. 数据格式化 + 品牌匹配
    const result = realHotels.slice(0, 5).map((poi: any) => {
      let brand = "其他";
      for (const b of HOTEL_BRANDS) {
        if (poi.name.includes(b)) {
          if (b === "汉庭" || b === "全季" || b === "桔子") brand = "华住会";
          else if (b === "如家") brand = "首旅如家";
          else brand = "锦江集团";
        }
      }

      const distance = parseInt(poi.distance || "500");
      // 分数固定保留 1 位小数，美化展示
      const score = Number((4.2 + Math.random() * 0.6).toFixed(1));
      const price = 180 + Math.floor(Math.random() * 200);

      return {
        id: poi.id,
        name: poi.name,
        score: score,
        price: price,
        address: poi.address || "地址不详",
        phone: poi.tel || "021-xxxxxxx",
        distance: distance,
        brand: brand,
      };
    });

    cacheSet(cacheKey, result, AMAP_CONFIG.cacheExpire);
    console.log("✅ 最终展示酒店:", result);
    return result;

  } catch (error) {
    console.error("❌ 接口请求错误:", error);
    return [];
  }
};

export const fetchHotelDetail = async (_hotelId: string): Promise<Hotel | null> => null;