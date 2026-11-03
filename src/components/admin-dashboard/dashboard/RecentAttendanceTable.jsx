import React, { useState } from 'react';
import { FiMoreVertical } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { officePresentBadgeClass } from '../../../utils/branches';
import { getLogOfficeName } from '../../../utils/officeLocations';
import {
  getAttendanceImage,
  isAttendanceImageFailed,
  resolveAttendanceImageUrl,
} from '../../../utils/attendanceImage';
import { localDateYMD } from '../../../utils/localDate';
import { formatHoursStacked } from '../../../utils/workHours';
import SafeImage from '../../common/SafeImage';

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const avatarLetter = (name = '') => (name.trim().charAt(0) || '?').toUpperCase();

const RecentAttendanceTable = ({ logs = [], selectedDate = '' }) => {
  const [modalImage, setModalImage] = useState(null);

  const groupLogsByEmployeeAndDate = (logList) => {
    const grouped = {};

    logList.forEach((log) => {
      const dateKey = localDateYMD(log.timestamp) || new Date(log.timestamp).toDateString();
      const personId = String(
        log.employeeId || log.userId || log.user || log.employeeName || ''
      ).trim();
      const key = `${personId}-${dateKey}`;
      const type = String(log.type || '').trim().toLowerCase();

      if (!grouped[key]) {
        grouped[key] = {
          employeeName: log.employeeName,
          employeeId: log.employeeId || '',
          profilePic: log.profilePic || '',
          userId: log.userId,
          date: dateKey,
          checkIn: null,
          checkOut: null,
        };
      }

      if (log.employeeId) grouped[key].employeeId = log.employeeId;
      if (log.profilePic) grouped[key].profilePic = log.profilePic;
      if (log.employeeName) grouped[key].employeeName = log.employeeName;
      if (log.userId) grouped[key].userId = log.userId;

      if (type === 'check-in' || type === 'checkin') {
        grouped[key].checkIn = log;
      } else if (type === 'check-out' || type === 'checkout') {
        grouped[key].checkOut = log;
      }
    });

    return Object.values(grouped);
  };

  const groupedLogs = groupLogsByEmployeeAndDate(logs);

  return (
    <div className="dash-table-panel">
      <div className="dash-table-head">
        <h2>Recent Attendance Logs</h2>
        <Link to="/attendances" className="dash-view-all">
          View All Logs →
        </Link>
      </div>

      <div className="dash-table-scroll">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Hours</th>
              <th>Office (In)</th>
              <th>Office (Out)</th>
              <th>Image (In)</th>
              <th>Image (Out)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {groupedLogs.length === 0 ? (
              <tr>
                <td colSpan="9" className="dash-table-empty">
                  {selectedDate
                    ? `No attendance on ${selectedDate}. Pick another date or click Refresh Data.`
                    : 'No recent attendance'}
                </td>
              </tr>
            ) : (
              groupedLogs.map((entry) => {
                const avatarSrc =
                  typeof entry.profilePic === 'string' && entry.profilePic.trim()
                    ? entry.profilePic
                    : '';
                const rowKey =
                  entry.checkIn?._id ||
                  entry.checkOut?._id ||
                  `${entry.userId || entry.employeeId || entry.employeeName}-${entry.date}`;

                return (
                  <tr key={rowKey}>
                    <td>
                      <div className="dash-emp-cell">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt="" className="dash-emp-avatar" />
                        ) : (
                          <div className="dash-emp-avatar dash-emp-avatar-fallback">
                            {avatarLetter(entry.employeeName)}
                          </div>
                        )}
                        <div>
                          <div className="dash-emp-name">{entry.employeeName || 'Unknown'}</div>
                          <div className="dash-emp-id">
                            ID: {entry.employeeId || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="dash-time-in">
                      {entry.checkIn ? formatTime(entry.checkIn.timestamp) : '—'}
                    </td>
                    <td className="dash-time-out">
                      {entry.checkOut ? formatTime(entry.checkOut.timestamp) : '—'}
                    </td>
                    <td className="dash-hours">
                      {entry.checkIn && entry.checkOut
                        ? formatHoursStacked(
                            entry.checkIn.timestamp,
                            entry.checkOut.timestamp
                          )?.label || '—'
                        : '—'}
                    </td>
                    <td>
                      <span className={officePresentBadgeClass(getLogOfficeName(entry.checkIn))}>
                        {getLogOfficeName(entry.checkIn)}
                      </span>
                    </td>
                    <td>
                      <span className={officePresentBadgeClass(getLogOfficeName(entry.checkOut))}>
                        {getLogOfficeName(entry.checkOut)}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const src = resolveAttendanceImageUrl(getAttendanceImage(entry.checkIn));
                        if (!src || isAttendanceImageFailed(src)) return '—';
                        return (
                          <SafeImage
                            src={src}
                            alt="Check-In"
                            className="dash-thumb"
                            onClick={() => setModalImage(src)}
                          />
                        );
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const src = resolveAttendanceImageUrl(getAttendanceImage(entry.checkOut));
                        if (!src || isAttendanceImageFailed(src)) return '—';
                        return (
                          <SafeImage
                            src={src}
                            alt="Check-Out"
                            className="dash-thumb"
                            onClick={() => setModalImage(src)}
                          />
                        );
                      })()}
                    </td>
                    <td>
                      <button type="button" className="dash-row-more" aria-label="More">
                        <FiMoreVertical />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalImage && (
        <div
          role="presentation"
          className="dash-image-modal"
          onClick={() => setModalImage(null)}
        >
          <img src={modalImage} alt="Preview" />
        </div>
      )}
    </div>
  );
};

export default RecentAttendanceTable;
