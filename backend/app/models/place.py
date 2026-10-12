"""
景点信息模型
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func

from app.core.database import Base


class Place(Base):
    """景点信息表"""

    __tablename__ = "places"

    id = Column(Integer, primary_key=True, index=True, comment="ID")
    name = Column(String(200), index=True, comment="景点名称")
    city = Column(String(50), index=True, comment="城市")
    address = Column(String(500), comment="地址")
    lat = Column(Float, comment="纬度")
    lng = Column(Float, comment="经度")
    category = Column(String(50), index=True, comment="分类：景点/美食/酒店/购物")
    amap_id = Column(String(100), unique=True, index=True, comment="高德地图POI ID")
    popularity = Column(Float, default=0, comment="热度评分")
    rating = Column(Float, default=0, comment="评分")
    price = Column(String(50), comment="价格/门票")
    open_time = Column(String(200), comment="开放时间")
    description = Column(Text, comment="简介")
    image_url = Column(String(500), comment="图片URL")
    tags = Column(String(500), comment="标签，逗号分隔")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), comment="更新时间")
