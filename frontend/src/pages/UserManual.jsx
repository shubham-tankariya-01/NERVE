import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Shield, Zap, GitBranch, Users, ArrowRight, ArrowLeft, Lock, Bot, X,
  ChevronRight, Monitor, Database, Terminal, Layers, Info, BadgeCheck,
  Cpu, Globe, BookOpen, ExternalLink, Command
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 3000, padding: '1rem'
    }}>
      <div className="animate-scale-up" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--glass-border)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ 
          padding: '1rem 1.25rem', 
          borderBottom: '1px solid var(--border)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'rgba(255,255,255,0.01)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '3px', height: '14px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
            <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '1.25rem', overflowY: 'auto', color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: 1.6 }} className="custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function UserManual() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  const [activeModal, setActiveModal] = useState(null);
  
  const skipRedirect = searchParams.get('manual') === 'true';

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && user && !skipRedirect) {
      const role = user.role;
      if (role === 'node_operator') navigate('/operator');
      else if (role === 'platform_admin' || role === 'company_owner') navigate('/owner');
      else if (role === 'customer') navigate('/customer');
      else if (role === 'logistics_manager') navigate('/app');
    }
  }, [isAuthenticated, user, navigate, skipRedirect]);

  const modules = [
    {
      id: 'access',
      title: 'Operational Access',
      icon: <Lock size={18} />,
      color: 'var(--accent-primary)',
      summary: 'Verified credentials for evaluation environments.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, opacity: 0.8 }}>Access pre-configured logistics networks using the following secure keys:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { company: 'SOLARIS GLOBAL', user: 'owner@solarisglobal.com', pass: 'solarisglobal-owner', color: 'var(--accent-primary)' },
              { company: 'TERRA NOVA TRANSIT', user: 'owner@terranovatransit.com', pass: 'terranovatransit-owner', color: 'var(--accent-purple)' }
            ].map((k, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', border: `1px solid var(--border)` }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: k.color, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>{k.company}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID:</span>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{k.user}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>KEY:</span>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{k.pass}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(255, 152, 0, 0.05)', border: '1px solid rgba(255, 152, 0, 0.15)', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Zap size={16} style={{ color: 'var(--status-warning)', flexShrink: 0 }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--status-warning)', fontWeight: 600 }}>
              Master OTP: <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#fff' }}>999999</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ai',
      title: 'Neural Architecture',
      icon: <Bot size={18} />,
      color: 'var(--accent-purple)',
      summary: 'Autonomous coordination & agentic logic flows.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, opacity: 0.8 }}>Multi-agent orchestration layer for supply chain healing:</p>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {[
              { n: 'Scout', d: 'Anomalous signal detection', icon: <Globe size={12} /> },
              { n: 'Mapper', d: 'Impact horizon & radius calculation', icon: <Layers size={12} /> },
              { n: 'Optimizer', d: 'Dynamic graph-recalculation', icon: <Cpu size={12} /> },
              { n: 'Communicator', d: 'Human-in-the-loop proposal drafting', icon: <Terminal size={12} /> }
            ].map(a => (
              <div key={a.n} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                 <div style={{ color: 'var(--accent-purple)', opacity: 0.6 }}>{a.icon}</div>
                 <div>
                    <div style={{ fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase' }}>{a.n}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{a.d}</div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'operations',
      title: 'Core Operations',
      icon: <Zap size={18} />,
      color: 'var(--status-critical)',
      summary: 'Interacting with real-time disruption events.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ margin: 0, opacity: 0.8 }}>Test platform resilience via interactive modules:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { t: 'Simulator', d: 'Inject catastrophic events.', icon: <Zap size={12} /> },
              { t: 'Resolution', d: 'Deploy AI recovery paths.', icon: <BadgeCheck size={12} /> },
              { t: 'Nodes', d: 'Scale custom infrastructure.', icon: <Database size={12} /> }
            ].map((o, i) => (
              <div key={i} style={{ padding: '0.6rem 0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ color: 'var(--status-critical)' }}>{o.icon}</div>
                <div>
                   <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>{o.t}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{o.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'onboarding',
      title: 'Tenant Logistics',
      icon: <Users size={18} />,
      color: 'var(--status-warning)',
      summary: 'Enterprise onboarding & organizational scaling.',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, opacity: 0.8 }}>Initialize a private network in three phases:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.25rem' }}>
            {[
              { s: 'Tier Selection', d: 'Enterprise or Pro subscription tier.' },
              { s: 'Identity Root', d: 'Company metadata & executive keys.' },
              { s: 'Validation', d: 'SendGrid-powered OTP verification.' }
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255, 184, 0, 0.05)', color: 'var(--status-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900, flexShrink: 0, border: '1px solid rgba(255, 184, 0, 0.15)' }}>{i+1}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--text-main)' }}>{step.s}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{step.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, rgba(0, 180, 216, 0.08), transparent 40%), var(--bg-canvas)',
      color: 'var(--text-main)',
      fontFamily: "'Inter', sans-serif",
      padding: isMobile ? '1.25rem' : '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    wrapper: {
      maxWidth: '900px',
      width: '100%',
      paddingTop: isMobile ? '0.5rem' : '1.5rem',
      paddingBottom: isMobile ? '5rem' : '3rem'
    },
    header: {
      marginBottom: isMobile ? '2rem' : '3.5rem',
      textAlign: isMobile ? 'left' : 'center',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: (isMobile || isTablet) ? '1fr' : 'repeat(2, 1fr)',
      gap: isMobile ? '1rem' : '1.25rem',
      marginBottom: '3.5rem'
    },
    card: (color) => ({
      background: 'rgba(255, 255, 255, 0.02)',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: isMobile ? '1.25rem' : '1.5rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      boxShadow: '0 4px 20px -10px rgba(0,0,0,0.2)'
    }),
    cardGlow: (color) => ({
      position: 'absolute',
      top: 0, right: 0,
      width: '100px', height: '100px',
      background: `radial-gradient(circle at top right, ${color}15, transparent 70%)`,
      pointerEvents: 'none'
    }),
    architecture: {
      background: 'rgba(255, 255, 255, 0.01)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: isMobile ? '1.25rem' : '2rem',
      marginTop: '1.5rem'
    }
  };

  return (
    <div style={styles.container}>
      <nav style={{ 
        maxWidth: '900px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingBottom: isMobile ? '1.5rem' : '2.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '28px', height: '28px', background: 'var(--grad-blue)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
             <Command size={16} />
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.15em', color: 'var(--text-main)', textTransform: 'uppercase' }}>User Manual</span>
        </div>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          className="nav-btn-hover"
        >
          <ArrowLeft size={14} /> BACK
        </button>
      </nav>

      <main style={styles.wrapper}>
        <header style={styles.header}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.35rem 0.8rem', background: 'rgba(0, 180, 216, 0.08)', borderRadius: '100px', color: 'var(--accent-primary)', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem', border: '1px solid rgba(0, 180, 216, 0.15)' }}>
             <BookOpen size={12} /> Manual v2.5
          </div>
          <h1 style={{ fontSize: isMobile ? '2rem' : '2.75rem', fontWeight: 950, letterSpacing: '-0.03em', margin: '0 0 0.75rem 0', color: 'var(--text-main)', lineHeight: 1.1 }}>
            Control the <span style={{ color: 'var(--accent-primary)' }}>Nerve.</span>
          </h1>
          <p style={{ fontSize: isMobile ? '0.9rem' : '1rem', color: 'var(--text-muted)', maxWidth: '600px', margin: isMobile ? '0' : '0 auto', lineHeight: 1.5, fontWeight: 500 }}>
            Orchestrate neural agents, geospatial intelligence, and multi-tenant operational protocols.
          </p>
        </header>

        <div style={styles.grid}>
          {modules.map(m => (
            <div 
              key={m.id}
              onClick={() => setActiveModal(m)}
              style={styles.card(m.color)}
              className="hover-lift"
            >
              <div style={styles.cardGlow(m.color)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '10px', background: `${m.color}10`, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, border: `1px solid ${m.color}20`
                }}>
                  {m.icon}
                </div>
                <div style={{ color: 'var(--text-muted)', opacity: 0.2 }}>
                   <ArrowRight size={18} />
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '0.4rem', color: 'var(--text-main)' }}>{m.title}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>{m.summary}</p>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', fontWeight: 900, color: m.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Learn More <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>

        <section style={styles.architecture}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                 <Layers size={18} />
              </div>
              <div>
                 <h2 style={{ fontSize: '1rem', fontWeight: 900, margin: 0 }}>Architecture</h2>
                 <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Logistics Engine</span>
              </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.5rem' }}>
              {[
                { icon: <Monitor size={16} />, title: 'UI', val: 'React · Vite', desc: 'Telemetry streams' },
                { icon: <Database size={16} />, title: 'Core', val: 'FastAPI · Mongo', desc: 'Elastic layer' },
                { icon: <Terminal size={16} />, title: 'AI', val: 'LangGraph · Llama', desc: 'Agentic protocols' }
              ].map((tech, i) => (
                <div key={i}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>
                      {tech.icon}
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>{tech.title}</span>
                   </div>
                   <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>{tech.val}</div>
                   <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tech.desc}</div>
                </div>
              ))}
           </div>
        </section>

        <div style={{ marginTop: '4rem', textAlign: 'center' }}>
           <button 
             onClick={() => navigate('/login')}
             style={{
               background: 'var(--accent-primary)', color: '#000', padding: '0.8rem 2rem', borderRadius: '12px', 
               fontWeight: 900, fontSize: '0.85rem', border: 'none', cursor: 'pointer', display: 'inline-flex', 
               alignItems: 'center', gap: '0.75rem', transition: 'all 0.3s ease',
               boxShadow: '0 10px 30px -5px rgba(0, 180, 216, 0.4)'
             }}
             className="btn-primary-hover"
           >
             COMMAND CENTER <ExternalLink size={16} />
           </button>
        </div>
      </main>

      {activeModal && (
        <Modal 
          isOpen={true} 
          onClose={() => setActiveModal(null)} 
          title={activeModal.title}
        >
          {activeModal.content}
        </Modal>
      )}

      <style>{`
        .hover-lift:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); }
        .btn-primary-hover:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .nav-btn-hover:hover { background: rgba(255,255,255,0.05) !important; color: var(--text-main) !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
