import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiArrowLeft,
  FiCheck,
  FiCopy,
  FiLink,
  FiLogOut,
  FiUser,
} from 'react-icons/fi';
import { logoutUser } from '../../utils/api';
import './EmployeeSettings.css';

const EmployeeSettings = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const registrationUrl = useMemo(
    () => `${window.location.origin}/register`,
    []
  );

  const handleCopyRegisterLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(registrationUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = registrationUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success('Registration link copied');
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy registration link:', err);
      toast.error('Could not copy registration link');
    }
  };

  const onLogout = async () => {
    try {
      await logoutUser();
    } catch {
      /* ignore */
    }
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="emp-settings-page">
      <button
        type="button"
        className="emp-settings-back"
        onClick={() => navigate('/attendance')}
      >
        <FiArrowLeft /> Back
      </button>

      <h1 className="emp-settings-title">Settings</h1>
      <p className="emp-settings-subtitle">
        Share registration link and open other account tools.
      </p>

      <section className="emp-settings-card">
        <h2 className="emp-settings-card-title">
          <FiLink />
          Registration link
        </h2>
        <p className="emp-settings-card-desc">
          Copy this link to share the employee registration form.
        </p>
        <div className="emp-settings-link-row">
          <input
            className="emp-settings-link-input"
            type="text"
            value={registrationUrl}
            readOnly
            aria-label="Registration link"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            className="emp-settings-copy-btn"
            onClick={handleCopyRegisterLink}
          >
            {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </section>

      <section className="emp-settings-card">
        <h2 className="emp-settings-card-title">Account</h2>
        <div className="emp-settings-actions">
          <button
            type="button"
            className="emp-settings-action-btn"
            onClick={() => navigate('/profile')}
          >
            <span className="emp-settings-action-icon">
              <FiUser />
            </span>
            My Profile
          </button>
          <button
            type="button"
            className="emp-settings-action-btn is-danger"
            onClick={onLogout}
          >
            <span className="emp-settings-action-icon">
              <FiLogOut />
            </span>
            Logout
          </button>
        </div>
      </section>
    </div>
  );
};

export default EmployeeSettings;
