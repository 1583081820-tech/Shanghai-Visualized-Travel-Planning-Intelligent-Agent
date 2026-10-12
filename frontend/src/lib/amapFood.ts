import { cacheGet, cacheSet } from "./cache";
import type { FoodMerchant} from "./types";
import { wgs84ToGcj02 } from "./amap";
import { smartChat } from "./api";

const AMAP_CONFIG = {
  apiKey: import.meta.env.VITE_AMAP_WEB_KEY || "",
  baseUrl: "/amap/v3",
  timeout: 8000,
  retryTimes: 2,
  retryDelay: 1000,
  cacheExpire: 1000 * 60 * 30,
};

// 带重试和超时的通用请求函数
const requestWithRetry = async <T>(
  url: string,
  params: Record<string, any>
): Promise<T> => {
  let retryCount = 0;

  while (retryCount <= AMAP_CONFIG.retryTimes) {
    try {
      const fullParams = {
        ...params,
        key: AMAP_CONFIG.apiKey,
        output: "json",
      };

      const queryString = new URLSearchParams(fullParams).toString();
      const fullUrl = `${AMAP_CONFIG.baseUrl}${url}?${queryString}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AMAP_CONFIG.timeout);

      const response = await fetch(fullUrl, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);

      const data = await response.json();
      if (data.status !== "1") throw new Error(`高德API错误: ${data.info}`);

      return data as T;
    } catch (error) {
      retryCount++;
      if (retryCount > AMAP_CONFIG.retryTimes) throw error;
      await new Promise(resolve => setTimeout(resolve, AMAP_CONFIG.retryDelay * retryCount));
    }
  }

  throw new Error("请求超时且重试失败");
};

/**
 * 获取上海综合美食榜单（分页+多关键词，保证100条数据）
 */
export const fetchShanghaiFoodRanking = async (): Promise<FoodMerchant[]> => {
  const cacheKey = "shanghai_food_ranking_all";
  // 测试阶段注释缓存，正式环境打开
  // const cached = cacheGet<FoodMerchant[]>(cacheKey);
  // if (cached) return cached;

  try {
    // ========== 第一组：第一页数据 offset=0 limit=40 ==========
    const page1 = await Promise.all([
      requestWithRetry<any>("/place/text", { keywords: "上海本帮菜", city: "上海", types: "050000", offset: 0, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海网红餐厅", city: "上海", types: "050000", offset: 0, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海特色小吃", city: "上海", types: "050000", offset: 0, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海川菜", city: "上海", types: "050000", offset: 0, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海火锅", city: "上海", types: "050000", offset: 0, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海面馆", city: "上海", types: "050000", offset: 0, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海点心店", city: "上海", types: "050000", offset: 0, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海创意餐厅", city: "上海", types: "050000", offset: 0, limit: 40, sortrule: "weight" }),
      // 新增补充关键词
      requestWithRetry<any>("/place/text", { keywords: "上海傣家菜", city: "上海", types: "050000", offset: 0, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海粤菜", city: "上海", types: "050000", offset: 0, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海快餐", city: "上海", types: "050000", offset: 0, limit: 40, sortrule: "weight" }),
    ]);

    // ========== 第二组：第二页数据 offset=40 limit=40（分页拉取，扩充数据量） ==========
    const page2 = await Promise.all([
      requestWithRetry<any>("/place/text", { keywords: "上海本帮菜", city: "上海", types: "050000", offset: 40, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海网红餐厅", city: "上海", types: "050000", offset: 40, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海特色小吃", city: "上海", types: "050000", offset: 40, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海川菜", city: "上海", types: "050000", offset: 40, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海火锅", city: "上海", types: "050000", offset: 40, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海面馆", city: "上海", types: "050000", offset: 40, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海点心店", city: "上海", types: "050000", offset: 40, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海创意餐厅", city: "上海", types: "050000", offset: 40, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海傣家菜", city: "上海", types: "050000", offset: 40, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海粤菜", city: "上海", types: "050000", offset: 40, limit: 40, sortrule: "weight" }),
      requestWithRetry<any>("/place/text", { keywords: "上海快餐", city: "上海", types: "050000", offset: 40, limit: 40, sortrule: "weight" }),
    ]);

    // 合并所有分页数据
    let allMerchants: FoodMerchant[] = [];
    const addMerchants = (dataList: any[]) => {
      dataList.forEach(data => {
        if (data.pois) allMerchants.push(...data.pois.map(mapAmapPoiToMerchant));
      });
    };
    addMerchants(page1);
    addMerchants(page2);

    // 1. 去重（根据ID）
    const uniqueMap = new Map<string, FoodMerchant>();
    allMerchants.forEach(mer => uniqueMap.set(mer.id, mer));
    allMerchants = Array.from(uniqueMap.values());

    // 2. 过滤异常数据（剔除明显非餐饮的POI）
    allMerchants = allMerchants.filter(mer => {
      const tagStr = mer.tags.join("");
      return !tagStr.includes("住宅区") && !tagStr.includes("大厦") && !tagStr.includes("酒店住宿");
    });

    // 3. 按评分降序排序
    allMerchants.sort((a, b) => b.score - a.score);

    // 4. 限制最终只返回前 100 条
    const result = generateFoodDesc(allMerchants).slice(0, 100);

    // 补充热门菜品
    try { await supplementHotDishes(result); }
    catch (e) { applyDefaultHotDishes(result); }

    cacheSet(cacheKey, result, AMAP_CONFIG.cacheExpire);
    return result;
  } catch (error) {
    console.error("获取美食榜单失败，使用降级数据:", error);
    return getFallbackFoodList();
  }
};

/**
 * 根据经纬度获取附近美食（景点周边）
 */
export const fetchNearbyFood = async (
  lon: number,
  lat: number,
  foodPreference?: string[],
  radius: number = 2000,
  limit: number = 5
): Promise<FoodMerchant[]> => {
  const cacheKey = `nearby_food_${lon.toFixed(6)}_${lat.toFixed(6)}_${foodPreference?.join(",") || "all"}`;
  const cached = cacheGet<FoodMerchant[]>(cacheKey);
  if (cached) return cached;

  try {
    const [gcjLon, gcjLat] = wgs84ToGcj02(lon, lat);

    const keywords = foodPreference?.join("|") || "餐厅";
    const data = await requestWithRetry<any>("/place/around", {
      location: `${gcjLon},${gcjLat}`,
      keywords: keywords,
      types: "050000",
      radius: radius.toString(),
      offset: 0,
      limit: limit.toString(),
      sortrule: "distance",
    });

    const result = data.pois?.map(mapAmapPoiToMerchant) || [];
    generateFoodDesc(result);
    try { await supplementHotDishes(result); }
    catch (e) { applyDefaultHotDishes(result); }

    cacheSet(cacheKey, result, AMAP_CONFIG.cacheExpire);
    return result;
  } catch (error) {
    console.error(`获取附近美食失败，使用降级数据:`, error);
    return getFallbackNearbyFood(lon, lat);
  }
};

/**
 * 获取商户详情
 */
export const fetchFoodMerchantDetail = async (merchantId: string): Promise<FoodMerchant | null> => {
  try {
    const data = await requestWithRetry<any>("/place/detail", { id: merchantId });
    if (data.pois?.[0]) {
      const merchant = mapAmapPoiToMerchant(data.pois[0]);
      generateFoodDesc([merchant]);
      try { await supplementHotDishes([merchant]); }
      catch (e) { applyDefaultHotDishes([merchant]); }
      return merchant;
    }
    return null;
  } catch (error) {
    console.error(`获取商户详情失败:`, error);
    return null;
  }
};

// ------------------------------ 工具函数 ------------------------------
/**
 * 高德POI → 实体转换
 */
const mapAmapPoiToMerchant = (poi: any): FoodMerchant => {
  const extraInfo = poi.biz_ext || {};
  return {
    id: poi.id,
    name: poi.name,
    score: parseFloat(extraInfo.rating || "4.0"),
    avgPrice: parseInt(extraInfo.cost || "50"),
    address: poi.address || "地址不详",
    openHours: extraInfo.opentime || "10:00-22:00",
    tags: poi.type?.split(";") || ["餐饮"],
    distance: parseInt(poi.distance || "0"),
    hotDishes: [],
    reviewCount: parseInt(extraInfo.review_count || "0"),
    tasteScore: undefined,
    environmentScore: undefined,
    serviceScore: undefined,
    desc: "",
  };
};

/**
 * ========== 重构：智能差异化文案生成（解决文案重复核心） ==========
 * 规则：品类 + 人均价格 + 评分 + 店名 多维度组合生成文案
 */
const generateFoodDesc = (merchants: FoodMerchant[]): FoodMerchant[] => {
  return merchants.map(mer => {
    const tagStr = mer.tags.join("");
    const name = mer.name;
    const price = mer.avgPrice;
    const score = mer.score;

    let desc = "";
    const isHighScore = score >= 4.8;
    const isCheap = price < 50;     // 平价
    const isExpensive = price > 150; // 高端

    // 1. 按店铺品类优先级判断
    if (name.includes("火锅") || tagStr.includes("火锅")) {
      desc = isHighScore
        ? "高分人气火锅店，锅底口味地道，菜品新鲜丰富"
        : "人气火锅门店，食材选择多样，适合朋友聚餐";
    } else if (name.includes("川菜") || name.includes("烤鱼") || tagStr.includes("川菜")) {
      desc = isHighScore
        ? "高分川味菜馆，麻辣鲜香正宗，爱吃辣的食客首选"
        : "地道川味美食，口味浓郁，性价比不错";
    } else if (name.includes("傣家菜")) {
      desc = "特色傣味菜系，风味独特，体验异域美食风情";
    } else if (name.includes("面") || tagStr.includes("面馆")) {
      desc = isCheap
        ? "平价特色面馆，汤底醇厚，周边居民常光顾"
        : "招牌特色面食，手工制作，口味独具一格";
    } else if (name.includes("小笼") || name.includes("点心") || name.includes("包子") || tagStr.includes("糕饼店")) {
      desc = isHighScore
        ? "上海老牌点心店，传统手工制作，本地人气口碑店"
        : "经典中式点心，皮薄馅足，老少皆宜";
    } else if (name.includes("粤菜") || name.includes("顺德菜")) {
      desc = "正宗粤式风味，清淡鲜美，讲究食材本味";
    } else if (name.includes("网红") || tagStr.includes("网红")) {
      desc = "热门网红打卡餐厅，环境精致，菜品颜值出众";
    } else if (name.includes("大排档") || name.includes("江湖菜")) {
      desc = "市井大排档风味，烟火气十足，聚餐氛围轻松";
    } else if (name.includes("创意") || name.includes("仓库")) {
      desc = "创意融合菜系，菜品新颖，装修风格独具特色";
    } else if (tagStr.includes("本帮菜") || tagStr.includes("中餐厅")) {
      if (name.includes("老店") || name.includes("总店") || name.includes("酒家")) {
        desc = "上海老牌本帮菜馆，传承老味道，本地食客认可度极高";
      } else if (name.includes("家宴")) {
        desc = "主打亲友家宴，菜品地道，环境温馨舒适";
      } else if (isExpensive) {
        desc = "高端本帮私房菜，用料考究，适合商务宴请";
      } else {
        desc = "经典沪上风味，菜品口味正宗，日常用餐好选择";
      }
    } else if (tagStr.includes("快餐厅") || name.includes("凉皮") || name.includes("三明治")) {
      desc = "便捷快餐门店，出餐速度快，适合简餐充饥";
    } else {
      // 通用兜底文案（区分价格+评分）
      if (isHighScore) {
        desc = "高分人气餐饮门店，综合体验优秀，食客好评较多";
      } else if (isCheap) {
        desc = "平价亲民餐饮店，性价比高，日常就餐十分合适";
      } else if (isExpensive) {
        desc = "高端餐饮门店，环境雅致，适合休闲小聚";
      } else {
        desc = "综合评分不错的餐饮门店，口味稳定，值得一试";
      }
    }

    return { ...mer, desc };
  });
};

/**
 * AI 补充热门菜品
 */
const supplementHotDishes = async (merchants: FoodMerchant[]): Promise<void> => {
  if (merchants.length === 0) return;

  try {
    const merchantNames = merchants.map(m => m.name).join("、");
    const response = await smartChat({
      query: `请为以下上海餐厅各推荐3个最热门的招牌菜，只返回纯JSON，格式为{"餐厅名":["菜1","菜2","菜3"]}。餐厅列表：${merchantNames}`,
      city: '上海',
      mode: 'fast',
    });
    const jsonText = response.answer.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) throw new Error("后端未返回可解析的JSON");
    const hotDishesMap = JSON.parse(jsonText);

    merchants.forEach(mer => {
      if (hotDishesMap[mer.name] && Array.isArray(hotDishesMap[mer.name])) {
        mer.hotDishes = hotDishesMap[mer.name].slice(0, 3);
      }
    });
  } catch (error) {
    console.error("补充热门菜品失败:", error);
    applyDefaultHotDishes(merchants);
  }
};

/**
 * 默认热门菜品（AI失败兜底）
 */
const applyDefaultHotDishes = (merchants: FoodMerchant[]): void => {
  merchants.forEach(mer => {
    const name = mer.name;
    if (name.includes("本帮菜") || name.includes("酒家")) {
      mer.hotDishes = ["红烧肉", "油爆虾", "响油鳝糊"];
    } else if (name.includes("火锅")) {
      mer.hotDishes = ["特色锅底", "鲜切牛肉", "手打丸子"];
    } else if (name.includes("面")) {
      mer.hotDishes = ["招牌汤面", "特色浇头", "小菜"];
    } else if (name.includes("小笼") || name.includes("点心")) {
      mer.hotDishes = ["鲜肉小笼", "特色点心", "甜粥"];
    } else if (name.includes("川菜")) {
      mer.hotDishes = ["麻辣烤鱼", "水煮肉片", "川味凉菜"];
    } else {
      mer.hotDishes = ["招牌特色菜", "人气单品", "时令小菜"];
    }
  });
};

// ------------------------------ 降级模拟数据（100条，本地测试用） ------------------------------
const getFallbackFoodList = (): FoodMerchant[] => {
  const baseList: FoodMerchant[] = [
    { id: "m1", name: "老上海弄堂菜", score: 4.8, avgPrice: 88, address: "黄浦区南京东路123号", openHours: "10:00-22:00", tags: ["本帮菜", "老字号"], distance: 0, hotDishes: ["红烧肉", "油爆虾", "响油鳝糊"], reviewCount: 12560, tasteScore: 4.8, environmentScore: 4.7, serviceScore: 4.6, desc: "上海老牌本帮菜馆，传承老味道，本地食客认可度极高" },
    { id: "m2", name: "外滩壹号本帮馆", score: 4.7, avgPrice: 158, address: "黄浦区中山东一路18号", openHours: "11:00-21:30", tags: ["本帮菜", "景观位"], distance: 0, hotDishes: ["松鼠桂鱼", "腌笃鲜", "草头圈子"], reviewCount: 8920, desc: "主打亲友家宴，菜品地道，环境温馨舒适" },
    { id: "m3", name: "南翔小笼馒头店", score: 4.6, avgPrice: 45, address: "黄浦区豫园路85号", openHours: "08:00-20:00", tags: ["小吃", "老字号"], distance: 0, hotDishes: ["蟹粉小笼", "鲜肉小笼", "灌汤包"], reviewCount: 25680, desc: "经典中式点心，皮薄馅足，老少皆宜" },
    { id: "m4", name: "武康大楼咖啡馆", score: 4.5, avgPrice: 68, address: "徐汇区武康路113号", openHours: "09:00-21:00", tags: ["咖啡", "网红打卡"], distance: 0, hotDishes: ["拿铁", "提拉米苏", "巴斯克蛋糕"], reviewCount: 7890, desc: "热门网红打卡餐厅，环境精致，菜品颜值出众" },
  ];
  // 循环生成模拟数据，凑足100条
  for (let i = 5; i <= 100; i++) {
    const template = baseList[i % baseList.length];
    baseList.push({
      ...template,
      id: `mock_${i}`,
      name: `${template.name} ${i}号分店`,
    });
  }
  return baseList;
};

const getFallbackNearbyFood = (lon: number, lat: number): FoodMerchant[] => [
  { id: `fallback_${lon}_${lat}_1`, name: "本地特色小吃店", score: 4.3, avgPrice: 45, address: `景点附近${Math.floor(Math.random() * 500) + 100}米`, openHours: "09:00-20:00", tags: ["特色小吃"], distance: Math.floor(Math.random() * 1500) + 200, hotDishes: ["小笼包", "生煎包"], reviewCount: 320, desc: "平价特色面馆，汤底醇厚，周边居民常光顾" },
  { id: `fallback_${lon}_${lat}_2`, name: "上海家常菜馆", score: 4.2, avgPrice: 75, address: `景点附近${Math.floor(Math.random() * 800) + 300}米`, openHours: "10:30-21:30", tags: ["家常菜"], distance: Math.floor(Math.random() * 1800) + 300, hotDishes: ["红烧大排"], reviewCount: 210, desc: "经典沪上风味，菜品口味正宗，日常用餐好选择" },
];
