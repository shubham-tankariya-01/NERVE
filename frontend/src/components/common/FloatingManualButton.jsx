import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function FloatingManualButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on the User Manual page itself
  if (location.pathname === '/') return null;

  return (
    <button
      onClick={() => navigate('/')}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        background: 'var(--brand)',
        color: '#000',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 30px rgba(0, 229, 160, 0.4)',
        zIndex: 9999,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        border: 'none',
        cursor: 'pointer'
      }}
      onMouseOver={e => {
        e.currentTarget.style.transform = 'scale(1.1) rotate(-10deg)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 229, 160, 0.6)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 229, 160, 0.4)';
      }}
      title="Open User Manual"
    >
      <BookOpen size={20} />
      
      {/* Tooltip-like label for first-time users */}
      <div style={{
        position: 'absolute',
        right: '60px',
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 800,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        opacity: 0.8
      }}>
        USER MANUAL
      </div>
    </button>
  );
}
