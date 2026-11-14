import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';
import { toast } from 'react-toastify';
import { choiceToast, promptToast, confirmToast } from '../../utils/interactiveToast';
import { API_ENDPOINTS } from '../../utils/api';
import {
  FiCalendar,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiFlag,
  FiClock,
} from 'react-icons/fi';
import './Holidays.css';
import Loader from '../../components/admin-dashboard/common/Loader';

const PAGE_SIZE = 8;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isPastHolidayDate = (date) => startOfDay(date) < startOfDay(new Date());

const formatHolidayDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [holidayMap, setHolidayMap] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(() => String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const token = localStorage.getItem('token');

  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_ENDPOINTS.getHolidays, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHolidays(res.data || []);

      const map = {};
      (res.data || []).forEach((h) => {
        map[new Date(h.date).toDateString()] = h;
      });
      setHolidayMap(map);
    } catch (err) {
      console.error('Error fetching holidays:', err);
      toast.error('Error: Failed to fetch holidays');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleDateClick = async (date) => {
    setSelectedDate(date);
    const holiday = holidayMap[date.toDateString()];

    if (holiday) {
      const choice = await choiceToast({
        title: 'Holiday Info',
        text: `${holiday.name} on ${date.toDateString()}`,
        choices: [
          { key: 'edit', label: 'Edit', tone: 'primary' },
          { key: 'delete', label: 'Delete', tone: 'danger' },
          { key: 'close', label: 'Close', tone: 'default' },
        ],
      });

      if (choice === 'edit') {
        const name = await promptToast({
          title: 'Edit Holiday',
          defaultValue: holiday.name,
          label: `Edit holiday name for ${date.toDateString()}`,
          confirmText: 'Save',
        });

        if (name) {
          try {
            await axios.put(
              API_ENDPOINTS.editHoliday(holiday._id),
              {
                date: date,
                name: name,
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            await fetchHolidays();
            toast.success('Success: Holiday updated successfully!');
          } catch (err) {
            console.error(err);
            toast.error('Error: Failed to update holiday');
          }
        }
      } else if (choice === 'delete') {
        const confirmedDelete = await confirmToast({
          title: 'Are you sure?',
          text: "You won't be able to revert this!",
          confirmText: 'Yes, delete it!',
          tone: 'danger',
        });

        if (confirmedDelete) {
          try {
            await axios.delete(API_ENDPOINTS.deleteHoliday(holiday._id), {
              headers: { Authorization: `Bearer ${token}` },
            });
            await fetchHolidays();
            toast.success('Deleted! Holiday has been deleted.');
          } catch (err) {
            console.error(err);
            toast.error('Error: Failed to delete holiday');
          }
        }
      }
    } else {
      const name = await promptToast({
        title: 'Add Holiday',
        label: `Enter holiday name for ${date.toDateString()}`,
        placeholder: 'e.g., Diwali, Pongal',
        confirmText: 'Save',
      });

      if (name) {
        try {
          await axios.post(
            API_ENDPOINTS.addHoliday,
            {
              date: date,
              name: name,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          await fetchHolidays();
          toast.success('Success: Holiday added successfully!');
        } catch (err) {
          console.error(err);
          toast.error('Error: Failed to add holiday');
        }
      }
    }
  };

  const handleAddHolidayClick = async () => {
    await handleDateClick(selectedDate || new Date());
  };

  const handleEditRow = async (holiday) => {
    await handleDateClick(new Date(holiday.date));
  };

  const handleDeleteRow = async (holiday) => {
    const confirmedDelete = await confirmToast({
      title: 'Are you sure?',
      text: `Delete "${holiday.name}"?`,
      confirmText: 'Yes, delete it!',
      tone: 'danger',
    });
    if (!confirmedDelete) return;
    try {
      await axios.delete(API_ENDPOINTS.deleteHoliday(holiday._id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchHolidays();
      toast.success('Deleted! Holiday has been deleted.');
    } catch (err) {
      console.error(err);
      toast.error('Error: Failed to delete holiday');
    }
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const holiday = holidayMap[date.toDateString()];
      if (holiday) {
        return (
          <div className="holiday-indicator">
            <span className="holiday-dot"></span>
            <div className="holiday-tooltip">{holiday.name}</div>
          </div>
        );
      }

      if (date.toDateString() === new Date().toDateString()) {
        return <div className="today-indicator"></div>;
      }
    }
    return null;
  };

  const today = startOfDay(new Date());
  const currentYear = today.getFullYear();
  const yearOptions = useMemo(() => {
    const years = new Set(
      (holidays || [])
        .map((h) => new Date(h.date).getFullYear())
        .filter((y) => Number.isFinite(y))
    );
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [holidays, currentYear]);

  const filteredHolidays = useMemo(() => {
    const q = search.trim().toLowerCase();
    const yearNum = Number(yearFilter);
    return (holidays || [])
      .filter((h) => {
        const d = new Date(h.date);
        if (Number.isFinite(yearNum) && d.getFullYear() !== yearNum) return false;
        if (!q) return true;
        return String(h.name || '')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [holidays, yearFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [yearFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredHolidays.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filteredHolidays.slice(pageStart, pageStart + PAGE_SIZE);

  const yearNum = Number(yearFilter) || today.getFullYear();
  const yearHolidays = (holidays || []).filter(
    (h) => new Date(h.date).getFullYear() === yearNum
  );
  const stats = {
    totalYear: yearHolidays.length,
    upcoming: yearHolidays.filter((h) => startOfDay(h.date) >= today).length,
    past: yearHolidays.filter((h) => isPastHolidayDate(h.date)).length,
  };

  const upcomingHolidays = useMemo(() => {
    const start = startOfDay(new Date());
    return (holidays || [])
      .filter((h) => startOfDay(h.date) >= start)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [holidays]);

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    const holiday = holidayMap[date.toDateString()];
    if (holiday && isPastHolidayDate(date)) return 'holiday-past-tile';
    return null;
  };

  const showingFrom = filteredHolidays.length === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + PAGE_SIZE, filteredHolidays.length);

  return (
    <div className="holidays-container uc-page">
      <div className="holidays-content">
        <div className="holidays-header">
          <div className="holidays-header-left">
            <div className="holidays-header-icon" aria-hidden>
              <FiCalendar size={20} />
            </div>
            <div>
              <h1>Holiday List</h1>
              <p>Manage public and company holidays</p>
            </div>
          </div>
          <button type="button" className="holidays-add-btn" onClick={handleAddHolidayClick}>
            <FiPlus size={16} />
            Add Holiday
          </button>
        </div>

        <div className="holidays-stats">
          <div className="holiday-stat-card stat-total">
            <div className="holiday-stat-icon">
              <FiCalendar size={18} />
            </div>
            <div className="holiday-stat-copy">
              <p className="holiday-stat-label">Total Holidays ({yearNum})</p>
              <p className="holiday-stat-value">{stats.totalYear}</p>
            </div>
          </div>
          <div className="holiday-stat-card stat-upcoming">
            <div className="holiday-stat-icon">
              <FiFlag size={18} />
            </div>
            <div className="holiday-stat-copy">
              <p className="holiday-stat-label">Upcoming</p>
              <p className="holiday-stat-value">{stats.upcoming}</p>
            </div>
          </div>
          <div className="holiday-stat-card stat-past">
            <div className="holiday-stat-icon">
              <FiClock size={18} />
            </div>
            <div className="holiday-stat-copy">
              <p className="holiday-stat-label">Past</p>
              <p className="holiday-stat-value">{stats.past}</p>
            </div>
          </div>
        </div>

        <div className="holidays-toolbar">
          <div className="holidays-field">
            <label htmlFor="holiday-year">Year</label>
            <select
              id="holiday-year"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="holidays-field">
            <label htmlFor="holiday-search">Search</label>
            <div className="holidays-search-wrap">
              <FiSearch size={16} />
              <input
                id="holiday-search"
                className="holidays-search"
                type="text"
                placeholder="Search holidays..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="calendar-section">
          <div className="calendar-wrapper">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              onClickDay={handleDateClick}
              tileContent={tileContent}
              tileClassName={tileClassName}
              className="holiday-calendar"
              minDetail="decade"
              showNeighboringMonth={false}
            />
          </div>

          <div className="upcoming-holidays">
            <h2>Upcoming Holidays</h2>
            {loading ? (
              <Loader />
            ) : upcomingHolidays.length > 0 ? (
              <ul>
                {upcomingHolidays.map((h) => (
                  <li key={h._id || h.date}>
                    <span className="holiday-date">{formatHolidayDate(h.date)}</span>
                    <span className="holiday-name">{h.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="no-holidays">No upcoming holidays</div>
            )}
          </div>
        </div>

        <div className="all-holidays-section">
          <h2>All Holidays</h2>
          {loading ? (
            <Loader />
          ) : filteredHolidays.length > 0 ? (
            <>
              <div className="holidays-table-container">
                <table className="holidays-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Holiday Name</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((h) => {
                      const past = isPastHolidayDate(h.date);
                      return (
                        <tr key={h._id || h.date} className={past ? 'holiday-row-past' : ''}>
                          <td className={past ? 'holiday-past-text' : ''}>
                            {formatHolidayDate(h.date)}
                          </td>
                          <td className={past ? 'holiday-past-text' : ''}>{h.name}</td>
                          <td>
                            <span className={`holiday-type-badge${past ? ' is-past' : ''}`}>
                              {past ? 'Past' : 'Upcoming'}
                            </span>
                          </td>
                          <td>
                            <div className="holidays-actions">
                              <button
                                type="button"
                                className="holidays-icon-btn"
                                title="Edit"
                                onClick={() => handleEditRow(h)}
                              >
                                <FiEdit2 size={14} />
                              </button>
                              <button
                                type="button"
                                className="holidays-icon-btn is-danger"
                                title="Delete"
                                onClick={() => handleDeleteRow(h)}
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="holidays-footer">
                <span>
                  Showing {showingFrom} to {showingTo} of {filteredHolidays.length} holidays
                </span>
                <div className="holidays-pager">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(
                      Math.max(0, currentPage - 2),
                      Math.max(0, currentPage - 2) + 3
                    )
                    .map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={p === currentPage ? 'is-active' : ''}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-holidays">No holidays found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Holidays;
