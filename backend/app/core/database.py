"""
数据库连接与会话管理
使用 SQLAlchemy 2.0 风格
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from loguru import logger

from app.core.config import settings

# 创建数据库引擎
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # 连接前先 ping，防止连接断开
    pool_recycle=3600,   # 连接回收时间（秒）
    echo=settings.DEBUG,  # DEBUG 模式打印 SQL
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明基类
Base = declarative_base()


def get_db():
    """FastAPI 依赖注入：获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """初始化数据库，创建所有表"""
    from app.models import user, travel_plan, place, feedback  # noqa: F401

    logger.info("🔄 正在初始化数据库...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ 数据库初始化完成")
