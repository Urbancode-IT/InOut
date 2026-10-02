import './ProfileCard.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../utils/api';
import {
  formatMissingProfileFields,
  inferMissingProfileFields,
} from '../../utils/attendanceLock';
import { buildPayslipViewModel } from '../../utils/payslipViewModel';
import { downloadPayslipPdf } from '../../utils/payslipPdf';

export default function ProfileCard() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    bloodGroup: "",
    address: "",
    position: "",
    company: "",
    salary: 0,
    role: "employee",
    profilePic: "",
    department: "",
    qualification: "",
  dateOfJoining: "",
  dateOfBirth: "",
    linkedin: "",
    github: "",
    empGrade: "",
    pan: "",
    uan: "",
    esiNumber: "",
    aadharNumber: "",
    aadharCard: null,
    rolesAndResponsibility: [],
    skills: [],
    bankDetails: {
      bankingName: "",
      bankAccountNumber: "",
      ifscCode: "",
      upiId: ""
    }
  });

  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingAadhar, setUploadingAadhar] = useState(false);
  const [viewAadharModal, setViewAadharModal] = useState(false);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [originalProfile, setOriginalProfile] = useState(null);
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
  const [previewSrc, setPreviewSrc] = useState(null);
  const [payslips, setPayslips] = useState([]);

  // Fetch user profile data from backend
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get(API_ENDPOINTS.getProfile, {
          headers: { Authorization: `Bearer ${token}` }
        }); // Adjust endpoint as needed

        // Normalize response and merge with defaults to avoid undefined nested fields
        const data = response.data || {};
        const normalized = {
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          bloodGroup: data.bloodGroup || "",
          address: data.address || "",
          position: data.position || "",
          company: data.company || "",
          salary: data.salary ?? 0,
          role: data.role || "employee",
          profilePic: data.profilePic || "",
          department: data.department || "",
          qualification: data.qualification || "",
          dateOfJoining: data.dateOfJoining || "",
          dateOfBirth: data.dateOfBirth || "",
          linkedin: data.linkedin || "",
          github: data.github || "",
          empGrade: data.empGrade || "",
          pan: data.pan || "",
          uan: data.uan || "",
          esiNumber: data.esiNumber || "",
          aadharNumber: data.aadharNumber || "",
          aadharCard: data.aadharCard || null,
          rolesAndResponsibility: Array.isArray(data.rolesAndResponsibility) ? data.rolesAndResponsibility : [],
          skills: Array.isArray(data.skills) ? data.skills : [],
          bankDetails: {
            bankingName: (data.bankDetails && data.bankDetails.bankingName) || "",
            bankAccountNumber: (data.bankDetails && data.bankDetails.bankAccountNumber) || "",
            ifscCode: (data.bankDetails && data.bankDetails.ifscCode) || "",
            upiId: (data.bankDetails && data.bankDetails.upiId) || ""
          }
        };

  setProfile(normalized);
  setOriginalProfile(normalized);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Cleanup preview object URL on unmount
  useEffect(() => {
    return () => {
      if (previewSrc) {
        try { URL.revokeObjectURL(previewSrc); } catch (e) { /* ignore */ }
      }
    };
  }, [previewSrc]);

  useEffect(() => {
    const fetchPayslips = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get(API_ENDPOINTS.getPayslips, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPayslips(response.data || []);
      } catch (error) {
        console.error('Error fetching payslips:', error);
      }
    };
    fetchPayslips();
  }, []);

  const generatePDF = async (payslip) => {
    const {
      employeeDetails,
      incomes,
      deductions,
      totalIncome,
      totalDeductions,
      netPay,
      month,
    } = payslip;

    const viewModel = buildPayslipViewModel(
      { ...employeeDetails, employeeId: payslip.employeeId, month },
      incomes,
      deductions,
      totalIncome,
      totalDeductions,
      netPay
    );

    const fileName = `Payslip_${(employeeDetails?.name || "Employee").replace(/\s+/g, "_")}_${(month || "").replace(/\s+/g, "_")}.pdf`;
    await downloadPayslipPdf(viewModel, fileName);
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parentField, field, value) => {
    setProfile(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [field]: value
      }
    }));
  };

  const handleArrayChange = (field, index, value) => {
    const newArray = [...profile[field]];
    newArray[index] = value;
    setProfile(prev => ({
      ...prev,
      [field]: newArray
    }));
  };

  const addArrayItem = (field) => {
    setProfile(prev => ({
      ...prev,
      [field]: [...prev[field], "New Item"]
    }));
  };

  const removeArrayItem = (field, index) => {
    setProfile(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const toggleEdit = (section) => {
    setEditing(editing === section ? null : section);
  };

  const saveChanges = async () => {
    const token = localStorage.getItem('token');
    try {
      // Ensure salary is sent as a number
      const payload = { ...profile };
      delete payload.salary;
      delete payload.isActive;
      delete payload.empGrade;
      console.log('Saving profile with payload:', payload);
      await axios.put(API_ENDPOINTS.updateProfile, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(payload);
      setOriginalProfile(payload);
      setIsEditingAll(false);
      // Small success feedback
      try {
        toast.success('Profile updated: Your profile was updated successfully');
      } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Error updating profile:', error);
  try { toast.error('Update failed: Failed to update profile. See console for details.'); } catch (e) { /* ignore */ }
    }
  };

  const cancelAllEdits = () => {
    if (originalProfile) setProfile(originalProfile);
    setPreviewSrc(null);
    setIsEditingAll(false);
  };

  const removeProfilePic = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(API_ENDPOINTS.updateProfile, { profilePic: '' }, { headers: { Authorization: `Bearer ${token}` } });
      setProfile(prev => ({ ...prev, profilePic: '' }));
      setPreviewSrc(null);
      try { toast.success('Removed: Profile picture removed'); } catch (e) {}
    } catch (err) {
      console.error('Failed to remove profile pic', err);
      try { toast.error('Remove failed: Could not remove profile picture'); } catch (e) {}
    }
  };

  const handleAadharUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedMimes.includes(file.type)) {
      toast.warning('Invalid file type: Only JPG/PNG images and PDF documents are allowed.');
      return;
    }
    const maxAadharSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxAadharSize) {
      toast.warning('File too large: Maximum allowed size for Aadhaar Card is 5 MB.');
      return;
    }

    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('aadharCard', file);
    setUploadingAadhar(true);
    try {
      const res = await axios.post(API_ENDPOINTS.uploadAadhar, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      const updatedCard = res.data?.aadharCard;
      setProfile((prev) => ({ ...prev, aadharCard: updatedCard }));
      setOriginalProfile((prev) => (prev ? { ...prev, aadharCard: updatedCard } : prev));
      toast.success('Aadhaar Card uploaded successfully');
    } catch (err) {
      console.error('Aadhaar upload failed', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.msg ||
        err.response?.data?.error ||
        'Failed to upload Aadhaar Card';
      toast.error(errMsg);
    } finally {
      setUploadingAadhar(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  const missingLabels = formatMissingProfileFields(inferMissingProfileFields(profile));

  return (
    <div className="profile-container">
      <div className="profile-toolbar">
        {!isEditingAll ? (
          <button className="edit-btn main-edit" onClick={() => setIsEditingAll(true)}>Edit Profile</button>
        ) : (
          <div className="toolbar-actions">
            <button className="save-btn main-save" onClick={saveChanges}>Save All Changes</button>
            <button className="edit-btn main-cancel" onClick={cancelAllEdits}>Cancel</button>
          </div>
        )}
      </div>
      {missingLabels.length > 0 && (
        <div
          className="profile-incomplete-banner"
          style={{
            margin: '0 0 1rem',
            padding: '0.85rem 1rem',
            borderRadius: 8,
            background: '#fef3c7',
            color: '#92400e',
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          Profile incomplete — fill these to avoid attendance lock:{' '}
          <strong>{missingLabels.join(', ')}</strong>
        </div>
      )}
      <div className="profile-content">
        {/* Left Column */}
        <div className="column">
          {/* Basic Information Card */}
          <div className="card">
            <div className="card-header">
              <h3>Basic Information</h3>
            </div>
            <div className="basic-info">
              <div className="left">
                <img
                  src={previewSrc || profile.profilePic || "/default-avatar.png"}
                  alt="Profile"
                  className="avatar"
                />
                {(editing === 'basicInfo' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <h2>{profile.name}</h2>
                )}
                {(editing === 'basicInfo' || isEditingAll) && (
                  <div className="info-item upload-block">
                    <label className="upload-label">Change Profile Picture</label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={async (e) => {
                        if (uploading) return;
                        const file = e.target.files && e.target.files[0];
                        if (!file) return;

                        // create local preview
                        let localUrl = null;
                        try {
                          localUrl = URL.createObjectURL(file);
                          setPreviewSrc(localUrl);
                        } catch (err) {
                          console.error('Could not create preview', err);
                        }

                        // Client-side guards
                        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                          try { toast.warning('Invalid file type: Only JPG and PNG are allowed.'); } catch (e) {}
                          if (localUrl) URL.revokeObjectURL(localUrl);
                          setPreviewSrc(null);
                          return;
                        }
                        if (file.size > MAX_FILE_SIZE) {
                          try { toast.warning('File too large: Maximum allowed size is 2 MB.'); } catch (e) {}
                          if (localUrl) URL.revokeObjectURL(localUrl);
                          setPreviewSrc(null);
                          return;
                        }

                        const token = localStorage.getItem('token');
                        const form = new FormData();
                        form.append('profilePic', file);
                        setUploading(true);
                        try {
                          const res = await axios.post(API_ENDPOINTS.uploadProfile, form, {
                            headers: {
                              Authorization: `Bearer ${token}`,
                              'Content-Type': 'multipart/form-data'
                            }
                          });
                          // backend returns updated user
                          const updated = res.data;
                          setProfile(prev => ({ ...prev, profilePic: updated.profilePic || '' }));
                          // clear preview
                          if (localUrl) URL.revokeObjectURL(localUrl);
                          setPreviewSrc(null);
                        } catch (err) {
                          console.error('Upload failed', err);
                          try { toast.error('Upload failed: Image upload failed'); } catch (e) {}
                          // keep preview so user can retry or choose another
                        } finally {
                          setUploading(false);
                        }
                      }}
                    />
                    {uploading && <div className="small">Uploading...</div>}
                    {isEditingAll && profile.profilePic && (
                      <button className="remove-pic-btn" onClick={removeProfilePic} type="button">Remove</button>
                    )}
                  </div>
                )}
                
                <div className="info-item">
                   Email: 
                  {(editing === 'basicInfo' || isEditingAll) ? (
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{profile.email}</span>
                  )}
                </div>
                 <div className="info-item">
                 Date of Birth *: 
                {(editing === 'company' || isEditingAll) ? (
                  <input
                    type="date"
                    value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'Not set'}</span>
                )}
              </div>
                <div className="info-item">
                   Phone: 
                  {(editing === 'basicInfo' || isEditingAll) ? (
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{profile.phone}</span>
                  )}
                </div>
                <div className="info-item">
                   Address *: 
                  {(editing === 'basicInfo' || isEditingAll) ? (
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{profile.address}</span>
                  )}
                </div>
                
                <div className="info-item">
                   Blood Group *: 
                  {(editing === 'basicInfo' || isEditingAll) ? (
                    <input
                      type="text"
                      value={profile.bloodGroup}
                      onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                      className="edit-input"
                    />
                  ) : (
                    <span>{profile.bloodGroup}</span>
                  )}
                </div>
              </div>
            </div>
            {/* global save used instead of per-card save */}
          </div>

          {/* Social Links Card */}
          <div className="card">
            <div className="card-header">
              <h3>Social Links</h3>
            </div>
            <div className="education-info">
              <div className="info-row">
                 LinkedIn:
                {(editing === 'social' || isEditingAll) ? (
                  <input
                    type="url"
                    value={profile.linkedin}
                    onChange={(e) => handleInputChange('linkedin', e.target.value)}
                    className="edit-input"
                    placeholder="https://linkedin.com/in/username"
                  />
                ) : profile.linkedin ? (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">{profile.linkedin}</a>
                ) : (
                  <span>Not set</span>
                )}
              </div>
              <div className="info-row">
                 GitHub:
                {(editing === 'social' || isEditingAll) ? (
                  <input
                    type="url"
                    value={profile.github}
                    onChange={(e) => handleInputChange('github', e.target.value)}
                    className="edit-input"
                    placeholder="https://github.com/username"
                  />
                ) : profile.github ? (
                  <a href={profile.github} target="_blank" rel="noopener noreferrer">{profile.github}</a>
                ) : (
                  <span>Not set</span>
                )}
              </div>
            </div>
          </div>

          {/* Education Card */}
          <div className="card">
            <div className="card-header">
              <h3>Education & Qualification</h3>
            </div>
            <div className="education-info">
              <div className="info-row">
                 Qualification: 
                {(editing === 'education' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.qualification}
                    onChange={(e) => handleInputChange('qualification', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.qualification}</span>
                )}
              </div>
             
            </div>
          </div>

          {/* Skills Card */}
          <div className="card">
            <div className="card-header">
              <h3>Skills</h3>
            </div>
            <div className="skills-info">
              {profile.skills.map((skill, index) => (
                <div key={index} className="skill-item-container">
                  {(editing === 'skills' || isEditingAll) ? (
                    <>
                      <input
                        type="text"
                        value={skill}
                        onChange={(e) => handleArrayChange('skills', index, e.target.value)}
                        className="edit-input skill-input"
                      />
                      <button 
                        className="remove-skill-btn"
                        onClick={() => removeArrayItem('skills', index)}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div className="skill-item">{skill}</div>
                  )}
                </div>
              ))}
              {(editing === 'skills' || isEditingAll) && (
                <button className="add-skill-btn" onClick={() => addArrayItem('skills')}>
                  + Add Skill
                </button>
              )}
            </div>
          </div>

          {/* Roles & Responsibilities Card */}
          <div className="card">
            <div className="card-header">
              <h3>Roles & Responsibilities</h3>
            </div>
            <div className="roles-info">
              {profile.rolesAndResponsibility.map((role, index) => (
                <div key={index} className="role-item-container">
                  {(editing === 'rolesAndResponsibility' || isEditingAll) ? (
                    <>
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => handleArrayChange('rolesAndResponsibility', index, e.target.value)}
                        className="edit-input role-input"
                      />
                      <button 
                        className="remove-role-btn"
                        onClick={() => removeArrayItem('rolesAndResponsibility', index)}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div className="role-item">• {role}</div>
                  )}
                </div>
              ))}
              {(editing === 'rolesAndResponsibility' || isEditingAll) && (
                <button className="add-role-btn" onClick={() => addArrayItem('rolesAndResponsibility')}>
                  + Add Responsibility
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="column">
          {/* Personal Details Card */}
          {/* <div className="card">
            <div className="card-header">
              <h3>Personal Details</h3>
              <button 
                className="edit-btn" 
                onClick={() => toggleEdit('personalDetails')}
              >
                {editing === 'personalDetails' ? 'Cancel' : 'Edit'}
              </button>
            </div>
            <div className="personal-details">
              <div className="info-row">
                 Blood Group: 
                {editing === 'personalDetails' ? (
                  <select
                    value={profile.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                    className="edit-select"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                ) : (
                  <span>{profile.bloodGroup}</span>
                )}
              </div>
              <div className="info-row">
                 Role: 
                {editing === 'personalDetails' ? (
                  <select
                    value={profile.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="edit-select"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <span>{profile.role}</span>
                )}
              </div>
            </div>
            {editing === 'personalDetails' && (
              <button className="save-btn" onClick={saveChanges}>
                Save Changes
              </button>
            )}
          </div> */}

          {/* Banking Details Card */}
          <div className="card">
            <div className="card-header">
              <h3>Banking Details</h3>
            </div>
            <div className="banking-info">
              <div className="info-row">
                 Bank Name *: 
                {(editing === 'bankDetails' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.bankDetails.bankingName}
                    onChange={(e) => handleNestedInputChange('bankDetails', 'bankingName', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.bankDetails.bankingName}</span>
                )}
              </div>
              <div className="info-row">
                 Account Number *: 
                {(editing === 'bankDetails' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.bankDetails.bankAccountNumber}
                    onChange={(e) => handleNestedInputChange('bankDetails', 'bankAccountNumber', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.bankDetails.bankAccountNumber}</span>
                )}
              </div>
              <div className="info-row">
                 IFSC Code *: 
                {(editing === 'bankDetails' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.bankDetails.ifscCode}
                    onChange={(e) => handleNestedInputChange('bankDetails', 'ifscCode', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.bankDetails.ifscCode}</span>
                )}
              </div>
              <div className="info-row">
                 UPI ID: 
                {(editing === 'bankDetails' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.bankDetails.upiId}
                    onChange={(e) => handleNestedInputChange('bankDetails', 'upiId', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.bankDetails.upiId}</span>
                )}
              </div>
            </div>
          </div>

          {/* Statutory Details Card */}
          <div className="card">
            <div className="card-header">
              <h3>Statutory Details</h3>
            </div>
            <div className="banking-info">
              <div className="info-row">
                <strong>Emp Grade:</strong>
                {(editing === 'statutory' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.empGrade}
                    onChange={(e) => handleInputChange('empGrade', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.empGrade || 'Not set'}</span>
                )}
              </div>
              <div className="info-row">
                <strong>PAN:</strong>
                {(editing === 'statutory' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.pan}
                    onChange={(e) => handleInputChange('pan', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.pan || 'Not set'}</span>
                )}
              </div>
              <div className="info-row">
                <strong>PF-UAN:</strong>
                {(editing === 'statutory' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.uan}
                    onChange={(e) => handleInputChange('uan', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.uan || 'Not set'}</span>
                )}
              </div>
              <div className="info-row">
                <strong>ESI Number:</strong>
                {(editing === 'statutory' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.esiNumber}
                    onChange={(e) => handleInputChange('esiNumber', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.esiNumber || 'Not set'}</span>
                )}
              </div>
              <div className="info-row">
                <strong>Aadhaar Number:</strong>
                {(editing === 'statutory' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.aadharNumber || ''}
                    onChange={(e) => handleInputChange('aadharNumber', e.target.value)}
                    className="edit-input"
                    placeholder="12-digit Aadhaar number"
                  />
                ) : (
                  <span>{profile.aadharNumber || 'Not set'}</span>
                )}
              </div>
              <div className="info-row" style={{ minHeight: '52px' }}>
                <strong>Aadhaar Card:</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {profile.aadharCard?.url ? (
                    <>
                      <span style={{
                        flex: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '5px 14px',
                        borderRadius: '20px',
                        background: '#dcfce7',
                        color: '#15803d',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                        width: 'auto',
                        textAlign: 'center'
                      }}>
                        ✓ Uploaded
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewAadharModal(true)}
                        style={{
                          padding: '6px 16px',
                          background: '#159C8E',
                          color: 'white',
                          border: 'none',
                          borderRadius: '20px',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 6px rgba(21, 156, 142, 0.2)'
                        }}
                      >
                        View Card
                      </button>
                      <label style={{
                        padding: '6px 14px',
                        background: '#ffffff',
                        color: '#374151',
                        border: '1px solid #cbd5e1',
                        borderRadius: '20px',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}>
                        {uploadingAadhar ? 'Uploading...' : 'Change'}
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
                      <span style={{
                        flex: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '5px 14px',
                        borderRadius: '20px',
                        background: '#fef3c7',
                        color: '#b45309',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                        width: 'auto',
                        textAlign: 'center'
                      }}>
                        Not Uploaded
                      </span>
                      <label style={{
                        padding: '6px 18px',
                        background: '#159C8E',
                        color: 'white',
                        borderRadius: '20px',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 6px rgba(21, 156, 142, 0.2)'
                      }}>
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
          </div>

          {/* Company & Position Card */}
          <div className="card">
            <div className="card-header">
              <h3>Company & Position</h3>
            </div>
            <div className="company-info">
              <div className="info-row">
                 Position: 
                {(editing === 'company' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.position}</span>
                )}
              </div>
              <div className="info-row">
                 Company: 
                {(editing === 'company' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.company}</span>
                )}
              </div>
              <div className="info-row">
                 Department: 
                {(editing === 'company' || isEditingAll) ? (
                  <input
                    type="text"
                    value={profile.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.department}</span>
                )}
              </div>
              <div className="info-row">
                 Salary: 
                <span>₹{Number(profile.salary).toLocaleString()}/year</span>
              </div>
              <div className="info-row">
                 Date of Joining: 
                {(editing === 'company' || isEditingAll) ? (
                  <input
                    type="date"
                    value={profile.dateOfJoining ? new Date(profile.dateOfJoining).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleInputChange('dateOfJoining', e.target.value)}
                    className="edit-input"
                  />
                ) : (
                  <span>{profile.dateOfJoining ? new Date(profile.dateOfJoining).toLocaleDateString() : 'Not set'}</span>
                )}
              </div>
            </div>
          </div>

          {/* My Payslips Card */}
          <div className="card">
            <div className="card-header">
              <h3>My Payslips</h3>
            </div>
            <div className="payslips-info" style={{ padding: '1rem' }}>
              {payslips.length === 0 ? (
                <div style={{ color: '#666', fontStyle: 'italic' }}>No payslips found</div>
              ) : (
                payslips.map((payslip) => (
                  <div key={payslip._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{payslip.month}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Net Pay: ₹{payslip.netPay?.toFixed(2)}</div>
                    </div>
                    <button 
                      className="save-btn main-save" 
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                      onClick={() => generatePDF(payslip)}
                    >
                      Download
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Aadhaar Card Modal Preview */}
      {viewAadharModal && profile.aadharCard?.url && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setViewAadharModal(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
              }}
            >
              <h3 style={{ margin: 0, color: '#0f172a' }}>Aadhaar Card Preview</h3>
              <button
                type="button"
                onClick={() => setViewAadharModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', textAlign: 'center', flex: 1 }}>
              {profile.aadharCard.url.endsWith('.pdf') || profile.aadharCard.filename?.endsWith('.pdf') ? (
                <iframe
                  src={profile.aadharCard.url}
                  title="Aadhaar Card Document"
                  style={{ width: '100%', height: '500px', border: 'none' }}
                />
              ) : (
                <img
                  src={profile.aadharCard.url}
                  alt="Aadhaar Card"
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px' }}
                />
              )}
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <label className="edit-btn" style={{ padding: '6px 16px', fontSize: '0.9rem', cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center' }}>
                {uploadingAadhar ? 'Uploading...' : 'Change / Re-upload File'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  disabled={uploadingAadhar}
                  onChange={(e) => {
                    handleAadharUpload(e);
                    setViewAadharModal(false);
                  }}
                  style={{ display: 'none' }}
                />
              </label>
              <a
                href={profile.aadharCard.url}
                target="_blank"
                rel="noopener noreferrer"
                className="main-edit"
                style={{ textDecoration: 'none', padding: '6px 16px', fontSize: '0.9rem' }}
              >
                Open Original
              </a>
              <button
                type="button"
                className="main-cancel"
                style={{ padding: '6px 16px', fontSize: '0.9rem' }}
                onClick={() => setViewAadharModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}