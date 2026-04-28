import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerStep1, registerStep2 } from '../services/api';
import { Eye, EyeOff, UserPlus, Building2, Lock, CheckCircle } from 'lucide-react';

export default function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '', email: '', mobile: '', password: '', confirmPassword: '',
    full_name: '', company_name: '',
  });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const validate = () => {
    if (!formData.full_name.trim()) return 'Full name is required';
    if (!formData.company_name.trim()) return 'Company name is required';
    if (!formData.username.trim()) return 'Username is required';
    if (formData.username.length < 3) return 'Username must be at least 3 characters';
    if (!formData.email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Please enter a valid email address';
    if (!formData.mobile.trim()) return 'Mobile number is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleStep1 = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setError('');
    setIsSubmitting(true);
    try {
      const res = await registerStep1({
        username: formData.username,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        full_name: formData.full_name,
        company_name: formData.company_name,
      });
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
      await registerStep2({ email: formData.email, otp });
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const s = {
    container: { height: '100vh', width: '100vw', backgroundColor: '#060b19', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", color: '#e2e8f0', overflow: 'auto', padding: '20px', boxSizing: 'border-box' },
    card: { width: '100%', maxWidth: '480px', backgroundColor: '#0a1128', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '40px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '24px' },
    header: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
    logoRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoIcon: { width: '36px', height: '36px', background: 'linear-gradient(135deg, #00E5A0, #00b4d8)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: '900', fontSize: '18px', fontFamily: "'Space Grotesk', sans-serif" },
    logoText: { fontSize: '26px', fontWeight: '800', letterSpacing: '2px', fontFamily: "'Space Grotesk', sans-serif" },
    tagline: { fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    group: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { width: '100%', padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    btn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #00E5A0, #00b4d8)', color: '#000', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    btnSecondary: { width: '100%', padding: '12px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', marginTop: '4px' },
    error: { padding: '12px', backgroundColor: 'rgba(255, 77, 77, 0.08)', border: '1px solid rgba(255, 77, 77, 0.3)', borderRadius: '6px', color: '#FF4D4D', fontSize: '13px', textAlign: 'center' },
    success: { padding: '12px', backgroundColor: 'rgba(0, 229, 160, 0.08)', border: '1px solid rgba(0, 229, 160, 0.3)', borderRadius: '6px', color: '#00E5A0', fontSize: '13px', textAlign: 'center' },
    link: { color: '#00E5A0', textDecoration: 'none', fontWeight: '700' },
    footer: { fontSize: '13px', color: '#94a3b8', textAlign: 'center' },
    pwWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
    pwToggle: { position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' },
    spinner: { width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.15)', borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  };

  // Step 3 — Success screen
  if (step === 3) {
    return (
      <div style={s.container}>
        <div style={{ ...s.card, alignItems: 'center', textAlign: 'center', gap: '20px' }}>
          <CheckCircle size={56} color="#00E5A0" />
          <div>
            <div style={{ ...s.logoText, fontSize: '22px', marginBottom: '8px' }}>Account Created!</div>
            <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
              Your company account has been verified and activated.<br />
              You can now sign in with your credentials.
            </div>
          </div>
          <button style={s.btn} onClick={() => navigate('/login')}>
            SIGN IN NOW
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Step 2 — OTP Verification
  if (step === 2) {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={s.header}>
            <div style={s.logoRow}>
              <div style={s.logoIcon}>N</div>
              <div style={s.logoText}>NERVE</div>
            </div>
            <div style={s.tagline}>Email Verification</div>
          </div>

          {message && <div style={s.success}>{message}</div>}

          <form style={s.form} onSubmit={handleStep2}>
            <div style={s.group}>
              <label style={s.label}>Enter Verification Code</label>
              <div style={s.pwWrap}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', color: '#64748b' }} />
                <input
                  style={{ ...s.input, paddingLeft: '40px', letterSpacing: '6px', fontSize: '20px', textAlign: 'center' }}
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                A 6-digit code was sent to <span style={{ color: '#00E5A0' }}>{formData.email}</span>
              </div>
            </div>

            {error && <div style={s.error}>{error}</div>}

            <button
              type="submit"
              style={{ ...s.btn, opacity: (isSubmitting || otp.length < 6) ? 0.6 : 1 }}
              disabled={isSubmitting || otp.length < 6}
            >
              {isSubmitting ? <><div style={s.spinner} /> VERIFYING...</> : 'VERIFY & CREATE ACCOUNT'}
            </button>
            <button type="button" style={s.btnSecondary} onClick={() => { setStep(1); setError(''); setOtp(''); }}>
              ← Back to Registration
            </button>
          </form>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } input:focus { border-color: #00E5A0 !important; }`}</style>
      </div>
    );
  }

  // Step 1 — Registration Form
  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.logoRow}>
            <div style={s.logoIcon}>N</div>
            <div style={s.logoText}>NERVE</div>
          </div>
          <div style={s.tagline}>Start Your Company</div>
        </div>

        <form style={s.form} onSubmit={handleStep1}>
          <div style={s.group}>
            <label style={s.label}>Company Name</label>
            <div style={s.pwWrap}>
              <Building2 size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
              <input style={{ ...s.input, paddingLeft: '40px' }} placeholder="e.g. Global Logistics Inc." value={formData.company_name} onChange={e => update('company_name', e.target.value)} />
            </div>
          </div>

          <div style={s.group}>
            <label style={s.label}>Full Name (Owner)</label>
            <input style={s.input} placeholder="e.g. Alex Johnson" value={formData.full_name} onChange={e => update('full_name', e.target.value)} />
          </div>

          <div style={s.row}>
            <div style={s.group}>
              <label style={s.label}>Username</label>
              <input style={s.input} placeholder="alex_j" value={formData.username} onChange={e => update('username', e.target.value.toLowerCase().replace(/\s/g, '_'))} />
            </div>
            <div style={s.group}>
              <label style={s.label}>Mobile</label>
              <input style={s.input} placeholder="+1234567890" value={formData.mobile} onChange={e => update('mobile', e.target.value)} />
            </div>
          </div>

          <div style={s.group}>
            <label style={s.label}>Email Address</label>
            <input style={s.input} type="email" placeholder="owner@company.com" value={formData.email} onChange={e => update('email', e.target.value)} />
          </div>

          <div style={s.row}>
            <div style={s.group}>
              <label style={s.label}>Password</label>
              <div style={s.pwWrap}>
                <input style={s.input} type={showPassword ? 'text' : 'password'} placeholder="Min 8 chars" value={formData.password} onChange={e => update('password', e.target.value)} />
                <button type="button" style={s.pwToggle} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div style={s.group}>
              <label style={s.label}>Confirm</label>
              <input style={s.input} type="password" placeholder="Re-enter" value={formData.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
            </div>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" style={{ ...s.btn, opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting}>
            {isSubmitting ? <><div style={s.spinner} /> SENDING CODE...</> : <><UserPlus size={18} /> CONTINUE TO VERIFY</>}
          </button>

          <div style={s.footer}>Already an owner? <Link to="/login" style={s.link}>Sign In</Link></div>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } input:focus { border-color: #00E5A0 !important; }`}</style>
    </div>
  );
}
