import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerStep1, registerStep2 } from '../services/api';
import { Eye, EyeOff, UserPlus, Lock, ChevronDown, Plus, Building2 } from 'lucide-react';

const ROLES = [
  { value: 'logistics_manager', label: 'Logistics Manager', desc: 'Manage shipments, approve reroutes, monitor network' },
  { value: 'node_operator', label: 'Node Operator', desc: 'Check-in shipments at ports, warehouses, factories' },
  { value: 'customer', label: 'Customer', desc: 'Track shipments and view delivery status' },
];

export default function Register() {
  const [step, setStep] = useState(1); // 1 = basics, 2 = role, 3 = otp
  const [formData, setFormData] = useState({
    username: '', email: '', mobile: '', password: '', confirmPassword: '',
    full_name: '', role: 'logistics_manager', company_id: '', company_name: '', assigned_node_ids: '',
  });
  const [isNewCompany, setIsNewCompany] = useState(false);
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companies, setCompanies] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/companies');
        if (res.ok) setCompanies(await res.json());
      } catch (e) {}
    };
    loadCompanies();
  }, []);

  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const validateStep1 = () => {
    if (!formData.full_name.trim()) return 'Full name is required';
    if (!formData.username.trim()) return 'Username is required';
    if (formData.username.length < 3) return 'Username must be at least 3 characters';
    if (!formData.email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Please enter a valid email address';
    if (!formData.mobile.trim()) return 'Mobile number is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.role !== 'platform_admin') {
      if (isNewCompany && !formData.company_name.trim()) {
        setError('Please enter a company name'); return;
      }
      if (!isNewCompany && !formData.company_id) {
        setError('Please select an existing company'); return;
      }
    }
    
    if (formData.role === 'node_operator' && !formData.assigned_node_ids.trim()) {
      setError('Please enter at least one node ID'); return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role,
        company_id: !isNewCompany ? (formData.company_id || null) : null,
        company_name: isNewCompany ? formData.company_name : null,
        assigned_node_ids: formData.role === 'node_operator'
          ? formData.assigned_node_ids.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      };

      const res = await registerStep1(payload);
      navigate('/login', { state: { message: 'Registration successful! Please login.' }});
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await registerStep2({ email: formData.email, otp });
      navigate('/login', { state: { message: 'Registration successful! Please login.' }});
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const s = {
    container: { height: '100vh', width: '100vw', backgroundColor: '#060b19', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", color: '#e2e8f0' },
    card: { width: '100%', maxWidth: '480px', backgroundColor: '#0a1128', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '40px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '24px' },
    header: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
    logoRow: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoIcon: { width: '36px', height: '36px', background: 'linear-gradient(135deg, #00E5A0, #00b4d8)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: '900', fontSize: '18px', fontFamily: "'Space Grotesk', sans-serif" },
    logoText: { fontSize: '26px', fontWeight: '800', letterSpacing: '2px', fontFamily: "'Space Grotesk', sans-serif" },
    tagline: { fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    group: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { width: '100%', padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#e2e8f0', fontSize: '14px', outline: 'none' },
    select: { width: '100%', padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#e2e8f0', fontSize: '14px', appearance: 'none', cursor: 'pointer' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
    btn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg, #00E5A0, #00b4d8)', color: '#000', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    btnSecondary: { width: '100%', padding: '12px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' },
    btnToggle: { background: 'none', border: 'none', color: '#00E5A0', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start' },
    error: { padding: '12px', backgroundColor: 'rgba(255, 77, 77, 0.08)', border: '1px solid rgba(255, 77, 77, 0.3)', borderRadius: '6px', color: '#FF4D4D', fontSize: '13px', textAlign: 'center' },
    success: { padding: '12px', backgroundColor: 'rgba(0, 229, 160, 0.08)', border: '1px solid rgba(0, 229, 160, 0.3)', borderRadius: '6px', color: '#00E5A0', fontSize: '13px', textAlign: 'center' },
    roleCard: (active) => ({ padding: '14px 16px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', border: active ? '2px solid #00E5A0' : '1px solid rgba(255,255,255,0.06)', backgroundColor: active ? 'rgba(0, 229, 160, 0.06)' : 'rgba(255,255,255,0.02)' }),
    steps: { display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' },
    dot: (active) => ({ width: '32px', height: '4px', borderRadius: '2px', backgroundColor: active ? '#00E5A0' : 'rgba(255,255,255,0.1)', transition: 'background-color 0.3s' }),
    link: { color: '#00E5A0', textDecoration: 'none', fontWeight: '700' },
    footer: { fontSize: '13px', color: '#94a3b8', textAlign: 'center' },
    pwWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
    pwToggle: { position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' },
    spinner: { width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.15)', borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.header}>
          <div style={s.logoRow}>
            <div style={s.logoIcon}>N</div>
            <div style={s.logoText}>NERVE</div>
          </div>
          <div style={s.tagline}>Create Your Account</div>
        </div>

        <div style={s.steps}>
          <div style={s.dot(true)} />
          <div style={s.dot(step >= 2)} />
          <div style={s.dot(step === 3)} />
        </div>

        {step === 1 && (
          <div style={s.form}>
            <div style={s.group}>
              <label style={s.label}>Full Name</label>
              <input style={s.input} placeholder="e.g. Alex Johnson" value={formData.full_name} onChange={e => update('full_name', e.target.value)} />
            </div>
            <div style={s.row}>
              <div style={s.group}>
                <label style={s.label}>Username</label>
                <input style={s.input} placeholder="e.g. alex_j" value={formData.username} onChange={e => update('username', e.target.value.toLowerCase().replace(/\s/g, '_'))} />
              </div>
              <div style={s.group}>
                <label style={s.label}>Mobile</label>
                <input style={s.input} placeholder="+1234567890" value={formData.mobile} onChange={e => update('mobile', e.target.value)} />
              </div>
            </div>
            <div style={s.group}>
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" placeholder="alex@company.com" value={formData.email} onChange={e => update('email', e.target.value)} />
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
                <input style={s.input} type="password" placeholder="Re-enter password" value={formData.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
              </div>
            </div>

            {error && <div style={s.error}>{error}</div>}
            <button type="button" style={s.btn} onClick={handleNext}>CONTINUE — SELECT ROLE →</button>
            <div style={s.footer}>Already have an account? <Link to="/login" style={s.link}>Sign In</Link></div>
          </div>
        )}

        {step === 2 && (
          <form style={s.form} onSubmit={handleStep2Submit}>
            <div style={s.group}>
              <label style={s.label}>Select Your Role</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ROLES.map(r => (
                  <div key={r.value} style={s.roleCard(formData.role === r.value)} onClick={() => update('role', r.value)}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: formData.role === r.value ? '#00E5A0' : '#e2e8f0' }}>{r.label}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {formData.role !== 'platform_admin' && (
              <div style={s.group}>
                <label style={s.label}>Company Configuration</label>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  
                  {isNewCompany ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input style={s.input} placeholder="Enter new company name (e.g. Acme Corp)" value={formData.company_name} onChange={e => update('company_name', e.target.value)} />
                      <button type="button" style={s.btnToggle} onClick={() => setIsNewCompany(false)}>
                        <Building2 size={14} /> Join an existing company instead
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {companies.length > 0 ? (
                        <div style={{ position: 'relative' }}>
                          <select style={s.select} value={formData.company_id} onChange={e => update('company_id', e.target.value)}>
                            <option value="">Select your company...</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.plan})</option>)}
                          </select>
                          <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                        </div>
                      ) : (
                        <input style={s.input} placeholder="Enter company ID (e.g. company_demo)" value={formData.company_id} onChange={e => update('company_id', e.target.value)} />
                      )}
                      <button type="button" style={s.btnToggle} onClick={() => setIsNewCompany(true)}>
                        <Plus size={14} /> Register a new company instead
                      </button>
                    </div>
                  )}
                  
                </div>
              </div>
            )}

            {formData.role === 'node_operator' && (
              <div style={s.group}>
                <label style={s.label}>Assigned Node IDs</label>
                <input style={s.input} placeholder="e.g. N05, N08" value={formData.assigned_node_ids} onChange={e => update('assigned_node_ids', e.target.value)} />
              </div>
            )}

            {error && <div style={s.error}>{error}</div>}
            <button type="submit" style={{ ...s.btn, opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting}>
              {isSubmitting ? <><div style={s.spinner} /> REGISTERING...</> : <><UserPlus size={18} /> REGISTER ACCOUNT</>}
            </button>
            <button type="button" style={s.btnSecondary} onClick={() => { setStep(1); setError(''); }}>← BACK</button>
          </form>
        )}

        {step === 3 && (
          <form style={s.form} onSubmit={handleStep3Submit}>
            {message && <div style={s.success}>{message}</div>}
            <div style={s.group}>
              <label style={s.label}>Enter Email OTP</label>
              <div style={s.pwWrap}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                <input type="text" style={{ ...s.input, paddingLeft: '36px', letterSpacing: '4px', fontSize: '18px', textAlign: 'center' }} placeholder="000000" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required />
              </div>
            </div>
            {error && <div style={s.error}>{error}</div>}
            <button type="submit" style={{ ...s.btn, opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting || otp.length < 6}>
              {isSubmitting ? <><div style={s.spinner} /> VERIFYING...</> : 'VERIFY & COMPLETE'}
            </button>
          </form>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } input:focus, select:focus { border-color: #00E5A0 !important; }`}</style>
    </div>
  );
}
