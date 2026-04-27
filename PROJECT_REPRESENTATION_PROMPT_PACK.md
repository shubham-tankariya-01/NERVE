# Nerve Product Representation Audit and AI Build Prompt Pack

## 1. Product truth from the backend

This project is not a generic analytics dashboard. It is a supply chain control tower with these real capabilities already modeled in code:

- 24 network nodes, 44 directed routes, and 65 shipments from `backend/mock_data.json`
- live disruption scanning every 10 seconds from `backend/main.py`
- weather-driven anomaly detection from `backend/ml/anomaly.py`
- network health, node risk, and cascade debt from `backend/graph/cascade_model.py`
- multi-agent disruption handling through Scout -> Mapper -> Optimizer -> Communicator
- shipment booking with route planning from `POST /api/shipments/book`
- shipment detail enrichment from `GET /api/shipments/{id}/detail`

The frontend should represent this as an operational logistics system:

- watch the network
- detect disruption
- understand impact
- reroute intelligently
- track shipment-level consequences

It should not look or behave like a generic SaaS dashboard with arbitrary charts.

## 2. Source-of-truth warning

Use the backend code as the main source of truth, not every doc file in the repo.

Important mismatches already in the repo:

- `frontend/README.md` is still the default Vite template.
- `README.md` describes components and pages that do not exist in `frontend/src`.
- `ideation.md` and `detailed_ideation.md` contain useful intent, but some counts and planned features are outdated.
- `nerve-dashboard.html` looks like an old static mock, not the real app.
- `frontend/src/App.css` is leftover template CSS and not part of the active product.

## 3. Current implementation problems found in the folder

### Product and information architecture problems

- The current navigation is generic: Dashboard, Shipments, Tracking, Network, Alerts, Analytics.
- "Tracking" is really shipment detail, so it should not be a top-level generic page.
- The sidebar contains a dead "Settings" item with no actual product value.
- The dashboard title says "Analytics overview" instead of framing the app as a supply chain control tower.

### Data meaning problems

- The app already has meaningful backend concepts, but the UI often ignores them.
- The network map is mostly static and does not merge live alert/risk state into node rendering.
- The analytics page shows widgets that are not backed by the real endpoint shape.
- The tracking page hardcodes progress and current route state instead of computing it from shipment data.
- The search input claims to search shipments and nodes, but only filters shipments.

### Concrete code and UX bugs

- [frontend/src/components/Shipments.jsx](C:\Users\Shubham Tankariya\Desktop\GOOGLE-SOln-2026\supply-chain-google-solution\frontend\src\components\Shipments.jsx:11) uses `useEffect` without importing it.
- [frontend/src/components/Shipments.jsx](C:\Users\Shubham Tankariya\Desktop\GOOGLE-SOln-2026\supply-chain-google-solution\frontend\src\components\Shipments.jsx:189) reads `bookingResult.route_analytics.path`, but the backend response does not return `path` inside `route_analytics`.
- [frontend/src/components/Tracking.jsx](C:\Users\Shubham Tankariya\Desktop\GOOGLE-SOln-2026\supply-chain-google-solution\frontend\src\components\Tracking.jsx:189) hardcodes route progress to `67%`.
- [frontend/src/components/Tracking.jsx](C:\Users\Shubham Tankariya\Desktop\GOOGLE-SOln-2026\supply-chain-google-solution\frontend\src\components\Tracking.jsx:201) hardcodes the "current" step with `idx === 2`.
- [frontend/src/components/Analytics.jsx](C:\Users\Shubham Tankariya\Desktop\GOOGLE-SOln-2026\supply-chain-google-solution\frontend\src\components\Analytics.jsx:96) expects `overall_status` from `/api/agents/health`, but that field does not exist.
- [frontend/src/components/Analytics.jsx](C:\Users\Shubham Tankariya\Desktop\GOOGLE-SOln-2026\supply-chain-google-solution\frontend\src\components\Analytics.jsx:125) and [129](C:\Users\Shubham Tankariya\Desktop\GOOGLE-SOln-2026\supply-chain-google-solution\frontend\src\components\Analytics.jsx:129) treat agent values as objects with `status` and `load`, but the backend currently returns strings.
- [frontend/src/App.jsx](C:\Users\Shubham Tankariya\Desktop\GOOGLE-SOln-2026\supply-chain-google-solution\frontend\src\App.jsx:132) says "Search shipments, nodes..." but [the logic only searches shipment fields](C:\Users\Shubham Tankariya\Desktop\GOOGLE-SOln-2026\supply-chain-google-solution\frontend\src\App.jsx:104).
- [frontend/src/components/Network.jsx](C:\Users\Shubham Tankariya\Desktop\GOOGLE-SOln-2026\supply-chain-google-solution\frontend\src\components\Network.jsx:17) ignores the prefetched network prop and fetches again.
- The repo has no Python dependency manifest like `requirements.txt` or `pyproject.toml`, which makes backend setup fragile.

### Taxonomy problems

- Existing shipment cargo values in the data include `electronics`, `consumer_goods`, `machinery`, `pharmaceuticals`, `textiles`, `medical_supplies`, `raw_materials`, `furniture`, and `automotive_parts`.
- The booking UI hardcodes values like `chemicals` and `auto_parts`, which do not match the current dataset shape.

## 4. Recommended information architecture

Use this navigation instead of the current generic one:

1. `Control Tower`
2. `Shipments`
3. `Network`
4. `Disruption Center`
5. `Intelligence`

Use route-based detail pages:

- `/shipments/:shipmentId` for shipment detail

Do not keep these as top-level nav destinations:

- generic `Tracking`
- dead `Settings`

Booking should be a drawer or modal launched from `Shipments`, not its own top-level page.

## 5. Global product rules for any AI that rebuilds this app

Copy this section as the master prompt before asking an AI to implement pages.

```text
Build a real operational supply chain control tower called Nerve. Do not build a generic analytics dashboard. The product monitors a global logistics network, detects weather-driven disruptions, calculates node risk and cascade fragility, reroutes affected shipments through a multi-agent pipeline, and lets operators book and inspect shipments in detail.

Use the backend as the source of truth:
- WebSocket /ws sends: type, timestamp, alerts_count, alerts, weather, cascade_debt, risk_horizon, agent_logs, network_health, network
- GET /api/network returns the static network graph
- GET /api/shipments returns shipment records
- GET /api/shipments/:id/detail returns enriched shipment detail
- GET /api/alerts returns active alerts
- GET /api/nodes/summary returns booking dropdown data
- POST /api/shipments/book books a shipment
- POST /api/disruption/simulate and POST /api/disruption/clear drive the manual disruption workflow
- GET /api/agents/health returns model/provider/readiness information, not fake CPU metrics

Design for a logistics operator, not a marketing audience. The UI should feel dense, operational, calm, and high-trust. Use real labels from the domain: network health, active disruptions, cascade debt, rerouted shipments, delayed shipments, node utilization, ETA, route legs, transport mode, agent decision log.

Never invent fake metrics, fake charts, or fake progress bars. If the backend does not expose a value, either compute it transparently from existing data or mark the backend change required.

Avoid placeholder cards that repeat the same number in different styles. Every panel must answer an operator question.

The main visual center of gravity should be the network and its operational consequences:
- what is at risk
- which shipments are affected
- what the agents changed
- what action the operator should take

Use explicit loading, empty, and error states. Make search genuinely useful. Keep labels visible in the sidebar. Remove dead navigation. Build real page hierarchy instead of a tabbed toy dashboard.
```

## 6. Shared shell and component prompts

### 6.1 App shell prompt

**Keep**

- dark operational theme
- left navigation
- live data model

**Remove**

- hover-only sidebar expansion
- generic "Analytics overview" framing
- duplicated or dead panels

**Add**

- route-based navigation
- persistent top status strip with `network_health`, `alerts_count`, delayed shipments, last scan time
- reliable global search
- explicit live connection state for REST and WebSocket

**Prompt**

```text
Build the global application shell for Nerve, a supply chain control tower. Use a left sidebar, top operational status strip, main page canvas, and compact right-side activity rail. Labels in the sidebar must always be visible on desktop. Include routes for Control Tower, Shipments, Network, Disruption Center, and Intelligence. Show live connection status, last scan timestamp, network health, and active disruption count in the header. Remove dead navigation like Settings unless a real system page is implemented.
```

### 6.2 Sidebar prompt

**Problems to fix**

- current labels are generic
- hover-only expansion hurts usability
- dead `Settings` entry

**Prompt**

```text
Design a fixed operational sidebar for Nerve. Navigation items: Control Tower, Shipments, Network, Disruption Center, Intelligence. Each item should have a clear icon and optional count badge where meaningful. Do not rely on hover to reveal labels. Show the product name, a small environment tag like Live Simulation, and a compact system status chip at the bottom instead of a dead Settings link.
```

### 6.3 Global search prompt

**Problems to fix**

- current search claims node support but only filters shipments
- results show node IDs, not user-friendly names
- no keyboard handling

**Prompt**

```text
Build a global command-palette style search for Nerve. It must search shipments, nodes, and pages. Search results should be grouped by type and show human-readable names plus IDs. Shipment results must show origin, destination, status, and priority. Node results must show node name, type, status, utilization, and active alert state. Selecting a result should navigate to the correct page or detail screen. Add keyboard support for open, close, arrow navigation, enter to select, and escape to dismiss.
```

### 6.4 Right activity rail prompt

**Problems to fix**

- current right panel only repeats alerts
- no sense of scan cadence, decision flow, or operator triage

**Prompt**

```text
Build a compact right activity rail for Nerve that helps operators stay oriented without duplicating full pages. Include: active disruption count, the top 3 incidents by severity, last 5 agent log entries, last successful weather fetch time, and scan cadence. This rail should summarize and link deeper, not become a second full alerts page.
```

### 6.5 Booking drawer prompt

**Problems to fix**

- cargo taxonomy mismatch
- booking success view depends on a missing `route_analytics.path`
- no post-book refresh contract called out

**Prompt**

```text
Build a shipment booking drawer launched from the Shipments page. Use backend node summary data for origin and destination selectors grouped by node type. Prevent same-origin and same-destination selection. Use cargo types that match the real product taxonomy, preferably delivered from backend config rather than hardcoded in the frontend. After booking, show the chosen route, ETA, total transit hours, total distance, total cost, risk score, and alternative routes. If the backend does not return the chosen path explicitly, use `shipment.planned_route` from the booking response or add `path` to `route_analytics`. After successful booking, refresh shipments and offer a direct navigation into the new shipment detail page.
```

### 6.6 Empty, loading, and error state prompt

```text
Create explicit states for loading, empty, disconnected, and backend error scenarios across the app. Empty states should explain the operational meaning, not just say "No data." If WebSocket data is unavailable, show the last REST snapshot with a stale badge. If booking fails, show the exact backend validation message. If a shipment detail fetch fails, keep the selection visible and show a retry action.
```

## 7. Page prompts

### 7.1 Control Tower page

**What this page should mean**

This is the operator's command center. It should answer:

- Is the network healthy?
- Where is the disruption?
- Which shipments are exposed?
- What did the agents do?

**Remove from current version**

- generic dashboard framing
- weather cards that are not connected to impact
- decorative stats with no operator action

**Add**

- KPI strip: network health, active disruptions, delayed shipments, rerouted shipments, high-priority shipments at risk
- central live network map with nodes, routes, and alert overlays
- incident queue with severity, node, estimated delay, impacted shipments count
- cascade debt leaderboard with explanation
- risk horizon chart
- agent decision terminal

**Data sources**

- `GET /api/network`
- `GET /api/shipments`
- WebSocket `/ws`
- optional derived frontend metric: impacted shipments per alert by comparing alert node IDs to planned routes

**Prompt**

```text
Build the Nerve Control Tower page as a real logistics command center. The main focus should be a live global network map showing nodes and routes, with node coloring driven by current disruption severity or computed live risk. Above the map, show operational KPIs that matter: network health, active disruptions, delayed shipments, rerouted shipments, and high-priority shipments exposed to risk. Beside or below the map, show a ranked incident queue that explains which node is disrupted, why, the estimated delay, and how many shipments are affected. Include a cascade debt leaderboard and risk horizon chart, but frame both as decision support, not decorative analytics. Include a real-time agent log terminal that shows Scout, Mapper, Optimizer, and Communicator decisions in chronological order. Do not show fake metrics or generic SaaS cards.
```

### 7.2 Shipments page

**What this page should mean**

This is the operational shipment desk for search, triage, filtering, booking, and drill-down.

**Remove from current version**

- bare table with minimal insight
- ID-only thinking
- cargo values that do not match backend taxonomy

**Add**

- filters for status, priority, cargo type, disruption exposure
- columns for shipment ID, origin name, destination name, current node, status, priority, cargo, ETA, risk, reroute state
- row selection that opens a side inspector or navigates to detail
- booking drawer trigger

**Prompt**

```text
Build the Shipments page for Nerve as an operational shipment workbench. Use a dense table with filters and search. Each row should show shipment ID, origin, destination, current node, status, priority, cargo type, ETA, disruption exposure, and reroute status. Use human-readable node names with IDs shown secondarily. Allow sorting and filtering by delayed, in transit, delivered, high priority, cargo type, and currently impacted by an active disruption. Add a prominent New Shipment action that opens the booking drawer. Clicking a shipment should navigate to a dedicated shipment detail route instead of a generic Tracking tab.
```

### 7.3 Shipment Detail page

**What this page should mean**

This is the place to understand one shipment end to end.

**Remove from current version**

- hardcoded `67%` progress
- hardcoded current step index
- faux tracking language not grounded in actual shipment state

**Add**

- shipment hero with status, priority, cargo, origin, destination, current node, ETA
- route map focused on this shipment
- computed route progress based on `current_node`, `route_taken`, `planned_route`, and ETA data
- original route vs current route when rerouted
- route leg table
- reroute history
- route alerts
- avoided nodes explanation

**Prompt**

```text
Build a dedicated Shipment Detail page for Nerve at /shipments/:shipmentId. This page must be grounded in GET /api/shipments/:id/detail. Show a shipment summary header with ID, priority, cargo type, current status, current node, origin, destination, and ETA. The center of the page should be a focused map of the planned route, with avoided nodes and alert-affected nodes clearly distinguished. Compute route progress from actual shipment data; never hardcode a percent or a current step. Add sections for ETA by leg, route segments, active route alerts, and reroute history. If the backend detail payload lacks enough information for progress calculation, add fields like progress_pct, current_leg_index, original_route, and original_eta rather than faking it in the UI.
```

### 7.4 Network page

**What this page should mean**

This page should explain the network itself, not just display static dots and lines.

**Remove from current version**

- purely static node coloring from mock `risk_level`
- map with no shipment or utilization meaning

**Add**

- live node state merged from static network graph plus WebSocket disruptions
- filters by node type, operational status, live risk, and transport mode
- selected node details: utilization, processing time, inbound/outbound links, shipments touching the node, active alert state
- route legend by transport mode
- optional cluster summaries by geography or node type

**Prompt**

```text
Build the Network page as an explorable digital twin of the supply chain. Start with the static graph from GET /api/network, but merge it with live disruption and risk context from the WebSocket feed so node color and status reflect current conditions, not only static mock data. Support filters for node type, operational status, transport mode, and live risk. When a node is selected, show a details panel with utilization, processing time, base risk, live alert state, connected routes, and shipments whose planned routes touch that node. Do not present this as a decorative world map. It must help an operator understand network structure and fragility.
```

### 7.5 Disruption Center page

**What this page should mean**

This is the incident desk for weather and disruptions.

**Remove from current version**

- alert cards that stop at weather facts
- weather table disconnected from shipment impact

**Add**

- active incident list sorted by severity
- per-incident view: node, weather reason, estimated delay, impacted shipments, recommended action
- weather telemetry table
- manual disruption simulation panel
- clear simulation action
- incident-to-agent log linkage

**Prompt**

```text
Build a Disruption Center page for Nerve where operators can monitor and simulate incidents. Show a severity-sorted incident list with node name, node ID, disruption reasons, estimated delay, and impacted shipment count. Pair this with a weather telemetry table sourced from the WebSocket payload or GET /api/alerts and add a simulation panel that uses POST /api/disruption/simulate and POST /api/disruption/clear. When an incident is selected, show the affected shipments and the agent decision trail for that incident. This page should connect weather to operational consequence, not stop at meteorological display.
```

### 7.6 Intelligence page

**What this page should mean**

This is where analytical widgets live, but only if they mean something operationally.

**Remove from current version**

- fake agent load diagnostics
- generic processed counts with no operator insight
- any chart that cannot be explained by backend data

**Add**

- network health breakdown
- risk horizon chart
- cascade debt leaderboard
- delayed shipment breakdown by priority and cargo
- transport mode mix
- node utilization leaderboard
- reroute outcome summary
- agent platform readiness as a small status card, not a fake observability dashboard

**Prompt**

```text
Build the Intelligence page for Nerve as a meaningful operational analytics surface. Use only real or transparently derived metrics. Include a network health explanation card that breaks down what is pushing health up or down, the risk horizon chart from live alerts, the cascade debt leaderboard, delayed shipments by priority, cargo mix, transport mode mix, and a summary of rerouted versus optimal versus blocked shipments when available. Use GET /api/agents/health only to show model/provider/readiness status, not invented CPU or load percentages. Every chart must answer an operator question about resilience, exposure, or routing quality.
```

## 8. Backend changes required for the frontend to become truthful

These changes are either necessary or strongly recommended.

### 8.1 WebSocket payload additions

Add these fields to the disruption scan payload:

- `risk_scores` by node ID
- `impacted_shipments_count` per alert
- `rerouted_shipments_count`
- `blocked_shipments_count`
- `scan_interval_seconds`
- `last_weather_fetch_at`
- `weather_fetch_status`

Reason: the frontend currently has to guess or cannot show meaningful live state.

### 8.2 Search API

Add `GET /api/search?q=...` that returns grouped results:

- `shipments`
- `nodes`
- optional `pages`

Reason: the current global search is shipment-only and mislabeled.

### 8.3 Shipment detail enrichment

Extend `GET /api/shipments/{id}/detail` with:

- `progress_pct`
- `current_leg_index`
- `original_route`
- `original_estimated_arrival`
- `latest_estimated_arrival`
- `rerouted` boolean

Reason: shipment detail currently hardcodes progress in the UI.

### 8.4 Booking response fix

Either:

- add `path` to `route_analytics`

or:

- make the frontend use `shipment.planned_route`

Reason: the current booking success view expects a path that the backend does not send.

### 8.5 Agent health response cleanup

Change `GET /api/agents/health` to return a consistent shape like:

```json
{
  "status": "healthy",
  "pipeline": "LangGraph StateGraph",
  "llm": {
    "provider": "groq",
    "model": "llama-3.3-70b-versatile",
    "status": "online"
  },
  "agents": {
    "scout": { "state": "ready", "mode": "llm" },
    "mapper": { "state": "ready", "mode": "llm" },
    "optimizer": { "state": "ready", "mode": "llm" },
    "communicator": { "state": "ready", "mode": "llm" }
  }
}
```

Reason: the current frontend expects objects, but the backend returns strings.

### 8.6 Optional dashboard summary endpoint

Add `GET /api/dashboard/summary` for derived metrics that are awkward to recompute in multiple pages.

Suggested fields:

- delayed shipments count
- impacted shipments count
- rerouted shipments count
- high-priority impacted shipments count
- top disrupted nodes

## 9. Cleanup list

Archive or remove these when the redesign starts:

- `frontend/src/App.css` if it stays unused
- `frontend/README.md` default template content
- unused starter assets like `react.svg` and `vite.svg` if they are not needed
- `nerve-dashboard.html` if it is only an obsolete static mock

Add missing project setup files:

- `backend/requirements.txt` or `pyproject.toml`
- a root setup section that explains frontend and backend dependencies separately

## 10. Implementation order for another AI

Use this sequence:

1. Fix broken contracts and dead code first.
2. Replace generic navigation with route-based information architecture.
3. Rebuild Control Tower around live network state.
4. Rebuild Shipments and Shipment Detail around real shipment workflows.
5. Rebuild Network and Disruption Center around live operational meaning.
6. Rebuild Intelligence last, using only metrics that can be justified by the backend.

## 11. One final instruction to any AI doing the work

```text
If a metric, progress bar, alert badge, map color, or diagnostic widget cannot be defended using the real backend data model, do not render it. Either compute it transparently, request the backend field, or remove it.
```
