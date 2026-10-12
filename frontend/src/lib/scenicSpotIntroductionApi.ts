import type { Place } from "./types";
import { chat } from "./api";

const introCache = new Map<string, { content: string; expire: number }>();
const abortControllers = new Map<string, AbortController>();
// 兼容浏览器环境的定时器类型，避免NodeJS类型报错
const preloadTimers = new Map<string, ReturnType<typeof setTimeout>>();

// 本地兜底数据库
const localIntroDatabase: Record<string, string> = {
  "东方明珠广播电视塔": "上海地标性建筑，高468米，是世界第三高塔。塔内有太空舱、旋转餐厅、上海城市历史发展陈列馆等景观和设施。259米全透明悬空观光廊是必体验项目，可360度俯瞰上海全景。",
  "上海中心大厦": "中国第一高楼，高632米，世界第二高楼。118层上海之巅观光厅可俯瞰整个上海，119层有空中咖啡馆。建筑采用螺旋上升设计，象征着中国不断崛起的精神。",
  "外滩": "上海的象征，全长1.5公里，有52幢风格各异的古典复兴大楼，被誉为万国建筑博览群。夜晚灯光璀璨，与对岸陆家嘴的现代建筑群交相辉映，是上海最美的夜景之一。",
  "豫园": "始建于明代嘉靖年间，是江南古典园林的代表作品。园内有假山、池塘、亭台楼阁，布局精巧。豫园商城就在旁边，可以品尝南翔小笼包等上海特色小吃。",
  "上海迪士尼乐园": "中国内地首座迪士尼主题乐园，拥有米奇大街、奇想花园、探险岛、宝藏湾、明日世界、梦幻世界六大主题园区。创极速光轮、七个小矮人矿山车是热门项目。",
  "上海博物馆": "中国最大的古代艺术博物馆之一，馆藏文物近百万件，其中青铜器、陶瓷器、书画最具特色。建筑造型像一个古代的鼎，象征着天圆地方。",
  "上海科技馆": "国家AAAAA级景区，以科学传播为主题，有地壳探秘、生物万象、智慧之光、设计师摇篮等展区。适合亲子游玩，有很多互动体验项目。",
  "上海自然博物馆": "中国最大的自然博物馆之一，拥有29万余件藏品。馆内有巨大的恐龙骨架、各种动植物标本，还有4D影院和宇宙剧场。",
  "复旦大学(邯郸校区)": "中国顶尖的综合性大学，创建于1905年。校园环境优美，有光华楼、相辉堂、燕园等著名建筑。校园内的光华楼是全国最高的教学楼之一。",
  "上海交通大学(徐汇校区)": "中国历史最悠久的高等学府之一，创建于1896年。校园内有百年校庆里程碑、董浩云航运博物馆、钱学森图书馆等景点。",
  "同济大学(四平路校区)": "以工科著称的全国重点大学，校园内有著名的三好坞、同济大礼堂等建筑。同济大学的樱花大道每年春天吸引大量游客前来观赏。"
};

export async function* fetchPlaceIntroductionStream(
  place: Place,
  model: 'lite' | 'pro' = 'lite',
  retryCount: number = 2
): AsyncGenerator<string, void, unknown> {
  // 缓存检查 - 立即返回，无延迟
  const cached = introCache.get(place.id);
  if (cached && Date.now() < cached.expire) {
    yield cached.content;
    return;
  }

  // 取消重复请求
  if (abortControllers.has(place.id)) {
    abortControllers.get(place.id)!.abort();
  }
  const controller = new AbortController();
  abortControllers.set(place.id, controller);

  // 系统提示词
  const systemPrompt = model === 'lite'
    ? '你是专业的上海旅游景点介绍员。请用简洁生动的语言介绍这个上海景点，严格控制在120-150字之间。重点突出：1. 核心特色 2. 必看亮点 3. 适合人群。不要使用任何markdown格式，直接输出纯文本，不要加标题。'
    : '你是资深的上海旅游攻略专家。请详细介绍这个上海景点，字数控制在250-300字之间。内容包括：1. 历史背景与地位 2. 核心特色与必看景点 3. 最佳游览时间与建议 4. 适合人群与游玩贴士。语言生动有趣，不要使用任何markdown格式，直接输出纯文本。';

  try {
    console.log(`🔍 通过后端RAG服务获取: ${place.name}`);
    if (controller.signal.aborted) return;
    const result = await chat({
      query: `${systemPrompt}\n\n请介绍上海的${place.name}，它属于${formatCategory(place.category)}类别。`,
      city: '上海',
    });
    if (controller.signal.aborted) return;
    const fullText = result.answer.trim();
    if (!fullText) throw new Error('后端返回了空的景点介绍');
    yield fullText;

    // 写入缓存
    introCache.set(place.id, {
      content: fullText,
      expire: Date.now() + 24 * 60 * 60 * 1000
    });
    console.log(`✅ 后端RAG调用成功: ${place.name}`);
    return;

  } catch (err: any) {
    if (err.name === 'AbortError') return;
    console.error(`❌ 后端介绍接口调用失败: ${place.name}`, err);
    
    // 重试逻辑
    if (retryCount > 0) {
      console.log(`⏳ 1秒后自动重试API（剩余${retryCount}次）`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      yield* fetchPlaceIntroductionStream(place, model, retryCount - 1);
      return;
    }

    // 本地兜底逻辑 - 立即返回
    console.log(`⚠️ API全部失败，使用静态兜底数据: ${place.name}`);
    if (localIntroDatabase[place.name]) {
      const text = localIntroDatabase[place.name];
      introCache.set(place.id, { content: text, expire: Date.now() + 24 * 60 * 60 * 1000 });
      yield text;
      return;
    }

    // 通用兜底文本 - 立即返回
    const fallbackText = `${place.name}是上海著名的${formatCategory(place.category)}，${place.ticketCny === 0 ? '免费开放' : `门票${place.ticketCny}元`}。这里环境优美，设施完善，是休闲娱乐、观光旅游的好去处。建议安排1-2小时游览时间。`;
    introCache.set(place.id, { content: fallbackText, expire: Date.now() + 24 * 60 * 60 * 1000 });
    yield fallbackText;
  } finally {
    abortControllers.delete(place.id);
  }
}

// 分类格式化
function formatCategory(c: Place["category"]) {
  switch (c) {
    case "museum": return "博物馆";
    case "mall": return "商圈商场";
    case "park": return "城市公园";
    case "landmark": return "地标建筑";
    case "attraction": return "旅游景点";
    case "university": return "高等院校";
    default: return "景点";
  }
}

// 预加载景点介绍
export function preloadPlaceIntroduction(place: Place, model: 'lite' | 'pro' = 'lite') {
  if (introCache.has(place.id) && Date.now() < introCache.get(place.id)!.expire) return;

  if (preloadTimers.has(place.id)) {
    clearTimeout(preloadTimers.get(place.id)!);
  }

  const timer = setTimeout(async () => {
    try {
      const generator = fetchPlaceIntroductionStream(place, model, 0);
      let fullText = '';
      for await (const chunk of generator) {
        fullText += chunk;
      }
      console.log(`预加载完成: ${place.name}`);
    } catch (e) {
      console.log(`预加载失败: ${place.name}`);
    } finally {
      preloadTimers.delete(place.id);
    }
  }, 300);

  preloadTimers.set(place.id, timer);
}

// 取消预加载
export function cancelPreload(placeId: string) {
  if (preloadTimers.has(placeId)) {
    clearTimeout(preloadTimers.get(placeId)!);
    preloadTimers.delete(placeId);
  }
}

// 获取交通信息
export async function fetchPlaceTraffic(place: Place): Promise<string> {
  const trafficData: Record<string, string> = {
    '东方明珠广播电视塔': '地铁2号线陆家嘴站1号口出，步行5分钟',
    '上海中心大厦': '地铁2号线陆家嘴站6号口出，步行8分钟',
    '外滩': '地铁2号线/10号线南京东路站6号口出，步行10分钟',
    '豫园': '地铁10号线豫园站1号口出，步行3分钟',
    '上海迪士尼乐园': '地铁11号线迪士尼站1号口出，步行5分钟',
    '南京路步行街': '地铁2号线/10号线南京东路站',
    '人民广场': '地铁1号线/2号线/8号线人民广场站',
    '静安寺': '地铁2号线/7号线静安寺站',
    '徐家汇商圈': '地铁1号线/9号线/11号线徐家汇站',
    '上海博物馆': '地铁1号线/2号线/8号线人民广场站1号口出',
    '上海城隍庙': '地铁10号线豫园站1号口出，步行5分钟',
    '复旦大学(邯郸校区)': '地铁10号线复旦大学站2号口出',
    '上海交通大学(徐汇校区)': '地铁1号线徐家汇站16号口出',
    '同济大学(四平路校区)': '地铁10号线同济大学站1号口出'
  };
  return trafficData[place.name] || '建议使用地图APP查询实时交通信息';
}
