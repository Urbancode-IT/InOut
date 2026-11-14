import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../utils/api';

const card = {
  maxWidth: 560,
  margin: '3rem auto',
  padding: '2rem',
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 8px 30px rgba(11,45,103,0.08)',
  border: '1px solid #e5e7eb',
};

const btn = (variant) => ({
  padding: '0.7rem 1.25rem',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  color: '#fff',
  background: variant === 'danger' ? '#b91c1c' : '#0b2d67',
  opacity: 1,
});

export default function AcceptOffer() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(API_ENDPOINTS.getOfferByToken(token));
        if (!cancelled) setOffer(res.data?.offer || null);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Unable to load this offer link');
          setOffer(err.response?.data?.offer || null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(API_ENDPOINTS.acceptOfferByToken(token));
      setDone({ type: 'accepted', message: res.data?.message });
      setOffer(res.data?.offer || offer);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept offer');
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!window.confirm('Are you sure you want to decline this offer?')) return;
    setBusy(true);
    setError('');
    try {
      const res = await axios.post(API_ENDPOINTS.declineOfferByToken(token));
      setDone({ type: 'declined', message: res.data?.message });
      setOffer(res.data?.offer || offer);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline offer');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#f0f4ff 0%,#fff 60%)', padding: '1rem' }}>
      <div style={card}>
        <h1 style={{ marginTop: 0, color: '#0b2d67', fontSize: '1.5rem' }}>Offer Letter Response</h1>
        {loading && <p>Loading offer details…</p>}

        {!loading && offer && (
          <div style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
            <p><strong>Employee Name:</strong> {offer.employeeName || '—'}</p>
            <p><strong>Final Designation:</strong> {offer.designation || '—'}</p>
            <p><strong>Department:</strong> {offer.department || '—'}</p>
            <p><strong>Company:</strong> {offer.company || '—'}</p>
            <p><strong>Salary / CTC:</strong> {offer.salary || '—'}</p>
            <p><strong>Official Joining Date:</strong> {offer.joiningDate || '—'}</p>
            {offer.employmentType ? <p><strong>Employment Type:</strong> {offer.employmentType}</p> : null}
            {offer.workLocation ? <p><strong>Work Location:</strong> {offer.workLocation}</p> : null}
            {offer.reportingManager ? <p><strong>Reporting Manager:</strong> {offer.reportingManager}</p> : null}
            {offer.probationPeriod ? <p><strong>Probation Period:</strong> {offer.probationPeriod}</p> : null}
            {offer.noticePeriod ? <p><strong>Notice Period:</strong> {offer.noticePeriod}</p> : null}
            <p><strong>Offer Status:</strong> {offer.offerStatus || '—'}</p>
          </div>
        )}

        {error && (
          <div style={{ color: '#b91c1c', marginTop: '1rem' }}>
            <p style={{ margin: 0 }}>{error}</p>
            {/invalid|unknown/i.test(error) && (
              <p style={{ margin: '0.75rem 0 0', color: '#4b5563', fontSize: '0.9rem' }}>
                This usually means the link is from an old email or the server was restarted.
                Ask admin to <strong>Send Offer Letter</strong> again, then open only the newest link.
                Accepting that link auto-approves registration and activates your login.
              </p>
            )}
          </div>
        )}

        {done && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.9rem',
              borderRadius: 8,
              background: done.type === 'accepted' ? '#ecfdf5' : '#fef2f2',
              color: done.type === 'accepted' ? '#065f46' : '#991b1b',
            }}
          >
            <p style={{ margin: 0 }}>{done.message}</p>
            {done.type === 'accepted' && (
              <p style={{ marginBottom: 0, marginTop: '0.75rem' }}>
                You can now <Link to="/login">log in</Link> with your registered email and password.
              </p>
            )}
          </div>
        )}

        {!loading && !done && offer && !error && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button type="button" style={btn('primary')} disabled={busy} onClick={accept}>
              {busy ? 'Please wait…' : 'Accept Offer'}
            </button>
            <button type="button" style={btn('danger')} disabled={busy} onClick={decline}>
              Decline Offer
            </button>
          </div>
        )}

        {!loading && !offer && error && (
          <p style={{ marginTop: '1rem' }}>
            <Link to="/login">Return to login</Link>
          </p>
        )}
      </div>
    </div>
  );
}
