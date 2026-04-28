/**
 * api.js
 * Centralized service for REST API calls to the backend.
 * All functions now support optional authentication headers.
 */

const API_BASE = 'http://127.0.0.1:8000/api';

// ← NEW: Utility to get auth headers from localStorage
const getStoredAuthHeaders = () => {
  const token = localStorage.getItem('nerve_access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ← NEW: Extract detailed error message from backend response
const extractError = async (response, fallback) => {
  try {
    const data = await response.json();
    throw new Error(data.detail || fallback);
  } catch (e) {
    if (e instanceof Error && e.message !== fallback) throw e;
    throw new Error(fallback);
  }
};

// ── Auth Endpoints (Multi-Step) ── //

export const loginStep1 = async (data) => {
  const response = await fetch(`${API_BASE}/auth/login/step1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) await extractError(response, 'Login failed');
  return response.json();
};

export const loginStep2 = async (data) => {
  const response = await fetch(`${API_BASE}/auth/login/step2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) await extractError(response, 'OTP Verification failed');
  return response.json();
};

export const registerStep1 = async (data) => {
  const response = await fetch(`${API_BASE}/auth/register/step1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) await extractError(response, 'Registration step 1 failed');
  return response.json();
};

export const registerStep2 = async (data) => {
  const response = await fetch(`${API_BASE}/auth/register/step2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) await extractError(response, 'OTP Verification failed');
  return response.json();
};

export const refreshAuth = async (refreshToken) => {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!response.ok) await extractError(response, 'Token refresh failed');
  return response.json();
};

export const fetchCurrentUser = async () => {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: getStoredAuthHeaders()
  });
  if (!response.ok) await extractError(response, 'Failed to fetch current user');
  return response.json();
};

export const fetchNetwork = async (headers = {}) => {
  const response = await fetch(`${API_BASE}/network`, { headers });
  if (!response.ok) throw new Error('Failed to fetch network');
  return response.json();
};

export const fetchShipments = async (headers = {}) => {
  const response = await fetch(`${API_BASE}/shipments`, { headers });
  if (!response.ok) throw new Error('Failed to fetch shipments');
  return response.json();
};

export const fetchAlerts = async (headers = {}) => {
  const response = await fetch(`${API_BASE}/alerts`, { headers });
  if (!response.ok) throw new Error('Failed to fetch alerts');
  return response.json();
};

export const fetchAgentHealth = async (headers = {}) => {
  const response = await fetch(`${API_BASE}/agents/health`, { headers });
  if (!response.ok) throw new Error('Failed to fetch agent health');
  return response.json();
};

export const bookShipment = async (data, headers = {}) => {
  const response = await fetch(`${API_BASE}/shipments/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to book shipment');
  return response.json();
};

export const simulateDisruption = async (data, headers = {}) => {
  const response = await fetch(`${API_BASE}/disruption/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to simulate disruption');
  return response.json();
};

export const clearDisruptions = async (headers = {}) => {
  const response = await fetch(`${API_BASE}/disruption/clear`, {
    method: 'POST',
    headers
  });
  if (!response.ok) throw new Error('Failed to clear disruptions');
  return response.json();
};

// ── Admin Panel Endpoints ──

export const fetchDecisionLogs = async (headers = {}) => {
  const response = await fetch(`${API_BASE}/admin/logs`, { headers });
  if (!response.ok) throw new Error('Failed to fetch decision logs');
  return response.json();
};
// --- Node Management ---
export const fetchOperatorNodes = async (headers) => {
  const r = await fetch(`${API_BASE}/operator/nodes`, { headers });
  if (!r.ok) throw new Error('Failed to fetch nodes');
  return r.json();
};

export const createNode = async (payload, headers) => {
  const r = await fetch(`${API_BASE}/operator/nodes`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error('Failed to create node');
  return r.json();
};

export const deleteNode = async (nodeId, headers) => {
  const r = await fetch(`${API_BASE}/operator/nodes/${nodeId}`, {
    method: 'DELETE',
    headers
  });
  if (!r.ok) throw new Error('Failed to delete node');
  return r.json();
};

export const fetchNodeOperator = async (nodeId, headers) => {
  const r = await fetch(`${API_BASE}/operator/nodes/${nodeId}/operator`, { headers });
  if (!r.ok) throw new Error('Failed to fetch node operator');
  return r.json();
};

export const manualReroute = async (data, headers = {}) => {
  const response = await fetch(`${API_BASE}/admin/shipments/reroute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to perform manual reroute');
  return response.json();
};

// ── Reroute Approval Endpoints ──

export const fetchPendingReroutes = async (headers = {}) => {
  const response = await fetch(`${API_BASE}/rerouting/pending`, { headers });
  if (!response.ok) throw new Error('Failed to fetch pending reroutes');
  return response.json();
};

export const fetchRerouteHistory = async (status = '', limit = 50, headers = {}) => {
  const url = `${API_BASE}/rerouting/history?status=${status}&limit=${limit}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error('Failed to fetch reroute history');
  return response.json();
};

export const approveReroute = async (id, notes = '', headers = {}) => {
  const response = await fetch(`${API_BASE}/rerouting/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ notes }),
  });
  if (!response.ok) throw new Error('Failed to approve reroute');
  return response.json();
};

export const rejectReroute = async (id, reason, headers = {}) => {
  const response = await fetch(`${API_BASE}/rerouting/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error('Failed to reject reroute');
  return response.json();
};

// ── Check-in & Operator Endpoints ──

export const fetchPendingCheckins = async (nodeId, headers = {}) => {
  const response = await fetch(`${API_BASE}/checkins/pending/${nodeId}`, { headers });
  if (!response.ok) throw new Error('Failed to fetch pending shipments');
  return response.json();
};

export const fetchNodeCheckins = async (nodeId, headers = {}) => {
  const response = await fetch(`${API_BASE}/checkins/node/${nodeId}`, { headers });
  if (!response.ok) throw new Error('Failed to fetch today\'s checkins');
  return response.json();
};

export const createCheckin = async (data, headers = {}) => {
  const response = await fetch(`${API_BASE}/checkins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create checkin');
  return response.json();
};

export const searchShipments = async (query, headers = {}) => {
  const response = await fetch(`${API_BASE}/shipments?q=${query}`, { headers });
  if (!response.ok) throw new Error('Failed to search shipments');
  return response.json();
};

// ── Platform Admin Endpoints ──
export const fetchCompanies = async (headers = {}) => {
  const r = await fetch(`${API_BASE}/companies`, { headers });
  if (!r.ok) throw new Error('Failed to fetch companies');
  return r.json();
};

export const fetchCompanyDetails = async (companyId, headers = {}) => {
  const r = await fetch(`${API_BASE}/companies/${companyId}/full-data`, { headers });
  if (!r.ok) throw new Error('Failed to fetch company details');
  return r.json();
};

export const deleteCompany = async (companyId, headers = {}) => {
  const r = await fetch(`${API_BASE}/companies/${companyId}`, { method: 'DELETE', headers });
  if (!r.ok) throw new Error('Failed to delete company');
  return r.json();
};

export const createCompany = async (data, headers = {}) => {
  const response = await fetch(`${API_BASE}/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create company');
  return response.json();
};

export const updateCompany = async (id, data, headers = {}) => {
  const response = await fetch(`${API_BASE}/companies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update company');
  return response.json();
};

export const fetchCompanyUsers = async (companyId, headers = {}) => {
  const response = await fetch(`${API_BASE}/companies/${companyId}/users`, { headers });
  if (!response.ok) throw new Error('Failed to fetch company users');
  return response.json();
};

export const createCompanyUser = async (companyId, data, headers = {}) => {
  const response = await fetch(`${API_BASE}/companies/${companyId}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create company user');
  return response.json();
};

export const fetchSystemHealth = async (headers = {}) => {
  const response = await fetch(`${API_BASE}/health`, { headers });
  if (!response.ok) throw new Error('Failed to fetch system health');
  return response.json();
};

// ── Customer Endpoints ──

export const fetchCustomerShipments = async (status, headers = {}) => {
  const url = status
    ? `${API_BASE}/customer/shipments?status=${status}`
    : `${API_BASE}/customer/shipments`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error('Failed to fetch customer shipments');
  return response.json();
};

export const fetchCustomerShipmentDetail = async (id, headers = {}) => {
  const response = await fetch(`${API_BASE}/customer/shipments/${id}`, { headers });
  if (!response.ok) throw new Error('Failed to fetch shipment detail');
  return response.json();
};
