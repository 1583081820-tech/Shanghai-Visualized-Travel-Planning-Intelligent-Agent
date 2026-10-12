import type { FC } from "react";
import { useEffect, useMemo, useRef, useState, useCallback, Component, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Map3D from "./Map3D";
import { cacheSet } from "../lib/cache";
import { fallbackPlaces, fetchShanghaiPlaces } from "../lib/overpass";
import { buildRealRoute, type RouteResult } from "../lib/route";
import type {
  Place,
  PlanResult,
  FoodMerchant,
  DayPlan,
} from "../lib/types";
import type { OnboardingData } from "./OnboardingPage";
import { generateTravelPlan, parsePlanResultFromStream, savePlanToBackend } from "../lib/pathPlanning";
import { fetchNearbyFood } from "../lib/amapFood";
import { fetchNearbyHotels } from "../lib/amapHotel";
import { cn } from "../lib/utils";
import { Check, X, Code2 } from "lucide-react";
import PixelCard from "./PixelCard";

/* ========== 类型 ========== */
type ChatRole = "user" | "agent";
type ChatMsg = { role: ChatRole; content: string };
type SidebarState = "idle" | "chatting" | "planned" | "editing";

const sidebarStateConfig: Record<SidebarState, number> = {
  idle: 55,
  chatting: 75,
  planned: 30,
  editing: 25,
};

const createChatMsg = (role: ChatRole, content: string): ChatMsg => ({ role, content });

type Props = {
  dark: boolean;
  tripDays?: number;
  onboardingData?: OnboardingData | null;
  onPlanGenerated?: (plan: PlanResult) => void;
  onPlanUpdated?: (plan: PlanResult, confirmedDays: Set<number>, manualPlaces?: Record<number, Place[]>) => void;
  onManualPlacesChange?: (places: Record<number, Place[]>) => void;
  confirmedDays?: Set<number>;
  manualAddedPlaces?: Record<number, Place[]>;
  onGoToPrep?: () => void;
  onBackToOnboarding?: () => void;
};

type PlaceWithDetail = Place & {
  nearbyFoods?: FoodMerchant[];
  nearbyHotels?: any[];
  foodLoading?: boolean;
  hotelLoading?: boolean;
};

/* ========== 错误边界 ========== */
class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: any) { console.error("Map组件出错：", error, errorInfo); }
  resetError = () => this.setState({ hasError: false, error: null });
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl ring-1 ring-white/10">
          <div className="text-4xl mb-3">😱</div>
          <div className="text-base font-serif text-amber-100/80">地图加载失败</div>
          <div className="text-xs text-red-400/70 mt-1">{this.state.error?.message}</div>
          <div className="flex gap-3 mt-4">
            <button onClick={this.resetError} className="px-4 py-1.5 bg-amber-500/20 text-amber-200 text-xs rounded-xl hover:bg-amber-500/30 ring-1 ring-amber-500/30 transition-all duration-300">恢复地图</button>
            <button onClick={() => window.location.reload()} className="px-4 py-1.5 bg-white/5 text-gray-300 text-xs rounded-xl hover:bg-white/10 ring-1 ring-white/10 transition-all duration-300">刷新页面</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ========== 全局缓存 ========== */
const globalCache = {
  places: [] as Place[],
  plan: null as PlanResult | null,
  chat: [] as ChatMsg[],
  loaded: false,
  route: null as RouteResult | null,
  confirmedDays: null as Set<number> | null,
  manualAddedPlaces: null as Record<number, Place[]> | null,
  selectedDay: 1 as number,
};

export function clearGlobalCache() {
  globalCache.places = [];
  globalCache.plan = null;
  globalCache.chat = [];
  globalCache.loaded = false;
  globalCache.route = null;
  globalCache.confirmedDays = null;
  globalCache.manualAddedPlaces = null;
  globalCache.selectedDay = 1;
  try { localStorage.removeItem('sh_places_all'); } catch (e) {}
}

/* ========== 主组件 ========== */
const MapPlanPage: FC<Props> = ({ dark, tripDays = 3, onboardingData = null, onPlanGenerated, onPlanUpdated, onManualPlacesChange, confirmedDays: confirmedDaysProp, manualAddedPlaces: manualAddedPlacesProp, onGoToPrep, onBackToOnboarding }) => {
  const defaultInput = useMemo(() => {
    if (!onboardingData) return `${tripDays}天上海游，探索城市风光与地道美食`;
    const groupMap: Record<string, string> = { solo: "单人", couple: "情侣", family: "亲子家庭", friends: "朋友结伴", elderly: "带老人", business: "商务" };
    const styleMap: Record<string, string> = { popular: "热门打卡", relaxed: "休闲慢游", culture: "深度人文", photo: "网红出片", ancient: "江南古镇", tech: "科技科普", skyscraper: "城市天际线", disney: "迪士尼", nature: "自然风光", museum: "历史博物" };
    const budgetMap: Record<string, string> = { economy: "经济型预算", comfort: "舒适型预算", quality: "品质型预算", luxury: "尊享型预算" };
    const group = groupMap[onboardingData.travel_group] || "";
    const styles = onboardingData.travel_style.map(s => styleMap[s]).filter(Boolean).slice(0, 3).join("、");
    const budget = budgetMap[onboardingData.total_budget] || "";
    return [`${onboardingData.travel_days}天上海${group}游`, styles ? `偏好${styles}` : "", budget].filter(Boolean).join("，");
  }, [onboardingData, tripDays]);

  const welcomeMessage = useMemo(() => {
    const hasOnboarding = !!onboardingData;
    let msg = `你好，我是上海3D可视化出行规划智能体，由RAG与工具调用智能体共同驱动。\n\n`;
    msg += `我可以为你定制上海旅行方案，具备以下能力：\n• 检索本地文旅知识，辅助生成有依据的回答\n• 按需求规划每日行程与游览顺序\n• 调用天气、地点搜索、路线与计算工具\n• 在交互式3D地图上动态展示景点和路线\n\n`;
    if (hasOnboarding) {
      msg += `根据你的出行偏好，我已经为你整理了初始需求：\n「${defaultInput}」\n\n你可以直接点击「生成行程」确认，也可以继续补充你的想法。\n\n`;
    } else {
      msg += `你可以直接用自然语言告诉我你的需求，比如：\n• "${tripDays}天上海情侣游，预算5000元，偏好本帮菜"\n• "增加迪士尼乐园，安排在第二天"\n• "把豫园换成田子坊"（自动重算行程与地图路线）\n\n`;
    }
    msg += `告诉我你的想法，开始规划你的上海之旅吧 ✨`;
    return msg;
  }, [onboardingData, defaultInput, tripDays]);

  const [input, setInput] = useState(defaultInput);
  const [chat, setChat] = useState<ChatMsg[]>(globalCache.chat.length > 0 ? globalCache.chat : [createChatMsg("agent", welcomeMessage)]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [placesLoaded, setPlacesLoaded] = useState(globalCache.loaded);
  const [allPlaces, setAllPlaces] = useState<Place[]>(globalCache.places);
  const [plan, setPlan] = useState<PlanResult | null>(globalCache.plan);
  const [selectedDay, setSelectedDay] = useState<number>(globalCache.selectedDay || 1);
  const [confirmedDays, setConfirmedDays] = useState<Set<number>>(confirmedDaysProp || globalCache.confirmedDays || new Set());
  const [confirmingDay, setConfirmingDay] = useState<number | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [manualAddedPlaces, setManualAddedPlaces] = useState<Record<number, Place[]>>(manualAddedPlacesProp || globalCache.manualAddedPlaces || {});
  const [customDayOrder, setCustomDayOrder] = useState<Record<number, string[]>>({});
  const [removedAiPlaces, setRemovedAiPlaces] = useState<Record<number, Set<string>>>({});
  const [draggedPlaceId, setDraggedPlaceId] = useState<string | null>(null);

  const [sidebarState, setSidebarState] = useState<SidebarState>("idle");
  const [inputFocused, setInputFocused] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "info" | "warning" | "error" | "success" } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [showMapAllPlaces, setShowMapAllPlaces] = useState(true);
  const [showPlanAllDays, setShowPlanAllDays] = useState(false);
  const [animate] = useState(false);
  const [aiModel] = useState<'lite' | 'pro'>('lite');
  const [planMode, setPlanMode] = useState<'fast' | 'agent'>('fast');
  const [showTechStack, setShowTechStack] = useState(false);
  const [satellite] = useState(false);

  const [route, setRoute] = useState<RouteResult>(globalCache.route ?? { coordinates: [], distance: 0, duration: 0 });
  const [showRoute, setShowRoute] = useState(true);
  const [currentThinking, setCurrentThinking] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [foodPreference, setFoodPreference] = useState<string[]>([]);
  const [hotelBrands, setHotelBrands] = useState<string[]>(["华住会", "如家", "锦江", "汉庭", "全季", "桔子", "7天", "格林豪泰"]);

  const [scaleDistance, setScaleDistance] = useState<string>("1 km");
  const [savedPlanId, setSavedPlanId] = useState<number | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);

  const lastUserInputRef = useRef<string>("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mapKeyRef = useRef<number>(0);

  // 辅助：获取景点在 activeDayPlaces 中实际使用的 id（与删除时存储的 id 一致）
  const resolvePlaceId = useCallback((placeItem: Place) => {
    let matched = allPlaces.find(ap => ap.name === placeItem.name);
    if (matched) return matched.id;

    const normalize = (s: string) => s.replace(/[\s\(\)（）\[\]【】]/g, '').toLowerCase();
    matched = allPlaces.find(ap => normalize(ap.name) === normalize(placeItem.name));
    if (matched) return matched.id;

    matched = allPlaces.find(ap => ap.name.includes(placeItem.name) || placeItem.name.includes(ap.name));
    if (matched) return matched.id;

    if (placeItem.lon && placeItem.lat) {
      return `ai_${placeItem.name}_${placeItem.lon}_${placeItem.lat}`;
    }
    return `ai_${placeItem.name}_placeholder`;
  }, [allPlaces]);

  const showToast = useCallback((message: string, type: "info" | "warning" | "error" | "success" = "info") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const handleSavePlan = useCallback(async () => {
    if (isSavingPlan || planSaved) return;
    const hasPlanData = plan !== null;
    const hasManualData = Object.values(manualAddedPlaces).some(places => places.length > 0);
    if (!hasPlanData && !hasManualData) return;
    setIsSavingPlan(true);
    try {
      let planToSave: PlanResult;
      let title: string;
      let crowd: string | undefined;
      let budget: string | undefined;
      if (plan) {
        planToSave = plan;
        title = `上海${plan.constraints?.days || tripDays}日游行程`;
        crowd = plan.constraints?.crowd;
        budget = plan.constraints?.budgetCny ? `${plan.constraints.budgetCny}元` : undefined;
      } else {
        const daysWithPlaces = Object.entries(manualAddedPlaces).filter(([_, places]) => places.length > 0).sort(([a], [b]) => Number(a) - Number(b));
        const dayPlans: DayPlan[] = daysWithPlaces.map(([dayNum, places]) => ({
          day: Number(dayNum),
          title: `第${dayNum}天`,
          places: places,
          legs: [],
          estimatedTicketsCny: 0,
        }));
        planToSave = { constraints: { days: dayPlans.length || tripDays, crowd: 'unknown', pace: 'normal' }, days: dayPlans, notes: ['手动添加的行程'] };
        title = `上海${dayPlans.length || tripDays}日游行程（手动规划）`;
      }
      const result = await savePlanToBackend(planToSave, title, '上海', crowd, budget);
      setSavedPlanId(result.id);
      setPlanSaved(true);
      showToast(`✅ 行程已保存到数据库（ID: ${result.id}）`, 'success');
    } catch (err: any) {
      showToast(`保存失败: ${err.message || '未知错误'}`, 'error');
    } finally { setIsSavingPlan(false); }
  }, [plan, manualAddedPlaces, isSavingPlan, planSaved, tripDays, showToast]);

  const emptyPlan = useMemo<PlanResult>(() => ({
    constraints: { days: tripDays, crowd: "unknown", pace: "normal" },
    days: Array.from({ length: tripDays }, (_, i) => ({ day: i + 1, title: `第${i + 1}天`, places: [], legs: [], estimatedTicketsCny: 0 })),
    notes: [],
  }), [tripDays]);

  const currentPlan = useMemo(() => plan ?? emptyPlan, [plan, emptyPlan]);
  const allDaysConfirmed = useMemo(() => currentPlan?.days?.every(d => confirmedDays.has(d.day)) ?? false, [currentPlan, confirmedDays]);

  const activeDayPlaces = useMemo(() => {
    const activeDay = currentPlan.days.find(d => d.day === selectedDay) ?? currentPlan.days[0];
    const removedSet = removedAiPlaces[selectedDay] || new Set();
    const aiPlaces = (activeDay?.places ?? [])
      .map(p => {
        let matched = allPlaces.find(ap => ap.name === p.name);
        if (matched) return matched;
        const normalize = (s: string) => s.replace(/[\s\(\)（）\[\]【】]/g, '').toLowerCase();
        matched = allPlaces.find(ap => normalize(ap.name) === normalize(p.name));
        if (matched) return matched;
        matched = allPlaces.find(ap => ap.name.includes(p.name) || p.name.includes(ap.name));
        if (matched) return matched;
        if (p.lon && p.lat) {
          return { ...p, id: `ai_${p.name}_${p.lon}_${p.lat}`, category: p.category || "attraction", openNow: null, source: "fallback" } as Place;
        }
        return { ...p, id: `ai_${p.name}_placeholder`, category: p.category || "attraction", lon: 121.4737, lat: 31.2304, openNow: null, source: "fallback", ticketCny: p.ticketCny } as Place;
      })
      .filter(Boolean)
      .filter(p => !removedSet.has(p!.id)) as Place[];

    const manualPlaces = manualAddedPlaces[selectedDay] || [];
    const allIds = new Set<string>();
    const result: Place[] = [];
    [...aiPlaces, ...manualPlaces].forEach(p => { if (!allIds.has(p.id)) { allIds.add(p.id); result.push(p); } });
    const dayOrder = customDayOrder[selectedDay];
    if (dayOrder?.length) {
      result.sort((a, b) => { const ia = dayOrder.indexOf(a.id), ib = dayOrder.indexOf(b.id); return ia === -1 ? (ib === -1 ? 0 : 1) : ib === -1 ? -1 : ia - ib; });
    }
    return result;
  }, [currentPlan, selectedDay, allPlaces, manualAddedPlaces, customDayOrder, removedAiPlaces]);

  const displayPlaces = useMemo(() => {
    if (showMapAllPlaces) return allPlaces;
    if (showPlanAllDays && currentPlan?.days) {
      const allPlanPlaceIds = new Set<string>();
      const allPlanPlaces: Place[] = [];
      currentPlan.days.forEach(day => {
        (day.places || []).forEach(p => {
          let matched = allPlaces.find(ap => ap.name === p.name);
          if (!matched) {
            const normalize = (s: string) => s.replace(/[\s\(\)（）\[\]【】]/g, '').toLowerCase();
            matched = allPlaces.find(ap => normalize(ap.name) === normalize(p.name));
          }
          if (!matched) matched = allPlaces.find(ap => ap.name.includes(p.name) || p.name.includes(ap.name));
          if (matched && !allPlanPlaceIds.has(matched.id)) {
            allPlanPlaceIds.add(matched.id);
            allPlanPlaces.push(matched);
          } else if (!matched && p.lon && p.lat) {
            const aiPlace = { ...p, id: `ai_${p.name}_${p.lon}_${p.lat}`, category: p.category || "attraction", openNow: null, source: "fallback" } as Place;
            if (!allPlanPlaceIds.has(aiPlace.id)) { allPlanPlaceIds.add(aiPlace.id); allPlanPlaces.push(aiPlace); }
          }
        });
        (manualAddedPlaces[day.day] || []).forEach(p => { if (!allPlanPlaceIds.has(p.id)) { allPlanPlaceIds.add(p.id); allPlanPlaces.push(p); } });
      });
      return allPlanPlaces;
    }
    return activeDayPlaces;
  }, [allPlaces, showMapAllPlaces, showPlanAllDays, currentPlan, activeDayPlaces, manualAddedPlaces]);

  useEffect(() => {
    if (loading || isTyping) setSidebarState("chatting");
    else if (inputFocused) setSidebarState("chatting");
    else if (draggedPlaceId) setSidebarState("editing");
    else if (plan && activeDayPlaces.length > 0) setSidebarState("planned");
    else setSidebarState("idle");
  }, [loading, isTyping, inputFocused, draggedPlaceId, plan, activeDayPlaces.length]);

  const calculateScale = (zoom: number, lat: number): string => {
    const EARTH_RADIUS = 6378137, TILE_SIZE = 256, SCALE_BAR_PX = 140;
    const metersPerPixel = (Math.cos(lat * Math.PI / 180) * 2 * Math.PI * EARTH_RADIUS) / (TILE_SIZE * Math.pow(2, zoom));
    const totalMeters = metersPerPixel * SCALE_BAR_PX;
    return totalMeters >= 1000 ? `${(totalMeters / 1000).toFixed(1)} km` : `${Math.round(totalMeters)} m`;
  };

  const handleZoomChange = (zoom: number, center: [number, number]) => {
    setScaleDistance(calculateScale(zoom, center[1]));
  };

  useEffect(() => {
    if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [chat, currentThinking, isTyping]);

  useEffect(() => {
    if (activeDayPlaces.length < 2) { setRoute({ coordinates: [], distance: 0, duration: 0 }); return; }
    const validPlaces = activeDayPlaces.filter(p => typeof p.lon === 'number' && typeof p.lat === 'number' && !isNaN(p.lon) && !isNaN(p.lat));
    if (validPlaces.length < 2) { setRoute({ coordinates: [], distance: 0, duration: 0 }); return; }
    const timer = setTimeout(() => {
      buildRealRoute(validPlaces).then(routeData => { setRoute(routeData); globalCache.route = routeData; }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [activeDayPlaces, selectedDay]);

  const handleMapMarkerClick = useCallback((placeId: string | null) => {
    if (placeId === null) { setSelectedPlaceId(null); return; }
    if (selectedPlaceId === placeId) setSelectedPlaceId(null);
    else setSelectedPlaceId(placeId);
  }, [selectedPlaceId]);

  useEffect(() => {
    if (activeDayPlaces.length === 0) setSelectedPlaceId(null);
    else setSelectedPlaceId(prev => prev && activeDayPlaces.some(p => p.id === prev) ? prev : null);
  }, [activeDayPlaces]);

  // 加载景点
  useEffect(() => {
    const cachedStr = localStorage.getItem('sh_places_all');
    let restored = false;
    if (cachedStr) {
      try {
        const cached = JSON.parse(cachedStr);
        if (Array.isArray(cached) && cached.length > 50) {
          setAllPlaces(cached);
          globalCache.places = cached;
          globalCache.loaded = true;
          setPlacesLoaded(true);
          restored = true;
        }
      } catch {}
    }

    if (restored) return;

    if (globalCache.places.length > 0) {
      setAllPlaces(globalCache.places);
      setPlacesLoaded(true);
      return;
    }

    let cancelled = false;
    async function loadPlaces() {
      let finalPlaces: Place[] = [];
      try {
        const fetched = await fetchShanghaiPlaces(undefined);
        if (cancelled) return;
        cacheSet(`sh_places_all`, fetched, 1000 * 60 * 12);
        finalPlaces = fetched.filter(p => p.category !== "other").slice(0, 150);
      } catch (e) {
        console.warn('获取景点失败，使用本地缓存或 fallback');
        const local = localStorage.getItem('sh_places_all');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) finalPlaces = parsed;
          } catch {}
        }
        if (finalPlaces.length === 0) {
          const fallback = fallbackPlaces();
          finalPlaces = fallback.map((p, idx) => ({ ...p, id: `fallback_${idx}_${p.name.replace(/\s/g, '_')}` }));
        }
      }

      if (!cancelled && finalPlaces.length > 0) {
        setAllPlaces(finalPlaces);
        globalCache.places = finalPlaces;
        globalCache.loaded = true;
        setPlacesLoaded(true);
      }
    }
    loadPlaces();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { globalCache.confirmedDays = confirmedDays; }, [confirmedDays]);
  useEffect(() => { globalCache.manualAddedPlaces = manualAddedPlaces; }, [manualAddedPlaces]);
  useEffect(() => { globalCache.selectedDay = selectedDay; }, [selectedDay]);

  useEffect(() => {
    if (!selectedPlaceId) return;
    const selectedPlace = allPlaces.find(p => p.id === selectedPlaceId) as PlaceWithDetail | undefined;
    if (!selectedPlace) return;
    const updatePlaceState = (updates: Partial<PlaceWithDetail>) => {
      setAllPlaces(prev => prev.map(p => p.id === selectedPlaceId ? { ...p, ...updates } as Place : p));
      if (plan) {
        setPlan(prev => prev ? { ...prev, days: prev.days.map(day => ({ ...day, places: day.places.map(p => p.id === selectedPlaceId ? { ...p, ...updates } as Place : p) })) } : prev);
      }
    };
    if (!selectedPlace.nearbyFoods && !selectedPlace.foodLoading) {
      updatePlaceState({ foodLoading: true });
      fetchNearbyFood(selectedPlace.lon, selectedPlace.lat, foodPreference, 2000, 5)
        .then(foods => updatePlaceState({ nearbyFoods: foods, foodLoading: false }))
        .catch(() => updatePlaceState({ foodLoading: false }));
    }
    if (!selectedPlace.nearbyHotels && !selectedPlace.hotelLoading) {
      updatePlaceState({ hotelLoading: true });
      fetchNearbyHotels(selectedPlace.lon, selectedPlace.lat, hotelBrands, 5000)
        .then(hotels => updatePlaceState({ nearbyHotels: hotels, hotelLoading: false }))
        .catch(() => updatePlaceState({ hotelLoading: false }));
    }
  }, [selectedPlaceId, allPlaces, plan, foodPreference, hotelBrands]);

  async function runPlanner(userText: string) {
    setLoading(true);
    setErr(null);
    setCurrentThinking("");
    setIsTyping(true);
    setSelectedPlaceId(null);
    setRoute({ coordinates: [], distance: 0, duration: 0 });
    globalCache.route = null;
    lastUserInputRef.current = userText;

    const isIncremental = /(增加|添加|加入|去掉|删除|不要|换成|改成|替换|调整|优化|改一下|多去)/.test(userText)
      && !/(重新规划|换一个|完全不同|重来)/.test(userText);
    if (!isIncremental) {
      setPlan(null);
      globalCache.plan = null;
    }

    const manuallyAdded = Object.entries(manualAddedPlaces).filter(([_, places]) => places.length > 0);
    let enhancedUserText = userText;

    if (onboardingData) {
      const styleLabels: Record<string, string> = { popular: "热门打卡", relaxed: "休闲慢游", culture: "深度人文", photo: "网红出片", ancient: "江南古镇", tech: "科技科普", skyscraper: "摩天大厦", disney: "迪士尼", nature: "自然风光", museum: "历史博物" };
      const groupLabels: Record<string, string> = { solo: "单人出行", couple: "情侣/二人同行", family: "亲子家庭", friends: "朋友结伴", elderly: "带老人出行", business: "商务出差" };
      const budgetLabels: Record<string, string> = { economy: "经济型（500元以内）", comfort: "舒适型（500-1000元）", quality: "品质型（1000-2000元）", luxury: "尊享型（2000元以上）" };
      const styleStr = onboardingData.travel_style.map(s => styleLabels[s] || s).join("、");
      const groupStr = groupLabels[onboardingData.travel_group] || onboardingData.travel_group;
      const budgetStr = budgetLabels[onboardingData.total_budget] || onboardingData.total_budget;
      const userPrefInfo = `用户基础行程信息：游玩${onboardingData.travel_days}天，出行人群为${groupStr}，年龄段为${onboardingData.age_group}岁，游玩风格偏好${styleStr}，人均全程预算${budgetStr}。请严格基于以上条件，为用户生成适配的上海每日行程，匹配对应节奏、预算与人群适配性。`;
      enhancedUserText = `${userPrefInfo}\n\n用户需求：${userText}`;
    }

    if (manuallyAdded.length > 0) {
      const addedInfo = manuallyAdded.map(([day, places]) => `第${day}天必须包含：${places.map(p => p.name).join('、')}`).join('；');
      enhancedUserText = `${enhancedUserText}。注意：${addedInfo}。请在规划时将这些景点安排到对应天数，并合理规划路线顺序。`;
    }

    let finalPlaces: Place[] = allPlaces.length > 0 ? allPlaces : [];
    if (finalPlaces.length === 0) {
      try {
        const fetched = await fetchShanghaiPlaces(undefined);
        cacheSet(`sh_places_all`, fetched, 1000 * 60 * 12);
        finalPlaces = fetched.filter(p => p.category !== "other").slice(0, 150);
      } catch (e) {
        const fallback = fallbackPlaces();
        finalPlaces = fallback.map((p, idx) => ({ ...p, id: `fallback_${idx}_${p.name.replace(/\s/g, '_')}` }));
      }
      setAllPlaces(finalPlaces);
      globalCache.places = finalPlaces;
    }

    if (finalPlaces.length === 0) {
      const errorMsg = "❌ 景点数据获取失败，请检查网络连接";
      setErr(errorMsg);
      setChat(prev => { const newChat = [...prev, createChatMsg("agent", errorMsg)]; globalCache.chat = newChat; return newChat; });
      setIsTyping(false);
      setLoading(false);
      return;
    }

    const foodPrefMatch = userText.match(/偏好(.+")(菜|餐厅|美食)/);
    if (foodPrefMatch) setFoodPreference([foodPrefMatch[1] + foodPrefMatch[2]]);
    const hotelPrefMatch = userText.match(/(华住会|如家|锦江|汉庭|全季|桔子|7天|格林豪泰)/);
    if (hotelPrefMatch) setHotelBrands([hotelPrefMatch[1]]);

    let fullThinking = "";
    let hasReceivedPlan = false;
    try {
      setChat(prev => { const newChat = [...prev, createChatMsg("agent", "📚 正在加载本地知识库，结合AI规划行程...")]; globalCache.chat = newChat; return newChat; });
      const generator = generateTravelPlan(enhancedUserText, finalPlaces, plan, Array.from(confirmedDays), planMode);
      for await (const chunk of generator) {
        fullThinking += chunk;
        setCurrentThinking(fullThinking);
        const planResult = parsePlanResultFromStream(fullThinking);
        if (planResult) {
          const confirmedSet = confirmedDays;
          if (confirmedSet.size > 0 && plan) {
            const confirmedDayMap = new Map(plan.days.map(d => [d.day, d]));
            const mergedDays = planResult.days.map(day => confirmedSet.has(day.day) && confirmedDayMap.has(day.day) ? confirmedDayMap.get(day.day)! : day);
            planResult.days = mergedDays;
          }
          setPlan(planResult);
          globalCache.plan = planResult;
          setSelectedDay(1);
          setIsTyping(false);
          setRemovedAiPlaces({});
          setManualAddedPlaces({});
          onManualPlacesChange?.({});
          setCustomDayOrder({});
          hasReceivedPlan = true;

          onPlanGenerated?.(planResult);
          onPlanUpdated?.(planResult, confirmedDays, {});

          const thinkingOnly = fullThinking.split("{")[0].trim();
          const ragNote = planResult.notes.find((n: string) => n.startsWith("💡 RAG本地知识库贴士"));
          let completionMsg = thinkingOnly + `\n\n✅ 行程规划完成！共${planResult.constraints.days}天\n`;
          completionMsg += "📚 已融合上海本地RAG知识库（FAISS向量库）\n";
          const agentFailed = fullThinking.includes("Agent调用失败") || fullThinking.includes("Agent服务暂不可用");
          if (!agentFailed) completionMsg += "🤖 已调用后端智能体获取实时信息\n";
          else completionMsg += "ℹ️ 后端智能体暂不可用，已使用本地知识库规划\n";
          completionMsg += "🗄️ 行程可保存到MySQL数据库持久化存储\n";
          if (ragNote) completionMsg += `${ragNote}\n`;
          completionMsg += "\n点击地图景点查看实时美食/酒店推荐";

          setChat(prev => { const newChat = [...prev, createChatMsg("agent", completionMsg)]; globalCache.chat = newChat; return newChat; });
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      if (!hasReceivedPlan) {
        const planResult = parsePlanResultFromStream(fullThinking);
        if (planResult) {
          setPlan(planResult);
          globalCache.plan = planResult;
          setSelectedDay(1);
          setIsTyping(false);
          setManualAddedPlaces({});
          onManualPlacesChange?.({});
          setCustomDayOrder({});
          onPlanGenerated?.(planResult);
          onPlanUpdated?.(planResult, confirmedDays, {});
        } else if (fullThinking) {
          setChat(prev => { const newChat = [...prev, createChatMsg("agent", fullThinking)]; globalCache.chat = newChat; return newChat; });
        }
      }
    } catch (e) {
      const errorMsg = `❌ 规划失败：${(e as Error).message}`;
      setErr(errorMsg);
      setChat(prev => { const newChat = [...prev, createChatMsg("agent", fullThinking + "\n\n" + errorMsg)]; globalCache.chat = newChat; return newChat; });
      setIsTyping(false);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  }

  function onSend() {
    const text = input.trim();
    if (!text) return;
    setChat(prev => { const newChat = [...prev, createChatMsg("user", text)]; globalCache.chat = newChat; return newChat; });
    const swap = text.match(/把(.+)换成(.+)(\s|$)/);
    if (swap && lastUserInputRef.current) {
      runPlanner(`${text}。基于之前的需求：${lastUserInputRef.current}`);
      return;
    }
    runPlanner(text);
  }

  const handleAddPlaceToTrip = (place: Place) => {
    const dayPlaces = manualAddedPlaces[selectedDay] || [];
    const aiPlaces = plan?.days.find(d => d.day === selectedDay)?.places || [];
    const allDayPlaces = [...dayPlaces, ...aiPlaces];
    if (allDayPlaces.some(p => p.id === place.id || p.name === place.name)) { showToast("该景点已在当日行程中", "warning"); return; }
    if (allDayPlaces.length >= 8) { showToast("当日行程景点已达上限，建议拆分到其他日期", "warning"); return; }
    const newManualPlaces = { ...manualAddedPlaces, [selectedDay]: [...dayPlaces, place] };
    setManualAddedPlaces(newManualPlaces);
    onManualPlacesChange?.(newManualPlaces);
    setSidebarState("editing");
    showToast(`已添加「${place.name}」到第${selectedDay}天`, "success");
  };

  const handleRemovePlace = (placeId: string) => {
    const dayPlaces = manualAddedPlaces[selectedDay] || [];
    const placeToRemove = dayPlaces.find(p => p.id === placeId);
    if (placeToRemove) {
      const newManualPlaces = { ...manualAddedPlaces, [selectedDay]: dayPlaces.filter(p => p.id !== placeId) };
      setManualAddedPlaces(newManualPlaces);
      onManualPlacesChange?.(newManualPlaces);
      showToast(`已移除「${placeToRemove.name}」`, "info");
    } else {
      const aiPlace = activeDayPlaces.find(p => p.id === placeId);
      if (aiPlace) {
        setRemovedAiPlaces(prev => {
          const daySet = prev[selectedDay] || new Set();
          const newSet = new Set(daySet);
          newSet.add(placeId);
          return { ...prev, [selectedDay]: newSet };
        });
        showToast(`已移除「${aiPlace.name}」`, "info");
      }
    }
  };

  const handleDragStart = (placeId: string) => setDraggedPlaceId(placeId);
  const handleDragOver = (e: React.DragEvent, _targetPlaceId: string) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (targetPlaceId: string) => {
    if (!draggedPlaceId || draggedPlaceId === targetPlaceId) { setDraggedPlaceId(null); return; }
    const currentOrder = activeDayPlaces.map(p => p.id);
    const draggedIndex = currentOrder.indexOf(draggedPlaceId);
    const targetIndex = currentOrder.indexOf(targetPlaceId);
    if (draggedIndex === -1 || targetIndex === -1) { setDraggedPlaceId(null); return; }
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedPlaceId);
    setCustomDayOrder(prev => ({ ...prev, [selectedDay]: newOrder }));
    setDraggedPlaceId(null);
  };
  const handleDragEnd = () => setDraggedPlaceId(null);

  const handleConfirmDay = () => {
    const day = selectedDay;
    if (confirmedDays.has(day)) {
      const nextConfirmed = new Set(confirmedDays);
      nextConfirmed.delete(day);
      setConfirmedDays(nextConfirmed);
      if (onPlanUpdated && plan) onPlanUpdated(plan, nextConfirmed, manualAddedPlaces);
      return;
    }
    setConfirmingDay(day);
    setTimeout(() => {
      const nextConfirmed = new Set(confirmedDays);
      nextConfirmed.add(day);
      let updatedPlan = plan;
      let newManualPlaces = { ...manualAddedPlaces };
      if (plan && manualAddedPlaces[day]?.length > 0) {
        const manualPlaces = manualAddedPlaces[day];
        updatedPlan = { ...plan, days: plan.days.map(d => d.day === day ? { ...d, places: [...d.places, ...manualPlaces.filter(p => !new Set(d.places.map(pp => pp.id)).has(p.id))] } : d) };
        setPlan(updatedPlan);
        delete newManualPlaces[day];
        setManualAddedPlaces(newManualPlaces);
        onManualPlacesChange?.(newManualPlaces);
      }
      setConfirmedDays(nextConfirmed);
      if (onPlanUpdated && updatedPlan) onPlanUpdated(updatedPlan, nextConfirmed, newManualPlaces);
      const allDays = currentPlan.days.map(d => d.day);
      const nextDay = allDays.find(d => !nextConfirmed.has(d) && d !== day);
      if (nextDay !== undefined) setSelectedDay(nextDay);
      setConfirmingDay(null);
    }, 800);
  };

  const handleMapRecover = () => {
    mapKeyRef.current += 1;
    setChat(prev => { const newChat = [...prev, createChatMsg("agent", "⚠️ 地图已自动恢复，行程、美食和酒店数据未丢失")]; globalCache.chat = newChat; return newChat; });
  };

  return (
    <div className="h-full w-full bg-[#050608] text-white overflow-hidden font-sans flex flex-col relative">
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div className={cn("group relative flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-medium shadow-lg backdrop-blur-md transition-shadow duration-500 ease-out [--bg-size:300%]",
            toast.type === "success" && "bg-emerald-500/20 text-emerald-200 shadow-[inset_0_-8px_10px_rgba(16,185,129,0.2)]",
            toast.type === "warning" && "bg-amber-500/20 text-amber-200 shadow-[inset_0_-8px_10px_rgba(245,158,11,0.2)]",
            toast.type === "error" && "bg-red-500/20 text-red-200 shadow-[inset_0_-8px_10px_rgba(239,68,68,0.2)]",
            toast.type === "info" && "bg-white/10 text-white shadow-[inset_0_-8px_10px_rgba(143,223,255,0.15)]"
          )}>
            <div className={cn("absolute inset-0 block h-full w-full animate-gradient bg-[length:var(--bg-size)_100%] p-[1px] ![mask-composite:subtract] [border-radius:inherit] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]",
              toast.type === "success" && "bg-gradient-to-r from-emerald-400/50 via-green-500/50 to-emerald-400/50",
              toast.type === "warning" && "bg-gradient-to-r from-amber-400/50 via-orange-500/50 to-amber-400/50",
              toast.type === "error" && "bg-gradient-to-r from-red-400/50 via-rose-500/50 to-red-400/50",
              toast.type === "info" && "bg-gradient-to-r from-cyan-400/50 via-blue-500/50 to-cyan-400/50"
            )} />
            <span className="relative z-10 animate-bounce">{toast.message}</span>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showTechStack && (
          <motion.div className="fixed inset-0 z-[9999] bg-black/70" onClick={() => setShowTechStack(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <motion.div className="absolute right-6 top-4 w-[400px] bg-[#0D1122]/98 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-2"><Code2 className="w-4 h-4 text-indigo-400" /><h4 className="text-sm font-bold text-white tracking-wide">技术栈详情</h4></div>
                <button onClick={() => setShowTechStack(false)} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/15 text-green-300 border border-green-500/25 font-sans">FAISS</span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-sans">Agent</span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/25 font-sans">Redis</span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25 font-sans">MySQL</span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 font-sans">高德API</span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/25 font-sans">MapLibre GL</span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 font-sans">LLM API</span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-sans">LangChain</span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/25 font-sans">FastAPI</span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25 font-sans">RAG</span>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 font-medium">FAISS</span>
                      <span className="text-[10px] text-slate-400">向量相似度搜索</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">用于本地文旅知识库的向量相似度检索，为回答和行程生成提供可控的上海旅行知识上下文。</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">Agent</span>
                      <span className="text-[10px] text-slate-400">多工具自主调度</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">基于ReAct框架的智能体，能够自主判断用户需求并调用合适的工具链。支持路线规划、景点搜索、天气查询等多工具协同，实现深度旅行规划。</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">Redis</span>
                      <span className="text-[10px] text-slate-400">对话记忆缓存</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">高性能内存数据库，用于存储对话历史和会话状态。支持多轮对话上下文记忆，让智能体能够理解用户的连续提问和历史偏好。</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">MySQL</span>
                      <span className="text-[10px] text-slate-400">结构化数据存储</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">关系型数据库，存储景点、美食、酒店等结构化数据。支持复杂查询和数据关联，为行程规划提供可靠的数据基础。</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-medium">高德API</span>
                      <span className="text-[10px] text-slate-400">地理位置服务</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">提供地图、路线规划、天气、POI搜索等地理位置服务。实时获取上海最新的景点、美食、酒店信息，确保规划数据的时效性。</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-medium">MapLibre GL</span>
                      <span className="text-[10px] text-slate-400">交互式地图渲染</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">负责倾斜视角地图、景点标记和动态路线图层；React Three Fiber用于页面中的辅助视觉效果。</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">LLM API</span>
                      <span className="text-[10px] text-slate-400">大语言模型</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">模型调用仅发生在FastAPI后端；浏览器端不保存或发送模型服务密钥。</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">LangChain</span>
                      <span className="text-[10px] text-slate-400">LLM应用框架</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">大语言模型应用开发框架，提供链式调用、工具集成、记忆管理等能力。简化Agent开发流程，快速构建复杂的智能体应用。</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-medium">FastAPI</span>
                      <span className="text-[10px] text-slate-400">后端API框架</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">高性能Python Web框架，基于标准Python类型提示。提供自动生成API文档、异步支持和类型安全，构建高效可靠的后端服务。</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-medium">RAG</span>
                      <span className="text-[10px] text-slate-400">检索增强生成</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">Retrieval-Augmented Generation，检索增强生成技术。结合知识库检索和大模型生成，让回答更准确、更专业，同时减少幻觉。</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="px-6 py-4 grid gap-4 lg:grid-cols-[1fr_400px] flex-1 min-h-0 overflow-hidden">
        <section className="relative h-full w-full min-h-0">
          <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/5">
            <ErrorBoundary fallback={<div>地图加载失败</div>}>
              <Map3D
                key={mapKeyRef.current}
                places={displayPlaces}
                activeDayPlaceIds={activeDayPlaces.map(p => p.id)}
                selectedId={selectedPlaceId}
                focusedPlaceId={null}
                onSelect={handleMapMarkerClick}
                onAddToTrip={handleAddPlaceToTrip}
                selectedDay={selectedDay}
                route={route.coordinates}
                showRoute={showRoute}
                dark={dark}
                animate={animate}
                aiModel={aiModel}
                satellite={satellite}
                onMapRecover={handleMapRecover}
                onZoomChange={handleZoomChange}
                placesLoaded={placesLoaded}
              />
            </ErrorBoundary>
          </div>

          <div className="absolute bottom-4 left-4 pointer-events-none flex gap-3 flex-wrap">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-2.5 rounded-xl min-w-[110px] shadow-xl shadow-black/30">
              <div className="text-[8px] text-white/40 uppercase tracking-widest mb-0.5">TOTAL DISTANCE</div>
              <div className="text-sm font-serif">{route.distance.toFixed(1)} <span className="text-[10px] opacity-60">KM</span></div>
            </div>
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-2.5 rounded-xl min-w-[110px] shadow-xl shadow-black/30">
              <div className="text-[8px] text-white/40 uppercase tracking-widest mb-0.5">ESTIMATED TIME</div>
              <div className="text-sm font-serif">{route.duration} <span className="text-[10px] opacity-60">MIN</span></div>
            </div>
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-2.5 rounded-xl min-w-[110px] shadow-xl shadow-black/30">
              <div className="text-[8px] text-white/40 uppercase tracking-widest mb-0.5">MAP SCALE</div>
              <div className="text-sm font-serif">{scaleDistance}</div>
              <div className="w-full h-0.5 bg-white/60 mt-1 rounded-full relative">
                <div className="absolute left-0 top-0 w-1 h-1.5 bg-white/60 -translate-y-1/2" />
                <div className="absolute right-0 top-0 w-1 h-1.5 bg-white/60 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full shadow-xl shadow-black/30 flex items-center gap-1.5">
            <button onClick={() => { setShowMapAllPlaces(true); setShowPlanAllDays(false); }} className={cn("px-2.5 py-1 text-[11px] rounded-full transition-all duration-300", showMapAllPlaces ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80")}>
              全部景点
            </button>
            <button onClick={() => { setShowMapAllPlaces(false); setShowPlanAllDays(true); }} disabled={!plan} className={cn("px-2.5 py-1 text-[11px] rounded-full transition-all duration-300", !plan ? "text-white/20 cursor-not-allowed" : showPlanAllDays ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80")}>
              规划景点
            </button>
            <button onClick={() => { setShowMapAllPlaces(false); setShowPlanAllDays(false); }} disabled={!plan} className={cn("px-2.5 py-1 text-[11px] rounded-full transition-all duration-300", !plan ? "text-white/20 cursor-not-allowed" : !showMapAllPlaces && !showPlanAllDays ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80")}>
              当日景点
            </button>
            <div className="w-px h-3.5 bg-white/10" />
            <button onClick={() => setShowRoute(!showRoute)} className={cn("px-2.5 py-1 text-[11px] rounded-full transition-all duration-300", showRoute ? "bg-indigo-500/20 text-indigo-300" : "text-white/50 hover:text-white/80")}>
              {showRoute ? "隐藏路线" : "显示路线"}
            </button>
          </div>
        </section>

        <aside className="flex flex-col gap-2.5 w-full h-full overflow-hidden">
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-3 shadow-2xl shadow-black/30 flex flex-col overflow-hidden relative" style={{ height: `${sidebarStateConfig[sidebarState]}%`, transition: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)', minHeight: 0 }}>
            <div className="mb-2.5 flex-shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-serif tracking-wider text-amber-100/90">智能规划</h3>
                  <button onClick={() => setShowTechStack(true)} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] text-slate-300 hover:text-white transition-all duration-200" title="查看技术栈详情">
                    <Code2 className="w-3 h-3" /><span>技术栈</span>
                  </button>
                </div>
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <button onClick={() => setPlanMode('fast')} className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium transition-all duration-200 flex items-center gap-0.5", planMode === 'fast' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-slate-300")}>
                    <span>⚡</span><span>极速</span>
                  </button>
                  <button onClick={() => setPlanMode('agent')} className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium transition-all duration-200 flex items-center gap-0.5", planMode === 'agent' ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-slate-400 hover:text-slate-300")}>
                    <span>🤖</span><span>Agent</span>
                  </button>
                </div>
              </div>
            </div>

            {sidebarState === "idle" && chat.length === 0 && (
              <div className="mb-2 flex-shrink-0">
                <div className="text-[9px] text-white/40 mb-1.5">试试这些：</div>
                <div className="flex flex-wrap gap-1">
                  {["帮我规划2天上海经典游", "亲子游，迪士尼+科技馆", "美食为主的路线", "小众文艺打卡点"].map((suggestion, idx) => (
                    <button key={idx} onClick={() => setInput(suggestion)} className="px-2 py-0.5 text-[9px] rounded-full bg-white/5 text-white/60 border border-white/10 hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-400/30 transition-all duration-300">{suggestion}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-shrink-0">
              <div className="relative flex-1">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && onSend()}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  className={cn("h-9 w-full rounded-xl px-3 text-xs text-gray-200 outline-none transition-all duration-300 placeholder:text-white/30", "bg-white/5 backdrop-blur-md border border-white/10", "focus:border-indigo-400/50 focus:shadow-[0_0_20px_rgba(99,102,241,0.15)]", "hover:border-white/20")}
                  placeholder="输入需求，生成定制行程"
                />
                {inputFocused && <div className="absolute inset-0 rounded-xl bg-indigo-500/5 -z-10 blur-md" />}
              </div>
              <button onClick={onSend} disabled={loading || !input.trim()} className={cn("h-9 px-4 rounded-xl text-xs font-medium transition-all duration-300 relative overflow-hidden group", "bg-gradient-to-br from-indigo-500 to-violet-600 text-white", "shadow-lg shadow-indigo-500/20", "hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105", "active:scale-95", "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg")}>
                <span className="relative z-10">{loading ? "思考中..." : "规划"}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
            </div>
            {err && <div className="mt-1 text-[10px] text-red-400/80 flex-shrink-0">{err}</div>}

            <div ref={chatContainerRef} className="mt-2.5 flex-1 min-h-0 space-y-2 overflow-y-auto rounded-xl bg-black/20 p-2.5 shadow-inner shadow-black/30 custom-scrollbar">
              {chat.map((m, i) => (
                <div key={i} className={cn("rounded-xl p-2.5 transition-all duration-300", m.role === "user" ? "bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-400/30 ml-4" : "bg-white/5 border border-white/10 mr-4")}>
                  <div className={cn("text-[9px] font-bold tracking-widest uppercase mb-1.5", m.role === "user" ? "text-indigo-300" : "text-amber-200/70")}>{m.role === "user" ? "你" : "AI 智能体"}</div>
                  <div className="text-[11px] text-gray-300/90 whitespace-pre-wrap leading-relaxed">{m.content}</div>
                </div>
              ))}
              {isTyping && (
                <div className="rounded-xl p-2.5 bg-white/5 border border-amber-400/20 mr-4">
                  <div className="text-[9px] font-bold tracking-widest uppercase mb-1.5 text-amber-200/70">AI 智能体・思考中</div>
                  <div className="text-[11px] text-gray-300/90 whitespace-pre-wrap">{currentThinking}<span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle rounded-sm" /></div>
                </div>
              )}
            </div>
          </div>

          {allDaysConfirmed ? (
            <div className="overflow-hidden" style={{ height: `${100 - sidebarStateConfig[sidebarState]}%`, transition: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)', minHeight: 0 }}>
              <PixelCard variant="blue" gap={6} speed={40} colors="#c7d2fe,#818cf8,#6366f1" autoPlay className="w-full h-full rounded-2xl">
                <div className="text-center flex flex-col items-center justify-center h-full px-4">
                  <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent mb-2">Let's begin!</h2>
                  <p className="text-xs text-white/50 mb-6">行程已全部确认，准备出发</p>
                  <button onClick={onGoToPrep} className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2">
                    <span>🎒</span>前往行前准备
                  </button>
                  {onBackToOnboarding && (
                    <button onClick={onBackToOnboarding} className="mt-3 px-4 py-2 rounded-xl bg-white/5 text-white/70 text-xs font-medium border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-300 flex items-center gap-2">
                      <span>✏️</span>修改出行偏好
                    </button>
                  )}
                  <button onClick={handleSavePlan} disabled={isSavingPlan || planSaved || (!plan && Object.values(manualAddedPlaces).every(places => places.length === 0))} className={cn("mt-3 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300 flex items-center gap-2", "bg-transparent border backdrop-blur-sm", planSaved ? "border-emerald-400/30 text-emerald-300/80 cursor-default" : isSavingPlan ? "border-white/10 text-white/50 cursor-wait" : "border-white/10 text-white/60 hover:border-white/20 hover:text-white/80 hover:bg-white/5")}>
                    {planSaved ? (<><span>✅</span><span>已存入数据库（ID: {savedPlanId}）</span></>) : isSavingPlan ? (<><span>⏳</span><span>正在存入数据库...</span></>) : (<><span>💾</span><span>同意存入数据库</span></>)}
                  </button>
                  <button onClick={() => { setConfirmedDays(new Set()); setSidebarState('planned'); }} className="mt-3 px-4 py-2 rounded-xl bg-white/5 text-white/70 text-xs font-medium border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-300 flex items-center gap-2">
                    <span>↩️</span>返回编辑行程
                  </button>
                  <p className="text-[10px] text-white/30 mt-4">打包清单 · 明信片 · 出行贴士</p>
                </div>
              </PixelCard>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 p-3 shadow-2xl shadow-black/30 flex flex-col overflow-hidden" style={{ height: `${100 - sidebarStateConfig[sidebarState]}%`, transition: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)', minHeight: 0 }}>
              <h2 className="text-sm font-serif mb-1.5 flex-shrink-0">今日行程</h2>
              <div className="flex flex-wrap gap-1.5 mb-2 flex-shrink-0">
                {currentPlan.days.map(d => {
                  const isConfirmed = confirmedDays.has(d.day);
                  const removedSet = removedAiPlaces[d.day] || new Set();
                  const aiPlacesFromPlan = plan?.days.find(day => day.day === d.day)?.places || [];
                  const manualCount = manualAddedPlaces[d.day]?.length || 0;

                  // 使用与 activeDayPlaces 完全一致的 id 生成逻辑
                  let aiCount = 0;
                  aiPlacesFromPlan.forEach(p => {
                    const resolvedId = resolvePlaceId(p);
                    if (!removedSet.has(resolvedId)) {
                      aiCount++;
                    }
                  });

                  const dayPlaceCount = aiCount + manualCount;

                  return (
                    <button
                      key={d.day}
                      onClick={() => { setSelectedDay(d.day); }}
                      className={cn(
                        "relative px-2.5 py-1 text-[10px] rounded-lg transition-all duration-300 font-medium group",
                        selectedDay === d.day
                          ? isConfirmed
                            ? "bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-300 border border-green-400/40 shadow-lg shadow-green-500/10"
                            : "bg-gradient-to-r from-indigo-500/30 to-violet-500/30 text-indigo-300 border border-indigo-400/40 shadow-lg shadow-indigo-500/10"
                          : isConfirmed
                            ? "bg-green-500/10 text-green-400/70 border border-green-500/20 hover:bg-green-500/20 hover:text-green-300"
                            : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-gray-200"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {isConfirmed && <Check className="w-3 h-3" />}
                        <span>Day {d.day}</span>
                      </div>
                      {dayPlaceCount > 0 && (
                        <span className={cn(
                          "absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-white text-[9px] rounded-full flex items-center justify-center font-bold",
                          isConfirmed ? "bg-gradient-to-r from-green-500 to-emerald-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"
                        )}>
                          {dayPlaceCount}
                        </span>
                      )}
                      {!isConfirmed && dayPlaceCount > 0 && selectedDay !== d.day && (
                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-gradient-to-r from-indigo-400/60 to-violet-400/60" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5 relative flex-1 overflow-y-auto custom-scrollbar pr-1">
                <div className="absolute left-2 top-1 bottom-1 w-px bg-gradient-to-b from-indigo-500/30 via-white/10 to-transparent" />
                {activeDayPlaces.length > 0 ? (
                  activeDayPlaces.map((place, idx) => {
                    const isConfirmed = confirmedDays.has(selectedDay);
                    const canDrag = !isConfirmed && activeDayPlaces.length > 1;
                    return (
                      <div
                        key={place.id}
                        draggable={canDrag}
                        onDragStart={canDrag ? () => handleDragStart(place.id) : undefined}
                        onDragOver={canDrag ? (e) => handleDragOver(e, place.id) : undefined}
                        onDrop={canDrag ? () => handleDrop(place.id) : undefined}
                        onDragEnd={canDrag ? handleDragEnd : undefined}
                        onClick={() => { setSelectedPlaceId(place.id); setSidebarState("editing"); }}
                        className={cn(
                          "relative pl-6 cursor-pointer transition-all duration-300 group py-1.5 select-none rounded-lg",
                          "hover:bg-white/5 hover:pl-7",
                          selectedPlaceId === place.id ? "bg-indigo-500/10 ring-1 ring-indigo-400/30" : "",
                          draggedPlaceId === place.id ? "opacity-30 scale-95 rotate-1" : "",
                          isConfirmed && "opacity-80"
                        )}
                        style={{ cursor: canDrag ? "grab" : isConfirmed ? "default" : "pointer" }}
                      >
                        {!isConfirmed && (
                          <div className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-300",
                            canDrag
                              ? "text-white/20 group-hover:text-indigo-400/60 cursor-grab active:cursor-grabbing"
                              : "text-white/10 cursor-not-allowed"
                          )}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="9" cy="6" r="1.5" />
                              <circle cx="15" cy="6" r="1.5" />
                              <circle cx="9" cy="12" r="1.5" />
                              <circle cx="15" cy="12" r="1.5" />
                              <circle cx="9" cy="18" r="1.5" />
                              <circle cx="15" cy="18" r="1.5" />
                            </svg>
                          </div>
                        )}
                        <div className={cn(
                          "absolute left-1.5 top-2.5 w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 z-10",
                          selectedPlaceId === place.id
                            ? "bg-gradient-to-br from-indigo-400 to-violet-500 border-indigo-300 scale-125 shadow-lg shadow-indigo-500/50"
                            : "bg-transparent border-white/20 group-hover:border-indigo-400/50 group-hover:scale-110"
                        )} />
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[8px] text-indigo-400/80 font-bold tracking-widest uppercase mb-0.5">
                              站点 {idx + 1}
                            </div>
                            <div className="font-medium text-xs leading-tight truncate group-hover:text-indigo-200 transition-colors">{place.name}</div>
                            <div className="text-[9px] opacity-40 mt-0.5 flex items-center gap-1">
                              <span className="inline-block w-1 h-1 rounded-full bg-current" />
                              {place.openingHours || "全天开放"}
                            </div>
                          </div>
                          {!isConfirmed && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemovePlace(place.id); }}
                              className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1 rounded-md hover:bg-red-500/20 text-red-400/60 hover:text-red-400"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[10px] text-white/30 gap-3 py-8">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">📍</div>
                    <div className="text-center">
                      <div className="text-white/50 mb-1">今日行程为空</div>
                      <div className="text-[9px] opacity-50">点击地图景点添加，或使用智能规划</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-white/5 space-y-2 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300/80 text-[9px] border border-indigo-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    路线已优化
                  </span>
                  <span className="text-[9px] text-white/30">
                    自驾优先 · {activeDayPlaces.length} 个景点
                  </span>
                </div>
                <button
                  onClick={handleConfirmDay}
                  disabled={confirmingDay !== null || activeDayPlaces.length === 0}
                  className={cn(
                    "w-full py-2.5 rounded-xl font-bold text-xs transition-all duration-300 relative overflow-hidden group",
                    confirmedDays.has(selectedDay)
                      ? "bg-gradient-to-r from-amber-500/80 to-orange-500/80 text-white hover:from-amber-500 hover:to-orange-500 hover:shadow-lg hover:shadow-amber-500/20"
                      : confirmingDay === selectedDay
                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                        : activeDayPlaces.length === 0
                          ? "bg-white/5 text-white/30 cursor-not-allowed border border-white/10"
                          : "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    {confirmingDay === selectedDay ? (
                      <>
                        <Check className="w-4 h-4 animate-bounce" />
                        <span>已确认</span>
                      </>
                    ) : confirmedDays.has(selectedDay) ? (
                      "重新编辑"
                    ) : (
                      "确认今日行程"
                    )}
                  </span>
                  {activeDayPlaces.length > 0 && !confirmedDays.has(selectedDay) && confirmingDay !== selectedDay && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  )}
                </button>
              </div>
            </div>
          )}
        </aside>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 2px; height: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 999px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); }
      `}</style>
    </div>
  );
};

export default MapPlanPage;
