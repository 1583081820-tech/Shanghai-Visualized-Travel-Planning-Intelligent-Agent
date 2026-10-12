"""
FastAPI 主应用入口
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.database import init_db
from app.core.redis_client import RedisClient
from app.core.health import build_health_payload
from app.api.chat import router as chat_router
from app.api.plans import router as plans_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    logger.info(f"🚀 正在启动 {settings.APP_NAME}...")
    logger.info(f"环境: {settings.APP_ENV}")

    # 初始化数据库
    try:
        init_db()
    except Exception as e:
        logger.warning(f"⚠️ 数据库初始化失败（可能是 MySQL 未启动）: {e}")

    # 初始化 Redis（仅在启用时）
    if settings.REDIS_ENABLED:
        try:
            RedisClient.get_instance()
        except Exception as e:
            logger.warning(f"⚠️ Redis 连接失败: {e}")
    else:
        logger.info("💾 Redis 未启用，使用内存记忆模式")

    # 预加载嵌入模型和 Agent（加快首次请求速度）
    logger.info("🔄 正在预加载模型和Agent...")
    try:
        from app.services.rag_chain import get_embeddings
        get_embeddings()
        logger.info("✅ 嵌入模型预加载完成")
    except Exception as e:
        logger.warning(f"⚠️ 嵌入模型预加载失败: {e}")
    
    try:
        from app.services.agent import get_agent_executor
        get_agent_executor()
        logger.info("✅ Agent预加载完成")
    except Exception as e:
        logger.warning(f"⚠️ Agent预加载失败: {e}")

    logger.info("✅ 应用启动完成")

    yield

    # 关闭时执行
    logger.info("🔻 正在关闭应用...")
    if settings.REDIS_ENABLED:
        RedisClient.close()
    logger.info("👋 应用已关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    description="上海3D可视化出行规划智能体 - 后端 API",
    version="2.0.0",
    lifespan=lifespan,
    debug=settings.DEBUG,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(chat_router, prefix="/api/v1")
app.include_router(plans_router, prefix="/api/v1")


# ========== 健康检查 ==========
@app.get("/health", summary="健康检查")
async def health_check():
    """服务健康检查接口"""
    return build_health_payload(settings.APP_NAME, settings.APP_ENV)


@app.get("/", summary="根路径")
async def root():
    return {
        "message": f"欢迎使用 {settings.APP_NAME} API",
        "version": "2.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
