import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiBell, FiUserPlus, FiCalendar } from 'react-icons/fi';
import { API_ENDPOINTS } from '../../../utils/api';
import './layout.css';

const POLL_MS = 60000;

const formatWhen = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

/** Keep only items whose date falls in the current calendar month. */
const isInCurrentMonth = (value) => {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

const TopNavbar = () => {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState('Admin');
  const [profilePic, setProfilePic] = useState('');
  const [open, setOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const panelRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    setLoadingNotifs(true);
    try {
      const [usersRes, leavesRes] = await Promise.all([
        axios.get(API_ENDPOINTS.pendingUsers, { headers }).catch(() => ({ data: [] })),
        axios.get(API_ENDPOINTS.getAllLeaves, { headers }).catch(() => ({ data: [] })),
      ]);
      const users = (Array.isArray(usersRes.data) ? usersRes.data : []).filter((u) => {
        const when = u.createdAt || u.registeredAt || u.updatedAt;
        // No timestamp → still show (needs approval); otherwise current month only
        return !when || isInCurrentMonth(when);
      });
      // Pending leave only, and only for the current month
      const leaves = (Array.isArray(leavesRes.data) ? leavesRes.data : []).filter((l) => {
        const status = String(l.status || '').trim().toLowerCase();
        const isPending = status === 'pending' || status === '';
        if (!isPending) return false;
        const when = l.createdAt || l.fromDate || l.appliedAt || l.updatedAt;
        return !when || isInCurrentMonth(when);
      });
      setPendingUsers(users);
      setPendingLeaves(leaves);
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    let cancelled = false;
    const loadAdmin = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.getProfile, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const data = res.data || {};
        if (data.name) setAdminName(data.name);
        setProfilePic(data.profilePic || '');
      } catch {
        try {
          const raw = localStorage.getItem('user');
          if (!raw || cancelled) return;
          const u = JSON.parse(raw);
          if (u?.name) setAdminName(u.name);
          if (u?.profilePic) setProfilePic(u.profilePic);
        } catch {
          /* ignore */
        }
      }
    };

    const onProfileUpdated = (event) => {
      const detail = event?.detail || {};
      if (detail.name) setAdminName(detail.name);
      if (detail.profilePic !== undefined) setProfilePic(detail.profilePic || '');
    };

    loadAdmin();
    loadNotifications();
    const pollId = setInterval(loadNotifications, POLL_MS);
    window.addEventListener('admin-profile-updated', onProfileUpdated);
    return () => {
      cancelled = true;
      clearInterval(pollId);
      window.removeEventListener('admin-profile-updated', onProfileUpdated);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const notificationCount = pendingUsers.length + pendingLeaves.length;
  const firstName = adminName.split(' ')[0] || 'Admin';

  const openItem = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <header className="admin-topnav admin-topnav-v2">
      <div className="admin-topnav-welcome">
        <strong>Welcome back, {firstName}! 👋</strong>
        <span>Here&apos;s what&apos;s happening with your team today.</span>
      </div>

      <div className="admin-topnav-right">
        <div className="admin-topnav-bell-wrap" ref={panelRef}>
          <button
            type="button"
            className="admin-topnav-bell"
            aria-label="Notifications"
            aria-expanded={open}
            onClick={() => {
              setOpen((v) => !v);
              if (!open) loadNotifications();
            }}
          >
            <FiBell />
            {notificationCount > 0 && (
              <span className="admin-topnav-bell-badge">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {open && (
            <div className="admin-topnav-notif-panel" role="menu">
              <div className="admin-topnav-notif-head">
                <strong>Notifications</strong>
                <span>{notificationCount} new</span>
              </div>

              <div className="admin-topnav-notif-list">
                {loadingNotifs && notificationCount === 0 && (
                  <p className="admin-topnav-notif-empty">Loading…</p>
                )}

                {!loadingNotifs && notificationCount === 0 && (
                  <p className="admin-topnav-notif-empty">No new notifications</p>
                )}

                {pendingUsers.map((user) => (
                  <button
                    key={`user-${user._id}`}
                    type="button"
                    className="admin-topnav-notif-item"
                    onClick={() => openItem('/pending-users')}
                  >
                    <span className="admin-topnav-notif-icon is-user">
                      <FiUserPlus />
                    </span>
                    <span className="admin-topnav-notif-body">
                      <strong>New user joined</strong>
                      <span>
                        {user.name || 'Unnamed'}
                        {user.email ? ` · ${user.email}` : ''}
                      </span>
                      <em>{formatWhen(user.createdAt || user.registeredAt)}</em>
                    </span>
                  </button>
                ))}

                {pendingLeaves.map((leave) => (
                  <button
                    key={`leave-${leave._id}`}
                    type="button"
                    className="admin-topnav-notif-item"
                    onClick={() => openItem('/leave-requests')}
                  >
                    <span className="admin-topnav-notif-icon is-leave">
                      <FiCalendar />
                    </span>
                    <span className="admin-topnav-notif-body">
                      <strong>Leave pending approval</strong>
                      <span>
                        {leave.user?.name || 'Employee'}
                        {leave.leaveType ? ` · ${leave.leaveType}` : ''}
                      </span>
                      <em>{formatWhen(leave.createdAt)}</em>
                    </span>
                  </button>
                ))}
              </div>

              {notificationCount > 0 && (
                <div className="admin-topnav-notif-foot">
                  <button type="button" onClick={() => openItem('/pending-users')}>
                    Pending users
                  </button>
                  <button type="button" onClick={() => openItem('/leave-requests')}>
                    Leave requests
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="admin-topnav-profile"
          onClick={() => navigate('/admin-profile')}
          title="Edit profile"
          aria-label="Edit profile"
        >
          {profilePic ? (
            <img
              src={profilePic}
              alt=""
              className="admin-topnav-avatar admin-topnav-avatar-img"
            />
          ) : (
            <div className="admin-topnav-avatar" aria-hidden>
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="admin-topnav-profile-text">
            <strong>{adminName}</strong>
            <span>Administrator</span>
          </div>
        </button>
      </div>
    </header>
  );
};

export default TopNavbar;
