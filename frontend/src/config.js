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

  const { protocol, hostname, port: currentPort } = window.location;
  const backendPort = '8000'; // Default backend port
  
  // If we are on a local-ish hostname or IP, and no port is specified in the URL,
  // assume the backend is on port 8000.
  const isLocal = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.') ||
    !hostname.includes('.'); // Handles machine names like 'my-computer'

  if (isLocal) {
    // Force http for local backend unless specifically overridden, 
    // as uvicorn usually runs without SSL locally.
    const targetHost = hostname === 'localhost' ? '127.0.0.1' : hostname;
    return `http://${targetHost}:${backendPort}`;

  }


  // Same-origin fallback (e.g. if served by Nginx on the same domain in production)
  return `${protocol}//${hostname}${currentPort ? `:${currentPort}` : ''}`;

};

const BACKEND_URL = getBackendUrl();

export const API_BASE = `${BACKEND_URL}/api`;

export const WS_BASE = import.meta.env?.VITE_WS_URL || BACKEND_URL.replace(/^http/, 'ws');

export default {
  API_BASE,
  WS_BASE,
  BACKEND_URL
};
