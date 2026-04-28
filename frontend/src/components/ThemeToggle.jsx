import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: '700',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        whiteSpace: 'nowrap',
        boxShadow: 'var(--shadow-sm)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}
    >
      {theme === 'dark' ? (
        <>
          <Moon size={16} />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun size={16} />
          <span>Light Mode</span>
        </>
      )}
    </button>
  );
}
