import { cn } from "../lib/utils";

// 页面枚举（全局统一）
export type PageType = "welcome" | "chat" | "intro" | "mapPlan" | "tripSetup" | "prepReady" | "onboarding";

type Props = {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  hasValidPlan?: boolean; // 是否有有效行程（控制行前准备入口状态）
  onLogout?: () => void; // 退出登录回调
};

// 导航项
const navItems = [
  { key: "intro" as PageType, label: "沪上风貌", icon: "🎮" },
  { key: "chat" as PageType, label: "出行顾问", icon: "💬" },
  { key: "mapPlan" as PageType, label: "行程规划", icon: "🗺️" },
  { key: "prepReady" as PageType, label: "行前准备", icon: "🎒" },
];

export default function GlobalHeader({ currentPage, onNavigate, hasValidPlan = false, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-[9999] w-full">
      {/* 同色系深底玻璃态，与背景无缝融合 */}
      <div className="w-full backdrop-blur-xl border-b border-white/[0.05] bg-[#060813]/70 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-500">
        {/* 外层布局修改：relative 定位，Logo左对齐，导航组绝对居中 */}
        <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center relative">
          {/* Logo区域 - 固定靠左 */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all duration-300">
              <span className="text-white text-sm font-bold tracking-wider">SH</span>
            </div>
            <div>
              <div className="text-sm font-bold tracking-wide text-white bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                上海可视化出行规划智能体
              </div>
              <div className="text-[10px] font-light tracking-wider mt-0.5 text-slate-400">
                沪上风貌导览・出行智能咨询・定制行程规划
              </div>
            </div>
          </div>

          {/* 核心导航按钮组 - 绝对水平居中，不受左右内容宽度影响 */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            {/* 返回首页按钮 */}
            <button
              onClick={() => onNavigate("welcome")}
              className={cn(
                "px-4.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center",
                currentPage === "welcome"
                  ? "bg-indigo-500/15 text-indigo-200 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.18)]"
                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <span className="mr-1.5">🏠</span>
              欢迎
            </button>

            {/* 功能导航 */}
            {navItems.map((item) => {
              const isDisabled = item.key === "prepReady" && !hasValidPlan;
              return (
                <div key={item.key} className="relative group">
                  <button
                    onClick={() => !isDisabled && onNavigate(item.key)}
                    disabled={isDisabled}
                    className={cn(
                      "px-4.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center",
                      currentPage === item.key
                        ? "bg-indigo-500/15 text-indigo-200 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.18)]"
                        : isDisabled
                        ? "text-slate-500 cursor-not-allowed opacity-50"
                        : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </button>
                  {/* 置灰时的 tooltip 提示 */}
                  {isDisabled && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-lg bg-slate-800/95 text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 border border-white/10">
                      请先在行程规划中生成专属行程
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800/95 rotate-45 border-l border-t border-white/10" />
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* 右侧：退出登录按钮 */}
          <div className="flex-1 flex justify-end">
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10"
                title="退出登录，清除所有用户数据"
              >
                <span>🚪</span>
                退出登录
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}