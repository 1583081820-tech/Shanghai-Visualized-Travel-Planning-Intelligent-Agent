"""
对话记忆管理
支持 Redis 存储和内存存储两种模式
- Redis 模式：持久化，支持分布式
- 内存模式：简单快速，重启丢失，适合本地开发
"""
from typing import Optional, Dict

from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain.memory import ConversationBufferMemory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain.memory import ChatMessageHistory
from loguru import logger

from app.core.config import settings


# 会话历史前缀
SESSION_KEY_PREFIX = "chat_history:"
# 会话过期时间（秒）
SESSION_TTL = 3600 * 24  # 24小时

# 内存模式下的会话存储
_memory_sessions: Dict[str, ChatMessageHistory] = {}


def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """
    获取指定会话的历史消息
    - Redis 模式：使用 Redis 存储，自动过期
    - 内存模式：使用内存字典存储，重启丢失
    """
    if settings.REDIS_ENABLED:
        # Redis 模式
        redis_url = settings.REDIS_URL
        if settings.REDIS_PASSWORD:
            # Redis URL 格式：redis://:password@host:port/db
            # 处理带密码的情况
            from urllib.parse import urlparse, urlunparse
            parsed = urlparse(redis_url)
            netloc = f":{settings.REDIS_PASSWORD}@{parsed.hostname}:{parsed.port}"
            redis_url = urlunparse((parsed.scheme, netloc, parsed.path, "", "", ""))

        return RedisChatMessageHistory(
            session_id=f"{SESSION_KEY_PREFIX}{session_id}",
            url=redis_url,
            ttl=SESSION_TTL,
        )
    else:
        # 内存模式
        if session_id not in _memory_sessions:
            _memory_sessions[session_id] = ChatMessageHistory()
            logger.info(f"💾 创建内存会话: {session_id}")
        return _memory_sessions[session_id]


def get_conversation_memory(session_id: str) -> ConversationBufferMemory:
    """
    获取会话记忆实例
    用于 ConversationalRetrievalChain
    """
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        chat_memory=get_session_history(session_id),
        return_messages=True,
        output_key="answer",
    )
    return memory


def get_chat_history_text(session_id: str, max_turns: int = 10) -> str:
    """
    获取格式化的对话历史文本
    用于拼接到提示词中
    """
    history = get_session_history(session_id)
    messages = history.messages

    # 只保留最近 N 轮对话
    if len(messages) > max_turns * 2:
        messages = messages[-max_turns * 2:]

    result = []
    for msg in messages:
        role = "用户" if msg.type == "human" else "AI助手"
        result.append(f"{role}: {msg.content}")

    return "\n".join(result) if result else "（暂无历史对话）"


def clear_session_history(session_id: str):
    """清除指定会话的历史"""
    history = get_session_history(session_id)
    history.clear()
    logger.info(f"🗑️ 已清除会话历史: {session_id}")


def add_user_message(session_id: str, message: str):
    """添加用户消息到历史"""
    history = get_session_history(session_id)
    history.add_user_message(message)


def add_ai_message(session_id: str, message: str):
    """添加 AI 消息到历史"""
    history = get_session_history(session_id)
    history.add_ai_message(message)
