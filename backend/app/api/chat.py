"""
聊天相关 API 端点
包含：普通聊天、Agent对话、智能聊天（双模式）、行程生成
"""
import asyncio
from fastapi import APIRouter, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional
from loguru import logger

from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    AgentRequest,
    AgentResponse,
    SmartChatRequest,
    SmartChatResponse,
    PlanGenerateRequest,
    TravelPlanSchema,
)
from app.services.rag_chain import chat_with_rag, generate_travel_plan
from app.services.memory import (
    get_chat_history_text,
    add_user_message,
    add_ai_message,
    clear_session_history,
)
from app.services.agent import run_agent
from app.services.routing import should_use_agent
from app.core.database import get_db

router = APIRouter(prefix="/chat", tags=["聊天对话"])


@router.post("", response_model=ChatResponse, summary="普通聊天（带RAG和记忆）")
async def chat(
    req: ChatRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
):
    """
    普通聊天接口，支持 RAG 检索增强和多轮对话记忆

    - **query**: 用户问题
    - **days**: 行程天数（可选）
    - **crowd**: 出行人群（可选）
    - **X-Session-Id**: 会话ID（Header传递，用于多轮记忆）
    """
    session_id = x_session_id or "default"

    try:
        # 获取历史对话
        chat_history = get_chat_history_text(session_id)

        # 调用 RAG 对话链
        answer = chat_with_rag(req.query, chat_history)

        # 保存对话历史
        add_user_message(session_id, req.query)
        add_ai_message(session_id, answer)

        return ChatResponse(
            answer=answer,
            session_id=session_id,
            sources=None,
        )

    except Exception as e:
        logger.error(f"❌ 聊天接口错误: {e}")
        raise HTTPException(status_code=500, detail=f"聊天服务异常: {str(e)}")


@router.post("/agent", response_model=AgentResponse, summary="Agent 智能对话")
async def agent_chat(
    req: AgentRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
):
    """
    Agent 智能对话接口，支持多工具自主调用

    - **query**: 用户问题
    - **city**: 城市（可选，默认上海）
    - **X-Session-Id**: 会话ID（Header传递）

    Agent 会根据问题自主决定调用哪些工具：
    - 搜索景点/美食/酒店
    - 计算路线距离和时间
    - 检索本地知识库
    - 查询天气
    """
    session_id = x_session_id or "default"

    try:
        # 获取历史消息（给 Agent 用的格式）
        from app.services.memory import get_session_history
        history = get_session_history(session_id)
        chat_messages = history.messages[-10:] if len(history.messages) > 10 else history.messages

        # 运行 Agent
        result = run_agent(req.query, chat_messages)

        # 保存对话历史
        add_user_message(session_id, req.query)
        add_ai_message(session_id, result["output"])

        return AgentResponse(
            output=result["output"],
            intermediate_steps=None,  # 不返回中间步骤，避免信息过多
            used_tools=result["used_tools"],
        )

    except Exception as e:
        logger.error(f"❌ Agent 接口错误: {e}")
        raise HTTPException(status_code=500, detail=f"Agent 服务异常: {str(e)}")


@router.post("/smart", response_model=SmartChatResponse, summary="智能聊天（快速/Agent双模式自动切换）")
async def smart_chat(
    req: SmartChatRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
):
    """
    智能聊天接口，支持快速模式和Agent模式自动切换

    - **query**: 用户问题
    - **city**: 城市（可选，默认上海）
    - **mode**: 模式（可选）：
      - `auto`: 自动判断（默认），简单问题走快速模式，复杂问题走Agent
      - `fast`: 强制快速模式（RAG知识库，响应快）
      - `agent`: 强制Agent模式（多工具调用，更智能）
    - **timeout**: 超时时间（秒），超时自动降级到快速模式
    - **X-Session-Id**: 会话ID（Header传递）

    【技术亮点】
    - 双模式智能路由：兼顾速度与智能
    - 超时自动降级：避免用户长时间等待
    - 前端可手动切换：用户自主选择体验
    """
    session_id = x_session_id or "default"
    is_degraded = False
    
    try:
        # 1. 判断使用哪种模式
        use_agent = False
        if req.mode == "agent":
            use_agent = True
        elif req.mode == "fast":
            use_agent = False
        else:  # auto
            use_agent = should_use_agent(req.query)
        
        actual_mode = "agent" if use_agent else "fast"
        logger.info(f"🤖 智能聊天模式: {actual_mode}, 用户问题: {req.query[:50]}...")
        
        # 2. Agent模式（带超时降级）
        if use_agent:
            try:
                # 获取历史消息
                from app.services.memory import get_session_history
                history = get_session_history(session_id)
                chat_messages = history.messages[-10:] if len(history.messages) > 10 else history.messages
                
                # 运行Agent（带超时保护）
                loop = asyncio.get_event_loop()
                result = await asyncio.wait_for(
                    loop.run_in_executor(None, lambda: run_agent(req.query, chat_messages)),
                    timeout=req.timeout or 15
                )
                
                # 保存对话历史
                add_user_message(session_id, req.query)
                add_ai_message(session_id, result["output"])
                
                return SmartChatResponse(
                    answer=result["output"],
                    session_id=session_id,
                    mode="agent",
                    used_tools=result["used_tools"],
                    is_degraded=False,
                )
                
            except asyncio.TimeoutError:
                # 超时降级到快速模式
                logger.warning(f"⏰ Agent超时（{req.timeout}s），自动降级到快速模式")
                is_degraded = True
                use_agent = False
        
        # 3. 快速模式（RAG知识库）
        if not use_agent:
            # 获取历史对话
            chat_history = get_chat_history_text(session_id)
            
            # 调用 RAG 对话链
            answer = chat_with_rag(req.query, chat_history)
            
            # 保存对话历史
            add_user_message(session_id, req.query)
            add_ai_message(session_id, answer)
            
            return SmartChatResponse(
                answer=answer,
                session_id=session_id,
                mode="fast",
                used_tools=["知识库检索"],
                is_degraded=is_degraded,
            )
    
    except Exception as e:
        logger.error(f"❌ 智能聊天接口错误: {e}")
        raise HTTPException(status_code=500, detail=f"聊天服务异常: {str(e)}")


@router.post("/plan", response_model=TravelPlanSchema, summary="生成结构化行程规划（RAG增强）")
async def generate_plan(
    req: PlanGenerateRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
    db: Session = Depends(get_db),
):
    """
    生成结构化的行程规划（带 RAG 增强）

    - **query**: 用户需求描述
    - **days**: 天数（1-15天）
    - **crowd**: 出行人群（可选）
    - **city**: 城市（可选，默认上海）
    - **budget**: 预算等级（可选）

    返回结构化的行程数据，包含每日景点、美食推荐、交通建议等。

    【技术栈】LangChain RAG链 + FAISS向量检索 + 结构化输出解析
    """
    session_id = x_session_id or "default"

    try:
        # 生成行程规划
        plan = generate_travel_plan(
            query=req.query,
            days=req.days,
            crowd=req.crowd or "成人",
            city=req.city or "上海",
        )

        # 保存到对话历史
        add_user_message(session_id, f"帮我规划{req.days}天的行程：{req.query}")
        add_ai_message(session_id, f"已为您生成{req.days}天的{plan.city}行程规划：{plan.title}")

        return plan

    except Exception as e:
        logger.error(f"❌ 行程生成错误: {e}")
        raise HTTPException(status_code=500, detail=f"行程生成失败: {str(e)}")


@router.post("/plan/enhanced", summary="增强版行程规划（Agent + RAG 双引擎）")
async def generate_enhanced_plan(
    req: PlanGenerateRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
):
    """
    增强版行程规划（Agent + RAG 双引擎）

    先通过Agent获取实时信息（天气、景点热度等），再结合RAG知识库生成行程。
    比普通版更智能，但响应时间稍长。

    【技术栈】Agent多工具调用 + RAG知识库 + 结构化输出
    """
    session_id = x_session_id or "default"

    try:
        # 1. 先用Agent获取一些实时信息
        logger.info("🤖 增强版行程规划：先调用Agent获取实时信息...")
        
        agent_query = f"请帮我查询{req.city}最近的天气情况，以及有哪些热门景点推荐，适合{req.crowd or '成人'}游玩的"
        
        from app.services.memory import get_session_history
        history = get_session_history(session_id)
        chat_messages = history.messages[-5:] if len(history.messages) > 5 else history.messages
        
        try:
            agent_result = run_agent(agent_query, chat_messages)
            agent_info = agent_result["output"]
            used_tools = agent_result["used_tools"]
            logger.info(f"✅ Agent信息获取完成，使用工具: {used_tools}")
        except Exception as e:
            logger.warning(f"⚠️ Agent调用失败，降级为纯RAG模式: {e}")
            agent_info = ""
            used_tools = []

        # 2. 结合Agent信息和用户需求，生成增强版prompt
        enhanced_query = req.query
        if agent_info:
            enhanced_query = f"""
用户需求：{req.query}

实时信息参考（来自Agent工具调用）：
{agent_info}

请结合以上实时信息和本地知识库，生成更精准的行程规划。
"""

        # 3. 生成行程规划
        plan = generate_travel_plan(
            query=enhanced_query,
            days=req.days,
            crowd=req.crowd or "成人",
            city=req.city or "上海",
        )

        # 4. 保存到对话历史
        add_user_message(session_id, f"帮我规划{req.days}天的行程：{req.query}")
        add_ai_message(session_id, f"已为您生成{req.days}天的{plan.city}行程规划：{plan.title}")

        return {
            **plan.model_dump(),
            "used_tools": used_tools,
            "is_enhanced": len(used_tools) > 0,
        }

    except Exception as e:
        logger.error(f"❌ 增强版行程生成错误: {e}")
        raise HTTPException(status_code=500, detail=f"行程生成失败: {str(e)}")


@router.delete("/history", summary="清除会话历史")
async def clear_history(
    x_session_id: Optional[str] = Header(None, alias="X-Session-Id"),
):
    """清除指定会话的对话历史"""
    session_id = x_session_id or "default"
    clear_session_history(session_id)
    return {"status": "success", "message": f"会话 {session_id} 历史已清除"}
