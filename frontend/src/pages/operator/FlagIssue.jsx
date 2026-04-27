import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { searchShipments, createCheckin } from '../../services/api';
import { AlertTriangle, Send, CheckCircle } from 'lucide-react';

export default function FlagIssue() {
  const { user, getAuthHeaders } = useAuth();
  const [shipmentId, setShipmentId] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [issueType, setIssueType] = useState('Damaged goods');
  const [severity, setSeverity] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Debounced search
  useEffect(() => {
    if (shipmentId.length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const headers = getAuthHeaders();
        const results = await searchShipments(shipmentId, headers);
        // Backend returns { shipments: [...] }
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
      const headers = getAuthHeaders();
      await createCheckin({
        shipment_id: shipmentId,
        node_id: user.assigned_node_ids[0],
        event_type: 'flagged',
        condition: `FLAGGED: ${issueType}`,
        notes: `[SEVERITY: ${severity}] ${description}`
      }, headers);
      setSubmitted(true);
    } catch (err) {
      alert('Failed to submit report: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    title: {
      fontSize: '24px',
      fontWeight: '800',
      marginBottom: '8px',
      color: 'var(--status-critical)',
    },
    subtitle: {
      fontSize: '14px',
      color: 'var(--text-muted)',
      marginBottom: '32px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    },
    group: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    label: {
      fontSize: '12px',
      fontWeight: '700',
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
    },
    input: {
      width: '100%',
      padding: '16px',
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      color: 'var(--text-main)',
      fontSize: '16px',
      outline: 'none',
    },
    select: {
      width: '100%',
      padding: '16px',
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      color: 'var(--text-main)',
      fontSize: '16px',
      appearance: 'none',
    },
    severityGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '10px',
    },
    sevBtn: (active, color) => ({
      padding: '16px 8px',
      borderRadius: '12px',
      border: active ? `2px solid ${color}` : '1px solid var(--glass-border)',
      backgroundColor: active ? `${color}22` : 'var(--bg-glass)',
      color: active ? color : 'var(--text-muted)',
      fontSize: '12px',
      fontWeight: '800',
      textAlign: 'center',
      cursor: 'pointer',
    }),
    submitBtn: {
      marginTop: '16px',
      padding: '18px',
      backgroundColor: 'var(--status-critical)',
      color: '#fff',
      border: 'none',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '800',
      textTransform: 'uppercase',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    },
    success: {
      textAlign: 'center',
      padding: '60px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '20px',
    }
  };

  if (submitted) {
    return (
      <div style={styles.success}>
        <CheckCircle size={64} style={{ color: 'var(--status-live)' }} />
        <h2 style={{ fontSize: '20px', fontWeight: '800' }}>REPORT SUBMITTED</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
          The logistics management team has been notified. This shipment is now flagged for review.
        </p>
        <button 
          onClick={() => { setSubmitted(false); setShipmentId(''); setDescription(''); }}
          style={{ ...styles.submitBtn, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', width: '200px' }}
        >
          NEW REPORT
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 style={styles.title}>FLAG ISSUE</h1>
      <p style={styles.subtitle}>Report shipment discrepancies or security concerns immediately.</p>

      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.group}>
          <label style={styles.label}>Shipment ID</label>
          <div style={{ position: 'relative' }}>
            <input 
              style={styles.input} 
              placeholder="Enter ID (e.g. S018)" 
              value={shipmentId}
              onChange={e => setShipmentId(e.target.value.toUpperCase())}
              required
            />
            {suggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                marginTop: '4px',
                zIndex: 100,
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {suggestions.map(s => (
                  <div 
                    key={s.id}
                    onClick={() => { setShipmentId(s.id); setSuggestions([]); }}
                    style={{ padding: '12px', borderBottom: '1px solid var(--glass-border)', fontSize: '13px', cursor: 'pointer' }}
                  >
                    {s.id} - {s.cargo_type}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Issue Type</label>
          <select style={styles.select} value={issueType} onChange={e => setIssueType(e.target.value)}>
            <option>Damaged goods</option>
            <option>Missing items</option>
            <option>Weight discrepancy</option>
            <option>Documentation issue</option>
            <option>Security concern</option>
            <option>Other</option>
          </select>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Severity</label>
          <div style={styles.severityGrid}>
            <div style={styles.sevBtn(severity === 'LOW', 'var(--status-info)')} onClick={() => setSeverity('LOW')}>LOW</div>
            <div style={styles.sevBtn(severity === 'HIGH', 'var(--status-warning)')} onClick={() => setSeverity('HIGH')}>HIGH</div>
            <div style={styles.sevBtn(severity === 'CRITICAL', 'var(--status-critical)')} onClick={() => setSeverity('CRITICAL')}>CRITICAL</div>
          </div>
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Description</label>
          <textarea 
            style={{...styles.input, height: '120px', resize: 'none'}} 
            placeholder="Describe the issue in detail..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            maxLength={500}
          />
          <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-muted)' }}>
            {description.length} / 500
          </div>
        </div>

        <button style={styles.submitBtn} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'SUBMITTING...' : (
            <>
              <Send size={18} />
              SUBMIT FLAG REPORT
            </>
          )}
        </button>
      </form>
    </div>
  );
}
