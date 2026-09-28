import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../../utils/api';
import '../../../styles/dashboard-ui.css';
import {
  attendanceLockReasonLabel,
  isAttendanceLockedUser,
  isInoutBlockedUser,
} from '../../../utils/attendanceLock';

const lockedAt = (user) => {
  const raw = isInoutBlockedUser(user) ? user.inoutBlockedAt : user.attendanceLockedAt;
  if (!raw) return '—';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const LockedUsersPanel = ({ users = [], onUnlocked }) => {
  const [open, setOpen] = useState(false);
  const [unlockingId, setUnlockingId] = useState(null);
  const lockedUsers = useMemo(
    () => (users || []).filter((user) => isAttendanceLockedUser(user)),
    [users]
  );

  const handleUnlock = async (user) => {
    if (!user?._id) return;
    if (!window.confirm(`Unlock In-Out for ${user.name}? Only an admin can do this.`)) return;

    setUnlockingId(user._id);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        API_ENDPOINTS.unlockAttendance(user._id),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${user.name} has been unlocked.`);
      if (onUnlocked) onUnlocked(user._id);
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to unlock user');
    } finally {
      setUnlockingId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="dash-btn-primary"
      >
        <span>Locked In-Out</span>
        <span className="dash-lock-count">{lockedUsers.length}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-200">
            <div className="dash-lock-header">
              <h2 className="text-lg font-bold">Locked In-Out</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white text-xl font-bold p-1 rounded"
              >
                ✕
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {lockedUsers.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    These employees cannot check in or check out. A missed day means no check-in, no check-out, and no leave form. Only an admin can unlock them.
                  </p>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 text-gray-700 text-xs font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4 text-left">Name</th>
                          <th className="py-3 px-4 text-left">Reason</th>
                          <th className="py-3 px-4 text-left">Locked</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 text-sm">
                        {lockedUsers.map((user) => (
                          <tr key={user._id} className="hover:bg-purple-50/60">
                            <td className="py-3 px-4 font-medium text-gray-900">
                              {user.name}
                              <div className="text-xs text-gray-500">{user.employeeId || user.email}</div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{attendanceLockReasonLabel(user)}</td>
                            <td className="py-3 px-4 text-gray-500">{lockedAt(user)}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleUnlock(user)}
                                disabled={unlockingId === user._id}
                                className="dash-lock-unlock"
                              >
                                {unlockingId === user._id ? 'Unlocking...' : 'Unlock'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">No locked employees</h3>
                  <p className="text-sm text-gray-500">Everyone can check in and check out.</p>
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LockedUsersPanel;
