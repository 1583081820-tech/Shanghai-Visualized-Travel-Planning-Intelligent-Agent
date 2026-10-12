import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { PlanResult } from "../../lib/types";
import CardSwap, { Card } from "../ui/CardSwap";
import "./TravelTips.css";

type Props = {
  travelPlan: PlanResult | null;
};

// 贴士类型
type TipCategory = "booking" | "transport" | "tips" | "food" | "culture" | "money" | "weather" | "photo";

const categoryLabels: Record<TipCategory, string> = {
  booking: "预约提醒",
  transport: "交通贴士",
  tips: "避坑指南",
  food: "美食推荐",
  culture: "文化贴士",
  money: "省钱攻略",
  weather: "天气提醒",
  photo: "拍照打卡",
};

// 所有贴士内容库
const allTips = [
  // 预约提醒类（8条）
  { category: "booking" as TipCategory, title: "提前预约\n热门景点", subtitle: "免排队省时间" },
  { category: "booking" as TipCategory, title: "上海天文馆", subtitle: "提前7天抢票" },
  { category: "booking" as TipCategory, title: "迪士尼乐园", subtitle: "建议买早享卡" },
  { category: "booking" as TipCategory, title: "一大会址", subtitle: "免费但需预约" },
  { category: "booking" as TipCategory, title: "自然博物馆", subtitle: "周末票紧张" },
  { category: "booking" as TipCategory, title: "上海科技馆", subtitle: "提前网上购票" },
  { category: "booking" as TipCategory, title: "海洋水族馆", subtitle: "周末人多早去" },
  { category: "booking" as TipCategory, title: "东方明珠", subtitle: "提前购票免排队" },
  
  // 交通贴士类（8条）
  { category: "transport" as TipCategory, title: "地铁出行\n便捷高效", subtitle: "Metro大都会APP" },
  { category: "transport" as TipCategory, title: "黄浦江轮渡", subtitle: "2元看外滩夜景" },
  { category: "transport" as TipCategory, title: "共享单车", subtitle: "短途游首选" },
  { category: "transport" as TipCategory, title: "磁悬浮列车", subtitle: "龙阳路到浦东机场" },
  { category: "transport" as TipCategory, title: "观光巴士", subtitle: "一日票随上随下" },
  { category: "transport" as TipCategory, title: "浦东机场", subtitle: "地铁2号线直达" },
  { category: "transport" as TipCategory, title: "虹桥枢纽", subtitle: "2号线10号线换乘" },
  { category: "transport" as TipCategory, title: "夜间出行", subtitle: "夜宵公交覆盖广" },
  
  // 避坑指南类（8条）
  { category: "tips" as TipCategory, title: "错峰出行\n体验更佳", subtitle: "避开周末高峰" },
  { category: "tips" as TipCategory, title: "拒绝低价\n一日游", subtitle: "多为购物团" },
  { category: "tips" as TipCategory, title: "外滩夜景", subtitle: "7点亮灯最佳" },
  { category: "tips" as TipCategory, title: "豫园逛街", subtitle: "买东西先问价" },
  { category: "tips" as TipCategory, title: "网红餐厅", subtitle: "建议错峰用餐" },
  { category: "tips" as TipCategory, title: "观光隧道", subtitle: "性价比低不推荐" },
  { category: "tips" as TipCategory, title: "南京路", subtitle: "人多注意防盗" },
  { category: "tips" as TipCategory, title: "城隍庙小吃", subtitle: "本地人很少去" },
  
  // 美食推荐类（8条）
  { category: "food" as TipCategory, title: "南翔小笼包", subtitle: "城隍庙最正宗" },
  { category: "food" as TipCategory, title: "本帮菜", subtitle: "老正兴菜馆" },
  { category: "food" as TipCategory, title: "鲜肉月饼", subtitle: "光明邨大酒家" },
  { category: "food" as TipCategory, title: "蝴蝶酥", subtitle: "国际饭店" },
  { category: "food" as TipCategory, title: "生煎馒头", subtitle: "小杨生煎" },
  { category: "food" as TipCategory, title: "葱油拌面", subtitle: "老上海经典味" },
  { category: "food" as TipCategory, title: "蟹壳黄", subtitle: "传统酥点咸甜" },
  { category: "food" as TipCategory, title: "排骨年糕", subtitle: "本帮特色小吃" },
  
  // 文化贴士类（8条）
  { category: "culture" as TipCategory, title: "外滩万国建筑", subtitle: "52幢历史大楼" },
  { category: "culture" as TipCategory, title: "石库门弄堂", subtitle: "海派建筑代表" },
  { category: "culture" as TipCategory, title: "海派文化", subtitle: "中西合璧特色" },
  { category: "culture" as TipCategory, title: "弄堂文化", subtitle: "老上海生活气息" },
  { category: "culture" as TipCategory, title: "旗袍风韵", subtitle: "东方女性之美" },
  { category: "culture" as TipCategory, title: "田子坊", subtitle: "文艺弄堂小店" },
  { category: "culture" as TipCategory, title: "1933老场坊", subtitle: "工业风建筑" },
  { category: "culture" as TipCategory, title: "武康路", subtitle: "名人故居一条街" },
  
  // 省钱攻略类（8条）
  { category: "money" as TipCategory, title: "学生半价", subtitle: "带好学生证" },
  { category: "money" as TipCategory, title: "免费景点", subtitle: "外滩 南京路 田子坊" },
  { category: "money" as TipCategory, title: "博物馆免费", subtitle: "上博 中华艺术宫" },
  { category: "money" as TipCategory, title: "公园免费", subtitle: "世纪公园 静安公园" },
  { category: "money" as TipCategory, title: "公交优惠", subtitle: "换乘优惠1元" },
  { category: "money" as TipCategory, title: "地铁日票", subtitle: "多次乘坐更划算" },
  { category: "money" as TipCategory, title: "云南南路", subtitle: "老字号美食街" },
  { category: "money" as TipCategory, title: "公园绿地", subtitle: "免费休闲好去处" },
  
  // 天气提醒类（8条）
  { category: "weather" as TipCategory, title: "梅雨季节", subtitle: "6-7月带伞" },
  { category: "weather" as TipCategory, title: "夏季炎热", subtitle: "注意防暑降温" },
  { category: "weather" as TipCategory, title: "冬季湿冷", subtitle: "注意保暖" },
  { category: "weather" as TipCategory, title: "台风季节", subtitle: "7-9月关注预报" },
  { category: "weather" as TipCategory, title: "春秋最佳", subtitle: "气候宜人舒适" },
  { category: "weather" as TipCategory, title: "夏季雷阵雨", subtitle: "常备折叠伞" },
  { category: "weather" as TipCategory, title: "冬季雾霾", subtitle: "关注空气质量" },
  { category: "weather" as TipCategory, title: "春季花粉", subtitle: "过敏做好防护" },
  
  // 拍照打卡类（4条）
  { category: "photo" as TipCategory, title: "外滩夜景", subtitle: "北外滩经典机位" },
  { category: "photo" as TipCategory, title: "武康大楼", subtitle: "网红打卡地标" },
  { category: "photo" as TipCategory, title: "三件套", subtitle: "陆家嘴仰拍超震撼" },
  { category: "photo" as TipCategory, title: "1933老场坊", subtitle: "工业风大片绝佳" },
];

// 打乱数组顺序
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function TravelTips({ travelPlan: _travelPlan }: Props) {
  // 当前显示的3条贴士
  const [tipCards, setTipCards] = useState(() => {
    const shuffled = shuffleArray([...allTips]);
    return shuffled.slice(0, 3);
  });

  // 模拟 CardSwap 的顺序：[最前, 中间, 最后]
  const orderRef = useRef([0, 1, 2]);

  // 定期更换最后面的卡片内容，实现35条随机展示
  useEffect(() => {
    const swapAndUpdate = () => {
      // 先更新顺序，模拟 CardSwap 的切换：最前的移到最后
      orderRef.current = [
        orderRef.current[1],
        orderRef.current[2],
        orderRef.current[0],
      ];

      // 找到新的最后面的卡片索引
      const lastCardIndex = orderRef.current[2];

      // 随机选择一条新的贴士，不和当前显示的重复
      setTipCards((prev) => {
        const currentTitles = prev.map((t) => t.title);
        const available = allTips.filter(
          (tip) => !currentTitles.includes(tip.title)
        );
        if (available.length === 0) return prev;
        const randomIndex = Math.floor(Math.random() * available.length);
        const newTip = available[randomIndex];

        const newCards = [...prev];
        newCards[lastCardIndex] = newTip;
        return newCards;
      });
    };

    // CardSwap 会立即执行一次切换，所以我们也立即更新一次
    swapAndUpdate();

    // 之后每4秒更新一次，和 CardSwap 同步
    const interval = setInterval(swapAndUpdate, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full travel-tips-section">
      {/* 右下角卡片堆叠区域 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="absolute inset-0 overflow-hidden travel-tips-card-area"
      >
        <CardSwap
          cardDistance={55}
          verticalDistance={65}
          delay={4000}
          easing="elastic"
          skewAmount={5}
          width={580}
          height={380}
        >
          {tipCards.map((tip, index) => {
            const label = categoryLabels[tip.category];
            return (
              <Card key={index} customClass="tip-card-minimal">
                <div className="w-full h-full bg-black border border-white/15 rounded-xl p-8 relative overflow-hidden">
                  {/* 左上角分类标签 - 和正文顶部对齐 */}
                  <div className="absolute top-24 left-8">
                    <div className="px-3.5 py-1.5 bg-white/10 backdrop-blur-sm border border-white/15 rounded text-white/80 text-xs font-medium tracking-wider">
                      {label}
                    </div>
                  </div>

                  {/* 左侧大标题文字 */}
                  <div className="absolute left-8 top-1/2 -translate-y-1/2">
                    <h3 className="text-white text-xl font-bold leading-tight whitespace-pre-line tracking-wide">
                      {tip.title}
                    </h3>
                    <p className="text-white/50 text-sm mt-3">
                      {tip.subtitle}
                    </p>
                  </div>

                  {/* 底部装饰线 */}
                  <div className="absolute bottom-8 left-8 w-10 h-px bg-white/20" />
                </div>
              </Card>
            );
          })}
        </CardSwap>
      </motion.div>
    </div>
  );
}
