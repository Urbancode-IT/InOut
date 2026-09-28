import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../utils/api';
import RecentAttendanceTable from '../../components/admin-dashboard/dashboard/RecentAttendanceTable';
import DashboardCards from '../../components/admin-dashboard/dashboard/DashboardCards';
import Loader from '../../components/admin-dashboard/common/Loader';
import { FiSearch, FiCalendar, FiRefreshCw } from 'react-icons/fi';
import AbsentUsersList from '../../components/admin-dashboard/dashboard/AbsentUsersList';
import LockedUsersPanel from '../../components/admin-dashboard/dashboard/LockedUsersPanel';
import ReportGenerator from '../../components/admin-dashboard/dashboard/ReportGenerator';
import { BRANCH_OPTIONS, logMatchesBranchFilter, matchesBranchFilter } from '../../utils/branches';
import { isSameLocalDay, localDateYMD } from '../../utils/localDate';
import {
  buildSummaryFromLogs,
  enrichLogNames,
  filterLogsByDate,
  normalizeLogs,
} from '../../utils/dashboardLogs';
import '../../styles/dashboard-ui.css';

const fetchDashboardLogs = async (dateFilter, headers, users = []) => {
  const datedUrl = `${API_ENDPOINTS.getRecentDashboardLogs}?date=${encodeURIComponent(dateFilter)}&_=${Date.now()}`;
  try {
    const datedRes = await axios.get(datedUrl, { headers });
    const dated = filterLogsByDate(normalizeLogs(datedRes.data), dateFilter);
    if (dated.length > 0) return dated;
  } catch {
    /* try wider window */
  }

  try {
    const wideUrl = `${API_ENDPOINTS.getRecentDashboardLogs}?days=365&_=${Date.now()}`;
    const wideRes = await axios.get(wideUrl, { headers });
    const filtered = filterLogsByDate(normalizeLogs(wideRes.data), dateFilter);
    if (filtered.length > 0) return filtered;
  } catch {
    /* try by-date route */
  }

  try {
    const byDateRes = await axios.get(
      `${API_ENDPOINTS.getAttendanceByDate(dateFilter)}?_=${Date.now()}`,
      { headers }
    );
    const byDate = filterLogsByDate(normalizeLogs(byDateRes.data), dateFilter);
    if (byDate.length > 0) return byDate;
  } catch {
    /* try full history */
  }

  return [];
};

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(() => localDateYMD());
  const [typeFilter] = useState('all');
  const [locationFilter] = useState('all');
  const [companyFilter] = useState('all');
  const [filterBranch, setFilterBranch] = useState('All');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const token = localStorage.getItem('token');
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    localStorage.removeItem('dashboard_cache');
    localStorage.removeItem('dashboard_cache_time');
  }, []);

  useEffect(() => {
    if (!token || !dateFilter) return undefined;

    const loadDashboard = async () => {
      setLoading(true);
      setFetchError('');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      };

      try {
        let users = [];
        let logsData = [];

        try {
          const usersRes = await axios.get(`${API_ENDPOINTS.getUsers}?_=${Date.now()}`, { headers });
          users = Array.isArray(usersRes.data) ? usersRes.data : [];
          setAllUsers(users);
        } catch (userErr) {
          console.error('Dashboard users error:', userErr);
          setFetchError('Could not load employee list. Try Refresh Data.');
        }

        try {
          const logsRaw = await fetchDashboardLogs(dateFilter, headers, users);
          logsData = enrichLogNames(logsRaw, users);
          setLogs(logsData);
          setFilteredLogs(logsData);
        } catch (logErr) {
          console.error('Dashboard logs error:', logErr);
          setLogs([]);
          setFilteredLogs([]);
          const msg = logErr.response?.data?.msg || logErr.response?.data?.error;
          if (logErr.response?.status === 403) {
            setFetchError('Admin access only. Log out and sign in with an admin account.');
          } else if (logErr.response?.status === 401) {
            setFetchError('Session expired. Please log in again.');
          } else {
            setFetchError((prev) => prev || msg || 'Could not load attendance for this date. Try Refresh Data.');
          }
        }

        setSummary(buildSummaryFromLogs(logsData, users, dateFilter));
        if (logsData.length > 0) {
          setFetchError((prev) => (prev?.includes('employee list') ? prev : ''));
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [token, dateFilter, refreshNonce]);

  useEffect(() => {
    let result = [...logs];

    if (search.trim()) {
      const keyword = search.toLowerCase();
      result = result.filter(
        (log) =>
          log.employeeName?.toLowerCase().includes(keyword) ||
          String(log.employeeId || '').toLowerCase().includes(keyword)
      );
    }

    if (dateFilter) {
      result = result.filter((log) => isSameLocalDay(log.timestamp, dateFilter));
    }

    if (typeFilter !== 'all') {
      result = result.filter((log) => log.type === typeFilter);
    }

    if (locationFilter !== 'all') {
      const isInOffice = locationFilter === 'office';
      result = result.filter((log) => log.isInOffice === isInOffice);
    }

    if (companyFilter !== 'all') {
      result = result.filter((log) => log.company === companyFilter);
    }

    if (filterBranch !== 'All') {
      result = result.filter((log) => logMatchesBranchFilter(log, allUsers, filterBranch));
    }

    setFilteredLogs(result);
  }, [logs, search, dateFilter, typeFilter, locationFilter, companyFilter, filterBranch, allUsers]);

  const logsForSelectedDate = logs.filter((log) => isSameLocalDay(log.timestamp, dateFilter));
  const isSelectedToday = isSameLocalDay(dateFilter, localDateYMD());
  const dateLabel = (() => {
    const m = String(dateFilter || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : dateFilter;
  })();

  const usersForBranch =
    filterBranch === 'All'
      ? allUsers
      : allUsers.filter((u) => matchesBranchFilter(u, filterBranch));

  if (loading) return <Loader />;

  return (
    <div className="uc-page dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">
            {isSelectedToday ? "Today's Attendance Report" : 'Attendance Report'}
          </h1>
          <p className="dash-breadcrumb">
            {isSelectedToday
              ? "Dashboard • Today's Attendance"
              : `Dashboard • ${dateLabel}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LockedUsersPanel
            users={allUsers}
            onUnlocked={(userId) => {
              setAllUsers((prev) =>
                prev.map((user) =>
                  user._id === userId
                    ? {
                        ...user,
                        attendanceLocked: false,
                        isAttendanceLocked: false,
                        inoutBlocked: false,
                        inoutBlockedAt: null,
                        inoutBlockedForDate: null,
                      }
                    : user
                )
              );
            }}
          />
          <ReportGenerator
            logs={filteredLogs}
            allUsers={allUsers}
            selectedDate={dateFilter}
          />
        </div>
      </div>

      {summary && <DashboardCards data={summary} isToday={isSelectedToday} />}

      {fetchError && (
        <div className="dash-alert" role="alert">
          {fetchError}
        </div>
      )}

      <div className="dash-filters">
        <div className="dash-field">
          <FiSearch />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="dash-field">
          <FiCalendar />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="dash-select"
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

      <RecentAttendanceTable logs={filteredLogs} selectedDate={dateFilter} />
      <AbsentUsersList allUsers={usersForBranch} logs={logsForSelectedDate} dateFilter={dateFilter} />
    </div>
  );
};

export default Dashboard;
