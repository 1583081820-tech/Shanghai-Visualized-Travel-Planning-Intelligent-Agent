import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map, type StyleSpecification, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "../lib/utils";
import type { Place, FoodMerchant, Hotel } from "../lib/types";
import {
  fetchPlaceIntroductionStream,
  preloadPlaceIntroduction,
  cancelPreload,
  fetchPlaceTraffic,
} from "../lib/scenicSpotIntroductionApi";
import { getNearbyParking } from "../lib/amap";
import {
  X,
  MapPin,
  Clock,
  Navigation,
  Utensils,
  Hotel as HotelIcon,
  Info,
  ParkingCircle,
} from "lucide-react";

// 坐标转换常量（保持不变）
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
    ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320.0 * Math.sin((y / 30.0) * PI)) * 2.0) / 3.0;
    return ret;
  }

  function transformLon(x: number, y: number): number {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0;
    return ret;
  }

  const dLat = transformLat(lon - 105.0, lat - 35.0);
  const dLon = transformLon(lon - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const dLat2 = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  const dLon2 = (dLon * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);

  return [Number((lon + dLon2).toFixed(6)), Number((lat + dLat2).toFixed(6))];
}

function calculateDistance(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6378137;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatCategory(c: Place["category"]) {
  switch (c) {
    case "museum": return "博物馆";
    case "mall": return "商圈/商场";
    case "park": return "公园";
    case "landmark": return "地标建筑";
    case "attraction": return "旅游景点";
    case "university": return "高等院校";
    default: return "其他";
  }
}

function formatTicket(ticket: number | null): string {
  if (ticket === null) return "信息暂无";
  if (ticket === 0) return "免费开放";
  return `¥${ticket}`;
}

function formatOpeningHours(hours: string | undefined): string {
  if (!hours) return "信息暂无";
  return hours;
}

const categoryColors: Record<string, { bg: string; text: string; shadow: string }> = {
  museum: { bg: "rgba(16, 185, 129, 0.75)", text: "#ffffff", shadow: "rgba(16, 185, 129, 0.4)" },
  mall: { bg: "rgba(217, 70, 239, 0.75)", text: "#ffffff", shadow: "rgba(217, 70, 239, 0.4)" },
  park: { bg: "rgba(22, 163, 74, 0.75)", text: "#ffffff", shadow: "rgba(22, 163, 74, 0.4)" },
  landmark: { bg: "rgba(245, 158, 11, 0.75)", text: "#ffffff", shadow: "rgba(245, 158, 11, 0.4)" },
  university: { bg: "rgba(147, 51, 234, 0.75)", text: "#ffffff", shadow: "rgba(147, 51, 234, 0.4)" },
  attraction: { bg: "rgba(79, 70, 229, 0.75)", text: "#ffffff", shadow: "rgba(79, 70, 229, 0.4)" },
  other: { bg: "rgba(107, 114, 128, 0.75)", text: "#ffffff", shadow: "rgba(107, 114, 128, 0.4)" },
};

const FAMOUS_PLACES = ["东方明珠", "外滩", "豫园", "上海迪士尼", "南京路", "人民广场", "静安寺", "徐家汇"];

type Props = {
  places: Place[];
  activeDayPlaceIds: string[];
  selectedId?: string | null;
  focusedPlaceId?: string | null;
  onSelect?: (id: string | null) => void;
  onAddToTrip?: (place: Place) => void;
  selectedDay?: number;
  route: [number, number][];
  showRoute: boolean;
  dark?: boolean;
  animate?: boolean;
  satellite?: boolean;
  aiModel?: "lite" | "pro";
  onMapRecover?: () => void;
  onZoomChange?: (zoom: number, center: [number, number]) => void;
  placesLoaded?: boolean;
};

const SH_CENTER: [number, number] = wgs84ToGcj02(121.4737, 31.2304);

const GAODE_VECTOR_STYLE: StyleSpecification = {
  version: 8 as const,
  sources: {
    "gaode-vec": {
      type: "raster",
      tiles: [
        "https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
        "https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
        "https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
        "https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}",
      ],
      tileSize: 256,
      attribution: "© 高德地图",
      maxzoom: 19,
      minzoom: 0,
    },
  },
  layers: [
    {
      id: "gaode-vec-layer",
      type: "raster",
      source: "gaode-vec",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const GAODE_SATELLITE_STYLE: StyleSpecification = {
  version: 8 as const,
  sources: {
    "gaode-img": {
      type: "raster",
      tiles: [
        "https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
        "https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
      ],
      tileSize: 256,
      attribution: "© 高德地图",
    },
    "gaode-cva": {
      type: "raster",
      tiles: [
        "https://webst01.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}",
        "https://webst02.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}",
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: "gaode-img-layer",
      type: "raster",
      source: "gaode-img",
      minzoom: 0,
      maxzoom: 19,
    },
    {
      id: "gaode-cva-layer",
      type: "raster",
      source: "gaode-cva",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export default function Map3D({
  places,
  activeDayPlaceIds,
  selectedId,
  onSelect,
  onAddToTrip,
  selectedDay = 1,
  route,
  showRoute = true,
  dark = true,
  animate = false,
  satellite = false,
  aiModel = "lite",
  onMapRecover,
  onZoomChange,
  placesLoaded = false,
}: Props) {
  const mapRef = useRef<Map | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const removingMarkersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [recoverCount, setRecoverCount] = useState(0);

  const [introduction, setIntroduction] = useState<string>("");
  const [introLoading, setIntroLoading] = useState(false);
  const [introError, setIntroError] = useState<string | null>(null);
  const [trafficInfo, setTrafficInfo] = useState<string>("");
  const streamControllerRef = useRef<AbortController | null>(null);
  const lastLoadedPlaceIdRef = useRef<string | null>(null);

  const [parkingInfo, setParkingInfo] = useState<any[]>([]);
  const [parkingLoading, setParkingLoading] = useState(false);

  const isUpdatingRoute = useRef(false);
  const fullRouteRef = useRef<[number, number][]>([]);
  const isClickingMarkerRef = useRef(false);
  const isUserInteractingRef = useRef(false);
  const userInteractionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUserManuallyAdjustedViewRef = useRef(false);
  const placesRef = useRef<Place[]>([]);
  const activeDayPlaceIdsRef = useRef<string[]>([]);
  const lastSelectedDayRef = useRef<number | null>(null);

  const styleUrl = useMemo<StyleSpecification>(() => {
    return satellite ? GAODE_SATELLITE_STYLE : GAODE_VECTOR_STYLE;
  }, [satellite]);

  const addCustomLayers = (map: Map) => {
    try {
      const sourceId = "route-driving";
      const backgroundLayerId = "route-layer-background";
      const foregroundLayerId = "route-layer-driving";

      if (map.getLayer(foregroundLayerId)) map.removeLayer(foregroundLayerId);
      if (map.getLayer(backgroundLayerId)) map.removeLayer(backgroundLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
        lineMetrics: true,
      });

      map.addLayer({
        id: backgroundLayerId,
        type: "line",
        source: sourceId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "rgba(255, 255, 255, 0.15)", "line-width": 8, "line-blur": 1 },
      });

      map.addLayer({
        id: foregroundLayerId,
        type: "line",
        source: sourceId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-width": 6, "line-blur": 0.2, "line-color": "#6366f1" },
      });

      setMapLoaded(true);
      setMapError(null);
    } catch (e) {
      console.error("添加自定义图层失败:", e);
      setMapError(`图层加载失败: ${(e as Error).message}`);
    }
  };

  const deduplicateRoute = (route: [number, number][]): [number, number][] => {
    if (route.length < 2) return route;
    const result: [number, number][] = [route[0]];
    for (let i = 1; i < route.length; i++) {
      const prev = result[result.length - 1];
      const curr = route[i];
      if (calculateDistance(prev[0], prev[1], curr[0], curr[1]) > 1) result.push(curr);
    }
    return result;
  };

  const updateRoute = async (map: Map) => {
    if (isUpdatingRoute.current) return;
    isUpdatingRoute.current = true;
    try {
      const sourceId = "route-driving";
      const layerId = "route-layer-driving";
      const src = map.getSource(sourceId) as maplibregl.GeoJSONSource;
      if (!src) return;
      const cleanRoute = deduplicateRoute(route);
      fullRouteRef.current = cleanRoute;
      src.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: cleanRoute },
      });
      map.setLayoutProperty(layerId, "visibility", showRoute ? "visible" : "none");
      map.setLayoutProperty("route-layer-background", "visibility", showRoute ? "visible" : "none");
    } finally {
      isUpdatingRoute.current = false;
    }
  };

  const fitBoundsToPlaces = (map: Map, places: Place[]) => {
    if (places.length === 0) return;
    if (places.length === 1) {
      const [gcjLon, gcjLat] = wgs84ToGcj02(places[0].lon, places[0].lat);
      map.easeTo({
        center: [gcjLon, gcjLat],
        zoom: 14,
        duration: 1200,
        pitch: 55,
      });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    places.forEach((place) => {
      const [gcjLon, gcjLat] = wgs84ToGcj02(place.lon, place.lat);
      bounds.extend([gcjLon, gcjLat]);
    });
    map.fitBounds(bounds, {
      padding: { top: 100, bottom: 100, left: 100, right: 400 },
      duration: 1200,
      pitch: 55,
    });
  };

  // 选中景点详情加载
  useEffect(() => {
    if (!selectedId) {
      setIntroduction("");
      setIntroLoading(false);
      setIntroError(null);
      setTrafficInfo("");
      setParkingInfo([]);
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
        streamControllerRef.current = null;
      }
      lastLoadedPlaceIdRef.current = null;
      return;
    }

    const currentPlaces = placesRef.current;
    const selectedPlace = currentPlaces.find((p) => p.id === selectedId);
    if (!selectedPlace) return;

    if (lastLoadedPlaceIdRef.current === selectedId) return;
    lastLoadedPlaceIdRef.current = selectedId;

    setIntroLoading(true);
    setIntroError(null);
    setIntroduction("");
    setTrafficInfo("");
    setParkingInfo([]);
    setParkingLoading(true);

    if (streamControllerRef.current) streamControllerRef.current.abort();
    const controller = new AbortController();
    streamControllerRef.current = controller;

    (async () => {
      try {
        const generator = fetchPlaceIntroductionStream(selectedPlace, aiModel);
        for await (const chunk of generator) {
          if (controller.signal.aborted) break;
          setIntroduction((prev) => prev + chunk);
        }
        setIntroLoading(false);
      } catch (err: any) {
        if (err.message !== "请求已取消" && !controller.signal.aborted) {
          setIntroError(err.message);
          setIntroLoading(false);
        }
      }
    })();

    fetchPlaceTraffic(selectedPlace)
      .then((traffic) => {
        if (!controller.signal.aborted) setTrafficInfo(traffic);
      })
      .catch(() => setTrafficInfo("交通信息获取失败"));

    getNearbyParking([selectedPlace.lon, selectedPlace.lat])
      .then((parking) => {
        if (!controller.signal.aborted) {
          setParkingInfo(parking);
          setParkingLoading(false);
        }
      })
      .catch(() => { setParkingInfo([]); setParkingLoading(false); });

    return () => controller.abort();
  }, [selectedId, aiModel]);

  useEffect(() => {
    if (!selectedId) return;
    if (lastLoadedPlaceIdRef.current === selectedId) return;

    const selectedPlace = places.find((p) => p.id === selectedId);
    if (!selectedPlace) return;

    setIntroLoading(true);
    setIntroError(null);
    setIntroduction("");
    setTrafficInfo("");
    setParkingInfo([]);
    setParkingLoading(true);

    if (streamControllerRef.current) streamControllerRef.current.abort();
    const controller = new AbortController();
    streamControllerRef.current = controller;
    lastLoadedPlaceIdRef.current = selectedId;

    (async () => {
      try {
        const generator = fetchPlaceIntroductionStream(selectedPlace, aiModel);
        for await (const chunk of generator) {
          if (controller.signal.aborted) break;
          setIntroduction((prev) => prev + chunk);
        }
        setIntroLoading(false);
      } catch (err: any) {
        if (err.message !== "请求已取消" && !controller.signal.aborted) {
          setIntroError(err.message);
          setIntroLoading(false);
        }
      }
    })();

    fetchPlaceTraffic(selectedPlace)
      .then((traffic) => {
        if (!controller.signal.aborted) setTrafficInfo(traffic);
      })
      .catch(() => setTrafficInfo("交通信息获取失败"));

    getNearbyParking([selectedPlace.lon, selectedPlace.lat])
      .then((parking) => {
        if (!controller.signal.aborted) {
          setParkingInfo(parking);
          setParkingLoading(false);
        }
      })
      .catch(() => { setParkingInfo([]); setParkingLoading(false); });
  }, [places]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isClickingMarkerRef.current) return;
      const target = e.target as Node;
      let targetEl: Element | null = null;
      if (target.nodeType === Node.ELEMENT_NODE) targetEl = target as Element;
      else targetEl = target.parentElement;
      if (targetEl?.closest(".place-marker")) return;
      const infoBox = document.querySelector(".place-info-box");
      if (infoBox && infoBox.contains(targetEl)) return;
      onSelect?.(null);
      setIntroduction("");
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [onSelect]);

  useEffect(() => {
    if (!elRef.current) return;

    const cleanupOldMap = () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (e) {}
        mapRef.current = null;
      }
      Object.values(markersRef.current).forEach((m) => { try { m.remove(); } catch (e) {} });
      markersRef.current = {};
      Object.values(removingMarkersRef.current).forEach((timer) => clearTimeout(timer));
      removingMarkersRef.current = {};
      setMapLoaded(false);
      setLoadProgress(0);
    };

    cleanupOldMap();

    let map: Map | null = null;
    let isDestroyed = false;

    const initMap = () => {
      if (isDestroyed || !elRef.current) return;

      map = new maplibregl.Map({
        container: elRef.current,
        style: styleUrl,
        center: SH_CENTER,
        zoom: 13.5,
        pitch: 55,
        bearing: -10,
        maxBounds: [[121.0, 30.8], [121.9, 31.6]],
        minZoom: 10,
        maxZoom: 18,
        attributionControl: false,
        // @ts-ignore
        preserveDrawingBuffer: true,
        failIfMajorPerformanceCaveat: false,
        transformRequest: (url) => ({
          url,
          headers: {
            "Accept-Encoding": "gzip, deflate, br",
            Referer: "https://amap.com/",
          },
        }),
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

      map.on("webglcontextlost", () => {
        setTimeout(() => {
          if (!isDestroyed) {
            setRecoverCount((prev) => prev + 1);
            onMapRecover?.();
            initMap();
          }
        }, 1000);
      });

      let loadedTiles = 0;
      let totalTiles = 0;
      const loadTimeout = setTimeout(() => {
        if (!mapLoaded && map && !isDestroyed) {
          addCustomLayers(map);
          updateRoute(map);
          if (places.length > 0) fitBoundsToPlaces(map, places);
        }
      }, 15000);

      map.on("dataloading", (e) => { if (e.dataType === "tile") totalTiles++; });
      map.on("data", (e) => {
        if (e.dataType === "tile") {
          loadedTiles++;
          const progress = Math.min(100, Math.round((loadedTiles / Math.max(totalTiles, 1)) * 100));
          setLoadProgress(progress);
        }
      });

      map.once("load", () => {
        clearTimeout(loadTimeout);
        if (isDestroyed || !map) return;
        map.resize();
        setTimeout(() => {
          if (!isDestroyed && mapRef.current) {
            mapRef.current.resize();
            if (places.length > 0) fitBoundsToPlaces(mapRef.current, places);
          }
        }, 100);
        setTimeout(() => {
          if (!isDestroyed && mapRef.current) mapRef.current.resize();
        }, 500);
        addCustomLayers(map);
        updateRoute(map);
        if (places.length > 0) fitBoundsToPlaces(map, places);
        const center = map.getCenter();
        onZoomChange?.(map.getZoom(), [center.lng, center.lat]);
      });

      map.on("zoomend", () => {
        if (!map) return;
        const center = map.getCenter();
        onZoomChange?.(map.getZoom(), [center.lng, center.lat]);
      });

      map.on("moveend", () => {
        if (!map) return;
        const center = map.getCenter();
        onZoomChange?.(map.getZoom(), [center.lng, center.lat]);
      });

      const markUserInteraction = () => {
        isUserInteractingRef.current = true;
        hasUserManuallyAdjustedViewRef.current = true;
        if (userInteractionTimerRef.current) clearTimeout(userInteractionTimerRef.current);
        userInteractionTimerRef.current = setTimeout(() => {
          isUserInteractingRef.current = false;
        }, 3000);
      };

      map.on("mousedown", markUserInteraction);
      map.on("touchstart", markUserInteraction);
      map.on("wheel", markUserInteraction);
      map.on("dragstart", markUserInteraction);

      map.on("error", (e) => {
        if (e.error && e.error.message && e.error.message.includes("tile")) return;
        console.error("地图错误:", e);
        setMapError(`地图加载失败: ${e.error?.message || "未知错误"}`);
      });

      mapRef.current = map;
    };

    initMap();

    let resizeObserver: ResizeObserver | null = null;
    if (elRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current && mapLoaded) mapRef.current.resize();
      });
      resizeObserver.observe(elRef.current);
    }

    return () => {
      isDestroyed = true;
      if (resizeObserver) resizeObserver.disconnect();
      if (userInteractionTimerRef.current) clearTimeout(userInteractionTimerRef.current);
      cleanupOldMap();
    };
  }, [styleUrl, recoverCount]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !placesLoaded || places.length === 0) return;
    map.resize();
    setTimeout(() => {
      if (mapRef.current && places.length > 0 && !hasUserManuallyAdjustedViewRef.current) {
        mapRef.current.resize();
        fitBoundsToPlaces(mapRef.current, places);
      }
    }, 100);
  }, [placesLoaded, mapLoaded]);

  useEffect(() => { placesRef.current = places; }, [places]);
  useEffect(() => { activeDayPlaceIdsRef.current = activeDayPlaceIds; }, [activeDayPlaceIds]);

  // ★ 修改：禁止初始化自动调整视野到当日景点
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // 如果是首次渲染，只记录 selectedDay，不调整视野
    if (lastSelectedDayRef.current === null) {
      lastSelectedDayRef.current = selectedDay;
      return;
    }

    if (lastSelectedDayRef.current === selectedDay) return;
    lastSelectedDayRef.current = selectedDay;

    const currentPlaces = placesRef.current;
    const currentActiveDayPlaceIds = activeDayPlaceIdsRef.current;
    if (currentPlaces.length === 0) return;

    hasUserManuallyAdjustedViewRef.current = false;
    const activeDayPlaces = currentPlaces.filter(p => currentActiveDayPlaceIds.includes(p.id));
    if (activeDayPlaces.length === 0) return;

    map.resize();
    const timer = setTimeout(() => {
      if (mapRef.current && !hasUserManuallyAdjustedViewRef.current) {
        mapRef.current.resize();
        fitBoundsToPlaces(mapRef.current, activeDayPlaces);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedDay, mapLoaded]);

  // 标记点渲染与状态更新（保持不变）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || places.length === 0) return;

    const currentPlaceIds = new Set(places.map((p) => p.id));
    const markersToRemove: string[] = [];

    Object.keys(markersRef.current).forEach((id) => {
      if (!currentPlaceIds.has(id)) markersToRemove.push(id);
    });

    markersToRemove.forEach((id) => {
      const marker = markersRef.current[id];
      if (marker) {
        if (removingMarkersRef.current[id]) {
          clearTimeout(removingMarkersRef.current[id]);
          delete removingMarkersRef.current[id];
        }
        const element = marker.getElement();
        element.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        element.style.opacity = "0";
        element.style.transform = "translateY(10px) scale(0.9)";
        delete markersRef.current[id];
        const timer = setTimeout(() => {
          try { marker.remove(); } catch (e) {}
          delete removingMarkersRef.current[id];
        }, 300);
        removingMarkersRef.current[id] = timer;
      }
    });

    const newPlaces = places.filter((p) => !markersRef.current[p.id]);

    newPlaces.forEach((place) => {
      if (removingMarkersRef.current[place.id]) {
        clearTimeout(removingMarkersRef.current[place.id]);
        delete removingMarkersRef.current[place.id];
        const existingMarker = markersRef.current[place.id];
        if (existingMarker) {
          const element = existingMarker.getElement();
          element.style.opacity = "1";
          element.style.transform = "translateY(0) scale(1)";
          return;
        }
      }

      const isActiveDay = activeDayPlaceIds.includes(place.id);
      const [gcjLon, gcjLat] = wgs84ToGcj02(place.lon, place.lat);

      const container = document.createElement("div");
      container.className = "relative group flex flex-col items-center place-marker";
      container.style.opacity = "0";
      container.style.transform = "translateY(10px) scale(0.9)";
      container.style.transition = "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
      container.style.willChange = "transform, opacity";

      const color = categoryColors[place.category] || categoryColors.other;
      const isFamous = FAMOUS_PLACES.some((p) => place.name.includes(p));
      const fontSize = isFamous ? "13px" : "11px";
      const padding = isFamous ? "6px 14px" : "4px 10px";

      const label = document.createElement("div");
      label.style.cssText = `
        padding: ${padding};
        border-radius: 100px;
        background: ${color.bg};
        color: ${color.text};
        font-size: ${fontSize};
        font-weight: 500;
        white-space: nowrap;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 15px ${color.shadow};
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform: scale(1);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        gap: 6px;
      `;

      const dot = document.createElement("span");
      dot.style.cssText = `
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: white;
        opacity: ${isActiveDay ? "1" : "0.6"};
        box-shadow: ${isActiveDay ? "0 0 8px white" : "none"};
      `;
      label.appendChild(dot);
      label.appendChild(document.createTextNode(place.name));

      label.addEventListener("mouseenter", () => {
        label.style.transform = "scale(1.1) translateY(-4px)";
        label.style.boxShadow = `0 8px 25px ${color.shadow}`;
        label.style.background = color.bg.replace("0.75", "0.9");
        preloadPlaceIntroduction(place, aiModel);
      });

      label.addEventListener("mouseleave", () => {
        cancelPreload(place.id);
        const isHighlighted = place.id === selectedId;
        label.style.transform = isHighlighted ? "scale(1.15) translateY(-4px)" : "scale(1) translateY(0)";
        label.style.boxShadow = isHighlighted ? `0 10px 30px ${color.shadow}` : `0 4px 15px ${color.shadow}`;
      });

      if (place.id === selectedId) {
        label.style.transform = "scale(1.15) translateY(-4px)";
        label.style.boxShadow = `0 10px 30px ${color.shadow}`;
        label.style.borderColor = "rgba(255, 255, 255, 0.5)";
      }

      container.appendChild(label);

      const pin = document.createElement("div");
      pin.style.cssText = `
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid ${color.bg};
        margin-top: -1px;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.1));
      `;
      container.appendChild(pin);

      label.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        isClickingMarkerRef.current = true;
        setTimeout(() => { isClickingMarkerRef.current = false; }, 100);
        onSelect?.(place.id);
      });

      const marker = new maplibregl.Marker({
        element: container,
        anchor: "bottom",
      })
        .setLngLat([gcjLon, gcjLat])
        .addTo(map);

      marker.getElement().style.zIndex = isActiveDay ? "1001" : "1000";
      markersRef.current[place.id] = marker;

      const showMarker = () => {
        container.style.opacity = "1";
        container.style.transform = "translateY(0) scale(1)";
      };
      requestAnimationFrame(showMarker);
      setTimeout(showMarker, 50);
    });

    places.forEach((place) => {
      const marker = markersRef.current[place.id];
      if (!marker) return;

      const element = marker.getElement();
      const label = element.firstChild as HTMLDivElement;
      const color = categoryColors[place.category] || categoryColors.other;
      const isActiveDay = activeDayPlaceIds.includes(place.id);

      element.style.zIndex = place.id === selectedId ? "1002" : isActiveDay ? "1001" : "1000";

      if (place.id === selectedId) {
        label.style.transform = "scale(1.15) translateY(-4px)";
        label.style.boxShadow = `0 10px 30px ${color.shadow}`;
        label.style.borderColor = "rgba(255, 255, 255, 0.5)";
      } else {
        label.style.transform = "scale(1) translateY(0)";
        label.style.boxShadow = `0 4px 15px ${color.shadow}`;
        label.style.borderColor = isActiveDay ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.2)";
      }
    });
  }, [places, activeDayPlaceIds, selectedId, dark, onSelect, aiModel, mapLoaded]);

  // 移除 focusedPlaceId 的相关效果

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !selectedId) return;

    const currentPlaces = placesRef.current;
    const selected = currentPlaces.find((p) => p.id === selectedId);
    if (!selected) return;

    const [gcjLon, gcjLat] = wgs84ToGcj02(selected.lon, selected.lat);
    if (map.isMoving()) map.stop();
    map.easeTo({
      center: [gcjLon, gcjLat],
      zoom: Math.max(map.getZoom(), 14.5),
      duration: 1000,
      pitch: 55,
      essential: true,
    });
  }, [selectedId, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (map.isStyleLoaded()) updateRoute(map);
    else map.once("idle", () => updateRoute(map));
  }, [route, showRoute, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !animate) return;
    let raf = 0;
    const tick = () => {
      if (!mapRef.current) return;
      const b = map.getBearing();
      map.setBearing(b + 0.015);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  const selectedPlace = useMemo(() => {
    return places.find((p) => p.id === selectedId);
  }, [places, selectedId]);

  return (
    <div className="relative h-full w-full group/map">
      <div
        ref={elRef}
        className={`maplibre-map w-full h-full rounded-[2.5rem] overflow-hidden border-2 shadow-2xl transition-all duration-700 ${
          dark ? "border-white/10 bg-[#0a0c10] shadow-black/60" : "border-slate-200 bg-white shadow-slate-200/50"
        }`}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .mapboxgl-ctrl-group, .maplibregl-ctrl-group {
          background: rgba(15, 23, 42, 0.6) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
          overflow: hidden;
        }
        .mapboxgl-ctrl-group button, .maplibregl-ctrl-group button {
          width: 32px !important;
          height: 32px !important;
          border-color: rgba(255, 255, 255, 0.05) !important;
        }
        .mapboxgl-ctrl-icon, .maplibregl-ctrl-icon {
          filter: invert(1) brightness(1.5);
          opacity: 0.7;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); }
        @keyframes slideInRight {
          0% { opacity: 0; transform: translateX(40px) scale(0.95); }
          60% { opacity: 1; transform: translateX(-5px) scale(1.01); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}} />

      {(!mapLoaded || !placesLoaded) && !mapError && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center z-50 rounded-[2.5rem] overflow-hidden ${dark ? "bg-[#0a0c10]/90 text-gray-200" : "bg-white/90 text-slate-600"} backdrop-blur-md`}>
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full animate-ping" />
            <div className="absolute inset-2 border-2 border-indigo-500/40 rounded-full animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Navigation className="w-8 h-8 text-indigo-400 animate-bounce" />
            </div>
          </div>
          <div className="text-lg font-medium tracking-widest uppercase mb-4 opacity-80">Initializing Shanghai Map</div>
          <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-500 ease-out" style={{ width: `${loadProgress}%` }} />
          </div>
          <div className="text-xs mt-3 font-mono opacity-40">{loadProgress}%</div>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center z-50 p-8 bg-black/40 backdrop-blur-xl rounded-[2.5rem]">
          <div className="max-w-md bg-[#161b22] border border-red-500/30 rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Info className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Map Engine Error</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">{mapError}</p>
            <div className="flex gap-4">
              <button onClick={() => setRecoverCount((prev) => prev + 1)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-medium active:scale-95">Attempt Recovery</button>
              <button onClick={() => window.location.reload()} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-medium border border-white/10">Reload Page</button>
            </div>
          </div>
        </div>
      )}

      <div className={`place-info-box absolute top-6 right-6 bottom-6 w-[420px] pointer-events-none z-[1003] transition-all duration-500 ease-out ${
        selectedId && selectedPlace ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
      }`}>
        {selectedId && selectedPlace && (
          <div className={`w-full h-full rounded-[2rem] shadow-2xl pointer-events-auto overflow-hidden flex flex-col ${
            dark ? "bg-[#0d1117]/70 backdrop-blur-2xl border border-white/10 text-white shadow-black/60" : "bg-white/80 backdrop-blur-2xl border border-slate-200 text-slate-900 shadow-slate-200/50"
          }`}>
            <div className="relative p-6 pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 pr-8">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md ${dark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-50/50 text-indigo-600"}`}>
                      {formatCategory(selectedPlace.category)}
                    </span>
                    {activeDayPlaceIds.includes(selectedPlace.id) && (
                      <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 flex items-center gap-1">
                        <span className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
                        Scheduled Today
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-serif font-medium tracking-tight leading-tight">{selectedPlace.name}</h3>
                </div>
                <button onClick={() => { onSelect?.(null); setIntroduction(""); }} className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${dark ? "bg-white/5 hover:bg-white/10 border border-white/5" : "bg-slate-100 hover:bg-slate-200"}`}>
                  <X className="w-5 h-5 opacity-60" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-8 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-2xl ${dark ? "bg-white/5 border border-white/5" : "bg-slate-50 border border-slate-100"}`}>
                  <div className="flex items-center gap-2 text-indigo-400 mb-1 opacity-80">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Business Hours</span>
                  </div>
                  <div className="text-sm font-medium opacity-90 truncate">{formatOpeningHours(selectedPlace.openingHours)}</div>
                </div>
                <div className={`p-4 rounded-2xl ${dark ? "bg-white/5 border border-white/5" : "bg-slate-50 border border-slate-100"}`}>
                  <div className="flex items-center gap-2 text-indigo-400 mb-1 opacity-80">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Admission</span>
                  </div>
                  <div className="text-sm font-medium opacity-90 truncate">{formatTicket(selectedPlace.ticketCny)}</div>
                </div>
              </div>

              <div className="space-y-3">
                {selectedPlace.address && (
                  <div className="flex gap-3">
                    <MapPin className="w-4 h-4 shrink-0 text-gray-500 mt-0.5" />
                    <div className="text-sm text-gray-400 leading-relaxed">{selectedPlace.address}</div>
                  </div>
                )}
                {trafficInfo && (
                  <div className="flex gap-3">
                    <Navigation className="w-4 h-4 shrink-0 text-gray-500 mt-0.5" />
                    <div className="text-sm text-gray-400 leading-relaxed italic">{trafficInfo}</div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">Spot Overview</span>
                  </div>
                  <div className="text-[10px] font-mono opacity-30">{aiModel.toUpperCase()} ENGINE</div>
                </div>

                {introLoading && !introduction && (
                  <div className="py-4 space-y-2">
                    <div className="h-3 w-full bg-white/5 rounded-full animate-pulse" />
                    <div className="h-3 w-5/6 bg-white/5 rounded-full animate-pulse" />
                    <div className="h-3 w-4/6 bg-white/5 rounded-full animate-pulse" />
                  </div>
                )}

                {introError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{introError}</div>
                )}

                {introduction && (
                  <div className="text-sm leading-relaxed text-gray-300 font-light tracking-wide space-y-4">
                    <div className="whitespace-pre-wrap">
                      {introduction}
                      {introLoading && <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-1 animate-pulse align-middle" />}
                    </div>
                  </div>
                )}
              </div>

              {selectedPlace.nearbyFoods && selectedPlace.nearbyFoods.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <Utensils className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">Gastronomy Nearby</span>
                  </div>
                  <div className="space-y-3">
                    {selectedPlace.nearbyFoods.slice(0, 3).map((food: FoodMerchant) => (
                      <div key={food.id} className={`p-4 rounded-2xl transition-all hover:bg-white/5 border border-transparent hover:border-white/5 group/card ${dark ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{food.name}</span>
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-[10px] font-bold">{food.score} ★</div>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2">
                          <span>¥{food.avgPrice || "Market Price"}/person</span>
                          <span className="w-1 h-1 bg-gray-700 rounded-full" />
                          <span>{food.distance}m Away</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {food.hotDishes?.slice(0, 2).map((dish: string, i: number) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded-md text-gray-400">{dish}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedPlace.nearbyHotels && selectedPlace.nearbyHotels.length > 0) || selectedPlace.hotelLoading ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <HotelIcon className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">Accommodations</span>
                  </div>
                  {selectedPlace.hotelLoading ? (
                    <div className="py-8 text-center">
                      <div className="inline-block w-5 h-5 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin mb-2" />
                      <div className="text-[10px] uppercase tracking-widest opacity-40">Searching best stays...</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPlace.nearbyHotels?.slice(0, 3).map((hotel: Hotel) => (
                        <div key={hotel.id} className={`p-4 rounded-2xl transition-all hover:bg-white/5 border border-transparent hover:border-white/5 ${dark ? "bg-white/[0.03]" : "bg-slate-50"}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{hotel.name}</span>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold">{hotel.score} ★</div>
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-indigo-400 font-semibold italic">¥{isNaN(hotel.price) || hotel.price <= 0 ? "200" : hotel.price}+</span>
                              <span className="w-1 h-1 bg-gray-700 rounded-full" />
                              <span>{hotel.distance}m</span>
                              <span className="w-1 h-1 bg-gray-700 rounded-full" />
                              <span className="opacity-60">{hotel.brand}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {parkingInfo.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <ParkingCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">Nearby Parking</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {parkingLoading ? (
                      <div className="py-2 text-center text-[10px] opacity-40 animate-pulse">Scanning nearby lots...</div>
                    ) : (
                      parkingInfo.slice(0, 3).map((parking: any) => (
                        <div key={parking.id} className="flex items-center justify-between text-[11px] text-gray-400 p-2 hover:bg-white/5 rounded-lg transition-colors">
                          <span>{parking.name}</span>
                          <span className="opacity-60">{parking.distance}m</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className={`p-4 border-t ${dark ? "border-white/5 bg-black/20" : "border-slate-100 bg-slate-50"}`}>
              <button
                onClick={() => selectedPlace && onAddToTrip && onAddToTrip(selectedPlace)}
                disabled={activeDayPlaceIds.includes(selectedPlace?.id || "")}
                className={cn(
                  "w-full py-3 rounded-xl font-semibold text-sm shadow-lg transition-all duration-300 flex items-center justify-center gap-2",
                  activeDayPlaceIds.includes(selectedPlace?.id || "")
                    ? "bg-gray-500/50 text-gray-300 cursor-not-allowed shadow-gray-500/10"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-[0.98]"
                )}
              >
                {activeDayPlaceIds.includes(selectedPlace?.id || "")
                  ? `✓ 已添加到第${selectedDay}天`
                  : `+ 添加到第${selectedDay}天行程`
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
