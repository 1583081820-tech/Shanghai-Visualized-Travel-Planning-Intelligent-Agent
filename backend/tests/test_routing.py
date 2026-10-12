from app.services.routing import should_use_agent


def test_static_guide_uses_fast_mode():
    assert should_use_agent("上海三日游攻略") is False


def test_weather_uses_agent_mode():
    assert should_use_agent("上海明天天气怎么样") is True


def test_route_keyword_overrides_static_keyword():
    assert should_use_agent("请介绍从外滩怎么去豫园") is True
