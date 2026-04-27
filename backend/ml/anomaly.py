"""
anomaly.py
Threshold-based anomaly detector for weather disruptions.
Takes NodeWeather results and flags nodes whose conditions
are dangerous enough to disrupt supply-chain operations.

Thresholds are intentionally tuned to be realistic:
  - High wind           >= 50 km/h  (operational risk for ports / trucks)
  - Heavy precipitation >= 10 mm/h  (flooding, loading delays)
  - Extreme heat        >= 42 C     (worker safety, tarmac limits)
  - Extreme cold        <= -15 C    (freezing, equipment failure)
  - Severe weather code >= 65       (heavy rain, snow, thunderstorms)
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any

from backend.feeds.weather import NodeWeather


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class DisruptionAlert:
    """A single weather-based disruption alert for a node."""
    node_id: str
    node_name: str
    severity: Severity
    reasons: list[str]
    weather: NodeWeather
    estimated_delay_hrs: float = 0.0

    def __str__(self) -> str:
        tag = f"[{self.severity.value:>8s}]"
        reasons_str = "; ".join(self.reasons)
        return (
            f"  {tag}  {self.node_id} ({self.node_name})\n"
            f"           Reasons  : {reasons_str}\n"
            f"           Est delay: +{self.estimated_delay_hrs:.0f}h\n"
            f"           Wind {self.weather.wind_speed_kmh:.0f} km/h  "
            f"Rain {self.weather.precipitation_mm:.1f} mm  "
            f"Temp {self.weather.temperature_c:.1f}C  "
            f"Condition: {self.weather.weather_label}"
        )


# ── thresholds ────────────────────────────────────────────────────

THRESHOLDS: dict[str, dict[str, Any]] = {
    "wind_speed_kmh": {
        "medium": 40,
        "high": 60,
        "critical": 80,
        "label": "High winds",
        "delay_per_level": [2, 6, 18],
    },
    "wind_gusts_kmh": {
        "medium": 55,
        "high": 80,
        "critical": 100,
        "label": "Dangerous wind gusts",
        "delay_per_level": [1, 4, 12],
    },
    "precipitation_mm": {
        "medium": 5,
        "high": 15,
        "critical": 30,
        "label": "Heavy precipitation",
        "delay_per_level": [2, 8, 24],
    },
    "temperature_high": {
        "medium": 40,
        "high": 44,
        "critical": 48,
        "label": "Extreme heat",
        "delay_per_level": [1, 4, 8],
    },
    "temperature_low": {
        "medium": -10,
        "high": -20,
        "critical": -30,
        "label": "Extreme cold",
        "delay_per_level": [1, 4, 10],
    },
    "weather_code": {
        "medium": 61,
        "high": 75,
        "critical": 95,
        "label": "Severe weather event",
        "delay_per_level": [2, 6, 14],
    },
}


class AnomalyDetector:
    """Evaluates weather data against disruption thresholds."""

    def __init__(self) -> None:
        self.alerts: list[DisruptionAlert] = []

    def evaluate(
        self, weather_data: dict[str, NodeWeather]
    ) -> list[DisruptionAlert]:
        """
        Scan all node weather snapshots and produce disruption alerts
        for any node exceeding defined thresholds.
        """
        self.alerts.clear()

        for nid, nw in weather_data.items():
            if not nw.fetched:
                continue

            reasons: list[str] = []
            max_severity = Severity.LOW
            total_delay = 0.0

            # ── wind speed ──
            sev, delay = self._check_ascending(
                nw.wind_speed_kmh, THRESHOLDS["wind_speed_kmh"]
            )
            if sev:
                reasons.append(
                    f"{THRESHOLDS['wind_speed_kmh']['label']} "
                    f"({nw.wind_speed_kmh:.0f} km/h)"
                )
                max_severity = self._max_sev(max_severity, sev)
                total_delay += delay

            # ── wind gusts ──
            sev, delay = self._check_ascending(
                nw.wind_gusts_kmh, THRESHOLDS["wind_gusts_kmh"]
            )
            if sev:
                reasons.append(
                    f"{THRESHOLDS['wind_gusts_kmh']['label']} "
                    f"({nw.wind_gusts_kmh:.0f} km/h)"
                )
                max_severity = self._max_sev(max_severity, sev)
                total_delay += delay

            # ── precipitation ──
            sev, delay = self._check_ascending(
                nw.precipitation_mm, THRESHOLDS["precipitation_mm"]
            )
            if sev:
                reasons.append(
                    f"{THRESHOLDS['precipitation_mm']['label']} "
                    f"({nw.precipitation_mm:.1f} mm)"
                )
                max_severity = self._max_sev(max_severity, sev)
                total_delay += delay

            # ── extreme heat ──
            sev, delay = self._check_ascending(
                nw.temperature_c, THRESHOLDS["temperature_high"]
            )
            if sev:
                reasons.append(
                    f"{THRESHOLDS['temperature_high']['label']} "
                    f"({nw.temperature_c:.1f} C)"
                )
                max_severity = self._max_sev(max_severity, sev)
                total_delay += delay

            # ── extreme cold ──
            sev, delay = self._check_descending(
                nw.temperature_c, THRESHOLDS["temperature_low"]
            )
            if sev:
                reasons.append(
                    f"{THRESHOLDS['temperature_low']['label']} "
                    f"({nw.temperature_c:.1f} C)"
                )
                max_severity = self._max_sev(max_severity, sev)
                total_delay += delay

            # ── weather code (severe event) ──
            sev, delay = self._check_ascending(
                nw.weather_code, THRESHOLDS["weather_code"]
            )
            if sev:
                reasons.append(
                    f"{THRESHOLDS['weather_code']['label']} "
                    f"({nw.weather_label})"
                )
                max_severity = self._max_sev(max_severity, sev)
                total_delay += delay

            if reasons:
                self.alerts.append(
                    DisruptionAlert(
                        node_id=nid,
                        node_name=nw.node_name,
                        severity=max_severity,
                        reasons=reasons,
                        weather=nw,
                        estimated_delay_hrs=total_delay,
                    )
                )

        # sort: critical first
        severity_order = {
            Severity.CRITICAL: 0,
            Severity.HIGH: 1,
            Severity.MEDIUM: 2,
            Severity.LOW: 3,
        }
        self.alerts.sort(key=lambda a: severity_order[a.severity])
        return self.alerts

    # ── internal helpers ──────────────────────────────────────────

    @staticmethod
    def _check_ascending(
        value: float, cfg: dict
    ) -> tuple[Severity | None, float]:
        """Check a metric where HIGHER = worse."""
        if value >= cfg["critical"]:
            return Severity.CRITICAL, cfg["delay_per_level"][2]
        if value >= cfg["high"]:
            return Severity.HIGH, cfg["delay_per_level"][1]
        if value >= cfg["medium"]:
            return Severity.MEDIUM, cfg["delay_per_level"][0]
        return None, 0.0

    @staticmethod
    def _check_descending(
        value: float, cfg: dict
    ) -> tuple[Severity | None, float]:
        """Check a metric where LOWER = worse (e.g. extreme cold)."""
        if value <= cfg["critical"]:
            return Severity.CRITICAL, cfg["delay_per_level"][2]
        if value <= cfg["high"]:
            return Severity.HIGH, cfg["delay_per_level"][1]
        if value <= cfg["medium"]:
            return Severity.MEDIUM, cfg["delay_per_level"][0]
        return None, 0.0

    @staticmethod
    def _max_sev(a: Severity, b: Severity) -> Severity:
        order = [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL]
        return order[max(order.index(a), order.index(b))]

    def print_alerts(self) -> None:
        """Pretty-print all alerts to stdout."""
        if not self.alerts:
            print("\n  [OK] No weather disruptions detected across any node.\n")
            return

        print()
        print("=" * 72)
        print(f"  WEATHER DISRUPTION ALERTS  ({len(self.alerts)} node(s) flagged)")
        print("=" * 72)
        for alert in self.alerts:
            print(alert)
        print("=" * 72)
        print()


# ── standalone test ───────────────────────────────────────────────
if __name__ == "__main__":
    from backend.graph import SupplyChainGraph
    from backend.feeds.weather import WeatherFeed

    scg = SupplyChainGraph()
    feed = WeatherFeed(dict(scg.graph.nodes(data=True)))

    print("\n  Fetching live weather for all 20 nodes...")
    feed.fetch_all()
    feed.print_weather_table()

    print("\n  Running anomaly detection...")
    detector = AnomalyDetector()
    detector.evaluate(feed.results)
    detector.print_alerts()
