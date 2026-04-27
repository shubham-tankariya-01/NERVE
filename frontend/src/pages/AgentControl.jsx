import React, { useEffect, useRef } from 'react';
import { useAgent } from '../context/AgentContext';
import { Bot, Zap, Clock, Terminal } from 'lucide-react';

export default function AgentControl() {
  const { logs, status, unreadCount, clearUnread } = useAgent();
  const logEndRef = useRef(null);

  useEffect(() => {
    clearUnread();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (level) => {
    switch (level) {
      case 'INFO': return '#22d3ee'; // cyan
      case 'REROUTE': return 'var(--brand)';
      case 'BLOCKED': return 'var(--danger)';
      case 'ALERT': return 'var(--danger)';
      case 'MONITOR': return '#94a3b8'; // grey
      default: return 'var(--text-primary)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--bg-elevated)', 
        padding: '1.25rem 2rem', 
        borderLeft: '4px solid var(--brand)',
        borderRadius: '0 8px 8px 0',
        margin: '1.5rem 2rem 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>AGENT CONTROL</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--brand)' }}>
                 <span style={{ width: '8px', height: '8px', background: 'var(--brand)', borderRadius: '50%' }}></span>
                 STATUS: {status}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{unreadCount} new events</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           <button className="badge" style={{ background: 'var(--bg-elevated)', padding: '0.5rem 1.5rem' }}>PAUSE</button>
           <button className="badge" style={{ background: 'var(--bg-elevated)', padding: '0.5rem 1.5rem' }}>CLEAR LOGS</button>
           <button className="badge blue" style={{ padding: '0.5rem 1.5rem' }}>MANUAL OVERRIDE</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', padding: '1.5rem 2rem' }}>
        {[
          { icon: <Bot color="var(--brand)" />, label: 'SYSTEM', val: 'Nerve Agent v2.1', sub: 'Uptime: 99.2%' },
          { icon: <Zap color="var(--info)" />, label: 'TODAY', val: '142 decisions', sub: '23 reroutes applied' },
          { icon: <Clock color="var(--warning)" />, label: 'LAST ACTION', val: '18:46:17', sub: 'BLOCKED S015' }
        ].map((c, i) => (
          <div key={i} className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
             <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.icon}</div>
             <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{c.label}</div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{c.val}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.sub}</div>
             </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, padding: '0 2rem 2rem 2rem', display: 'flex', gap: '1.5rem', overflow: 'hidden' }}>
        {/* Terminal Log */}
        <div style={{ flex: 1, background: '#000', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
           <div style={{ background: '#111', padding: '0.5rem 1rem', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.75rem' }}>
              <Terminal size={14} />
              AGENT_DECISION_LOG.EXE
           </div>
           <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', fontFamily: 'JetBrains Mono', fontSize: '0.85rem', lineHeight: '1.6' }}>
              {logs.map((log, i) => (
                <div key={i} style={{ marginBottom: '0.25rem' }}>
                  <span style={{ color: '#444', marginRight: '0.75rem' }}>[{log.ts}]</span>
                  <span style={{ color: getLogColor(log.level), marginRight: '0.75rem' }}>&lt;{log.tag}&gt;</span>
                  <span style={{ color: '#ccc' }}>{log.msg}</span>
                </div>
              ))}
              <div ref={logEndRef}></div>
           </div>
        </div>

        {/* Decision History Sidebar */}
        <div style={{ width: '350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div className="card" style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', textTransform: 'uppercase' }}>Recent Decisions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 {logs.filter(l => l.level === 'REROUTE' || l.level === 'BLOCKED').slice(-10).reverse().map((l, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ color: getLogColor(l.level), fontWeight: 700 }}>{l.level}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{l.ts}</span>
                       </div>
                       <div style={{ color: 'var(--text-primary)' }}>{l.msg}</div>
                    </div>
                 ))}
              </div>
           </div>
           
           <div className="card" style={{ padding: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '1rem', textTransform: 'uppercase' }}>Alert Rules</h3>
              <ul style={{ fontSize: '0.8rem', paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                 <li>Weather severity &gt; MODERATE → trigger reroute</li>
                 <li>Cascade debt &gt; 60 → manual review</li>
                 <li>Delay impact &gt; +6h → notify ops team</li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
