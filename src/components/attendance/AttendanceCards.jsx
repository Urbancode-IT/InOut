import React, { useEffect, useState } from 'react';
import { FiClock, FiLogOut, FiCalendar, FiWatch } from 'react-icons/fi';
import {
  dayCheckInOut,
  formatHoursStacked,
  formatWorkHours,
  monthWorkedMs,
} from '../../utils/workHours';

function formatTime(timestamp) {
  if (!timestamp) return '--:--';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function AttendanceCards({
  attendanceData = [],
  totalWorkingDays,
  remainingDays,
  selectedDate = new Date(),
}) {
  const [nowMs, setNowMs] = useState(Date.now());
  const viewDate = selectedDate ? new Date(selectedDate) : new Date();
  const isToday = viewDate.toDateString() === new Date().toDateString();

  const { checkIn, checkOut } = dayCheckInOut(attendanceData, viewDate);
  const inProgress = Boolean(checkIn && !checkOut && isToday);

  useEffect(() => {
    if (!inProgress) return undefined;
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, [inProgress, checkIn?.timestamp]);

  const dayHours = formatHoursStacked(
    checkIn?.timestamp,
    checkOut?.timestamp,
    inProgress ? nowMs : undefined
  );
  const monthHours = formatWorkHours(monthWorkedMs(attendanceData, viewDate));

  const hoursNote = !checkIn
    ? 'Not Yet'
    : checkOut
      ? 'Completed'
      : inProgress
        ? 'In Progress'
        : 'Partial';

  const cards = [
    {
      title: 'Check In',
      time: formatTime(checkIn?.timestamp),
      note: checkIn ? 'On Time' : 'Not Yet',
      icon: <FiClock />,
      tone: 'green',
    },
    {
      title: 'Check Out',
      time: formatTime(checkOut?.timestamp),
      note: checkOut ? 'Done' : 'Not Yet',
      icon: <FiLogOut />,
      tone: 'blue',
    },
    {
      title: 'Hours Worked',
      time: dayHours?.label || '--:--',
      note: monthHours
        ? `${hoursNote} · Month ${monthHours.label}`
        : hoursNote,
      icon: <FiWatch />,
      tone: 'teal',
    },
    {
      title: 'Total Days',
      time: String(totalWorkingDays ?? 0),
      note: remainingDays != null ? `${remainingDays} remaining` : 'Working Days',
      icon: <FiCalendar />,
      tone: 'purple',
    },
  ];

  return (
    <div className="att-today-grid">
      {cards.map((card) => (
        <div key={card.title} className={`att-today-card att-today-${card.tone}`}>
          <div className="att-today-top">
            <span className="att-today-label">{card.title}</span>
            <span className="att-today-icon">{card.icon}</span>
          </div>
          <p className="att-today-value">{card.time}</p>
          <span className="att-today-badge">{card.note}</span>
        </div>
      ))}
    </div>
  );
}

export default AttendanceCards;
