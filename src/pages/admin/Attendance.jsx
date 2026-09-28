import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AttendanceTable from '../../components/admin-dashboard/attendance/AttendanceTable';
import LockedUsersPanel from '../../components/admin-dashboard/dashboard/LockedUsersPanel';
import { API_ENDPOINTS } from '../../utils/api';
import Loader from '../../components/admin-dashboard/common/Loader';

const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendanceAndUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const [attRes, usersRes] = await Promise.all([
        axios.get(API_ENDPOINTS.getAttendanceAll, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(API_ENDPOINTS.getUsers, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setRecords(attRes.data);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceAndUsers();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="uc-page">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Attendance Records</h1>
        <LockedUsersPanel
          users={users}
          onUnlocked={(userId) => {
            setUsers((prev) =>
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
      </div>

      <AttendanceTable records={records} />
    </div>
  );
};

export default Attendance;
