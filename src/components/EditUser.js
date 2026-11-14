// client/src/components/EditUser.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiUser, FiMail, FiLock, FiCalendar, FiChevronDown } from 'react-icons/fi';
import { API_ENDPOINTS } from '../utils/api';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  createDefaultWeeklySchedule,
  normalizeEmploymentType,
} from '../utils/registrationConstants';

function EditUser() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    dateOfBirth: '',
    employmentType: 'Full-Time',
  });
  
  const [weeklySchedule, setWeeklySchedule] = useState(createDefaultWeeklySchedule('Full-Time'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch all users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(API_ENDPOINTS.getUsers, { headers });
        setUsers(response.data);

        console.log('response.data:', response.data);
        setIsLoading(false);
        
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to fetch users');
        setIsLoading(false);
      }
    };
    fetchUsers();
 // Clear users on component mount to avoid stale data
  }, []);

  // Load user data when selected user changes
  useEffect(() => {
    if (selectedUserId) {
      const loadUserData = async () => {
        try {
          setIsLoading(true);
          // Fetch user details
          const token = localStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const userResponse = await axios.get(API_ENDPOINTS.getUserById(selectedUserId), { headers });
          const userData = userResponse.data;
          
          // Fetch user schedule
          const scheduleResponse = await axios.get(API_ENDPOINTS.getSchedules, { headers });
          const scheduleList = Array.isArray(scheduleResponse.data) ? scheduleResponse.data : [];
          const scheduleData = scheduleList.find(
            (s) => String(s.user?._id || s.user) === String(selectedUserId)
          );
          
          const employmentType = normalizeEmploymentType(
            scheduleData?.employmentType || userData.employmentType
          );

          // Update state
          setFormData({
            name: userData.name,
            email: userData.email,
            password: '', // Don't pre-fill password for security
            dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '',
            employmentType,
          });
          
          if (scheduleData?.weeklySchedule) {
            setWeeklySchedule(scheduleData.weeklySchedule);
          } else {
            setWeeklySchedule(createDefaultWeeklySchedule(employmentType));
          }
          
          setIsLoading(false);
        } catch (error) {
          console.error('Error loading user data:', error);
          setError('Failed to load user data');
          setIsLoading(false);
        }
      };
      loadUserData();
    }
  }, [selectedUserId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'employmentType') {
      const employmentType = normalizeEmploymentType(value);
      setFormData((prev) => ({ ...prev, employmentType }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScheduleChange = (day, field, value) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Please select a user to edit');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Prepare update data (only include password if it's changed)
      const updateData = {
        name: formData.name,
        email: formData.email,
        ...(formData.password && { password: formData.password }),
        employmentType: normalizeEmploymentType(formData.employmentType),
        schedule: weeklySchedule,
        dateOfBirth: formData.dateOfBirth || undefined
      };

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(API_ENDPOINTS.updateUser(selectedUserId), updateData, { headers });
      setSuccess('User updated successfully!');
      
      const response = await axios.get(API_ENDPOINTS.getUsers, { headers });
      setUsers(response.data);
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error.response?.data?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Edit User</h2>
          <p className="mt-2 text-sm text-gray-600">
            Select a user and update their details and schedule
          </p>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select User to Edit
              </label>
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex justify-between items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {selectedUserId 
                    ? users.find(u => u._id === selectedUserId)?.name || 'Select a user'
                    : 'Select a user'}
                  <FiChevronDown className={`ml-2 h-5 w-5 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {isLoading ? (
                      <div className="px-4 py-2 text-gray-500">Loading users...</div>
                    ) : users.length === 0 ? (
                      <div className="px-4 py-2 text-gray-500">No users found</div>
                    ) : (
                      users.map(user => (
                        <button
                          key={user._id}
                          onClick={() => {
                            setSelectedUserId(user._id);
                            setIsDropdownOpen(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 ${
                            selectedUserId === user._id ? 'bg-gray-100' : ''
                          }`}
                        >
                          {`${user.name} (${user.email}) - ${user.role}`}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {selectedUserId && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6 sm:p-8">
              {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-md text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 p-3 bg-green-50 text-green-600 rounded-md text-sm">
                  {success}
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiUser className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="pl-10 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiMail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="pl-10 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        New Password (leave blank to keep current)
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiLock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          minLength="6"
                          className="pl-10 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        id="dateOfBirth"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center mb-4">
                      <FiCalendar className="h-5 w-5 text-gray-500 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">Weekly Schedule</h3>
                    </div>

                    <div className="mb-4">
                      <label htmlFor="employmentType" className="block text-sm font-medium text-gray-700 mb-1">
                        Employment Type
                      </label>
                      <select
                        id="employmentType"
                        name="employmentType"
                        value={normalizeEmploymentType(formData.employmentType)}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {EMPLOYMENT_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        {normalizeEmploymentType(formData.employmentType) === 'Part-Time'
                          ? 'Part-time: set flexible working days and shorter shifts as needed.'
                          : 'Full-time: keep the standard weekly schedule and adjust days/hours as needed.'}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {days.map((day) => (
                        <div key={day} className={`p-4 rounded-md ${weeklySchedule[day].isLeave ? 'bg-gray-50' : 'bg-blue-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={weeklySchedule[day].isLeave}
                                onChange={(e) => handleScheduleChange(day, 'isLeave', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm font-medium text-gray-700">
                                {day}
                              </span>
                            </label>
                            {weeklySchedule[day].isLeave ? (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                Day Off
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                Working Day
                              </span>
                            )}
                          </div>

                          {!weeklySchedule[day].isLeave && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Start Time
                                </label>
                                <input
                                  type="time"
                                  value={weeklySchedule[day].start}
                                  onChange={(e) => handleScheduleChange(day, 'start', e.target.value)}
                                  className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  End Time
                                </label>
                                <input
                                  type="time"
                                  value={weeklySchedule[day].end}
                                  onChange={(e) => handleScheduleChange(day, 'end', e.target.value)}
                                  className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </>
                      ) : (
                        'Update User'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditUser;