import React, { useEffect, useRef } from 'react';
import { useAgent } from '../context/AgentContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Bot, Zap, Clock, Terminal } from 'lucide-react';

export default function AgentControl() {
  const { logs, status, unreadCount, clearUnread } = useAgent();
  const { isMobile, isTablet } = useBreakpoint();
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
    <div style={{ display: 'flex', flexDirection: 'column', height: (isMobile || isTablet) ? 'auto' : 'calc(100vh - 64px)', minHeight: '100vh' }}>
      <header style={{ 
        padding: isMobile ? '1rem' : '1.5rem 2rem', 
        borderBottom: '1px solid var(--border)', 
        background: 'var(--bg-surface)', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '1rem' : '0'
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Agent Control</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--brand)' }}>
               <span style={{ width: '8px', height: '8px', background: 'var(--brand)', borderRadius: '50%' }}></span>
               STATUS: {status}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>{unreadCount} EVENTS</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', width: isMobile ? '100%' : 'auto' }}>
           <button className="badge" style={{ background: 'var(--bg-elevated)', padding: '0.5rem 1rem', fontSize: '0.7rem', flex: 1, minHeight: '44px' }}>PAUSE</button>
           <button className="badge blue" style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', flex: 1, minHeight: '44px' }}>OVERRIDE</button>
        </div>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : (isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'), 
        gap: isMobile ? '0.75rem' : '1.5rem', 
        padding: isMobile ? '1rem' : '1.5rem 2rem' 
      }}>
        {[
          { icon: <Bot color="var(--brand)" size={18} />, label: 'SYSTEM', val: 'Agent v2.1', sub: '99.2%' },
          { icon: <Zap color="var(--info)" size={18} />, label: 'DECISIONS', val: '142 units', sub: '23 reroutes' },
          { icon: <Clock color="var(--warning)" size={18} />, label: 'LAST', val: '18:46:17', sub: 'BLOCKED' }
        ].map((c, i) => (
          <div key={i} className="card" style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
             <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.icon}</div>
             <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{c.label}</div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.val}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{c.sub}</div>
             </div>
          </div>
        ))}
      </div>

      <div style={{ 
        flex: 1, 
        padding: isMobile ? '0 1rem 1rem' : '0 2rem 2rem', 
        display: 'flex', 
        flexDirection: (isMobile || isTablet) ? 'column' : 'row',
        gap: isMobile ? '1rem' : '1.5rem', 
        overflow: (isMobile || isTablet) ? 'visible' : 'hidden' 
      }}>
        {/* Terminal Log */}
        <div style={{ 
          flex: 2, 
          background: '#000', 
          borderRadius: '8px', 
          border: '1px solid var(--border)', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          minHeight: isMobile ? '300px' : 'auto'
        }}>
           <div style={{ background: '#111', padding: '0.5rem 1rem', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.65rem' }}>
              <Terminal size={12} />
              AGENT_LOG.EXE
           </div>
           <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', lineHeight: '1.5' }}>
              {logs.map((log, i) => (
                <div key={i} style={{ marginBottom: '0.2rem' }}>
                   <span style={{ color: '#444', marginRight: '0.5rem' }}>[{log.ts}]</span>
                   <span style={{ color: getLogColor(log.level), marginRight: '0.5rem' }}>&lt;{log.tag}&gt;</span>
                   <span style={{ color: '#ccc' }}>{log.msg}</span>
                </div>
              ))}
              <div ref={logEndRef}></div>
           </div>
        </div>

        {/* Decision History Sidebar */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
          width: (isMobile || isTablet) ? '100%' : '350px' 
        }}>
           <div className="card" style={{ flex: 1, padding: '1rem', overflowY: 'auto', minHeight: isMobile ? '200px' : 'auto' }}>
              <h3 style={{ fontSize: '0.75rem', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Recent Decisions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 {logs.filter(l => l.level === 'REROUTE' || l.level === 'BLOCKED').slice(-8).reverse().map((l, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ color: getLogColor(l.level), fontWeight: 700 }}>{l.level}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{l.ts}</span>
                       </div>
                       <div style={{ color: 'var(--text-primary)' }}>{l.msg}</div>
                    </div>
                 ))}
              </div>
           </div>
           
           <div className="card" style={{ padding: '1rem' }}>
              <h3 style={{ fontSize: '0.75rem', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Rules</h3>
              <ul style={{ fontSize: '0.75rem', paddingLeft: '1rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                 <li>Weather &gt; MOD → REROUTE</li>
                 <li>Cascade &gt; 60 → REVIEW</li>
                 <li>Delay &gt; +6h → NOTIFY</li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
