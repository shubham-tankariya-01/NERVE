import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Zap, 
  GitBranch, 
  Users, 
  ArrowRight, 
  ArrowLeft,
  Lock, 
  Bot,
  X,
  ChevronRight,
  Monitor,
  Database,
  Terminal,
  Layers
} from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '550px',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(0,0,0,0.8)',
        animation: 'modalFadeIn 0.2s ease-out'
      }}>
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid var(--border)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'var(--bg-elevated)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '4px', height: '16px', background: 'var(--brand)', borderRadius: '2px' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', padding: '4px', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--danger)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '24px', overflowY: 'auto', color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.6 }} className="custom-scrollbar">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

import { useAuth } from '../context/AuthContext';

export default function UserManual() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [activeModal, setActiveModal] = useState(null);

  // Auto-redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role;
      if (role === 'node_operator') navigate('/operator');
      else if (role === 'platform_admin' || role === 'company_owner') navigate('/owner');
      else if (role === 'customer') navigate('/customer');
      else if (role === 'logistics_manager') navigate('/app');
    }
  }, [isAuthenticated, user, navigate]);

  const modules = [
    {
      id: 'access',
      title: 'Demo Access Keys',
      icon: <Lock size={20} />,
      color: 'var(--brand)',
      summary: 'Credentials for instant jury evaluation.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p>The Nerve platform is pre-loaded with high-fidelity logistics data. Use these accounts to explore immediately:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--brand)', marginBottom: '4px' }}>SOLARIS GLOBAL (Primary Demo)</div>
              <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                <span style={{ color: 'var(--text-secondary)' }}>User:</span> owner@solarisglobal.com<br/>
                <span style={{ color: 'var(--text-secondary)' }}>Pass:</span> solarisglobal-owner
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--info)', marginBottom: '4px' }}>TERRA NOVA TRANSIT</div>
              <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                <span style={{ color: 'var(--text-secondary)' }}>User:</span> owner@terranovatransit.com<br/>
                <span style={{ color: 'var(--text-secondary)' }}>Pass:</span> terranovatransit-owner
              </div>
            </div>
          </div>
          <div style={{ padding: '12px', background: 'var(--warning-dim)', border: '1px solid var(--warning)', borderRadius: '6px', fontSize: '12px', color: 'var(--warning)' }}>
            <strong>BYPASS MODE:</strong> Use Master OTP <strong>999999</strong> if prompted for email verification on these domains.
          </div>
        </div>
      )
    },
    {
      id: 'ai',
      title: 'AI Agent Workflow',
      icon: <Bot size={20} />,
      color: 'var(--purple)',
      summary: 'Autonomous coordination of logistics responses.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>Nerve orchestrates four specialized agents to protect your supply chain:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { n: 'Scout', d: 'Detects anomalies in weather, port traffic, and transit times.' },
              { n: 'Mapper', d: 'Calculates the disruption blast radius and identifies impacted shipments.' },
              { n: 'Optimizer', d: 'Computes alternative paths using graph theory and risk metrics.' },
              { n: 'Communicator', d: 'Drafts reroute proposals for human-in-the-loop approval.' }
            ].map(a => (
              <div key={a.n} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: '6px', borderLeft: '3px solid var(--purple)' }}>
                <div style={{ fontWeight: 800, fontSize: '12px' }}>{a.n} Agent</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{a.d}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: 'Core Operations',
      icon: <Zap size={20} />,
      color: 'var(--danger)',
      summary: 'Interactive tools for network management.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>Key areas to test during the demo:</p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '16px' }}>
            <li><strong>Disruption Simulator</strong>: Manually inject failures (Port closure, Weather) and observe the AI response.</li>
            <li><strong>Rerouting Center</strong>: Review AI-suggested paths and approve/reject them to secure shipments.</li>
            <li><strong>Command Center</strong>: Real-time geospatial tracking of all global assets and nodes.</li>
            <li><strong>Node Management</strong>: Scale your network by adding custom nodes and operators.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'multi-tenant',
      title: 'Tenant Onboarding',
      icon: <Users size={20} />,
      color: 'var(--warning)',
      summary: 'Scaling through company registration.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>Nerve is a true multi-tenant platform. To create your own private network:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--brand-dim)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>1</div>
              <div style={{ fontSize: '13px' }}>Select an Enterprise or Pro subscription plan.</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--brand-dim)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>2</div>
              <div style={{ fontSize: '13px' }}>Register your company and executive owner account.</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--brand-dim)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900 }}>3</div>
              <div style={{ fontSize: '13px' }}>Verify your identity via Email OTP (SendGrid powered).</div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: 'var(--bg-canvas)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflow: 'hidden',
      color: 'var(--text-primary)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1400px',
        height: '100%',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        overflow: 'hidden'
      }}>
        
        {/* Navigation Bar */}
        <div style={{ 
          padding: '16px 32px', 
          borderBottom: '1px solid var(--border)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'var(--bg-elevated)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', background: 'var(--brand)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: '14px' }}>N</div>
            <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '2px' }}>USER MANUAL</span>
          </div>
          <button 
            onClick={() => navigate(-1)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '11px', 
              fontWeight: 800, 
              color: 'var(--text-secondary)',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <ArrowLeft size={14} /> GO BACK
          </button>
        </div>

        {/* Content Box */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }} className="custom-scrollbar">
          
          <div style={{ maxWidth: '1000px', width: '100%' }}>
            <header style={{ marginBottom: '60px' }}>
              <h1 style={{ fontSize: '48px', fontWeight: 950, letterSpacing: '-2px', marginBottom: '16px', color: 'var(--text-primary)' }}>
                PLATFORM <span style={{ color: 'var(--brand)' }}>GUIDE</span>
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: 1.6 }}>
                Everything you need to know about navigating the Nerve ecosystem, operating AI agents, and managing global logistics.
              </p>
            </header>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '24px', 
              marginBottom: '60px' 
            }}>
              {modules.map(module => (
                <div 
                  key={module.id}
                  onClick={() => setActiveModal(module)}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '20px'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = module.color;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = `0 10px 30px -10px ${module.color}33`;
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '10px', 
                    background: 'var(--bg-canvas)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: module.color,
                    border: `1px solid ${module.color}33`,
                    flexShrink: 0
                  }}>
                    {module.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>{module.title}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>{module.summary}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 900, color: module.color, textTransform: 'uppercase' }}>
                      Exploration Manual <ChevronRight size={12} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Architecture Section */}
            <div style={{ padding: '32px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <Layers size={24} style={{ color: 'var(--brand)' }} />
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>System Architecture</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {[
                  { icon: <Monitor size={18} />, label: 'Frontend', d: 'React, Vite, WebSocket Client' },
                  { icon: <Database size={18} />, label: 'Backend', d: 'FastAPI, MongoDB, Async IO' },
                  { icon: <Terminal size={18} />, label: 'AI Layer', d: 'LangGraph, Groq Llama 3.3' }
                ].map((t, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      {t.icon} {t.label}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{t.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div style={{ 
          padding: '24px 40px', 
          background: 'var(--bg-elevated)', 
          borderTop: '1px solid var(--border-strong)',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button 
            onClick={() => navigate('/login')}
            style={{
              padding: '12px 32px',
              background: 'var(--brand)',
              color: '#000',
              borderRadius: '8px',
              fontWeight: 900,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'transform 0.2s',
              boxShadow: '0 4px 20px rgba(0, 229, 160, 0.2)'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            PROCEED TO COMMAND CENTER <ArrowRight size={16} />
          </button>
        </div>

        {activeModal && (
          <Modal 
            isOpen={true} 
            onClose={() => setActiveModal(null)} 
            title={activeModal.title}
          >
            {activeModal.content}
          </Modal>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 10px; }
      `}</style>
    </div>
  );
}
