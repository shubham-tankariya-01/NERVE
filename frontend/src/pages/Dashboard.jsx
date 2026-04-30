import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { useAppWebSocket } from '../context/WebSocketContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { ClipboardList, CheckSquare, Package, DollarSign, Truck, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

export default function Dashboard() {
  const { nodes, shipments, networkHealth, alerts, agentLogs, deliveryMetrics } = useNetwork();
  const { isMobile, isTablet } = useBreakpoint();
  
  // Derived KPI values based on real data
  const totalWeight = shipments.reduce((acc, s) => acc + (s.weight_kg || 0), 0);
  const formattedWeight = (totalWeight / 1000).toFixed(1) + "t";
  const activeNodes = nodes.length;
  const totalShipments = shipments.length;
  const activeDisruptions = alerts.length;
  const healthScore = networkHealth;

  // Map backend data to charts
  const backendMetrics = deliveryMetrics || {};
  const deliveryStatus = [
    { name: 'In Transit', value: backendMetrics.in_transit || 0 },
    { name: 'At Station', value: (shipments.filter(s => s.status === 'arrived_at_node').length) || 0 },
    { name: 'Delayed', value: backendMetrics.delayed || 0 },
    { name: 'Blocked', value: backendMetrics.blocked || 0 },
    { name: 'Delivered', value: backendMetrics.delivered || 0 },
  ].filter(s => s.value > 0);

  if (deliveryStatus.length === 0) {
    deliveryStatus.push({ name: 'Operational Baseline', value: 1 });
  }

  const COLORS = ['#00b4d8', '#ff006e', '#06d6a0', '#ff9800', '#ef476f'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', padding: '0.75rem', borderRadius: '8px', zIndex: 1000, boxShadow: 'var(--shadow-md)' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', fontSize: '0.85rem' }}>{label || payload[0].name}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ margin: 0, color: entry.color || entry.fill, fontSize: '0.8rem' }}>
              {entry.value} {entry.name}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const kpiGridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr 1fr' : (isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)'),
    gap: isMobile ? '1rem' : '1.5rem',
    marginBottom: '1.5rem'
  };

  return (
    <div className="dashboard-grid animate-slide-up" style={{ padding: isMobile ? '1rem' : '2rem', maxWidth: '1800px', margin: '0 auto' }}>
      {/* Top KPIs */}
      <div className="col-span-12" style={kpiGridStyle}>
        {[
          { title: 'Global Throughput', value: formattedWeight, icon: <Package size={isMobile ? 20 : 24} />, color: 'var(--accent-primary)', grad: 'var(--grad-blue)' },
          { title: 'Active Network', value: activeNodes, icon: <CheckSquare size={isMobile ? 20 : 24} />, color: 'var(--accent-purple)', grad: 'var(--grad-purple)' },
          { title: 'Live Operations', value: totalShipments, icon: <ClipboardList size={isMobile ? 20 : 24} />, color: 'var(--accent-pink)', grad: 'var(--grad-pink)' },
          { title: 'Disruption Protocols', value: activeDisruptions, icon: <AlertTriangle size={isMobile ? 20 : 24} />, color: 'var(--status-critical)', grad: 'var(--grad-orange)' },
          { title: 'Network Efficiency', value: `${healthScore}%`, icon: <DollarSign size={isMobile ? 20 : 24} />, color: 'var(--status-live)', grad: 'var(--grad-teal)' }
        ].map((kpi, i) => (
          <div key={i} className="kpi-card" style={{ background: kpi.grad, height: isMobile ? '100px' : '120px', borderRadius: '16px' }}>
            <div className="kpi-info">
              <span className="kpi-title" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>{kpi.title}</span>
              <span className="kpi-value" style={{ fontSize: isMobile ? '1.5rem' : '2.25rem', fontWeight: 800 }}>{kpi.value}</span>
            </div>
            <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', width: isMobile ? '32px' : '48px', height: isMobile ? '32px' : '48px' }}>{kpi.icon}</div>
          </div>
        ))}
      </div>

      {/* Row 2 */}
      <div className="col-span-8 glass-panel" style={{ padding: isMobile ? '1.25rem' : '2rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 className="chart-title" style={{ textAlign: 'left', margin: 0, fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 700 }}>Active Disruption Protocol</h3>
          <button 
            onClick={() => window.location.href = '/app/disruptions'}
            style={{ padding: '0.4rem 0.8rem', background: 'rgba(255, 63, 108, 0.1)', color: '#ff3f6c', border: '1px solid rgba(255, 63, 108, 0.2)', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
          >
            VIEW ALL
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {alerts.length === 0 ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '150px', color: 'var(--text-muted)' }}>
               <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(6, 214, 160, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-live)', marginBottom: '1rem' }}>✓</div>
               <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>System Integrity Optimal</span>
             </div>
          ) : (
            alerts.map(a => (
              <div key={a.id || a.node_id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', borderLeft: `4px solid var(--${a.severity === 'CRITICAL' ? 'danger' : 'warning'})` }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{a.node_name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{a.reasons?.join(' • ')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: a.severity === 'CRITICAL' ? 'var(--status-critical)' : 'var(--status-warning)', fontWeight: 800, fontSize: '1rem' }}>+{a.estimated_delay_hrs}h</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>latency</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="col-span-4 glass-panel" style={{ padding: isMobile ? '1.25rem' : '2rem', display: 'flex', flexDirection: 'column' }}>
        <h3 className="chart-title" style={{ textAlign: 'left', fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Delivery Integrity</h3>
        <div style={{ width: '100%', height: isMobile ? '180px' : '240px', position: 'relative' }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={deliveryStatus}
                cx="50%"
                cy="50%"
                innerRadius={isMobile ? 55 : 70}
                outerRadius={isMobile ? 75 : 95}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {deliveryStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{totalShipments.toString().padStart(2, '0')}</div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: '0.25rem', letterSpacing: '0.05em' }}>Units</div>
          </div>
        </div>
        
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: isMobile ? '0.5rem' : '1rem', padding: '1rem', background: 'rgba(10, 17, 40, 0.4)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
            <span>STATUS</span>
            <span>UNITS</span>
          </div>
          {deliveryStatus.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[i % COLORS.length], boxShadow: `0 0 10px ${COLORS[i % COLORS.length]}44` }}></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>{s.name}</span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{s.value.toString().padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3 - Agent Logs */}
      <div className="col-span-12 glass-panel" style={{ padding: isMobile ? '1.25rem' : '2rem', height: isMobile ? 'auto' : '350px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3 className="chart-title" style={{ textAlign: 'left', margin: 0, fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 700 }}>Agent Log</h3>
            {!isMobile && <div className="badge blue" style={{ fontSize: '0.7rem' }}>VERIFIED BY LLM</div>}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>{agentLogs.length} EVENTS</div>
        </div>
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', maxHeight: isMobile ? '200px' : 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: isMobile ? '1rem' : '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {agentLogs.slice().reverse().map((log, i) => (
            <div key={i} style={{ marginBottom: '0.75rem', display: 'flex', gap: isMobile ? '0.75rem' : '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.75rem' }}>
              <span style={{ color: '#475569', fontSize: '0.7rem' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span style={{ color: '#00B4D8', fontWeight: 700, minWidth: '80px', fontSize: '0.7rem' }}>[{log.agent?.toUpperCase()}]</span>
              <span style={{ color: '#cbd5e1', flex: 1 }}>{log.action}</span>
            </div>
          ))}
          {agentLogs.length === 0 && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontStyle: 'italic', gap: '1rem', minHeight: '100px' }}>
              Awaiting neural signals...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
