"""
用户反馈模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base


class UserFeedback(Base):
    """用户反馈表"""

    __tablename__ = "user_feedback"

    id = Column(Integer, primary_key=True, index=True, comment="ID")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="用户ID")
    plan_id = Column(Integer, ForeignKey("travel_plans.id"), nullable=True, comment="行程ID")
    rating = Column(Integer, comment="评分 1-5")
    comment = Column(Text, comment="反馈内容")
    feedback_type = Column(String(50), comment="反馈类型：行程/对话/功能")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
