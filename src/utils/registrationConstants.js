export const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const EMPLOYMENT_TYPE_OPTIONS = ['Full-Time', 'Part-Time'];

const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** Default weekly hours by employment type (Sunday off). */
export function createDefaultWeeklySchedule(employmentType = 'Full-Time') {
  const isPartTime = employmentType === 'Part-Time';
  const start = isPartTime ? '10:00' : '10:00';
  const end = isPartTime ? '14:00' : '18:00';
  return WEEK_DAYS.reduce((acc, day) => {
    const isLeave = day === 'Sunday';
    acc[day] = {
      start: isLeave ? '' : start,
      end: isLeave ? '' : end,
      isLeave,
    };
    return acc;
  }, {});
}

export function normalizeEmploymentType(value) {
  return String(value || '').trim() === 'Part-Time' ? 'Part-Time' : 'Full-Time';
}

export function createEmptyWorkExperience() {
  return {
    companyName: '',
    jobRole: '',
    startDate: '',
    endDate: '',
    currentlyWorking: false,
    responsibilities: '',
    reasonForLeaving: '',
  };
}

export function isValidMobile(phone) {
  return /^\d{10}$/.test(String(phone || '').trim());
}

export const ACCOUNT_TYPE_OPTIONS = ['Savings', 'Current'];

/** Indian bank account numbers are typically 9–18 digits. */
export function isValidBankAccountNumber(value) {
  return /^\d{9,18}$/.test(String(value || '').trim());
}

/** Standard IFSC: 4 letters + 0 + 6 alphanumeric. */
export function isValidIfscCode(value) {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(value || '').trim().toUpperCase());
}

/** UPI ID like name@bank — optional field, validate only when provided. */
export function isValidUpiId(value) {
  const v = String(value || '').trim();
  if (!v) return true;
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(v);
}

export function validateBankDetails(bankDetails = {}) {
  const errors = {};
  const accountHolderName = String(bankDetails.accountHolderName || '').trim();
  const bankingName = String(bankDetails.bankingName || '').trim();
  const bankAccountNumber = String(bankDetails.bankAccountNumber || '').trim();
  const confirmBankAccountNumber = String(bankDetails.confirmBankAccountNumber || '').trim();
  const ifscCode = String(bankDetails.ifscCode || '').trim().toUpperCase();
  const accountType = String(bankDetails.accountType || '').trim();
  const upiId = String(bankDetails.upiId || '').trim();

  if (!accountHolderName) errors.accountHolderName = 'Account holder name is required.';
  if (!bankingName) errors.bankingName = 'Bank name is required.';
  if (!bankAccountNumber) {
    errors.bankAccountNumber = 'Account number is required.';
  } else if (!isValidBankAccountNumber(bankAccountNumber)) {
    errors.bankAccountNumber = 'Please enter a valid account number (9–18 digits).';
  }
  if (!confirmBankAccountNumber) {
    errors.confirmBankAccountNumber = 'Please confirm your account number.';
  } else if (confirmBankAccountNumber !== bankAccountNumber) {
    errors.confirmBankAccountNumber = 'Account numbers do not match.';
  }
  if (!ifscCode) {
    errors.ifscCode = 'IFSC code is required.';
  } else if (!isValidIfscCode(ifscCode)) {
    errors.ifscCode = 'Please enter a valid IFSC code (e.g. HDFC0001234).';
  }
  if (!accountType) {
    errors.accountType = 'Please select account type.';
  } else if (!ACCOUNT_TYPE_OPTIONS.includes(accountType)) {
    errors.accountType = 'Account type must be Savings or Current.';
  }
  if (upiId && !isValidUpiId(upiId)) {
    errors.upiId = 'Please enter a valid UPI ID (e.g. name@upi).';
  }

  return errors;
}

function parseYmd(value) {
  if (!value || typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day, date: d, iso: value.trim() };
}

function dayIndex(dateStr) {
  const parsed = parseYmd(dateStr);
  if (!parsed) return null;
  return Math.floor(parsed.date.getTime() / (24 * 60 * 60 * 1000));
}

/** Merge overlapping date ranges; return total years to 1 decimal. */
export function calculateTotalYearsFromWorkExperience(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayIndex = dayIndex(todayIso);

  const ranges = entries
    .map((e) => {
      const start = dayIndex(e.startDate);
      if (start == null) return null;
      const end = e.currentlyWorking ? todayIndex : dayIndex(e.endDate);
      if (end == null || end < start) return null;
      return { start, end };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  if (ranges.length === 0) return null;

  const merged = [{ ...ranges[0] }];
  for (let i = 1; i < ranges.length; i += 1) {
    const last = merged[merged.length - 1];
    const cur = ranges[i];
    if (cur.start <= last.end + 1) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }

  const totalDays = merged.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
  return Math.round((totalDays / 365.25) * 10) / 10;
}

export function formatDisplayDate(dateStr) {
  const parsed = parseYmd(dateStr);
  if (!parsed) return '—';
  return parsed.date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function splitDateParts(dateStr) {
  const parsed = parseYmd(dateStr);
  if (!parsed) return { day: null, month: null, year: null };
  return { day: parsed.day, month: parsed.month, year: parsed.year };
}
