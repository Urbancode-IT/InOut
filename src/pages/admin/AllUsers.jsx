import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { confirmToast } from '../../utils/interactiveToast';
import { FiMoreVertical, FiUserPlus } from 'react-icons/fi';
import { API_ENDPOINTS } from '../../utils/api';
// UserCard is used on the dedicated user detail page now
import { useNavigate, useLocation } from 'react-router-dom';
import Loader from '../../components/admin-dashboard/common/Loader';
import { getPrimaryWork, getUserWorks } from '../../utils/userWorks';
import {
  BRANCH_OPTIONS,
  buildUserUpdatePayload,
  getUserBranch,
  getBranchShortLabel,
  matchesBranchFilter,
  branchBadgeClass,
} from '../../utils/branches';
import { attendanceLockReasonLabel, isAttendanceLockedUser } from '../../utils/attendanceLock';

// module-level cache — survives component unmount/remount during navigation
let _cachedUsers = null;

const AllUsers = () => {
  const [users, setUsers] = useState(_cachedUsers || []);
  const [loading, setLoading] = useState(!_cachedUsers);
  const [updating, setUpdating] = useState(false);
  const [showPastModal, setShowPastModal] = useState(false);
  const [pastSearch, setPastSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterPosition, setFilterPosition] = useState('All');
  const [filterCompany, setFilterCompany] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(API_ENDPOINTS.getUsers, {
        headers: { Authorization: `Bearer ${token}` },
      });
      _cachedUsers = res.data || [];
      setUsers(_cachedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load (or re-mount with empty cache).
  useEffect(() => {
    fetchUsers();
  }, []);

  // Explicit refresh only when navigating back after an edit/add action.
  useEffect(() => {
    if (location.state?.userListRefresh) {
      _cachedUsers = null;
      setLoading(false);
      fetchUsers();
    }
  }, [location.state?.userListRefresh]);

  const closeActionMenu = () => {
    setOpenMenuId(null);
    setMenuAnchor(null);
  };

  const toggleActionMenu = (e, user) => {
    e.preventDefault();
    e.stopPropagation();
    if (openMenuId === user._id) {
      closeActionMenu();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setOpenMenuId(user._id);
    setMenuAnchor({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - 168),
    });
  };

  useEffect(() => {
    if (!openMenuId) return undefined;
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape') closeActionMenu();
    };
    const onScroll = () => closeActionMenu();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [openMenuId]);

  const menuUser = users.find((u) => u._id === openMenuId);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const updateUserStatus = async (user, isActive) => {
    const headers = getAuthHeaders();
    const { data: fullUser } = await axios.get(API_ENDPOINTS.getUserById(user._id), { headers });
    const payload = buildUserUpdatePayload({
      ...fullUser,
      isActive,
      ...(isActive ? { dateOfRelieving: null } : {}),
    });
    await axios.put(API_ENDPOINTS.updateUser(user._id), payload, { headers });
  };

  const handleToggleStatus = async (e, user) => {
    e.stopPropagation();
    const nextActive = !user.isActive;
    const actionLabel = nextActive ? 'enable' : 'disable';

    const confirmed = await confirmToast({
      title: `${nextActive ? 'Enable' : 'Disable'} user?`,
      text: `${user.name} (${user.employeeId || 'no ID'}) will be ${actionLabel}d.`,
      confirmText: nextActive ? 'Enable' : 'Disable',
      tone: nextActive ? 'success' : 'danger',
    });

    if (!confirmed) return;

    try {
      setUpdating(true);
      await updateUserStatus(user, nextActive);
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id
            ? { ...u, isActive: nextActive, ...(nextActive ? { dateOfRelieving: null } : {}) }
            : u
        )
      );
      toast.success(`Success: User ${actionLabel}d successfully.`);
    } catch (error) {
      console.error('Failed to update user status:', error);
      const apiMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.msg;
      toast.error(`Error: ${apiMsg || `Could not ${actionLabel} user.`}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleUnlockAttendance = async (user) => {
    if (!user?._id) return;

    const confirmed = await confirmToast({
      title: 'Unlock attendance?',
      text: `Unlock attendance access for ${user.name}?`,
      confirmText: 'Unlock',
      tone: 'success',
    });
    if (!confirmed) return;

    try {
      setUpdating(true);
      await axios.post(
        API_ENDPOINTS.unlockAttendance(user._id),
        {},
        { headers: getAuthHeaders() }
      );
      setUsers((prev) => {
        const next = prev.map((u) =>
          u._id === user._id
            ? {
                ...u,
                attendanceLocked: false,
                isAttendanceLocked: false,
                inoutBlocked: false,
                inoutBlockedAt: null,
                inoutBlockedForDate: null,
              }
            : u
        );
        _cachedUsers = next;
        return next;
      });
      toast.success(`Attendance unlocked for ${user.name}`);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to unlock attendance:', error);
      const apiMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.msg;
      toast.error(`Error: ${apiMsg || 'Could not unlock attendance.'}`);
    } finally {
      setUpdating(false);
    }
  };

  const isPastEmployee = (user) => !user.isActive || !!user.dateOfRelieving;

  const matchesPastSearch = (user) => {
    if (!pastSearch.trim()) return true;
    const q = pastSearch.trim().toLowerCase();
    return (
      (user.name || '').toLowerCase().includes(q) ||
      (user.employeeId || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q)
    );
  };

  if (loading) return <Loader />;

  // Show active users first, then inactive users
  const sortedUsers = [...(users || [])].sort((a, b) => {
    if (a.isActive === b.isActive) return 0;
    return a.isActive ? -1 : 1; // active (true) comes before inactive (false)
  });

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return '-';
      return dt.toLocaleDateString();
    } catch (err) {
      return '-';
    }
  };

  // derive unique options for filters
  const departments = Array.from(new Set(users.map(u => u.department).filter(Boolean))).sort();
  const positions = Array.from(new Set(users.map(u => u.position).filter(Boolean))).sort();
  const companies = Array.from(new Set(users.map(u => u.company).filter(Boolean))).sort();

  const matchesSearch = (user) => {
    if (!searchTerm) return true;
    const q = searchTerm.trim().toLowerCase();
    return (
      (user.name || '').toLowerCase().includes(q) ||
      (user.employeeId || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q)
    );
  };

  const matchesFilters = (user) => {
    if (filterDept !== 'All' && (user.department || '') !== filterDept) return false;
    if (filterPosition !== 'All' && (user.position || '') !== filterPosition) return false;
    if (filterCompany !== 'All' && (user.company || '') !== filterCompany) return false;
    if (filterStatus !== 'All') {
      const isActive = !!user.isActive;
      if (filterStatus === 'Active' && !isActive) return false;
      if (filterStatus === 'Inactive' && isActive) return false;
    }
    if (!matchesBranchFilter(user, filterBranch)) return false;
    return true;
  };

  const filteredUsers = sortedUsers.filter(u => matchesSearch(u) && matchesFilters(u));
  const pastEmployees = sortedUsers
    .filter(isPastEmployee)
    .filter(matchesPastSearch);

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    inactive: users.filter((u) => !u.isActive).length,
    showing: filteredUsers.length,
    multiWork: users.filter((u) => getUserWorks(u).length > 1).length,
  };

  return (
    <div className="uc-users-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 className="uc-page-title" style={{ margin: 0 }}>All Users</h1>
        <button
          type="button"
          className="uc-btn uc-btn-primary"
          onClick={() => navigate('/add-user')}
          title="Add User"
          aria-label="Add User"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FiUserPlus size={16} strokeWidth={2.5} />
          Add User
        </button>
      </div>

      <div className="uc-users-stats">
        <div className="uc-stat-card uc-stat-slate">
          <p className="uc-stat-label">Total Users</p>
          <p className="uc-stat-value">{stats.total}</p>
        </div>
        <div className="uc-stat-card uc-stat-green">
          <p className="uc-stat-label">Active</p>
          <p className="uc-stat-value">{stats.active}</p>
        </div>
        <div className="uc-stat-card uc-stat-red">
          <p className="uc-stat-label">Inactive</p>
          <p className="uc-stat-value">{stats.inactive}</p>
        </div>
        <div className="uc-stat-card uc-stat-indigo">
          <p className="uc-stat-label">Filtered Results</p>
          <p className="uc-stat-value">{stats.showing}</p>
        </div>
      </div>

      <div className="uc-users-toolbar">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or employee ID"
          className="uc-input uc-users-search"
        />

        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="uc-select uc-users-filter-select">
          <option value="All">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} className="uc-select uc-users-filter-select">
          <option value="All">All Companies</option>
          {companies.map((company) => (
            <option key={company} value={company}>{company}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="uc-select uc-users-filter-select">
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="uc-select uc-users-filter-select">
          <option value="All">All Branches</option>
          {BRANCH_OPTIONS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            setSearchTerm('');
            setFilterDept('All');
            setFilterPosition('All');
            setFilterCompany('All');
            setFilterStatus('All');
            setFilterBranch('All');
          }}
          className="uc-btn uc-btn-outline uc-users-toolbar-btn"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={() => { setPastSearch(''); setShowPastModal(true); }}
          className="uc-btn uc-btn-slate uc-users-toolbar-btn"
        >
          Past Employees ({users.filter(isPastEmployee).length})
        </button>
      </div>

      <div className="uc-users-table-wrap">
          <table className="uc-users-table">
          <thead>
            <tr>
              <th style={{ width: '3rem' }}>S.No</th>
              <th style={{ width: '12%' }}>ID</th>
              <th style={{ width: '22%' }}>Name</th>
              <th style={{ width: '12%' }}>Branch</th>
              <th style={{ width: '14%' }}>Dept</th>
              <th style={{ width: '18%' }}>Role</th>
              <th className="uc-users-status-col">Status</th>
              <th className="uc-users-actions-cell" />
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, idx) => (
              <tr
                key={user._id}
                className={user.isActive ? '' : 'inactive'}
                onClick={() => navigate(`/all-users/${user._id}`)}
              >
                <td>{idx + 1}</td>
                <td title={user.employeeId}>{user.employeeId || '-'}</td>
                <td style={{ fontWeight: 500 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
                    <img
                      src={user.profilePic || '/default-avatar.png'}
                      alt={user.name}
                      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/default-avatar.png';
                      }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={user.name}>{user.name}</span>
                  </span>
                </td>
                <td className="uc-users-branch-cell">
                  {getUserBranch(user) ? (
                    <span
                      className={branchBadgeClass(getUserBranch(user))}
                      title={getUserBranch(user)}
                    >
                      {getBranchShortLabel(getUserBranch(user))}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td title={getPrimaryWork(user).department || user.department}>
                    {getPrimaryWork(user).department || user.department || '-'}
                    {getUserWorks(user).length > 1 && ` +${getUserWorks(user).length - 1}`}
                </td>
                <td title={getPrimaryWork(user).position || user.position}>
                    {getPrimaryWork(user).position || user.position || '-'}
                    {getUserWorks(user).length > 1 && ` +${getUserWorks(user).length - 1}`}
                </td>
                <td className="uc-users-status-cell">
                  <span className={`uc-status-badge${user.isActive ? ' is-active' : ' is-inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {isAttendanceLockedUser(user) && (
                    <span className="uc-status-badge is-locked" title={attendanceLockReasonLabel(user)}>
                      Locked
                    </span>
                  )}
                </td>
                <td className="uc-users-actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => toggleActionMenu(e, user)}
                    className={`uc-menu-trigger${openMenuId === user._id ? ' is-open' : ''}`}
                    aria-label={`Actions for ${user.name}`}
                    aria-expanded={openMenuId === user._id}
                  >
                    <FiMoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
      </div>

      {openMenuId && menuAnchor && menuUser && createPortal(
        <>
          <div className="uc-dropdown-backdrop" onClick={closeActionMenu} role="presentation" />
          <div
            className="uc-actions-dropdown"
            style={{ top: menuAnchor.top, left: menuAnchor.left }}
            onClick={(e) => e.stopPropagation()}
            role="menu"
          >
            <button
              type="button"
              className="uc-dropdown-item"
              onClick={() => {
                closeActionMenu();
                navigate(`/all-users/${menuUser._id}`);
              }}
            >
              View Profile
            </button>
            <button
              type="button"
              className="uc-dropdown-item"
              onClick={() => {
                closeActionMenu();
                navigate(`/all-users/${menuUser._id}/edit`);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="uc-dropdown-item"
              disabled={updating}
              style={{ color: menuUser.isActive ? '#dc2626' : '#16a34a' }}
              onClick={(e) => {
                closeActionMenu();
                handleToggleStatus(e, menuUser);
              }}
            >
              {menuUser.isActive ? 'Disable' : 'Enable'}
            </button>
            {isAttendanceLockedUser(menuUser) && (
              <button
                type="button"
                className="uc-dropdown-item"
                disabled={updating}
                style={{ color: '#b45309' }}
                onClick={() => {
                  closeActionMenu();
                  handleUnlockAttendance(menuUser);
                }}
              >
                Unlock Attendance
              </button>
            )}
          </div>
        </>,
        document.body
      )}

      {showPastModal && (
        <div className="uc-modal-backdrop" onClick={() => setShowPastModal(false)}>
          <div className="uc-modal" style={{ maxWidth: '56rem' }} onClick={(e) => e.stopPropagation()}>
            <div className="uc-modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Past Employees</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>Inactive or relieved employees</p>
              </div>
              <button type="button" onClick={() => setShowPastModal(false)} className="uc-btn uc-btn-outline" aria-label="Close">
                &times;
              </button>
            </div>

            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
              <input
                value={pastSearch}
                onChange={(e) => setPastSearch(e.target.value)}
                placeholder="Search past employees..."
                className="uc-input"
              />
            </div>

            <div className="uc-modal-body">
              {pastEmployees.length === 0 ? (
                <p className="uc-table-empty">No past employees found.</p>
              ) : (
                <table className="uc-table">
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Relieved</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastEmployees.map((user) => (
                      <tr
                        key={user._id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setShowPastModal(false);
                          navigate(`/all-users/${user._id}`);
                        }}
                      >
                        <td>{user.employeeId || '-'}</td>
                        <td style={{ fontWeight: 500 }}>{user.name}</td>
                        <td>{getPrimaryWork(user).department || user.department || '-'}</td>
                        <td>{getPrimaryWork(user).position || user.position || '-'}</td>
                        <td>{formatDate(user.dateOfRelieving)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(e, user)}
                            disabled={updating}
                            className="uc-btn uc-btn-primary"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          >
                            Enable
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllUsers;
