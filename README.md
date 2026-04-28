# Nerve: Smart Supply Chain Monitor

This system provides a real-time, digital twin of a global supply chain network. It tracks shipments across 24 global nodes (ports, factories, warehouses), dynamically fetches real-world weather data, automatically detects anomalies that could lead to delays, and uses an intelligent Multi-Agent system to autonomously calculate alternative routes—all streaming live to a frontend dashboard.

---

## 🌟 System Capabilities & Working Features

At a high level, the system operates as a fully functional end-to-end loop:

1. **Continuous Simulation Loop:** The backend fetches weather conditions across all global nodes every 10 seconds.
2. **Disruptions & Anomaly Detection:** The system parses weather data against safety thresholds. You can also manually inject extreme weather (like 150km/h winds) via the frontend **Disruption Generator**, which the backend successfully flags as a Critical Anomaly.
3. **Multi-Agent Resolution:** When an anomaly is flagged, the Multi-Agent Orchestrator automatically kicks in. It:
   - **Scouts** the disruption to verify severity.
   - **Maps** impacted shipments heading toward the disrupted node.
   - **Optimizes** alternative routes using an advanced cost function considering distance, risk scores, and cascade debt.
   - **Communicates** and executes the reroutes—all streaming live to the **Agent Log Terminal** at the bottom of the map.
   - **Communicates** and executes the reroutes—all streaming live to the **Agent Log Terminal** at the bottom of the map.
4. **Shipment Booking Engine:** A dedicated UI allows users to book new shipments by selecting an origin, destination, and cargo type. The `RoutePlanner` agent dynamically calculates the optimal path from scratch, taking into account live weather, cascading debt, and risk factors, before committing the new shipment to the active network.
5. **Data Visualization:** The React/Leaflet dashboard successfully renders the network structure, displays dynamic "Health" and "Cascade Debt" analytics, and allows you to search for specific shipments (e.g., "S001") to track their exact path on the globe.

---

## 👥 Team Workflows Breakdown & File Directory

To make collaboration smooth and avoid Git conflicts, the project is divided into four distinct modules. Here is what each workflow entails, including exactly which files you own:

### 1. Frontend Development (UI/UX & Visualization)

* **Your Role:** Building the "God's Eye View" of the supply chain. You are responsible for making sure the live WebSocket data (alerts, network health, agent logs) is displayed beautifully and responsively.
- **Your Files:**
  - `frontend/src/App.jsx`: The core layout wrapper. Hooks into the WebSocket feed to catch live data.
  - `frontend/src/index.css`: The master stylesheet controlling the dark-theme aesthetics and dynamic layouts.
  - `frontend/src/components/MapView.jsx`: The interactive Leaflet map that draws the nodes, paths, and shipment trajectories.
  - `frontend/src/components/AlertPanel.jsx`: The dynamic right-hand list rendering the weather and disruption alerts.
  - `frontend/src/components/DisruptionGenerator.jsx`: The control panel overlay allowing users to inject custom weather extremes.
  - `frontend/src/components/DisruptionGenerator.jsx`: The control panel overlay allowing users to inject custom weather extremes.
  - `frontend/src/components/BookingEngine.jsx`: The multi-step modal for users to book new shipments with AI-calculated routes.
  - `frontend/src/components/AgentLog.jsx`: The scrolling "Agent Control Logic" terminal at the bottom of the screen.
  - `frontend/src/components/ShipmentSearch.jsx`: The UI for looking up specific cargo IDs to plot their exact route.
  - `frontend/src/pages/ShipmentDetail.jsx`: The dedicated full-page view for deep-diving into a specific shipment's ETA, route segments, and reroute history.
  - `frontend/src/components/CascadeDebt.jsx` & `RiskHorizon.jsx`: Specialized analytics widgets for the sidebar.

### 2. Backend Architecture & Real-Time Communication

* **Your Role:** Orchestrating the data pipe. You maintain the core simulation loop that ticks every 10 seconds. You handle incoming WebSocket connections, ensuring that the payload is broadcasted securely and without lag to the frontend.
- **Your Files:**
  - `backend/main.py`: The single most important file for the server. It instantiates the FastAPI app, manages the `scan_loop()` background task, hosts the `/ws` WebSocket endpoint, and exposes the REST APIs (`/api/network`, `/api/shipments`, `/api/disruption/simulate`).

### 3. Data Engineering & Graph Modeling

* **Your Role:** Managing the physical reality of the supply chain. You maintain the underlying mathematical graph structure of the 24 nodes and 44 routes, and you manage the external simulator that fetches the weather.
- **Your Files:**
  - `backend/mock_data.json`: The ground-truth configuration file holding all nodes, transit routes, and active shipments.
  - `backend/graph/supply_graph.py`: Reads the JSON and parses it into a `NetworkX` directed graph object, holding logic for node capacities and transit calculations.
  - `backend/graph/cascade_model.py`: Calculates network fragility (Cascade Debt) determining how delays will ripple through the network.
  - `backend/feeds/weather.py`: The data ingestion simulator that acts as a proxy for the Open-Meteo API to mock live environmental conditions.

### 4. AI/ML & Multi-Agent Orchestration

* **Your Role:** Building the intelligence of the platform. You define what constitutes an anomaly and maintain the 4 specialized Agents that work together to automatically resolve supply chain disruptions.
- **Your Files:**
  - `backend/ml/anomaly.py`: Evaluates the weather thresholds (e.g., classifying wind > 60km/h as a High severity disruption) and creates `DisruptionAlert` objects.
  - `backend/ml/risk_horizon.py`: Projects statistical likelihoods of future network failure over 6h/24h/72h windows.
  - `backend/agents/orchestrator.py`: The central nervous system for the agents. Coordinates passing data from Scout -> Mapper -> Optimizer -> Communicator.
  - `backend/agents/scout.py`: The **Scout Agent** filters raw anomaly alerts to determine which ones actually require action.
  - `backend/agents/mapper.py`: The **Mapper Agent** scans the graph to find all active shipments whose paths intersect with the disrupted nodes.
  - `backend/agents/optimizer.py`: The **Optimizer Agent** runs Dijkstra-like cost functions to mathematically find the best alternative routes around the disruption.
  - `backend/agents/route_planner.py`: The **RoutePlanner Agent** calculates the optimal initial route for *new* shipments using the same dynamic 4-factor cost function as the Optimizer.
  - `backend/agents/communicator.py`: The **Communicator Agent** translates internal routing data into human-readable logs and updates the shipments' planned paths in system memory.

---

## 🚀 Getting the Server Up and Running

The project requires **Node.js/npm** for the frontend and **Python 3** for the backend.

### 1. Start the Backend (FastAPI)

Open a terminal in the project root directory.
Make sure your Python virtual environment (`venv`) is activated and dependencies (`fastapi`, `uvicorn`, `networkx`, `requests`) are installed
Run the backend server:

```powershell
.\venv\Scripts\python.exe -m backend.main
```

*(If on Linux/Mac: `source venv/bin/activate && python -m backend.main`)*

You will see logs indicating the server is running on `http://0.0.0.0:8000` and the 10-second background scanner has started.

### 2. Start the Frontend (Vite + React)

Open a **separate** terminal and navigate to the frontend directory:

```powershell
cd frontend
```

Install dependencies (if it's your first time):

```powershell
npm install
```

Start the Vite development server:

```powershell
npm run dev
```

### 3. View the Dashboard

Open your web browser and navigate to `http://localhost:5173/`.
You should see the dark-themed map loading the nodes and routes. Within 10 seconds, the first WebSocket push will occur, agent logs will begin reporting, and any detected weather anomalies will appear in the right-hand Disruption Alerts panel.

## System Capabilities & Working Features

At a high level, the current system is a fully functional end-to-end loop!

1. **Non-Blocking Simulation:** The backend continuously simulates weather conditions across 24 global nodes. Open-Meteo fetches are run as fire-and-forget background tasks so the 10-second analytic scan loop never stalls.
2. **Disruptions:** You can manually inject extreme weather via the frontend UI, which the backend successfully flags as Anomalies. The overrides apply instantly and clear instantly.
3. **Multi-Agent Resolution:** When an anomaly is flagged, the Multi-Agent Orchestrator automatically kicks in. It scouts the disruption, maps impacted shipments, optimizes alternative routes, and communicates the reroutes. A caching layer ensures the Optimizer only calculates routes when the physical disruption landscape changes, preventing redundant processing.
4. **Shipment Booking Engine:** You can book new shipments via the frontend dashboard. The backend `RoutePlanner` dynamically calculates the optimal path from scratch, taking into account current global weather, port congestion, and risk scores.
5. **Data Visualization:** The map and dashboard successfully render the network structure and calculate real-time analytical metrics like "Cascade Debt".
6. **Deep Shipment Tracking:** Looking up a shipment (e.g., "S055") provides access to a dedicated Detail Page. This page features a focused map highlighting current/future routes and explicitly marks avoided nodes in red. It also provides an ETA breakdown, risk assessment, and a persistent chronological history of every AI-driven reroute applied to that cargo.

---

## Current Limitations & Missing Features

1. **No Real-time Shipments on Global Map:** The main global map currently displays the static network infrastructure. There are no moving icons or visual indicators for the shipments currently in transit between nodes until you click into a specific shipment's detail page.
2. **Database Persistence:** Currently, all agent logs, reroute histories, and shipment progressions are held in-memory in the FastAPI application state. Restarting the backend server resets all shipments back to the origin state defined in `mock_data.json`.
3. **Primitive Agents:** The current multi-agent system (Scout, Mapper, Optimizer, Communicator) relies on hardcoded heuristics and algorithms (like Dijkstra's). To achieve true autonomous decision-making and dynamic problem solving, these need to be upgraded to Large Language Model (LLM) based agents.

---

## 🔮 Future Roadmap & Enterprise Features

To elevate Nerve from a prototype to a production-grade enterprise platform, the following features are prioritized for future development:

1. **LLM-Powered Autonomous Agents**
   - **Concept:** Upgrade the heuristics-based agents to true LLMs (via LangChain or CrewAI). This enables contextual awareness (e.g., reading news feeds about port strikes) and provides human-readable justifications for complex reroute decisions.

2. **Live Map Animation & Interpolation**
   - **Concept:** Calculate real-time shipment coordinates using `departure_time` and `transit_hrs`. The frontend will use linear interpolation to display moving vehicle icons (🚢/🚛) along the map polylines, providing a true "live" feel to the supply chain flow.

3. **Persistent Database Architecture**
   - **Concept:** Migrate from in-memory state and JSON files to **PostgreSQL + PostGIS** for spatial queries (e.g., "Find shipments within 500km of this storm") and **Redis** for high-speed simulation caching.

4. **Financial & Carbon Impact Analytics**
   - **Concept:** Utilize edge `cost_per_unit` data to calculate the financial impact of agent decisions (e.g., "Rerouting saved 4 days but incurred a $45,000 penalty"). Implement carbon footprint tracking based on transport modes (Air vs. Sea).

5. **Predictive Risk Horizons (Time-Series ML)**
   - **Concept:** Transition from reacting to *current* weather to predicting *future* weather. A forecasting ML model will allow the agents to pre-emptively reroute a ship before it even leaves the port if a storm is predicted along its path 3 days out.

6. **Interactive Network Graph Editing**
   - **Concept:** Provide a UI for admins to click and drop new "Pop-up Warehouses" onto the map, draw edges to ports, and have the backend dynamically hot-reload the `NetworkX` graph without dropping the simulation.
