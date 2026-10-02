import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../../utils/api';
import { useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiPlus, FiTrash2 } from 'react-icons/fi';
import { emptyWork, getUserWorks, normalizeStringList } from '../../../utils/userWorks';
import { BRANCH_OPTIONS, extractBranchFromUser, buildUserUpdatePayload } from '../../../utils/branches';
import './edit-form.css';

const EditUser = ({ userId, onClose, onUpdated, pageMode = false }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    position: '',
    company: '',
    salary: '',
    department: '',
    qualification: '',
    dateOfJoining: '',
    dateOfBirth: '',
    dateOfRelieving: '',
    profilePic: '',
    skills: [],
    rolesAndResponsibility: [],
    works: [emptyWork()],
    isActive: true,
    skipAttendanceReminders: false,
    adminComments: '',
    employeeId: '',
    branch: '',
    linkedin: '',
    github: '',
    empGrade: '',
    pan: '',
    uan: '',
    esiNumber: '',
    bankDetails: {
      bankingName: '',
      bankAccountNumber: '',
      ifscCode: '',
      upiId: '',
    },
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [uploadingAadhar, setUploadingAadhar] = useState(false);
  const navigate = useNavigate();

  const handleAadharUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedMimes.includes(file.type)) {
      toast.warning('Invalid file type: Only JPG/PNG images and PDF documents are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.warning('File too large: Maximum allowed size for Aadhaar Card is 5 MB.');
      return;
    }

    try {
      setUploadingAadhar(true);
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('aadharCard', file);
      if (userId) fd.append('userId', userId);
      const res = await axios.post(API_ENDPOINTS.uploadAadhar, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      const updatedCard = res.data?.aadharCard;
      setForm((prev) => ({ ...prev, aadharCard: updatedCard }));
      toast.success('Aadhaar Card uploaded successfully');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload Aadhaar Card');
    } finally {
      setUploadingAadhar(false);
      e.target.value = '';
    }
  };

  const isPage = pageMode || !onClose;

  useEffect(() => {
    if (!userId) return;
    axios
      .get(API_ENDPOINTS.getUserById(userId), {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      .then(({ data }) => {
        const works = getUserWorks(data);
        setForm({
          ...data,
          skills: normalizeStringList(data.skills),
          rolesAndResponsibility: normalizeStringList(data.rolesAndResponsibility),
          works: works.length ? works : [emptyWork()],
          bankDetails: data.bankDetails || {},
          isActive: data.isActive ?? false,
          skipAttendanceReminders: data.skipAttendanceReminders === true,
          branch: extractBranchFromUser(data),
        });
      })
      .catch(() => toast.error('Error: Failed to fetch user'));
  }, [userId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Error: Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Error: Password must be at least 6 characters long');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(API_ENDPOINTS.updateUser(userId), { password: passwordData.newPassword }, { headers });
      toast.success('Success: Password updated successfully');
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setShowPasswordFields(false);
    } catch (err) {
      console.error(err);
      toast.error('Error: Password update failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const payload = buildUserUpdatePayload(form);
      const { data } = await axios.put(API_ENDPOINTS.updateUser(userId), payload, { headers });
      toast.success('Success: User updated successfully');
      onUpdated?.(data?.user);
      if (isPage) navigate('/all-users', { state: { userListRefresh: Date.now() } });
      else onClose?.();
    } catch (err) {
      console.error(err);
      toast.error('Error: Update failed');
    }
  };

  const handleArrayField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value.split(',').map((v) => v.trim()).filter(Boolean) }));
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, bankDetails: { ...prev.bankDetails, [name]: value } }));
  };

  const handleWorkChange = (index, field, value) => {
    setForm((prev) => {
      const works = [...(prev.works || [])];
      works[index] = { ...works[index], [field]: value };
      const next = { ...prev, works };
      if (index === 0) {
        next.company = works[0].company;
        next.department = works[0].department;
        next.position = works[0].position;
      }
      return next;
    });
  };

  const addWork = () => {
    setForm((prev) => ({
      ...prev,
      works: [...(prev.works || []), emptyWork()],
    }));
  };

  const removeWork = (index) => {
    setForm((prev) => {
      if ((prev.works || []).length <= 1) return prev;
      const works = prev.works.filter((_, i) => i !== index);
      const next = { ...prev, works };
      if (index === 0) {
        next.company = works[0]?.company || '';
        next.department = works[0]?.department || '';
        next.position = works[0]?.position || '';
      }
      return next;
    });
  };

  const shellClass = isPage ? 'uc-edit-page' : 'uc-edit-overlay';

  return (
    <div className={shellClass}>
      <div className="uc-edit-card">
        <div className="uc-edit-header">
          <div className="uc-edit-header-left">
            {isPage && (
              <button type="button" className="uc-edit-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
                <FiChevronLeft size={20} />
              </button>
            )}
            <div className="uc-edit-avatar">{form.name?.charAt(0) || 'U'}</div>
            <div>
              <h2 className="uc-edit-title">Edit User</h2>
              <p className="uc-edit-subtitle">{form.email || '—'}</p>
            </div>
          </div>
          <div className="uc-edit-emp-id">
            <span>Employee ID</span>
            <strong>{form.employeeId || '—'}</strong>
            {!isPage && (
              <button
                type="button"
                className="uc-btn uc-btn-outline"
                style={{ marginTop: 8 }}
                onClick={onClose}
              >
                Close
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="uc-edit-form">
          <div className="uc-form-grid-2">
            <div>
              <div className="uc-form-field">
                <label htmlFor="edit-name">Full name</label>
                <input id="edit-name" type="text" name="name" value={form.name} onChange={handleChange} placeholder="Name" />
              </div>
              <div className="uc-form-field">
                <label htmlFor="edit-email">Email</label>
                <input id="edit-email" type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email" />
              </div>
              <div className="uc-form-field">
                <label htmlFor="edit-phone">Phone</label>
                <input id="edit-phone" type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" />
              </div>
              <div className="uc-form-field">
                <label htmlFor="edit-branch">Branch</label>
                <select id="edit-branch" name="branch" value={form.branch || ''} onChange={handleChange}>
                  <option value="">Select branch</option>
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <p className="uc-form-hint">Chennai Pallikarani, Chennai Velachery, or Tirunelveli office.</p>
              </div>
              <div className="uc-form-field">
                <label htmlFor="edit-join">Date of Joining</label>
                <input
                  id="edit-join"
                  type="date"
                  name="dateOfJoining"
                  value={form.dateOfJoining?.slice(0, 10) || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="uc-form-field">
                <label htmlFor="edit-dob">Date of Birth</label>
                <input
                  id="edit-dob"
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth?.slice(0, 10) || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="uc-form-field">
                <label htmlFor="edit-relieving">Date of Relieving</label>
                <input
                  id="edit-relieving"
                  type="date"
                  name="dateOfRelieving"
                  value={form.dateOfRelieving?.slice(0, 10) || ''}
                  onChange={handleChange}
                />
                <p className="uc-form-hint">Leave empty if the employee is still working.</p>
              </div>
            </div>

            <div>
              <div className="uc-form-field">
                <label htmlFor="edit-salary">Salary</label>
                <input id="edit-salary" type="number" name="salary" value={form.salary} onChange={handleChange} placeholder="Salary" />
              </div>
              <div className="uc-form-field">
                <label htmlFor="edit-qual">Qualification</label>
                <input id="edit-qual" type="text" name="qualification" value={form.qualification} onChange={handleChange} placeholder="Qualification" />
              </div>
              <div className="uc-form-field">
                <label htmlFor="edit-skills">Skills (comma separated)</label>
                <input
                  id="edit-skills"
                  type="text"
                  value={form.skills.join(', ')}
                  onChange={(e) => handleArrayField('skills', e.target.value)}
                  placeholder="e.g. Power BI, Tableau, SQL"
                />
              </div>
              <div className="uc-form-field">
                <label htmlFor="edit-roles">Responsibilities (comma separated)</label>
                <input
                  id="edit-roles"
                  type="text"
                  value={form.rolesAndResponsibility.join(', ')}
                  onChange={(e) => handleArrayField('rolesAndResponsibility', e.target.value)}
                  placeholder="Training, Interview Support"
                />
              </div>
              <div className="uc-form-field">
                <label htmlFor="edit-linkedin">LinkedIn Profile</label>
                <input
                  id="edit-linkedin"
                  type="url"
                  name="linkedin"
                  value={form.linkedin || ''}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div className="uc-form-field">
                <label htmlFor="edit-github">GitHub Profile</label>
                <input
                  id="edit-github"
                  type="url"
                  name="github"
                  value={form.github || ''}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                />
              </div>
              <div className="uc-form-check">
                <input type="checkbox" id="isActive" name="isActive" checked={form.isActive} onChange={handleChange} />
                <label htmlFor="isActive">Active User</label>
              </div>
              <div className="uc-form-check">
                <input
                  type="checkbox"
                  id="skipAttendanceReminders"
                  name="skipAttendanceReminders"
                  checked={Boolean(form.skipAttendanceReminders)}
                  onChange={handleChange}
                />
                <label htmlFor="skipAttendanceReminders">Skip attendance reminder emails</label>
              </div>
            </div>
          </div>

          <div className="uc-form-section">
            <div className="uc-form-section-head">
              <div>
                <h3>Work Assignments</h3>
                <p>One person can have multiple company / department / role entries.</p>
              </div>
              <button type="button" className="uc-btn uc-btn-indigo" onClick={addWork}>
                <FiPlus size={16} />
                Add Work
              </button>
            </div>

            {(form.works || []).map((work, index) => (
              <div key={index} className="uc-work-card">
                <div className="uc-work-card-head">
                  <span>{index === 0 ? 'Primary Work' : `Work ${index + 1}`}</span>
                  {(form.works || []).length > 1 && (
                    <button type="button" className="uc-btn-text-danger" onClick={() => removeWork(index)}>
                      <FiTrash2 size={14} />
                      Remove
                    </button>
                  )}
                </div>
                <div className="uc-form-grid-3">
                  <div className="uc-form-field" style={{ marginBottom: 0 }}>
                    <label>Company</label>
                    <input
                      type="text"
                      list={`companies-${index}`}
                      value={work.company}
                      onChange={(e) => handleWorkChange(index, 'company', e.target.value)}
                      placeholder="e.g. Urbancode, Jobzenter"
                    />
                    <datalist id={`companies-${index}`}>
                      <option value="Jobzenter" />
                      <option value="Urbancode" />
                    </datalist>
                  </div>
                  <div className="uc-form-field" style={{ marginBottom: 0 }}>
                    <label>Department</label>
                    <input
                      type="text"
                      value={work.department}
                      onChange={(e) => handleWorkChange(index, 'department', e.target.value)}
                      placeholder="Department"
                    />
                  </div>
                  <div className="uc-form-field" style={{ marginBottom: 0 }}>
                    <label>Designation</label>
                    <input
                      type="text"
                      value={work.position}
                      onChange={(e) => handleWorkChange(index, 'position', e.target.value)}
                      placeholder="Designation"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="uc-form-section">
            <div className="uc-form-field">
              <label htmlFor="edit-comments">Admin Comments</label>
              <textarea
                id="edit-comments"
                name="adminComments"
                value={form.adminComments || ''}
                onChange={handleChange}
                placeholder="Internal notes / comments"
                rows={4}
              />
            </div>
          </div>

          <div className="uc-form-section">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Statutory Details</h3>
            <div className="uc-form-grid-3">
              <div className="uc-form-field" style={{ marginBottom: 0 }}>
                <label>Emp Grade</label>
                <input type="text" name="empGrade" value={form.empGrade || ''} onChange={handleChange} placeholder="Emp Grade" />
              </div>
              <div className="uc-form-field" style={{ marginBottom: 0 }}>
                <label>PAN</label>
                <input type="text" name="pan" value={form.pan || ''} onChange={handleChange} placeholder="PAN" />
              </div>
              <div className="uc-form-field" style={{ marginBottom: 0 }}>
                <label>PF-UAN</label>
                <input type="text" name="uan" value={form.uan || ''} onChange={handleChange} placeholder="UAN" />
              </div>
            </div>
            <div className="uc-form-grid-2">
              <div className="uc-form-field" style={{ marginBottom: 0 }}>
                <label>ESI Number</label>
                <input type="text" name="esiNumber" value={form.esiNumber || ''} onChange={handleChange} placeholder="ESI Number" />
              </div>
              <div className="uc-form-field" style={{ marginBottom: 0 }}>
                <label>Aadhaar Number</label>
                <input type="text" name="aadharNumber" value={form.aadharNumber || ''} onChange={handleChange} placeholder="Aadhaar Number" />
              </div>
            </div>
            <div className="uc-form-field" style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Aadhaar Card Document</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {form.aadharCard?.url ? (
                  <>
                    <span style={{ padding: '4px 12px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: 600, fontSize: '0.8rem' }}>
                      ✓ Uploaded
                    </span>
                    <a
                      href={form.aadharCard.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="uc-btn uc-btn-primary"
                      style={{ textDecoration: 'none', padding: '6px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      View / Download Document
                    </a>
                    <label className="uc-btn uc-btn-outline" style={{ padding: '6px 14px', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                      {uploadingAadhar ? 'Uploading...' : 'Replace File'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        disabled={uploadingAadhar}
                        onChange={handleAadharUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <span style={{ padding: '4px 12px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', fontWeight: 600, fontSize: '0.8rem' }}>
                      Not Uploaded
                    </span>
                    <label className="uc-btn uc-btn-primary" style={{ padding: '6px 16px', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                      {uploadingAadhar ? 'Uploading...' : 'Upload Aadhaar Card'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        disabled={uploadingAadhar}
                        onChange={handleAadharUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="uc-form-section">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Banking Details</h3>
            <div className="uc-form-grid-3">
              <div className="uc-form-field" style={{ marginBottom: 0 }}>
                <label>Bank Name</label>
                <input type="text" name="bankingName" value={form.bankDetails.bankingName || ''} onChange={handleBankChange} placeholder="Bank Name" />
              </div>
              <div className="uc-form-field" style={{ marginBottom: 0 }}>
                <label>Account Number</label>
                <input type="text" name="bankAccountNumber" value={form.bankDetails.bankAccountNumber || ''} onChange={handleBankChange} placeholder="Account Number" />
              </div>
              <div className="uc-form-field" style={{ marginBottom: 0 }}>
                <label>IFSC Code</label>
                <input type="text" name="ifscCode" value={form.bankDetails.ifscCode || ''} onChange={handleBankChange} placeholder="IFSC Code" />
              </div>
            </div>
            <div className="uc-form-field">
              <label>UPI ID</label>
              <input type="text" name="upiId" value={form.bankDetails.upiId || ''} onChange={handleBankChange} placeholder="UPI ID" />
            </div>
          </div>

          <div className="uc-form-section">
            <div className="uc-form-section-head">
              <h3>Change Password</h3>
              <button type="button" className="uc-btn uc-btn-outline" onClick={() => setShowPasswordFields(!showPasswordFields)}>
                {showPasswordFields ? 'Cancel' : 'Change Password'}
              </button>
            </div>
            {showPasswordFields && (
              <div className="uc-password-panel">
                <div className="uc-form-grid-2">
                  <div className="uc-form-field" style={{ marginBottom: 0 }}>
                    <label>New Password</label>
                    <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="New Password" />
                  </div>
                  <div className="uc-form-field" style={{ marginBottom: 0 }}>
                    <label>Confirm Password</label>
                    <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Confirm Password" />
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                  <button type="button" className="uc-btn uc-btn-success" onClick={handlePasswordUpdate}>
                    Update Password
                  </button>
                  <span className="uc-form-hint" style={{ margin: 0 }}>Password must be at least 6 characters</span>
                </div>
              </div>
            )}
          </div>

          <div className="uc-form-actions">
            {!isPage && (
              <button type="button" className="uc-btn uc-btn-outline" onClick={onClose}>
                Cancel
              </button>
            )}
            {isPage && (
              <button type="button" className="uc-btn uc-btn-outline" onClick={() => navigate(-1)}>
                Cancel
              </button>
            )}
            <button type="submit" className="uc-btn uc-btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUser;
