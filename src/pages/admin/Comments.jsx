import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../utils/api';
import {
  getAttendanceImage,
  resolveAttendanceImageUrl,
} from '../../utils/attendanceImage';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Avatar,
  Tooltip,
} from '@mui/material';
import { FiSearch, FiCalendar } from 'react-icons/fi';
import Loader from '../../components/admin-dashboard/common/Loader';
import '../../styles/dashboard-ui.css';

const localMonthValue = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const CommentsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthValue, setMonthValue] = useState(() => localMonthValue());
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(API_ENDPOINTS.getRecentAttendanceLogs, { headers });
        setLogs(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch attendance logs', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [token]);

  const withComment = (log) =>
    log && log.comment && String(log.comment).trim().length > 0;

  const filteredComments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const [yStr, mStr] = String(monthValue || '').split('-');
    const year = Number(yStr);
    const monthIndex = Number(mStr) - 1;

    return logs
      .filter(withComment)
      .filter((log) => {
        const d = new Date(log.timestamp);
        if (Number.isNaN(d.getTime())) return false;
        if (
          Number.isFinite(year) &&
          Number.isFinite(monthIndex) &&
          (d.getFullYear() !== year || d.getMonth() !== monthIndex)
        ) {
          return false;
        }

        if (!q) return true;
        const haystack = [
          log.employeeName,
          log.userName,
          log.name,
          log.type,
          log.officeName,
          log.comment,
          log.employeeId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [logs, searchTerm, monthValue]);

  if (loading) {
    return <Loader />;
  }

  const monthLabel = (() => {
    const [y, m] = String(monthValue || '').split('-').map(Number);
    if (!y || !m) return 'Selected month';
    return new Date(y, m - 1, 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
  })();

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: '#4b5563' }}>
        Late Comments
      </Typography>

      <div
        className="dash-filters"
        style={{
          marginBottom: '1.25rem',
          gridTemplateColumns: 'minmax(0, 1fr) 220px',
          alignItems: 'center',
        }}
      >
        <div className="dash-field">
          <FiSearch />
          <input
            type="text"
            placeholder="Search name, comment, office..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="dash-field">
          <FiCalendar />
          <input
            type="month"
            aria-label="Month"
            value={monthValue}
            onChange={(e) => setMonthValue(e.target.value)}
          />
        </div>
      </div>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {monthLabel} · {filteredComments.length} comment
        {filteredComments.length === 1 ? '' : 's'}
      </Typography>

      {filteredComments.length === 0 ? (
        <Paper sx={{ p: 3, mt: 2 }} elevation={1}>
          <Typography>No comments for this month.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 2, mt: 2 }} elevation={2}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Office</TableCell>
                <TableCell>Comment</TableCell>
                <TableCell>Image</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredComments.map((row, idx) => {
                const d = new Date(row.timestamp);
                return (
                  <TableRow key={row._id || idx} hover>
                    <TableCell>{d.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {row.employeeName || row.userName || 'Unknown'}
                    </TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>
                      {d.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>{row.officeName || '—'}</TableCell>
                    <TableCell style={{ maxWidth: 400 }}>
                      <Tooltip title={row.comment} arrow>
                        <span
                          style={{
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 420,
                          }}
                        >
                          {row.comment}
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const imgSrc = resolveAttendanceImageUrl(
                          getAttendanceImage(row)
                        );
                        return imgSrc ? (
                          <a href={imgSrc} target="_blank" rel="noreferrer">
                            <Avatar
                              src={imgSrc}
                              variant="rounded"
                              sx={{ width: 48, height: 48 }}
                            />
                          </a>
                        ) : (
                          <Avatar sx={{ width: 36, height: 36 }}>
                            {(row.employeeName || 'U').charAt(0)}
                          </Avatar>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default CommentsPage;
