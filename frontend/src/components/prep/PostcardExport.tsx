import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileText, RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";
import type { PlanResult, Place } from "../../lib/types";

type Props = {
  tripDays: number;
  travelPlan: PlanResult | null;
  manualAddedPlaces?: Record<number, Place[]>;
};

// 人民日报级别上海出行金句库（20+句）
const shanghaiGoldenQuotes = [
  "浦江潮起，沪上风华，每一步都是与时代的对话。",
  "外滩的灯火，照亮的不仅是夜空，更是一座城市的梦想与荣光。",
  "从石库门到陆家嘴，上海用百年时光书写了一部东方传奇。",
  "梧桐深处，藏着上海最柔软的时光；摩天楼上，闪耀着城市最坚定的锋芒。",
  "魔都的魅力，在于传统与现代的交融，在于烟火与理想的共生。",
  "漫步申城，一步一景皆是画，一砖一瓦皆有诗。",
  "黄浦江畔，看潮起潮落；南京路头，品人间烟火。",
  "上海的美，是刻在骨子里的精致，是融在血脉里的开放。",
  "万国建筑博览群，见证百年沧桑；东方明珠电视塔，昭示未来辉煌。",
  "弄堂里的吴侬软语，是上海最动听的旋律；陆家嘴的钢铁森林，是城市最昂扬的乐章。",
  "赴一场魔都之约，遇见更好的自己，也遇见更美的时代。",
  "上海，这座海纳百川的城市，永远值得你奔赴而来。",
  "在上海，每一次出发都是新的开始，每一次抵达都是新的发现。",
  "豫园的花灯，点亮的是传统文化的传承；迪士尼的烟火，绽放的是现代都市的活力。",
  "武康路的梧桐，诉说着岁月静好；张江的灯火，闪耀着创新未来。",
  "上海的故事，写在每一条弄堂里，刻在每一座高楼中，更藏在每一个追梦人的心里。",
  "从江南水乡到国际大都市，上海用包容与创新，书写着属于自己的传奇。",
  "魔都的早晨，是生煎包的香气；魔都的夜晚，是霓虹灯的璀璨。",
  "在上海，你能看到历史的厚重，也能感受到未来的脉搏。",
  "上海，一座让你来了就不想走，走了还想来的城市。",
  "黄浦江的水，流淌着百年的记忆；陆家嘴的楼，矗立着时代的高度。",
  "上海的浪漫，藏在梧桐叶的光影里，融在咖啡香的氤氲中，更刻在城市的骨血里。",
  "每一个来到上海的人，都是这座城市故事的一部分；每一次上海之行，都是人生中难忘的篇章。",
  "申城大地，处处皆是风景；魔都岁月，时时都有惊喜。",
];

// 导出尺寸选项
const exportSizes = [
  { key: "png", label: "高清 PNG", icon: "🖼️" },
  { key: "wechat", label: "朋友圈尺寸", icon: "💬" },
  { key: "xiaohongshu", label: "小红书竖版", icon: "📕" },
  { key: "pdf", label: "PDF 打印版", icon: "📄" },
];

// 批量导入上海旅游图片（public目录下的图片，直接通过路径访问）
const shanghaiImages = Array.from({ length: 24 }, (_, i) => `/images/shanghai-tour/${i + 1}.jpg`);

// 上海城市剪影元素（SVG路径简化版）
const ShanghaiSkyline = ({ color = "white" }: { color?: string }) => {
  return (
    <svg viewBox="0 0 400 120" className="w-full h-full" fill="none">
      {/* 东方明珠 */}
      <path
        d="M60 120 L60 50 M50 50 Q60 30 70 50 M50 70 Q60 55 70 70 M60 30 L60 10"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <circle cx="60" cy="40" r="8" fill={color} opacity="0.8" />
      <circle cx="60" cy="60" r="10" fill={color} opacity="0.6" />

      {/* 金茂大厦 */}
      <path
        d="M100 120 L100 30 L110 20 L120 30 L120 120"
        stroke={color}
        strokeWidth="2"
        fill={color}
        opacity="0.3"
      />

      {/* 上海中心 */}
      <path
        d="M150 120 L150 15 Q160 5 170 15 L170 120"
        stroke={color}
        strokeWidth="2"
        fill={color}
        opacity="0.2"
      />

      {/* 环球金融中心 */}
      <rect x="200" y="25" width="25" height="95" stroke={color} strokeWidth="2" fill={color} opacity="0.25" />
      <rect x="208" y="40" width="10" height="20" fill="white" opacity="0.5" />

      {/* 武康大楼 */}
      <path
        d="M260 120 L260 50 L290 50 L290 120"
        stroke={color}
        strokeWidth="2"
        fill={color}
        opacity="0.3"
      />
      <rect x="265" y="60" width="6" height="8" fill="white" opacity="0.4" />
      <rect x="275" y="60" width="6" height="8" fill="white" opacity="0.4" />
      <rect x="265" y="75" width="6" height="8" fill="white" opacity="0.4" />
      <rect x="275" y="75" width="6" height="8" fill="white" opacity="0.4" />

      {/* 石库门 */}
      <rect x="320" y="70" width="50" height="50" stroke={color} strokeWidth="2" fill={color} opacity="0.2" />
      <path d="M320 70 Q345 55 370 70" stroke={color} strokeWidth="2" fill="none" />
      <rect x="340" y="90" width="10" height="30" fill={color} opacity="0.4" />

      {/* 底部波浪线 */}
      <path
        d="M0 115 Q100 110 200 115 T400 115"
        stroke={color}
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.5"
      />
    </svg>
  );
};

// 明信片正面（印象页）
const PostcardFront = ({
  backgroundImage,
  tripDays,
  customMessage,
  goldenQuote,
}: {
  backgroundImage: string;
  tripDays: number;
  customMessage: string;
  goldenQuote: string;
}) => {
  return (
    <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden border-2 border-white/20">
      {/* 背景图片 */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      {/* 渐变遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />

      {/* 装饰性边角 */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/40" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/40" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/40" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/40" />

      <div className="relative p-8 h-full flex flex-col z-10">
        {/* 顶部标题 */}
        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold tracking-wider text-white drop-shadow-lg">
            上海 · {tripDays} 日漫游计划
          </h3>
          <div className="text-xs mt-1 tracking-widest text-white/70">
            SHANGHAI TRAVEL POSTCARD
          </div>
        </div>

        {/* 城市剪影 */}
        <div className="flex-1 flex items-center justify-center py-4">
          <div className="w-full max-w-sm h-28 opacity-80">
            <ShanghaiSkyline color="white" />
          </div>
        </div>

        {/* 时间轴简表 */}
        <div className="flex justify-center gap-4 mb-4">
          {Array.from({ length: Math.min(tripDays, 5) }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-white/20 backdrop-blur-sm border border-white/30">
                {i + 1}
              </div>
              <div className="text-[10px] mt-1 text-white/70">Day {i + 1}</div>
            </div>
          ))}
          {tripDays > 5 && (
            <div className="text-xs self-end mb-1 text-white/70">...</div>
          )}
        </div>

        {/* 底部金句 */}
        <div className="text-center">
          <p className="text-sm italic text-white/90 font-medium drop-shadow-md">
            「{goldenQuote}」
          </p>
          {customMessage && (
            <p className="text-xs mt-2 text-white/70">
              —— {customMessage}
            </p>
          )}
        </div>

        {/* 纪念印章 */}
        <div className="absolute top-6 right-6 transform rotate-12">
          <div className="w-16 h-16 rounded-full border-2 border-red-400/80 text-red-300 flex items-center justify-center backdrop-blur-sm bg-red-900/20">
            <div className="text-center">
              <div className="text-[10px] font-bold">上海</div>
              <div className="text-[8px]">纪念</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 明信片背面（行程时间线）- 深色英伦复古高级风格
const PostcardBack = ({
  backgroundImage,
  tripDays: _tripDays,
  travelPlan,
  manualAddedPlaces = {},
}: {
  backgroundImage: string;
  tripDays: number;
  travelPlan: PlanResult | null;
  manualAddedPlaces?: Record<number, Place[]>;
}) => {
  // 收集所有行程数据（合并AI规划和手动添加的景点）
  const tripData = useMemo(() => {
    // 1. 如果有AI规划的行程，以AI规划的天数为基础，合并手动添加的景点
    if (travelPlan?.days && travelPlan.days.length > 0) {
      return travelPlan.days.map(day => {
        const aiPlaces = day.places?.map(p => p.name) || [];
        const manualPlaces = (manualAddedPlaces[day.day] || []).map(p => p.name);
        // 合并并去重
        const allPlaces = [...aiPlaces];
        for (const place of manualPlaces) {
          if (!allPlaces.includes(place)) {
            allPlaces.push(place);
          }
        }
        return {
          day: day.day,
          places: allPlaces,
        };
      });
    }
    
    // 2. 如果没有AI规划的行程，但有手动添加的景点，根据tripDays生成行程数据
    const manualDays = Object.keys(manualAddedPlaces).map(Number).filter(d => manualAddedPlaces[d]?.length > 0);
    if (manualDays.length > 0) {
      // 找出最大天数，确保覆盖所有手动添加的天数
      const maxDay = Math.max(...manualDays, _tripDays);
      const result = [];
      for (let i = 1; i <= maxDay; i++) {
        const places = (manualAddedPlaces[i] || []).map(p => p.name);
        result.push({
          day: i,
          places,
        });
      }
      return result;
    }
    
    // 3. 如果既没有AI规划也没有手动添加，返回空数组
    return [];
  }, [travelPlan, manualAddedPlaces, _tripDays]);

  // 计算总景点数
  const totalPlaces = useMemo(() => {
    return tripData.reduce((sum, day) => sum + day.places.length, 0);
  }, [tripData]);

  // 判断是否需要滚动（行程过多时）
  const needsScroll = totalPlaces > 12;

  return (
    <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden border border-amber-900/40 shadow-2xl shadow-black/60">
      {/* 背景底色 - 深色英伦复古（深蓝+墨绿渐变） */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* 背景图片 - 极淡化处理 */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.05]"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      
      {/* 复古纸张纹理 - 深色噪点 */}
      <div className="absolute inset-0 opacity-[0.2]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.6'/%3E%3C/svg%3E")`,
        backgroundSize: '180px 180px'
      }} />
      
      {/* 英伦格纹装饰 - 边角（深色版） */}
      <div className="absolute top-0 left-0 w-24 h-24 opacity-[0.12]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, #d4af37 0px, #d4af37 2px, transparent 2px, transparent 8px),
                          repeating-linear-gradient(90deg, #8b0000 0px, #8b0000 2px, transparent 2px, transparent 8px),
                          repeating-linear-gradient(45deg, #1e3a5f 0px, #1e3a5f 1px, transparent 1px, transparent 12px)`
      }} />
      <div className="absolute bottom-0 right-0 w-24 h-24 opacity-[0.12] rotate-180" style={{
        backgroundImage: `repeating-linear-gradient(0deg, #d4af37 0px, #d4af37 2px, transparent 2px, transparent 8px),
                          repeating-linear-gradient(90deg, #8b0000 0px, #8b0000 2px, transparent 2px, transparent 8px),
                          repeating-linear-gradient(45deg, #1e3a5f 0px, #1e3a5f 1px, transparent 1px, transparent 12px)`
      }} />
      
      {/* 复古金边装饰 - 双层边框（金色） */}
      <div className="absolute inset-3 border border-amber-600/30 rounded-xl pointer-events-none" />
      <div className="absolute inset-4 border border-amber-500/15 rounded-lg pointer-events-none" />
      
      {/* 右上角邮票 - 深色英伦风格 */}
      <div className="absolute top-5 right-5">
        <div className="relative w-20 h-24 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-600/50 shadow-lg" style={{
          clipPath: 'polygon(5% 0%, 95% 0%, 100% 5%, 100% 95%, 95% 100%, 5% 100%, 0% 95%, 0% 5%)'
        }}>
          {/* 邮票齿孔效果 */}
          <div className="absolute inset-0 border border-dashed border-amber-500/30 m-1" />
          {/* 邮票图案 - 上海地标剪影（金色） */}
          <div className="absolute inset-2 flex items-center justify-center">
            <svg viewBox="0 0 60 80" className="w-full h-full text-amber-400/70" fill="currentColor">
              <path d="M15 70 L15 30 M10 30 Q15 20 20 30 M10 40 Q15 32 20 40 M15 20 L15 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="15" cy="25" r="4" fill="currentColor" opacity="0.6" />
              <circle cx="15" cy="35" r="5" fill="currentColor" opacity="0.5" />
              <rect x="30" y="15" width="12" height="55" fill="currentColor" opacity="0.4" />
              <rect x="33" y="25" width="6" height="12" fill="white" opacity="0.3" />
              <path d="M48 70 L48 12 Q54 5 60 12 L60 70" fill="currentColor" opacity="0.35" />
            </svg>
          </div>
          {/* 邮票面值 */}
          <div className="absolute bottom-1 left-0 right-0 text-center">
            <span className="text-[8px] font-serif text-amber-300/80 font-bold">SHANGHAI</span>
          </div>
          {/* 邮票金额 */}
          <div className="absolute top-1 right-1">
            <span className="text-[7px] font-serif text-amber-400/70">¥80</span>
          </div>
        </div>
      </div>

      <div className="relative p-6 h-full z-10 flex flex-col">
        {/* 标题 - 深色英伦复古风格（金色） */}
        <div className="mb-4 pr-24">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-amber-400/30" />
            <h4 className="text-base font-serif text-amber-300 tracking-[0.25em] uppercase font-medium">
              行程规划
            </h4>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-amber-500/40 to-amber-400/30" />
          </div>
          <div className="text-center">
            <span className="text-[10px] text-amber-500/60 tracking-[0.3em] uppercase font-serif italic">
              Travel Itinerary
            </span>
          </div>
        </div>

        {/* 行程时间线区域 */}
        <div className={`flex-1 overflow-hidden relative ${needsScroll ? 'pr-2' : ''}`}>
          {/* 滚动内容容器 */}
          <div className={`h-full ${needsScroll ? 'overflow-y-auto pr-2 postcard-scrollbar-british' : ''}`}>
            <div className="space-y-3 py-1">
              {tripData.map((day, dayIdx) => (
                <div key={dayIdx} className="relative">
                  {/* 天数标签 - 深色英伦复古风格 */}
                  <div className="flex items-center gap-3 mb-2">
                    {/* 日期圆点 - 复古红蜡封风格（深色版） */}
                    <div className="relative flex-shrink-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-700 to-rose-900 border border-rose-500/40 flex items-center justify-center shadow-md" style={{
                        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.4)'
                      }}>
                        <span className="text-[10px] font-serif text-amber-100 font-bold">
                          {day.day}
                        </span>
                      </div>
                      {/* 蜡封光泽 */}
                      <div className="absolute top-1 left-1.5 w-2 h-1 bg-white/20 rounded-full" />
                    </div>
                    
                    {/* Day 标签 - 复古衬线体（金色） */}
                    <span className="text-[11px] font-serif text-amber-400/90 tracking-wider font-medium">
                      Day {day.day}
                    </span>
                    
                    {/* 装饰线 - 复古虚线（金色） */}
                    <div className="flex-1 h-px border-t border-dashed border-amber-600/30" />
                  </div>

                  {/* 当天景点 - 深色标签风格 */}
                  <div className="pl-3 ml-3.5 border-l-2 border-amber-700/30">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                      {day.places.map((place, placeIdx) => (
                        <div key={placeIdx} className="flex items-center">
                          {/* 景点标签 - 深色复古书签风格 */}
                          <div className="relative">
                            <div className="px-2.5 py-1 rounded bg-gradient-to-b from-slate-700/80 to-slate-800/90 border border-amber-600/30 text-[10px] text-amber-200 whitespace-nowrap shadow-md font-serif hover:from-slate-600/80 hover:to-slate-700/90 transition-colors" style={{
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                            }}>
                              {place}
                            </div>
                          </div>
                          {/* 连接符号 - 复古箭头（金色） */}
                          {placeIdx < day.places.length - 1 && (
                            <div className="mx-1 flex items-center">
                              <span className="text-amber-500/60 text-[9px] font-serif">
                                »
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      {day.places.length === 0 && (
                        <span className="text-[10px] text-amber-600/50 font-serif italic">暂无安排</span>
                      )}
                    </div>
                  </div>

                  {/* 天与天之间的连接线 */}
                  {dayIdx < tripData.length - 1 && (
                    <div className="absolute left-[13px] top-7 w-0.5 h-3 bg-gradient-to-b from-amber-700/30 to-amber-700/10" />
                  )}
                </div>
              ))}

              {tripData.length === 0 && (
                <div className="text-center py-8 text-amber-600/50 text-xs font-serif italic">
                  暂无行程数据
                </div>
              )}
            </div>
          </div>

          {/* 底部渐变遮罩 - 深色版 */}
          {needsScroll && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent pointer-events-none" />
          )}
        </div>

        {/* 底部信息区 - 深色英伦复古分隔 */}
        <div className="mt-4 pt-3 border-t border-amber-700/30">
          <div className="flex items-center justify-between">
            {/* 行程统计 - 复古标签风格（金色） */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-sm font-serif text-amber-300 font-bold">
                  {tripData.length}
                </div>
                <div className="text-[9px] text-amber-500/60 tracking-wider uppercase font-serif">Days</div>
              </div>
              <div className="w-px h-8 bg-amber-700/30" />
              <div className="text-center">
                <div className="text-sm font-serif text-amber-300 font-bold">
                  {totalPlaces}
                </div>
                <div className="text-[9px] text-amber-500/60 tracking-wider uppercase font-serif">Places</div>
              </div>
            </div>
            
            {/* 复古装饰 */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-px bg-amber-700/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-600/50" />
              <div className="w-8 h-px bg-amber-700/30" />
            </div>
          </div>
        </div>

        {/* 日期戳 - 深色复古邮戳风格 */}
        <div className="absolute bottom-5 right-5 text-right">
          <div className="text-[9px] text-amber-500/70 font-serif">
            {new Date().toLocaleDateString("zh-CN", { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="text-[10px] font-serif text-amber-400/80 tracking-wider mt-0.5 font-medium">
            出发 · 上海
          </div>
        </div>

        {/* 左下角装饰 - 英伦复古元素 */}
        <div className="absolute bottom-5 left-5">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-700/60" />
            <div className="w-2 h-2 rounded-full bg-amber-600/70" />
            <div className="w-1.5 h-1.5 rounded-full bg-rose-700/60" />
          </div>
        </div>

        {/* 左上角邮戳装饰 - 圆形复古邮戳（深色版） */}
        <div className="absolute top-6 left-6 transform -rotate-12 opacity-70">
          <div className="w-16 h-16 rounded-full border-2 border-amber-500/50 flex items-center justify-center bg-slate-800/30 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-[8px] text-amber-400/90 font-serif font-bold tracking-wider">SHANGHAI</div>
              <div className="w-8 h-px bg-amber-500/40 mx-auto my-0.5" />
              <div className="text-[7px] text-amber-500/80 font-serif">CHINA</div>
              <div className="text-[6px] text-amber-500/70 font-serif mt-0.5">POST CARD</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PostcardExport({ tripDays, travelPlan, manualAddedPlaces = {} }: Props) {
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [customMessage, setCustomMessage] = useState("");
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [goldenQuote, setGoldenQuote] = useState<string>("");

  // 随机选择背景图片和金句
  // 如果当前在背面，先转到正面再更换，确保用户能看到新背景和金句
  const randomizePostcard = () => {
    const randomImage = shanghaiImages[Math.floor(Math.random() * shanghaiImages.length)];
    const randomQuote = shanghaiGoldenQuotes[Math.floor(Math.random() * shanghaiGoldenQuotes.length)];
    
    // 如果当前在背面，先切换到正面，再更新背景和金句
    if (activeSide === "back") {
      setActiveSide("front");
      // 延迟一点时间更新，让翻转动画更自然
      setTimeout(() => {
        setBackgroundImage(randomImage);
        setGoldenQuote(randomQuote);
      }, 200);
    } else {
      // 在正面就直接更换
      setBackgroundImage(randomImage);
      setGoldenQuote(randomQuote);
    }
  };

  // 初始化随机背景和金句
  useEffect(() => {
    randomizePostcard();
  }, []);

  const handleExport = (sizeKey: string) => {
    setExporting(true);
    // 模拟导出过程
    setTimeout(() => {
      setExporting(false);
      setShowExportOptions(false);
      // 实际项目中这里会调用 html2canvas 或类似库
      alert(`明信片已生成（${sizeKey} 格式）！\n\n（实际项目中会下载对应格式的图片文件）`);
    }, 1500);
  };

  return (
    <div className="relative">
      {/* 模块标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <span className="text-3xl">🪧</span>
            行程明信片
          </h2>
          <p className="text-slate-400 text-sm">把行程做成高颜值明信片，收藏或分享这份期待</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：明信片预览 */}
        <div className="lg:col-span-2">
          {/* 正反面切换 */}
          <div className="flex justify-center gap-2 mb-4">
            <button
              onClick={() => setActiveSide("front")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                activeSide === "front"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
              )}
            >
              正面 · 印象
            </button>
            <button
              onClick={() => setActiveSide("back")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                activeSide === "back"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
              )}
            >
              背面 · 详情
            </button>
          </div>

          {/* 明信片预览 */}
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSide + backgroundImage}
                initial={{ opacity: 0, rotateY: -90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: 90 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="perspective-1000"
              >
                {activeSide === "front" ? (
                  <PostcardFront
                    backgroundImage={backgroundImage}
                    tripDays={tripDays}
                    customMessage={customMessage}
                    goldenQuote={goldenQuote}
                  />
                ) : (
                  <PostcardBack
                    backgroundImage={backgroundImage}
                    tripDays={tripDays}
                    travelPlan={travelPlan}
                    manualAddedPlaces={manualAddedPlaces}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* 导出加载遮罩 */}
            <AnimatePresence>
              {exporting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-2xl flex items-center justify-center"
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="text-4xl mb-3"
                    >
                      ✨
                    </motion.div>
                    <p className="text-white text-sm">正在生成明信片...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 右侧：定制面板 */}
        <div className="space-y-6">
          {/* 随机换图 */}
          <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <RefreshCw size={16} className="text-indigo-400" />
              随机明信片
            </h3>
            <button
              onClick={randomizePostcard}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-white text-sm font-medium hover:from-indigo-500/30 hover:to-purple-500/30 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              换一张背景和金句
            </button>
            <p className="text-xs text-slate-500 mt-2 text-center">
              每次点击随机生成不同的上海风景和金句
            </p>
          </div>

          {/* 自定义寄语 */}
          <div className="bg-white/[0.02] rounded-2xl border border-white/[0.05] p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileText size={16} className="text-indigo-400" />
              定制寄语
            </h3>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="写下你的出行寄语..."
              className="w-full h-20 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
              maxLength={50}
            />
            <div className="text-right text-xs text-slate-500 mt-1">
              {customMessage.length}/50
            </div>
          </div>

          {/* 导出按钮 */}
          <div className="relative">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300"
            >
              <Download size={18} />
              导出明信片
            </button>

            {/* 导出选项下拉 */}
            <AnimatePresence>
              {showExportOptions && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden z-10"
                >
                  {exportSizes.map((size) => (
                    <button
                      key={size.key}
                      onClick={() => handleExport(size.key)}
                      className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-white/10 transition-colors flex items-center gap-3"
                    >
                      <span>{size.icon}</span>
                      {size.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 提示 */}
          <div className="text-xs text-slate-500 text-center">
            💡 支持导出多种尺寸，满足不同分享场景
          </div>
        </div>
      </div>
    </div>
  );
}

// 明信片滚动条样式
const postcardStyles = `
  .postcard-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .postcard-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 2px;
  }
  .postcard-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 2px;
    transition: background 0.3s ease;
  }
  .postcard-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.5);
  }
  
  /* 深色高级质感滚动条 - 明信片背面使用 */
  .postcard-scrollbar-luxury-dark::-webkit-scrollbar {
    width: 4px;
  }
  .postcard-scrollbar-luxury-dark::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 2px;
  }
  .postcard-scrollbar-luxury-dark::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.3);
    border-radius: 2px;
    transition: background 0.3s ease;
  }
  .postcard-scrollbar-luxury-dark::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.5);
  }
  
  /* 英伦复古风格滚动条 - 深色版 */
  .postcard-scrollbar-british::-webkit-scrollbar {
    width: 5px;
  }
  .postcard-scrollbar-british::-webkit-scrollbar-track {
    background: rgba(217, 119, 6, 0.05);
    border-radius: 3px;
  }
  .postcard-scrollbar-british::-webkit-scrollbar-thumb {
    background: rgba(217, 119, 6, 0.35);
    border-radius: 3px;
    transition: background 0.3s ease;
  }
  .postcard-scrollbar-british::-webkit-scrollbar-thumb:hover {
    background: rgba(217, 119, 6, 0.5);
  }
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleId = 'postcard-scrollbar-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = postcardStyles;
    document.head.appendChild(styleElement);
  }
}
