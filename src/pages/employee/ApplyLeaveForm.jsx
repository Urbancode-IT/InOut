import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../utils/api';
import {
  FORGOT_PUNCH_LEAVE_TYPE,
  MONTHLY_LEAVE_LIMITS,
  isForgotPunchLeaveType,
} from '../../utils/leaveTypes';
import './ApplyLeaveForm.css';

/** Parse leave dates in local calendar (avoids UTC shift on YYYY-MM-DD). */
function startOfLocalDay(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    const [y, m, d] = date.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function countDaysInMonth(fromDate, toDate, year, month) {
  const start = startOfLocalDay(fromDate);
  const end = startOfLocalDay(toDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (cursor.getFullYear() === year && cursor.getMonth() === month) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function monthsTouched(fromDate, toDate) {
  const start = startOfLocalDay(fromDate);
  const end = startOfLocalDay(toDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function usedDaysForType(leaves, leaveType, year, month) {
  return leaves
    .filter(
      (leave) =>
        leave.leaveType === leaveType &&
        leave.status !== 'Rejected'
    )
    .reduce(
      (sum, leave) => sum + countDaysInMonth(leave.fromDate, leave.toDate, year, month),
      0
    );
}

const ApplyLeaveForm = () => {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveType, setLeaveType] = useState('Casual');
  const [myLeaves, setMyLeaves] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    axios
      .get(API_ENDPOINTS.getMyLeaves, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setMyLeaves(Array.isArray(res.data) ? res.data : []))
      .catch(() => {
        // Quota UI is best-effort; backend still enforces on submit.
      });
  }, []);

  const now = new Date();
  const currentMonthUsed = useMemo(
    () => ({
      Casual: usedDaysForType(myLeaves, 'Casual', now.getFullYear(), now.getMonth()),
      Sick: usedDaysForType(myLeaves, 'Sick', now.getFullYear(), now.getMonth()),
      Emergency: usedDaysForType(myLeaves, 'Emergency', now.getFullYear(), now.getMonth()),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myLeaves]
  );

  const quotaBlockedMessage = useMemo(() => {
    if (!fromDate || !toDate) return null;
    if (MONTHLY_LEAVE_LIMITS[leaveType] == null) return null;
    if (new Date(fromDate) > new Date(toDate)) return null;

    const limit = MONTHLY_LEAVE_LIMITS[leaveType];
    for (const { year, month } of monthsTouched(fromDate, toDate)) {
      const used = usedDaysForType(myLeaves, leaveType, year, month);
      const requesting = countDaysInMonth(fromDate, toDate, year, month);
      if (used + requesting > limit) {
        const monthLabel = new Date(year, month, 1).toLocaleString('en-IN', {
          month: 'long',
          year: 'numeric',
        });
        return `Only ${limit} ${leaveType} leave day(s) allowed in ${monthLabel}. Already used: ${used}.`;
      }
    }
    return null;
  }, [fromDate, toDate, leaveType, myLeaves]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (new Date(fromDate) > new Date(toDate)) {
      toast.warning('Invalid Dates: From Date should not be after To Date.');
      return;
    }

    if (quotaBlockedMessage) {
      toast.error(quotaBlockedMessage);
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);
    try {
      const res = await axios.post(API_ENDPOINTS.applyLeave, {
        fromDate,
        toDate,
        reason,
        leaveType,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.inoutUnlocked) {
        toast.success(
          isForgotPunchLeaveType(leaveType)
            ? 'Submitted! In-Out unlocked. Marked Present for that day.'
            : 'Leave Applied! In-Out unlocked. You can check in and check out now.'
        );
      } else if (isForgotPunchLeaveType(leaveType)) {
        toast.success('Submitted! Forgot check-in/out recorded as Present.');
      } else {
        toast.success('Leave Applied! Your leave has been submitted successfully.');
      }

      navigate('/attendance');
    } catch (error) {
      console.error(error);
      const apiError = error.response?.data?.error;
      toast.error(apiError || 'Error: Failed to apply for leave');
    } finally {
      setSubmitting(false);
    }
  };

  const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const forgotPunch = isForgotPunchLeaveType(leaveType);

  return (
    <div className="leave-apply-page">
      <div className="leave-apply-shell">
        <div className="leave-apply-card">
          <h2 className="leave-apply-title">Apply for Leave</h2>

          <div className="leave-apply-quota">
            <p className="leave-apply-quota-title">Monthly quota ({monthName})</p>
            <ul className="leave-apply-quota-list">
              <li>
                <span>Casual Leave (CL)</span>
                <span>
                  {currentMonthUsed.Casual}/{MONTHLY_LEAVE_LIMITS.Casual} used
                </span>
              </li>
              <li>
                <span>Sick Leave (SL)</span>
                <span>
                  {currentMonthUsed.Sick}/{MONTHLY_LEAVE_LIMITS.Sick} used
                </span>
              </li>
              <li>
                <span>Emergency</span>
                <span>
                  {currentMonthUsed.Emergency}/{MONTHLY_LEAVE_LIMITS.Emergency} used
                </span>
              </li>
            </ul>
            <p className="leave-apply-quota-note">
              Each type allows 1 day per month. Forgot Check-In/Out has no quota and counts as
              Present in reports.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="leave-apply-form">
            <div className="leave-apply-row-2">
              <div className="leave-apply-field">
                <label className="leave-apply-label" htmlFor="leave-from-date">
                  From Date
                </label>
                <input
                  id="leave-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                  className="leave-apply-input"
                />
              </div>
              <div className="leave-apply-field">
                <label className="leave-apply-label" htmlFor="leave-to-date">
                  To Date
                </label>
                <input
                  id="leave-to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                  className="leave-apply-input"
                />
              </div>
            </div>

            <div className="leave-apply-field">
              <label className="leave-apply-label" htmlFor="leave-type">
                Type
              </label>
              <select
                id="leave-type"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="leave-apply-select"
              >
                <option value="Casual">Casual</option>
                <option value="Sick">Sick</option>
                <option value="Emergency">Emergency</option>
                <option value={FORGOT_PUNCH_LEAVE_TYPE}>{FORGOT_PUNCH_LEAVE_TYPE}</option>
              </select>
            </div>

            {forgotPunch && (
              <p className="leave-apply-hint">
                Use this if you came to office but forgot check-in / check-out. It unlocks In-Out
                and shows as Present (not Leave) in monthly reports.
              </p>
            )}

            <div className="leave-apply-field">
              <label className="leave-apply-label" htmlFor="leave-reason">
                Reason
              </label>
              <textarea
                id="leave-reason"
                placeholder={
                  forgotPunch
                    ? 'Brief note (e.g. forgot to punch, was in office)...'
                    : 'Brief reason for leave...'
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={4}
                className="leave-apply-textarea"
              />
            </div>

            {quotaBlockedMessage && (
              <p className="leave-apply-error">{quotaBlockedMessage}</p>
            )}

            <div className="leave-apply-actions">
              <button
                type="button"
                onClick={() => navigate('/attendance')}
                className="leave-apply-btn secondary"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || Boolean(quotaBlockedMessage)}
                className="leave-apply-btn primary"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeaveForm;
