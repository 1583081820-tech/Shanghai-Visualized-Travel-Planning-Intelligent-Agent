"""
Agent 智能体
基于 LangChain 的工具调用 Agent，支持多工具自主调度
"""
from typing import List, Dict, Any, Optional

from langchain.tools import tool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from loguru import logger

from app.core.config import settings
from app.utils.amap import amap_client
from app.services.rag_chain import get_retriever


# ==============================================
# 1. 定义工具函数
# ==============================================

@tool
def search_nearby_places(keyword: str, city: str = "上海") -> str:
    """
    搜索地点信息（景点、美食、酒店、餐厅、购物等）。
    【使用场景】用户询问具体地点推荐、附近有什么、推荐餐厅/酒店/景点时使用。
    【注意】调用一次即可获得结果，无需反复调用。

    参数:
        keyword: 搜索关键词，如"外滩美食"、"陆家嘴酒店"、"上海景点"
        city: 城市名称，默认为"上海"

    返回:
        地点列表（名称+地址）
    """
    logger.info(f"🔧 调用工具: search_nearby_places(keyword={keyword}, city={city})")
    places = amap_client.text_search(keyword, city, limit=5)

    if not places:
        return f"抱歉，在{city}没有找到关于'{keyword}'的相关地点信息。"

    # 简化返回内容，只保留关键信息，方便Agent快速处理
    result = f"【{city} - {keyword} 搜索结果】\n"
    for i, place in enumerate(places[:5], 1):
        result += f"{i}. {place['name']} - {place['address']}\n"
    
    result += "\n请直接根据以上信息回答用户问题，不需要继续搜索。"
    return result


@tool
def calculate_route(origin: str, destination: str, city: str = "上海") -> str:
    """
    计算两个地点之间的驾车距离和时间。
    【使用场景】用户询问从A到B要多久、距离多远、怎么去时使用。
    【注意】只需要调用一次，直接根据结果回答即可。

    参数:
        origin: 起点名称，如"人民广场"、"虹桥火车站"
        destination: 终点名称，如"外滩"、"迪士尼乐园"
        city: 城市名称，默认为"上海"

    返回:
        距离和预计时间
    """
    logger.info(f"🔧 调用工具: calculate_route(origin={origin}, destination={destination})")

    # 先地理编码获取坐标
    origin_geo = amap_client.geocode(origin, city)
    dest_geo = amap_client.geocode(destination, city)

    if not origin_geo:
        return f"抱歉，无法找到'{origin}'的位置信息。"
    if not dest_geo:
        return f"抱歉，无法找到'{destination}'的位置信息。"

    origin_loc = f"{origin_geo['lng']},{origin_geo['lat']}"
    dest_loc = f"{dest_geo['lng']},{dest_geo['lat']}"

    # 计算路线
    route = amap_client.driving_route(origin_loc, dest_loc)

    if route.get("error"):
        return f"路线计算失败：{route['error']}"

    # 简化返回内容
    result = f"从{origin}到{destination}：约{route['distance']:.1f}公里，驾车约{route['duration']:.0f}分钟。"
    if route.get("tolls"):
        result += f" 过路费约{route['tolls']}元。"
    
    result += "\n请直接根据以上信息回答用户问题。"
    return result


@tool
def search_knowledge_base(query: str, city: str = "上海") -> str:
    """
    检索本地旅游知识库（实用贴士、避坑指南、旅游建议）。
    【使用场景】用户询问旅游注意事项、避坑攻略、本地特色、实用建议时使用。
    【注意】调用一次即可，不需要反复检索。

    参数:
        query: 查询内容，如"旅游注意事项"、"避坑指南"
        city: 城市名称，默认为"上海"

    返回:
        知识库相关内容
    """
    logger.info(f"🔧 调用工具: search_knowledge_base(query={query}, city={city})")

    try:
        retriever = get_retriever(city=city, top_k=3)
        docs = retriever.invoke(query)

        if not docs:
            return "知识库中没有找到相关的信息。"

        # 简化返回内容
        result = "【知识库参考】\n"
        for i, doc in enumerate(docs[:2], 1):
            result += f"{doc.page_content}\n"
        
        result += "\n请结合以上信息回答用户问题。"
        return result

    except Exception as e:
        logger.error(f"❌ 知识库检索失败: {e}")
        return f"知识库检索失败：{str(e)}"


@tool
def get_weather_info(city: str = "上海") -> str:
    """
    查询实时天气信息。
    【使用场景】用户询问天气怎么样、温度多少、会不会下雨、穿衣建议时使用。
    【注意】只需要调用一次，直接根据结果回答即可。

    参数:
        city: 城市名称，默认为"上海"

    返回:
        天气状况、温度、风力等信息
    """
    logger.info(f"🔧 调用工具: get_weather_info(city={city})")

    weather = amap_client.weather_info(city)

    if not weather:
        return f"抱歉，无法获取{city}的天气信息。"

    # 简化返回内容
    result = f"{city}天气：{weather['weather']}，{weather['temperature']}°C，{weather['winddirection']}风{weather['windpower']}级，湿度{weather['humidity']}%。"
    
    result += "\n请直接根据以上信息回答用户问题，给出穿衣建议等。"
    return result


# ==============================================
# 2. 工具列表
# ==============================================
tools = [
    search_nearby_places,
    calculate_route,
    search_knowledge_base,
    get_weather_info,
]


# ==============================================
# 3. Agent 提示词
# ==============================================
agent_prompt = ChatPromptTemplate.from_messages([
    ("system", """
你是上海旅游智能助手"小沪"。

【可用工具】
- search_nearby_places：搜索地点（景点/美食/酒店/餐厅）
- calculate_route：计算两地驾车距离和时间
- search_knowledge_base：检索旅游知识库（贴士/注意事项）
- get_weather_info：查询实时天气

【最重要的规则 - 必须严格遵守】
1. 最多调用1次工具！调用完直接给出最终答案！
2. 绝对不要反复调用工具，绝对不要换关键词搜索
3. 有结果就够了，不需要追求完美
4. 信息不足时，结合你的通用知识补充回答

【回答要求】
- 用中文，语气亲切热情
- 推荐3-5个地点，每个1-2句话说明
- 适当用 emoji
- 最后加1条小贴士

【记住】调用完工具 → 直接回答 → 结束。不要继续思考，不要继续调用工具！
    """),
    MessagesPlaceholder("chat_history", optional=True),
    ("human", "{input}"),
    MessagesPlaceholder("agent_scratchpad"),
])


# ==============================================
# 4. 创建 Agent
# ==============================================
def get_agent_executor() -> AgentExecutor:
    """获取 Agent 执行器实例"""
    if not hasattr(get_agent_executor, "_instance"):
        logger.info("🤖 正在初始化 Agent...")

        llm = ChatOpenAI(
            model=settings.DOUBAO_MODEL,
            api_key=settings.DOUBAO_API_KEY,
            base_url=settings.DOUBAO_BASE_URL,
            temperature=0.7,
        )

        agent = create_tool_calling_agent(llm, tools, agent_prompt)

        get_agent_executor._instance = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            handle_parsing_errors="检查你的输出格式，确保正确使用tool_call格式。直接给出最终答案。",
            max_iterations=3,  # 优化：最多3次迭代，大幅提升响应速度
            early_stopping_method="force",  # 达到最大迭代时，强制输出最终答案
            return_intermediate_steps=True,
        )

        logger.info("✅ Agent 初始化完成")

    return get_agent_executor._instance


# ==============================================
# 5. 便捷调用函数
# ==============================================
def run_agent(query: str, chat_history: Optional[List] = None) -> Dict[str, Any]:
    """
    运行 Agent 并返回结果

    参数:
        query: 用户问题
        chat_history: 历史消息列表

    返回:
        包含 output 和 intermediate_steps 的字典
    """
    logger.info(f"🤖 Agent 收到问题: {query[:100]}...")

    agent_executor = get_agent_executor()

    result = agent_executor.invoke({
        "input": query,
        "chat_history": chat_history or [],
    })

    # 提取使用的工具
    used_tools = []
    if result.get("intermediate_steps"):
        for step in result["intermediate_steps"]:
            tool_name = step[0].tool
            if tool_name not in used_tools:
                used_tools.append(tool_name)

    logger.info(f"✅ Agent 执行完成，使用工具: {used_tools}")

    return {
        "output": result["output"],
        "intermediate_steps": result.get("intermediate_steps", []),
        "used_tools": used_tools,
    }
