import { extractBranchFromUser, getUserBranch, normalizeBranchValue } from './branches';
import { getPrimaryWork } from './userWorks';

/** Offer-letter Work Location select keys ↔ full office addresses */
export const LETTER_OFFICE_ADDRESSES = {
  'Chennai - Pallikaranai':
    '9/29, 5th Street, Kamakoti Nagar, Pallikaranai, Chennai - 600100',
  'Chennai - Velachery':
    '52/159, Velachery Main Rd, next to GURU NANAK COLLEGE, near Phoenix Marketcity, Anna Garden, Velachery, Chennai, Tamil Nadu 600042',
  Tirunelveli:
    'Fab Sapphire Towers, No 29/5, 4th Floor, South Bypass Road, Tirunelveli - 627005',
};

/** Profile branch label → Offer Letters workLocationBranch key */
export const branchToWorkLocationKey = (branch) => {
  const b = normalizeBranchValue(branch) || String(branch || '').trim();
  if (!b) return '';
  const lower = b.toLowerCase();
  if (lower.includes('tirunel')) return 'Tirunelveli';
  if (lower.includes('velach') || lower.includes('velech')) return 'Chennai - Velachery';
  if (lower.includes('pallikar') || lower.includes('chennai')) return 'Chennai - Pallikaranai';
  if (LETTER_OFFICE_ADDRESSES[b]) return b;
  return '';
};

const sliceDate = (value) => {
  if (!value) return '';
  const s = String(value);
  if (s.includes('T')) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  try {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {
    /* ignore */
  }
  return '';
};

/** Split "Branch | real address" (legacy persist) into parts. */
const splitStoredAddress = (raw) => {
  if (!raw) return { branchPart: '', addressPart: '' };
  if (typeof raw === 'object') {
    return {
      branchPart: '',
      addressPart:
        raw.line1 ||
        raw.addressLine1 ||
        raw.street ||
        raw.full ||
        '',
      line2: raw.line2 || raw.addressLine2 || raw.city || '',
    };
  }
  const text = String(raw).trim();
  if (!text || /^n\/?a$/i.test(text)) return { branchPart: '', addressPart: '' };
  if (text.includes('|')) {
    const [left, ...rest] = text.split('|');
    return {
      branchPart: left.trim(),
      addressPart: rest.join('|').trim(),
    };
  }
  // Entire address is just a branch name
  if (normalizeBranchValue(text)) {
    return { branchPart: text, addressPart: '' };
  }
  return { branchPart: '', addressPart: text };
};

/**
 * Map a full employee/user profile into letter form fields.
 * Missing profile values stay empty so admin can fill manually.
 */
export const mapEmployeeToLetterFields = (user) => {
  if (!user || typeof user !== 'object') {
    return {};
  }

  const primary = getPrimaryWork(user);
  const branch =
    getUserBranch(user) ||
    extractBranchFromUser(user) ||
    normalizeBranchValue(user.workLocation) ||
    '';

  const workLocationBranch = branchToWorkLocationKey(branch);
  const workLocationFromBranch = workLocationBranch
    ? LETTER_OFFICE_ADDRESSES[workLocationBranch] || ''
    : '';

  const stored = splitStoredAddress(user.address);
  const addressLine1 =
    user.addressLine1 ||
    user.address?.line1 ||
    user.address?.addressLine1 ||
    stored.addressPart ||
    (!stored.branchPart ? String(user.location || '').trim() : '') ||
    '';

  const addressLine2 =
    user.addressLine2 ||
    user.address?.line2 ||
    user.address?.addressLine2 ||
    stored.line2 ||
    user.city ||
    '';

  const company = user.company || primary.company || '';
  const department = user.department || primary.department || '';
  const designation = user.position || primary.position || '';

  return {
    candidateName: user.name || '',
    studentName: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    designation,
    department,
    company,
    salary:
      user.salary === 0 || user.salary
        ? String(user.salary)
        : '',
    addressLine1,
    addressLine2,
    address: addressLine1,
    location: user.city || user.location || workLocationBranch || branch || '',
    country: user.country || (addressLine1 || addressLine2 || branch ? 'India' : ''),
    collegeName: user.collegeName || user.college || user.qualification || '',
    joiningDate: sliceDate(user.dateOfJoining),
    relievingDate: sliceDate(user.dateOfRelieving),
    startDate: sliceDate(user.dateOfJoining),
    endDate: sliceDate(user.dateOfRelieving),
    probationPeriod: user.probationPeriod != null ? String(user.probationPeriod) : '',
    workingHours: user.workingHours != null ? String(user.workingHours) : '',
    noticePeriod: user.noticePeriod != null ? String(user.noticePeriod) : '',
    duration: user.duration != null ? String(user.duration) : '',
    // Prefer explicit workLocation, else office address from profile branch
    workLocation:
      (user.workLocation && String(user.workLocation).trim()) ||
      workLocationFromBranch ||
      '',
    workLocationBranch: workLocationBranch || 'Other',
    branch,
    employeeId: user.employeeId || '',
  };
};

/**
 * Apply mapped employee fields onto an existing form.
 * Only keys that exist on both the form and the map are touched.
 * Empty mapped values clear the form field so switching employees
 * does not leave stale profile data.
 */
export const applyMappedFieldsToForm = (formShape, mapped) => {
  const next = { ...formShape };
  Object.keys(formShape).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(mapped, key)) return;
    const value = mapped[key];
    next[key] = value == null ? '' : value;
  });
  return next;
};
