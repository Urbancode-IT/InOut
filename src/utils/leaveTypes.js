/** Real leave types that count toward monthly quota and leave reports. */
export const PERSONAL_LEAVE_TYPES = ['Casual', 'Sick', 'Emergency'];

/** Office attendance without punch — unlocks lock, counts as Present (not Leave). */
export const FORGOT_PUNCH_LEAVE_TYPE = 'Forgot Check-In/Out';

export const ALL_LEAVE_TYPES = [...PERSONAL_LEAVE_TYPES, FORGOT_PUNCH_LEAVE_TYPE];

export const MONTHLY_LEAVE_LIMITS = { Casual: 1, Sick: 1, Emergency: 1 };

export const isPersonalLeaveType = (leaveType) =>
  PERSONAL_LEAVE_TYPES.includes(leaveType);

export const isForgotPunchLeaveType = (leaveType) =>
  leaveType === FORGOT_PUNCH_LEAVE_TYPE;
