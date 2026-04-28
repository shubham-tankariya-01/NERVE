import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginStep1, loginStep2 } from '../services/api';
import { Eye, EyeOff, ChevronDown, Lock } from 'lucide-react';
import FloatingManualButton from '../components/common/FloatingManualButton';

const DEMO_USERS = [
  { label: 'SG: Owner (Green)', email: 'owner@solarisglobal.com', password: 'solarisglobal-owner', color: '#00E5A0' },
  { label: 'SG: Manager (Green)', email: 'manager@solarisglobal.com', password: 'solarisglobal-manager', color: '#00E5A0' },
  { label: 'SG: Operator 1 (Green)', email: 'operator1@solarisglobal.com', password: 'solarisglobal-operator1', color: '#00E5A0' },
  { label: 'SG: Operator 2 (Green)', email: 'operator2@solarisglobal.com', password: 'solarisglobal-operator2', color: '#00E5A0' },
  { label: 'SG: Customer (Green)', email: 'customer@solarisglobal.com', password: 'solarisglobal-customer', color: '#00E5A0' },
  { label: 'TNT: Owner (Red)', email: 'owner@terranovatransit.com', password: 'terranovatransit-owner', color: '#ef476f' },
  { label: 'TNT: Manager (Red)', email: 'manager@terranovatransit.com', password: 'terranovatransit-manager', color: '#ef476f' },
  { label: 'TNT: Operator 1 (Red)', email: 'operator1@terranovatransit.com', password: 'terranovatransit-operator1', color: '#ef476f' },
  { label: 'TNT: Operator 2 (Red)', email: 'operator2@terranovatransit.com', password: 'terranovatransit-operator2', color: '#ef476f' },
  { label: 'TNT: Customer (Red)', email: 'customer@terranovatransit.com', password: 'terranovatransit-customer', color: '#ef476f' },
];

export default function Login() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  const [selectedColor, setSelectedColor] = useState('var(--brand)');
  
  const { user, isAuthenticated, completeLogin } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role;
      if (role === 'node_operator') navigate('/operator');
      else if (role === 'platform_admin' || role === 'company_owner') navigate('/owner');
      else if (role === 'customer') navigate('/customer');
      else navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  const handleDemoSelect = (e) => {
    const selected = DEMO_USERS.find(u => u.label === e.target.value);
    if (selected) {
      setEmail(selected.email);
      setPassword(selected.password);
      setSelectedColor(selected.color);
    } else {
      setSelectedColor('var(--brand)');
    }
  };

  const handleStep1 = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const res = await loginStep1({ email, password });
      
      if (res.bypass_otp) {
        await completeLogin(res);
        if (!res.user) {
          setError("Session creation failed. Please try again.");
          return;
        }
        const userRole = res.user.role;
        if (userRole === 'node_operator') {
          navigate('/operator');
        } else if (userRole === 'platform_admin' || userRole === 'company_owner') {
          navigate('/owner');
        } else if (userRole === 'customer') {
          navigate('/customer');
        } else {
          navigate('/');
        }
        return;
      }

      // Normal case: advance to OTP screen
      setMessage(res.message || 'OTP sent to your email.');
      setStep(2);
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
      await completeLogin(res); 
      
      if (!res.user) {
        setError("Verification successful, but user session is missing. Please re-login.");
        return;
      }

      const userRole = res.user.role;
      if (userRole === 'node_operator') {
        navigate('/operator');
      } else if (userRole === 'platform_admin' || userRole === 'company_owner') {
        navigate('/owner');
      } else if (userRole === 'customer') {
        navigate('/customer');
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
    container: { height: '100vh', width: '100vw', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', color: 'var(--text-main)', overflow: 'auto', padding: '20px', boxSizing: 'border-box' },
    card: { width: '100%', maxWidth: '480px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '40px', boxShadow: 'var(--shadow-glass)', display: 'flex', flexDirection: 'column', gap: '24px' },
    header: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
    logoRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoIcon: {
      width: '32px', height: '32px', 
      background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', 
      borderRadius: '8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
      fontWeight: '900', fontSize: '18px', fontFamily: "'Space Grotesk', sans-serif",
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
      border: `1px solid ${selectedColor}`, borderRadius: '4px', color: selectedColor,
      fontSize: '13px', fontWeight: '700', appearance: 'none', outline: 'none', cursor: 'pointer',
      textAlign: 'center', transition: 'all 0.2s',
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
              <label style={styles.label}>Quick Demo Access</label>
              <select style={styles.select} onChange={handleDemoSelect}>
                <option value="">--- Select Demo Account ---</option>
                <optgroup label="SOLARIS GLOBAL (GREEN)">
                  {DEMO_USERS.filter(u => u.label.startsWith('SG')).map(u => (
                    <option key={u.label} value={u.label}>{u.label}</option>
                  ))}
                </optgroup>
                <optgroup label="TERRA NOVA TRANSIT (RED)">
                  {DEMO_USERS.filter(u => u.label.startsWith('TNT')).map(u => (
                    <option key={u.label} value={u.label}>{u.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />

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
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                If you don't see the email, please check your <strong>spam folder</strong>.
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
      <FloatingManualButton />
    </div>
  );
}
