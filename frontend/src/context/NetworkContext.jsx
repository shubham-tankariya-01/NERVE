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
    // logistics_manager and any other role: filter by company_id, allow legacy data with no company_id
    return allShipments.filter(s =>
      !s.company_id || s.company_id === user.company_id
    );
  };

  // Initial Fetch
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const headers = getAuthHeaders();
        const [networkRes, shipmentsRes, alertsRes] = await Promise.all([
          fetchNetwork(headers),
          fetchShipments(headers),
          fetchAlerts(headers)
        ]);
        
        setNodes(networkRes.nodes || []);
        setRoutes((networkRes.edges || []).map(e => ({
          id: `${e.from}-${e.to}`,
          from: e.from,
          to: e.to,
          mode: e.transport_mode
        })));
        // Defensive client-side filter — backend returns pre-filtered data after fix,
        // but this guards against legacy broadcasts or timing issues.
        setShipments(filterShipmentsByRole(shipmentsRes.shipments || []));
        setAlerts(alertsRes.alerts || []);
      } catch (err) {
        console.error('Failed to load initial network data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isAuthenticated, authLoading, getAuthHeaders]);

  // Sync with WebSocket
  useEffect(() => {
    if (wsData && wsData.type === 'disruption_scan') {
      if (wsData.network_health !== undefined) {
        setNetworkHealth(wsData.network_health);
      }
      if (wsData.cascade_debt) {
        setCascadeDebt(wsData.cascade_debt);
      }
      if (wsData.risk_horizon) {
        setRiskHorizon(wsData.risk_horizon || []);
      }
      if (wsData.alerts) {
        // node_operator: ignore alert updates from WS (their shell doesn't show alerts)
        if (!user || user.role !== 'node_operator') {
          setAlerts(wsData.alerts);
        }
      }
      if (wsData.shipments) {
        setShipments(filterShipmentsByRole(wsData.shipments));
      }
      if (wsData.weather) {
        setWeatherData(wsData.weather);
      }
    }
  }, [wsData]);

  return (
    <NetworkContext.Provider value={{
      nodes, routes, shipments, cascadeDebt, riskHorizon, networkHealth, alerts, weatherData,
      setNodes, setRoutes, setShipments, loading
    }}>
      {children}
    </NetworkContext.Provider>
  );
}

export const useNetwork = () => useContext(NetworkContext);
