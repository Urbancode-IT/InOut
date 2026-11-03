import { getUserWorks } from './userWorks';

const normalizeLabel = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const collectLabels = (user, field) => {
  const values = [user?.[field]];
  for (const work of getUserWorks(user)) {
    if (work?.[field]) values.push(work[field]);
  }
  return values.map(normalizeLabel).filter(Boolean);
};

const isFreelancerLabel = (label) =>
  label === 'freelancer' || label.includes('freelancer');

const isManagementDepartment = (label) =>
  label === 'management' || label === 'managment';

/**
 * Management department and Freelancer staff do not use check-in / check-out.
 * Match top-level or works[].department / works[].position.
 */
export const skipsCheckInOut = (user) => {
  if (!user) return false;
  const departments = collectLabels(user, 'department');
  const positions = collectLabels(user, 'position');

  if (departments.some((d) => isManagementDepartment(d) || isFreelancerLabel(d))) {
    return true;
  }
  if (positions.some(isFreelancerLabel)) return true;
  return false;
};

/** Leadership titles excluded from monthly attendance reports (existing behavior). */
export const isDirectorOrFounder = (user) => {
  const titles = collectLabels(user, 'position');
  return titles.some((title) => {
    if (title === 'director') return true;
    if (title.includes('managing director')) return true;
    if (title.includes('founder')) return true;
    return false;
  });
};

/** Reminder emails: Directors + Management + Freelancer. */
export const skipsAttendanceReminders = (user) =>
  skipsCheckInOut(user) ||
  collectLabels(user, 'position').some((title) => title === 'director');

/** Monthly reports / absent counts tied to attendance tracking. */
export const skipsAttendanceReports = (user) =>
  skipsCheckInOut(user) || isDirectorOrFounder(user);
