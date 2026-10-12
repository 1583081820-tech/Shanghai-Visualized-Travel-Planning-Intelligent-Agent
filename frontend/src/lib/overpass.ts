import type { Place } from "./types";

// ====================== 高精度坐标系转换函数 ======================
const PI = 3.1415926535897932384626;
const a = 6378245.0;
const ee = 0.00669342162296594323;

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLon(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

function gcj02ToWgs84(gcjLat: number, gcjLon: number): [number, number] {
  if (gcjLat < 0.8293 || gcjLat > 55.8271 || gcjLon < 72.004 || gcjLon > 137.8347) {
    return [gcjLat, gcjLon];
  }

  let dLat = transformLat(gcjLon - 105.0, gcjLat - 35.0);
  let dLon = transformLon(gcjLon - 105.0, gcjLat - 35.0);
  const radLat = gcjLat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
  dLon = (dLon * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
  const mgLat = gcjLat + dLat;
  const mgLon = gcjLon + dLon;
  return [gcjLat * 2 - mgLat, gcjLon * 2 - mgLon];
}
// ======================================================================

const SH_BBOX = {
  minLat: 30.80,
  minLon: 121.00,
  maxLat: 31.55,
  maxLon: 122.00,
};

function overpassQuery(preferIndoor?: boolean) {
  const bbox = `${SH_BBOX.minLat},${SH_BBOX.minLon},${SH_BBOX.maxLat},${SH_BBOX.maxLon}`;

  const indoorPart = preferIndoor
    ? `(
      nwr["tourism"="museum"](${bbox});
      nwr["shop"="mall"](${bbox});
      nwr["amenity"="theatre"](${bbox});
      nwr["amenity"="cinema"](${bbox});
      nwr["tourism"="aquarium"](${bbox});
      nwr["tourism"="gallery"](${bbox});
      nwr["amenity"="library"](${bbox});
      nwr["amenity"="arts_centre"](${bbox});
      nwr["leisure"="sports_centre"](${bbox});
      nwr["tourism"="tower"](${bbox});
      nwr["tourism"="viewpoint"](${bbox});
    );`
    : `(
      nwr["tourism"="attraction"](${bbox});
      nwr["tourism"="museum"](${bbox});
      nwr["leisure"="park"](${bbox});
      nwr["shop"="mall"](${bbox});
      nwr["historic"="monument"](${bbox});
      nwr["tourism"="viewpoint"](${bbox});
      nwr["tourism"="zoo"](${bbox});
      nwr["tourism"="aquarium"](${bbox});
      nwr["leisure"="garden"](${bbox});
      nwr["amenity"="place_of_worship"](${bbox});
      nwr["historic"="castle"](${bbox});
      nwr["historic"="memorial"](${bbox});
      nwr["tourism"="tower"](${bbox});
      nwr["leisure"="theme_park"](${bbox});
      nwr["tourism"="theme_park"](${bbox});
      nwr["building"="skyscraper"]["tourism"](${bbox});
    );`;

  return `
  [out:json][timeout:60];
  ${indoorPart}
  out center 150;
  `;
}

function mapCategory(tags: Record<string, string> | undefined): Place["category"] {
  if (!tags) return "other";
  if (tags.tourism === "museum") return "museum";
  if (tags.tourism === "attraction") return "attraction";
  if (tags.tourism === "viewpoint") return "attraction";
  if (tags.tourism === "zoo") return "attraction";
  if (tags.tourism === "aquarium") return "attraction";
  if (tags.tourism === "tower") return "landmark";
  if (tags.leisure === "theme_park") return "attraction";
  if (tags.tourism === "theme_park") return "attraction";
  if (tags.leisure === "park") return "park";
  if (tags.leisure === "garden") return "park";
  if (tags.shop === "mall") return "mall";
  if (tags.historic === "monument") return "landmark";
  if (tags.historic === "castle") return "landmark";
  if (tags.historic === "memorial") return "landmark";
  if (tags.amenity === "place_of_worship") return "landmark";
  if (tags.building === "skyscraper" && tags.tourism) return "landmark";
  if (tags.amenity === "university" || tags.tourism === "university") return "university";
  return "other";
}

function normalizeTicket(tags: Record<string, string> | undefined): number | null {
  if (!tags) return null;
  const fee = tags.fee;
  if (fee === "no") return 0;
  const raw = tags["charge"] || tags["ticket:price"] || tags["fee:amount"];
  if (!raw) return null;
  const m = raw.match(/(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  return parseFloat(m[0]);
}

// ✅ 修复：手动添加的点永远覆盖API返回的同名点
function deduplicatePlaces(places: Place[]): Place[] {
  const seen = new Map<string, Place>();
  // 倒序遍历：后面的（手动添加的fallback）会覆盖前面的（API返回的overpass）
  places.reverse().forEach(place => {
    const key = place.name;
    if (!seen.has(key) || seen.get(key)?.source === "overpass") {
      seen.set(key, place);
    }
  });
  // 恢复原来的顺序
  return Array.from(seen.values()).reverse();
}

function smartSortPlaces(places: Place[]): Place[] {
  // 新增985/211大学优先级，确保排在前面
  const priorityKeywords = [
    "东方明珠", "上海中心", "迪士尼", "外滩", "陆家嘴", "豫园",
    "金茂大厦", "环球金融中心", "南京路", "人民广场", "静安寺",
    "世博文化公园", "人民公园", "上海博物馆", "徐家汇", "田子坊",
    "新天地", "武康路", "城隍庙", "和平饭店", "中华艺术宫",
    "温室花园", "武康大楼", "思南公馆", "上海科技馆", "自然博物馆",
    "1933老场坊", "M50创意园", "朱家角古镇", "欢乐谷", "海昌海洋公园",
    "上海动物园",
    // 985/211大学优先级
    "复旦大学", "上海交通大学", "同济大学", "华东师范大学",
    "上海财经大学", "上海外国语大学", "华东理工大学", "东华大学"
  ];

  return places.sort((a, b) => {
    for (let i = 0; i < priorityKeywords.length; i++) {
      const aHas = a.name.includes(priorityKeywords[i]);
      const bHas = b.name.includes(priorityKeywords[i]);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (aHas && bHas) return 0;
    }

    if (a.ticketCny !== null && b.ticketCny === null) return -1;
    if (a.ticketCny === null && b.ticketCny !== null) return 1;

    return a.name.localeCompare(b.name);
  });
}

// 强制包含的核心景点+985/211大学（共48个）
const mandatoryPlaces: Place[] = [
  // 🌟 地标类（橙色）
  {
    id: "fallback/oriental_pearl",
    name: "东方明珠广播电视塔",
    category: "landmark",
    lat: gcj02ToWgs84(31.2397, 121.4997)[0],
    lon: gcj02ToWgs84(31.2397, 121.4997)[1],
    openNow: null,
    ticketCny: 180,
    source: "fallback",
  },
  {
    id: "fallback/shanghai_tower",
    name: "上海中心大厦",
    category: "landmark",
    lat: gcj02ToWgs84(31.2334, 121.5055)[0],
    lon: gcj02ToWgs84(31.2334, 121.5055)[1],
    openNow: null,
    ticketCny: 180,
    source: "fallback",
  },
  {
    id: "fallback/bund",
    name: "外滩",
    category: "landmark",
    lat: gcj02ToWgs84(31.2402, 121.4903)[0],
    lon: gcj02ToWgs84(31.2402, 121.4903)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/lujiazui",
    name: "陆家嘴·世纪大道",
    category: "landmark",
    lat: gcj02ToWgs84(31.2359, 121.5064)[0],
    lon: gcj02ToWgs84(31.2359, 121.5064)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/jinmao",
    name: "金茂大厦",
    category: "landmark",
    lat: gcj02ToWgs84(31.2355, 121.5060)[0],
    lon: gcj02ToWgs84(31.2355, 121.5060)[1],
    openNow: null,
    ticketCny: 120,
    source: "fallback",
  },
  {
    id: "fallback/swfc",
    name: "环球金融中心",
    category: "landmark",
    lat: gcj02ToWgs84(31.2354, 121.5034)[0],
    lon: gcj02ToWgs84(31.2354, 121.5034)[1],
    openNow: null,
    ticketCny: 150,
    source: "fallback",
  },
  {
    id: "fallback/peace_hotel",
    name: "和平饭店",
    category: "landmark",
    lat: gcj02ToWgs84(31.23907, 121.489233)[0],
    lon: gcj02ToWgs84(31.23907, 121.489233)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/jingansi",
    name: "静安寺",
    category: "landmark",
    lat: gcj02ToWgs84(31.22300, 121.4450)[0],
    lon: gcj02ToWgs84(31.22300, 121.4450)[1],
    openNow: null,
    ticketCny: 50,
    source: "fallback",
  },
  {
    id: "fallback/people_square",
    name: "人民广场",
    category: "landmark",
    lat: gcj02ToWgs84(31.2325, 121.4760)[0],
    lon: gcj02ToWgs84(31.2325, 121.4760)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },

  // 🎡 景点类（蓝色）
  {
    id: "fallback/disneyland",
    name: "上海迪士尼乐园",
    category: "attraction",
    lat: gcj02ToWgs84(31.1434, 121.6678)[0],
    lon: gcj02ToWgs84(31.1434, 121.6678)[1],
    openNow: null,
    ticketCny: 435,
    source: "fallback",
  },
  {
    id: "fallback/happy_valley",
    name: "上海欢乐谷",
    category: "attraction",
    lat: gcj02ToWgs84(31.0987, 121.2123)[0],
    lon: gcj02ToWgs84(31.0987, 121.2123)[1],
    openNow: null,
    ticketCny: 260,
    source: "fallback",
  },
  {
    id: "fallback/haichang_ocean_park",
    name: "上海海昌海洋公园",
    category: "attraction",
    lat: gcj02ToWgs84(30.9123, 121.8345)[0],
    lon: gcj02ToWgs84(30.9123, 121.8345)[1],
    openNow: null,
    ticketCny: 399,
    source: "fallback",
  },
  {
    id: "fallback/shanghai_zoo",
    name: "上海动物园",
    category: "attraction",
    lat: gcj02ToWgs84(31.1940, 121.3645)[0],
    lon: gcj02ToWgs84(31.1940, 121.3645)[1],
    openNow: null,
    ticketCny: 40,
    source: "fallback",
  },
  {
    id: "fallback/yuyuan",
    name: "豫园",
    category: "attraction",
    lat: gcj02ToWgs84(31.2271, 121.4923)[0],
    lon: gcj02ToWgs84(31.2271, 121.4923)[1],
    openNow: null,
    ticketCny: 40,
    source: "fallback",
  },
  {
    id: "fallback/chenghuangmiao",
    name: "上海城隍庙",
    category: "attraction",
    lat: gcj02ToWgs84(31.2254, 121.4917)[0],
    lon: gcj02ToWgs84(31.2254, 121.4917)[1],
    openNow: null,
    ticketCny: 10,
    source: "fallback",
  },
  {
    id: "fallback/nanjing_road",
    name: "南京路步行街",
    category: "attraction",
    lat: gcj02ToWgs84(31.2382, 121.4870)[0],
    lon: gcj02ToWgs84(31.2382, 121.4870)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/expo_china_pavilion",
    name: "中华艺术宫(世博园中国馆)",
    category: "attraction",
    lat: gcj02ToWgs84(31.184204, 121.494093)[0],
    lon: gcj02ToWgs84(31.184204, 121.494093)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/expo_greenhouse_garden",
    name: "世博文化公园上海温室花园",
    category: "attraction",
    lat: gcj02ToWgs84(31.1781, 121.4745)[0],
    lon: gcj02ToWgs84(31.1781, 121.4745)[1],
    openNow: null,
    ticketCny: 50,
    source: "fallback",
  },
  {
    id: "fallback/wukang_building",
    name: "武康大楼",
    category: "attraction",
    lat: gcj02ToWgs84(31.2044, 121.4383)[0],
    lon: gcj02ToWgs84(31.2044, 121.4383)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/sinan_mansion",
    name: "思南公馆",
    category: "attraction",
    lat: gcj02ToWgs84(31.214509, 121.468956)[0],
    lon: gcj02ToWgs84(31.214509, 121.468956)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/tianzifang",
    name: "田子坊",
    category: "attraction",
    lat: gcj02ToWgs84(31.2134, 121.4742)[0],
    lon: gcj02ToWgs84(31.2134, 121.4742)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/xintiandi",
    name: "新天地",
    category: "attraction",
    lat: gcj02ToWgs84(31.2198, 121.4753)[0],
    lon: gcj02ToWgs84(31.2198, 121.4753)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/1933_old_factory",
    name: "1933老场坊",
    category: "attraction",
    lat: gcj02ToWgs84(31.2567, 121.4912)[0],
    lon: gcj02ToWgs84(31.2567, 121.4912)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/m50_creative_park",
    name: "M50创意园",
    category: "attraction",
    lat: gcj02ToWgs84(31.2478, 121.4423)[0],
    lon: gcj02ToWgs84(31.2478, 121.4423)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/zhujiajiao",
    name: "朱家角古镇",
    category: "attraction",
    lat: gcj02ToWgs84(31.1123, 121.0567)[0],
    lon: gcj02ToWgs84(31.1123, 121.0567)[1],
    openNow: null,
    ticketCny: 60,
    source: "fallback",
  },

  // 🏛️ 博物馆类（绿色）
  {
    id: "fallback/shmuseum",
    name: "上海博物馆",
    category: "museum",
    lat: gcj02ToWgs84(31.2280, 121.4756)[0],
    lon: gcj02ToWgs84(31.2280, 121.4756)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/shanghai_science_museum",
    name: "上海科技馆",
    category: "museum",
    lat: gcj02ToWgs84(31.2180, 121.5417)[0],
    lon: gcj02ToWgs84(31.2180, 121.5417)[1],
    openNow: null,
    ticketCny: 45,
    source: "fallback",
  },
  {
    id: "fallback/natural_history_museum",
    name: "上海自然博物馆",
    category: "museum",
    lat: gcj02ToWgs84(31.2234, 121.4567)[0],
    lon: gcj02ToWgs84(31.2234, 121.4567)[1],
    openNow: null,
    ticketCny: 30,
    source: "fallback",
  },
  {
    id: "fallback/shanghai_art_museum",
    name: "上海当代艺术博物馆",
    category: "museum",
    lat: gcj02ToWgs84(31.2010, 121.4988)[0],
    lon: gcj02ToWgs84(31.2010, 121.4988)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },

  // 🌳 公园类（深绿色）
  {
    id: "fallback/people_park",
    name: "人民公园",
    category: "park",
    lat: gcj02ToWgs84(31.2325, 121.4725)[0],
    lon: gcj02ToWgs84(31.2325, 121.4725)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/century_park",
    name: "世纪公园",
    category: "park",
    lat: gcj02ToWgs84(31.2160, 121.5500)[0],
    lon: gcj02ToWgs84(31.2160, 121.5500)[1],
    openNow: null,
    ticketCny: 10,
    source: "fallback",
  },
  {
    id: "fallback/gucun_park",
    name: "顾村公园",
    category: "park",
    lat: gcj02ToWgs84(31.3912, 121.4023)[0],
    lon: gcj02ToWgs84(31.3912, 121.4023)[1],
    openNow: null,
    ticketCny: 20,
    source: "fallback",
  },
  {
    id: "fallback/chenshan_botanical_garden",
    name: "辰山植物园",
    category: "park",
    lat: gcj02ToWgs84(31.0456, 121.1789)[0],
    lon: gcj02ToWgs84(31.0456, 121.1789)[1],
    openNow: null,
    ticketCny: 60,
    source: "fallback",
  },

  // 🛍️ 商圈类（粉色）
  {
    id: "fallback/xujiahui",
    name: "徐家汇商圈",
    category: "mall",
    lat: gcj02ToWgs84(31.1954, 121.4367)[0],
    lon: gcj02ToWgs84(31.1954, 121.4367)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/jingan_district",
    name: "静安寺商圈",
    category: "mall",
    lat: gcj02ToWgs84(31.2267, 121.4478)[0],
    lon: gcj02ToWgs84(31.2267, 121.4478)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/huaihai_road",
    name: "淮海路商业街",
    category: "mall",
    lat: gcj02ToWgs84(31.2189, 121.4589)[0],
    lon: gcj02ToWgs84(31.2189, 121.4589)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },

  // 🎓 985/211大学类（建议前端配置为紫色）
  {
    id: "fallback/fudan_university",
    name: "复旦大学(邯郸校区)",
    category: "university",
    lat: gcj02ToWgs84(31.2960, 121.5055)[0],
    lon: gcj02ToWgs84(31.2960, 121.5055)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/sjtu_xuhui",
    name: "上海交通大学(徐汇校区)",
    category: "university",
    lat: gcj02ToWgs84(31.1990, 121.4344)[0],
    lon: gcj02ToWgs84(31.1990, 121.4344)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/tongji_university",
    name: "同济大学(四平路校区)",
    category: "university",
    lat: gcj02ToWgs84(31.2835, 121.5010)[0],
    lon: gcj02ToWgs84(31.2835, 121.5010)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/ecnu_zhongshan",
    name: "华东师范大学(中山北路校区)",
    category: "university",
    lat: gcj02ToWgs84(31.2285, 121.4075)[0],
    lon: gcj02ToWgs84(31.2285, 121.4075)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/sufe_guoding",
    name: "上海财经大学(国定路校区)",
    category: "university",
    lat: gcj02ToWgs84(31.3050, 121.4980)[0],
    lon: gcj02ToWgs84(31.3050, 121.4980)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/sisu_hongkou",
    name: "上海外国语大学(虹口校区)",
    category: "university",
    lat: gcj02ToWgs84(31.2765, 121.4835)[0],
    lon: gcj02ToWgs84(31.2765, 121.4835)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
  {
    id: "fallback/dhu_yanan",
    name: "东华大学(延安西路校区)",
    category: "university",
    lat: gcj02ToWgs84(31.2035, 121.4155)[0],
    lon: gcj02ToWgs84(31.2035, 121.4155)[1],
    openNow: null,
    ticketCny: 0,
    source: "fallback",
  },
];

export async function fetchShanghaiPlaces(preferIndoor?: boolean): Promise<Place[]> {
  const endpoint = "https://overpass-api.de/api/interpreter";
  const body = overpassQuery(preferIndoor);

  let fetchedPlaces: Place[] = [];

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "application/json",
      },
      body: new URLSearchParams({ data: body }),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      const elements = (data?.elements || []) as any[];

      fetchedPlaces = elements
        .map((el) => {
          const tags = el.tags as Record<string, string> | undefined;
          const name = tags?.name || tags?.["name:zh"] || tags?.["name:en"];
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          if (!name || typeof lat !== "number" || typeof lon !== "number") return null;

          const openingHours = tags?.opening_hours;
          const openNow: boolean | null = null;

          const p: Place = {
            id: `${el.type}/${el.id}`,
            name,
            category: mapCategory(tags),
            lat,
            lon,
            address: tags?.["addr:full"],
            openingHours,
            openNow,
            ticketCny: normalizeTicket(tags),
            source: "overpass",
          };
          return p;
        })
        .filter((x): x is Place => Boolean(x));
    }
  } catch (e) {
    console.log("Overpass API请求失败，将使用强制景点+兜底数据");
  }

  let allPlaces = [...mandatoryPlaces, ...fetchedPlaces];
  allPlaces = deduplicatePlaces(allPlaces);
  allPlaces = smartSortPlaces(allPlaces);

  return allPlaces.slice(0, 100); // 增加到100个，容纳新增的大学
}

export function fallbackPlaces(): Place[] {
  return [
    ...mandatoryPlaces,
    {
      id: "fallback/people_square_fallback",
      name: "人民广场",
      category: "landmark",
      lat: gcj02ToWgs84(31.2304, 121.4692)[0],
      lon: gcj02ToWgs84(31.2304, 121.4692)[1],
      openNow: null,
      ticketCny: 0,
      source: "fallback",
    },
  ];
}