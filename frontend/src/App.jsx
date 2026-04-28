import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { NetworkProvider } from './context/NetworkContext';
import { AgentProvider } from './context/AgentContext';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/layout/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
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
import ReroutingQueue from './pages/ReroutingQueue';
import Settings from './pages/Settings';

import './styles/globals.css';
import './styles/map.css';

// Operator UI
import OperatorShell from './layouts/OperatorShell';
import ExpectedShipments from './pages/operator/ExpectedShipments';
import TodayCheckins from './pages/operator/TodayCheckins';
import FlagIssue from './pages/operator/FlagIssue';
import NodeManager from './pages/operator/NodeManager';
import NodeWeather from './pages/operator/NodeWeather';

// Admin Pages
import AdminShell from './layouts/AdminShell';
import CompanyManagement from './pages/admin/CompanyManagement';
import CompanyDetail from './pages/admin/CompanyDetail';

// Customer UI
import CustomerShell from './layouts/CustomerShell';
import MyShipments from './pages/customer/MyShipments';
import TrackShipment from './pages/customer/TrackShipment';
import CustomerDashboard from './pages/customer/CustomerDashboard';

// Placeholders
const CustomerTracking = () => <div style={{ padding: '40px', color: 'var(--text-primary)' }}>Public Tracking View - Coming Soon</div>;

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WebSocketProvider>
          <NetworkProvider>
            <AgentProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/track/:shipmentId" element={<CustomerTracking />} />

                  {/* Protected Routes - Logistics & Admins */}
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute allowedRoles={['logistics_manager', 'platform_admin']}>
                        <AppShell />
                      </ProtectedRoute>
                    }
                  >
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
                    <Route path="manager/rerouting" element={<ReroutingQueue />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  {/* Role-Specific Shells */}
                  <Route 
                    path="/operator" 
                    element={
                      <ProtectedRoute allowedRoles={['node_operator']}>
                        <OperatorShell />
                      </ProtectedRoute>
                    } 
                  >
                    <Route index element={<ExpectedShipments />} />
                    <Route path="today" element={<TodayCheckins />} />
                    <Route path="nodes" element={<NodeManager />} />
                    <Route path="weather" element={<NodeWeather />} />
                    <Route path="flag" element={<FlagIssue />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  {/* Admin Shell */}
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute allowedRoles={['platform_admin']}>
                        <AdminShell />
                      </ProtectedRoute>
                    } 
                  >
                    <Route index element={<CompanyManagement />} />
                    <Route path="companies/:id" element={<CompanyDetail />} />
                    <Route path="mission-control" element={<AdminPanel />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  {/* Customer Shell */}
                  <Route 
                    path="/customer" 
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerShell />
                      </ProtectedRoute>
                    } 
                  >
                    <Route index element={<CustomerDashboard />} />
                    <Route path="shipments" element={<MyShipments />} />
                    <Route path="track/:id" element={<TrackShipment />} />
                    <Route path="alerts" element={<div style={{ padding: '20px', color: 'var(--text-primary)', fontSize: '14px' }}>Alerts — Coming soon</div>} />
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </AgentProvider>
          </NetworkProvider>
        </WebSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
