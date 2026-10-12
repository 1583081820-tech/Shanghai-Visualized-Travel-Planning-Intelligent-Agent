import { useState, useRef, useEffect } from "react";
import { cn } from "../utils/cn";
import {
  MapPin,
  Calendar,
  Clock,
  Ticket,
  ChevronRight,
  ExternalLink,
  X,
  Sparkles,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

// 景点数据类型定义
interface Attraction {
  name: string;
  engName: string;
  desc: string;
  detailDesc: string;
  img: string;
  fallbackImg: string;
  url: string;
  tag: string;
  bestTime: string;
  duration: string;
  ticket: string;
  location: string;
  hotspot: string;
  secrets: string[];
}

// 滚动显现动画组件
function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up"
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "fade";
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -50px 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const getDirectionClass = () => {
    if (isVisible) return "opacity-100 translate-x-0 translate-y-0 filter blur-0";
    switch (direction) {
      case "up":
        return "opacity-0 translate-y-12 filter blur-[4px]";
      case "down":
        return "opacity-0 -translate-y-12 filter blur-[4px]";
      case "left":
        return "opacity-0 translate-x-12 filter blur-[4px]";
      case "right":
        return "opacity-0 -translate-x-12 filter blur-[4px]";
      case "fade":
      default:
        return "opacity-0 filter blur-[4px]";
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) transform will-change-transform",
        getDirectionClass(),
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// 12个上海核心地标数据
const attractionList: Attraction[] = [
  {
    name: "外滩",
    engName: "The Bund",
    desc: "万国建筑博览群，百年上海的象征，黄浦江畔最美的风景线",
    detailDesc:
      "矗立着52栋风格迥异的古典复兴建筑，素有「万国建筑博览群」之称。与浦东陆家嘴金融区的摩天大楼隔江相望，是展现上海百年沧桑与现代繁华交织的最佳窗口。",
    img: "/images/shanghai-tour/bund.jpg",
    fallbackImg:
      "https://images.unsplash.com/photo-1543872084-c7bd3822856f?auto=format&fit=crop&w=1200&q=80",
    url: "https://whlyj.sh.gov.cn/",
    tag: "百年历史 / 璀璨江景",
    bestTime: "19:00 - 22:00 (霓虹初上时分)",
    duration: "1-2小时",
    ticket: "免费",
    location: "黄浦区",
    hotspot: "陈毅广场、情人墙、十六铺码头",
    secrets: [
      "外滩最佳观景与拍照位其实是在沙美大楼顶层露台，或是和平饭店的爵士酒吧，能避开人群俯瞰江面。",
      "每天晚上19:00准时开启浦江两岸景观灯，景观灯开关时间会根据季节微调（通常22:00关灯）。",
      "可以通过购买轮渡票（仅需2元）横跨黄浦江至陆家嘴，性价比极高，能体验老上海人的过江方式。",
    ],
  },
  {
    name: "东方明珠广播电视塔",
    engName: "Oriental Pearl Tower",
    desc: "上海地标性建筑，468米高空观光，360°俯瞰城市全景",
    detailDesc:
      "高468米，是上海的地标性建筑。塔内的太空舱、悬空观光廊让您心跳加速，旋转餐厅更能让您在品尝美食的同时，全方位俯瞰浦江两岸的壮丽风光。",
    img: "/images/shanghai-tour/oriental-pearl.jpg",
    fallbackImg:
      "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?auto=format&fit=crop&w=1200&q=80",
    url: "https://whlyj.sh.gov.cn/",
    tag: "城市地标 / 360°全景",
    bestTime: "16:30 - 19:30 (看绝美落日与夜景)",
    duration: "2-3小时",
    ticket: "¥199起",
    location: "浦东新区",
    hotspot: "263米主观光层、259米全透明悬空观光廊、太空舱",
    secrets: [
      "建议在傍晚17点左右登塔，这样既能看清白天的城市格局，又能完整欣赏到太阳落入高楼群的壮阔场面以及夜幕初启的万家灯火。",
      "地下的上海城市历史陈列馆非常值得一看，用蜡像和微缩模型生动还原了老上海的生活场景，门票已包含在套票内。",
      "全透明悬空观光廊需要穿鞋套，如果有恐高症，建议靠内侧行走，拍照时仰拍角度能拍出悬浮在陆家嘴上空的大片。",
    ],
  },
  {
    name: "上海迪士尼度假区",
    engName: "Shanghai Disney Resort",
    desc: "中国大陆首座迪士尼主题乐园，梦幻与欢乐的童话世界",
    detailDesc:
      "中国大陆首座迪士尼主题乐园。拥有创极速光轮、加勒比海盗等全球首发项目。在这里，奇妙梦想点亮每个人心中的童真与快乐。",
    img: "/images/shanghai-tour/disney.jpg",
    fallbackImg:
      "https://images.unsplash.com/photo-1505232497079-66d44a5b614d?auto=format&fit=crop&w=1200&q=80",
    url: "https://www.shanghaidisneyresort.com/",
    tag: "梦幻乐园 / 童话世界",
    bestTime: "全天 (建议提前规划快速通道)",
    duration: "1-2天",
    ticket: "¥475起",
    location: "浦东新区",
    hotspot: "创极速光轮、加勒比海盗-沉落宝藏之战、飞越地平线",
    secrets: [
      "提前下载迪士尼官方APP，开园第一时刻在APP上抢预约等候卡，或合理购买尊享卡以大幅减少排队时间。",
      "「加勒比海盗-沉落宝藏之战」是全球迪士尼科技感最强的项目，视觉效果震撼，建议多刷几次。",
      "烟花秀（奇梦之光幻影秀）一般在晚上20:00或21:15开始，最佳观看位置在奇想花园的中轴线，需提前1小时占位。",
    ],
  },
  {
    name: "豫园",
    engName: "Yu Garden",
    desc: "江南古典园林的典范，百年城隍庙，品尝地道上海小吃",
    detailDesc:
      "始建于明代嘉靖年间的江南古典园林，亭台楼阁、奇石游鱼，移步换景。紧邻城隍庙商业街，可尽情品尝南翔小笼包等正宗沪上小吃。",
    img: "/images/shanghai-tour/yuyuan.jpg",
    fallbackImg:
      "https://images.unsplash.com/photo-1525625293386-3fb0172c34a8?auto=format&fit=crop&w=1200&q=80",
    url: "https://whlyj.sh.gov.cn/",
    tag: "江南园林 / 传统民俗",
    bestTime: "09:00 - 11:00 (避开旅游大巴高峰)",
    duration: "2-3小时",
    ticket: "¥30 - ¥40",
    location: "黄浦区",
    hotspot: "九曲桥、湖心亭、玉玲珑、万花楼",
    secrets: [
      "豫园内部清幽雅致，与外面的城隍庙商业街喧嚣形成鲜明对比。进入豫园需单独购票，绝对物超所值。",
      "著名的江南三大名石之一「玉玲珑」就在园内，其特点是「万窍透光，聚水漏水」，从顶端灌水，孔孔流泉，非常神奇。",
      "每年元宵节期间的豫园灯会是上海最盛大的传统节日活动，整条九曲桥会化作神话灯彩世界，极度震撼，但需提前预约购票。",
    ],
  },
  {
    name: "上海科技馆",
    engName: "Shanghai Science Museum",
    desc: "国家5A级景区，科普教育基地，体验科技的神奇魅力",
    detailDesc:
      "以「自然、人、科技」为主题，设有天地馆、生命馆、智慧馆等多个展区。拥有世界级超大屏幕科学影院，是科技爱好者与亲子出游的绝佳去处。",
    img: "/images/shanghai-tour/science-museum.jpg",
    fallbackImg:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
    url: "https://www.sstm.org.cn/",
    tag: "科普教育 / 互动体验",
    bestTime: "09:00 - 15:00",
    duration: "3-4小时",
    ticket: "¥45",
    location: "浦东新区",
    hotspot: "生物万象、机器人世界、智慧之光、巨幕影院",
    secrets: [
      "科技馆内互动体验项目极多。如「食物的旅行」和「机器人剧场」非常抢手，入馆后应第一时间去服务台或APP预约。",
      "馆内的科学影院（IMAX三维巨幕、球幕、四维等）音效与画面水平属国内顶尖，非常适合带孩子一同观看科普大片。",
      "科技馆地下直通亚太盛汇商场，周边绿地广阔，适合游玩后休闲就餐。",
    ],
  },
  {
    name: "上海野生动物园",
    engName: "Shanghai Wild Animal Park",
    desc: "国家5A级景区，中国首座国家级野生动物园，近距离接触野生动物",
    detailDesc:
      "中国首座国家级野生动物园，汇集了来自世界各地的珍稀动物两万余只。设有车入区与步入区，能让您近距离观察大熊猫、金丝猴等珍稀动物的真实生活状态。",
    img: "/images/shanghai-tour/wild-zoo.jpg",
    fallbackImg:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
    url: "https://whlyj.sh.gov.cn/",
    tag: "野生动物 / 亲子出游",
    bestTime: "09:00 - 14:00 (动物较活跃时段)",
    duration: "半天至全天",
    ticket: "¥130",
    location: "浦东新区",
    hotspot: "车入区猛兽谷、熊猫馆、长颈鹿互动区",
    secrets: [
      "推荐购买「投食车」门票进入猛兽区，可以亲眼看到老虎、狮子跃起扑向车窗进食的震撼画面，比大巴车刺激得多。",
      "野生动物园非常大，步入区建议租用电动小电瓶车，特别是带老人和小孩的家庭，能节省大量体力。",
      "熊猫馆的明星大熊猫们非常受宠，早上9-10点是它们吃竹子和玩耍的黄金时间，下午大多在睡觉。",
    ],
  },
  {
    name: "南京路步行街",
    engName: "Nanjing Road",
    desc: "中华商业第一街，百年老字号云集，购物美食天堂",
    detailDesc:
      "享有「中华商业第一街」的美誉，两旁商铺林立，百年老字号如沈大成、真老大房与现代奢华商场交相辉映，乘坐「铛铛车」穿行其中，别有一番风味。",
    img: "/images/shanghai-tour/nanjing-road.jpg",
    fallbackImg:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80",
    url: "https://whlyj.sh.gov.cn/",
    tag: "十里洋场 / 百年商业",
    bestTime: "18:00 - 21:00",
    duration: "1-2小时",
    ticket: "免费",
    location: "黄浦区",
    hotspot: "永安百货、和平饭店、第一食品商店、铛铛车",
    secrets: [
      "步行街上的老字号美食千万别错过：沈大成的青团和双酿团、真老大房的鲜肉月饼、第一食品的蝴蝶酥，都是上海本地人也排队买的美味。",
      "如果从人民广场走到外滩，建议乘坐复古的「铛铛车」（单程约5-10元），缓缓穿梭在霓虹闪烁的百年街景中，极有情调。",
      "沿路两侧有很多历史保护建筑，如永安百货大楼，午后常有名人故居风格的萨克斯风手在阳台上演奏，优雅迷人。",
    ],
  },
  {
    name: "朱家角古镇",
    engName: "Zhujiajiao Town",
    desc: "上海威尼斯，千年江南水乡，小桥流水人家",
    detailDesc:
      "淀山湖畔的千年水乡，被称为「上海威尼斯」。课植园、放生桥是其代表性景点。乘一叶扁舟穿梭于水巷之间，最能体会江南水乡的宁静与温婉。",
    img: "/images/shanghai-tour/zhujiajiao.jpg",
    fallbackImg:
      "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1200&q=80",
    url: "https://whlyj.sh.gov.cn/",
    tag: "江南水乡 / 千年古镇",
    bestTime: "10:00 - 16:00 (日光水影正美)",
    duration: "半天",
    ticket: "免费进入 (内部小景点联票约¥60)",
    location: "青浦区",
    hotspot: "放生桥、课植园、圆津禅院、北大街",
    secrets: [
      "放生桥是江南地区最大的五孔石拱桥，站在桥顶可以拍出极具水乡韵味的长卷照片，傍晚落日余晖洒在河面时最美。",
      "古镇的北大街是著名的「一线天」明清老街，两旁开满了阿婆粽、扎肉、熏青豆等水乡特色小吃店，香气扑鼻。",
      "强烈建议租一艘手摇船（按航线收费，一条船可坐6人），让船夫载着划过古桥狭道，水声咿呀中感受真正的江南慢生活。",
    ],
  },
  {
    name: "田子坊",
    engName: "Tianzifang",
    desc: "老上海石库门弄堂，文艺青年聚集地，创意小店林立",
    detailDesc:
      "由上海特有的石库门建筑群改造而成的文艺创意街区。迷宫般的弄堂里藏着无数个性的画廊、手工艺品店、咖啡馆和创意餐馆，极具市井温情与文艺气息。",
    img: "/images/shanghai-tour/tianzifang.jpg",
    fallbackImg:
      "https://images.unsplash.com/photo-1583244532610-2a234e7c3eca?auto=format&fit=crop&w=1200&q=80",
    url: "https://whlyj.sh.gov.cn/",
    tag: "石库门弄堂 / 创意街区",
    bestTime: "13:00 - 18:00 (午后斜阳穿过弄堂)",
    duration: "1-2小时",
    ticket: "免费",
    location: "黄浦区",
    hotspot: "石库门门楼、手工艺街、弄堂咖啡馆",
    secrets: [
      "田子坊最大的特色是「弄堂里依然有居民生活」，漫步时抬头能看到晾晒的衣服，低头能闻到咖啡香与饭菜香，是活生生的老上海市井图卷。",
      "这里像一个巨大的迷宫，极其容易迷路。但迷路的乐趣就在于转角遇到精致的手工皮具店、小众画廊或充满艺术感的茶室。",
      "紧邻地铁9号线打浦桥站，对面就是日月光中心商场，逛累了可以去商场享用各国美食。",
    ],
  },
  {
    name: "武康路",
    engName: "Wukang Road",
    desc: "上海最美马路，百年洋房林立，名人故居荟萃",
    detailDesc:
      "被誉为「一部活的上海近代历史」。著名的武康大楼矗立于五路交汇处，沿途遍布法国梧桐和西班牙式、英国复古式洋房，是上海最浪漫、最适合漫步的街道。",
    img: "/images/shanghai-tour/wukang-road.jpg",
    fallbackImg:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
    url: "https://whlyj.sh.gov.cn/",
    tag: "名人故居 / 浪漫洋房 / 咖啡街区",
    bestTime: "14:00 - 17:00 (光影斑驳的梧桐树下)",
    duration: "1-2小时",
    ticket: "免费",
    location: "徐汇区",
    hotspot: "武康大楼、巴金故居、宋庆龄故居、罗密欧阳台",
    secrets: [
      "拍摄著名的武康大楼（源自匈牙利建筑大师邬达克设计），最佳机位在淮海中路和武康路交汇处的斜对角斑马线旁，建议用长焦或人像模式拍出空间压缩感。",
      "沿街的巴金故居是免费开放的，保留了巴金先生当年的生活原貌和满院的玉兰花，非常安静优雅，极力推荐入内参观。",
      "武康路相连的安福路、五原路是全上海最顶级的「Brunch与精品咖啡」街区，非常适合穿一件大衣，买杯手冲咖啡在梧桐树下漫步。",
    ],
  },
  {
    name: "上海博物馆",
    engName: "Shanghai Museum",
    desc: "中国最大的古代艺术博物馆之一，馆藏文物近百万件",
    detailDesc:
      "馆舍造型为「天圆地方」，象征中国传统宇宙观。馆藏文物近百万件，尤以青铜器、陶瓷、书法、绘画最为驰名，是一座殿堂级的古代艺术宝库。",
    img: "/images/shanghai-tour/shanghai-museum.jpg",
    fallbackImg:
      "https://images.unsplash.com/photo-1566121318594-a4b278998b7e?auto=format&fit=crop&w=1200&q=80",
    url: "https://www.shanghaimuseum.net/",
    tag: "古代艺术 / 华夏瑰宝",
    bestTime: "09:00 - 12:00 (上午精神状态最佳时)",
    duration: "3-4小时",
    ticket: "免费 (需提前在官网/小程序预约)",
    location: "黄浦区",
    hotspot: "青铜馆、陶瓷馆、中国历代书法馆、中国历代绘画馆",
    secrets: [
      "上海博物馆的中国古代青铜馆被誉为「半壁江山」，馆藏的大克鼎是镇馆之宝，器形雄浑，内壁铸有长篇铭文，千万不要错过。",
      "博物馆每天限制入场人数，务必提前在微信小程序上抢票预约，特别是寒暑假和法定节假日，往往一票难求。",
      "馆内的文创店水准极高，以馆藏文物为灵感设计的书签、文具、青铜器冰箱贴非常精美，是极佳的上海手信。",
    ],
  },
  {
    name: "静安寺",
    engName: "Jing'an Temple",
    desc: "上海著名古刹，静安区地标，千年古寺，香火鼎盛",
    detailDesc:
      "坐落于繁华商圈中心的千年古刹。金碧辉煌的庙宇建筑群与周围现代化的摩天大楼形成强烈对比，大雄宝殿内的纯银大佛更是气势宏伟，是都市中一方神圣清幽之地。",
    img: "/images/shanghai-tour/jingan-temple.jpg",
    fallbackImg:
      "https://images.unsplash.com/photo-1605149051441-9a951f251d13?auto=format&fit=crop&w=1200&q=80",
    url: "https://whlyj.sh.gov.cn/",
    tag: "千年古刹 / 都市净土",
    bestTime: "09:00 - 11:00 或 18:00 (观赏夜间金光闪烁)",
    duration: "1-2小时",
    ticket: "¥50 (香期可能有所调整)",
    location: "静安区",
    hotspot: "大雄宝殿、纯银释迦牟尼佛像、静安宝塔",
    secrets: [
      "静安寺大雄宝殿内的释迦牟尼佛像是用15吨纯银铸成，宝光熠熠，法相庄严，极具震撼力。",
      "这里是拍摄「古今对比」绝佳大片的地方。站在寺院钟楼回廊，可以将古色古香的飞檐翘角与背后的会德丰广场等超现代摩天大楼同框拍摄。",
      "寺院旁的静安公园是一处极佳的休憩场所，里面的梧桐大道和街头艺人表演让这里极具生活气息。",
    ],
  },
];

export default function App({ onStartExplore }: { onStartExplore?: () => void }) {
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);

  // 拖拽滚动相关状态与引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  // 更新滚动进度条
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    const totalScrollable = scrollWidth - clientWidth;
    if (totalScrollable > 0) {
      setScrollProgress(scrollLeft / totalScrollable);
    }
  };

  // 鼠标按下开始拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);

    // 临时禁用平滑滚动与吸附，保证拖拽跟手
    scrollContainerRef.current.style.scrollBehavior = "auto";
    scrollContainerRef.current.style.scrollSnapType = "none";

    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
    dragDistanceRef.current = 0;
  };

  // 鼠标移动拖拽中
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();

    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.6; // 拖拽灵敏度
    dragDistanceRef.current = Math.abs(walk);

    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  // 鼠标抬起/离开结束拖拽
  const handleMouseUpOrLeave = () => {
    if (!isDragging || !scrollContainerRef.current) return;
    setIsDragging(false);

    // 恢复平滑滚动与吸附效果
    scrollContainerRef.current.style.scrollBehavior = "smooth";
    scrollContainerRef.current.style.scrollSnapType = "x mandatory";
  };

  // 卡片点击事件（拖拽阈值判断，避免误触）
  const handleCardClick = (item: Attraction, e: React.MouseEvent) => {
    if (dragDistanceRef.current > 6) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setSelectedAttraction(item);
  };

  // 左右箭头导航滚动
  const scrollAmount = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const offsetWidth = container.offsetWidth;
    const targetScroll =
      direction === "left"
        ? container.scrollLeft - offsetWidth * 0.7
        : container.scrollLeft + offsetWidth * 0.7;

    container.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans relative overflow-x-hidden selection:bg-blue-500/30 selection:text-blue-200">
      {/* 环境光效与背景装饰 */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(15,23,42,0.7),rgba(0,0,0,0))]" />

        {/* 柔光浮动光斑 */}
        <div className="absolute w-[50vw] h-[50vw] rounded-full bg-blue-950/15 blur-[140px] top-[-15vw] left-[5vw] animate-ambient-breathe-1" />
        <div className="absolute w-[40vw] h-[40vw] rounded-full bg-indigo-950/10 blur-[130px] bottom-[15vh] right-[5vw] animate-ambient-breathe-2" />

        {/* 极简网格纹理叠加 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      </div>

      {/* Hero 首屏区域 */}
      <section className="relative min-h-[75vh] flex flex-col justify-center items-center overflow-hidden px-4 py-24">
        {/* 背景图与渐变遮罩 */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1474181487882-5abf3f016c2d?auto=format&fit=crop&w=1800&q=80"
            alt="上海外滩全景"
            className="w-full h-full object-cover animate-ken-burns"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-transparent to-slate-950" />
        </div>

        {/* 标题文案容器 */}
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 px-6">
          {/* 英文标签 */}
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md animate-subtitle-reveal">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-slate-300 font-medium">
              SHANGHAI · PORTRAIT
            </span>
          </div>

          {/* 主标题 */}
          <h1 className="text-[clamp(2.5rem,7vw,4.5rem)] font-extrabold tracking-[0.25em] leading-none select-none py-2 animate-hero-reveal">
            <span className="bg-gradient-to-r from-slate-100 via-amber-100 to-indigo-200 bg-clip-text text-transparent filter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">
              江海相拥，潮起东方
            </span>
          </h1>

          {/* 装饰分割线 */}
          <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-amber-200/40 to-transparent mx-auto my-6 animate-line-expand" />

          {/* 副标题 */}
          <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto font-light tracking-[0.2em] leading-relaxed animate-subtitle-reveal">
            百年交织的经典，在霓虹与梧桐树下优雅重塑。
          </p>
        </div>

        {/* 向下滚动提示 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 text-slate-600 text-[8px] tracking-[0.3em] uppercase pointer-events-none animate-subtitle-reveal">
          <span className="animate-pulse">向下滚动 探索魔都</span>
          <div className="w-[1px] h-8 bg-gradient-to-b from-slate-600 to-transparent" />
        </div>
      </section>

      {/* 遇见上海 - 城市引言 */}
      <section className="py-24 relative z-10 bg-slate-950">
        <ScrollReveal delay={100}>
          <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold tracking-[0.4em] text-slate-100 font-artistic">
                遇见上海
              </h2>
              <div className="w-6 h-[1px] bg-slate-700 mx-auto" />
            </div>

            <p className="text-xs sm:text-sm text-slate-400 font-artistic tracking-[0.2em] leading-[2.2] max-w-3xl mx-auto font-light">
              上海枕黄浦江千年涛声而立，衔长江万里奔涌之势，拥东海浩瀚磅礴之姿，承江南文脉的温润底蕴，纳万国文明的璀璨风华。
              这座以海纳百川为风骨、以开明谦和为气度的城市，让古韵与新潮共生共舞，传统与现代交相辉映，在历史与现实的交汇中，书写着属于中国的现代化传奇，绽放着独属于东方的雄浑与浪漫。
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* 时空画廊 - 12个景点横向滚动 */}
      <section id="gallery" className="py-24 relative z-10 bg-slate-900/10 border-t border-white/5 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 板块标题与导航按钮 */}
          <div className="flex items-end justify-between mb-10">
            {/* 左侧标题组 - 极简杂志风 */}
            <ScrollReveal direction="right" className="space-y-2.5">
              <div className="flex items-center space-x-3">
                <span className="w-8 h-[1px] bg-slate-700" />
                <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-slate-500">
                  Time-Space Gallery
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[0.25em] font-artistic">
                <span className="bg-gradient-to-r from-slate-100 via-amber-100 to-indigo-200 bg-clip-text text-transparent">
                  上海天际线
                </span>
              </h2>

              <p className="text-slate-400 text-[11px] sm:text-xs font-light tracking-[0.15em]">
                探索上海 12 大顶级地标
              </p>
            </ScrollReveal>

            {/* 右侧圆形导航按钮 */}
            <ScrollReveal direction="left" className="hidden sm:flex items-center space-x-3">
              <button
                onClick={() => scrollAmount("left")}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="向左滚动"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollAmount("right")}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="向右滚动"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </ScrollReveal>
          </div>

          {/* 横向滚动画廊容器 */}
          <div className="relative">
            <div
              ref={scrollContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              onScroll={handleScroll}
              className={cn(
                "flex space-x-6 overflow-x-auto overflow-y-hidden pb-8 cursor-grab active:cursor-grabbing scrollbar-none snap-x snap-mandatory scroll-smooth",
                isDragging && "select-none"
              )}
              style={{ scrollbarWidth: "none" }}
            >
              {attractionList.map((item, idx) => (
                <ScrollReveal key={item.name} delay={idx * 100} className="flex-shrink-0">
                  <div
                    onClick={(e) => handleCardClick(item, e)}
                    className="w-[280px] sm:w-[320px] h-[440px] rounded-[32px] overflow-hidden bg-slate-900 border border-white/5 shadow-2xl transition-all duration-500 hover:scale-[1.01] hover:border-white/10 snap-start group"
                  >
                    {/* 卡片顶部图片 */}
                    <div className="h-[60%] w-full overflow-hidden relative">
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        draggable="false"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = item.fallbackImg;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                      <span className="absolute top-4 left-4 inline-block px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-blue-300 border border-white/5 text-[8px] tracking-widest uppercase font-semibold">
                        {item.tag.split(" / ")[0]}
                      </span>
                    </div>

                    {/* 卡片底部文案 */}
                    <div className="p-6 h-[40%] flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white tracking-wide">
                          {item.name}
                        </h3>
                        <p className="text-slate-500 text-[10px] uppercase font-mono tracking-widest leading-none">
                          {item.engName}
                        </p>
                        <p className="text-slate-300 text-xs font-light line-clamp-3 leading-relaxed mt-2">
                          {item.desc}
                        </p>
                      </div>

                      <div className="flex items-center text-[10px] font-bold text-blue-400 group-hover:text-blue-300 transition-colors cursor-pointer">
                        探索详情
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* 滚动进度条 */}
            <div className="mt-8 flex items-center justify-between">
              <span className="text-[9px] text-slate-500 tracking-[0.2em] uppercase font-mono">
                往右拖拽探索更多
              </span>
              <div className="w-48 h-[2px] bg-slate-900 rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${scrollProgress * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-500 tracking-[0.2em] uppercase font-mono">
                {Math.round(scrollProgress * 100)}% 进度
              </span>
            </div>
          </div>

          {/* 上海四境 - 垂直叙事艺术板块 */}
          <div className="mt-32">
            {/* 模块总标题区 */}
            <ScrollReveal className="text-center space-y-5 mb-32">
              <div className="flex items-center justify-center space-x-3">
                <span className="w-8 h-[1px] bg-slate-700" />
                <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-slate-500">
                  Urban Temperaments
                </span>
                <span className="w-8 h-[1px] bg-slate-700" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-[0.25em] text-white font-artistic">
                上海四境，各有钟情
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-light tracking-[0.15em] max-w-xl mx-auto font-artistic leading-relaxed">
                从摩天霓虹到巷弄烟火，总有一种步调，契合你的旅行想象
              </p>
            </ScrollReveal>

            {/* 四境 - 从上到下垂直段落布局 */}
            <div className="max-w-2xl mx-auto">
              {/* 壹 · 摩登都市 */}
              <ScrollReveal delay={200} className="pb-20">
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center gap-6">
                    <span className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-[#8FA6B5]/40" />
                    <span className="font-artistic text-4xl sm:text-5xl font-extralight text-[#8FA6B5]/45 leading-none select-none">
                      壹
                    </span>
                    <span className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-[#8FA6B5]/40" />
                  </div>
                  <span className="block text-[10px] font-mono tracking-[0.4em] uppercase text-slate-500">
                    Modern City
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-[0.4em] text-white font-artistic pl-[0.4em]">
                    摩登都市
                  </h3>
                  <p className="text-xs text-slate-500 tracking-[0.25em] font-artistic">
                    陆家嘴 · 外滩 · 北外滩
                  </p>
                  <p className="text-sm text-slate-400 font-light leading-[2.4] font-artistic max-w-md mx-auto pt-1">
                    沿黄浦江踱步，揽摩天楼群勾勒天际轮廓，在霓虹流影里，触碰都市的璀璨锋芒。
                  </p>
                </div>
              </ScrollReveal>

              {/* 传统三点分隔 */}
              <div className="flex items-center justify-center gap-2 pb-20">
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="w-1 h-1 rounded-full bg-slate-800" />
                <span className="w-1 h-1 rounded-full bg-slate-700" />
              </div>

              {/* 贰 · 梧桐人文 */}
              <ScrollReveal delay={400} className="pb-20">
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center gap-6">
                    <span className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-[#E5B88F]/40" />
                    <span className="font-artistic text-4xl sm:text-5xl font-extralight text-[#E5B88F]/45 leading-none select-none">
                      贰
                    </span>
                    <span className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-[#E5B88F]/40" />
                  </div>
                  <span className="block text-[10px] font-mono tracking-[0.4em] uppercase text-slate-500">
                    Lane Culture
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-[0.4em] text-white font-artistic pl-[0.4em]">
                    梧桐人文
                  </h3>
                  <p className="text-xs text-slate-500 tracking-[0.25em] font-artistic">
                    武康路 · 安福路 · 愚园路
                  </p>
                  <p className="text-sm text-slate-400 font-light leading-[2.4] font-artistic max-w-md mx-auto pt-1">
                    梧桐荫蔽红瓦洋房，咖啡香漫过街角巷弄，慢下来，触摸上海柔软的人文肌理。
                  </p>
                </div>
              </ScrollReveal>

              {/* 传统三点分隔 */}
              <div className="flex items-center justify-center gap-2 pb-20">
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="w-1 h-1 rounded-full bg-slate-800" />
                <span className="w-1 h-1 rounded-full bg-slate-700" />
              </div>

              {/* 叁 · 市井烟火 */}
              <ScrollReveal delay={600} className="pb-20">
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center gap-6">
                    <span className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-[#D98B73]/40" />
                    <span className="font-artistic text-4xl sm:text-5xl font-extralight text-[#D98B73]/45 leading-none select-none">
                      叁
                    </span>
                    <span className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-[#D98B73]/40" />
                  </div>
                  <span className="block text-[10px] font-mono tracking-[0.4em] uppercase text-slate-500">
                    Local Life
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-[0.4em] text-white font-artistic pl-[0.4em]">
                    市井烟火
                  </h3>
                  <p className="text-xs text-slate-500 tracking-[0.25em] font-artistic">
                    城隍庙 · 老弄堂 · 本地市集
                  </p>
                  <p className="text-sm text-slate-400 font-light leading-[2.4] font-artistic max-w-md mx-auto pt-1">
                    深入老城厢的弄堂肌理，吴侬软语裹着本帮香气，撞见鲜活的市井烟火与日常诗意。
                  </p>
                </div>
              </ScrollReveal>

              {/* 传统三点分隔 */}
              <div className="flex items-center justify-center gap-2 pb-20">
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="w-1 h-1 rounded-full bg-slate-800" />
                <span className="w-1 h-1 rounded-full bg-slate-700" />
              </div>

              {/* 肆 · 江南水乡 */}
              <ScrollReveal delay={800}>
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center gap-6">
                    <span className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-[#8FB5A8]/40" />
                    <span className="font-artistic text-4xl sm:text-5xl font-extralight text-[#8FB5A8]/45 leading-none select-none">
                      肆
                    </span>
                    <span className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-[#8FB5A8]/40" />
                  </div>
                  <span className="block text-[10px] font-mono tracking-[0.4em] uppercase text-slate-500">
                    Jiangnan Charm
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-[0.4em] text-white font-artistic pl-[0.4em]">
                    江南水乡
                  </h3>
                  <p className="text-xs text-slate-500 tracking-[0.25em] font-artistic">
                    朱家角 · 七宝古镇 · 广富林
                  </p>
                  <p className="text-sm text-slate-400 font-light leading-[2.4] font-artistic max-w-md mx-auto pt-1">
                    暂别都市喧嚣，步入黛瓦白墙的水巷古镇，摇橹声里，拾得藏于魔都的江南温婉。
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>

          {/* 光影沪上 - 城市影像画廊 */}
          <div className="mt-32">
            {/* 模块标题 */}
            <ScrollReveal className="text-center space-y-5 mb-16">
              <div className="flex items-center justify-center space-x-3">
                <span className="w-8 h-[1px] bg-slate-700" />
                <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-slate-500">
                  Urban Frames
                </span>
                <span className="w-8 h-[1px] bg-slate-700" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-[0.25em] text-white font-artistic">
                光影沪上
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-light tracking-[0.15em] max-w-xl mx-auto font-artistic leading-relaxed">
                用镜头定格城市肌理，收藏每一面上海的动人瞬间
              </p>
            </ScrollReveal>

            {/* 瀑布流图片容器 */}
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                <ScrollReveal key={num} delay={num * 20} className="break-inside-avoid">
                  <div className="group relative overflow-hidden rounded-2xl border border-white/5 shadow-lg bg-slate-900/30 transition-all duration-500 hover:border-white/10 hover:shadow-2xl hover:scale-[1.01]">
                    <img
                      src={`/images/shanghai-tour/${num}.jpg`}
                      alt={`上海城市风光 第${num}幅`}
                      className="w-full h-auto object-contain transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                      draggable={false}
                    />
                    {/* 悬停渐变遮罩 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* 沪上风华 - 总结艺术段落 */}
          <ScrollReveal delay={100} className="mt-32">
            <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
              {/* 顶部装饰分隔 */}
              <div className="flex items-center justify-center gap-6">
                <span className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-amber-200/30" />
                <Sparkles className="w-4 h-4 text-amber-300/60" />
                <span className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-amber-200/30" />
              </div>

              {/* 总结标题 艺术大字 */}
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-[0.2em] leading-relaxed font-artistic">
                <span className="bg-gradient-to-r from-slate-100 via-amber-100 to-indigo-200 bg-clip-text text-transparent">
                  潮起东方，沪韵流长
                </span>
              </h3>

              {/* 正文段落 艺术字体 */}
              <p className="text-sm sm:text-base text-slate-300 font-artistic tracking-[0.15em] leading-[2.4] max-w-3xl mx-auto font-light">
                黄浦江潮奔涌，卷开百年风云画卷；上海城气象万千，铺展时代发展新篇。从外滩万国建筑的历史余韵，到陆家嘴摩天楼宇的时代锋芒；从石库门弄堂的烟火温情，到江南水乡的温婉雅致，上海始终以海纳百川的胸襟、开明睿智的气度，熔铸传统与现代，融汇东方与世界，在岁月长河里绘就独树一帜的城市风华。
              </p>

              {/* 收尾句 */}
              <p className="text-sm sm:text-base text-slate-400 font-artistic tracking-[0.15em] leading-[2.4] max-w-2xl mx-auto font-light italic">
                一程沪上寻踪，满目皆是风景。这座城市的厚重与鲜活、典雅与摩登，藏在每一条街巷的肌理里，融在每一缕江风的气息中，待你缓步深入，细细品读，收获专属于魔都的动人记忆。
              </p>

              {/* 底部装饰分隔 */}
              <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-amber-200/40 to-transparent mx-auto" />
            </div>
          </ScrollReveal>

          {/* 官方资讯链接 */}
          <div className="text-center mt-24">
            <ScrollReveal delay={200}>
              <a
                href="https://whlyj.sh.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-[10px] tracking-[0.25em] text-slate-500 hover:text-white font-semibold transition-colors border-b border-slate-850 hover:border-white pb-1"
              >
                访问上海市文化和旅游局官方网站获取更多即时资讯
                <ExternalLink className="w-3.5 h-3.5 ml-2" />
              </a>
            </ScrollReveal>
          </div>

          {/* 行动召唤 CTA */}
          <ScrollReveal delay={300} className="mt-24 max-w-xl mx-auto text-center space-y-6">
            <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent mx-auto" />
            <h3 className="text-xl sm:text-2xl font-light tracking-[0.3em] text-slate-200 font-artistic">
              准备好开启上海之旅了吗？
            </h3>
            <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase font-mono">
              Begin your exploration in the magic city
            </p>
            <div className="pt-4">
              <button
                onClick={onStartExplore}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] tracking-[0.2em] text-slate-300 hover:text-white transition-all duration-300 hover:scale-105"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>开启探索</span>
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-slate-950 border-t border-white/5 text-slate-400 py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Logo与简介 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-white text-slate-950 flex items-center justify-center font-bold text-xs">
                  SH
                </div>
                <span className="font-bold text-sm tracking-widest text-white">
                  上海可视化出行规划智能体平台
                </span>
              </div>
            </div>

            {/* 官方链接 */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-white tracking-widest uppercase">官方平台</h4>
              <ul className="space-y-2 font-light">
                <li>
                  <a
                    href="https://whlyj.sh.gov.cn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center hover:text-white transition-colors"
                  >
                    上海市文化和旅游局
                    <ExternalLink className="w-3 h-3 ml-1.5" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.shanghai.gov.cn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center hover:text-white transition-colors"
                  >
                    上海市人民政府
                    <ExternalLink className="w-3 h-3 ml-1.5" />
                  </a>
                </li>
              </ul>
            </div>

            {/* 项目信息 */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-white tracking-widest uppercase">项目信息</h4>
              <ul className="space-y-2 font-light text-[11px]">
                <li>独立项目 · 作品集演示</li>
                <li>作者: Haolei Xu</li>
                <li className="text-slate-600">非官方旅游服务</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* 景点详情弹窗 */}
      {selectedAttraction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-2xl bg-black/60 transition-all duration-300">
          <div className="relative w-full max-w-3xl rounded-3xl overflow-hidden glassmorphism-modal border border-white/15 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* 关闭按钮 */}
            <button
              onClick={() => setSelectedAttraction(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center border border-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 弹窗头部图片 */}
            <div className="relative h-64 sm:h-80 w-full overflow-hidden">
              <img
                src={selectedAttraction.img}
                alt={selectedAttraction.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = selectedAttraction.fallbackImg;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

              <div className="absolute bottom-6 left-6 right-6">
                <span className="inline-block px-2.5 py-0.5 rounded bg-blue-500 text-[9px] uppercase tracking-wider font-bold mb-2">
                  {selectedAttraction.tag.split(" / ")[0]}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide">
                  {selectedAttraction.name}
                </h2>
                <p className="text-xs text-slate-300 font-mono tracking-widest uppercase">
                  {selectedAttraction.engName}
                </p>
              </div>
            </div>

            {/* 弹窗主体内容 */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* 核心信息卡片 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">
                    最佳访问时段
                  </span>
                  <span className="text-xs text-white font-medium">
                    {selectedAttraction.bestTime}
                  </span>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-1">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">
                    推荐游玩时长
                  </span>
                  <span className="text-xs text-white font-medium">
                    {selectedAttraction.duration}
                  </span>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-1">
                  <Ticket className="w-4 h-4 text-slate-400" />
                  <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">
                    门票参考
                  </span>
                  <span className="text-xs text-white font-medium">
                    {selectedAttraction.ticket}
                  </span>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-1">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">
                    地理位置区域
                  </span>
                  <span className="text-xs text-white font-medium">
                    {selectedAttraction.location}
                  </span>
                </div>
              </div>

              {/* 详细介绍 */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white tracking-widest uppercase">
                  地标美学简介
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-light">
                  {selectedAttraction.detailDesc}
                </p>
              </div>

              {/* 私藏攻略 */}
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5 space-y-3">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <h3 className="text-xs font-bold tracking-widest uppercase">私享探秘</h3>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 font-light">
                  {selectedAttraction.secrets.map((secret, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                      <span className="leading-relaxed">{secret}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 底部操作按钮 */}
              <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <span className="text-[9px] text-slate-500 uppercase block">地标探索</span>
                  <span className="text-xs text-white font-light">
                    您可以访问其官方网址获取深度旅行资讯与购票通路
                  </span>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                  <a
                    href={selectedAttraction.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs text-white transition-all font-semibold"
                  >
                    前往官网
                    <ExternalLink className="w-3.5 h-3.5 ml-2" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
