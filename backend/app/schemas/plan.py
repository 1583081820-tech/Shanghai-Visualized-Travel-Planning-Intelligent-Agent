"""
行程规划相关的 Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class PlanDayCreate(BaseModel):
    """创建单日行程"""
    day_number: int = Field(..., description="第几天", ge=1)
    date: Optional[str] = Field(None, description="日期")
    theme: Optional[str] = Field(None, description="当日主题")
    places_json: Optional[List[Dict[str, Any]]] = Field(None, description="景点列表")
    food_recommendations: Optional[List[str]] = Field(None, description="美食推荐")
    transportation: Optional[str] = Field(None, description="交通建议")
    tips: Optional[str] = Field(None, description="当日贴士")


class PlanDayResponse(PlanDayCreate):
    """单日行程响应"""
    id: int

    class Config:
        from_attributes = True


class TravelPlanCreate(BaseModel):
    """创建行程规划"""
    title: str = Field(..., description="行程标题", min_length=1, max_length=200)
    city: Optional[str] = Field("上海", description="目的地城市")
    total_days: int = Field(..., description="总天数", ge=1, le=30)
    start_date: Optional[str] = Field(None, description="开始日期")
    end_date: Optional[str] = Field(None, description="结束日期")
    crowd_type: Optional[str] = Field(None, description="出行人群类型")
    budget_level: Optional[str] = Field(None, description="预算等级")
    status: Optional[str] = Field("draft", description="状态")
    days: List[PlanDayCreate] = Field(default_factory=list, description="每日行程列表")


class TravelPlanUpdate(BaseModel):
    """更新行程规划"""
    title: Optional[str] = Field(None, description="行程标题")
    city: Optional[str] = Field(None, description="目的地城市")
    total_days: Optional[int] = Field(None, description="总天数")
    start_date: Optional[str] = Field(None, description="开始日期")
    end_date: Optional[str] = Field(None, description="结束日期")
    crowd_type: Optional[str] = Field(None, description="出行人群类型")
    budget_level: Optional[str] = Field(None, description="预算等级")
    status: Optional[str] = Field(None, description="状态")
    days: Optional[List[PlanDayCreate]] = Field(None, description="每日行程列表")


class TravelPlanResponse(BaseModel):
    """行程规划响应"""
    id: int
    title: str
    city: str
    total_days: int
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    crowd_type: Optional[str] = None
    budget_level: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    days: List[PlanDayResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class TravelPlanListResponse(BaseModel):
    """行程列表响应"""
    total: int
    items: List[TravelPlanResponse]
