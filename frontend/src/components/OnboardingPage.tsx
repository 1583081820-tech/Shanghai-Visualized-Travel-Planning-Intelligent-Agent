import { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import LiquidChrome from "./ui/LiquidChrome";
import GridMotion from "./ui/GridMotion";
import Beams from "./ui/Beams";
import Particles from "./ui/Particles";
import Balatro from "./ui/Balatro";
import { Check, ChevronLeft, Sparkles, Calendar, Users, Compass, User, Wallet } from "lucide-react";
import Dock from "./ui/Dock";

// 批量导入上海旅游图片（public目录下的图片，直接通过路径访问）
const numberedImages = Array.from({ length: 24 }, (_, i) => `/images/shanghai-tour/${i + 1}.jpg`);
const namedImages = [
  '/images/shanghai-tour/bund.jpg',
  '/images/shanghai-tour/disney.jpg',
  '/images/shanghai-tour/jingan-temple.jpg',
  '/images/shanghai-tour/nanjing-road.jpg',
  '/images/shanghai-tour/oriental-pearl.jpg',
  '/images/shanghai-tour/science-museum.jpg',
  '/images/shanghai-tour/shanghai-museum.jpg',
  '/images/shanghai-tour/tianzifang.jpg',
  '/images/shanghai-tour/wild-zoo.jpg',
  '/images/shanghai-tour/wukang-road.jpg',
  '/images/shanghai-tour/yuyuan.jpg',
  '/images/shanghai-tour/zhujiajiao.jpg',
];
const allImages = [...numberedImages, ...namedImages];

// 调整图片顺序：将迪士尼图片放在左上角（第一个位置），标志性景点放在前面
const disneyIndex = allImages.findIndex(img => img.includes('disney'));
let shanghaiImages = [...allImages];
if (disneyIndex > 0) {
  const disneyImg = shanghaiImages[disneyIndex];
  shanghaiImages.splice(disneyIndex, 1);
  shanghaiImages.unshift(disneyImg);
}
shanghaiImages = shanghaiImages.slice(0, 28);

type Props = {
  onComplete: (data: OnboardingData) => void;
  onBack?: () => void;
  onSkip?: () => void;
  initialData?: OnboardingData | null;
};

export interface OnboardingData {
  travel_days: number;
  travel_group: string;
  travel_style: string[];
  age_group: number;
  total_budget: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | "complete";

// 出行人群选项
const travelGroupOptions = [
  { id: "solo", label: "单人出行", icon: "🧑" },
  { id: "couple", label: "情侣/二人同行", icon: "💑" },
  { id: "family", label: "亲子家庭（带儿童）", icon: "👨‍👩‍👧" },
  { id: "friends", label: "朋友结伴", icon: "👫" },
  { id: "elderly", label: "带老人出行", icon: "👴" },
  { id: "business", label: "商务差旅", icon: "💼" },
];

// 游玩风格选项
const travelStyleOptions = [
  { id: "popular", label: "热门打卡", desc: "经典景点一网打尽" },
  { id: "relaxed", label: "休闲慢游", desc: "不赶时间，慢慢感受" },
  { id: "culture", label: "深度人文", desc: "探索历史与文化" },
  { id: "photo", label: "网红出片", desc: "拍照打卡圣地" },
  { id: "ancient", label: "江南古镇", desc: "水乡古镇风情" },
  { id: "tech", label: "科技科普", desc: "科技馆、博物馆" },
  { id: "skyscraper", label: "摩天大厦", desc: "城市天际线" },
  { id: "disney", label: "Disneyland", desc: "梦幻童话世界" },
  { id: "nature", label: "自然风光", desc: "公园绿地景观" },
  { id: "museum", label: "历史博物", desc: "博物馆与展览" },
];

// 预算选项
const budgetOptions = [
  { id: "economy", label: "经济型", price: "500元以内", color: "from-green-500 to-emerald-500" },
  { id: "comfort", label: "舒适型", price: "500-1000元", color: "from-blue-500 to-indigo-500" },
  { id: "quality", label: "品质型", price: "1000-2000元", color: "from-purple-500 to-violet-500" },
  { id: "luxury", label: "尊享型", price: "2000元以上", color: "from-amber-500 to-orange-500" },
];

// 步骤1：游玩天数
const Step1Content = memo(function Step1Content({ daysInput, travelDays, onChange }: {
  daysInput: string;
  travelDays: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">
        你计划在上海游玩几天？
      </h1>
      <div className="relative w-full max-w-xs">
        <input
          type="number"
          value={daysInput}
          onChange={onChange}
          className="w-full h-16 text-3xl font-bold text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white outline-none transition-all duration-300 focus:border-indigo-400/50 focus:shadow-[0_0_30px_rgba(99,102,241,0.2)]"
          placeholder="3"
          min={1}
          max={7}
        />
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-white/50 text-lg">
          天
        </div>
      </div>
      {travelDays > 7 && (
        <p className="mt-4 text-amber-400/80 text-sm">建议游玩天数在 1-7 天之间</p>
      )}
      <p className="mt-6 text-white/40 text-sm">按回车键快速进入下一步</p>
    </div>
  );
});

// 步骤2：出行人群

const Step2Content = memo(function Step2Content({ travelGroup, onSelect }: {

  travelGroup: string;

  onSelect: (id: string) => void;

}) {

  return (

    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto">

      <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">

        和谁一起出行？

      </h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">

        {travelGroupOptions.map((option) => (

          <button

            key={option.id}

            onClick={() => onSelect(option.id)}

            className={cn(

              "relative p-5 rounded-2xl backdrop-blur-xl border transition-all duration-300 flex flex-col items-center gap-3 group",

              travelGroup === option.id

                ? "bg-indigo-500/20 border-indigo-400/50 shadow-lg shadow-indigo-500/20 scale-[1.02]"

                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]"

            )}

          >

            <span className="text-3xl">{option.icon}</span>

            <span className={cn(

              "text-sm font-medium",

              travelGroup === option.id ? "text-indigo-200" : "text-white/80"

            )}>

              {option.label}

            </span>

            {travelGroup === option.id && (

              <motion.div

                initial={{ scale: 0, opacity: 0 }}

                animate={{ scale: 1, opacity: 1 }}

                className="absolute top-2 right-2 w-5 h-5 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center"

              >

                <Check size={12} className="text-white" />

              </motion.div>

            )}

          </button>

        ))}

      </div>

    </div>

  );

});

// 步骤3：游玩风格
const Step3Content = memo(function Step3Content({ travelStyle, onToggle }: {
  travelStyle: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
        你更喜欢哪种游玩节奏？
      </h1>
      <p className="text-white/50 text-sm mb-8">可多选，选择你感兴趣的风格</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
        {travelStyleOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onToggle(option.id)}
            className={cn(
              "relative p-4 rounded-xl backdrop-blur-xl border transition-all duration-300 flex flex-col items-center gap-2 group text-left",
              travelStyle.includes(option.id)
                ? "bg-indigo-500/20 border-indigo-400/50 shadow-lg shadow-indigo-500/20 scale-[1.02]"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]"
            )}
          >
            <span className={cn(
              "text-sm font-semibold",
              travelStyle.includes(option.id) ? "text-indigo-200" : "text-white/90"
            )}>
              {option.label}
            </span>
            <span className="text-[10px] text-white/40 line-clamp-2">
              {option.desc}
            </span>
            {travelStyle.includes(option.id) && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-1.5 right-1.5 w-4 h-4 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center"
              >
                <Check size={10} className="text-white" />
              </motion.div>
            )}
          </button>
        ))}
      </div>
      <p className="mt-6 text-white/40 text-sm">
        已选择 {travelStyle.length} 项
      </p>
    </div>
  );
});

// 步骤4：年龄
const Step4Content = memo(function Step4Content({ ageInput, onChange }: {
  ageInput: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
        您的年龄是？
      </h1>
      <p className="text-white/50 text-sm mb-8">用于适配行程强度与景点推荐</p>
      <div className="relative w-full max-w-xs">
        <input
          type="number"
          value={ageInput}
          onChange={onChange}
          className="w-full h-16 text-3xl font-bold text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-white outline-none transition-all duration-300 focus:border-indigo-400/50 focus:shadow-[0_0_30px_rgba(99,102,241,0.2)]"
          placeholder="25"
          min={1}
          max={100}
        />
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-white/50 text-lg">
          岁
        </div>
      </div>
    </div>
  );
});

// 步骤5：预算
const Step5Content = memo(function Step5Content({ totalBudget, onSelect }: {
  totalBudget: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
        人均全程游玩预算大概是多少？
      </h1>
      <p className="text-white/50 text-sm mb-8">包含门票、餐饮、市内交通</p>
      <div className="grid grid-cols-2 gap-4 w-full">
        {budgetOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              "relative p-6 rounded-2xl backdrop-blur-xl border transition-all duration-300 flex flex-col items-center gap-2 group",
              totalBudget === option.id
                ? `bg-gradient-to-br ${option.color} bg-opacity-20 border-white/30 shadow-xl scale-[1.02]`
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]"
            )}
          >
            <span className={cn(
              "text-xl font-bold",
              totalBudget === option.id ? "text-white" : "text-white/90"
            )}>
              {option.label}
            </span>
            <span className={cn(
              "text-sm",
              totalBudget === option.id ? "text-white/80" : "text-white/50"
            )}>
              {option.price}
            </span>
            {totalBudget === option.id && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-3 right-3 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
              >
                <Check size={14} className="text-white" />
              </motion.div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
});

// 完成页
const StepCompleteContent = memo(function StepCompleteContent({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto text-center">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="w-20 h-20 mb-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30"
      >
        <Sparkles size={40} className="text-white" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl md:text-4xl font-bold text-white mb-4"
      >
        正在为你定制行程
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-white/60 mb-8"
      >
        基于你的偏好定制可视化路线
      </motion.p>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-white/40 text-sm"
        >
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </motion.div>
      )}
    </div>
  );
});

// 背景组件 - 只渲染当前步骤背景，减少GPU压力
const BackgroundRenderer = memo(function BackgroundRenderer({ step }: { step: Step }) {
  const renderBackground = () => {
    switch (step) {
      case 1:
        return (
          <LiquidChrome
            baseColor={[0.1, 0.1, 0.1]}
            speed={0.3}
            amplitude={0.3}
            interactive={false}
          />
        );
      case 2:
        return (
          <GridMotion
            items={shanghaiImages}
            gradientColor="rgba(99, 102, 241, 0.1)"
          />
        );
      case 3:
        return (
          <Beams
            beamWidth={3}
            beamHeight={30}
            beamNumber={20}
            lightColor="#ffffff"
            speed={2}
            noiseIntensity={1.75}
            scale={0.2}
            rotation={30}
          />
        );
      case 4:
        return (
          <Particles
            particleColors={["#ffffff"]}
            particleCount={150}
            particleSpread={10}
            speed={0.1}
            particleBaseSize={80}
            moveParticlesOnHover={false}
            alphaParticles={false}
            disableRotation={false}
            pixelRatio={1}
          />
        );
      case 5:
        return (
          <Balatro
            isRotate={false}
            mouseInteraction={false}
            pixelFilter={745}
            color1="#DE443B"
            color2="#006BB4"
            color3="#162325"
          />
        );
      case "complete":
        return (
          <Particles
            particleColors={["#818cf8", "#c084fc", "#f472b6"]}
            particleCount={200}
            particleSpread={15}
            speed={0.2}
            particleBaseSize={120}
            moveParticlesOnHover={false}
            alphaParticles
            disableRotation={false}
            pixelRatio={1}
          />
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      key={String(step)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute inset-0"
    >
      {renderBackground()}
    </motion.div>
  );
});

export default function OnboardingPage({ onComplete, onBack, onSkip, initialData }: Props) {
  // 如果有初始数据，直接跳到最后一步（编辑模式）
  const [currentStep, setCurrentStep] = useState<Step>(initialData ? 5 : 1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  
  // 表单数据
  const [travelDays, setTravelDays] = useState<number>(initialData?.travel_days ?? 3);
  const [daysInput, setDaysInput] = useState<string>(String(initialData?.travel_days ?? 3));
  const [travelGroup, setTravelGroup] = useState<string>(initialData?.travel_group ?? "");
  const [travelStyle, setTravelStyle] = useState<string[]>(initialData?.travel_style ?? []);
  const [ageGroup, setAgeGroup] = useState<number>(initialData?.age_group ?? 25);
  const [ageInput, setAgeInput] = useState<string>(String(initialData?.age_group ?? 25));
  const [totalBudget, setTotalBudget] = useState<string>(initialData?.total_budget ?? "");
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);

  // 检查当前步骤是否可以继续
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return daysInput.trim() !== "" && travelDays >= 1 && travelDays <= 7;
      case 2:
        return travelGroup !== "";
      case 3:
        return travelStyle.length > 0;
      case 4:
        return ageInput.trim() !== "" && ageGroup >= 1 && ageGroup <= 100;
      case 5:
        return totalBudget !== "";
      default:
        return false;
    }
  }, [currentStep, daysInput, travelDays, travelGroup, travelStyle, ageInput, ageGroup, totalBudget]);

  // 下一步
  const handleNext = useCallback(() => {
    if (!canProceed()) return;
    
    setDirection("forward");
    if (currentStep === 5) {
      // 进入完成页
      setCurrentStep("complete");
      // 模拟加载，然后跳转
      setIsLoading(true);
      setTimeout(() => {
        onComplete({
          travel_days: travelDays,
          travel_group: travelGroup,
          travel_style: travelStyle,
          age_group: ageGroup,
          total_budget: totalBudget,
        });
      }, 1500);
    } else if (typeof currentStep === "number") {
      setCurrentStep((currentStep + 1) as Step);
    }
  }, [currentStep, canProceed, travelDays, travelGroup, travelStyle, ageGroup, totalBudget, onComplete]);

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && currentStep !== "complete") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, handleNext]);

  // 跳转到指定步骤
  const goToStep = (step: number) => {
    if (step < 1 || step > 5 || currentStep === "complete") return;
    if (typeof currentStep !== "number") return;
    
    setDirection(step > currentStep ? "forward" : "backward");
    setCurrentStep(step as Step);
  };

  // Dock 步骤导航项
  const dockItems = [
    {
      icon: <Calendar size={18} />,
      label: "游玩天数",
      onClick: () => goToStep(1),
    },
    {
      icon: <Users size={18} />,
      label: "出行人群",
      onClick: () => goToStep(2),
    },
    {
      icon: <Compass size={18} />,
      label: "游玩风格",
      onClick: () => goToStep(3),
    },
    {
      icon: <User size={18} />,
      label: "年龄信息",
      onClick: () => goToStep(4),
    },
    {
      icon: <Wallet size={18} />,
      label: "预算范围",
      onClick: () => goToStep(5),
    },
  ];

  // 切换游玩风格（多选）
  const toggleTravelStyle = useCallback((id: string) => {
    setTravelStyle((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  // 处理天数输入变化
  const handleDaysChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDaysInput(val);
    if (val === "") {
      setTravelDays(0);
    } else {
      const num = parseInt(val);
      if (!isNaN(num)) {
        setTravelDays(num);
      }
    }
  }, []);

  // 处理年龄输入变化
  const handleAgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAgeInput(val);
    if (val === "") {
      setAgeGroup(0);
    } else {
      const num = parseInt(val);
      if (!isNaN(num)) {
        setAgeGroup(num);
      }
    }
  }, []);

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden bg-[#060813]">
      {/* 背景动效 */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <BackgroundRenderer step={currentStep} />
      </div>

      {/* 渐变遮罩，让内容更清晰 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#060813]/80 via-transparent to-[#060813]/90 pointer-events-none z-10" />

      {/* 顶部步骤导航 */}
      <div className="relative z-20 px-6 pt-6">
        <div className="max-w-4xl mx-auto">
          {/* 编辑模式提示 */}
          {initialData && (
            <div className="mb-4 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                <span>✏️</span>
                <span>编辑模式 - 您可以修改任意步骤后保存</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            {/* 返回导航按钮 */}
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 text-sm"
            >
              <ChevronLeft size={16} />
              返回导航
            </button>

            {/* Dock 步骤导航 */}
            {currentStep !== "complete" && (
              <Dock
                items={dockItems.map((item, index) => ({
                  ...item,
                  className: index + 1 === currentStep ? "dock-item-active" : "",
                }))}
                panelHeight={48}
                baseItemSize={38}
                magnification={48}
                distance={120}
              />
            )}

            {/* 暂时跳过按钮 */}
            <button
              onClick={onSkip}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 text-sm"
            >
              暂时跳过
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex items-center justify-center relative z-20 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={String(currentStep)}
            initial={{
              opacity: 0,
              x: direction === "forward" ? 50 : -50,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: direction === "forward" ? -50 : 50,
            }}
            transition={{
              duration: 0.32,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="w-full"
          >
            {currentStep === 1 && (
              <Step1Content
                daysInput={daysInput}
                travelDays={travelDays}
                onChange={handleDaysChange}
              />
            )}
            {currentStep === 2 && (
              <Step2Content
                travelGroup={travelGroup}
                onSelect={setTravelGroup}
              />
            )}
            {currentStep === 3 && (
              <Step3Content
                travelStyle={travelStyle}
                onToggle={toggleTravelStyle}
              />
            )}
            {currentStep === 4 && (
              <Step4Content
                ageInput={ageInput}
                onChange={handleAgeChange}
              />
            )}
            {currentStep === 5 && (
              <Step5Content
                totalBudget={totalBudget}
                onSelect={setTotalBudget}
              />
            )}
            {currentStep === "complete" && (
              <StepCompleteContent isLoading={isLoading} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 底部按钮区域 */}
      {currentStep !== "complete" && (
        <div className="relative z-20 px-6 pb-8">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                "w-full h-14 rounded-2xl font-semibold text-base transition-all duration-300 relative overflow-hidden group",
                canProceed()
                  ? "bg-white/8 backdrop-blur-xl border border-white/15 text-white/90 hover:bg-white/12 hover:border-white/25 hover:shadow-lg hover:shadow-white/5 active:scale-[0.98]"
                  : "bg-white/3 text-white/30 cursor-not-allowed border border-white/5"
              )}
            >
              <span className="relative z-10">
                {currentStep === 5 ? (initialData ? "保存修改" : "开始定制") : "下一步"}
              </span>
            </button>
            {currentStep === 1 && (
              <p className="text-center text-white/30 text-xs mt-4">
                按 Enter 键快速继续
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 背景轮播动画样式
const bgStyles = `
  @keyframes bgFade {
    0%, 100% { opacity: 0; }
    10%, 25% { opacity: 1; }
    35%, 90% { opacity: 0; }
  }
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleId = 'onboarding-bg-styles';
  if (!document.getElementById(styleId)) {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = bgStyles;
    document.head.appendChild(styleElement);
  }
}
