import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import './layout.css';
import { logoutUser, API_ENDPOINTS } from '../../../utils/api';
import {
  FiHome,
  FiUsers,
  FiCalendar,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiCheckCircle,
  FiFolder,
  FiChevronRight,
  FiClock,
  FiMapPin,
} from 'react-icons/fi';

export const APP_BUILD = 'v2026.09.15-payslip';

const menuItems = [
  { label: 'Dashboard', icon: <FiHome />, path: '/dashboard', tone: 'purple' },
  {
    label: 'Reports',
    icon: <FiBarChart2 />,
    tone: 'purple',
    subItems: [
      { label: 'Monthly Reports', path: '/reports' },
      { label: 'Payslip Generator', path: '/payslip' },
      { label: 'Pay History', path: '/salaryhistory' },
    ],
  },
  { label: 'Employees', icon: <FiUsers />, path: '/all-users', tone: 'green' },
  {
    label: 'Attendance',
    icon: <FiCheckCircle />,
    tone: 'violet',
    subItems: [
      { label: 'Attendance Logs', path: '/attendances' },
      { label: 'Holiday List', path: '/holidays' },
    ],
  },
  {
    label: 'Leaves & Lates',
    icon: <FiMapPin />,
    tone: 'orange',
    subItems: [
      { label: 'Leave Records', path: '/leave-requests' },
      { label: 'Late comments', path: '/comments' },
    ],
  },
  { label: 'Schedule', icon: <FiCalendar />, path: '/employees', tone: 'blue' },
  {
    label: 'Approvals',
    icon: <FiClock />,
    path: '/pending-users',
    tone: 'pink',
    badgeKey: 'pending',
  },
  {
    label: 'Documents',
    icon: <FiFolder />,
    tone: 'sky',
    subItems: [
      { label: 'All Letters', path: '/all-letters' },
      { label: 'Generate Letter', path: '/letter-generator' },
      { label: 'Upload Documents', path: '/upload-documents' },
    ],
  },
  { label: 'Settings', icon: <FiSettings />, path: '/coming-soon/settings', tone: 'gray' },
];

const Sidebar = ({ expanded, onExpand, onCollapse }) => {
  const [expandedItems, setExpandedItems] = useState({
    'Leaves & Lates': true,
  });
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    let cancelled = false;
    const loadPending = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.pendingUsers, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setPendingCount(Array.isArray(res.data) ? res.data.length : 0);
        }
      } catch {
        if (!cancelled) setPendingCount(0);
      }
    };

    loadPending();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleItem = (label) => {
    setExpandedItems((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleLogout = async () => {
    await logoutUser();
    window.location.href = '/login';
  };

  return (
    <aside
      className={`admin-sidebar admin-sidebar-v2${expanded ? ' is-expanded' : ''}`}
      onMouseEnter={onExpand}
      onMouseLeave={onCollapse}
    >
      <NavLink
        to="/dashboard"
        className="admin-sidebar-brand admin-sidebar-brand-v2"
        title="Go to Dashboard"
      >
        <img src="/inout-logo.png" alt="InOut" className="admin-brand-logo" />
      </NavLink>

      <nav className="admin-sidebar-nav admin-sidebar-nav-v2">
        {menuItems.map((item) => {
          if (item.subItems) {
            const open = Boolean(expandedItems[item.label]);
            return (
              <div key={item.label} className="admin-nav-group">
                <button
                  type="button"
                  onClick={() => toggleItem(item.label)}
                  className="admin-nav-btn admin-nav-btn-v2"
                  title={item.label}
                >
                  <span className={`admin-nav-icon tone-${item.tone}`}>{item.icon}</span>
                  <span className="admin-nav-label">{item.label}</span>
                  <FiChevronRight className={`admin-nav-chevron ${open ? 'is-open' : ''}`} />
                </button>

                {open && expanded && (
                  <div className="admin-nav-submenu">
                    {item.subItems.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `admin-nav-sublink${isActive ? ' active' : ''}`
                        }
                      >
                        {subItem.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const badge =
            item.badgeKey === 'pending' && pendingCount > 0 ? pendingCount : null;

          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `admin-nav-link admin-nav-link-v2${isActive ? ' active' : ''}`
              }
              title={item.label}
            >
              <span className={`admin-nav-icon tone-${item.tone}`}>{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
              {badge != null && <span className="admin-nav-badge">{badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="admin-nav-logout-wrap admin-nav-footer-v2">
        <button
          type="button"
          onClick={handleLogout}
          className="admin-nav-btn admin-nav-logout"
          title="Logout"
        >
          <FiLogOut />
          <span className="admin-nav-label">Logout</span>
        </button>

        <span className="admin-build-tag">{APP_BUILD}</span>
      </div>
    </aside>
  );
};

export default Sidebar;
