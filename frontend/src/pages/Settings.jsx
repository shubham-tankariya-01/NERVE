import React, { useState } from 'react';
import {
  User, Lock, Bell, Palette, Shield, ChevronRight,
  Check, AlertCircle, Eye, EyeOff, Moon, Sun, Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';

const API_BASE = 'http://127.0.0.1:8000/api';

/* ── helpers ── */
const inputStyle = {
  width: '100%',
  padding: '0.7rem 1rem',
  background: 'var(--bg-canvas)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  outline: 'none',
  transition: 'border-color 0.2s',
  fontFamily: 'inherit',
};

function SectionCard({ title, icon, children }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
      }}>
        <div style={{ color: 'var(--brand)' }}>{icon}</div>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '1.5rem' }}>{children}</div>
    </div>
  );
}

function Toast({ msg }) {
  if (!msg.text) return null;
  const isErr = msg.type === 'error';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      background: isErr ? 'var(--danger-dim)' : 'var(--brand-dim)',
      border: `1px solid ${isErr ? 'var(--danger)' : 'var(--brand)'}`,
      color: isErr ? 'var(--danger)' : 'var(--brand)',
      fontSize: '0.85rem', fontWeight: 600,
      marginTop: '1rem',
    }}>
      {isErr ? <AlertCircle size={16} /> : <Check size={16} />}
      {msg.text}
    </div>
  );
}

function SaveBtn({ loading, label = 'Save Changes' }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.65rem 1.5rem',
        background: 'var(--brand)',
        color: '#000',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 700,
        fontSize: '0.85rem',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'opacity 0.2s',
        fontFamily: 'inherit',
      }}
    >
      <Save size={15} />
      {loading ? 'Saving…' : label}
    </button>
  );
}

/* ──────────────────────────────────────── */
/* PROFILE SECTION                          */
/* ──────────────────────────────────────── */
function ProfileSection({ user, token, onUpdate }) {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail]     = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState({ text: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          full_name: fullName !== user?.full_name ? fullName : undefined,
          email: email !== user?.email ? email : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Update failed');
      onUpdate(data.user);
      setMsg({ text: 'Profile updated successfully.', type: 'success' });
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard title="Profile Information" icon={<User size={18} />}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Full Name
            </label>
            <input
              style={inputStyle}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              onFocus={e => e.target.style.borderColor = 'var(--brand)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Username
            </label>
            <input
              style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
              value={user?.username || ''}
              disabled
            />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Email Address
          </label>
          <input
            type="email"
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            onFocus={e => e.target.style.borderColor = 'var(--brand)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SaveBtn loading={loading} />
        </div>
        <Toast msg={msg} />
      </form>
    </SectionCard>
  );
}

/* ──────────────────────────────────────── */
/* SECURITY SECTION                         */
/* ──────────────────────────────────────── */
function SecuritySection({ user, token }) {
  const [current, setCurrent]   = useState('');
  const [newPwd, setNewPwd]     = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showCur, setShowCur]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState({ text: '', type: '' });

  const strength = newPwd.length === 0 ? null
    : newPwd.length < 8 ? 'weak'
    : newPwd.match(/[A-Z]/) && newPwd.match(/[0-9]/) ? 'strong'
    : 'medium';

  const strengthColor = { weak: 'var(--danger)', medium: 'var(--warning)', strong: 'var(--brand)' };
  const strengthWidth = { weak: '33%', medium: '66%', strong: '100%' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    if (newPwd !== confirm) {
      setMsg({ text: 'New passwords do not match.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: current, new_password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Password change failed');
      setMsg({ text: 'Password changed successfully.', type: 'success' });
      setCurrent(''); setNewPwd(''); setConfirm('');
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const eyeBtn = (show, setShow) => (
    <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <SectionCard title="Security" icon={<Lock size={18} />}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div style={{ position: 'relative' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Password
          </label>
          <input
            type={showCur ? 'text' : 'password'}
            style={{ ...inputStyle, paddingRight: '2.5rem' }}
            value={current}
            onChange={e => setCurrent(e.target.value)}
            placeholder="Enter current password"
            required
            onFocus={e => e.target.style.borderColor = 'var(--brand)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {eyeBtn(showCur, setShowCur)}
        </div>

        <div style={{ position: 'relative' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            New Password
          </label>
          <input
            type={showNew ? 'text' : 'password'}
            style={{ ...inputStyle, paddingRight: '2.5rem' }}
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            placeholder="Min. 8 characters"
            required
            onFocus={e => e.target.style.borderColor = 'var(--brand)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {eyeBtn(showNew, setShowNew)}
          {strength && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ height: '4px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: strengthWidth[strength], background: strengthColor[strength], transition: 'width 0.3s, background 0.3s', borderRadius: '2px' }} />
              </div>
              <span style={{ fontSize: '0.7rem', color: strengthColor[strength], fontWeight: 700, textTransform: 'uppercase', marginTop: '0.25rem', display: 'block' }}>
                {strength} password
              </span>
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Confirm New Password
          </label>
          <input
            type="password"
            style={{ ...inputStyle, borderColor: confirm && confirm !== newPwd ? 'var(--danger)' : 'var(--border)' }}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Re-enter new password"
            required
            onFocus={e => { if (!confirm || confirm === newPwd) e.target.style.borderColor = 'var(--brand)'; }}
            onBlur={e => e.target.style.borderColor = confirm && confirm !== newPwd ? 'var(--danger)' : 'var(--border)'}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <SaveBtn loading={loading} label="Change Password" />
        </div>
        <Toast msg={msg} />
      </form>
    </SectionCard>
  );
}

/* ──────────────────────────────────────── */
/* APPEARANCE SECTION                       */
/* ──────────────────────────────────────── */
function AppearanceSection() {
  const { theme, toggleTheme } = useTheme();

  const ThemeCard = ({ id, label, desc, icon }) => {
    const active = theme === id;
    return (
      <div
        onClick={() => { if (!active) toggleTheme(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          border: `2px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
          background: active ? 'var(--brand-dim)' : 'var(--bg-elevated)',
          cursor: active ? 'default' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ color: active ? 'var(--brand)' : 'var(--text-secondary)' }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{desc}</div>
        </div>
        {active && <Check size={16} style={{ color: 'var(--brand)', flexShrink: 0 }} />}
      </div>
    );
  };

  return (
    <SectionCard title="Appearance" icon={<Palette size={18} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <ThemeCard id="dark" label="Dark Mode" desc="Easy on the eyes, great for monitoring dashboards" icon={<Moon size={20} />} />
        <ThemeCard id="light" label="Light Mode" desc="High contrast, ideal for well-lit environments" icon={<Sun size={20} />} />
      </div>
    </SectionCard>
  );
}

/* ──────────────────────────────────────── */
/* NOTIFICATIONS SECTION                    */
/* ──────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: value ? 'var(--brand)' : 'var(--border-strong)',
        position: 'relative', cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff',
        position: 'absolute', top: '3px',
        left: value ? '23px' : '3px',
        transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    disruptions: true,
    rerouteAlerts: true,
    agentActions: false,
    weatherAlerts: true,
  });

  const items = [
    { key: 'disruptions',   label: 'Disruption Alerts',   desc: 'Critical node failures and supply chain disruptions' },
    { key: 'rerouteAlerts', label: 'Reroute Notifications', desc: 'When the agent reroutes a shipment' },
    { key: 'agentActions',  label: 'Agent Activity',       desc: 'All multi-agent orchestrator actions' },
    { key: 'weatherAlerts', label: 'Weather Warnings',     desc: 'Extreme weather conditions on active routes' },
  ];

  return (
    <SectionCard title="Notification Preferences" icon={<Bell size={18} />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', }}>
        {items.map((item, i) => (
          <div
            key={item.key}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem 0',
              borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{item.desc}</div>
            </div>
            <Toggle value={prefs[item.key]} onChange={(v) => setPrefs(p => ({ ...p, [item.key]: v }))} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Note: In-app notifications only. Email notification support coming soon.
      </div>
    </SectionCard>
  );
}

/* ──────────────────────────────────────── */
/* ACCOUNT INFO SECTION                     */
/* ──────────────────────────────────────── */
function AccountInfoSection({ user }) {
  const roleColors = {
    platform_admin: 'var(--danger)',
    logistics_manager: 'var(--info)',
    node_operator: 'var(--warning)',
    customer: 'var(--purple)',
  };
  const roleColor = roleColors[user?.role] || 'var(--brand)';
  const roleDim   = roleColor.replace(')', ', 0.12)').replace('var(--', 'rgba(').replace(')', ')');

  const Row = ({ label, value, mono }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit' }}>
        {value}
      </span>
    </div>
  );

  return (
    <SectionCard title="Account Details" icon={<Shield size={18} />}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.3rem 0.8rem',
          borderRadius: '20px',
          background: `${roleColor}1A`,
          border: `1px solid ${roleColor}40`,
          color: roleColor,
          fontSize: '0.75rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}>
          <Shield size={12} />
          {(user?.role || '').replace(/_/g, ' ')}
        </div>
      </div>
      <Row label="Username"   value={user?.username || '—'}   mono />
      <Row label="Email"      value={user?.email || '—'} />
      <Row label="Company ID" value={user?.company_id || 'Platform-wide'} mono />
      <Row label="Status"     value={user?.is_active ? '✓ Active' : '✗ Inactive'} />
      <Row label="Verified"   value={user?.is_verified ? '✓ Verified' : '✗ Unverified'} />
      {user?.created_at && (
        <Row label="Member Since" value={new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} />
      )}
    </SectionCard>
  );
}

/* ──────────────────────────────────────── */
/* MAIN PAGE                                */
/* ──────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'profile',       label: 'Profile',         icon: <User size={16} /> },
  { id: 'security',      label: 'Security',         icon: <Lock size={16} /> },
  { id: 'appearance',    label: 'Appearance',       icon: <Palette size={16} /> },
  { id: 'notifications', label: 'Notifications',    icon: <Bell size={16} /> },
  { id: 'account',       label: 'Account Details',  icon: <Shield size={16} /> },
];

export default function Settings() {
  const { user, accessToken, updateUser } = useAuth();
  const [active, setActive] = useState('profile');

  const initials = (user?.full_name || user?.username || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-canvas)', overflow: 'hidden' }}>

      {/* ── Left Nav ── */}
      <aside style={{
        width: '280px', flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '3rem 1.25rem',
        gap: '0.5rem',
      }}>
        {/* avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', padding: '0 0.5rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #A855F7, #6366F1)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: 800,
          }}>{initials}</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user?.full_name || user?.username}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{(user?.role || '').replace(/_/g, ' ')}</div>
          </div>
        </div>

        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem',
              padding: '0.85rem 1.1rem',
              borderRadius: '8px',
              background: active === item.id ? 'var(--brand-dim)' : 'transparent',
              color: active === item.id ? 'var(--brand)' : 'var(--text-secondary)',
              border: active === item.id ? '1px solid rgba(0,229,160,0.2)' : '1px solid transparent',
              fontSize: '0.95rem', fontWeight: 600,
              cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            {item.icon}
            <span style={{ flex: 1 }}>{item.label}</span>
            {active === item.id && <ChevronRight size={14} />}
          </button>
        ))}
      </aside>

      {/* ── Content ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '2.5rem 3rem' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <header style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-elevated)',
            padding: '1.25rem 2rem',
            borderLeft: '4px solid var(--brand)',
            borderRadius: '0 8px 8px 0',
            marginBottom: '2.5rem',
          }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>
                {NAV_ITEMS.find(n => n.id === active)?.label}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 600, marginBottom: 0 }}>
                {active === 'profile'       && 'Update your display name and email address.'}
                {active === 'security'      && 'Change your password to keep your account secure.'}
                {active === 'appearance'    && 'Choose how Nerve looks for you.'}
                {active === 'notifications' && 'Control which alerts you receive in the dashboard.'}
                {active === 'account'       && 'Read-only overview of your account details.'}
              </p>
            </div>
          </header>

          {active === 'profile'       && <ProfileSection user={user} token={accessToken} onUpdate={updateUser} />}
          {active === 'security'      && <SecuritySection user={user} token={accessToken} />}
          {active === 'appearance'    && <AppearanceSection />}
          {active === 'notifications' && <NotificationsSection />}
          {active === 'account'       && <AccountInfoSection user={user} />}
        </div>
      </main>
    </div>
  );
}
