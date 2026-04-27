import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchNetwork, fetchShipments, fetchAlerts } from '../services/api';
import { useAppWebSocket } from './WebSocketContext';

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

  // Initial Fetch
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [networkRes, shipmentsRes, alertsRes] = await Promise.all([
          fetchNetwork(),
          fetchShipments(),
          fetchAlerts()
        ]);
        
        setNodes(networkRes.nodes || []);
        setRoutes((networkRes.edges || []).map(e => ({
          id: `${e.from}-${e.to}`,
          from: e.from,
          to: e.to,
          mode: e.transport_mode
        })));
        setShipments(shipmentsRes.shipments || []);
        setAlerts(alertsRes.alerts || []);
      } catch (err) {
        console.error('Failed to load initial network data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

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
        setAlerts(wsData.alerts);
      }
      if (wsData.shipments) {
        setShipments(wsData.shipments);
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
