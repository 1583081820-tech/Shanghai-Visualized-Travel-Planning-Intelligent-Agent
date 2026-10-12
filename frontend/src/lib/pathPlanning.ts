import type { Place, PlanResult } from "./types";
import { parseConstraints } from "./agents";
import {
  generateEnhancedPlan,
  generatePlan,
  type TravelPlan as ApiTravelPlan,
} from "./api";

// ===================== 用户意图识别 =====================
type UserIntent = 
  | "add"        // 新增景点
  | "remove"     // 删除景点
  | "replace"    // 替换景点
  | "adjust"     // 调整/优化行程
  | "replan"     // 完全重新规划
  | "confirm"    // 确认/认可
  | "general";   // 普通需求（首次规划或一般询问）

/**
 * 智能识别用户意图
 */
function detectUserIntent(userInput: string, hasCurrentPlan: boolean): UserIntent {
  const input = userInput.toLowerCase();
  
  // 确认类
  if (/(就这个|可以了|确认|不错|挺好|就这样|好的|没问题|ok|yes)/.test(input)) {
    return "confirm";
  }
  
  // 重新规划类
  if (/(重新规划|换一个|完全不同|重来|重新来|重新做|换个方案|换种方式)/.test(input)) {
    return "replan";
  }
  
  // 替换类
  if (/(换成|改成|替换|换为|把.+换成|把.+改成|把.+替换成)/.test(input)) {
    return "replace";
  }
  
  // 删除类
  if (/(去掉|删除|不要|不去|去掉.+|删除.+|不要.+)/.test(input) && !/(不要错过|不要忘记|不要太)/.test(input)) {
    return "remove";
  }
  
  // 新增类
  if (/(增加|添加|加入|多去|加上|再去|还要|想去|加上.+|再去一个|多去一个)/.test(input)) {
    return "add";
  }
  
  // 调整类
  if (/(调整|优化|改进|改一下|调整一下|优化一下|改进一下|改改|调整行程|优化行程)/.test(input)) {
    return "adjust";
  }
  
  // 如果有当前行程且用户说"修改"、"改"等，也算调整
  if (hasCurrentPlan && /(改|修改|调整|优化)/.test(input)) {
    return "adjust";
  }
  
  return "general";
}

/**
 * 根据用户意图生成规划策略说明
 */
function getStrategyByIntent(intent: UserIntent): string {
  const strategies: Record<UserIntent, string> = {
    add: `
【规划策略：增量新增】
用户希望在现有行程基础上新增景点。请遵循以下规则：
1. 保持已确认的行程完全不变
2. 保持未确认但用户没提到的景点不变
3. 将用户明确要求新增的景点添加到合适的日期
4. 新增景点后，重新优化当天的游览顺序和路线
5. 如果新增景点导致当天行程过满，可以适当调整其他景点的时间，但不要删除用户没提到的景点
6. 新增的景点必须从可选景点列表中选择
`,
    remove: `
【规划策略：增量删除】
用户希望从现有行程中删除某些景点。请遵循以下规则：
1. 保持已确认的行程完全不变
2. 只删除用户明确要求删除的景点
3. 删除景点后，重新优化当天的游览顺序和路线
4. 不要删除用户没提到的景点
5. 如果删除后当天景点过少，可以适当补充1-2个同类型景点，但要标注为"推荐补充"
`,
    replace: `
【规划策略：增量替换】
用户希望替换行程中的某些景点。请遵循以下规则：
1. 保持已确认的行程完全不变
2. 只替换用户明确要求替换的景点
3. 替换的新景点必须从可选景点列表中选择
4. 替换后，重新优化当天的游览顺序和路线
5. 不要修改用户没提到的景点
`,
    adjust: `
【规划策略：优化调整】
用户希望优化调整现有行程。请遵循以下规则：
1. 保持已确认的行程完全不变
2. 在现有行程基础上进行优化
3. 优化方向：路线更顺、时间更合理、体验更好
4. 尽量保留原有的核心景点，只做微调
5. 如果用户提到了具体的调整方向，优先满足用户需求
6. 调整幅度不要太大，保持行程的整体框架
`,
    replan: `
【规划策略：完全重新规划】
用户希望完全重新规划行程。请遵循以下规则：
1. 保持已确认的行程完全不变
2. 未确认的行程可以完全重新编排
3. 不受之前行程的限制，自由发挥
4. 但要严格遵守用户的所有需求和约束条件
5. 提供一个全新的、优化的行程方案
`,
    confirm: `
【规划策略：确认保持】
用户对当前行程表示认可。请保持行程完全不变，只需要确认并给出积极的回应。
`,
    general: `
【规划策略：全新规划】
这是首次规划或用户提出了新的需求。请遵循以下规则：
1. 严格按照用户的需求和约束条件规划行程
2. 充分考虑出行人群、预算、游玩风格等因素
3. 合理安排每天的景点数量和游览时间
4. 优化路线，减少往返路程
5. 结合RAG本地知识库提供专业建议
`
  };
  
  return strategies[intent] || strategies.general;
}

/**
 * 构建Prompt：注入RAG知识库，强制模型标注本地知识来源
 * 【优先级排序】用户明确需求 > 已确认行程 > RAG知识库 > 实时网络信息 > 通用知识
 */
function buildPrompt(
  userInput: string,
  allPlaces: Place[],
  searchInfo: string,
  ragInfo: { local_tips: string; knowledge_highlights: string[] },
  currentPlan?: any,
  confirmedDays?: number[]
): string {
  const placesStr = allPlaces
    .map(
      (p) =>
        `景点名称：${p.name} | 分类：${p.category} | 门票：${p.ticketCny ?? 0}元 | 坐标：${p.lon},${p.lat}`
    )
    .join("\n");

  const highlightsStr = ragInfo.knowledge_highlights.length > 0 
    ? `\n${ragInfo.knowledge_highlights.map((h, i) => `${i+1}. ${h}`).join("\n")}`
    : "";

  // 智能识别用户意图
  const hasCurrentPlan = currentPlan && currentPlan.days && currentPlan.days.length > 0;
  const userIntent = detectUserIntent(userInput, hasCurrentPlan);
  const strategyText = getStrategyByIntent(userIntent);

  // 构建当前行程上下文
  let currentPlanContext = "";
  if (hasCurrentPlan) {
    const confirmedSet = new Set(confirmedDays || []);
    const confirmedDaysList = currentPlan.days.filter((d: any) => confirmedSet.has(d.day));
    const unconfirmedDaysList = currentPlan.days.filter((d: any) => !confirmedSet.has(d.day));

    if (confirmedDaysList.length > 0) {
      currentPlanContext += `\n## 已确认的行程（【绝对不能修改】，必须原样保留在最终结果中）\n`;
      currentPlanContext += `以下行程用户已确认，禁止任何修改、删除、调整顺序，必须完全原样保留：\n`;
      confirmedDaysList.forEach((d: any) => {
        currentPlanContext += `Day ${d.day}（${d.title || ""}）：${d.places.map((p: any) => p.name).join(" → ")}\n`;
      });
      currentPlanContext += `\n【重要约束】已确认的天数必须保持原日期、原景点、原顺序，不得有任何变动。\n`;
    }

    if (unconfirmedDaysList.length > 0) {
      currentPlanContext += `\n## 当前未确认的行程（可参考并优化）\n`;
      currentPlanContext += `以下是用户当前未确认的行程，供你参考：\n`;
      unconfirmedDaysList.forEach((d: any) => {
        currentPlanContext += `Day ${d.day}（${d.title || ""}）：${d.places.map((p: any) => p.name).join(" → ")}\n`;
      });
    }
  }

  return `
# 角色：专业上海旅游规划师

# ⚠️ 最高优先级规则（必须严格遵守，违反视为无效输出）
【优先级排序】用户明确需求 > 已确认行程 > RAG本地知识库 > 实时网络信息 > 你的通用知识

1. 【最高优先级】**用户的明确需求是第一位的**，必须严格遵守和满足
2. 【第二优先级】已确认的行程绝对不能修改，必须完全原样保留
3. 【第三优先级】优先使用RAG本地知识库内容规划行程
4. 所有来自RAG知识库的内容，在思考过程中必须标注【RAG本地知识】前缀
5. 景点仅允许从【可选景点列表】中选择，名称必须一字不差，禁止编造景点
6. 输出格式：先自然语言思考过程 → 再输出纯JSON，JSON内部禁止任何注释、多余文字、解释
7. JSON字段严格遵循示例结构，不允许增删字段
8. 在最终JSON的notes数组中，必须单独添加一条以"💡 RAG本地知识库贴士："开头的内容

${strategyText}

## 一、用户出行需求（最高优先级，必须严格满足）
${userInput}

【重要提醒】请仔细分析用户需求，确保所有明确提到的要求都被满足。如果用户提到了具体的景点、天数、预算、人群等，必须严格遵守。

${currentPlanContext}

## 二、RAG本地知识库（第三优先级，优先参考）
${ragInfo.local_tips || "无本地旅游知识库内容"}
${highlightsStr}

## 三、实时网络信息（补充参考）
${searchInfo}

## 四、可选景点列表（仅可从中挑选）
${placesStr}

## 五、输出格式示例（严格照搬结构）
【思考过程】
1. 解析出行天数、人群、预算、游玩偏好
2. 【RAG本地知识】上海地铁三日票45元，可无限次乘坐，比单次购票节省30%
3. 检查是否有已确认行程，确保完全保留
4. 判断用户意图：是增量修改还是完全重排
5. 结合本地知识库筛选景点、规划路线
6. 核算门票费用，校验预算
{"constraints":{"days":3,"budgetCny":1500,"crowd":"couple","preferIndoor":false,"pace":"normal"},"days":[{"day":1,"title":"Day1 经典地标路线","places":[{"name":"外滩","category":"landmark","ticketCny":0}],"legs":[],"estimatedTicketsCny":0}],"notes":["行程贴士、注意事项","💡 RAG本地知识库贴士：豫园最佳游览时间是早上8:30开门时，避开9:30后的旅行团高峰"]}
`;
}

function normalizePlaceName(value: string): string {
  return value.replace(/[\s()（）·]/g, "").toLowerCase();
}

function toLocalPlan(
  apiPlan: ApiTravelPlan,
  allPlaces: Place[],
  constraints: PlanResult["constraints"],
): PlanResult {
  const unmatched = new Set<string>();
  const days = apiPlan.days.map((day, index) => {
    const names = [...day.morning, ...day.afternoon, ...day.evening];
    const places = names.flatMap((name) => {
      const normalized = normalizePlaceName(name);
      const match = allPlaces.find((place) => {
        const candidate = normalizePlaceName(place.name);
        return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate);
      });
      if (!match) unmatched.add(name);
      return match ? [match] : [];
    });

    return {
      day: day.day_number || index + 1,
      title: day.theme || `Day ${day.day_number || index + 1}`,
      places,
      legs: [],
      estimatedTicketsCny: places.reduce((sum, place) => sum + (place.ticketCny || 0), 0),
    };
  });

  const notes = [apiPlan.summary, apiPlan.budget_estimate]
    .filter((value): value is string => Boolean(value));
  if (unmatched.size > 0) {
    notes.push(`未在地图点位库中匹配：${Array.from(unmatched).join("、")}`);
  }
  return { constraints, days, notes };
}

/**
 * 流式生成行程（核心优化版，凸显RAG使用）
 * 流程：解析需求 → 意图识别 → 调用后端RAG/Agent接口 → 映射结构化行程
 * 【优化点】智能识别用户意图，动态调整规划策略，保障用户需求优先级
 */
export async function* generateTravelPlan(
  userInput: string,
  allPlaces: Place[],
  currentPlan?: any,
  confirmedDays?: number[],
  mode: 'fast' | 'agent' = 'fast'
): AsyncGenerator<string> {
  // 1. 解析用户基础约束
  const { constraints } = parseConstraints(userInput);
  yield `📝 解析出行需求：共${constraints.days}天出行\n`;

  // 2. 智能识别用户意图
  const hasCurrentPlan = currentPlan && currentPlan.days && currentPlan.days.length > 0;
  const userIntent = detectUserIntent(userInput, hasCurrentPlan);
  
  const intentLabels: Record<string, string> = {
    add: "🎯 识别到意图：新增景点",
    remove: "🎯 识别到意图：删除景点",
    replace: "🎯 识别到意图：替换景点",
    adjust: "🎯 识别到意图：优化调整行程",
    replan: "🎯 识别到意图：完全重新规划",
    confirm: "🎯 识别到意图：确认行程",
    general: "🎯 识别到意图：全新规划",
  };
  yield `${intentLabels[userIntent] || "🎯 识别到意图：全新规划"}\n`;
  
  // 如果是确认意图，直接返回，不重新规划
  if (userIntent === "confirm" && currentPlan) {
    yield "✅ 已确认当前行程，保持不变\n";
    return;
  }

  const crowdLabels: Record<string, string> = {
    family: "家庭",
    couple: "情侣",
    solo: "独自旅行",
    friends: "朋友",
    unknown: "成人",
  };
  const prompt = buildPrompt(
    userInput,
    allPlaces,
    "实时工具由后端安全调用",
    { local_tips: "", knowledge_highlights: [] },
    currentPlan,
    confirmedDays,
  );

  try {
    yield mode === 'agent'
      ? "🤖 Agent模式：正在调用后端工具与RAG服务...\n"
      : "⚡ Fast模式：正在调用后端RAG服务...\n";

    const request = {
      query: prompt,
      days: constraints.days,
      crowd: crowdLabels[constraints.crowd] || "成人",
      city: "上海",
      budget: constraints.budgetCny ? `${constraints.budgetCny}元` : undefined,
    };
    const apiPlan = mode === 'agent'
      ? await generateEnhancedPlan(request)
      : await generatePlan(request);

    const usedTools = 'used_tools' in apiPlan && Array.isArray(apiPlan.used_tools)
      ? apiPlan.used_tools as string[]
      : [];
    if (usedTools.length > 0) {
      yield `🔧 使用工具: ${usedTools.join('、')}\n`;
    }
    yield "✅ 后端已完成结构化行程生成\n";
    yield JSON.stringify(toLocalPlan(apiPlan, allPlaces, constraints));
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    yield `❌ 行程生成异常：${message}\n`;
  }
}

/**
 * 解析流式文本为PlanResult（无改动）
 */
export function parsePlanResult(fullText: string): PlanResult | null {
  const jsonReg = /\{[\s\S]*\}/;
  const match = fullText.match(jsonReg);
  if (!match) return null;
  try {
    const jsonStr = match[0];
    const raw = JSON.parse(jsonStr);
    if (!raw?.days || !Array.isArray(raw.days)) return null;

    return {
      constraints: raw.constraints,
      days: raw.days,
      notes: raw.notes || [],
    };
  } catch {
    return null;
  }
}

// 别名（兼容原有调用）
export const parsePlanResultFromStream = parsePlanResult;

// ========== 新增：保存行程到MySQL数据库 ==========
/**
 * 将行程规划保存到后端MySQL数据库
 * 【技术栈】MySQL + SQLAlchemy ORM 数据持久化
 */
export async function savePlanToBackend(
  plan: PlanResult,
  title: string,
  city: string = '上海',
  crowdType?: string,
  budgetLevel?: string
): Promise<{ id: number; title: string }> {
  try {
    // 转换为后端需要的格式
    const daysData = plan.days.map((day, index) => ({
      day_number: day.day || index + 1,
      theme: day.title || `Day ${day.day || index + 1}`,
      places_json: day.places?.map((p: any) => ({
        name: p.name,
        category: p.category,
        ticketCny: p.ticketCny,
      })) || [],
      food_recommendations: [],
      transportation: '',
      tips: '',
    }));

    const requestBody = {
      title: title || `上海${plan.constraints?.days || 3}日游行程`,
      city: city,
      total_days: plan.constraints?.days || plan.days?.length || 3,
      crowd_type: crowdType || plan.constraints?.crowd || '',
      budget_level: budgetLevel || plan.constraints?.budgetCny ? `${plan.constraints.budgetCny}元` : '',
      status: 'confirmed',
      days: daysData,
    };

    const res = await fetch('/api/v1/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `保存失败: ${res.status}`);
    }

    const data = await res.json();
    console.log(`✅ 行程已保存到MySQL数据库，ID: ${data.id}`);
    return { id: data.id, title: data.title };

  } catch (err: any) {
    console.error('❌ 保存行程到数据库失败:', err);
    throw err;
  }
}
