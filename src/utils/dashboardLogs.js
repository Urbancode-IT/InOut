import { localDateYMD } from './localDate';
import { skipsCheckInOut } from './skipAttendance';

export const normalizeLogs = (data) => (Array.isArray(data) ? data : []);

export const normalizeId = (id) => (id == null ? '' : String(id));

/** Timestamp from record field or MongoDB ObjectId (legacy rows without timestamp). */
export const getLogTimestamp = (log) => {
  if (log?.timestamp) {
    const d = new Date(log.timestamp);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const id = log?._id;
  if (id && /^[a-f0-9]{24}$/i.test(String(id))) {
    const seconds = Number.parseInt(String(id).substring(0, 8), 16);
    if (Number.isFinite(seconds)) return new Date(seconds * 1000);
  }
  return null;
};

export const mapRawAttendanceRecords = (records = [], users = []) => {
  const byId = new Map(users.map((u) => [normalizeId(u._id), u]));
  const byEmpId = new Map(
    users.filter((u) => u.employeeId).map((u) => [String(u.employeeId).trim(), u])
  );

  return records
    .map((record) => {
      let user = null;
      if (record.user && typeof record.user === 'object') {
        user = byId.get(normalizeId(record.user._id)) || record.user;
      } else {
        user = byId.get(normalizeId(record.user)) || byEmpId.get(String(record.user || '').trim());
      }

      if (!user || user.role === 'admin') return null;
      if (user.isActive === false) return null;

      return {
        _id: record._id,
        employeeName: user.name || 'Unknown',
        name: user.name || 'Unknown',
        userId: user._id || record.user,
        employeeId: user.employeeId || '',
        type: record.type,
        timestamp: getLogTimestamp(record)?.toISOString() || record.timestamp,
        location: record.location,
        isInOffice: record.isInOffice,
        officeName: record.officeName || 'Outside Office',
        image: record.image || '',
        comment: record.comment || '',
        company: user.company || '',
      };
    })
    .filter(Boolean);
};

export const activeEmployees = (users = []) =>
  users.filter(
    (u) =>
      u.role === 'employee' &&
      u.isActive !== false &&
      !skipsCheckInOut(u)
  );

/** Build present/absent counts from loaded logs + user list (summary API fallback). */
export const buildSummaryFromLogs = (logs = [], users = [], dateFilter) => {
  const employees = activeEmployees(users);
  const dayLogs = dateFilter ? filterLogsByDate(logs, dateFilter) : logs;
  const presentIds = presentEmployeeIds(dayLogs);
  const presentToday = presentIds.size;
  const totalEmployees = employees.length;

  let checkDate = new Date();
  if (dateFilter) {
    const m = String(dateFilter).match(/^(\d{4})-(\d{2})-(\d{2})/);
    checkDate = m
      ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      : new Date(dateFilter);
  }
  const isOfficeLeave = !Number.isNaN(checkDate.getTime()) &&
    checkDate.getDay() === 0;

  return {
    totalEmployees,
    presentToday,
    onLeaveToday: 0,
    absentToday: isOfficeLeave ? 0 : Math.max(0, totalEmployees - presentToday),
  };
};

/** Fill missing employee names from the users list. */
export const enrichLogNames = (logs = [], users = []) => {
  if (!logs.length || !users.length) return logs;

  const byId = new Map(users.map((u) => [normalizeId(u._id), u]));
  const byEmpId = new Map(
    users.filter((u) => u.employeeId).map((u) => [String(u.employeeId).trim(), u])
  );

  return logs.map((log) => {
    const user =
      byId.get(normalizeId(log.userId)) ||
      (log.employeeId ? byEmpId.get(String(log.employeeId).trim()) : null) ||
      byId.get(normalizeId(log.user));

    if (!user) {
      const name = log.employeeName || log.name;
      if (name && name !== 'Unknown') return log;
      return log;
    }

    const profilePic =
      typeof user.profilePic === 'string'
        ? user.profilePic
        : user.profilePic?.secure_url || user.profilePic?.url || log.profilePic || '';

    return {
      ...log,
      employeeName: user.name || log.employeeName || log.name || 'Unknown',
      name: user.name || log.name || 'Unknown',
      userId: user._id || log.userId,
      employeeId: user.employeeId || log.employeeId || '',
      profilePic,
      company: user.company || log.company || '',
    };
  });
};

export const filterLogsByDate = (logs, dateFilter) => {
  const target = localDateYMD(dateFilter);
  return logs.filter((log) => {
    const ts = getLogTimestamp(log);
    return ts && localDateYMD(ts) === target;
  });
};

export const presentEmployeeIds = (logs = []) =>
  new Set(
    logs
      .filter((log) => log.type === 'check-in')
      .map((log) => normalizeId(log.userId))
      .filter(Boolean)
  );
