"""
Redis 客户端封装
用于缓存、会话存储、限流等
"""
import redis
from loguru import logger

from app.core.config import settings


class RedisClient:
    """Redis 客户端单例"""

    _instance: redis.Redis = None

    @classmethod
    def get_instance(cls) -> redis.Redis:
        """获取 Redis 单例实例"""
        if not settings.REDIS_ENABLED:
            logger.warning("⚠️ Redis 未启用，返回 None")
            return None
            
        if cls._instance is None:
            cls._instance = redis.from_url(
                settings.REDIS_URL,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                decode_responses=True,  # 自动解码为字符串
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            logger.info("✅ Redis 连接成功")
        return cls._instance

    @classmethod
    def close(cls):
        """关闭 Redis 连接"""
        if cls._instance:
            cls._instance.close()
            cls._instance = None
            logger.info("🔌 Redis 连接已关闭")


def get_redis() -> redis.Redis:
    """FastAPI 依赖注入：获取 Redis 客户端"""
    return RedisClient.get_instance()
