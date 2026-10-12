"""Pure routing rules used by the Smart chat endpoint."""

AGENT_KEYWORDS = (
    "天气", "气温", "下雨", "晴天", "温度", "穿衣",
    "附近", "周边", "附近有", "周边有",
    "路线", "怎么去", "怎么走", "多远", "多久", "距离",
    "推荐餐厅", "推荐酒店", "推荐景点", "推荐美食",
    "找餐厅", "找酒店", "找景点",
)

FAST_KEYWORDS = (
    "攻略", "注意事项", "建议", "贴士", "指南",
    "介绍", "简介", "是什么", "怎么样",
    "门票", "价格", "多少钱", "开放时间",
    "特色美食", "小吃", "本帮菜",
    "行程", "规划", "几天", "怎么玩",
)


def should_use_agent(query: str) -> bool:
    """Route real-time/location questions to tools; use RAG for static advice."""
    normalized = query.lower()
    for keyword in FAST_KEYWORDS:
        if keyword in normalized:
            return any(agent_keyword in normalized for agent_keyword in AGENT_KEYWORDS)
    return any(keyword in normalized for keyword in AGENT_KEYWORDS)
