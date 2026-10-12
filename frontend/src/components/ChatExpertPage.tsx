import { useState, useEffect, useRef, useCallback, Component, ReactNode } from "react";
import { cn } from "../utils/cn";
import {
  CloudSun,
  Wind,
  Droplets,
  Sun,
  Calendar,
  CloudRain,
  Send,
  ChevronDown,
  Sunset,
  Trash2,
  Cpu,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Activity
} from "lucide-react";
import { askShanghaiExpert } from "../lib/chatExpert";
import { getLiveWeather, getForecastWeather, type ForecastDayData } from "../lib/amap";
import { motion, AnimatePresence } from "framer-motion";
import GradualBlur from "./GradualBlur";
import Orb from "./Orb";

type ChatMessage = {
  role: "user" | "expert";
  content: string;
  source?: "internet" | "local" | "both";
  timestamp: string;
};

// 天气 TS 类型
interface LiveWeather {
  weather: string;
  temperature: string;
  feelsLike?: string;
  winddirection: string;
  windpower: string;
  humidity: string;
  reporttime: string;
}

interface ForecastItem {
  week: string;
  dayweather: string;
  nightweather: string;
  daytemp: string;
  nighttemp: string;
}

interface WeatherState {
  live: LiveWeather | null;
  forecast: ForecastItem[];
}

// ==================== 申城四境天气常态知识库 ====================
const SPOT_KNOWLEDGE = {
  bund: {
    name: "外滩景区",
    english: "The Bund",
    weather: "清风微凉 • 夜景极佳",
    temperature: "22",
    feelsLike: "21",
    winddirection: "东南",
    windpower: "4",
    humidity: "50",
    comfort: "适中",
    comfortColor: "text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]",
    tips: "黄浦江边风力稍大，入夜登岸观景体感温凉，建议加穿一件防风薄外套。外滩万国建筑群景观灯开启时间：18:00-22:00。",
    aqi: 42,
    forecast: [
      { week: "1", dayweather: "晴转多云", nightweather: "多云", daytemp: "23", nighttemp: "15" },
      { week: "2", dayweather: "多云转小雨", nightweather: "小雨", daytemp: "20", nighttemp: "14" },
      { week: "3", dayweather: "小雨", nightweather: "阴", daytemp: "18", nighttemp: "13" },
      { week: "4", dayweather: "多云", nightweather: "晴", daytemp: "21", nighttemp: "12" },
    ]
  },
  disney: {
    name: "迪士尼乐园",
    english: "Disneyland",
    weather: "微风和煦 • 宜游玩",
    temperature: "24",
    feelsLike: "25",
    winddirection: "东",
    windpower: "2",
    humidity: "45",
    comfort: "舒适",
    comfortColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    tips: "全天户外漫步条件优越，午间紫外线较强，请做好防晒。奇幻童话城堡夜光幻影秀预计于晚间 20:00 准时上演。",
    aqi: 35,
    forecast: [
      { week: "1", dayweather: "晴朗", nightweather: "晴", daytemp: "25", nighttemp: "16" },
      { week: "2", dayweather: "多云", nightweather: "阴", daytemp: "22", nighttemp: "15" },
      { week: "3", dayweather: "阴转小雨", nightweather: "小雨", daytemp: "19", nighttemp: "14" },
      { week: "4", dayweather: "多云", nightweather: "晴", daytemp: "23", nighttemp: "13" },
    ]
  },
  lujiazui: {
    name: "陆家嘴金融区",
    english: "Lujiazui",
    weather: "云高气爽 • 宜登高",
    temperature: "21",
    feelsLike: "20",
    winddirection: "北",
    windpower: "3",
    humidity: "48",
    comfort: "适中",
    comfortColor: "text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]",
    tips: "高空云底高度佳，折射率低。上海中心大厦、环球金融中心或金茂大厦观光厅视野十分开阔，极适宜鸟瞰城市天际线。",
    aqi: 46,
    forecast: [
      { week: "1", dayweather: "晴空", nightweather: "多云", daytemp: "22", nighttemp: "14" },
      { week: "2", dayweather: "多云转阴", nightweather: "小雨", daytemp: "19", nighttemp: "13" },
      { week: "3", dayweather: "小雨", nightweather: "阴", daytemp: "17", nighttemp: "12" },
      { week: "4", dayweather: "多云", nightweather: "晴", daytemp: "20", nighttemp: "11" },
    ]
  },
  hengfu: {
    name: "衡复历史风貌区",
    english: "Hengfu Area",
    weather: "梧桐静谧 • 宜漫步",
    temperature: "22",
    feelsLike: "22",
    winddirection: "微风",
    windpower: "1",
    humidity: "42",
    comfort: "极佳",
    comfortColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    tips: "衡山路、武康路林荫街区微气候怡人，树木遮阳效果佳，风速极其温和，非常适合慢节奏的咖啡馆漫步与人文探索。",
    aqi: 30,
    forecast: [
      { week: "1", dayweather: "晴转多云", nightweather: "多云", daytemp: "23", nighttemp: "15" },
      { week: "2", dayweather: "多云", nightweather: "多云", daytemp: "21", nighttemp: "14" },
      { week: "3", dayweather: "多云转阴", nightweather: "阴", daytemp: "19", nighttemp: "13" },
      { week: "4", dayweather: "阴转晴", nightweather: "晴", daytemp: "22", nighttemp: "12" },
    ]
  }
};

// ==================== 错误边界组件 ====================
interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("天气模块渲染异常:", error);
    console.error("组件调用栈:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ==================== 天气组件 ====================
function AppleWeatherWidget() {
  const [time, setTime] = useState<Date>(new Date());
  const [weatherData, setWeatherData] = useState<WeatherState>({
    live: null,
    forecast: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // 实时时钟
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const formatTimeHour = (date: Date) => String(date.getHours()).padStart(2, "0");
  const formatTimeMinute = (date: Date) => String(date.getMinutes()).padStart(2, "0");
  const formatTimeSecond = (date: Date) => String(date.getSeconds()).padStart(2, "0");

  const getWeekText = (weekNum: string): string => {
    const map: Record<string, string> = {
      "1": "周一",
      "2": "周二",
      "3": "周三",
      "4": "周四",
      "5": "周五",
      "6": "周六",
      "7": "周日"
    };
    return map[weekNum] || weekNum;
  };

  const getWeatherIcon = (weatherText?: string, size = "w-7 h-7") => {
    if (!weatherText || typeof weatherText !== "string") {
      return <CloudSun className={`${size} text-slate-300`} />;
    }
    if (weatherText.includes("晴")) return <Sun className={`${size} text-amber-400`} />;
    if (weatherText.includes("雨")) return <CloudRain className={`${size} text-blue-400`} />;
    if (weatherText.includes("云") || weatherText.includes("阴")) return <CloudSun className={`${size} text-slate-300`} />;
    return <CloudSun className={`${size} text-slate-300`} />;
  };

  // 高德API返回的风力数字转中文级别描述
  const windPowerToLevel = (power: string): string => {
    const num = parseInt(power);
    if (isNaN(num)) return power;
    if (num <= 1) return "1";
    if (num <= 2) return "2";
    if (num <= 3) return "3";
    if (num <= 4) return "4";
    if (num <= 5) return "5";
    if (num <= 6) return "6";
    if (num <= 7) return "7";
    return "8";
  };

  // 风向中文转更简洁的单字描述
  const simplifyWindDirection = (dir: string): string => {
    if (!dir) return "无";
    if (dir === "东北") return "东北";
    if (dir === "东南") return "东南";
    if (dir === "西北") return "西北";
    if (dir === "西南") return "西南";
    if (dir === "北") return "北";
    if (dir === "南") return "南";
    if (dir === "东") return "东";
    if (dir === "西") return "西";
    return dir;
  };

  // 从高德API拉取真实气象数据
  const fetchWeather = useCallback(async () => {
    setLoading(true);
    try {
      // 并行请求实时天气和天气预报
      const [liveData, forecastData] = await Promise.all([
        getLiveWeather("310100"), // 上海城市编码
        getForecastWeather("310100")
      ]);

      // 如果API返回数据为空，使用降级数据
      if (!liveData || forecastData.length === 0) {
        console.warn("⚠️ 高德天气API返回空数据，使用本地降级数据");
        const info = SPOT_KNOWLEDGE.bund;
        setWeatherData({
          live: {
            weather: info.weather.split(" • ")[0],
            temperature: info.temperature,
            feelsLike: info.feelsLike,
            winddirection: info.winddirection,
            windpower: info.windpower,
            humidity: info.humidity,
            reporttime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          },
          forecast: info.forecast
        });
        setError("");
        return;
      }

      // 转换实时天气数据
      const liveWeather: LiveWeather = {
        weather: liveData.weather,
        temperature: liveData.temperature,
        feelsLike: liveData.temperature, // 高德免费版没有体感温度，用实际温度代替
        winddirection: simplifyWindDirection(liveData.winddirection),
        windpower: windPowerToLevel(liveData.windpower),
        humidity: liveData.humidity,
        reporttime: liveData.reporttime 
          ? new Date(liveData.reporttime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };

      // 转换预报数据（取前4天）
      const forecast: ForecastItem[] = forecastData.slice(0, 4).map((item: ForecastDayData) => ({
        week: item.week,
        dayweather: item.dayweather,
        nightweather: item.nightweather,
        daytemp: item.daytemp,
        nighttemp: item.nighttemp
      }));

      setWeatherData({
        live: liveWeather,
        forecast
      });
      setError("");
    } catch (err) {
      console.error("❌ 获取天气数据失败:", err);
      // API调用失败时使用降级数据，保证用户体验
      const info = SPOT_KNOWLEDGE.bund;
      setWeatherData({
        live: {
          weather: info.weather.split(" • ")[0],
          temperature: info.temperature,
          feelsLike: info.feelsLike,
          winddirection: info.winddirection,
          windpower: info.windpower,
          humidity: info.humidity,
          reporttime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        },
        forecast: info.forecast
      });
      setError(""); // 不显示错误，静默降级
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    // 30分钟轮询刷新
    const refreshTimer = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(refreshTimer);
  }, [fetchWeather]);

  return (
    <div className="w-full relative overflow-hidden rounded-[2.5rem] bg-[#0A0D1E]/90 border border-white/[0.08] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] backdrop-blur-3xl">
      {/* 渐变装饰背景 */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="relative p-6 sm:p-10 flex flex-col xl:flex-row gap-10">
        <div className="flex-1 flex flex-col justify-between">
          
          {/* 顶栏：标题与现代苹果电子时钟 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/[0.06] pb-6">
            <div className="flex items-center gap-3">
              <h4 className="text-3xl font-extrabold text-white tracking-wider font-sans">
                上海市
              </h4>
              <span className="text-xs bg-indigo-500/15 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30 font-sans font-medium tracking-wide backdrop-blur-md">
                智能文旅微气象
              </span>
            </div>
            
            {/* 实时更新时间 - 固定宽度 彻底消除数字跳动 */}
            <div className="flex items-center gap-5 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-6 py-3 shadow-2xl backdrop-blur-md hover:border-indigo-500/50 hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] transition-all duration-500">
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-indigo-400 font-extrabold tracking-[0.25em] uppercase font-sans">
                  SHANGHAI STANDARD TIME
                </span>
                <span className="text-xs text-slate-300 font-medium font-sans tracking-wider mt-1">
                  {formatDate(time)}
                </span>
              </div>
              <div className="w-px h-10 bg-white/[0.12]" />
              {/* 数字全部固定等宽 外框完全不跳动 */}
              <div className="flex items-baseline font-mono font-tabular-nums text-3xl sm:text-4xl font-black tracking-tight text-white select-none filter drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]">
                <span className="w-[2.5ch] text-center bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  {formatTimeHour(time)}
                </span>
                <span className="text-indigo-400 mx-1 animate-pulse font-light">:</span>
                <span className="w-[2.5ch] text-center bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  {formatTimeMinute(time)}
                </span>
                <span className="text-indigo-400 mx-1 animate-pulse font-light">:</span>
                <span className="w-[2.5ch] text-center text-indigo-300/90 text-xl font-light font-sans">
                  {formatTimeSecond(time)}
                </span>
              </div>
            </div>
          </div>

          {/* 实时气象数据渲染区 */}
          <div className="relative min-h-[14rem] my-6 flex items-center">
            {loading ? (
              <div className="w-full py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-500 font-light tracking-widest">
                  正在获取上海实时微气象中...
                </span>
              </div>
            ) : error || !weatherData.live ? (
              <div className="w-full text-center py-12">
                <span className="text-rose-400 text-sm">{error || "气象数据同步失败"}</span>
              </div>
            ) : (
              <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-8 animate-fadeIn">
                
                {/* 核心气温与状态（左） */}
                <div className="flex items-center gap-6 sm:gap-8 shrink-0">
                  <div className="relative">
                    <div className="text-8xl sm:text-9xl font-extralight font-mono tracking-tighter bg-gradient-to-r from-slate-100 via-amber-100 to-indigo-200 bg-clip-text text-transparent filter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] leading-none">
                      {weatherData.live.temperature}
                    </div>
                    <span className="absolute -top-1 -right-6 text-indigo-400/80 font-light text-5xl sm:text-6xl select-none font-mono">°</span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <div className="animate-bounce-slow shrink-0">
                      {getWeatherIcon(weatherData.live.weather, "w-16 h-16")}
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-100 tracking-wide font-sans">{weatherData.live.weather}</div>
                      <div className="text-xs text-slate-400 font-light mt-1 font-mono">
                        体感温度 {weatherData.live.feelsLike || weatherData.live.temperature}°
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4日微气象预报 - 整体放大优化 */}
                <div className="flex flex-col gap-5 max-w-md w-full">
                  <div className="text-sm font-bold uppercase tracking-[0.15em] text-indigo-300/80 flex items-center gap-2 font-sans">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    4日微气象预报
                  </div>
                  
                  <div className="flex flex-col gap-5">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="flex items-center justify-between animate-pulse py-2">
                          <div className="w-12 h-4 bg-white/5 rounded" />
                          <div className="w-16 h-8 bg-white/5 rounded-full" />
                          <div className="w-36 h-2 bg-white/5 rounded" />
                        </div>
                      ))
                    ) : (
                      weatherData.forecast.map((item, index) => (
                        <div key={index} className="flex items-center justify-between group py-2">
                          <span className="w-12 text-sm text-slate-300 font-semibold font-sans">
                            {index === 0 ? "今天" : getWeekText(item.week)}
                          </span>
                          
                          <div className="flex items-center gap-3">
                            {getWeatherIcon(item.dayweather, "w-7 h-7 transition-transform duration-500 group-hover:scale-110")}
                            <span className="w-20 text-sm text-slate-400 text-left font-sans truncate">
                              {item.dayweather}
                            </span>
                          </div>

                          {/* iOS 风格横向进度条 - 加高加宽 */}
                          <div className="flex items-center gap-2 w-36 justify-end">
                            <span className="text-sm text-slate-500 font-mono w-8 text-right">{item.nighttemp}°</span>
                            <div className="relative flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden">
                              <div
                                className="absolute h-full bg-gradient-to-r from-blue-400/70 via-indigo-400/80 to-amber-400/70 rounded-full"
                                style={{
                                  left: `${((Number(item.nighttemp) - 10) / 16) * 100}%`,
                                  width: `${((Number(item.daytemp) - Number(item.nighttemp)) / 16) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm text-slate-200 font-bold font-mono w-8 text-left">{item.daytemp}°</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* 四项微观环境指标 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            {/* 体感温度 */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
              <span className="text-[11px] text-slate-400 font-light tracking-wide flex items-center gap-2 mb-2 font-sans">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                体感温度
              </span>
              <div className="text-xl font-bold text-slate-100 font-mono tracking-wide">
                {!loading && weatherData.live ? `${weatherData.live.feelsLike || weatherData.live.temperature}°` : "--"}
              </div>
              <div className="text-[10px] text-slate-500 mt-2 font-sans">
                {!loading && weatherData.live ? "实时感知温度" : "--"}
              </div>
            </div>

            {/* 风力 */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
              <span className="text-[11px] text-slate-400 font-light tracking-wide flex items-center gap-2 mb-2 font-sans">
                <Wind className="w-3.5 h-3.5 text-blue-400" />
                微风环境
              </span>
              <div className="text-xl font-bold text-slate-100 font-sans tracking-wide">
                {!loading && weatherData.live ? `${weatherData.live.windpower} 级` : "--"}
              </div>
              <div className="text-[10px] text-slate-500 mt-2 font-sans">
                {!loading && weatherData.live ? `${weatherData.live.winddirection}风` : "--"}
              </div>
            </div>

            {/* 湿度 */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
              <span className="text-[11px] text-slate-400 font-light tracking-wide flex items-center gap-2 mb-2 font-sans">
                <Droplets className="w-3.5 h-3.5 text-indigo-400" />
                空气湿度
              </span>
              <div className="text-xl font-bold text-slate-100 font-mono tracking-wide">
                {!loading && weatherData.live ? `${weatherData.live.humidity}%` : "--"}
              </div>
              <div className="w-full h-1 bg-slate-800/80 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{ width: !loading && weatherData.live ? `${weatherData.live.humidity}%` : "0%" }} />
              </div>
            </div>

            {/* 日温差 */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
              <span className="text-[11px] text-slate-400 font-light tracking-wide flex items-center gap-2 mb-2 font-sans">
                <Sunset className="w-3.5 h-3.5 text-amber-500" />
                日间气温
              </span>
              <div className="text-xl font-bold text-slate-100 font-mono tracking-wide">
                {weatherData.forecast[0]?.daytemp || "--"}°
              </div>
              <div className="text-[10px] text-slate-500 mt-2 font-sans">
                夜间低至 {weatherData.forecast[0]?.nighttemp || "--"}°
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  loading: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
  placeholder?: string;
  mode?: 'fast' | 'agent';
  onModeChange?: (mode: 'fast' | 'agent') => void;
  showModeSelector?: boolean;
}

const SearchBar = ({ value, onChange, onSend, loading, inputRef, autoFocus, placeholder, mode = 'fast', onModeChange, showModeSelector = true }: SearchBarProps) => {
  const [modeDrawerOpen, setModeDrawerOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 w-full bg-[#0D1122]/75 border border-white/[0.08] rounded-full p-2 pr-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-3xl focus-within:border-indigo-500/40 focus-within:bg-[#0F142A]/90 focus-within:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all duration-500">
      {/* 小星星按钮 + 模式选择抽屉 */}
      {showModeSelector && (
        <div className="relative flex items-center">
          <button
            onClick={() => setModeDrawerOpen(!modeDrawerOpen)}
            className="pl-4 pr-2 py-2 flex items-center gap-1.5 hover:bg-white/5 rounded-l-full transition-all duration-300 group"
            title="切换回答模式"
          >
            <Sparkles className={cn(
              "w-5 h-5 transition-all duration-300",
              modeDrawerOpen ? "text-indigo-300 scale-110" : "text-indigo-400/70 group-hover:text-indigo-300 animate-pulse"
            )} />
            {/* 当前模式标签 */}
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-md transition-all duration-300",
              mode === 'fast' 
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25" 
                : "bg-violet-500/15 text-violet-300 border border-violet-500/25"
            )}>
              {mode === 'fast' ? '极速' : 'Agent'}
            </span>
          </button>

          {/* 横向抽屉动效 - 模式选择 */}
          <AnimatePresence>
            {modeDrawerOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0, x: -10 }}
                animate={{ width: 'auto', opacity: 1, x: 0 }}
                exit={{ width: 0, opacity: 0, x: -10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 overflow-hidden"
              >
                <div className="flex items-center gap-1 px-3 py-2 rounded-full bg-[#0D1122]/95 border border-white/[0.1] backdrop-blur-xl shadow-2xl">
                  <button
                    onClick={() => {
                      onModeChange?.('fast');
                      setModeDrawerOpen(false);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap",
                      mode === 'fast'
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <span>⚡</span>
                    <span>极速模式</span>
                  </button>
                  <button
                    onClick={() => {
                      onModeChange?.('agent');
                      setModeDrawerOpen(false);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap",
                      mode === 'agent'
                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <span>🤖</span>
                    <span>Agent模式</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!showModeSelector && (
        <div className="pl-4">
          <Sparkles className="w-5 h-5 text-indigo-400/70 animate-pulse" />
        </div>
      )}

      <input
        ref={autoFocus ? inputRef : null}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSend()}
        disabled={loading}
        className="flex-1 h-12 md:h-14 bg-transparent border-none text-base outline-none tracking-wide text-white placeholder-slate-500 font-sans font-light"
        placeholder={placeholder || "例如：“外滩最新灯光秀时间”"}
      />
      <button
        onClick={onSend}
        disabled={loading || !value.trim()}
        className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 disabled:bg-white/5 disabled:text-slate-600 flex items-center justify-center transition-all duration-300 disabled:opacity-50 active:scale-95 cursor-pointer shrink-0 shadow-lg"
      >
        <Send className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />
      </button>
    </div>
  );
};

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [currentMode, setCurrentMode] = useState<"fast" | "agent">("fast");
  const [isDegraded, setIsDegraded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const weatherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    // 页面加载完成后强制滚动到顶部
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (inputRef.current && !loading) {
      inputRef.current.focus();
    }
  }, [loading]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  // 执行单次问答
  const executeChat = useCallback(async (query: string, mode: 'fast' | 'agent') => {
    const generator = askShanghaiExpert(query, mode);
    let fullContent = "";
    let hasError = false;

    for await (const chunk of generator) {
      // 状态更新
      if (chunk.startsWith("🔍") || chunk.startsWith("🌐") || chunk.startsWith("📚") || chunk.startsWith("⚡") || chunk.startsWith("🤖") || chunk.startsWith("🔧") || chunk.startsWith("🧠")) {
        setStatusMessage(chunk.replace("\n", ""));
        continue;
      }

      // 清除序列
      if (chunk.includes("\x1B\[1A\x1B\[K")) {
        const reg = /\x1B\[1A\x1B\[K/g;
        const matchResult = chunk.match(reg);
        const clearCount = matchResult ? matchResult.length : 0;

        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (!lastMessage || lastMessage.role !== "expert") return prev;
          const lines = lastMessage.content.split("\n");
          const content = lines.slice(0, -clearCount).join("\n");
          return [...prev.slice(0, -1), { ...lastMessage, content }];
        });
        setStatusMessage("");
        continue;
      }

      fullContent += chunk;
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (!lastMessage || lastMessage.role !== "expert") return prev;
        
        let source: ChatMessage["source"] = undefined;
        if (fullContent.includes("互联网最新信息 + 上海本地知识库")) {
          source = "both";
        } else if (fullContent.includes("互联网最新信息")) {
          source = "internet";
        } else if (fullContent.includes("上海本地知识库") || fullContent.includes("RAG")) {
          source = "local";
        }
        return [...prev.slice(0, -1), { ...lastMessage, content: fullContent, source }];
      });
    }

    // 检测是否有错误
    if (fullContent.includes("❌ 服务异常") || fullContent.includes("❌ 回答失败")) {
      hasError = true;
    }

    return { fullContent, hasError };
  }, []);

  // 发送消息 - 支持Agent失败自动降级到极速模式
  const handleSend = useCallback(async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    setInputValue("");
    const timeStr = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

    setChatStarted(true);
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: query, timestamp: timeStr }];
    setMessages(newMessages);
    setLoading(true);
    setIsDegraded(false);
    setStatusMessage("⚡ 正在启动双引擎检索系统...");

    const messagesWithPlaceholder: ChatMessage[] = [
      ...newMessages,
      { role: "expert", content: "", timestamp: timeStr }
    ];
    setMessages(messagesWithPlaceholder);
    setTimeout(scrollToBottom, 100);

    try {
      // 第一次尝试：使用用户选择的模式
      const result = await executeChat(query, currentMode);

      // 如果Agent模式失败，自动降级到极速模式
      if (result.hasError && currentMode === 'agent') {
        setIsDegraded(true);
        setStatusMessage("⏰ Agent响应超时，正在自动切换到极速模式...");
        
        // 清除错误消息，重新添加占位符
        setMessages(prev => {
          const withoutError = [...prev.slice(0, -1)];
          return [...withoutError, { role: "expert", content: "", timestamp: timeStr }];
        });

        // 用极速模式重试
        await executeChat(query, 'fast');
      }
    } catch (err) {
      // 如果还有错误，显示错误信息
      setMessages(prev => [
        ...prev.slice(0, -1),
        {
          role: "expert",
          content: `❌ 回答失败，请重试：${(err as Error).message}`,
          timestamp: timeStr
        }
      ]);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  }, [inputValue, loading, messages, currentMode, executeChat]);

  const resetChat = () => {
    setMessages([]);
    setChatStarted(false);
    setInputValue("");
    setStatusMessage("");
  };

  const scrollToWeather = () => {
    weatherRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const quickQuestions = [
    { text: "现在穿什么衣服？", icon: "🧥" },
    { text: "外滩最新灯光秀时间？", icon: "🌃" },
    { text: "迪士尼可以带食物吗？", icon: "🏰" },
    { text: "上海地铁怎么买票？", icon: "🚇" }
  ];

const renderFormattedContent = (text: string) => {
  if (!text) return null;
  return text.split("\n").map((line, idx) => {
    // 统一预处理：解析所有行内**加粗，转为带样式的文本
    const processInlineBold = (str: string): ReactNode => {
      const parts = str.split(/\*\*(.*?)\*\*/g);
      if (parts.length === 1) return str;
      return parts.map((part, i) => {
        // 奇数索引为被**包裹的加粗内容
        if (i % 2 === 1) {
          return <strong key={i} className="text-indigo-200 font-semibold">{part}</strong>;
        }
        return part;
      });
    };

    // 三级标题 ###
    if (line.startsWith("### ")) {
      return (
        <h4 key={idx} className="text-base font-bold text-indigo-300 mt-6 mb-3 flex items-center gap-2 font-sans tracking-wide">
          <span className="w-1.5 h-4.5 bg-gradient-to-b from-indigo-400 to-purple-500 rounded-full inline-block shadow-[0_0_12px_rgba(99,102,241,0.6)]"></span>
          {processInlineBold(line.substring(4))}
        </h4>
      );
    }

    // **标题**: 内容 格式行
    const titleMatch = line.match(/^\s*[-*•]?\s*\*\*(.*?)\*\*(.*)$/);
    if (titleMatch) {
      return (
        <div key={idx} className="my-3.5 leading-relaxed font-sans">
          <strong className="text-slate-100 font-bold bg-indigo-500/15 px-2.5 py-1 rounded-md border border-indigo-500/35 mr-2 text-xs tracking-wide">
            {titleMatch[1]}
          </strong>
          <span className="text-slate-300 text-sm">{processInlineBold(titleMatch[2])}</span>
        </div>
      );
    }

    // 无序列表 - / • 开头
    if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
      return (
        <div key={idx} className="flex items-start gap-2.5 my-2 pl-3 font-sans">
          <span className="text-indigo-400 mt-2 text-xs select-none">•</span>
          <span className="text-slate-300 text-sm flex-1 leading-relaxed">
            {processInlineBold(line.trim().slice(2))}
          </span>
        </div>
      );
    }

    // 有序列表 数字. 开头
    const numMatch = line.match(/^\s*(\d+)\.\s*(.*)$/);
    if (numMatch) {
      return (
        <div key={idx} className="flex items-start gap-2.5 my-2 pl-3 font-sans">
          <span className="text-indigo-400 font-bold text-xs mt-1.5 select-none">{numMatch[1]}.</span>
          <span className="text-slate-300 text-sm flex-1 leading-relaxed">
            {processInlineBold(numMatch[2])}
          </span>
        </div>
      );
    }

    // 空行
    if (line.trim() === "") {
      return <div key={idx} className="h-3.5" />;
    }

    // 普通段落
    return (
      <p key={idx} className="text-slate-300 text-sm leading-relaxed my-1.5 font-sans font-light">
        {processInlineBold(line)}
      </p>
    );
  });
};

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans bg-[#060813] text-slate-100">
      
      {/* 动态Orb球体背景 */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* 单一大圆圈 - 位于输入框及标题区域正后方 */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] opacity-70">
          <Orb
            hoverIntensity={0}
            rotateOnHover={false}
            hue={35}
            forceHoverState={false}
            backgroundColor="#060813"
          />
        </div>
        
        {/* 细致科技网格背景 */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:5rem_5rem]" />
      </div>

      <div className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-6 md:px-12 flex flex-col min-h-[calc(100vh-100px)]">
        
        {/* 标题区：应用核心渐变和阴影外发光，大幅提升高级感 */}
        <div className={cn(
          "text-center pt-20 pb-8 transition-all duration-1000 ease-out transform",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        )}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 tracking-[0.25em] uppercase mb-6 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            Shanghai Digital Vibes
          </div>
          
          {/* 核心文字渐变与外发光阴影应用 */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-[0.25em] bg-gradient-to-r from-slate-100 via-amber-100 to-indigo-200 bg-clip-text text-transparent filter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] leading-tight mb-4 select-none font-sans">
            江海潮起，智游申城
          </h2>
          
          <p className="text-xs sm:text-sm tracking-[0.45em] uppercase font-light mt-4 text-slate-400 font-sans">
            上海出行全指南,你的上海专属出行顾问
          </p>
        </div>

        {/* 主交互区：移除共享元素layoutId，输入框原位渐显 */}
        <div className="flex-1 flex flex-col justify-start items-center w-full">
          <AnimatePresence mode="wait">
            {!chatStarted ? (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-3xl mx-auto mt-16 flex flex-col items-center"
              >
                <div className="text-center mb-10">
                  <p className="text-sm font-light tracking-wider text-slate-400 font-sans">
                    输入关于上海旅游的任何问题，即刻获取专业解答
                  </p>
                </div>

                {/* 输入框固定在原位 */}
                <div className="w-full">
                  <SearchBar
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={() => handleSend()}
                    loading={loading}
                    inputRef={inputRef}
                    autoFocus
                    mode={currentMode}
                    onModeChange={setCurrentMode}
                    showModeSelector={true}
                  />
                </div>

                {/* 浮动智能药丸推荐按钮 */}
                <div className="flex flex-wrap justify-center gap-3.5 mt-8">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputValue(q.text);
                        setTimeout(() => handleSend(q.text), 150);
                      }}
                      className="text-xs px-5 py-2.5 rounded-full border transition-all duration-300 flex items-center gap-2.5 cursor-pointer backdrop-blur-md bg-[#0D1122]/40 border-white/[0.06] text-slate-300 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-200 hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] active:scale-95 font-sans"
                    >
                      <span className="text-sm">{q.icon}</span>
                      <span>{q.text}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={scrollToWeather}
                  className="flex flex-col items-center gap-3 text-[11px] tracking-[0.2em] uppercase transition-colors cursor-pointer mt-24 mx-auto opacity-70 hover:opacity-100 group text-slate-400 font-sans"
                >
                  <span>探索申城实时气象</span>
                  <ChevronDown className="w-4 h-4 animate-bounce-slow text-indigo-400" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-4xl mx-auto h-[700px] flex flex-col rounded-[2.5rem] bg-[#0A0D1E]/90 border border-white/[0.08] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden relative"
              >
                
                {/* 聊天头部 */}
                <div className="flex flex-col gap-3 p-5 md:p-6 border-b border-white/[0.05] shrink-0 bg-white/[0.01]">
                  {/* 第一行：返回按钮和标题 */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={resetChat}
                      className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer group px-3 py-1.5 rounded-full hover:bg-white/5 border border-transparent hover:border-white/5"
                    >
                      <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                      <span className="font-light tracking-wide">返回探索</span>
                    </button>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white tracking-wide">上海文旅专家</h3>
                      {/* 技术栈标签 */}
                      <div className="flex items-center gap-2 text-[10px] text-slate-300 font-medium px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] backdrop-blur-md">
                        <span className="text-indigo-400">LangChain</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-emerald-400">FAISS</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-amber-400">对话记忆</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 第二行：模式标签和技术状态 */}
                  <div className="flex items-center justify-between">
                    {/* 模式切换按钮 */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white/5 rounded-lg border border-white/5 p-0.5">
                        <button
                          onClick={() => setCurrentMode('fast')}
                          className={cn(
                            "px-2.5 py-1 text-[10px] rounded-md transition-all duration-200 flex items-center gap-1",
                            currentMode === 'fast' 
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                              : "text-slate-400 hover:text-white hover:bg-white/5"
                          )}
                          title="极速模式：基于RAG知识库，响应更快"
                        >
                          <span>⚡</span>
                          <span>极速模式</span>
                        </button>
                        <button
                          onClick={() => setCurrentMode('agent')}
                          className={cn(
                            "px-2.5 py-1 text-[10px] rounded-md transition-all duration-200 flex items-center gap-1",
                            currentMode === 'agent' 
                              ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" 
                              : "text-slate-400 hover:text-white hover:bg-white/5"
                          )}
                          title="Agent模式：多工具自主调度，更智能但稍慢"
                        >
                          <span>🤖</span>
                          <span>Agent模式</span>
                        </button>
                      </div>
                      {isDegraded && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium bg-amber-500/10 text-amber-300 border-amber-500/20">
                          <span>⏰</span>
                          <span>已自动降级</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] text-indigo-300/90 font-bold px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 tracking-widest uppercase shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                      </span>
                      <span>基于DouBao-Seed-1.6flash联网搜索/RAG知识库+深度思考</span>
                    </div>
                  </div>
                </div>

                {/* 消息区域 */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 md:p-8 space-y-8 custom-scrollbar">
                  {messages.map((msg, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.4 }}
                      key={i}
                      className={cn("flex gap-4 max-w-[85%]", msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto")}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 select-none shadow-md",
                        msg.role === "user" 
                          ? "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-200 border border-indigo-500/30" 
                          : "bg-gradient-to-br from-white/10 to-slate-400/10 text-slate-200 border border-white/10"
                      )}>
                        {msg.role === "user" ? "您" : "AI"}
                      </div>

                      <div className="space-y-2 flex-1 min-w-0">
                        <div className={cn("flex items-center gap-2 text-[10px] text-slate-500 font-light font-mono", msg.role === "user" ? "justify-end" : "justify-start")}>
                          <span className="font-sans font-medium">{msg.role === "user" ? "您" : "上海文旅专家"}</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-slate-600" />
                          <span>{msg.timestamp}</span>
                          {msg.source && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 font-sans text-[9px]">
                              {msg.source === "both" ? "双引擎" : "本地库"}
                            </div>
                          )}
                        </div>

                        <div className={cn(
                          "rounded-[1.5rem] px-5 py-4 text-[15px] leading-relaxed backdrop-blur-md border shadow-sm",
                          msg.role === "user"
                            ? "bg-indigo-500/10 text-white rounded-tr-sm border-indigo-500/20"
                            : "bg-white/[0.02] text-slate-200 rounded-tl-sm border-white/[0.04]"
                        )}>
                          {msg.content === "" && loading && i === messages.length - 1 ? (
                            <div className="flex items-center gap-2.5 py-1 text-slate-400 font-light text-sm font-sans">
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                              <span>思考中...</span>
                            </div>
                          ) : renderFormattedContent(msg.content)}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {statusMessage && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-light px-4 py-2.5 rounded-full border border-white/[0.04] bg-white/[0.02] max-w-[fit-content] ml-14 animate-pulse shadow-sm">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
                      <span>{statusMessage}</span>
                    </div>
                  )}
                </div>

                {/* 底部输入框 */}
                <div className="p-4 md:p-6 border-t border-white/[0.05] bg-[#080B18]/40 shrink-0">
                  <div className="w-full">
                    <SearchBar
                      value={inputValue}
                      onChange={setInputValue}
                      onSend={() => handleSend()}
                      loading={loading}
                      inputRef={inputRef}
                      autoFocus
                      placeholder="继续提问上海旅游问题..."
                      mode={currentMode}
                      onModeChange={setCurrentMode}
                      showModeSelector={false}
                    />
                  </div>
                  <div className="mt-3.5 flex justify-between items-center px-4 text-[10px] text-slate-500 font-light tracking-wider font-sans">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70" />
                      AI 大模型生成内容仅供参考
                    </span>
                    <button onClick={() => setMessages([])} className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" /> 清空会话
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!chatStarted && (
            <button onClick={() => weatherRef.current?.scrollIntoView({ behavior: "smooth" })} className="flex flex-col items-center gap-3 text-[10px] tracking-[0.2em] uppercase transition-all cursor-pointer mt-24 mb-12 opacity-50 hover:opacity-100 text-slate-400 group font-sans">
              <span>探索实时气象</span>
              <ChevronDown className="w-4 h-4 animate-bounce-slow text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {/* 天气区域：全面采用 bg-transparent 让背景的紫色/靛蓝氛围光完美透射 */}
      <div
        ref={weatherRef}
        className="w-full py-24 px-6 md:px-12 relative z-10 bg-transparent border-t border-white/[0.04] backdrop-blur-[2px]"
      >
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-8 mb-8">
           <div className="space-y-4">
              {/* 1. 字号放大 2. font-black 极致粗体 3. 增强光晕提亮渐变 */}
                <h2 className="text-2xl sm:text-3xl font-black tracking-[0.4em] text-white font-artistic bg-gradient-to-r from-white via-amber-100 to-indigo-100 bg-clip-text text-transparent filter drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]">
                  沪上风物气象
                </h2>
           <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-slate-500 to-transparent mx-auto" />
        </div>
      <p className="text-xs sm:text-sm text-slate-400 font-artistic tracking-[0.2em] leading-[2.2] max-w-3xl mx-auto font-light">
      观江海风候，览一城晴雨；循四时冷暖，赴沪上漫游
      </p>
  </div>
          <ErrorBoundary
            fallback={
              <div className="w-full rounded-[2.5rem] bg-[#0A0D1E]/90 border border-white/[0.08] backdrop-blur-2xl p-8 shadow-2xl flex items-center justify-center h-80">
                <span className="text-slate-400 font-sans text-sm">天气服务暂时不可用，请稍后刷新页面</span>
              </div>
            }
          >
            <AppleWeatherWidget />
          </ErrorBoundary>
        </div>
      </div>

      {/* 底部版权 - 同样透射背景色 */}
      <footer className="relative z-10 py-8 text-center flex flex-col items-center justify-center gap-3 bg-transparent text-slate-600 border-t border-white/[0.02]">
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent mb-2" />
        <div className="text-[10px] tracking-[0.25em] font-light uppercase font-mono">
          © 2026 Shanghai Tourism Digital System
        </div>
        <div className="text-[9px] tracking-widest font-light text-slate-700 font-mono">
          Powered by RAG • Fast and Agent Modes
        </div>
      </footer>

      {/* 底部渐变模糊效果 */}
      <GradualBlur
        target="page"
        position="bottom"
        height="6rem"
        strength={1.5}
        divCount={5}
        curve="bezier"
        exponential
        opacity={0.9}
        zIndex={40}
      />
    </div>
  );
}
