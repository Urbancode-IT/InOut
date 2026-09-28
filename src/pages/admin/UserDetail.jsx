import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../utils/api';
import { confirmToast } from '../../utils/interactiveToast';
import { attendanceLockMessageForUser, isAttendanceLockedUser } from '../../utils/attendanceLock';
import UserCard from '../../components/admin-dashboard/allusers/UserCard';
import Loader from '../../components/admin-dashboard/common/Loader';

const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(API_ENDPOINTS.getUserById(userId), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data || null);
    } catch (err) {
      console.error('Failed to fetch user', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleUnlockAttendance = async () => {
    if (!user?._id) return;
    const confirmed = await confirmToast({
      title: 'Unlock attendance?',
      text: `Unlock attendance access for ${user.name}?`,
      confirmText: 'Unlock',
      tone: 'success',
    });
    if (!confirmed) return;

    try {
      setUnlocking(true);
      const token = localStorage.getItem('token');
      await axios.post(
        API_ENDPOINTS.unlockAttendance(user._id),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser((prev) =>
        prev
          ? {
              ...prev,
              attendanceLocked: false,
              isAttendanceLocked: false,
              inoutBlocked: false,
              inoutBlockedAt: null,
              inoutBlockedForDate: null,
            }
          : prev
      );
      toast.success(`Attendance unlocked for ${user.name}`);
      await fetchUser();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to unlock attendance');
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="uc-profile-page">
      <div className="uc-profile-shell">
        <button type="button" className="uc-profile-back" onClick={() => navigate('/all-users')}>
          ← Back to All Users
        </button>

        {user ? (
          <>
            {isAttendanceLockedUser(user) && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '0.65rem',
                  border: '1px solid #fdba74',
                  background: '#fff7ed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <strong style={{ color: '#9a3412' }}>In-Out Locked</strong>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#9a3412' }}>
                    {attendanceLockMessageForUser(user) || 'This user cannot check in or check out until an admin unlocks them.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="uc-btn uc-btn-primary"
                  disabled={unlocking}
                  onClick={handleUnlockAttendance}
                >
                  {unlocking ? 'Unlocking…' : 'Unlock Attendance'}
                </button>
              </div>
            )}
            <UserCard
              user={user}
              forceExpanded
              showCloseButton={false}
              onEdit={(id) => navigate(`/all-users/${id}/edit`)}
            />
          </>
        ) : (
          <div className="uc-profile-card">
            <p className="uc-empty-msg">User not found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetail;
