// 交通模式
export type TransportMode = 'driving';

// 地点分类
export type PlaceCategory = 
  | "museum" 
  | "mall" 
  | "park" 
  | "landmark" 
  | "attraction" 
  | "other"
  | "university"
  | "restaurant";

// 数据来源
export type PlaceSource = "overpass" | "fallback" | "amap";

// 交通线路片段
export interface TransitSegment {
  mode: string;
  line?: string;
  station?: string;
  duration?: number;
}

// 交通方案
export interface TransitPlan {
  duration: number;
  distance: number;
  segments: TransitSegment[];
}

// 出行人群
export type TravelCrowd = "family" | "couple" | "solo" | "friends" | "unknown";
// 出行节奏
export type TravelPace = "normal" | "relaxed" | "intensive";

// 行程约束条件
export interface TravelConstraints {
  days: number;
  budgetCny?: number;
  crowd: TravelCrowd;
  preferIndoor?: boolean;
  pace: TravelPace;
  mustInclude?: string[];
  avoid?: string[];
  foodPreference?: string[];
  avoidFood?: string[];
  mealBudgetCny?: number;
}

// 单日行程
export interface DayPlan {
  day: number;
  title: string;
  places: Place[];
  legs: any[];
  estimatedTicketsCny: number;
  estimatedTransportCny?: number;
  routes?: Record<TransportMode, [number, number][]>;
  transitPlans?: Record<string, TransitPlan>;
}

// 行程规划结果
export interface PlanResult {
  constraints: TravelConstraints;
  days: DayPlan[];
  notes: string[];
}

// 交通颜色配置
export const TRANSPORT_COLORS: Record<TransportMode, string> = {
  driving: '#a303c3'
};

// 景点详情类型
export type ScenicSpot = {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  photoUrls: string[];
  introduction: string;
  score: number;
  price: number;
  openTime: string;
  ticketUrl: string;
  tags: string[];
};

// 酒店类型（整合去重 + 完整字段）
export interface Hotel {
  id: string;
  name: string;
  score: number;
  price: number;
  address: string;
  phone: string;
  distance: number;
  brand: string;
  openHours: string;
  tags: string[];
  reviewCount: number;
}

// 美食商户类型（整合去重 + 新增亮点字段 desc）
export interface FoodMerchant {
  id: string;
  name: string;
  score: number;
  avgPrice: number;
  address: string;
  openHours: string;
  tags: string[];
  distance: number;
  hotDishes: string[];
  reviewCount: number;
  tasteScore?: number;
  environmentScore?: number;
  serviceScore?: number;
  desc: string; // 餐厅亮点介绍（核心新增）
}

// 美食榜单类型
export interface FoodRanking {
  id: string;
  title: string;
  merchants: FoodMerchant[];
  updateTime: string;
}

// 地图点位主类型（完整定义，无重复）
export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lon: number;
  address?: string;
  openingHours?: string;
  openNow: boolean | null;
  ticketCny: number | null;
  source: PlaceSource;
  distance?: number;
  // 美食关联
  nearbyFoods?: FoodMerchant[];
  foodLoading?: boolean;
  // 酒店关联
  nearbyHotels?: Hotel[];
  hotelLoading?: boolean;
}