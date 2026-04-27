"""
risk_horizon.py
Calculates the aggregated probability of supply chain disruption
across multiple time horizons (Now, 6h, 24h, 72h) based on current weather anomalies.
"""

from backend.ml.anomaly import DisruptionAlert, Severity

def generate_risk_horizon(alerts: list[DisruptionAlert]) -> list[dict]:
    """
    Returns a probability curve of network disruption over time.
    """
    
    # Baseline risk is 5%
    base_prob = 5
    
    # Calculate current risk score based on alerts
    current_risk = base_prob
    for a in alerts:
        if a.severity == Severity.CRITICAL:
            current_risk += 35
        elif a.severity == Severity.HIGH:
            current_risk += 20
        elif a.severity == Severity.MEDIUM:
            current_risk += 10
        elif a.severity == Severity.LOW:
            current_risk += 5
            
    # Cap at 95%
    current_risk = min(95, current_risk)
    
    # Model how risk propagates over time.
    # Weather events usually peak in the short term (6-12h) 
    # and resolve in the medium term (48-72h).
    
    if current_risk > 50:
        # High current risk -> expected to stay high for 6h, then drop
        prob_6h = min(98, current_risk + 5) 
        prob_24h = current_risk * 0.6
        prob_72h = max(base_prob, current_risk * 0.2)
    elif current_risk > 20:
        # Medium current risk -> might peak at 24h as storms roll in
        prob_6h = current_risk * 1.2
        prob_24h = current_risk * 1.5
        prob_72h = max(base_prob, current_risk * 0.5)
    else:
        # Low risk -> slight variations
        prob_6h = base_prob + 2
        prob_24h = base_prob + 4
        prob_72h = base_prob
        
    return [
        {"time": "Now", "probability": round(current_risk)},
        {"time": "+6h", "probability": round(prob_6h)},
        {"time": "+24h", "probability": round(prob_24h)},
        {"time": "+72h", "probability": round(prob_72h)}
    ]

if __name__ == "__main__":
    from backend.feeds.weather import NodeWeather
    # Quick mock test
    mock_alerts = [
        DisruptionAlert("N01", "Mock Port", Severity.HIGH, ["High wind"], NodeWeather("N01", "Mock", True, 0, 0, 0, 0, 60, 80, 0, ""))
    ]
    print(generate_risk_horizon(mock_alerts))
