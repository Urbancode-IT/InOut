import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../utils/api';

/** Matches backend policy: 1 Sick + 1 Casual + 1 Emergency day per calendar month. */
const MONTHLY_LEAVE_LIMITS = { Casual: 1, Sick: 1, Emergency: 1 };

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
      await axios.post(API_ENDPOINTS.applyLeave, {
        fromDate,
        toDate,
        reason,
        leaveType,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Leave Applied! Your leave has been submitted successfully.');

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-xl rounded-3xl p-8 max-w-lg w-full transition-all duration-300 border border-blue-100">
        <h2 className="text-2xl font-bold text-center text-indigo-700 mb-6">Apply for Leave</h2>

        <div className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-900">
          <p className="font-semibold mb-1">Monthly quota ({monthName})</p>
          <p>Casual Leave (CL): {currentMonthUsed.Casual}/{MONTHLY_LEAVE_LIMITS.Casual} used</p>
          <p>Sick Leave (SL): {currentMonthUsed.Sick}/{MONTHLY_LEAVE_LIMITS.Sick} used</p>
          <p>Emergency: {currentMonthUsed.Emergency}/{MONTHLY_LEAVE_LIMITS.Emergency} used</p>
          <p className="mt-1 text-xs text-indigo-700/80">
            Each type allows 1 day per month (CL, SL, Emergency). An extra or multi-day request of the same type is blocked.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-600 font-medium mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              required
              className="w-full rounded-xl border px-4 py-2 outline-indigo-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-medium mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              required
              className="w-full rounded-xl border px-4 py-2 outline-indigo-500 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-medium mb-1">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full rounded-xl border px-4 py-2 outline-indigo-500 shadow-sm"
            >
              <option value="Casual">Casual</option>
              <option value="Sick">Sick</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 font-medium mb-1">Reason</label>
            <textarea
              placeholder="Brief reason for leave..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={4}
              className="w-full rounded-xl border px-4 py-2 outline-indigo-500 shadow-sm"
            />
          </div>

          {quotaBlockedMessage && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {quotaBlockedMessage}
            </p>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => navigate('/attendance')}
              className="bg-gray-200 text-gray-800 px-5 py-2 rounded-xl hover:bg-gray-300 transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting || Boolean(quotaBlockedMessage)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyLeaveForm;
