/**
 * api.js
 * Centralized service for REST API calls to the backend.
 */

const API_BASE = 'http://localhost:8000/api';

export const fetchNetwork = async () => {
  const response = await fetch(`${API_BASE}/network`);
  if (!response.ok) throw new Error('Failed to fetch network');
  return response.json();
};

export const fetchShipments = async () => {
  const response = await fetch(`${API_BASE}/shipments`);
  if (!response.ok) throw new Error('Failed to fetch shipments');
  return response.json();
};

export const fetchAlerts = async () => {
  const response = await fetch(`${API_BASE}/alerts`);
  if (!response.ok) throw new Error('Failed to fetch alerts');
  return response.json();
};

export const fetchAgentHealth = async () => {
  const response = await fetch(`${API_BASE}/agents/health`);
  if (!response.ok) throw new Error('Failed to fetch agent health');
  return response.json();
};

export const bookShipment = async (data) => {
  const response = await fetch(`${API_BASE}/shipments/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to book shipment');
  return response.json();
};

export const simulateDisruption = async (data) => {
  const response = await fetch(`${API_BASE}/disruption/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to simulate disruption');
  return response.json();
};

export const clearDisruptions = async () => {
  const response = await fetch(`${API_BASE}/disruption/clear`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to clear disruptions');
  return response.json();
};

// ── Admin Panel Endpoints ──

export const fetchDecisionLogs = async () => {
  const response = await fetch(`${API_BASE}/admin/logs`);
  if (!response.ok) throw new Error('Failed to fetch decision logs');
  return response.json();
};

export const manualReroute = async (data) => {
  const response = await fetch(`${API_BASE}/admin/shipments/reroute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to perform manual reroute');
  return response.json();
};
