/**
 * config.js
 * Centralized runtime configuration for the frontend.
 * Provides environment-driven URLs for HTTP and WebSocket communication.
 */

const getBackendUrl = () => {
  // Use environment variable if provided (Vite uses import.meta.env)
  const envUrl = import.meta.env?.VITE_API_URL;
  if (envUrl) return envUrl;

  // Sensible fallback for local development or same-origin deployment
  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }

  const { protocol, hostname } = window.location;
  const port = '8000'; // Default backend port
  
  // If we are running on localhost/127.0.0.1, assume backend is on port 8000
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:${port}`;
  }

  // Same-origin fallback (e.g. if served by Nginx on the same domain)
  return `${protocol}//${hostname}`;
};

const BACKEND_URL = getBackendUrl();

export const API_BASE = `${BACKEND_URL}/api`;

export const WS_BASE = import.meta.env?.VITE_WS_URL || BACKEND_URL.replace(/^http/, 'ws');

export default {
  API_BASE,
  WS_BASE,
  BACKEND_URL
};
