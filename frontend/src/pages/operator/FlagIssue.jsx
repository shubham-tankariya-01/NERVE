import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { searchShipments, createCheckin } from '../../services/api';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { 
  AlertTriangle, Send, CheckCircle, Search, 
  ShieldAlert, Info, MessageSquare, Loader 
} from 'lucide-react';

export default function FlagIssue() {
  const { user, getAuthHeaders } = useAuth();
  const { isMobile } = useBreakpoint();
  const [shipmentId, setShipmentId] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [issueType, setIssueType] = useState('Damaged goods');
  const [severity, setSeverity] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (shipmentId.length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await searchShipments(shipmentId, getAuthHeaders());
        setSuggestions(results.shipments || []);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [shipmentId, getAuthHeaders]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shipmentId || !description) return;
    
    setIsSubmitting(true);
    try {
      await createCheckin({
        shipment_id: shipmentId,
        node_id: user.assigned_node_ids?.[0] || 'manual_flag',
        event_type: 'flagged',
        condition: `FLAGGED: ${issueType}`,
        notes: `[SEVERITY: ${severity}] ${description}`
      }, getAuthHeaders());
      setSubmitted(true);
    } catch (err) {
      alert('Failed to submit report: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    container: { maxWidth: isMobile ? '100%' : '800px', margin: '0 auto' },
    header: { marginBottom: isMobile ? '24px' : '32px' },
    title: { fontSize: isMobile ? '20px' : '24px', fontWeight: '900', fontFamily: "'Space Grotesk', sans-serif", color: 'var(--status-critical)' },
    card: {
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: isMobile ? '20px' : '32px',
    },
    group: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' },
    label: { fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
    input: {
      width: '100%',
      backgroundColor: 'var(--bg-canvas)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '12px 16px',
      color: 'var(--text-primary)',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    severityGrid: { 
      display: 'grid', 
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', 
      gap: '8px' 
    },
    sevBtn: (active, color) => ({
      padding: '12px',
      borderRadius: '8px',
      border: active ? `2px solid ${color}` : '1px solid var(--border)',
      backgroundColor: active ? `${color}11` : 'transparent',
      color: active ? color : 'var(--text-muted)',
      fontSize: '11px',
      fontWeight: '900',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
    }),
    submitBtn: {
      width: '100%',
      padding: '16px',
      backgroundColor: 'var(--status-critical)',
      color: '#000',
      border: 'none',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: '900',
      textTransform: 'uppercase',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(239, 71, 111, 0.3)'
    }
  };

  if (submitted) {
    return (
      <div style={{ textAlign:'center', padding: isMobile ? '60px 20px' : '100px 20px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--brand-dim)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '12px' }}>REPORT TRANSMITTED</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 32px', lineHeight: '1.6', fontSize: '14px' }}>
          Incident advisory has been logged in the network. Regional controllers have been alerted.
        </p>
        <button 
          onClick={() => { setSubmitted(false); setShipmentId(''); setDescription(''); }}
          style={{ padding: '12px 24px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}
        >
          NEW ADVISORY
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>INCIDENT REPORTING</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>Flag manifest discrepancies for immediate human audit</p>
      </header>

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <div style={styles.group}>
            <label style={styles.label}>Manifest ID</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                style={{ ...styles.input, paddingLeft: '40px' }} 
                placeholder="Enter Shipment ID..." 
                value={shipmentId}
                onChange={e => setShipmentId(e.target.value.toUpperCase())}
                required
              />
              {suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '4px', zIndex: 100, maxHeight: '180px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                  {suggestions.map(s => (
                    <div key={s.id} onClick={() => { setShipmentId(s.id); setSuggestions([]); }} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '800' }}>{s.id}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{s.cargo_type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '0' : '24px' }}>
            <div style={styles.group}>
              <label style={styles.label}>Classification</label>
              <select 
                style={{ ...styles.input, appearance: 'none' }} 
                value={issueType} 
                onChange={e => setIssueType(e.target.value)}
              >
                <option>Damaged goods</option>
                <option>Missing items</option>
                <option>Weight discrepancy</option>
                <option>Security concern</option>
                <option>Other</option>
              </select>
            </div>

            <div style={styles.group}>
              <label style={styles.label}>Priority Level</label>
              <div style={styles.severityGrid}>
                <div style={styles.sevBtn(severity === 'LOW', 'var(--info)')} onClick={() => setSeverity('LOW')}>LOW</div>
                <div style={styles.sevBtn(severity === 'HIGH', 'var(--status-warning)')} onClick={() => setSeverity('HIGH')}>HIGH</div>
                <div style={styles.sevBtn(severity === 'CRITICAL', 'var(--status-critical)')} onClick={() => setSeverity('CRITICAL')}>CRITICAL</div>
              </div>
            </div>
          </div>

          <div style={styles.group}>
            <label style={styles.label}>Operator Notes</label>
            <textarea 
              style={{ ...styles.input, height: isMobile ? '100px' : '140px', resize: 'none', lineHeight: '1.6' }} 
              placeholder="Describe the anomaly..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>

          <button style={styles.submitBtn} type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : (
              <>
                <ShieldAlert size={20} />
                TRANSMIT REPORT
              </>
            )}
          </button>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
