import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function Analytics() {
  const { networkHealth, cascadeDebt } = useNetwork();
  const { isMobile, isTablet } = useBreakpoint();

  const COLORS = ['#00E5A0', '#3B9EFF', '#A855F7', '#FFB020', '#FF4D4D'];

  const disruptionByType = [
    { name: 'Weather', value: 45 },
    { name: 'Congestion', value: 30 },
    { name: 'Mechanical', value: 15 },
    { name: 'Other', value: 10 }
  ];

  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem', maxWidth: '1600px', margin: '0 auto', background: 'var(--bg-main)', minHeight: '100vh' }}>
      <header style={{ 
        marginBottom: isMobile ? '1.5rem' : '3rem', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: isMobile ? 'flex-start' : 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'flex-end',
        gap: isMobile ? '1rem' : '0'
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text-main)', marginBottom: '0.5rem' }}>INTELLIGENCE</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Advanced predictive analytics.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', width: isMobile ? '100%' : 'auto' }}>
          <div className="badge blue" style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.7rem', flex: 1, textAlign: 'center' }}>EXPORT</div>
          <div className="badge amber" style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.7rem', flex: 1, textAlign: 'center' }}>HEALTH: OPTIMAL</div>
        </div>
      </header>

      {/* Row 1: KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'), 
        gap: isMobile ? '1rem' : '1.5rem', 
        marginBottom: isMobile ? '1.5rem' : '2.5rem' 
      }}>
        {[
          { label: 'Network Health', value: networkHealth, unit: '%', trend: '+2.4%', color: 'var(--status-live)' },
          { label: 'Utilization', value: '74.2', unit: '%', trend: '-1.2%', color: 'var(--accent-primary)' },
          { label: 'Risk', value: '0.14', unit: '', trend: 'STABLE', color: 'var(--status-warning)' },
          { label: 'Reroutes', value: '12', unit: '', trend: '+4', color: 'var(--status-critical)' }
        ].map((stat, i) => (
          <div key={i} className="glass-panel" style={{ padding: isMobile ? '1.25rem' : '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat.label}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: stat.trend.includes('+') ? 'var(--status-live)' : stat.trend.includes('-') ? 'var(--status-critical)' : 'var(--text-muted)' }}>{stat.trend}</span>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{ fontSize: isMobile ? '1.75rem' : '2.25rem', fontWeight: 800, color: stat.color }}>{stat.value}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>{stat.unit}</span>
            </div>
            <div style={{ marginTop: '1.25rem', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: stat.unit === '%' ? `${stat.value}%` : '60%', height: '100%', background: stat.color }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Major Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '2fr 1fr', gap: isMobile ? '1rem' : '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
           <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <div style={{ width: '4px', height: '16px', background: 'var(--accent-primary)', borderRadius: '2px' }}></div>
             System Performance
           </h3>
           <div style={{ height: isMobile ? '250px' : '350px' }}>
              <ResponsiveContainer>
                 <AreaChart data={[
                   {t: '08:00', v: 82, l: 65},
                   {t: '10:00', v: 88, l: 68},
                   {t: '12:00', v: 85, l: 72},
                   {t: '14:00', v: 92, l: 75},
                   {t: '16:00', v: 89, l: 70},
                   {t: '18:00', v: 95, l: 78}
                 ]}>
                    <defs>
                      <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 10}} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '10px' }}
                    />
                    <Area type="monotone" dataKey="v" name="Perf" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorHealth)" />
                    <Area type="monotone" dataKey="l" name="Load" stroke="var(--accent-secondary)" strokeWidth={2} fillOpacity={0.1} fill="var(--accent-secondary)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
        
        <div className="glass-panel" style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
           <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Risk Allocation</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cascadeDebt.slice(0, 4).map(node => (
                <div key={node.id}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{node.id}</span>
                      <span style={{ fontWeight: 700, color: node.score > 60 ? 'var(--status-critical)' : 'var(--status-warning)' }}>{node.score}</span>
                   </div>
                   <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${node.score}%`, height: '100%', background: node.score > 60 ? 'var(--status-critical)' : 'var(--accent-primary)' }}></div>
                   </div>
                </div>
              ))}
           </div>
           <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--glass-border)' }}>
             <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
               High-risk detected. System prioritizing secondary routes.
             </p>
           </div>
        </div>
      </div>

      {/* Row 3: Secondary Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '1fr 1.5fr', gap: isMobile ? '1rem' : '1.5rem' }}>
         <div className="glass-panel" style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Disturbance Metrics</h3>
            <div style={{ height: isMobile ? '200px' : '280px' }}>
               <ResponsiveContainer>
                  <PieChart>
                     <Pie data={[
                       { name: 'Atmospheric', value: 45 },
                       { name: 'Logistics', value: 30 },
                       { name: 'Mechanical', value: 15 },
                       { name: 'Regulatory', value: 10 }
                     ]} innerRadius={isMobile ? 50 : 80} outerRadius={isMobile ? 70 : 110} paddingAngle={8} dataKey="value">
                        {disruptionByType.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>
         
         <div className="glass-panel" style={{ padding: isMobile ? '1.25rem' : '2rem', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Corridor Efficiency</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', minWidth: isMobile ? '500px' : 'auto' }}>
                 <thead>
                    <tr>
                       <th>PATHWAY</th>
                       <th>THROUGHPUT</th>
                       <th>LATENCY</th>
                       <th>RISK</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr>
                       <td style={{ fontWeight: 600 }}>Asia → Europe</td>
                       <td>8.4k tons</td>
                       <td style={{ color: 'var(--status-live)' }}>-2.1h</td>
                       <td>LOW</td>
                    </tr>
                    <tr>
                       <td style={{ fontWeight: 600 }}>NA East → EU</td>
                       <td>5.2k tons</td>
                       <td style={{ color: 'var(--status-warning)' }}>+1.4h</td>
                       <td>MODERATE</td>
                    </tr>
                    <tr>
                       <td style={{ fontWeight: 600 }}>Pacific Corridor</td>
                       <td>12.8k tons</td>
                       <td style={{ color: 'var(--status-live)' }}>STABLE</td>
                       <td>LOW</td>
                    </tr>
                 </tbody>
              </table>
            </div>
         </div>
      </div>
    </div>
  );
}
