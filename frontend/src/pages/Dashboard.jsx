import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { useAppWebSocket } from '../context/WebSocketContext';
import { ClipboardList, CheckSquare, Package, DollarSign, Truck, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

export default function Dashboard() {
  const { nodes, shipments, networkHealth, alerts } = useNetwork();
  const { data: wsData } = useAppWebSocket();
  
  // Derived KPI values based on real data
  const totalWeight = shipments.reduce((acc, s) => acc + (s.weight_kg || 0), 0);
  const formattedWeight = (totalWeight / 1000).toFixed(1) + "t";
  const activeNodes = nodes.length;
  const totalShipments = shipments.length;
  const activeDisruptions = alerts.length;
  const healthScore = networkHealth;

  // Map backend data to charts
  const backendMetrics = wsData?.delivery_metrics || {};
  const deliveryStatus = [
    { name: 'In Transit', value: backendMetrics.in_transit || 0 },
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

  return (
    <div className="dashboard-grid animate-slide-up" style={{ padding: '2rem', maxWidth: '1800px', margin: '0 auto' }}>
      {/* Top KPIs */}
      <div className="col-span-12" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {[
          { title: 'Global Throughput', value: formattedWeight, icon: <Package size={24} />, color: 'var(--accent-primary)', grad: 'var(--grad-blue)' },
          { title: 'Active Network', value: activeNodes, icon: <CheckSquare size={24} />, color: 'var(--accent-purple)', grad: 'var(--grad-purple)' },
          { title: 'Live Operations', value: totalShipments, icon: <ClipboardList size={24} />, color: 'var(--accent-pink)', grad: 'var(--grad-pink)' },
          { title: 'Disruption Protocols', value: activeDisruptions, icon: <AlertTriangle size={24} />, color: 'var(--status-critical)', grad: 'var(--grad-orange)' },
          { title: 'Network Efficiency', value: `${healthScore}%`, icon: <DollarSign size={24} />, color: 'var(--status-live)', grad: 'var(--grad-teal)' }
        ].map((kpi, i) => (
          <div key={i} className="kpi-card" style={{ background: kpi.grad, height: '120px', borderRadius: '16px' }}>
            <div className="kpi-info">
              <span className="kpi-title" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>{kpi.title}</span>
              <span className="kpi-value" style={{ fontSize: '2.25rem', fontWeight: 800 }}>{kpi.value}</span>
            </div>
            <div className="kpi-icon" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}>{kpi.icon}</div>
          </div>
        ))}
      </div>

      {/* Row 2 */}
      <div className="col-span-8 glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 className="chart-title" style={{ textAlign: 'left', margin: 0, fontSize: '1rem', fontWeight: 700 }}>Active Disruption Protocol</h3>
          <button 
            onClick={() => window.location.href = '/disruptions'}
            style={{ padding: '0.5rem 1rem', background: 'rgba(255, 63, 108, 0.1)', color: '#ff3f6c', border: '1px solid rgba(255, 63, 108, 0.2)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
          >
            VIEW ALL INCIDENTS
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {alerts.length === 0 ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: 'var(--text-muted)' }}>
               <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(6, 214, 160, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-live)', marginBottom: '1rem' }}>✓</div>
               <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>System Integrity Optimal</span>
             </div>
          ) : (
            alerts.map(a => (
              <div key={a.id || a.node_id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', borderLeft: `4px solid var(--${a.severity === 'CRITICAL' ? 'danger' : 'warning'})` }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{a.node_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{a.reasons?.join(' • ')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: a.severity === 'CRITICAL' ? 'var(--status-critical)' : 'var(--status-warning)', fontWeight: 800, fontSize: '1.1rem' }}>+{a.estimated_delay_hrs}h</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>est. latency</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="col-span-4 glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <h3 className="chart-title" style={{ textAlign: 'left', fontSize: '1rem', fontWeight: 700, marginBottom: '2rem' }}>Delivery Integrity</h3>
        <div style={{ width: '100%', height: '240px', position: 'relative' }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={deliveryStatus}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={95}
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
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{totalShipments.toString().padStart(2, '0')}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: '0.25rem', letterSpacing: '0.05em' }}>Active Units</div>
          </div>
        </div>
        
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', background: 'rgba(10, 17, 40, 0.4)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
            <span>STATUS</span>
            <span>UNITS</span>
          </div>
          {deliveryStatus.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: COLORS[i % COLORS.length], boxShadow: `0 0 10px ${COLORS[i % COLORS.length]}44` }}></div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 500 }}>{s.name}</span>
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{s.value.toString().padStart(2, '0')}</span>
            </div>
          ))}
          <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>TOTAL OPERATIONS</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
              {deliveryStatus.reduce((acc, curr) => acc + curr.value, 0).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Row 3 - Agent Logs */}
      <div className="col-span-12 glass-panel" style={{ padding: '2rem', height: '350px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3 className="chart-title" style={{ textAlign: 'left', margin: 0, fontSize: '1rem', fontWeight: 700 }}>Neural Agent Operations Log</h3>
            <div className="badge blue" style={{ fontSize: '0.7rem' }}>VERIFIED BY LLM</div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{wsData?.agent_logs?.length || 0} EVENTS DETECTED</div>
        </div>
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          {(wsData?.agent_logs || []).slice().reverse().map((log, i) => (
            <div key={i} style={{ marginBottom: '0.75rem', display: 'flex', gap: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.75rem', animation: 'slideIn 0.3s ease-out forwards' }}>
              <span style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '0.75rem' }}>{new Date().toLocaleTimeString()}</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700, width: '110px', fontSize: '0.75rem' }}>[{log.agent?.toUpperCase()}]</span>
              <span style={{ color: 'var(--text-main)', flex: 1 }}>{log.action}</span>
            </div>
          ))}
          {(!wsData?.agent_logs || wsData.agent_logs.length === 0) && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic', gap: '1rem' }}>
              <div className="pulse-ring-container" style={{ transform: 'scale(1.2)' }}>
                <div className="pulse-dot"></div>
                <div className="pulse-ring-outer"></div>
              </div>
              Awaiting neural signals...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
