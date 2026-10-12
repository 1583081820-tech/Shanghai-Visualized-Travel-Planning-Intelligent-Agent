"""
聊天相关的 Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class ChatRequest(BaseModel):
    """聊天请求"""
    query: str = Field(..., description="用户问题", min_length=1, max_length=2000)
    days: Optional[int] = Field(3, description="行程天数", ge=1, le=30)
    crowd: Optional[str] = Field("成人", description="出行人群")
    city: Optional[str] = Field("上海", description="目的地城市")


class SmartChatRequest(BaseModel):
    """智能聊天请求（支持快速模式/Agent模式自动切换）"""
    query: str = Field(..., description="用户问题", min_length=1, max_length=2000)
    city: Optional[str] = Field("上海", description="城市")
    mode: Optional[str] = Field("auto", description="模式：auto/fast/agent")
    timeout: Optional[int] = Field(15, description="超时时间（秒），超时自动降级到快速模式")


class ChatResponse(BaseModel):
    """聊天响应"""
    answer: str = Field(..., description="AI 回答")
    session_id: str = Field(..., description="会话ID")
    sources: Optional[List[Dict[str, Any]]] = Field(None, description="参考来源")
    used_tools: Optional[List[str]] = Field(None, description="使用的工具")


class AgentRequest(BaseModel):
    """Agent 请求"""
    query: str = Field(..., description="用户问题", min_length=1, max_length=2000)
    city: Optional[str] = Field("上海", description="城市")


class AgentResponse(BaseModel):
    """Agent 响应"""
    output: str = Field(..., description="Agent 最终回答")
    intermediate_steps: Optional[List[Dict[str, Any]]] = Field(None, description="中间步骤")
    used_tools: List[str] = Field(default_factory=list, description="使用的工具列表")


class PlanGenerateRequest(BaseModel):
    """行程生成请求"""
    query: str = Field(..., description="用户需求", min_length=1)
    days: int = Field(3, description="天数", ge=1, le=15)
    crowd: Optional[str] = Field("成人", description="出行人群")
    city: Optional[str] = Field("上海", description="城市")
    budget: Optional[str] = Field(None, description="预算等级")


class DayPlanSchema(BaseModel):
    """单日行程"""
    day_number: int = Field(..., description="第几天")
    theme: Optional[str] = Field(None, description="当日主题")
    morning: List[str] = Field(default_factory=list, description="上午景点")
    afternoon: List[str] = Field(default_factory=list, description="下午景点")
    evening: List[str] = Field(default_factory=list, description="晚上活动")
    food_recommendations: List[str] = Field(default_factory=list, description="美食推荐")
    transportation: Optional[str] = Field(None, description="交通建议")
    tips: Optional[str] = Field(None, description="当日贴士")


class TravelPlanSchema(BaseModel):
    """完整行程规划"""
    title: str = Field(..., description="行程标题")
    city: str = Field("上海", description="城市")
    total_days: int = Field(..., description="总天数")
    days: List[DayPlanSchema] = Field(..., description="每日行程列表")
    summary: Optional[str] = Field(None, description="行程总结")
    budget_estimate: Optional[str] = Field(None, description="预算估算")


class SmartChatResponse(BaseModel):
    """智能聊天响应（双模式）"""
    answer: str = Field(..., description="AI回答")
    session_id: str = Field(..., description="会话ID")
    mode: str = Field(..., description="实际使用的模式：fast/agent")
    used_tools: List[str] = Field(default_factory=list, description="使用的工具列表")
    sources: Optional[List[Dict[str, Any]]] = Field(None, description="参考来源")
    is_degraded: bool = Field(False, description="是否超时降级")
