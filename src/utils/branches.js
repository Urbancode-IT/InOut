import { getPrimaryWork, getUserWorks, withSyncedWorks } from './userWorks';
import { getLogOfficeName } from './officeLocations';

export const BRANCH_OPTIONS = ['Chennai Pallikarani', 'Chennai Velachery', 'Tirunelveli'];

/** Read branch from API user (top-level, works, or bankDetails.officeBranch). */
export const extractBranchFromUser = (user) => {
  if (!user) return '';
  return (
    normalizeBranchValue(user.branch) ||
    normalizeBranchValue(getUserWorks(user)[0]?.branch) ||
    normalizeBranchValue(user.bankDetails?.officeBranch) ||
    normalizeBranchValue(user.address) ||
    ''
  );
};

/** Whitelisted PUT body — ensures branch is sent in fields the API may persist. */
export const buildUserUpdatePayload = (form) => {
  const synced = withSyncedWorks(form, normalizeBranchValue(form.branch));
  const branch = extractBranchFromUser(synced) || normalizeBranchValue(form.branch) || '';
  const existingAddress = (synced.address || '').trim();
  const addressIsBranch = !!normalizeBranchValue(existingAddress);
  const hasRealAddress =
    existingAddress && !addressIsBranch && existingAddress.toLowerCase() !== 'n/a';
  // Legacy Render API ignores branch/works — persist branch via address until backend redeploys.
  const addressForApi = branch
    ? hasRealAddress
      ? `${branch} | ${existingAddress}`
      : branch
    : existingAddress || undefined;

  return {
    name: synced.name || '',
    email: synced.email || '',
    phone: synced.phone || '',
    company: synced.company || '',
    department: synced.department || '',
    position: synced.position || '',
    salary:
      synced.salary === '' || synced.salary === null || synced.salary === undefined
        ? 0
        : Number(synced.salary),
    qualification: synced.qualification || '',
    dateOfJoining: synced.dateOfJoining || undefined,
    dateOfRelieving: synced.dateOfRelieving || null,
    dateOfBirth: synced.dateOfBirth || undefined,
    address: addressForApi,
    profilePic: synced.profilePic || '',
    linkedin: synced.linkedin || '',
    github: synced.github || '',
    skills: Array.isArray(synced.skills) ? synced.skills : [],
    rolesAndResponsibility: Array.isArray(synced.rolesAndResponsibility)
      ? synced.rolesAndResponsibility
      : [],
    works: (synced.works || []).map((w) => ({
      company: w.company || '',
      department: w.department || '',
      position: w.position || '',
      branch: branch || normalizeBranchValue(w.branch) || '',
    })),
    branch,
    bankDetails: {
      bankingName: synced.bankDetails?.bankingName || '',
      bankAccountNumber: synced.bankDetails?.bankAccountNumber || '',
      ifscCode: synced.bankDetails?.ifscCode || '',
      upiId: synced.bankDetails?.upiId || '',
      officeBranch: branch,
    },
    isActive: synced.isActive !== false,
    skipAttendanceReminders: synced.skipAttendanceReminders === true,
    adminComments: synced.adminComments || '',
    employeeId: synced.employeeId || '',
    empGrade: synced.empGrade || '',
    pan: synced.pan || '',
    uan: synced.uan || '',
    esiNumber: synced.esiNumber || '',
    aadharNumber: synced.aadharNumber || '',
  };
};

/** Chennai: Velechery + Pallikaranai. Tirunelveli: Fab Sapphire Towers (S Bypass Rd). */
export const isPhysicalOfficePresent = (officeName) => {
  if (!officeName) return false;
  const o = String(officeName).toLowerCase();
  return (
    o.includes('velechery') ||
    o.includes('velachery') ||
    o.includes('pallikarani') ||
    o.includes('tirunelveli') ||
    o.includes('tvl')
  );
};

export const normalizeBranchValue = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  const branchPrefix = raw.split('|')[0].trim();
  const lower = branchPrefix.toLowerCase();
  if (lower.includes('tirunel') || lower === 'tvl') return 'Tirunelveli';
  if (lower.includes('pallikar')) return 'Chennai Pallikarani';
  if (lower.includes('velach') || lower.includes('velech') || lower === 'velachery') return 'Chennai Velachery';
  if (lower === 'chennai') return 'Chennai Pallikarani';
  if (BRANCH_OPTIONS.some((b) => b.toLowerCase() === lower)) {
    return BRANCH_OPTIONS.find((b) => b.toLowerCase() === lower);
  }
  return '';
};

/** Branch on user profile; falls back to department text for older records. */
export const getUserBranch = (user) => {
  if (!user || typeof user !== 'object') return '';
  const fromField =
    normalizeBranchValue(user.branch) ||
    normalizeBranchValue(user.works?.[0]?.branch) ||
    normalizeBranchValue(user.bankDetails?.officeBranch) ||
    normalizeBranchValue(user.address);
  if (fromField) return fromField;

  const dept = (
    user.department ||
    getPrimaryWork(user).department ||
    ''
  ).toLowerCase();
  if (dept.includes('tirunel')) return 'Tirunelveli';
  if (dept.includes('pallikar')) return 'Chennai Pallikarani';
  if (dept.includes('velach') || dept.includes('velech')) return 'Chennai Velachery';
  if (dept.includes('chennai')) return 'Chennai Pallikarani';
  return '';
};

export const matchesBranchFilter = (user, filterBranch) => {
  if (!filterBranch || filterBranch === 'All') return true;
  return getUserBranch(user) === filterBranch;
};

/** Compact label for table cells; full name available via title/tooltip. */
export const getBranchShortLabel = (branch) => {
  if (branch === 'Chennai Pallikarani') return 'Pallikarani';
  if (branch === 'Chennai Velachery') return 'Velachery';
  if (branch === 'Tirunelveli') return 'Tirunelveli';
  return branch || '';
};

export const branchBadgeClass = (branch) => {
  if (branch === 'Chennai Pallikarani') return 'uc-branch-badge uc-branch-pallikarani';
  if (branch === 'Chennai Velachery') return 'uc-branch-badge uc-branch-velachery';
  if (branch === 'Tirunelveli') return 'uc-branch-badge uc-branch-tirunelveli';
  return 'uc-branch-badge uc-branch-default';
};

export const findUserForAttendanceLog = (log, allUsers = []) => {
  if (!log) return null;
  const uid = log.userId ?? log.user?._id ?? log.user?.id;
  if (uid) {
    const byId = allUsers.find((u) => String(u._id) === String(uid));
    if (byId) return byId;
  }
  const name = (log.employeeName || log.user?.name || '').trim().toLowerCase();
  if (!name) return null;
  return allUsers.find((u) => (u.name || '').trim().toLowerCase() === name) || null;
};

/**
 * Dashboard branch filter: match the office shown on the attendance log
 * (Office In / GPS), not the employee's profile branch.
 * Example: user assigned to Pallikarani but checked in at Velachery must
 * appear only under "Chennai Velachery", not Pallikarani.
 */
export const logMatchesBranchFilter = (log, _allUsers, filterBranch) => {
  if (!filterBranch || filterBranch === 'All') return true;

  const officeBranch = normalizeBranchValue(getLogOfficeName(log));
  if (officeBranch) return officeBranch === filterBranch;

  // Outside Office / unknown location — not part of a selected branch
  return false;
};

export const officePresentBadgeClass = (officeName) => {
  if (!officeName) return 'uc-office-badge uc-office-outside';
  const o = String(officeName).toLowerCase();
  if (o.includes('pallikar')) return 'uc-office-badge uc-office-pallikarani';
  if (o.includes('velach') || o.includes('velech')) return 'uc-office-badge uc-office-velachery';
  if (o.includes('tirunel') || o.includes('tvl')) return 'uc-office-badge uc-office-tirunelveli';
  if (isPhysicalOfficePresent(officeName)) return 'uc-office-badge uc-office-pallikarani';
  return 'uc-office-badge uc-office-outside';
};
