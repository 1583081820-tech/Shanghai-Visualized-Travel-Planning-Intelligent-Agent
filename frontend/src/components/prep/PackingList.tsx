import { useState, useCallback, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Plus, RotateCcw, Star, Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import ShapeBlur from "../ui/ShapeBlur";

gsap.registerPlugin(ScrollTrigger);

// 物品类型
type PackItem = {
  id: string;
  name: string;
  icon: string;
  category: string;
  isEssential: boolean;
};

// 分类配置
const categories = [
  { key: "id", label: "证件随身", icon: "📄", color: "from-amber-500 to-orange-500" },
  { key: "clothes", label: "衣物穿搭", icon: "👕", color: "from-blue-500 to-cyan-500" },
  { key: "digital", label: "数码配件", icon: "📱", color: "from-purple-500 to-violet-500" },
  { key: "daily", label: "日用好物", icon: "🧴", color: "from-green-500 to-emerald-500" },
  { key: "shanghai", label: "上海专属", icon: "🏙️", color: "from-rose-500 to-pink-500" },
];

// 预设物品池
const initialItems: PackItem[] = [
  { id: "id-1", name: "身份证", icon: "🪪", category: "id", isEssential: true },
  { id: "id-2", name: "学生证/优惠证", icon: "🎫", category: "id", isEssential: false },
  { id: "id-3", name: "银行卡", icon: "💳", category: "id", isEssential: true },
  { id: "id-4", name: "酒店预订确认", icon: "📋", category: "id", isEssential: false },
  { id: "clothes-1", name: "舒适步行鞋", icon: "👟", category: "clothes", isEssential: true },
  { id: "clothes-2", name: "换洗衣物", icon: "👔", category: "clothes", isEssential: true },
  { id: "clothes-3", name: "薄外套", icon: "🧥", category: "clothes", isEssential: false },
  { id: "clothes-4", name: "睡衣", icon: "😴", category: "clothes", isEssential: false },
  { id: "clothes-5", name: "墨镜", icon: "🕶️", category: "clothes", isEssential: false },
  { id: "digital-1", name: "手机充电器", icon: "🔌", category: "digital", isEssential: true },
  { id: "digital-2", name: "充电宝", icon: "🔋", category: "digital", isEssential: true },
  { id: "digital-3", name: "耳机", icon: "🎧", category: "digital", isEssential: false },
  { id: "digital-4", name: "相机", icon: "📷", category: "digital", isEssential: false },
  { id: "daily-1", name: "洗漱用品", icon: "🧴", category: "daily", isEssential: true },
  { id: "daily-2", name: "护肤品", icon: "🧴", category: "daily", isEssential: false },
  { id: "daily-3", name: "雨伞", icon: "☂️", category: "daily", isEssential: false },
  { id: "daily-4", name: "纸巾湿巾", icon: "🧻", category: "daily", isEssential: true },
  { id: "daily-5", name: "常用药品", icon: "💊", category: "daily", isEssential: false },
  { id: "shanghai-1", name: "舒适步行鞋", icon: "👟", category: "shanghai", isEssential: true },
  { id: "shanghai-2", name: "便携晴雨伞", icon: "☂️", category: "shanghai", isEssential: true },
  { id: "shanghai-3", name: "大容量充电宝", icon: "🔋", category: "shanghai", isEssential: true },
  { id: "shanghai-4", name: "少量现金", icon: "💰", category: "shanghai", isEssential: false },
  { id: "shanghai-5", name: "空水瓶", icon: "💧", category: "shanghai", isEssential: false },
  { id: "shanghai-6", name: "地铁乘车码", icon: "🚇", category: "shanghai", isEssential: true },
];

// 鼓励文案
const encouragementTexts = [
  "essentials+1，准备更充分啦",
  "这个带对了，上海暴走全靠它",
  "明智之选，有备无患",
  "打包进度+1，离出发更近了",
  "这个很实用，带上准没错",
  "细心如你，什么都想到了",
];

export default function PackingList() {
  const [expandedCategory, setExpandedCategory] = useState<string>("id");
  const [packedItems, setPackedItems] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<PackItem[]>([]);
  const [showAddInput, setShowAddInput] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const allItems = [...initialItems, ...customItems];
  const totalItems = allItems.filter((i) => i.isEssential).length;
  const packedEssential = packedItems.filter((id) => {
    const item = allItems.find((i) => i.id === id);
    return item?.isEssential;
  }).length;
  const progress = Math.round((packedItems.length / allItems.length) * 100);
  const hasMissingEssential = packedEssential < totalItems;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevExpandedRef = useRef<string>("id");

  // 监听分类展开状态，播放GSAP动画
  useEffect(() => {
    const prev = prevExpandedRef.current;
    const current = expandedCategory;

    if (prev !== current) {
      // 收起之前展开的
      const prevCategoryEl = categoryRefs.current[prev];
      const prevContainer = prevCategoryEl?.querySelector('.packing-items-container') as HTMLElement | null;
      if (prevContainer) {
        const prevItemEls = prevContainer.querySelectorAll('.packing-item-card') as NodeListOf<HTMLElement>;
        const prevArrowEl = prevCategoryEl?.querySelector('.category-arrow') as HTMLElement | null;

        // 收起前先隐藏滚动条，避免动画过程中出现滚动条
        prevContainer.style.overflowY = 'hidden';

        const tl = gsap.timeline();
        tl.to(prevItemEls, { yPercent: -30, opacity: 0, rotate: -3, duration: 0.25, ease: "power3.in", stagger: { each: 0.05, from: "end" } }, 0);
        tl.to(prevContainer, { height: 0, opacity: 0, duration: 0.35, ease: "power3.inOut" }, 0.1);
        if (prevArrowEl) tl.to(prevArrowEl, { rotate: 0, duration: 0.3, ease: "power2.out" }, 0);
      }

      // 展开新的
      requestAnimationFrame(() => {
        const categoryEl = categoryRefs.current[current];
        const container = categoryEl?.querySelector('.packing-items-container') as HTMLElement | null;
        if (!container) return;

        const itemEls = container.querySelectorAll('.packing-item-card') as NodeListOf<HTMLElement>;
        const arrowEl = categoryEl?.querySelector('.category-arrow') as HTMLElement | null;

        gsap.set(container, { height: 0, opacity: 0, overflow: 'hidden' });
        gsap.set(itemEls, { yPercent: -50, opacity: 0, rotate: -5 });
        // 修复：使用固定展开高度，确保切换分类时整个组件高度不变，不影响下面的组件
        const fixedExpandHeight = 220; // 固定展开高度
        gsap.set(container, { height: 0 });

        const tl = gsap.timeline({
          onComplete: () => {
            // 动画结束后，内容超出固定高度时显示滚动条
            container.style.overflowY = 'auto';
          }
        });
        tl.to(container, { height: fixedExpandHeight, opacity: 1, duration: 0.4, ease: "power3.out" }, 0.15);
        tl.to(itemEls, { yPercent: 0, opacity: 1, rotate: 0, duration: 0.5, ease: "power3.out", stagger: { each: 0.06, from: "start" } }, 0.25);
        if (arrowEl) tl.to(arrowEl, { rotate: 180, duration: 0.35, ease: "power2.out" }, 0.15);
      });
    }

    prevExpandedRef.current = expandedCategory;
  }, [expandedCategory]);

  const toggleCategory = useCallback((categoryKey: string) => {
    // 手风琴模式：点击已展开的不关闭，点击其他的切换
    if (categoryKey !== expandedCategory) {
      setExpandedCategory(categoryKey);
    }
  }, [expandedCategory]);

  const handlePackItem = useCallback(
    (itemId: string) => {
      if (packedItems.includes(itemId)) return;
      setPackedItems((prev) => [...prev, itemId]);

      const randomText = encouragementTexts[Math.floor(Math.random() * encouragementTexts.length)];
      setFeedbackText(randomText);
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);

      const item = allItems.find((i) => i.id === itemId);
      if (item) {
        const categoryItems = allItems.filter((i) => i.category === item.category);
        const categoryPacked = categoryItems.filter((i) =>
          [...packedItems, itemId].includes(i.id)
        );
        if (categoryPacked.length === categoryItems.length) {
          // 分类完成
        }
      }
    },
    [packedItems, allItems]
  );

  const handleUnpackItem = useCallback((itemId: string) => {
    setPackedItems((prev) => prev.filter((id) => id !== itemId));
  }, []);

  const handleReset = () => {
    setPackedItems([]);
    setCustomItems([]);
  };

  const handleAddCustomItem = (category: string) => {
    if (!newItemName.trim()) return;
    const newItem: PackItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      icon: "📦",
      category: category,
      isEssential: false,
    };
    setCustomItems((prev) => [...prev, newItem]);
    setNewItemName("");
    setShowAddInput(null);
  };

  const toggleEssential = (itemId: string) => {
    const item = customItems.find((i) => i.id === itemId);
    if (!item) return;
    setCustomItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isEssential: !i.isEssential } : i))
    );
  };

  const getItemsByCategory = (categoryKey: string) =>
    allItems.filter((item) => item.category === categoryKey);

  const getCategoryProgress = (categoryKey: string) => {
    const categoryItems = getItemsByCategory(categoryKey);
    const packed = categoryItems.filter((i) => packedItems.includes(i.id)).length;
    return { packed, total: categoryItems.length };
  };

  return (
    <div className="relative">
      {/* 模块标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <span className="text-3xl">🎒</span>
            趣味打包清单
            <span className="text-xs font-normal text-slate-400 ml-2 flex items-center gap-1">
              <span>💡</span>
              <span>点击或拖拽物品进背包</span>
            </span>
          </h2>
          <p className="text-slate-400 text-sm">展开分类抽屉，点击物品进背包，集齐分类解锁彩蛋</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition-all duration-300 border border-white/10"
        >
          <RotateCcw size={16} />
          一键重置
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：分类抽屉列表 */}
        <div className="lg:col-span-2 space-y-3">
          {categories.map((cat) => {
            const items = getItemsByCategory(cat.key);
            const { packed, total } = getCategoryProgress(cat.key);
            const isExpanded = expandedCategory === cat.key;
            const isComplete = packed === total && total > 0;

            return (
              <div
                key={cat.key}
                ref={(el) => { categoryRefs.current[cat.key] = el; }}
                className={cn(
                  "rounded-2xl border transition-all duration-300 overflow-hidden",
                  isExpanded
                    ? "bg-white/[0.03] border-white/[0.08]"
                    : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.03]"
                )}
              >
                {/* 分类标题栏 */}
                <button
                  onClick={() => toggleCategory(cat.key)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-base">{cat.label}</span>
                        {isComplete && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                            ✓ 已集齐
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        已打包 {packed} / {total} 件
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500 bg-gradient-to-r",
                          cat.color
                        )}
                        style={{ width: `${(packed / total) * 100}%` }}
                      />
                    </div>
                    <ChevronDown
                      className={cn(
                        "category-arrow w-5 h-5 text-slate-400 transition-transform duration-300",
                        isExpanded ? "rotate-180" : ""
                      )}
                    />
                  </div>
                </button>

                {/* 物品网格容器 */}
                <div 
                  className="packing-items-container overflow-hidden" 
                  style={{ 
                    height: isExpanded ? "350px" : 0, 
                    opacity: isExpanded ? 1 : 0,
                    transition: 'height 0.3s ease, opacity 0.3s ease'
                  }}
                >
                  <div className="px-5 pb-5 pt-2 h-full overflow-y-scroll pr-4 custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {items.map((item, idx) => {
                      const isPacked = packedItems.includes(item.id);
                      return (
                        <div key={item.id} className="packing-item-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                          <div
                            draggable={!isPacked}
                            onDragStart={(e) => e.dataTransfer.setData("itemId", item.id)}
                            onClick={() => !isPacked && handlePackItem(item.id)}
                            className={cn(
                              "relative p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-300 flex flex-col items-center gap-2 group",
                              isPacked
                                ? "bg-green-500/10 border border-green-500/30 opacity-60"
                                : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105"
                            )}
                          >
                            {item.isEssential && (
                              <div className="absolute top-2 right-2">
                                <Star size={14} className="fill-amber-400 text-amber-400" />
                              </div>
                            )}
                            {isPacked && (
                              <div className="absolute top-2 left-2">
                                <Check size={16} className="text-green-400" />
                              </div>
                            )}
                            <span className="text-3xl">{item.icon}</span>
                            <span className="text-sm text-slate-200 text-center">{item.name}</span>
                            {item.id.startsWith("custom-") && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleEssential(item.id); }}
                                className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
                              >
                                {item.isEssential ? "取消必带" : "设为必带"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* 添加自定义物品 */}
                    {showAddInput === cat.key ? (
                      <div className="packing-item-card">
                        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col items-center gap-2">
                          <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddCustomItem(cat.key)}
                            placeholder="物品名称"
                            className="w-full px-2 py-1 text-sm bg-white/10 rounded-lg border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddCustomItem(cat.key)}
                              className="text-xs px-2 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                            >
                              添加
                            </button>
                            <button
                              onClick={() => { setShowAddInput(null); setNewItemName(""); }}
                              className="text-xs px-2 py-1 bg-white/10 text-slate-300 rounded-lg hover:bg-white/20 transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="packing-item-card">
                        <button
                          onClick={() => setShowAddInput(cat.key)}
                          className="w-full p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/20 hover:bg-white/5 hover:border-white/30 transition-all duration-300 flex flex-col items-center gap-2 text-slate-400 hover:text-slate-200"
                        >
                          <Plus size={24} />
                          <span className="text-sm">添加物品</span>
                        </button>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 图例说明 */}
          <div className="flex items-center gap-6 mt-4 text-xs text-slate-400 px-2">
            <div className="flex items-center gap-2">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <span>必带物品</span>
            </div>
          </div>
        </div>

        {/* 右侧：背包容器 */}
        <div className="relative">
          {showFeedback && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm rounded-full whitespace-nowrap shadow-lg animate-bounce">
              ✨ {feedbackText}
            </div>
          )}

          {/* 进度环 */}
          <div className="relative flex justify-center mb-6">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
              <circle
                cx="64" cy="64" r="45"
                stroke={hasMissingEssential ? "#f59e0b" : "#22c55e"}
                strokeWidth="8" fill="none" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{progress}%</span>
              <span className="text-xs text-slate-400">打包进度</span>
            </div>
          </div>

          {hasMissingEssential && (
            <div className="mb-4 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center">
              ⚠️ 还有 {totalItems - packedEssential} 件必带物品未打包
            </div>
          )}

          {/* 背包容器 */}
          <div className="relative">
            <div
              className="absolute pointer-events-none z-0 rounded-2xl"
              style={{ top: '-32px', right: '-32px', bottom: '-32px', left: '-32px' }}
            >
              <ShapeBlur
                variation={0}
                pixelRatioProp={typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1}
                shapeSize={2.05}
                roundness={0.22}
                borderSize={0.04}
                circleSize={0.35}
                circleEdge={0.8}
              />
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const itemId = e.dataTransfer.getData("itemId");
                if (itemId) handlePackItem(itemId);
              }}
              className={cn(
                "relative bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-sm rounded-2xl p-6 min-h-[350px] transition-all duration-300 z-10",
                progress === 100
                  ? "shadow-[0_0_30px_rgba(34,197,94,0.15)]"
                  : "hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]"
              )}
            >
              <div className="flex flex-col items-center mb-4">
                <div className={cn("text-6xl mb-2 transition-all duration-500", progress === 100 ? "filter drop-shadow-[0_0_20px_rgba(34,197,94,0.5)] animate-pulse" : "")}>
                  {progress === 100 ? "🎒✨" : "🎒"}
                </div>
                <h3 className="text-lg font-semibold text-white">我的旅行背包</h3>
                <p className="text-xs text-slate-400">已打包 {packedItems.length} / {allItems.length} 件</p>
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {packedItems.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-8">
                    点击左侧物品或拖拽到这里开始打包
                  </div>
                ) : (
                  packedItems.map((itemId) => {
                    const item = allItems.find((i) => i.id === itemId);
                    if (!item) return null;
                    return (
                      <div key={itemId} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                        <div className="flex items-center gap-2">
                          <span>{item.icon}</span>
                          <span className="text-sm text-slate-200">{item.name}</span>
                          {item.isEssential && <Star size={12} className="fill-amber-400 text-amber-400" />}
                        </div>
                        <button
                          onClick={() => handleUnpackItem(itemId)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-all text-xs"
                        >
                          移除
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 自定义滚动条样式和撒花动画
const styles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    transition: background 0.3s ease;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleId = 'packing-list-scrollbar';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
}
