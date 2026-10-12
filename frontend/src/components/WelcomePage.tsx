import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import PrismaticBurst from "./ui/PrismaticBurst";

type Props = {
  onEnter: () => void;
};

export default function WelcomePage({ onEnter }: Props) {
  const [loading, setLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      onEnter();
      setLoading(false);
    }, 800);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden
    bg-[#08080b] select-none">
      
      {/* PrismaticBurst 光效背景 - 全屏 */}
      <div className="absolute inset-0 pointer-events-none">
        <PrismaticBurst
          animationType="hover"
          intensity={2.5}
          speed={0.4}
          distort={0}
          paused={false}
          offset={{ x: 0, y: 0 }}
          hoverDampness={0.6}
          rayCount={0}
          mixBlendMode="screen"
          colors={['#ffffff', '#ffffff', '#fafaff']}
        />
      </div>

      {/* 暗角遮罩 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(8,8,11,0.8)_100%)] pointer-events-none" />

      {/* 主内容 */}
      <div className={cn(
        "text-center px-8 relative z-20 transition-opacity duration-1500 ease-out pt-28",
        showContent ? "opacity-100" : "opacity-0"
      )}>
        {/* 状态标签 */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-300/10 bg-amber-400/[0.02] text-amber-100/50 text-[11px] font-medium tracking-[0.2em] mb-10">
          <span className="flex h-1 w-1 rounded-full bg-amber-300/60 animate-pulse" />
          <span>愿终会遇到陪你奔赴月球的人</span>
        </div>

        {/* 主标题 - 江海相拥 潮起东方 配色 */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-[0.08em] leading-tight">
            <span className="bg-gradient-to-r from-slate-100 via-cyan-50 to-blue-200 bg-clip-text text-transparent">
              上海可视化出行
            </span>
          </h1>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-semibold tracking-[0.08em] leading-tight mt-2">
            <span className="bg-gradient-to-r from-blue-200 via-sky-100 to-amber-50 bg-clip-text text-transparent">
              规划智能体
            </span>
          </h1>
        </div>

        {/* 英文副标题 */}
        <p className="text-xs md:text-sm text-cyan-200/25 tracking-[0.4em] font-light uppercase mb-8">
          River Meets Sea · Dawn Rises East
        </p>

        {/* 完整英文标题 */}
        <p className="text-[10px] md:text-xs text-slate-300/30 tracking-[0.25em] font-light uppercase mb-12">
          Shanghai Visualized Travel Planning Intelligent Agent
        </p>

        {/* 功能描述 */}
        <p className="text-slate-300/50 text-sm font-normal tracking-wider mb-14 max-w-md mx-auto leading-relaxed">
          可视化地图 · AI智能规划行程 · 专属出行顾问
        </p>

        {/* 玻璃按钮 - 江海潮起配色 */}
        <button
          onClick={handleClick}
          disabled={loading}
          className={cn(
            "px-14 py-4 rounded-full text-sm font-medium tracking-[0.2em] text-slate-100/70",
            "border border-slate-300/15 bg-white/[0.02] backdrop-blur-sm",
            "transition-all duration-500 ease-out",
            "hover:bg-cyan-400/[0.05] hover:border-cyan-300/25 hover:text-cyan-50",
            "active:scale-[0.98]",
            loading ? "opacity-50 cursor-not-allowed" : ""
          )}
        >
          {loading ? (
            <div className="flex items-center gap-2.5">
              <svg className="animate-spin h-3.5 w-3.5 text-white/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>加载中</span>
            </div>
          ) : (
            <span>开 始 体 验</span>
          )}
        </button>

        {/* 底部版权 */}
        <div className="mt-20 text-slate-400/15 text-[10px] tracking-[0.35em] font-mono uppercase">
          Powered by RAG · LangChain · MapLibre
        </div>
      </div>
    </div>
  );
}
