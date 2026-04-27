import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { NetworkProvider } from './context/NetworkContext';
import { AgentProvider } from './context/AgentContext';
import AppShell from './components/layout/AppShell';

import CommandCenter from './pages/CommandCenter';
import Dashboard from './pages/Dashboard';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import Nodes from './pages/Nodes';
import NodeDetail from './pages/NodeDetail';
import Disruptions from './pages/Disruptions';
import AgentControl from './pages/AgentControl';
import Weather from './pages/Weather';
import BookShipment from './pages/BookShipment';
import AdminPanel from './pages/AdminPanel';

import './styles/globals.css';
import './styles/map.css';

export default function App() {
  return (
    <ThemeProvider>
      <WebSocketProvider>
        <NetworkProvider>
          <AgentProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<AppShell />}>
                  <Route index element={<CommandCenter />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="shipments" element={<Shipments />} />
                  <Route path="shipment/:id" element={<ShipmentDetail />} />
                  <Route path="nodes" element={<Nodes />} />
                  <Route path="node/:id" element={<NodeDetail />} />
                  <Route path="disruptions" element={<Disruptions />} />
                  <Route path="agents" element={<AgentControl />} />
                  <Route path="weather" element={<Weather />} />
                  <Route path="book" element={<BookShipment />} />
                  <Route path="admin" element={<AdminPanel />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AgentProvider>
        </NetworkProvider>
      </WebSocketProvider>
    </ThemeProvider>
  );
}
