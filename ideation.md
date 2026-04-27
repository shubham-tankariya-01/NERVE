# Smart Supply Chain: Resilient Logistics & Dynamic Routing

## Overview

This project presents a smart supply chain system that models and monitors a shipment as it moves through a multi-node logistics network. The system focuses on identifying disruptions in transit, predicting their downstream impact, and dynamically adapting routes to maintain delivery efficiency.

Unlike traditional tracking systems that are reactive and informational, this system emphasizes proactive decision-making by continuously analyzing transit conditions and responding intelligently to potential delays.

---

## Problem Statement

Modern supply chains are highly complex and distributed across multiple stakeholders, including manufacturers, ports, logistics providers, and warehouses. Disruptions such as weather events, congestion, and operational inefficiencies are often detected only after delivery timelines are affected.

Current systems:

* Provide tracking but lack predictive insights
* Operate in silos with fragmented data
* React to disruptions rather than preventing them
* Do not dynamically adjust routes in real time

This leads to cascading delays, increased costs, and reduced reliability.

---

## Objective

To design a system that:

* Continuously monitors shipment movement across a supply chain network
* Detects potential disruptions before they significantly impact delivery
* Predicts delays and their propagation through the network
* Recommends or executes optimized alternate routes dynamically

---

## System Scope

The system is demonstrated using a single shipment moving through a multi-stage supply chain. This controlled setup highlights the system’s capabilities while maintaining clarity and depth.

The shipment passes through multiple nodes such as:

* Manufacturing unit
* Ports
* Transportation vessels
* Warehouses
* Final delivery destination

Each stage introduces variables such as transit time, processing delays, and risk factors.

---

## Key Concepts

### Supply Chain Flows

* **Physical Flow:** Movement of goods across nodes
* **Information Flow:** Status updates and tracking data
* **Financial Flow:** Cost implications of routing and delays

---

### Network Modeling

* **Nodes:** Fixed points such as factories, ports, and warehouses
* **Edges:** Transportation links between nodes

---

### Time Metrics

* **Transit Time:** Time taken to move between nodes
* **Lead Time:** Total time from order initiation to delivery
* **Dwell Time:** Idle time at a node before further movement

---

### Operational Challenges

* **Bottlenecks:** Congestion points that slow down the system
* **Last-Mile Delivery:** Final stage where failures are most frequent
* **Data Silos:** Disconnected systems across stakeholders

---

## Core Features

### 1. Real-Time Monitoring

The system continuously tracks the shipment’s position and status across the network.

---

### 2. Disruption Detection

Identifies anomalies such as:

* Unexpected delays at nodes
* Increased transit times
* External risk factors affecting movement

---

### 3. Predictive Analysis

Estimates:

* Updated delivery times (ETA)
* Probability and severity of delays
* Potential cascading effects across downstream nodes

---

### 4. Dynamic Routing

Based on detected disruptions, the system:

* Evaluates alternate paths
* Compares trade-offs (time, risk, efficiency)
* Suggests or applies optimal rerouting strategies

---

### 5. Alerting & Decision Support

Generates actionable insights such as:

* Delay warnings
* Bottleneck notifications
* Route optimization recommendations

---

## Inputs

### Shipment Data

* Shipment identifier
* Source and destination
* Current location and status

---

### Network Data

* Node details (capacity, processing time)
* Route characteristics (distance, transit time)

---

### External Factors

* Weather conditions
* Traffic or port congestion
* Operational disruptions

---

### Historical Data

* Past transit times
* Delay patterns

---

## Outputs

### Predictive Outputs

* Estimated time of arrival (ETA)
* Delay likelihood

---

### Alerts

* Real-time disruption notifications
* Bottleneck identification

---

### Optimization Results

* Suggested alternate routes
* Comparative analysis of routing options

---

### Visualization

* Shipment path and movement
* Highlighted disruptions
* Before vs after route comparison

---

## Expected Outcome

The system demonstrates a shift from reactive logistics to proactive and adaptive supply chain management. By identifying disruptions early and enabling dynamic rerouting, it improves delivery reliability, reduces delays, and enhances overall operational efficiency.

---

## Conclusion

This project illustrates how intelligent monitoring and decision-making can transform supply chain operations. Even when demonstrated with a single shipment, the system architecture and logic are scalable to larger, real-world logistics networks.

File Structure

nerve/
│
├── backend/
│   │
│   ├── main.py
│   │     The entry point. Starts the FastAPI server, connects
│   │     the WebSocket endpoint, and runs the data scheduler.
│   │
│   ├── mock_data.json
│   │     Defines your supply chain — 20 nodes (ports, warehouses),
│   │     30 routes between them, 50 active shipments with positions.
│   │     Everything else in the project reads from this file.
│   │
│   ├── agents/
│   │   ├── scout.py        Watches all data streams, detects anomalies,
│   │   │                   fires the first disruption alert.
│   │   ├── mapper.py       Takes a disruption alert, finds every shipment
│   │   │                   affected by it across the graph.
│   │   ├── optimizer.py    Calculates the 3 best alternative routes for
│   │   │                   affected shipments, ranked by cost and time.
│   │   └── communicator.py Drafts a plain-language alert message for the
│   │                       logistics manager describing what happened.
│   │
│   ├── graph/
│   │   ├── supply_graph.py Loads mock_data.json into a NetworkX graph.
│   │   │                   Each node has risk score and capacity properties.
│   │   └── cascade_model.py Calculates the R0 contagion score for each node.
│   │                       Uses epidemic math to score how "contagious" a
│   │                       disruption at that node would be.
│   │
│   ├── ml/
│   │   ├── anomaly.py      Isolation Forest model. Trains on historical
│   │   │                   delay data and flags when current values are
│   │   │                   statistically abnormal.
│   │   └── risk_horizon.py Builds the 6hr/24hr/72hr risk probability curve
│   │                       by combining weather forecast + anomaly score.
│   │
│   └── feeds/
│       ├── weather.py      Calls Open-Meteo API for the coordinates of each
│       │                   node in your graph. No key needed.
│       ├── news.py         Calls GDELT to find recent events near your nodes.
│       └── mock_ships.py   Generates simulated shipment position updates
│                           every 30 seconds to make the map feel live.
│
└── frontend/
    └── src/
        └── components/
            ├── MapView.jsx       Leaflet map. Shows all nodes as dots,
            │                     routes as colored lines (green=safe,
            │                     yellow=watch, red=disrupted).
            ├── AlertPanel.jsx    Right sidebar. Shows live disruption alerts
            │                     with severity score and the affected shipments.
            ├── RiskHorizon.jsx   Line chart showing probability of disruption
            │                     over the next 6, 24, and 72 hours.
            ├── CascadeDebt.jsx   Leaderboard of the 5 most fragile routes
            │                     ranked by Cascade Debt score.
            └── AgentLog.jsx      Live feed showing what each agent is doing
                                  in real time — "Scout detected anomaly at
                                  Port of Mumbai..." etc.

Stack

Frontend — React + Node.js (your comfort zone)
React.js · Leaflet.js (free map) · Recharts (free charts) · WebSocket client for live updates · Vite (fast build tool)

Backend — FastAPI (Python)
FastAPI · WebSockets (real-time push to frontend) · NetworkX (supply chain graph) · scikit-learn (anomaly detection) · APScheduler (runs data fetch every 60s)

AI Agents — LangGraph + Groq (free LLM)
LangGraph (agent orchestration) · Groq API — free tier, no credit card, 14,400 req/day on Llama 3.3 · 4 agents: Scout, Mapper, Optimizer, Communicator

Data sources — all verified free, no credit card
Open-Meteo (weather, zero registration needed) · NewsAPI free tier (100 req/day) · GDELT Project (free global news events) · MarineTraffic mock / AIS public stream · Simulated IoT shipment data (Python script)

Database — SQLite + Redis (local, zero cost)
SQLite for shipment/route data (no server needed, file-based) · In-memory Python dict for graph state · No cloud DB needed for hackathon
Runs entirely on your laptop 

Add a User System that manages vibility accross the network for different share holders