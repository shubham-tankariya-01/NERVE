import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchNetwork, fetchShipments, fetchAlerts } from '../services/api';
import { useAppWebSocket } from './WebSocketContext';
import { useAuth } from './AuthContext';

const NetworkContext = createContext();

export function NetworkProvider({ children }) {
  const [nodes, setNodes] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [cascadeDebt, setCascadeDebt] = useState([]);
  const [riskHorizon, setRiskHorizon] = useState([]);
  const [networkHealth, setNetworkHealth] = useState(100);
  const [alerts, setAlerts] = useState([]);
  const [weatherData, setWeatherData] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);
  const [deliveryMetrics, setDeliveryMetrics] = useState({});
  const [loading, setLoading] = useState(true);

  const { data: wsData } = useAppWebSocket();
  const { isAuthenticated, isLoading: authLoading, getAuthHeaders, user } = useAuth();

  // ── Client-side company filter (safety layer until backend broadcast is fully deployed) ──
  const filterShipmentsByRole = (allShipments) => {
    if (!user || user.role === 'platform_admin') return allShipments;
    if (user.role === 'node_operator') {
      const assignedNodes = new Set(user.assigned_node_ids || []);
      if (assignedNodes.size === 0) return [];
      return allShipments.filter(s =>
        (s.planned_route || []).some(n => assignedNodes.has(n))
      );
    }
    // logistics_manager and company_owner: strict filter by company_id
    return allShipments.filter(s => s.company_id === user.company_id);
  };

  const filterNetworkByRole = (rawNodes, rawEdges) => {
    if (!user || user.role === 'platform_admin') return { nodes: rawNodes, edges: rawEdges };
    
    const compId = user.company_id;
    if (user.role === 'node_operator') {
      const assignedNodes = new Set(user.assigned_node_ids || []);
      const filteredNodes = rawNodes.filter(n => assignedNodes.has(n.id));
      const filteredEdges = rawEdges.filter(e => assignedNodes.has(e.from) && assignedNodes.has(e.to));
      return { nodes: filteredNodes, edges: filteredEdges };
    }
    
    // Strict company filtering
    const filteredNodes = rawNodes.filter(n => n.company_id === compId);
    const filteredEdges = rawEdges.filter(e => e.company_id === compId);
    return { nodes: filteredNodes, edges: filteredEdges };
  };

  // Initial Fetch
  useEffect(() => {
    async function initialFetch() {
      if (authLoading || !isAuthenticated) return;
      
      const headers = getAuthHeaders();
      try {
        const [networkRes, shipmentsRes, alertsRes] = await Promise.all([
          fetchNetwork(headers),
          fetchShipments(headers),
          fetchAlerts(headers)
        ]);
        
        // 1. Filter Network (Nodes & Edges)
        const { nodes: fNodes, edges: fEdges } = filterNetworkByRole(networkRes.nodes || [], networkRes.edges || []);
        const nodeIds = new Set(fNodes.map(n => n.id));
        
        setNodes(fNodes);
        setRoutes(fEdges.map(e => ({
          ...e,
          id: e.id || `${e.from}-${e.to}`,
          mode: e.transport_mode
        })));

        // 2. Filter Shipments
        setShipments(filterShipmentsByRole(shipmentsRes.shipments || []));

        // 3. Filter Alerts
        setAlerts((alertsRes.alerts || []).filter(a => nodeIds.has(a.node_id)));

        // 4. Filter Weather (Backwards compatibility with alertsRes or standalone)
        const rawWeather = alertsRes.weather || networkRes.weather || [];
        setWeatherData(rawWeather.filter(w => nodeIds.has(w.node_id)));

      } catch (err) {
        console.error('Failed to load initial network data:', err);
      } finally {
        setLoading(false);
      }
    }
    initialFetch();
  }, [isAuthenticated, authLoading, getAuthHeaders]);

  const lastProcessedTs = React.useRef(null);

  const nodesRef = React.useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // WebSocket Data Processing
  useEffect(() => {
    if (wsData && wsData.timestamp !== lastProcessedTs.current) {
      lastProcessedTs.current = wsData.timestamp;
      
      const currentNodeIds = new Set(nodesRef.current.map(n => n.id));

      if (wsData.alerts && user?.role !== 'node_operator') {
        // trust backend filtering but apply safety layer
        setAlerts(wsData.alerts.filter(a => currentNodeIds.size === 0 || currentNodeIds.has(a.node_id)));
      }
      if (wsData.network_health !== undefined) {
        setNetworkHealth(wsData.network_health);
      }
      if (wsData.cascade_debt) {
        setCascadeDebt(wsData.cascade_debt.filter(d => currentNodeIds.size === 0 || currentNodeIds.has(d.node_id)));
      }
      if (wsData.risk_horizon) {
        setRiskHorizon((wsData.risk_horizon || []).filter(h => currentNodeIds.size === 0 || currentNodeIds.has(h.node_id)));
      }
      if (wsData.shipments) {
        setShipments(filterShipmentsByRole(wsData.shipments));
      }
      if (wsData.network) {
        const { nodes: fNodes, edges: fEdges } = filterNetworkByRole(wsData.network.nodes || [], wsData.network.edges || []);
        setNodes(fNodes);
        setRoutes(fEdges.map(e => ({
          ...e,
          id: e.id || `${e.from}-${e.to}`,
          mode: e.transport_mode
        })));
      }
      if (wsData.weather) {
        setWeatherData(wsData.weather.filter(w => currentNodeIds.size === 0 || currentNodeIds.has(w.node_id)));
      }
      if (wsData.agent_logs) {
        setAgentLogs(wsData.agent_logs);
      }
      if (wsData.delivery_metrics) {
        setDeliveryMetrics(wsData.delivery_metrics);
      }
    }
  }, [wsData, user]);

  return (
    <NetworkContext.Provider value={{
      nodes, routes, shipments, cascadeDebt, riskHorizon, networkHealth, alerts, weatherData,
      agentLogs, deliveryMetrics,
      setNodes, setRoutes, setShipments, loading
    }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
