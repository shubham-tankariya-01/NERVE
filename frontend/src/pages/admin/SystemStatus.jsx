import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchSystemHealth } from '../../services/api';
import { Activity, Database, Server, Users, AlertTriangle, Route, Clock, RefreshCw } from 'lucide-react';

const StatusCard = ({ title, value, status, icon: Icon, color }) => (
  <div style={{
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ 
        width: '40px', height: '40px', borderRadius: '10px', 
        backgroundColor: `${color}11`, color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={24} />
      </div>
      <div style={{ 
        fontSize: '10px', fontWeight: '900', color: status === 'healthy' ? 'var(--status-success)' : 'var(--status-danger)',
        display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase'
      }}>
        <div style={{ 
          width: '6px', height: '6px', borderRadius: '50%', 
          backgroundColor: status === 'healthy' ? 'var(--status-success)' : 'var(--status-danger)',
          boxShadow: `0 0 8px ${status === 'healthy' ? 'var(--status-success)' : 'var(--status-danger)'}`
        }} />
        {status}
      </div>
    </div>
    <div>
      <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: '900', fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
    <div style={{ 
      position: 'absolute', bottom: '-10px', right: '-10px', 
      opacity: 0.03, transform: 'rotate(-15deg)' 
    }}>
      <Icon size={80} />
    </div>
  </div>
);

export default function SystemStatus() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const { getAuthHeaders } = useAuth();

  const loadData = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const data = await fetchSystemHealth(headers);
      setHealth(data);
      setFetchError(false);
    } catch (err) {
      console.error('Health fetch failed:', err);
      setFetchError(true);
      // Don't clear existing health data — keep showing last successful snapshot
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, [loadData]);

  const styles = {
    container: {
      padding: '40px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '40px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '900',
      letterSpacing: '-1px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '24px',
      marginBottom: '40px',
    },
    section: {
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '32px',
    }
  };

  if (loading && !health) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading system health...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>SYSTEM DIAGNOSTICS</h1>
        <button 
          onClick={loadData}
          style={{ background: 'none', border: 'none', color: 'var(--status-danger)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
        >
          <RefreshCw size={18} /> REFRESH LIVE
        </button>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div style={{
          backgroundColor: 'rgba(255,77,77,0.1)',
          border: '1px solid rgba(255,77,77,0.4)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: '700',
          color: 'var(--status-critical, #FF4D4D)',
        }}>
          <AlertTriangle size={16} />
          Unable to reach /api/health — backend may be starting up.
          {health && <span style={{ fontWeight: '400', color: 'rgba(255,77,77,0.7)', marginLeft: '8px' }}>Showing last known data.</span>}
        </div>
      )}
      <div style={styles.grid}>
        <StatusCard 
          title="MongoDB Cluster" 
          value={health?.database?.status === 'connected' ? 'ACTIVE' : 'ERROR'} 
          status={health?.database?.status === 'connected' ? 'healthy' : 'critical'}
          icon={Database}
          color="#00ED64"
        />
        <StatusCard 
          title="Agent Orchestrator" 
          value={health?.orchestrator?.status === 'running' ? 'OPERATIONAL' : 'STOPPED'} 
          status={health?.orchestrator?.status === 'running' ? 'healthy' : 'critical'}
          icon={Server}
          color="var(--accent-primary)"
        />
        <StatusCard 
          title="Global WS Clients" 
          value={health?.websocket?.client_count || '0'} 
          status="healthy"
          icon={Users}
          color="var(--status-warning)"
        />
        <StatusCard 
          title="Platform Uptime" 
          value={health?.uptime || '99.9%'} 
          status="healthy"
          icon={Activity}
          color="var(--status-success)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={styles.section}>
          <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-secondary)', marginBottom: '24px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="var(--status-danger)" />
            GLOBAL DISRUPTIONS
          </h3>
          <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--status-danger)' }}>
            {health?.metrics?.active_disruptions || '0'}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>Across all onboarded companies</p>
        </div>

        <div style={styles.section}>
          <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-secondary)', marginBottom: '24px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Route size={16} color="var(--accent-primary)" />
            PENDING REROUTES
          </h3>
          <div style={{ fontSize: '48px', fontWeight: '900', color: '#fff' }}>
            {health?.metrics?.pending_approvals || '0'}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>Awaiting manager intervention</p>
        </div>
      </div>

      <div style={{ marginTop: '24px', backgroundColor: 'rgba(255, 77, 77, 0.05)', border: '1px solid rgba(255, 77, 77, 0.1)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--status-danger)' }}>
          <Clock size={14} />
          LAST FULL SCAN: {health?.orchestrator?.last_scan ? new Date(health.orchestrator.last_scan).toLocaleTimeString() : 'NEVER'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          NERVE CORE v1.4.2
        </div>
      </div>
    </div>
  );
}
