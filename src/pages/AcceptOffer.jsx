import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../utils/api';
import './AcceptOffer.css';

const formatJoiningDate = (value) => {
  if (!value) return '—';
  const raw = String(value).trim();
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatSalary = (value) => {
  if (value == null || value === '') return '—';
  const raw = String(value).trim();
  const num = Number(raw.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(num) || num <= 0) return raw;
  return `₹ ${num.toLocaleString('en-IN')}`;
};

const statusClass = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('accept')) return 'is-accepted';
  if (s.includes('declin')) return 'is-declined';
  return 'is-pending';
};

const DetailRow = ({ label, value }) => {
  if (value == null || value === '') return null;
  return (
    <div className="accept-offer-row">
      <p className="accept-offer-label">{label}</p>
      <p className="accept-offer-value">{value}</p>
    </div>
  );
};

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

  const offerStatus = offer?.offerStatus || (done?.type === 'accepted' ? 'Accepted' : done?.type === 'declined' ? 'Declined' : '');
  const alreadyAccepted =
    done?.type === 'accepted' || /accept/i.test(String(offer?.offerStatus || ''));
  const alreadyDeclined =
    done?.type === 'declined' || /declin/i.test(String(offer?.offerStatus || ''));

  const headSubtitle = alreadyAccepted
    ? 'Your offer has been confirmed. Welcome to the team.'
    : alreadyDeclined
      ? 'This offer was declined.'
      : 'Review your offer details, then accept or decline.';

  return (
    <div className="accept-offer-page">
      <div className="accept-offer-shell">
        <div className="accept-offer-brand">
          <div className="accept-offer-brand-mark" aria-hidden>
            UC
          </div>
          <div className="accept-offer-brand-text">Urbancode Edutech</div>
        </div>

        <div className="accept-offer-card">
          <div className="accept-offer-card-head">
            <p className="accept-offer-eyebrow">Employment offer</p>
            <h1 className="accept-offer-title">
              {alreadyAccepted
                ? 'Offer accepted'
                : alreadyDeclined
                  ? 'Offer declined'
                  : 'Offer letter response'}
            </h1>
            <p className="accept-offer-subtitle">{headSubtitle}</p>
          </div>

          <div className="accept-offer-body">
            {loading && <p className="accept-offer-loading">Loading offer details…</p>}

            {!loading && offer && (
              <div className="accept-offer-details">
                <DetailRow label="Employee name" value={offer.employeeName || '—'} />
                <DetailRow label="Designation" value={offer.designation || '—'} />
                <DetailRow label="Department" value={offer.department || '—'} />
                <DetailRow label="Company" value={offer.company || '—'} />
                <DetailRow label="Salary / CTC" value={formatSalary(offer.salary)} />
                <DetailRow label="Joining date" value={formatJoiningDate(offer.joiningDate)} />
                <DetailRow label="Employment type" value={offer.employmentType} />
                <DetailRow label="Work location" value={offer.workLocation} />
                <DetailRow label="Reporting manager" value={offer.reportingManager} />
                <DetailRow label="Probation" value={offer.probationPeriod} />
                <DetailRow label="Notice period" value={offer.noticePeriod} />
                <div className="accept-offer-row">
                  <p className="accept-offer-label">Offer status</p>
                  <p className="accept-offer-value">
                    <span className={`accept-offer-status ${statusClass(offerStatus)}`}>
                      {offerStatus || '—'}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="accept-offer-error">
                <p>{error}</p>
                {/invalid|unknown|expired/i.test(error) && (
                  <p className="accept-offer-error-hint">
                    This usually means the link is from an old email. Ask admin to send the offer
                    letter again, then open only the newest link.
                  </p>
                )}
              </div>
            )}

            {alreadyAccepted && (
              <div className="accept-offer-banner is-ok">
                <p className="accept-offer-banner-title">You&apos;re all set</p>
                <p className="accept-offer-banner-text">
                  Your employee account is active. Sign in with your registered email and password.
                </p>
              </div>
            )}

            {alreadyDeclined && (
              <div className="accept-offer-banner is-bad">
                <p className="accept-offer-banner-title">Offer declined</p>
                <p className="accept-offer-banner-text">
                  {done?.message ||
                    'This offer was declined. Contact HR if you need a new offer.'}
                </p>
              </div>
            )}

            {!loading && !done && offer && !error && !alreadyAccepted && !alreadyDeclined && (
              <div className="accept-offer-actions">
                <button
                  type="button"
                  className="accept-offer-btn primary"
                  disabled={busy}
                  onClick={accept}
                >
                  {busy ? 'Please wait…' : 'Accept offer'}
                </button>
                <button
                  type="button"
                  className="accept-offer-btn danger"
                  disabled={busy}
                  onClick={decline}
                >
                  Decline offer
                </button>
              </div>
            )}

            {(alreadyAccepted || (!loading && !offer && error)) && (
              <div className="accept-offer-actions">
                <Link to="/login" className="accept-offer-btn primary">
                  Go to login
                </Link>
              </div>
            )}

            {alreadyDeclined && (
              <div className="accept-offer-actions">
                <Link to="/login" className="accept-offer-btn ghost">
                  Return to login
                </Link>
              </div>
            )}
          </div>
        </div>

        <p className="accept-offer-footer">Urbancode Edutech Solutions Pvt. Ltd.</p>
      </div>
    </div>
  );
}
