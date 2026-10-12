"""
行程规划管理 API 端点
包含：行程的创建、查询、更新、删除（MySQL持久化）
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from loguru import logger

from app.schemas.plan import (
    TravelPlanCreate,
    TravelPlanUpdate,
    TravelPlanResponse,
    TravelPlanListResponse,
)
from app.models.travel_plan import TravelPlan, PlanDay
from app.core.database import get_db

router = APIRouter(prefix="/plans", tags=["行程管理"])


# ==============================================
# 1. 创建行程
# ==============================================
@router.post("", response_model=TravelPlanResponse, summary="创建行程规划（保存到MySQL）")
def create_plan(
    plan_data: TravelPlanCreate,
    db: Session = Depends(get_db),
):
    """
    创建新的行程规划并保存到MySQL数据库

    - **title**: 行程标题
    - **city**: 城市
    - **total_days**: 总天数
    - **start_date**: 开始日期（可选）
    - **end_date**: 结束日期（可选）
    - **crowd_type**: 出行人群（可选）
    - **budget_level**: 预算等级（可选）
    - **days**: 每日行程列表

    【技术栈】MySQL + SQLAlchemy ORM 数据持久化
    """
    try:
        # 创建行程主记录
        db_plan = TravelPlan(
            title=plan_data.title,
            city=plan_data.city,
            total_days=plan_data.total_days,
            start_date=plan_data.start_date,
            end_date=plan_data.end_date,
            crowd_type=plan_data.crowd_type,
            budget_level=plan_data.budget_level,
            status=plan_data.status or "draft",
        )
        db.add(db_plan)
        db.flush()  # 获取ID

        # 创建每日行程记录
        for day_data in plan_data.days:
            db_day = PlanDay(
                plan_id=db_plan.id,
                day_number=day_data.day_number,
                date=day_data.date,
                theme=day_data.theme,
                places_json=day_data.places_json,
                food_recommendations=day_data.food_recommendations,
                transportation=day_data.transportation,
                tips=day_data.tips,
            )
            db.add(db_day)

        db.commit()
        db.refresh(db_plan)
        logger.info(f"✅ 行程已保存到MySQL: {db_plan.id} - {db_plan.title}")
        return db_plan

    except Exception as e:
        db.rollback()
        logger.error(f"❌ 创建行程失败: {e}")
        raise HTTPException(status_code=500, detail=f"创建行程失败: {str(e)}")


# ==============================================
# 2. 查询行程列表
# ==============================================
@router.get("", response_model=TravelPlanListResponse, summary="查询行程列表")
def list_plans(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """
    查询行程列表（分页）

    - **skip**: 跳过数量
    - **limit**: 每页数量
    """
    try:
        total = db.query(TravelPlan).count()
        plans = (
            db.query(TravelPlan)
            .order_by(TravelPlan.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return TravelPlanListResponse(total=total, items=plans)

    except Exception as e:
        logger.error(f"❌ 查询行程列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")


# ==============================================
# 3. 查询单个行程详情
# ==============================================
@router.get("/{plan_id}", response_model=TravelPlanResponse, summary="查询行程详情")
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
):
    """
    根据ID查询行程详情

    - **plan_id**: 行程ID
    """
    try:
        plan = db.query(TravelPlan).filter(TravelPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="行程不存在")
        return plan

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 查询行程详情失败: {e}")
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")


# ==============================================
# 4. 更新行程
# ==============================================
@router.put("/{plan_id}", response_model=TravelPlanResponse, summary="更新行程")
def update_plan(
    plan_id: int,
    plan_data: TravelPlanUpdate,
    db: Session = Depends(get_db),
):
    """
    更新行程信息

    - **plan_id**: 行程ID
    - **plan_data**: 更新数据
    """
    try:
        plan = db.query(TravelPlan).filter(TravelPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="行程不存在")

        # 更新主记录字段
        update_data = plan_data.model_dump(exclude_unset=True, exclude={"days"})
        for field, value in update_data.items():
            if value is not None:
                setattr(plan, field, value)

        # 如果有days数据，先删除旧的再创建新的
        if plan_data.days is not None:
            # 删除旧的天数记录
            db.query(PlanDay).filter(PlanDay.plan_id == plan_id).delete()
            
            # 创建新的天数记录
            for day_data in plan_data.days:
                db_day = PlanDay(
                    plan_id=plan.id,
                    day_number=day_data.day_number,
                    date=day_data.date,
                    theme=day_data.theme,
                    places_json=day_data.places_json,
                    food_recommendations=day_data.food_recommendations,
                    transportation=day_data.transportation,
                    tips=day_data.tips,
                )
                db.add(db_day)

        db.commit()
        db.refresh(plan)
        logger.info(f"✅ 行程已更新: {plan.id}")
        return plan

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ 更新行程失败: {e}")
        raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")


# ==============================================
# 5. 删除行程
# ==============================================
@router.delete("/{plan_id}", summary="删除行程")
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
):
    """
    删除行程

    - **plan_id**: 行程ID
    """
    try:
        plan = db.query(TravelPlan).filter(TravelPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="行程不存在")

        db.delete(plan)
        db.commit()
        logger.info(f"✅ 行程已删除: {plan_id}")
        return {"status": "success", "message": "行程已删除"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ 删除行程失败: {e}")
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")
