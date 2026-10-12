"""
应用配置管理
使用 pydantic-settings 从环境变量加载配置
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """应用全局配置"""

    # ========== 服务配置 ==========
    APP_NAME: str = "上海旅游智能体"
    APP_ENV: str = "development"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8001

    # ========== MySQL 数据库 ==========
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/travel_ai?charset=utf8mb4"

    # ========== Redis ==========
    REDIS_ENABLED: bool = False  # 是否启用 Redis，未启用时使用内存记忆
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: str = ""

    # ========== FAISS 向量库 ==========
    FAISS_INDEX_PATH: str = "./data/faiss_index"  # FAISS 索引保存路径
    FAISS_INDEX_NAME: str = "travel_knowledge"    # 索引名称

    # ========== 豆包大模型 ==========
    DOUBAO_API_KEY: str = ""
    DOUBAO_BASE_URL: str = "https://ark.cn-beijing.volces.com/api/v3"
    DOUBAO_MODEL: str = "doubao-seed-1.6-flash"
    DOUBAO_LITE_MODEL: str = "doubao-1-5-lite-32k-250115"

    # ========== 高德地图 API ==========
    AMAP_KEY: str = ""
    AMAP_BASE_URL: str = "https://restapi.amap.com"

    # ========== 嵌入模型 ==========
    EMBEDDING_MODEL: str = "BAAI/bge-small-zh-v1.5"
    EMBEDDING_DEVICE: str = "cpu"

    # ========== 安全配置 ==========
    SECRET_KEY: str = "your-secret-key-change-in-production"
    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def cors_origin_list(self) -> List[str]:
        """解析 CORS_ORIGINS 字符串为列表"""
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


# 全局配置实例
settings = Settings()
