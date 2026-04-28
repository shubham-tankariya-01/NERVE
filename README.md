# Nerve: Autonomous Supply Chain Orchestration

Nerve is a production-ready, real-time "Digital Twin" platform for global supply chain resilience. It orchestrates a high-fidelity network of factories, ports, and transit routes, autonomously detecting disruptions via live environmental feeds and providing AI-optimized rerouting recommendations through a collaborative Human-in-the-Loop workflow.

---

## 🌟 Core Enterprise Capabilities

### 1. High-Fidelity Network Simulation
* **Live Environmental Feeds:** Continuous ingestion of global weather data (Open-Meteo) across 24 strategic nodes, updating every 10 seconds.
* **Cascading Risk Modeling:** Dynamic calculation of "Network Health" and "Cascade Debt" to visualize how local disruptions ripple across the global infrastructure.

### 2. Multi-Agent AI Orchestration
* **Autonomous Resolution:** Four specialized agents (Scout, Mapper, Optimizer, Communicator) collaborate to detect, analyze, and resolve network anomalies.
* **Intelligent Rerouting:** advanced cost functions optimize for distance, transit time, and network fragility to provide mathematically superior alternative routes.

### 3. Human-in-the-Loop Rerouting Center
* **Operational Control:** A centralized dashboard where operators audit AI-generated rerouting suggestions.
* **Bulk Processing:** Rapid "Approve All" and "Reject All" capabilities for handling high-volume disruptions.
* **Neural Reasoning:** Deep transparency into AI decision-making with visible "Neural Reasoning" logs and metrics for every suggestion.

### 4. Persistent Global Infrastructure
* **Production-Grade Storage:** Fully integrated with **MongoDB Atlas**, providing persistent tracking for shipments, reroute histories, and organizational setup.
* **Multi-Tenant Architecture:** Secure isolation of data across different companies, with role-based access for Owners, Logistics Managers, and Node Operators.

---

## 🛠️ Production Deployment Architecture

The platform is designed for scalable cloud deployment (e.g., Render, AWS, GCP).

### Backend (FastAPI + MongoDB)
* **Hardened Security:** Enforced JWT authentication, password hashing, and secure OTP verification via SendGrid.
* **Environment Aware:** Dynamic configuration via `.env`, defaulting to `production` mode with standardized error handling and CORS security.
* **Persistent State:** Uses database-backed counters and persistent collections for all operational state.

### Frontend (React + Vite + Leaflet)
* **Real-Time Streaming:** High-performance WebSocket integration for live data pushes (Alerts, Health, Agent Logs).
* **Modern Aesthetic:** A premium, dark-themed dashboard designed for high-density information display and operational efficiency.
* **Centralized Config:** Runtime environment detection for seamless switching between local development and cloud URLs.

---

## 🚀 Getting Started (Quickstart)

### 1. Environment Configuration
Copy the template files and provide your production credentials:
```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

### 2. Launch the Ecosystem
**Backend:**
```bash
python -m backend.main
```
**Frontend:**
```bash
cd frontend && npm install && npm run dev
```

---

## 🔮 Roadmap: The Future of Nerve
1. **LLM-Powered Contextual Awareness:** Transitioning from heuristic agents to LLM-based reasoning for complex decision-making.
2. **Live Map Interpolation:** Real-time visual tracking of moving shipments (🚢/🚛) across global polylines.
3. **Financial Impact Analytics:** Real-time ROI calculation of AI rerouting decisions vs. disruption costs.

---
© 2026 Nerve Supply Chain Platform. Built for Resilience.
