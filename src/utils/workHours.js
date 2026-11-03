/** Milliseconds between check-in and check-out (or now if still working). */
export const workDurationMs = (checkInTs, checkOutTs, nowMs = Date.now()) => {
  if (!checkInTs) return null;
  const start = new Date(checkInTs).getTime();
  if (!Number.isFinite(start)) return null;
  const end = checkOutTs ? new Date(checkOutTs).getTime() : nowMs;
  if (!Number.isFinite(end) || end < start) return null;
  return end - start;
};

export const formatWorkHours = (diffMs) => {
  if (diffMs == null || !Number.isFinite(diffMs) || diffMs < 0) return null;
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes, label: `${hours}h ${minutes}m` };
};

export const formatHoursStacked = (checkInTs, checkOutTs, nowMs) => {
  const diffMs = workDurationMs(checkInTs, checkOutTs, nowMs);
  return formatWorkHours(diffMs);
};

/** First check-in + last check-out on a calendar day (local). */
export const dayCheckInOut = (entries = [], date = new Date()) => {
  const key = new Date(date).toDateString();
  const dayEntries = (entries || []).filter(
    (e) => new Date(e.timestamp).toDateString() === key
  );
  const checkIns = dayEntries.filter((e) => e.type === 'check-in');
  const checkOuts = dayEntries.filter((e) => e.type === 'check-out');
  const checkIn = checkIns.sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  )[0];
  const checkOut = checkOuts.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  )[0];
  return { checkIn, checkOut };
};

/** Sum completed day hours in the same month as `date`. */
export const monthWorkedMs = (entries = [], date = new Date()) => {
  const month = new Date(date).getMonth();
  const year = new Date(date).getFullYear();
  const byDay = {};

  for (const entry of entries || []) {
    const ts = new Date(entry.timestamp);
    if (ts.getMonth() !== month || ts.getFullYear() !== year) continue;
    const key = ts.toDateString();
    if (!byDay[key]) byDay[key] = { checkIn: null, checkOut: null };
    if (entry.type === 'check-in') {
      if (
        !byDay[key].checkIn ||
        new Date(entry.timestamp) < new Date(byDay[key].checkIn.timestamp)
      ) {
        byDay[key].checkIn = entry;
      }
    } else if (entry.type === 'check-out') {
      if (
        !byDay[key].checkOut ||
        new Date(entry.timestamp) > new Date(byDay[key].checkOut.timestamp)
      ) {
        byDay[key].checkOut = entry;
      }
    }
  }

  let total = 0;
  for (const day of Object.values(byDay)) {
    if (!day.checkIn || !day.checkOut) continue;
    const ms = workDurationMs(day.checkIn.timestamp, day.checkOut.timestamp);
    if (ms != null) total += ms;
  }
  return total;
};
