/** Truthy flags from API (boolean, "true", 1). */
export const isApiTrue = (value) =>
  value === true || value === 'true' || value === 1 || value === '1';

export const ATTENDANCE_LOCKED_MESSAGE =
  'Your account is locked because your profile is incomplete. Please complete the missing fields or contact the administrator.';

export const INOUT_BLOCKED_MESSAGE =
  'Your In-Out is locked because you did not check in, check out, or submit a leave request. Only an admin can unlock it.';

export const PROFILE_INCOMPLETE_ENTRY_MESSAGE =
  'Your profile is incomplete. Please complete your profile before checking in.';

export const PROFILE_FIELD_LABELS = {
  address: 'Address',
  bloodGroup: 'Blood group',
  dateOfBirth: 'Date of birth',
  'bankDetails.bankingName': 'Bank name',
  'bankDetails.bankAccountNumber': 'Bank account number',
  'bankDetails.ifscCode': 'IFSC code',
  phone: 'Phone',
  profilePic: 'Profile photo',
  skills: 'Skills',
};

const isEmpty = (value) => {
  if (value == null) return true;
  if (value instanceof Date) return Number.isNaN(value.getTime());
  if (typeof value === 'number') return !Number.isFinite(value);
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) {
    return !value.some((item) => (typeof item === 'string' ? item.trim() : item != null));
  }
  return false;
};

const firstFilled = (...values) => values.some((value) => !isEmpty(value));

/**
 * Backend may put profileIncomplete on the root or under data/result/meta.
 * Returns the object that owns the flag, or null.
 * Only explicit backend flags count — never guess from empty fields.
 */
export const getProfileIncompletePayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null;

  const candidates = [
    payload,
    payload.data,
    payload.result,
    payload.meta,
    payload.warning,
    payload.warnings,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    if (isApiTrue(candidate.profileComplete)) continue;
    if (candidate.profileIncomplete === false || candidate.profile_incomplete === false) {
      continue;
    }
    if (
      isApiTrue(candidate.profileIncomplete) ||
      isApiTrue(candidate.profile_incomplete) ||
      isApiTrue(candidate.isProfileIncomplete)
    ) {
      return candidate;
    }
  }

  return null;
};

export const unwrapUserPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return {};
  if (payload.user && typeof payload.user === 'object' && !Array.isArray(payload.user)) {
    return payload.user;
  }
  return payload;
};

const pickFilled = (...values) => values.find((value) => !isEmpty(value));

const profilePicUrl = (value) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return value.secure_url || value.url || '';
  return '';
};

/** Merge /users/me + /users/profile without letting empty API fields wipe filled ones. */
export const mergeUserRecords = (primary, secondary) => {
  const a = unwrapUserPayload(primary);
  const b = unwrapUserPayload(secondary);
  const bankA = a.bankDetails && typeof a.bankDetails === 'object' ? a.bankDetails : {};
  const bankB = b.bankDetails && typeof b.bankDetails === 'object' ? b.bankDetails : {};
  const missingA = Array.isArray(a.missingFields) ? a.missingFields : [];
  const missingB = Array.isArray(b.missingFields) ? b.missingFields : [];

  return {
    ...b,
    ...a,
    address: pickFilled(a.address, b.address, a.residentialAddress, b.residentialAddress),
    bloodGroup: pickFilled(a.bloodGroup, b.bloodGroup, a.blood_group, b.blood_group),
    dateOfBirth: pickFilled(a.dateOfBirth, b.dateOfBirth, a.dob, b.dob, a.birthDate, b.birthDate),
    phone: pickFilled(a.phone, b.phone),
    profilePic: pickFilled(profilePicUrl(a.profilePic), profilePicUrl(b.profilePic)),
    bankDetails: {
      ...bankB,
      ...bankA,
      bankingName: pickFilled(
        bankA.bankingName,
        bankB.bankingName,
        bankA.bankName,
        bankB.bankName,
        bankA.accountHolderName,
        bankB.accountHolderName
      ),
      bankAccountNumber: pickFilled(
        bankA.bankAccountNumber,
        bankB.bankAccountNumber,
        bankA.accountNumber,
        bankB.accountNumber
      ),
      ifscCode: pickFilled(bankA.ifscCode, bankB.ifscCode, bankA.ifsc, bankB.ifsc),
    },
    attendanceLocked: a.attendanceLocked ?? b.attendanceLocked,
    isAttendanceLocked: a.isAttendanceLocked ?? b.isAttendanceLocked,
    inoutBlocked: a.inoutBlocked ?? b.inoutBlocked,
    inoutBlockedAt: a.inoutBlockedAt ?? b.inoutBlockedAt,
    inoutBlockedForDate: a.inoutBlockedForDate ?? b.inoutBlockedForDate,
    profileIncomplete: a.profileIncomplete ?? b.profileIncomplete,
    profileComplete: a.profileComplete ?? b.profileComplete,
    missingFields: missingA.length ? missingA : missingB,
  };
};

/**
 * Must stay in sync with backend utils/profileCompletion.js required fields:
 * address, bloodGroup, dateOfBirth, bank name / account / IFSC.
 */
export const inferMissingProfileFields = (user) => {
  if (!user || typeof user !== 'object') return [];
  const bank = user.bankDetails || {};
  const missing = [];

  if (!firstFilled(user.address, user.residentialAddress)) missing.push('address');
  if (!firstFilled(user.bloodGroup, user.blood_group)) missing.push('bloodGroup');
  if (!firstFilled(user.dateOfBirth, user.dob, user.birthDate)) missing.push('dateOfBirth');
  if (!firstFilled(bank.bankingName, bank.bankName, bank.accountHolderName)) {
    missing.push('bankDetails.bankingName');
  }
  if (!firstFilled(bank.bankAccountNumber, bank.accountNumber)) {
    missing.push('bankDetails.bankAccountNumber');
  }
  if (!firstFilled(bank.ifscCode, bank.ifsc)) missing.push('bankDetails.ifscCode');

  return missing;
};

export const formatMissingProfileFields = (fields) => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  return fields.map((key) => PROFILE_FIELD_LABELS[key] || key.replace(/^bankDetails\./, ''));
};

export const getMissingProfileFieldsFromUser = (user) => {
  if (user?.profileIncomplete === false || user?.profile_incomplete === false) {
    return [];
  }
  if (isApiTrue(user?.profileComplete)) return [];
  if (Array.isArray(user?.missingFields) && user.missingFields.length > 0) {
    return user.missingFields;
  }
  return inferMissingProfileFields(user);
};

export const isProfileIncompleteUser = (user) => {
  if (!user || typeof user !== 'object') return false;

  // Explicit complete wins. Never guess from local field checks —
  // that caused filled users to see Incomplete while still being allowed to check in.
  if (isApiTrue(user.profileComplete)) return false;
  if (user.profileIncomplete === false || user.profile_incomplete === false) {
    return false;
  }

  return Boolean(getProfileIncompletePayload(user));
};

export const getAttendanceLockError = (error) => {
  const status = error?.response?.status;
  const body = error?.response?.data;
  const code =
    body?.code ||
    body?.error?.code ||
    body?.data?.code ||
    body?.errorCode;

  if (status === 403 && (code === 'ATTENDANCE_LOCKED' || code === 'INOUT_BLOCKED')) {
    if (code === 'INOUT_BLOCKED') {
      return {
        locked: true,
        reason: 'missed-day',
        missingFields: [],
        message: body?.message || body?.error?.message || INOUT_BLOCKED_MESSAGE,
      };
    }
    const missingFields = Array.isArray(body?.missingFields) ? body.missingFields : [];
    const labels = formatMissingProfileFields(missingFields);
    const missingText =
      labels.length > 0 ? ` Missing: ${labels.join(', ')}.` : '';
    return {
      locked: true,
      reason: 'profile',
      missingFields,
      message:
        (body?.message ||
          body?.error?.message ||
          ATTENDANCE_LOCKED_MESSAGE) + missingText,
    };
  }

  return { locked: false };
};

export const isInoutBlockedUser = (user) => isApiTrue(user?.inoutBlocked);

export const isAttendanceLockedUser = (user) =>
  isApiTrue(user?.attendanceLocked) ||
  isApiTrue(user?.isAttendanceLocked) ||
  isInoutBlockedUser(user);

export const attendanceLockMessageForUser = (user) => {
  if (isInoutBlockedUser(user)) return INOUT_BLOCKED_MESSAGE;
  if (isApiTrue(user?.attendanceLocked) || isApiTrue(user?.isAttendanceLocked)) {
    return ATTENDANCE_LOCKED_MESSAGE;
  }
  return '';
};

export const attendanceLockReasonLabel = (user) => {
  const reasons = [];
  if (isInoutBlockedUser(user)) {
    const date = user?.inoutBlockedForDate ? ` (${user.inoutBlockedForDate})` : '';
    reasons.push(`Missed check-in, check-out, and leave${date}`);
  }
  if (isApiTrue(user?.attendanceLocked) || isApiTrue(user?.isAttendanceLocked)) {
    reasons.push('Incomplete profile');
  }
  return reasons.join(' · ') || 'Locked';
};
