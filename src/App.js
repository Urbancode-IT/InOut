import React from 'react';
import {  Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

//  Admnin Dashboard
import DashSavi from './pages/Dashboard';

// Public Pages
import Login from './components/Login';
import Register from './components/Register';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import Employees from './pages/admin/Employees';
// import Salary from './pages/admin/Salary';
import Attendance from './pages/admin/Attendance';
import Reports from './pages/admin/Reports';
import CommentsPage from './pages/admin/Comments';
import LeaveRequestsAdmin from './pages/admin/LeaveRequests';


import AttendancePage from './pages/employee/AttendancePage';
import Leave from './pages/employee/ApplyLeaveForm';
import EditUser from './components/EditUser';
import AddUser from './pages/admin/AddUser';
import AllUsers from './pages/admin/AllUsers';
import UserDetail from './pages/admin/UserDetail';
import EditUserPage from './pages/admin/EditUserPage';
import Holidays from './pages/admin/Holidays';
import TaskManagerPage from './pages/employee/TaskManagerPage';
import PayslipGenerator from './pages/admin/PayslipGenerator';
import PayslipList from './pages/admin/PayslipList';
// Layout
import Layout from './components/admin-dashboard/layout/Layout';
import ProfileCard from './pages/employee/ProfileCard';
import ComingSoon from './pages/admin/ComingSoon';
import OfferLetters from './pages/admin/OfferLetters';
import ExperienceLetter from './pages/admin/ExperienceLetter';
import RelievingLetter from './pages/admin/RelievingLetter';
import InternshipLetter from './pages/admin/InternshipLetter';
import InternshipOfferLetter from './pages/admin/InternshipOfferLetter';
import AllLetters from './pages/admin/AllLetters';
import UploadDocuments from './pages/admin/UploadDocuments';
import LetterGenerator from './pages/admin/letter-generator/LetterGenerator';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import ProtectedRoute from './components/ProtectedRoute';
import PendingUsers from './pages/admin/PendingUsers';
import AdminProfile from './pages/admin/AdminProfile';
import AcceptOffer from './pages/AcceptOffer';

function App() {
  //  const navigate = useNavigate();

  // useEffect(() => {
  //   const token = localStorage.getItem('token');

  //   if (token) {
  //     try {
  //       const decoded = jwtDecode(token);
  //       const isExpired = decoded.exp * 1000 < Date.now();

  //       if (isExpired) {
  //         localStorage.removeItem('token');
  //       } else {
  //         if (decoded.role === 'admin') navigate('/dashboard');
  //         else if (decoded.role === 'employee') navigate('/attendance');
  //       }
  //     } catch (err) {
  //       console.error('Error decoding token:', err);
  //       localStorage.removeItem('token');
  //     }
  //   }
  // }, []);
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} newestOnTop theme="light" />
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/accept-offer/:token" element={<AcceptOffer />} />
        <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
        <Route path="/attendance/:userId" element={<AttendancePage />} />
        <Route path="/apply-leave" element={<ProtectedRoute><Leave /></ProtectedRoute>} />
        <Route path="/task-manager" element={<TaskManagerPage />} />
        <Route path="/profile" element={<ProtectedRoute><ProfileCard /></ProtectedRoute>} />

        {/* Protected Admin Layout Wrapper */}
        <Route element={
          <AdminProtectedRoute><Layout /></AdminProtectedRoute>
          }>
          <Route path="/admin" element={<DashSavi />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/salaryhistory" element={<PayslipList />} />
          <Route path="/attendances" element={<Attendance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/comments" element={<CommentsPage />} />
          <Route path="/letter-generator" element={<LetterGenerator />} />
          <Route path="/offer-letters" element={<OfferLetters />} />
          <Route path="/experience-letters" element={<ExperienceLetter />} />
          <Route path="/relieving-letters" element={<RelievingLetter />} />
          <Route path="/internship-letter" element={<InternshipLetter />} />
          <Route path="/internship-offer" element={<InternshipOfferLetter />} />
          <Route path="/all-letters" element={<AllLetters />} />
          <Route path="/upload-documents" element={<UploadDocuments />} />
          <Route path="/pending-users" element={<PendingUsers />} />
          <Route path="/add-user" element={<AddUser />} />
          <Route path="/all-users" element={<AllUsers />} />
          <Route path="/all-users/:userId" element={<UserDetail />} />
          <Route path="/all-users/:userId/edit" element={<EditUserPage />} />
          <Route path="/holidays" element={<Holidays />} />
          <Route path="/payslip" element={<PayslipGenerator />} />
          <Route path="/leave-requests" element={<LeaveRequestsAdmin />} />
          <Route path="/admin-profile" element={<AdminProfile />} />
          <Route path="/coming-soon/*" element={<ComingSoon/>}/>
          {/* Add other admin routes here */}
          <Route path="/edit-user" element={<EditUser />} />
        </Route>

      </Routes>
    </>
  );
}

export default App;
