import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import { Sparkles } from "lucide-react";
import Threads from "./Threads";
import SplitText from "./SplitText";

type Props = {
  onConfirm: (days: number) => void; // 确认后跳转到行程规划页面，传递天数
};

export default function TripSetupPage({ onConfirm }: Props) {
  const [days, setDays] = useState<number>(3);
  const [inputValue, setInputValue] = useState<string>("3");
  const [showContent, setShowContent] = useState(false);
  const [loading, setLoading] = useState(false);

  // 页面加载动画延迟
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 确认按钮点击事件
  const handleConfirm = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      onConfirm(days);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden
    bg-gradient-to-br from-slate-950 via-slate-900 to-black select-none">
      
      {/* Threads 动态背景 */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <Threads
          color={[0.3, 0.5, 1.0]}
          amplitude={1.5}
          distance={0.4}
          enableMouseInteraction
        />
      </div>

      {/* 科技感网格背景叠加 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] pointer-events-none z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none z-10" />

      {/* 发光星团装饰 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none z-10" />

      {/* 主内容区域 */}
      <div className={cn(
        "text-center px-6 max-w-2xl mx-auto transition-all duration-1000 relative z-20 w-full",
        showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        {/* 主标题 */}
        <div className="mb-12">
          <SplitText
            text="收集行程信息"
            tag="p"
            className="text-sm md:text-base text-slate-400 mb-3 font-medium tracking-wider"
            delay={50}
            duration={0.6}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 20 }}
            to={{ opacity: 1, y: 0 }}
            autoPlay
            textAlign="center"
          />
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            <SplitText
              text="规划您的"
              tag="span"
              className="bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent"
              delay={60}
              duration={0.8}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 30 }}
              to={{ opacity: 1, y: 0 }}
              autoPlay
              textAlign="center"
            />
            <SplitText
              text="上海之旅"
              tag="span"
              className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent"
              delay={60}
              duration={0.8}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 30 }}
              to={{ opacity: 1, y: 0 }}
              autoPlay
              textAlign="center"
            />
          </h1>
        </div>

        {/* 聊天输入框 */}
        <div className="max-w-lg mx-auto">
          <div className="relative group">
            {/* 输入框外发光 */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex items-center bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4 shadow-xl shadow-black/20 group-focus-within:border-white/20 transition-all duration-300">
              {/* 左侧图标 */}
              <div className="mr-3 text-white/30">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>

              {/* 输入框 */}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  // 只允许数字
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setInputValue(val);
                  // 同时更新 days（如果是有效数字）
                  if (val) {
                    const num = parseInt(val);
                    if (!isNaN(num)) {
                      setDays(Math.min(15, Math.max(1, num)));
                    }
                  }
                }}
                onBlur={() => {
                  // 失焦时确保值有效
                  const val = parseInt(inputValue);
                  if (isNaN(val) || val < 1) {
                    setDays(1);
                    setInputValue("1");
                  } else if (val > 15) {
                    setDays(15);
                    setInputValue("15");
                  } else {
                    setDays(val);
                    setInputValue(val.toString());
                  }
                }}
                onKeyDown={(e) => {
                  // 回车键确认
                  if (e.key === 'Enter') {
                    handleConfirm();
                  }
                }}
                placeholder="请输入行程天数..."
                className="flex-1 bg-transparent text-white text-base placeholder-white/30 focus:outline-none"
              />

              {/* 右侧单位 */}
              <span className="text-white/30 text-sm mr-3">天</span>

              {/* 确认按钮 */}
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300",
                  loading
                    ? "bg-white/5 text-white/30 cursor-not-allowed"
                    : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:from-blue-400 hover:to-indigo-500 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95"
                )}
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>

            {/* 底部提示 */}
            <div className="mt-4 text-center text-[11px] text-white/30 tracking-wider">
              支持 1 - 15 天行程规划 · 输入后点击发送
            </div>
          </div>
        </div>

        {/* 底部说明 */}
        <div className="mt-16 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>AI 将根据您的天数智能分配景点，打造完美旅程</span>
        </div>
      </div>
    </div>
  );
}
