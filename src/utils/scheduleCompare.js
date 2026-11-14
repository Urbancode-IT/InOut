const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const DAY_ALIASES = {
  sun: 'Sunday',
  sunday: 'Sunday',
  mon: 'Monday',
  monday: 'Monday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  tuesday: 'Tuesday',
  wed: 'Wednesday',
  wednesday: 'Wednesday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  thursday: 'Thursday',
  fri: 'Friday',
  friday: 'Friday',
  sat: 'Saturday',
  saturday: 'Saturday',
};

/** Coerce "09:00", "9:00", or ISO datetime → "HH:MM". */
export const normalizeScheduleTime = (value) => {
  if (value == null || value === '') return '';
  if (typeof value === 'string' && value.includes('T')) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
  }
  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
  }
  return '';
};

export const getDayName = (date = new Date()) =>
  WEEKDAYS[new Date(date).getDay()] || 'Sunday';

/** Normalize weeklySchedule from API / user record. */
export const normalizeWeeklySchedule = (ws) => {
  let source = ws;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      source = null;
    }
  }
  if (!source || typeof source !== 'object') return null;

  const out = {};
  Object.entries(source).forEach(([day, val]) => {
    if (!val || typeof val !== 'object') return;
    const lower = String(day).trim().toLowerCase();
    const full =
      DAY_ALIASES[lower] ||
      day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
    if (!WEEKDAYS.includes(full)) return;

    const isLeave = Boolean(val.isLeave);
    const start =
      normalizeScheduleTime(val.start) ||
      normalizeScheduleTime(val.startTime) ||
      '';
    const end =
      normalizeScheduleTime(val.end) ||
      normalizeScheduleTime(val.endTime) ||
      '';

    out[full] = { start, end, isLeave };
  });

  return Object.keys(out).length ? out : null;
};

export const scheduleUserIdOf = (sch) => {
  if (!sch) return null;
  const raw = sch.user?._id ?? sch.user?.id ?? sch.userId ?? sch.user;
  return raw != null && raw !== '' ? String(raw) : null;
};

/** Find today's day schedule from a weeklySchedule object. */
export const getTodayDaySchedule = (weeklySchedule, date = new Date()) => {
  const norm = normalizeWeeklySchedule(weeklySchedule);
  if (!norm) return null;
  const day = norm[getDayName(date)];
  if (!day || day.isLeave) return null;
  return day;
};

const parseTimeOnDate = (dateObj, hhmm) => {
  const time = normalizeScheduleTime(hhmm);
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const d = new Date(dateObj);
  d.setHours(h, m, 0, 0);
  return d;
};

/** Same 10-minute grace used in admin Reports for late check-in. */
const CHECK_IN_GRACE_MS = 10 * 60 * 1000;

/**
 * Returns whether attendance was outside the submitted schedule.
 * - check-in: after scheduled start (+ grace) → late
 * - check-out: before scheduled end → early leave (not as per schedule)
 */
export const getScheduleMismatch = ({
  type,
  at = new Date(),
  weeklySchedule,
  graceMs = CHECK_IN_GRACE_MS,
}) => {
  const day = getTodayDaySchedule(weeklySchedule, at);
  if (!day) return null;

  const when = new Date(at);
  if (Number.isNaN(when.getTime())) return null;

  if (type === 'check-in') {
    const start = parseTimeOnDate(when, day.start);
    if (!start) return null;
    if (when.getTime() > start.getTime() + graceMs) {
      const scheduled = normalizeScheduleTime(day.start) || day.start;
      return {
        kind: 'late-check-in',
        scheduled,
        message:
          `Your scheduled check-in time is ${scheduled}.\n` +
          'You checked in after the allowed time (10 min grace).',
      };
    }
    return null;
  }

  if (type === 'check-out') {
    const end = parseTimeOnDate(when, day.end);
    if (!end) return null;
    if (when.getTime() < end.getTime()) {
      const scheduled = normalizeScheduleTime(day.end) || day.end;
      return {
        kind: 'early-check-out',
        scheduled,
        message:
          `Your scheduled check-out time is ${scheduled}.\n` +
          'You checked out earlier than your schedule.',
      };
    }
    return null;
  }

  return null;
};

/** Prefer weeklySchedule from schedule doc, then user.schedule / user.weeklySchedule. */
export const pickWeeklySchedule = (scheduleDoc, user) =>
  scheduleDoc?.weeklySchedule ||
  user?.weeklySchedule ||
  user?.schedule ||
  null;
