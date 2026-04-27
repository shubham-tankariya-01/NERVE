"""
weather.py
Fetches live weather data from Open-Meteo (free, no API key) for every
node in the supply-chain graph.

Open-Meteo endpoint:
  https://api.open-meteo.com/v1/forecast
    ?latitude=...&longitude=...
    &current=temperature_2m,relative_humidity_2m,precipitation,
             weather_code,wind_speed_10m,wind_gusts_10m
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

import requests

BASE_URL = "https://api.open-meteo.com/v1/forecast"

CURRENT_VARS = ",".join([
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "weather_code",
    "wind_speed_10m",
    "wind_gusts_10m",
])


@dataclass
class NodeWeather:
    """Weather snapshot for a single node."""
    node_id: str
    node_name: str
    latitude: float
    longitude: float
    temperature_c: float = 0.0
    humidity_pct: float = 0.0
    precipitation_mm: float = 0.0
    weather_code: int = 0
    wind_speed_kmh: float = 0.0
    wind_gusts_kmh: float = 0.0
    fetched: bool = False
    error: str | None = None

    @property
    def weather_label(self) -> str:
        """Human-readable label from WMO weather code."""
        labels = {
            0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy",
            3: "Overcast", 45: "Fog", 48: "Rime fog",
            51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
            61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
            66: "Light freezing rain", 67: "Heavy freezing rain",
            71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
            77: "Snow grains",
            80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
            85: "Slight snow showers", 86: "Heavy snow showers",
            95: "Thunderstorm", 96: "Thunderstorm + slight hail",
            99: "Thunderstorm + heavy hail",
        }
        return labels.get(self.weather_code, f"Unknown ({self.weather_code})")


class WeatherFeed:
    """Fetches current weather from Open-Meteo for a set of graph nodes."""

    def __init__(self, graph_nodes: dict[str, dict[str, Any]]) -> None:
        """
        Parameters
        ----------
        graph_nodes : dict
            Mapping of node_id -> node attribute dict (must contain 'location'
            with 'lat' and 'lng' keys, plus 'name').
        """
        self.nodes = graph_nodes
        self.results: dict[str, NodeWeather] = {}

    def fetch_all(self, delay: float = 0.25) -> dict[str, NodeWeather]:
        """
        Call Open-Meteo for every node. A small delay between requests
        avoids rate-limiting on the free tier.
        """
        self.results.clear()
        for nid, attrs in self.nodes.items():
            loc = attrs["location"]
            nw = NodeWeather(
                node_id=nid,
                node_name=attrs["name"],
                latitude=loc["lat"],
                longitude=loc["lng"],
            )
            try:
                resp = requests.get(BASE_URL, params={
                    "latitude": loc["lat"],
                    "longitude": loc["lng"],
                    "current": CURRENT_VARS,
                    "windspeed_unit": "kmh",
                    "timezone": "UTC",
                }, timeout=3)
                resp.raise_for_status()
                data = resp.json().get("current", {})
                nw.temperature_c = data.get("temperature_2m", 0.0)
                nw.humidity_pct = data.get("relative_humidity_2m", 0.0)
                nw.precipitation_mm = data.get("precipitation", 0.0)
                nw.weather_code = data.get("weather_code", 0)
                nw.wind_speed_kmh = data.get("wind_speed_10m", 0.0)
                nw.wind_gusts_kmh = data.get("wind_gusts_10m", 0.0)
                nw.fetched = True
            except Exception as exc:
                nw.error = str(exc)

            self.results[nid] = nw
            time.sleep(delay)

        return self.results

    def print_weather_table(self) -> None:
        """Pretty-print fetched weather for all nodes."""
        if not self.results:
            print("  (no weather data fetched yet)")
            return

        header = (
            f"  {'ID':<5} {'Node':36s} {'Temp':>6} {'Humid':>6} "
            f"{'Rain':>7} {'Wind':>6} {'Gust':>6}  {'Condition'}"
        )
        sep = "  " + "-" * 110
        print(sep)
        print(header)
        print(sep)
        for nw in self.results.values():
            if nw.fetched:
                print(
                    f"  {nw.node_id:<5} {nw.node_name:36s} "
                    f"{nw.temperature_c:5.1f}C {nw.humidity_pct:5.0f}% "
                    f"{nw.precipitation_mm:6.1f}mm {nw.wind_speed_kmh:5.1f} "
                    f"{nw.wind_gusts_kmh:5.1f}  {nw.weather_label}"
                )
            else:
                print(f"  {nw.node_id:<5} {nw.node_name:36s}  ERROR: {nw.error}")
        print(sep)


# ── standalone test ───────────────────────────────────────────────
if __name__ == "__main__":
    from backend.graph import SupplyChainGraph

    scg = SupplyChainGraph()
    feed = WeatherFeed(dict(scg.graph.nodes(data=True)))
    print("\n  Fetching live weather for all nodes...\n")
    feed.fetch_all()
    feed.print_weather_table()
