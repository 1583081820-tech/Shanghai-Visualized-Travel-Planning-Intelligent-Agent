"""
行程规划模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class TravelPlan(Base):
    """行程规划表"""

    __tablename__ = "travel_plans"

    id = Column(Integer, primary_key=True, index=True, comment="行程ID")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="用户ID")
    title = Column(String(200), comment="行程标题")
    city = Column(String(50), default="上海", comment="目的地城市")
    total_days = Column(Integer, default=3, comment="总天数")
    start_date = Column(String(20), comment="开始日期")
    end_date = Column(String(20), comment="结束日期")
    crowd_type = Column(String(50), comment="出行人群类型")
    budget_level = Column(String(50), comment="预算等级")
    status = Column(String(20), default="draft", comment="状态：draft/confirmed/completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")

    # 关联：行程天数
    days = relationship("PlanDay", back_populates="plan", cascade="all, delete-orphan")


class PlanDay(Base):
    """行程天数据表"""

    __tablename__ = "plan_days"

    id = Column(Integer, primary_key=True, index=True, comment="ID")
    plan_id = Column(Integer, ForeignKey("travel_plans.id"), comment="行程ID")
    day_number = Column(Integer, comment="第几天")
    date = Column(String(20), comment="日期")
    theme = Column(String(100), comment="当日主题")
    places_json = Column(JSON, comment="景点列表 JSON")
    food_recommendations = Column(JSON, comment="美食推荐 JSON")
    transportation = Column(Text, comment="交通建议")
    tips = Column(Text, comment="当日贴士")

    # 关联
    plan = relationship("TravelPlan", back_populates="days")
