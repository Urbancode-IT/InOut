import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FiSearch, FiCalendar, FiRefreshCw } from 'react-icons/fi';
import AttendanceTable from '../../components/admin-dashboard/attendance/AttendanceTable';
import { API_ENDPOINTS } from '../../utils/api';
import Loader from '../../components/admin-dashboard/common/Loader';
import { localDateYMD } from '../../utils/localDate';
import { normalizeId } from '../../utils/dashboardLogs';
import {
  BRANCH_OPTIONS,
  logMatchesBranchFilter,
  matchesBranchFilter,
} from '../../utils/branches';
import '../../styles/dashboard-ui.css';

const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(() => localDateYMD());
  const [filterBranch, setFilterBranch] = useState('All');
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchAttendanceAndUsers = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [attRes, usersRes] = await Promise.all([
          axios.get(API_ENDPOINTS.getAttendanceAll, { headers }),
          axios.get(API_ENDPOINTS.getUsers, { headers }),
        ]);
        if (cancelled) return;
        setRecords(Array.isArray(attRes.data) ? attRes.data : []);
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        if (!cancelled) {
          setRecords([]);
          setUsers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAttendanceAndUsers();
    return () => {
      cancelled = true;
    };
  }, [refreshNonce]);

  const usersForBranch = useMemo(() => {
    if (filterBranch === 'All') return users;
    return users.filter((u) => matchesBranchFilter(u, filterBranch));
  }, [users, filterBranch]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byId = new Map(users.map((u) => [normalizeId(u._id), u]));
    const day = dateFilter;

    return (records || []).filter((record) => {
      const recordDay = localDateYMD(record.timestamp);
      if (day && recordDay !== day) return false;

      if (filterBranch !== 'All') {
        if (!logMatchesBranchFilter(record, users, filterBranch)) return false;
      }

      if (!q) return true;

      const nested = record.user && typeof record.user === 'object' ? record.user : null;
      const user =
        byId.get(
          normalizeId(
            record.userId ||
              nested?._id ||
              (typeof record.user === 'string' ? record.user : '')
          )
        ) || nested;

      const haystack = [
        user?.name,
        user?.email,
        user?.employeeId,
        record.employeeName,
        record.name,
        record.email,
        record.employeeId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [records, users, search, dateFilter, filterBranch]);

  const dateLabel = useMemo(() => {
    const m = String(dateFilter || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return dateFilter || '—';
    return `${m[3]}-${m[2]}-${m[1]}`;
  }, [dateFilter]);

  if (loading) return <Loader />;

  return (
    <div className="uc-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Attendance Records</h1>
        <p className="text-sm text-gray-500 mt-1">
          One day view for all employees — currently showing{' '}
          <span className="font-medium text-gray-700">{dateLabel}</span>
          {filterBranch !== 'All' ? ` · ${filterBranch}` : ' · All Branches'}.
        </p>
      </div>

      <div className="dash-filters mb-4">
        <div className="dash-field">
          <FiSearch />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search employees"
          />
        </div>

        <div className="dash-field">
          <FiCalendar />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Attendance date"
          />
        </div>

        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="dash-select"
          aria-label="Branch filter"
        >
          <option value="All">All Branches</option>
          {BRANCH_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="dash-btn-primary"
          onClick={() => setRefreshNonce((n) => n + 1)}
        >
          <FiRefreshCw size={18} />
          Refresh Data
        </button>
      </div>

      <AttendanceTable
        records={filteredRecords}
        users={usersForBranch}
        allRecords={records}
      />
    </div>
  );
};

export default Attendance;
