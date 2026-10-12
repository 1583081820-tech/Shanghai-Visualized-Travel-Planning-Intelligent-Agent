import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Gift, Plane, Sparkles, X, MapPin } from "lucide-react";
import { cn } from "../../lib/utils";

// 魔都惊喜盲盒内容
const surpriseBoxItems = [
  {
    id: 1,
    title: "百年旧书店探秘",
    description: "去福州路逛一家百年旧书店，在泛黄的书页间寻找老上海的记忆",
    icon: "📚",
    location: "福州路 · 上海旧书店",
    tag: "文艺",
  },
  {
    id: 2,
    title: "2元轮渡夜景",
    description: "坐 2 块钱的轮渡看黄浦江夜景，性价比最高的外滩视角",
    icon: "⛴️",
    location: "东金线轮渡",
    tag: "浪漫",
  },
  {
    id: 3,
    title: "弄堂葱油饼",
    description: "钻进老弄堂，找一份最地道的葱油饼，感受上海烟火气",
    icon: "🫓",
    location: "老弄堂 · 阿大葱油饼",
    tag: "美食",
  },
  {
    id: 4,
    title: "1933老场坊",
    description: "探访曾经的远东第一屠宰场，如今的创意园区和拍照圣地",
    icon: "🏛️",
    location: "1933 老场坊",
    tag: "打卡",
  },
  {
    id: 5,
    title: "多伦路文化街",
    description: "漫步多伦路，看看鲁迅、茅盾等文人曾经生活过的地方",
    icon: "✍️",
    location: "多伦路文化名人街",
    tag: "人文",
  },
  {
    id: 6,
    title: "甜爱路爱心邮筒",
    description: "去甜爱路的爱心邮筒寄一张明信片，盖一个爱心邮戳",
    icon: "💌",
    location: "甜爱路",
    tag: "浪漫",
  },
  {
    id: 7,
    title: "M50创意园",
    description: "逛一逛 M50 创意园区，感受当代艺术的魅力",
    icon: "🎨",
    location: "M50 创意园",
    tag: "文艺",
  },
  {
    id: 8,
    title: "上海天文馆",
    description: "去全球最大的天文馆，探索宇宙的奥秘",
    icon: "🔭",
    location: "上海天文馆（临港）",
    tag: "科技",
  },
  {
    id: 9,
    title: "朱家角古镇",
    description: "去上海近郊的朱家角古镇，体验江南水乡的慢生活",
    icon: "🏯",
    location: "朱家角古镇",
    tag: "休闲",
  },
  {
    id: 10,
    title: "夜跑滨江大道",
    description: "晚上沿着滨江大道跑步或散步，欣赏陆家嘴夜景",
    icon: "🏃",
    location: "滨江大道",
    tag: "运动",
  },
];

export default function DepartureSection() {
  // 倒计时相关
  const [departureTime, setDepartureTime] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("09:00");

  // 盲盒相关
  const [currentSurprise, setCurrentSurprise] = useState<typeof surpriseBoxItems[0] | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // 出发动效相关
  const [showDeparture, setShowDeparture] = useState(false);
  const [departurePhase, setDeparturePhase] = useState<"idle" | "countdown" | "celebration">("idle");

  // 倒计时计算
  useEffect(() => {
    if (!departureTime) return;

    const timer = setInterval(() => {
      const now = new Date();
      const diff = departureTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [departureTime]);

  // 设置出发时间
  const handleSetDeparture = () => {
    if (!selectedDate || !selectedTime) return;
    const dateTime = new Date(`${selectedDate}T${selectedTime}`);
    setDepartureTime(dateTime);
    setShowTimePicker(false);
  };

  // 抽取盲盒
  const handleDrawSurprise = useCallback(() => {
    setIsSpinning(true);
    setCurrentSurprise(null);

    // 模拟抽奖动画
    let count = 0;
    const maxCount = 20;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * surpriseBoxItems.length);
      setCurrentSurprise(surpriseBoxItems[randomIdx]);
      count++;

      if (count >= maxCount) {
        clearInterval(interval);
        // 最终结果
        setTimeout(() => {
          const finalIdx = Math.floor(Math.random() * surpriseBoxItems.length);
          setCurrentSurprise(surpriseBoxItems[finalIdx]);
          setIsSpinning(false);
        }, 300);
      }
    }, 80 + count * 5); // 逐渐变慢
  }, []);

  // 出发按钮点击
  const handleDepart = () => {
    setShowDeparture(true);
    setDeparturePhase("countdown");

    // 3秒倒计时后进入庆祝状态
    setTimeout(() => {
      setDeparturePhase("celebration");
    }, 3000);
  };

  // 关闭出发庆祝
  const closeDeparture = () => {
    setShowDeparture(false);
    setDeparturePhase("idle");
  };

  // 格式化数字为两位数
  const padZero = (num: number) => num.toString().padStart(2, "0");

  return (
    <div className="relative">
      {/* 模块标题 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <span className="text-3xl">🚀</span>
          准备出发
        </h2>
        <p className="text-slate-400 text-sm">设置出发时间，抽取专属惊喜，开启你的上海之旅</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* 出发倒计时 */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-2xl border border-indigo-500/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">出发倒计时</h3>
          </div>

          {departureTime ? (
            <div className="text-center">
              <div className="flex justify-center gap-3 mb-4">
                {[
                  { value: countdown.days, label: "天" },
                  { value: countdown.hours, label: "时" },
                  { value: countdown.minutes, label: "分" },
                  { value: countdown.seconds, label: "秒" },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="w-14 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white font-mono">
                        {padZero(item.value)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 mt-1">{item.label}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowTimePicker(true)}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                修改出发时间
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">⏰</div>
              <p className="text-slate-400 text-sm mb-4">设置出发时间，开始期待</p>
              <button
                onClick={() => setShowTimePicker(true)}
                className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 text-sm hover:bg-indigo-500/30 transition-colors border border-indigo-500/30"
              >
                设置出发时间
              </button>
            </div>
          )}
        </div>

        {/* 魔都惊喜盲盒 */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift size={20} className="text-amber-400" />
            <h3 className="text-lg font-semibold text-white">魔都惊喜盲盒</h3>
          </div>

          {currentSurprise && !isSpinning ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="text-4xl mb-3">{currentSurprise.icon}</div>
              <h4 className="text-white font-semibold mb-1">{currentSurprise.title}</h4>
              <p className="text-slate-400 text-xs mb-2">{currentSurprise.description}</p>
              <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-3">
                <MapPin size={12} />
                <span>{currentSurprise.location}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                  {currentSurprise.tag}
                </span>
                <button
                  onClick={handleDrawSurprise}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >
                  再抽一次
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-4">
              <motion.div
                animate={isSpinning ? { rotate: 360 } : {}}
                transition={{ duration: 0.5, repeat: isSpinning ? Infinity : 0, ease: "linear" }}
                className="text-4xl mb-3 inline-block"
              >
                🎁
              </motion.div>
              <p className="text-slate-400 text-sm mb-4">
                {isSpinning ? "正在抽取惊喜..." : "点击抽取上海小众彩蛋"}
              </p>
              <button
                onClick={handleDrawSurprise}
                disabled={isSpinning}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm transition-all duration-300",
                  isSpinning
                    ? "bg-amber-500/10 text-amber-500/50 cursor-not-allowed"
                    : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
                )}
              >
                {isSpinning ? "抽取中..." : "开启盲盒"}
              </button>
            </div>
          )}
        </div>

        {/* 行程完成度 */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">行前准备度</h3>
          </div>

          <div className="text-center py-2">
            <div className="relative inline-flex items-center justify-center mb-4">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#10b981"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * 0.25}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">75%</span>
                <span className="text-[10px] text-slate-400">准备就绪</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs">
              打包清单已完成 · 行程已确认 · 贴士已阅读
            </p>
          </div>
        </div>
      </div>

      {/* 出发按钮 */}
      <div className="text-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDepart}
          className="relative px-12 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 text-white text-lg font-bold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 overflow-hidden group"
        >
          {/* 光效 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <span className="relative flex items-center gap-3">
            <Plane size={24} />
            开启上海之旅
          </span>
        </motion.button>
        <p className="text-slate-500 text-sm mt-3">
          点击开启你的魔都冒险 ✨
        </p>
      </div>

      {/* 时间选择弹窗 */}
      <AnimatePresence>
        {showTimePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTimePicker(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800/95 backdrop-blur-xl rounded-2xl border border-white/10 p-6 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">设置出发时间</h3>
                <button
                  onClick={() => setShowTimePicker(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">出发日期</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-2">出发时间</label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowTimePicker(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSetDeparture}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:shadow-lg transition-all"
                >
                  确认
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 出发全屏动效 */}
      <AnimatePresence>
        {showDeparture && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
          >
            {/* 背景渐变 */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900" />
            
            {/* 粒子效果 */}
            {departurePhase === "celebration" && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    initial={{
                      x: "50%",
                      y: "50%",
                      scale: 0,
                      opacity: 1,
                    }}
                    animate={{
                      x: `${Math.random() * 100}%`,
                      y: `${Math.random() * 100}%`,
                      scale: 1,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      ease: "easeOut",
                      delay: Math.random() * 0.5,
                    }}
                  >
                    <span className="text-2xl">
                      {["✨", "🌟", "💫", "🎉", "🎊"][Math.floor(Math.random() * 5)]}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* 内容 */}
            <div className="relative z-10 text-center px-6">
              <AnimatePresence mode="wait">
                {departurePhase === "countdown" ? (
                  <motion.div
                    key="countdown"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: 3 }}
                      className="text-8xl font-bold text-white mb-4"
                    >
                      3
                    </motion.div>
                    <p className="text-xl text-slate-300">准备出发...</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="celebration"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="text-8xl mb-6"
                    >
                      ✈️
                    </motion.div>
                    <h2 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                      旅途愉快
                    </h2>
                    <p className="text-xl text-slate-300 mb-2">
                      愿你在上海留下美好的回忆
                    </p>
                    <p className="text-sm text-slate-400 mb-8">
                      魔都的浪漫与繁华，都在等着你去发现
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={closeDeparture}
                        className="px-8 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
                      >
                        返回首页
                      </button>
                      <button
                        onClick={closeDeparture}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:shadow-lg transition-all"
                      >
                        进入地图导航
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={closeDeparture}
              className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
