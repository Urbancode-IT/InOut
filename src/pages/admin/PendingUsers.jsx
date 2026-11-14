import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { confirmToast } from '../../utils/interactiveToast';
import { API_ENDPOINTS } from '../../utils/api';
import { FiUserCheck, FiUserX, FiUserPlus, FiFileText, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/admin-dashboard/common/Loader';

const statusBadgeStyle = (status) => {
  const base = {
    display: 'inline-block',
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '0.15rem 0.45rem',
    borderRadius: '999px',
    marginRight: '0.35rem',
  };
  const map = {
    'Pending Review': { background: '#fef3c7', color: '#92400e' },
    Approved: { background: '#dcfce7', color: '#166534' },
    Rejected: { background: '#fee2e2', color: '#991b1b' },
    'Not Generated': { background: '#f3f4f6', color: '#374151' },
    Generated: { background: '#e0e7ff', color: '#3730a3' },
    Sent: { background: '#dbeafe', color: '#1e40af' },
    Accepted: { background: '#dcfce7', color: '#166534' },
    Declined: { background: '#fee2e2', color: '#991b1b' },
    Expired: { background: '#ffedd5', color: '#9a3412' },
    'Pending Activation': { background: '#fef9c3', color: '#854d0e' },
    Active: { background: '#dcfce7', color: '#166534' },
    Inactive: { background: '#e5e7eb', color: '#4b5563' },
  };
  return { ...base, ...(map[status] || map['Not Generated']) };
};

const PendingUsers = () => {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [preparingId, setPreparingId] = useState(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const fetchPendingUsers = async () => {
    try {
      const res = await axios.get(API_ENDPOINTS.pendingUsers, {
        headers: authHeaders(),
      });
      setPendingUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      toast.error('Error: Failed to load pending users.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    const confirmed = await confirmToast({
      title: 'Accept & Activate this employee?',
      text:
        'Approves the registration and makes them an active user so they can log in immediately. No email accept link needed.',
      confirmText: 'Accept & Activate',
      tone: 'success',
    });

    if (!confirmed) return;

    try {
      await axios.post(
        `${API_ENDPOINTS.approveUser}/${id}`,
        {},
        { headers: authHeaders() }
      );
      toast.success('Accepted — user approved and activated.');
      fetchPendingUsers();
    } catch (err) {
      console.error('Approval failed:', err);
      toast.error(err.response?.data?.error || 'Error: Failed to approve user.');
    }
  };

  const handleReject = async (id) => {
    const confirmed = await confirmToast({
      title: 'Reject this registration?',
      confirmText: 'Yes, Reject',
      tone: 'danger',
    });

    if (!confirmed) return;

    try {
      await axios.delete(`${API_ENDPOINTS.rejectUser}/${id}`, {
        headers: authHeaders(),
      });
      toast.info('Rejected: Registration has been removed.');
      fetchPendingUsers();
    } catch (err) {
      console.error('Rejection failed:', err);
      toast.error('Error: Failed to reject user.');
    }
  };

  const handleOfferLetter = async (pending) => {
    setPreparingId(pending._id);
    try {
      const res = await axios.post(
        API_ENDPOINTS.prepareOfferFromPending(pending._id),
        {},
        { headers: authHeaders() }
      );
      const userId = res.data?.userId;
      if (!userId) {
        toast.error('Could not prepare offer workflow.');
        return;
      }
      toast.success('Opening Offer Letter generator with registration details…');
      navigate(
        `/letter-generator?template=standard-offer&userId=${encodeURIComponent(
          userId
        )}&pendingId=${encodeURIComponent(pending._id)}&onboarding=1`
      );
    } catch (err) {
      console.error('Prepare offer failed:', err);
      toast.error(err.response?.data?.error || 'Failed to start Offer Letter workflow');
    } finally {
      setPreparingId(null);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="uc-page" style={{ maxWidth: '64rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h1 className="uc-page-title" style={{ margin: 0, textAlign: 'left' }}>
          Pending User Approvals
        </h1>
        <button
          type="button"
          className="uc-btn uc-btn-primary uc-btn-icon-circle"
          onClick={() => navigate('/add-user')}
          title="Add User"
          aria-label="Add User"
        >
          <FiUserPlus size={16} />
        </button>
      </div>

      <div className="uc-stat-card uc-stat-indigo" style={{ marginBottom: '1.25rem' }}>
        <p className="uc-stat-label">Awaiting review</p>
        <p className="uc-stat-value">{pendingUsers.length}</p>
      </div>

      {pendingUsers.length === 0 ? (
        <p className="uc-empty-msg">No pending users found.</p>
      ) : (
        <div className="uc-pending-list">
          {pendingUsers.map((user) => {
            const expanded = expandedId === user._id;
            return (
              <div key={user._id} className="uc-pending-card">
                <div className="uc-pending-info" style={{ width: '100%' }}>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span style={statusBadgeStyle(user.registrationStatus || 'Pending Review')}>
                      Reg: {user.registrationStatus || 'Pending Review'}
                    </span>
                    <span style={statusBadgeStyle(user.offerStatus || 'Not Generated')}>
                      Offer: {user.offerStatus || 'Not Generated'}
                    </span>
                    <span
                      style={statusBadgeStyle(
                        user.employeeActivationStatus || 'Pending Activation'
                      )}
                    >
                      Emp: {user.employeeActivationStatus || 'Pending Activation'}
                    </span>
                  </div>

                  <h3>{user.name || 'Unnamed'}</h3>
                  <p>
                    <strong>Email:</strong> {user.email || '—'}
                  </p>
                  <p>
                    <strong>Phone:</strong> {user.phone || '—'}
                  </p>
                  <p>
                    <strong>Company:</strong> {user.company || '—'}
                  </p>
                  <p>
                    <strong>DOB:</strong>{' '}
                    {user.dateOfBirth
                      ? new Date(user.dateOfBirth).toLocaleDateString()
                      : 'N/A'}
                  </p>
                  <p>
                    <strong>Position:</strong> {user.position || '—'}
                  </p>
                  <p>
                    <strong>Branch:</strong> {user.branch || user.department || '—'}
                  </p>

                  <button
                    type="button"
                    className="uc-btn"
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.6rem',
                      marginTop: '0.5rem',
                    }}
                    onClick={() => setExpandedId(expanded ? null : user._id)}
                  >
                    {expanded ? <FiChevronUp /> : <FiChevronDown />}{' '}
                    {expanded ? 'Hide details' : 'View full details'}
                  </button>

                  {expanded && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      }}
                    >
                      <p>
                        <strong>Address:</strong> {user.address || '—'}
                      </p>
                      <p>
                        <strong>Department:</strong> {user.department || '—'}
                      </p>
                      <p>
                        <strong>Expected Joining:</strong>{' '}
                        {user.dateOfJoining
                          ? new Date(user.dateOfJoining).toLocaleDateString()
                          : '—'}
                      </p>
                      <p>
                        <strong>Qualification:</strong> {user.qualification || '—'}
                      </p>
                      <p>
                        <strong>Salary (registered):</strong>{' '}
                        {user.salary != null ? user.salary : '—'}
                      </p>
                      <p>
                        <strong>Blood Group:</strong> {user.bloodGroup || '—'}
                      </p>
                      <p>
                        <strong>Employment Type:</strong>{' '}
                        {user.employmentType === 'Part-Time' ? 'Part-Time' : 'Full-Time'}
                      </p>
                      {user.schedule ? (
                        <div style={{ marginTop: '0.5rem' }}>
                          <strong>Weekly Schedule:</strong>
                          <div style={{ marginTop: '0.35rem' }}>
                            {Object.keys(user.schedule).map((day) => {
                              const daySch = user.schedule[day] || {};
                              return (
                                <p key={day} style={{ margin: '0.15rem 0' }}>
                                  {day}:{' '}
                                  {daySch.isLeave
                                    ? 'Day Off'
                                    : `${daySch.start || '—'} – ${daySch.end || '—'}`}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      <hr style={{ margin: '0.6rem 0', borderColor: '#e5e7eb' }} />
                      <p>
                        <strong>Experience Type:</strong>{' '}
                        {user.isFresher ? 'Fresher' : 'Experienced'}
                      </p>
                      <p>
                        <strong>Total Years of Experience:</strong>{' '}
                        {user.totalYearsOfExperience != null
                          ? user.totalYearsOfExperience
                          : '—'}
                      </p>
                      {Array.isArray(user.workExperience) && user.workExperience.length > 0 ? (
                        <div style={{ marginTop: '0.5rem' }}>
                          <strong>Work History:</strong>
                          {user.workExperience.map((entry, idx) => {
                            const formatDate = (iso, day, month, year) => {
                              if (iso) {
                                const d = new Date(iso);
                                if (!Number.isNaN(d.getTime())) {
                                  return d.toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  });
                                }
                              }
                              if (month && year) {
                                const names = [
                                  '',
                                  'Jan',
                                  'Feb',
                                  'Mar',
                                  'Apr',
                                  'May',
                                  'Jun',
                                  'Jul',
                                  'Aug',
                                  'Sep',
                                  'Oct',
                                  'Nov',
                                  'Dec',
                                ];
                                return `${day || 1} ${names[Number(month)] || month} ${year}`;
                              }
                              return '—';
                            };
                            const from = formatDate(
                              entry.startDate,
                              entry.startDay,
                              entry.startMonth,
                              entry.startYear
                            );
                            const to = entry.currentlyWorking
                              ? 'Present'
                              : formatDate(
                                  entry.endDate,
                                  entry.endDay,
                                  entry.endMonth,
                                  entry.endYear
                                );
                            return (
                              <div
                                key={idx}
                                style={{
                                  marginTop: '0.5rem',
                                  padding: '0.5rem',
                                  background: '#fff',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                }}
                              >
                                <p style={{ margin: 0 }}>
                                  <strong>Company {idx + 1}:</strong>{' '}
                                  {entry.companyName || '—'}
                                </p>
                                <p style={{ margin: '0.2rem 0' }}>
                                  <strong>Role:</strong> {entry.jobRole || '—'}
                                </p>
                                <p style={{ margin: '0.2rem 0' }}>
                                  <strong>From:</strong> {from} — <strong>To:</strong> {to}
                                </p>
                                {entry.responsibilities ? (
                                  <p style={{ margin: '0.2rem 0' }}>
                                    <strong>Responsibilities:</strong> {entry.responsibilities}
                                  </p>
                                ) : null}
                                {entry.reasonForLeaving && !entry.currentlyWorking ? (
                                  <p style={{ margin: '0.2rem 0' }}>
                                    <strong>Reason for leaving:</strong>{' '}
                                    {entry.reasonForLeaving}
                                  </p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <>
                          <p>
                            <strong>Previous Company / Organization:</strong>{' '}
                            {user.previousCompany || '—'}
                          </p>
                          <p>
                            <strong>Previous Work Experience:</strong>{' '}
                            {user.previousWorkExperience || '—'}
                          </p>
                          <p>
                            <strong>Previous Job Role / Designation:</strong>{' '}
                            {user.previousJobRole || '—'}
                          </p>
                        </>
                      )}
                      {(user.profilePic || user.resume?.url || user.aadharCard?.url) && (
                        <div
                          style={{
                            marginTop: '0.75rem',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            alignItems: 'center',
                          }}
                        >
                          {user.profilePic ? (
                            <a
                              href={user.profilePic}
                              target="_blank"
                              rel="noreferrer"
                              title="Profile photo"
                            >
                              <img
                                src={user.profilePic}
                                alt=""
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1px solid #e5e7eb',
                                }}
                              />
                            </a>
                          ) : null}
                          {user.resume?.url ? (
                            <a
                              href={user.resume.url}
                              target="_blank"
                              rel="noreferrer"
                              className="uc-btn"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Resume
                            </a>
                          ) : null}
                          {user.aadharCard?.url ? (
                            <a
                              href={user.aadharCard.url}
                              target="_blank"
                              rel="noreferrer"
                              className="uc-btn"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Aadhaar
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="uc-pending-actions">
                  <button
                    type="button"
                    onClick={() => handleOfferLetter(user)}
                    className="uc-btn uc-btn-primary"
                    disabled={preparingId === user._id}
                    title="Admin only — generate Offer Letter"
                  >
                    <FiFileText />
                    {preparingId === user._id ? 'Preparing…' : 'Offer Letter'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(user._id)}
                    className="uc-btn uc-btn-success"
                    title="Approve registration and activate login (no email link)"
                  >
                    <FiUserCheck />
                    Accept & Activate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(user._id)}
                    className="uc-btn uc-btn-danger"
                  >
                    <FiUserX />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingUsers;
