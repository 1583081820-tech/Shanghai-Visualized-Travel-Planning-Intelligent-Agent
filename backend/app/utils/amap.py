"""
高德地图 API 封装
提供地点搜索、路径规划等功能
"""
import requests
from typing import List, Dict, Optional
from loguru import logger

from app.core.config import settings


class AMapClient:
    """高德地图 API 客户端"""

    def __init__(self):
        self.api_key = settings.AMAP_KEY
        self.base_url = settings.AMAP_BASE_URL

    def text_search(self, keyword: str, city: str = "上海", limit: int = 5) -> List[Dict]:
        """
        文本搜索 POI
        :param keyword: 搜索关键词
        :param city: 城市名
        :param limit: 返回数量
        :return: POI 列表
        """
        try:
            url = f"{self.base_url}/v3/place/text"
            params = {
                "key": self.api_key,
                "keywords": keyword,
                "city": city,
                "citylimit": "true",
                "offset": limit,
                "page": 1,
                "extensions": "base",
            }

            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if data.get("status") == "1" and data.get("pois"):
                pois = []
                for poi in data["pois"][:limit]:
                    location = poi.get("location", "").split(",")
                    pois.append({
                        "name": poi.get("name", ""),
                        "address": poi.get("address", ""),
                        "tel": poi.get("tel", ""),
                        "type": poi.get("type", ""),
                        "lng": float(location[0]) if len(location) > 0 else 0,
                        "lat": float(location[1]) if len(location) > 1 else 0,
                        "distance": poi.get("distance", ""),
                    })
                return pois
            return []

        except Exception as e:
            logger.error(f"❌ 高德地图搜索失败: {e}")
            return []

    def driving_route(self, origin: str, destination: str) -> Dict:
        """
        驾车路径规划
        :param origin: 起点坐标 "经度,纬度"
        :param destination: 终点坐标 "经度,纬度"
        :return: 路线信息
        """
        try:
            url = f"{self.base_url}/v3/direction/driving"
            params = {
                "key": self.api_key,
                "origin": origin,
                "destination": destination,
                "extensions": "base",
                "strategy": 0,  # 速度优先
            }

            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if data.get("status") == "1" and data.get("route"):
                route = data["route"]
                path = route.get("paths", [{}])[0]
                return {
                    "distance": int(path.get("distance", 0)) / 1000,  # 转换为公里
                    "duration": int(path.get("duration", 0)) / 60,  # 转换为分钟
                    "tolls": path.get("tolls", 0),
                    "traffic_lights": path.get("traffic_lights", 0),
                    "steps": len(path.get("steps", [])),
                }
            return {"distance": 0, "duration": 0, "error": "路线规划失败"}

        except Exception as e:
            logger.error(f"❌ 高德路径规划失败: {e}")
            return {"distance": 0, "duration": 0, "error": str(e)}

    def geocode(self, address: str, city: str = "上海") -> Optional[Dict]:
        """
        地理编码：地址转坐标
        :param address: 地址
        :param city: 城市
        :return: 坐标信息
        """
        try:
            url = f"{self.base_url}/v3/geocode/geo"
            params = {
                "key": self.api_key,
                "address": address,
                "city": city,
            }

            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if data.get("status") == "1" and data.get("geocodes"):
                geo = data["geocodes"][0]
                location = geo.get("location", "").split(",")
                return {
                    "formatted_address": geo.get("formatted_address", ""),
                    "lng": float(location[0]) if len(location) > 0 else 0,
                    "lat": float(location[1]) if len(location) > 1 else 0,
                }
            return None

        except Exception as e:
            logger.error(f"❌ 地理编码失败: {e}")
            return None

    def weather_info(self, city: str = "上海") -> Optional[Dict]:
        """
        查询天气信息
        :param city: 城市名或城市编码
        :return: 天气信息
        """
        try:
            url = f"{self.base_url}/v3/weather/weatherInfo"
            params = {
                "key": self.api_key,
                "city": city,
                "extensions": "base",
            }

            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if data.get("status") == "1" and data.get("lives"):
                live = data["lives"][0]
                return {
                    "city": live.get("city", ""),
                    "weather": live.get("weather", ""),
                    "temperature": live.get("temperature", ""),
                    "winddirection": live.get("winddirection", ""),
                    "windpower": live.get("windpower", ""),
                    "humidity": live.get("humidity", ""),
                    "reporttime": live.get("reporttime", ""),
                }
            return None

        except Exception as e:
            logger.error(f"❌ 天气查询失败: {e}")
            return None


# 全局单例
amap_client = AMapClient()
