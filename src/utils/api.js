

// src/utils/api.js
// Local dev (npm start): relative URLs → setupProxy.js forwards to Linode (no CORS).
// Production build: calls https://api.inout.urbancode.tech (Linode VPS + nginx + SSL).
const PRODUCTION_API = 'https://api.inout.urbancode.tech';
export const BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? PRODUCTION_API : '');

// -----------------
// Auth & User APIs
// -----------------
export const API_ENDPOINTS = {
  
  authLogin: `${BASE_URL}/api/auth/login`,
   // -----------------
  // Auth
  // -----------------
  login: `${BASE_URL}/auth/login`,
  register: `${BASE_URL}/auth/register`,
  logout: `${BASE_URL}/auth/logout`,
  // -----------------
  // Users
  // -----------------
  
  getUsers: `${BASE_URL}/users`,
  getCurrentUser: `${BASE_URL}/users/me`,
  acknowledgeInoutUnlock: `${BASE_URL}/users/me/inout-unlock-seen`,
  getUserById: (userId) => `${BASE_URL}/users/${userId}`,
  updateUser: (userId) => `${BASE_URL}/users/${userId}`,
  updateSalary: (userId) => `${BASE_URL}/users/${userId}/salary`,
  getSchedules: `${BASE_URL}/schedules`,
  putUserSchedule: (userId) => `${BASE_URL}/schedules/${userId}`,
  getAllUsers: `${BASE_URL}/employeesAttendance`,
  getProfile: `${BASE_URL}/users/profile`,
  updateProfile: `${BASE_URL}/users/profile`,
  uploadProfile: `${BASE_URL}/users/profile/upload`,
  uploadLetter: `${BASE_URL}/users/letters/upload`,
  // getUserById: (id) => `${BASE_URL}/users/${id}`,
  // getAttendanceByUser: (id) => `${BASE_URL}/attendance/user/${id}`,


  // -----------------
  // Attendance APIs
  // -----------------
  postAttendance: `${BASE_URL}/attendance`,
  getMyAttendance: `${BASE_URL}/attendance/me`,
  getLastAttendanceGlobal: `${BASE_URL}/attendance/last`,
  getLastAttendance: `${BASE_URL}/attendance/last`,
  getAttendanceAll: `${BASE_URL}/attendance/all`,
  getAttendanceByDate: (date) => `${BASE_URL}/attendance/date/${date}`,
  getAttendanceByUser: (userId) => `${BASE_URL}/attendance/user/${userId}`,
  getUserSummary: (userId, year, month) => `${BASE_URL}/attendance/user/${userId}/summary/${year}/${month}`,
  getLastAttendanceByUser: (userId) => `${BASE_URL}/attendance/user/${userId}/last`,

  // -----------------
  // Admin Dashboard
  // -----------------
  getAdminSummary: `${BASE_URL}/api/admin/summary`,
  getRecentAttendanceLogs: `${BASE_URL}/api/admin/recent-attendance`,
  getRecentDashboardLogs:`${BASE_URL}/api/admin/recent-dashboard`,
  getAdminLetters: `${BASE_URL}/api/admin/letters`,

  // -----------------
  // Pending Users
  // -----------------
  pendingUsers: `${BASE_URL}/api/admin/pending-users`,
  createUser: `${BASE_URL}/api/admin/create-user`,
  approveUser: `${BASE_URL}/api/admin/approve`,     // Use: `${approveUser}/${userId}`
  rejectUser: `${BASE_URL}/api/admin/reject`,       // Use: `${rejectUser}/${userId}`
  unlockAttendance: (userId) => `${BASE_URL}/api/admin/users/${userId}/unlock-attendance`,

  // -----------------
  // Leave Management
  // -----------------
  applyLeave: `${BASE_URL}/api/leaves/apply`,
  getMyLeaves: `${BASE_URL}/api/leaves/me`,
  getAllLeaves: `${BASE_URL}/api/leaves/all`,
  updateLeaveStatus: (id) => `${BASE_URL}/api/leaves/${id}`,

  // -----------------
  // Holidays
  // -----------------
  addHoliday: `${BASE_URL}/api/holidays`,
  getHolidays: `${BASE_URL}/api/holidays`,
  getHolidaysByMonth: `${BASE_URL}/api/holidays/filter`,
  deleteHoliday: (id) => `${BASE_URL}/api/holidays/delete/${id}`,
  editHoliday: (id) => `${BASE_URL}/api/holidays/update/${id}`,

  // -----------------
  // Tasks
  // -----------------
  getTasksByDate: (date) => `${BASE_URL}/api/tasks/${date}`,
  addTask: `${BASE_URL}/api/tasks`,
  updateTaskStatus: (id) => `${BASE_URL}/api/tasks/${id}`,
  deleteTask: (id) => `${BASE_URL}/api/tasks/${id}`,
  updateFullTask: (id) => `${BASE_URL}/api/tasks/${id}`,             // PUT full task (task name or date)
  getTasksByMonth: (year, month) => `${BASE_URL}/api/tasks/month/${year}/${month}`,
  getTaskSummary: `${BASE_URL}/api/tasks/summary`,                   // Summary: total, done, pending

  // -----------------
  // Misc
  // -----------------
  uploadPath: `${BASE_URL}/uploads`,



  // -----------------
  // Payslip APIs
  // -----------------
  createPayslip: `${BASE_URL}/api/payslips`,              // POST new payslip
  getPayslips: `${BASE_URL}/api/payslips`,               // GET all payslips
  // getPayslipById: (id) => `${BASE_URL}/api/payslips/${id}`, // GET payslip by ID
  // getPayslipsByUser: (userId) => `${BASE_URL}/api/payslips/user/${userId}`, // GET all payslips for one user
};

// -----------------
// Helper Functions
// -----------------

// Create Payslip


// Get All Payslips
export const getPayslips = async () => {
  const response = await fetch(API_ENDPOINTS.getPayslips);
  if (!response.ok) throw new Error('Failed to fetch payslips');
  return response.json();
};
// -----------------
// Helper Functions (Optional)
// -----------------

export const getAttendanceAll = async () => {
  const response = await fetch(API_ENDPOINTS.getAttendanceAll);
  if (!response.ok) throw new Error('Failed to fetch attendance data');
  return response.json();
};

export const getUsers = async () => {
  const response = await fetch(API_ENDPOINTS.getUsers);
  if (!response.ok) throw new Error('Failed to fetch users data');
  return response.json();
};

export const getAttendanceByDate = async (date) => {
  const response = await fetch(API_ENDPOINTS.getAttendanceByDate(date));
  if (!response.ok) throw new Error('Failed to fetch attendance data');
  return response.json();
};

export const getLastAttendance = async () => {
  const response = await fetch(API_ENDPOINTS.getLastAttendanceGlobal);
  if (!response.ok) throw new Error('Failed to fetch last attendance data');
  return response.json();
};

export const login = async (email, password) => {
  const response = await fetch(API_ENDPOINTS.login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error('Failed to login');
  return response.json();
};

export const register = async (userData) => {
  const response = await fetch(API_ENDPOINTS.register, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!response.ok) throw new Error('Failed to register');
  return response.json();
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const logoutUser = async () => {
  try {
    await fetch(API_ENDPOINTS.logout, { method: 'POST', credentials: 'include' });
  } catch (_) {
    // Best-effort — still clear local state below.
  }
  localStorage.removeItem('token');
};
// -----------------Schedule APIs-----------------
export const getSchedules = async () => {
  const response = await fetch(`${BASE_URL}/users/schedules`);
  if (!response.ok) throw new Error('Failed to fetch schedules');
  return response.json();
};