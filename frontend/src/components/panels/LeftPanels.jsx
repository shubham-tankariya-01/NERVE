import React from 'react';
import { useNetwork } from '../../context/NetworkContext';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function RiskyNodesPanel({ onSelectNode }) {
  const { cascadeDebt } = useNetwork();
  
  return (
    <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', minHeight: '300px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.1em', margin: 0, textTransform: 'uppercase', color: 'var(--status-critical)', fontWeight: 800 }}>Risky Network Nodes</h2>
        <Link to="/nodes" style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          VIEW NODES <ChevronRight size={12} />
        </Link>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto' }}>
        {cascadeDebt.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Awaiting simulation data...</div>
        ) : (
          cascadeDebt.slice(0, 10).map((item, idx) => {
            const key = item.node_id || `debt-${idx}`;
            const score = item.cascade_debt || 0;
            const color = score > 60 ? 'var(--status-critical)' : score > 40 ? 'var(--status-warning)' : 'var(--accent-primary)';
            return (
              <div 
                key={key} 
                onClick={() => onSelectNode && onSelectNode(item)}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '20px 1fr 45px', 
                  gap: '0.75rem', 
                  alignItems: 'center', 
                  fontSize: '0.8rem', 
                  cursor: 'pointer',
                  padding: '4px 0'
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{idx + 1}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)', fontWeight: 500 }}>{item.node_name}</span>
                  <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '1.5px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, score)}%`, height: '100%', background: color, boxShadow: `0 0 8px ${color}44` }}></div>
                  </div>
                </div>
                <span style={{ textAlign: 'right', fontWeight: 700, color, fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>{score.toFixed(1)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function RiskHorizonPanel({ selectedNode }) {
  const { riskHorizon, cascadeDebt, alerts } = useNetwork();
  
  // Default to highest risk node if none selected
  const targetNode = selectedNode || (cascadeDebt.length > 0 ? cascadeDebt[0] : null);
  
  // Calculate node-specific risk if a node is selected
  const displayData = React.useMemo(() => {
    if (!selectedNode || !alerts) return riskHorizon || [];
    
    // Filter alerts for this node
    const nodeAlerts = alerts.filter(a => a.node_id === selectedNode.node_id || a.node_id === selectedNode.id);
    if (nodeAlerts.length === 0) return riskHorizon || [];

    // Simple frontend logic mirroring backend generate_risk_horizon
    let currentRisk = 5;
    nodeAlerts.forEach(a => {
      const sev = a.severity?.toUpperCase();
      if (sev === 'CRITICAL') currentRisk += 35;
      else if (sev === 'HIGH') currentRisk += 20;
      else if (sev === 'MEDIUM') currentRisk += 10;
      else currentRisk += 5;
    });
    currentRisk = Math.min(95, currentRisk);

    let p6, p24, p72;
    if (currentRisk > 50) {
      p6 = Math.min(98, currentRisk + 5);
      p24 = currentRisk * 0.6;
      p72 = Math.max(5, currentRisk * 0.2);
    } else if (currentRisk > 20) {
      p6 = currentRisk * 1.2;
      p24 = currentRisk * 1.5;
      p72 = Math.max(5, currentRisk * 0.5);
    } else {
      p6 = 7; p24 = 9; p72 = 5;
    }

    return [
      { time: 'Now', probability: Math.round(currentRisk) },
      { time: '+6h', probability: Math.round(p6) },
      { time: '+24h', probability: Math.round(p24) },
      { time: '+72h', probability: Math.round(p72) }
    ];
  }, [selectedNode, alerts, riskHorizon]);

  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', minHeight: '280px', flex: 1 }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.1em', margin: '0 0 0.25rem 0', textTransform: 'uppercase', color: 'var(--status-critical)', fontWeight: 800 }}>Risk Horizon Forecast</h2>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-critical)' }}></div>
          {targetNode ? (targetNode.node_name || targetNode.name) : 'Network Baseline'}
        </div>
      </div>
      
      <div style={{ height: '200px', width: '100%', position: 'relative', marginTop: '0.5rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 10}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 10}} domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '6px' }}
              itemStyle={{ fontSize: '11px', color: 'var(--status-critical)' }}
            />
            <Line 
              type="monotone" 
              dataKey="probability" 
              stroke="var(--status-critical)" 
              strokeWidth={3} 
              dot={{r: 3, fill: 'var(--status-critical)', strokeWidth: 0}} 
              activeDot={{r: 5, fill: '#fff', stroke: 'var(--status-critical)', strokeWidth: 2}} 
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 67, 111, 0.05)', borderRadius: '6px', border: '1px solid rgba(239, 67, 111, 0.1)' }}>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
          Probability of secondary disruption cascade based on current {selectedNode ? 'node' : 'network'} pressure.
        </p>
      </div>
    </div>
  );
}
