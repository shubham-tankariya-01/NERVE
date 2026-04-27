import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginStep1, loginStep2 } from '../services/api';
import { Eye, EyeOff, ChevronDown, Lock } from 'lucide-react';

const ROLES = [
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'logistics_manager', label: 'Logistics Manager' },
  { value: 'node_operator', label: 'Node Operator' },
  { value: 'customer', label: 'Customer' },
];

export default function Login() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('logistics_manager');
  const [otp, setOtp] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  const { completeLogin } = useAuth();
  const navigate = useNavigate();

  const handleStep1 = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const res = await loginStep1({ email, password, role });
      await completeLogin(res);
      
      const userRole = res.user.role;
      if (userRole === 'node_operator') {
        navigate('/operator');
      } else if (userRole === 'platform_admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await loginStep2({ email, otp });
      await completeLogin(res); // Store tokens & trigger auth context update
      
      const userRole = res.user.role;
      if (userRole === 'node_operator') {
        navigate('/operator');
      } else if (userRole === 'platform_admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    container: {
      height: '100vh', width: '100vw', backgroundColor: 'var(--bg-canvas)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)', color: 'var(--text-primary)',
    },
    card: {
      width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)', borderRadius: '8px', padding: '40px',
      boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '24px',
    },
    header: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
    logoRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoIcon: {
      width: '32px', height: '32px', backgroundColor: 'var(--brand)', borderRadius: '4px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000',
      fontWeight: '900', fontSize: '20px', fontFamily: 'Space Grotesk, sans-serif',
    },
    logoText: {
      fontSize: '24px', fontWeight: '700', letterSpacing: '2px',
      fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)',
    },
    tagline: { fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' },
    inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
    input: {
      width: '100%', padding: '12px', backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)',
      fontSize: '14px', outline: 'none', transition: 'border-color 0.2s',
    },
    select: {
      width: '100%', padding: '12px', backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)',
      fontSize: '14px', appearance: 'none', outline: 'none', cursor: 'pointer',
    },
    toggleButton: {
      position: 'absolute', right: '12px', background: 'none', border: 'none',
      color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center'
    },
    button: {
      width: '100%', padding: '14px', backgroundColor: 'var(--brand)', color: '#000',
      border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: '700',
      textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'center', gap: '8px', marginTop: '8px',
    },
    btnSecondary: {
      width: '100%', padding: '12px', background: 'none',
      border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
      borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
    },
    error: {
      padding: '12px', backgroundColor: 'rgba(255, 77, 77, 0.1)',
      border: '1px solid var(--danger)', borderRadius: '4px', color: 'var(--danger)',
      fontSize: '13px', textAlign: 'center',
    },
    success: {
      padding: '12px', backgroundColor: 'rgba(0, 229, 160, 0.1)',
      border: '1px solid var(--brand)', borderRadius: '4px', color: 'var(--brand)',
      fontSize: '13px', textAlign: 'center',
    },
    footer: { fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' },
    spinner: {
      width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.1)',
      borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin 1s linear infinite',
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}>N</div>
            <div style={styles.logoText}>NERVE</div>
          </div>
          <div style={styles.tagline}>Secure Authentication</div>
        </div>

        {step === 1 ? (
          <form style={styles.form} onSubmit={handleStep1}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Role</label>
              <div style={styles.inputWrapper}>
                <select style={styles.select} value={role} onChange={(e) => setRole(e.target.value)} required>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input type="email" style={styles.input} placeholder="user@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <input type={showPassword ? 'text' : 'password'} style={styles.input} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" style={styles.toggleButton} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button type="submit" style={{...styles.button, opacity: isSubmitting ? 0.7 : 1}} disabled={isSubmitting}>
              {isSubmitting ? <><div style={styles.spinner} /><span>VERIFYING...</span></> : 'CONTINUE'}
            </button>
          </form>
        ) : (
          <form style={styles.form} onSubmit={handleStep2}>
            {message && <div style={styles.success}>{message}</div>}
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Enter OTP</label>
              <div style={styles.inputWrapper}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" style={{...styles.input, paddingLeft: '36px', letterSpacing: '4px', fontSize: '18px', textAlign: 'center'}} 
                  placeholder="000000" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required 
                />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                A 6-digit code was sent to {email}
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button type="submit" style={{...styles.button, opacity: isSubmitting ? 0.7 : 1}} disabled={isSubmitting || otp.length < 6}>
              {isSubmitting ? <><div style={styles.spinner} /><span>AUTHENTICATING...</span></> : 'VERIFY & LOGIN'}
            </button>
            <button type="button" style={styles.btnSecondary} onClick={() => { setStep(1); setError(''); }}>
              ← BACK
            </button>
          </form>
        )}

        {step === 1 && (
          <div style={styles.footer}>
            Don't have an account? <Link to="/register" style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: '700' }}>Create Account</Link>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: var(--brand) !important; }
      `}</style>
    </div>
  );
}
