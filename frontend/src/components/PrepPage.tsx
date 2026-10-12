import { motion } from "framer-motion";
import { ChevronRight, Home, Map, Backpack } from "lucide-react";
import type { PlanResult, Place } from "../lib/types";
import PackingList from "./prep/PackingList";
import PostcardExport from "./prep/PostcardExport";
import TravelTips from "./prep/TravelTips";
import SplitText from "./ui/SplitText";

type Props = {
  tripDays: number;
  travelPlan: PlanResult | null;
  manualAddedPlaces?: Record<number, Place[]>;
};

export default function PrepPage({ tripDays, travelPlan, manualAddedPlaces = {} }: Props) {
  return (
    <div className="min-h-full w-full bg-[#060813] text-slate-100 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* 面包屑导航 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-2 text-sm text-slate-400 mb-8"
        >
          <div className="flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer">
            <Home size={14} />
            <span>首页</span>
          </div>
          <ChevronRight size={14} className="text-slate-600" />
          <div className="flex items-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer">
            <Map size={14} />
            <span>行程规划</span>
          </div>
          <ChevronRight size={14} className="text-slate-600" />
          <div className="flex items-center gap-1.5 text-indigo-300">
            <Backpack size={14} />
            <span className="font-medium">行前准备</span>
          </div>
        </motion.div>

        {/* 页面标题区 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-4">
            <span className="text-lg">🎒</span>
            <span>行前准备站</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent mb-3">
            整装待发，开启魔都之旅
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            你的上海 {tripDays} 天行程已规划完成，让我们一起做好出发前的最后准备，
            把期待打包进背包，带着好心情出发
          </p>
        </motion.div>

        {/* 模块1：趣味拖拽式行前打包清单 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mb-16"
        >
          <PackingList />
        </motion.div>

        {/* 模块2：上海专属行程明信片导出 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="mb-16"
        >
          <PostcardExport tripDays={tripDays} travelPlan={travelPlan} manualAddedPlaces={manualAddedPlaces} />
        </motion.div>

        {/* 模块3：准备出发 + 出行贴士 左右布局 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="mb-0"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* 左边：结束语模块 */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="flex flex-col items-start justify-start py-28 px-4">
                {/* 主标题 */}
                <div className="mb-10">
                  <SplitText
                    text="浦江潮起 沪上启程"
                    className="text-4xl md:text-5xl font-bold text-white"
                    delay={80}
                    duration={1}
                    ease="power3.out"
                    splitType="chars"
                    from={{ opacity: 0, y: 30 }}
                    to={{ opacity: 1, y: 0 }}
                    threshold={0.1}
                    rootMargin="-20px"
                    tag="h2"
                    textAlign="left"
                    replay={true}
                    startDelay={0}
                  />
                </div>

                {/* 正文段落 */}
                <div className="space-y-5 text-left max-w-lg">
                  <SplitText
                    text="外滩万国建筑，镌刻岁月厚重；陆家嘴摩天楼，舒展时代锋芒。"
                    className="text-base text-white/70 leading-relaxed"
                    delay={25}
                    duration={0.7}
                    ease="power2.out"
                    splitType="chars"
                    from={{ opacity: 0, y: 20 }}
                    to={{ opacity: 1, y: 0 }}
                    threshold={0.1}
                    rootMargin="-20px"
                    tag="p"
                    textAlign="left"
                    replay={true}
                    startDelay={600}
                  />
                  <SplitText
                    text="梧桐弄堂里，烟火袅袅；滨江步道上，晚风漫漫。"
                    className="text-base text-white/70 leading-relaxed"
                    delay={25}
                    duration={0.7}
                    ease="power2.out"
                    splitType="chars"
                    from={{ opacity: 0, y: 20 }}
                    to={{ opacity: 1, y: 0 }}
                    threshold={0.1}
                    rootMargin="-20px"
                    tag="p"
                    textAlign="left"
                    replay={true}
                    startDelay={1300}
                  />
                  <SplitText
                    text="上海的万般风景，皆在前方等你赴约。愿你携满心期待启程，揽一城风华入怀。"
                    className="text-base text-white/70 leading-relaxed"
                    delay={25}
                    duration={0.7}
                    ease="power2.out"
                    splitType="chars"
                    from={{ opacity: 0, y: 20 }}
                    to={{ opacity: 1, y: 0 }}
                    threshold={0.1}
                    rootMargin="-20px"
                    tag="p"
                    textAlign="left"
                    replay={true}
                    startDelay={2000}
                  />
                </div>

                {/* 开启旅程按钮 */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative mt-12 px-10 py-3.5 rounded-full overflow-hidden"
                >
                  {/* 玻璃态背景 */}
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-md border border-white/15 rounded-full transition-all duration-500 group-hover:border-white/30 group-hover:bg-white/10 group-hover:shadow-lg group-hover:shadow-white/5" />
                  
                  {/* 按钮文字 */}
                  <span className="relative z-10 flex items-center gap-2 text-sm font-medium text-white/90 group-hover:text-white transition-colors duration-300">
                    开启旅程
                    <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>

                  {/* 光效 */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 rounded-full blur-sm" />
                  </div>
                </motion.button>
              </div>
            </div>
            
            {/* 右边：出行贴士模块 - 延伸到视口右边缘 */}
            <div className="lg:col-span-6 order-1 lg:order-2 relative">
              <div 
                className="sticky top-12"
                style={{ 
                  marginRight: 'calc((100vw - 80rem) / -2 - 1.5rem)',
                  minHeight: '500px'
                }}
              >
                <div className="w-full h-full">
                  <TravelTips travelPlan={travelPlan} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
