import React, { useMemo } from 'react';
import { formatHoursStacked } from '../../../utils/workHours';
import { localDateYMD } from '../../../utils/localDate';
import { normalizeId } from '../../../utils/dashboardLogs';

const formatTime = (ts) =>
  ts
    ? new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const resolvePerson = (record, byId, byEmpId) => {
  const nested = record.user && typeof record.user === 'object' ? record.user : null;
  const userId = normalizeId(
    record.userId || nested?._id || (typeof record.user === 'string' ? record.user : '')
  );
  const empId = String(record.employeeId || nested?.employeeId || '').trim();

  const fromList =
    (userId && byId.get(userId)) ||
    (empId && byEmpId.get(empId)) ||
    null;

  const name =
    (fromList?.name || '').trim() ||
    (record.employeeName || '').trim() ||
    (record.name || '').trim() ||
    (nested?.name || '').trim() ||
    'Unknown';

  const email =
    (fromList?.email || '').trim() ||
    (record.email || '').trim() ||
    (nested?.email || '').trim() ||
    '';

  const employeeId =
    (fromList?.employeeId || '').trim() ||
    empId ||
    '';

  return {
    name,
    email,
    employeeId,
    userId: normalizeId(fromList?._id || userId),
  };
};

const groupByEmployeeDay = (records = [], users = []) => {
  const byId = new Map(users.map((u) => [normalizeId(u._id), u]));
  const byEmpId = new Map(
    users
      .filter((u) => u.employeeId)
      .map((u) => [String(u.employeeId).trim(), u])
  );
  const grouped = {};

  records.forEach((record) => {
    const person = resolvePerson(record, byId, byEmpId);
    const dateKey =
      localDateYMD(record.timestamp) ||
      new Date(record.timestamp).toDateString();
    const key = `${person.userId || person.employeeId || person.email || person.name}-${dateKey}`;
    const type = String(record.type || '').trim().toLowerCase();

    if (!grouped[key]) {
      grouped[key] = {
        name: person.name,
        email: person.email,
        employeeId: person.employeeId,
        dateKey,
        sortTs: new Date(record.timestamp).getTime(),
        checkIn: null,
        checkOut: null,
      };
    }

    if (person.name && person.name !== 'Unknown') grouped[key].name = person.name;
    if (person.email) grouped[key].email = person.email;
    if (person.employeeId) grouped[key].employeeId = person.employeeId;

    const ts = new Date(record.timestamp).getTime();
    if (Number.isFinite(ts) && ts > grouped[key].sortTs) {
      grouped[key].sortTs = ts;
    }

    if (type === 'check-in' || type === 'checkin') {
      if (
        !grouped[key].checkIn ||
        new Date(record.timestamp) < new Date(grouped[key].checkIn.timestamp)
      ) {
        grouped[key].checkIn = record;
      }
    } else if (type === 'check-out' || type === 'checkout') {
      if (
        !grouped[key].checkOut ||
        new Date(record.timestamp) > new Date(grouped[key].checkOut.timestamp)
      ) {
        grouped[key].checkOut = record;
      }
    }
  });

  return Object.values(grouped).sort((a, b) => b.sortTs - a.sortTs);
};

const AttendanceTable = ({ records = [], users = [] }) => {
  const rows = useMemo(
    () => groupByEmployeeDay(records, users),
    [records, users]
  );

  return (
    <div className="overflow-x-auto bg-white rounded shadow">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-700 uppercase">
          <tr>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Check-In</th>
            <th className="px-4 py-3">Check-Out</th>
            <th className="px-4 py-3">Hours</th>
            <th className="px-4 py-3">In Office</th>
          </tr>
        </thead>
        <tbody className="text-gray-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                No attendance records found
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const hours = formatHoursStacked(
                row.checkIn?.timestamp,
                row.checkOut?.timestamp
              );
              const inOffice =
                row.checkIn?.isInOffice === true ||
                row.checkOut?.isInOffice === true;

              return (
                <tr
                  key={`${row.email || row.name}-${row.dateKey}-${row.employeeId}`}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="px-4 py-2 font-medium">
                    {row.name}
                    {row.employeeId ? (
                      <div className="text-xs text-gray-500">ID: {row.employeeId}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">{row.email || '—'}</td>
                  <td className="px-4 py-2">
                    {row.checkIn || row.checkOut
                      ? new Date(
                          (row.checkIn || row.checkOut).timestamp
                        ).toLocaleDateString()
                      : row.dateKey}
                  </td>
                  <td className="px-4 py-2 text-green-700 font-medium">
                    {formatTime(row.checkIn?.timestamp)}
                  </td>
                  <td className="px-4 py-2 text-blue-700 font-medium">
                    {formatTime(row.checkOut?.timestamp)}
                  </td>
                  <td className="px-4 py-2 font-semibold">
                    {hours?.label || '—'}
                  </td>
                  <td className="px-4 py-2">
                    {inOffice ? (
                      <span className="text-green-600 font-semibold">Yes</span>
                    ) : (
                      <span className="text-red-600 font-semibold">No</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;
