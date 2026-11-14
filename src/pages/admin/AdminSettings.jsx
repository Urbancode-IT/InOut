import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCheck, FiCopy, FiLink } from 'react-icons/fi';
import './AdminSettings.css';

const AdminSettings = () => {
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

  return (
    <div className="uc-page admin-settings-page">
      <h1 className="admin-settings-title">Settings</h1>
      <p className="admin-settings-subtitle">
        Admin tools and shareable links for onboarding.
      </p>

      <section className="admin-settings-card">
        <h2 className="admin-settings-card-title">
          <FiLink style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Employee registration link
        </h2>
        <p className="admin-settings-card-desc">
          Copy this link and share it with new employees so they can submit their
          registration form.
        </p>

        <div className="admin-settings-link-row">
          <input
            className="admin-settings-link-input"
            type="text"
            value={registrationUrl}
            readOnly
            aria-label="Registration link"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            className="admin-settings-copy-btn"
            onClick={handleCopyRegisterLink}
          >
            {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <p className="admin-settings-hint">
          After they register, approve them from Approvals and send the offer letter.
        </p>
      </section>
    </div>
  );
};

export default AdminSettings;
