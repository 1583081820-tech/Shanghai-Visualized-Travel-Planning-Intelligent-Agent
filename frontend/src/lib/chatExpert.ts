/**
 * 上海文旅智能助手 - 后端API版（双模式智能路由）
 * 链路：用户提问 → 智能路由判断 → 快速模式(RAG) / Agent模式(多工具) → 大模型生成回答
 * 【技术栈】后端LangChain + FAISS向量库 + Redis对话记忆 + 高德地图工具
 */

// ========== 类型定义 ==========
interface SmartChatResponse {
  answer: string;
  session_id: string;
  mode: "fast" | "agent";
  used_tools: string[];
  is_degraded: boolean;
}

// ========== 会话ID管理 ==========
// 使用 sessionStorage 替代 localStorage：关闭浏览器即清除会话记忆
// 只有在浏览器打开期间，用户持续使用时才能记住上下文
const SESSION_KEY = 'travel_session_id';

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function resetSession(): string {
  const newSessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  sessionStorage.setItem(SESSION_KEY, newSessionId);
  return newSessionId;
}

export function getCurrentSessionId(): string {
  return getSessionId();
}

// ========== 带超时的fetch封装 ==========
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = 60000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请检查后端服务是否正常运行');
    }
    throw err;
  }
}

// ========== 1. 智能聊天接口（双模式） ==========
/**
 * 调用后端智能聊天接口
 * 支持快速模式/Agent模式自动切换，超时自动降级
 */
async function smartChatWithBackend(
  query: string, 
  city: string = '上海',
  mode: 'auto' | 'fast' | 'agent' = 'auto',
  timeout: number = 20
): Promise<SmartChatResponse> {
  const sessionId = getSessionId();
  
  const res = await fetchWithTimeout('/api/v1/chat/smart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': sessionId,
    },
    body: JSON.stringify({ query, city, mode, timeout }),
  }, timeout * 1000 + 5000); // 多给5秒缓冲

  if (!res.ok) {
    let errorMsg = `请求失败: ${res.status}`;
    try {
      const errorData = await res.json();
      errorMsg = errorData.detail || errorMsg;
    } catch (e) {
      // 忽略解析错误
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

// ========== 2. 清除对话历史 ==========
/**
 * 清除当前会话的对话历史（后端Redis/内存）
 */
export async function clearChatHistory(): Promise<{ status: string; message: string }> {
  const sessionId = getSessionId();
  
  const res = await fetchWithTimeout('/api/v1/chat/history', {
    method: 'DELETE',
    headers: {
      'X-Session-Id': sessionId,
    },
  }, 10000);

  if (!res.ok) {
    throw new Error('清除历史失败');
  }

  return res.json();
}

// ========== 3. 模拟流式输出（打字机效果） ==========
/**
 * 将完整文本模拟为流式输出
 * 保持前端的打字机体验
 */
async function* simulateStream(text: string, speed: number = 15): AsyncGenerator<string, void, unknown> {
  for (let i = 0; i < text.length; i++) {
    yield text[i];
    // 每个字符间隔，速度随机一点更自然
    await new Promise(r => setTimeout(r, speed + Math.random() * 10));
  }
}

// ========== 4. 主入口：智能问答（双模式） ==========
/**
 * 上海文旅专家智能问答
 * 真正调用后端API，使用RAG + 对话记忆 + Agent能力
 * 
 * @param question 用户问题
 * @param mode 模式：auto（自动）/ fast（快速）/ agent（智能）
 */
export async function* askShanghaiExpert(
  question: string,
  mode: 'auto' | 'fast' | 'agent' = 'auto'
): AsyncGenerator<string, void, unknown> {
  // 阶段1：模式确认
  if (mode === 'fast') {
    yield "⚡ 极速模式：基于知识库快速回答\n";
  } else {
    yield "🤖 Agent模式：调用多工具链深度分析\n";
  }
  await new Promise(r => setTimeout(r, 200));

  // 阶段2：RAG知识库检索（后端自动处理）
  yield "📚 正在检索上海文旅本地知识库...\n";
  await new Promise(r => setTimeout(r, 200));

  // 阶段3：工具链准备
  if (mode === 'agent' || mode === 'auto') {
    yield "🔧 正在加载智能工具链...\n";
    await new Promise(r => setTimeout(r, 200));
  }

  // 阶段4：大模型生成回答
  yield "⚡ 大模型正在融合信息生成专业回答...\n\n";
  await new Promise(r => setTimeout(r, 100));

  try {
    // 调用后端智能聊天接口
    const result = await smartChatWithBackend(question, '上海', mode, 18);
    
    // 构建技术栈标签前缀
    let prefix = '';
    
    // 模式标签
    if (result.mode === 'fast') {
      prefix += `⚡ 【快速模式】基于 RAG 知识库 + 大模型\n`;
    } else {
      prefix += `🤖 【Agent 智能模式】多工具自主调度\n`;
    }
    
    // 超时降级提示
    if (result.is_degraded) {
      prefix += `⏰ 【超时降级】Agent响应超时，已自动切换到快速模式\n`;
    }
    
    // 使用的工具列表
    if (result.used_tools && result.used_tools.length > 0) {
      const toolNames = result.used_tools.map(t => {
        const nameMap: Record<string, string> = {
          'search_nearby_places': '📍地点搜索',
          'calculate_route': '🗺️路线计算',
          'search_knowledge_base': '📚知识库检索',
          'get_weather_info': '🌤️天气查询',
          '知识库检索': '📚知识库检索',
        };
        return nameMap[t] || t;
      });
      prefix += `🔧 使用工具：${toolNames.join('、')}\n`;
    }
    
    prefix += '\n';

    // 流式输出前缀
    for await (const chunk of simulateStream(prefix, 8)) {
      yield chunk;
    }

    // 流式输出回答内容
    for await (const chunk of simulateStream(result.answer, 12)) {
      yield chunk;
    }

  } catch (err: any) {
    yield `\n\n❌ 服务异常：${err.message}`;
    yield '\n\n💡 请检查：';
    yield '\n   1. 后端服务是否启动（端口8001）';
    yield '\n   2. 后端LLM API密钥是否正确配置';
    yield '\n   3. 网络连接是否正常';
    yield '\n   4. 首次调用可能较慢（加载模型），请耐心等待或刷新重试';
  }
}

// ========== 5. 退出登录（清除所有会话数据） ==========
/**
 * 退出登录：清除本地会话ID + 清除后端对话历史
 * 点击退出登录后，上下文记忆完全清除，像是新的一样
 */
export async function logout(): Promise<void> {
  try {
    // 先清除后端的对话历史（Redis/内存）
    await clearChatHistory();
  } catch (e) {
    // 即使后端清除失败，也要清除本地
    console.warn('清除后端历史失败:', e);
  }
  
  // 清除本地会话ID（sessionStorage：关闭浏览器也会自动清除）
  sessionStorage.removeItem(SESSION_KEY);
}
