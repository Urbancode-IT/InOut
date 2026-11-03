import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { FiUserPlus, FiArrowLeft } from 'react-icons/fi';
import { API_ENDPOINTS } from '../../utils/api';
import { BRANCH_OPTIONS } from '../../utils/branches';
import '../../components/admin-dashboard/allusers/edit-form.css';

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  position: '',
  company: '',
  branch: '',
  department: '',
  salary: '',
  qualification: '',
  dateOfJoining: '',
  dateOfBirth: '',
  bloodGroup: '',
  address: '',
  bankingName: '',
  bankAccountNumber: '',
  ifscCode: '',
  upiId: '',
};

const AddUser = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const { name, email, password, confirmPassword, phone, position, company } = form;
    if (!name || !email || !password || !phone || !position || !company) {
      return 'Please fill all required fields (*)';
    }
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.warning(`Validation: ${err}`);
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim(),
      position: form.position.trim(),
      company: form.company,
      branch: form.branch,
      address: form.branch || form.address || undefined,
      department: form.department || form.branch || '',
      salary: form.salary ? Number(form.salary) : 0,
      qualification: form.qualification,
      dateOfJoining: form.dateOfJoining || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      bloodGroup: form.bloodGroup,
      address: form.address,
      bankDetails: {
        bankingName: form.bankingName,
        bankAccountNumber: form.bankAccountNumber,
        ifscCode: form.ifscCode,
        upiId: form.upiId,
        officeBranch: form.branch,
      },
    };

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.post(API_ENDPOINTS.createUser, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(
        data?.user?.employeeId
          ? `User Created: ${form.name} added as ${data.user.employeeId}`
          : `User Created: ${form.name} added successfully`
      );
      navigate('/all-users');
    } catch (error) {
      toast.error(`Failed: ${error.response?.data?.error || 'Could not create user'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="uc-edit-page">
      <div className="uc-edit-card">
        <div className="uc-edit-header">
          <div className="uc-edit-header-left">
            <button type="button" className="uc-edit-back-btn" onClick={() => navigate('/all-users')}>
              <FiArrowLeft />
            </button>
            <div>
              <h1 className="uc-edit-title">Add New User</h1>
              <p className="uc-edit-subtitle">Create employee directly — no pending approval</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="uc-edit-form">
          <div className="uc-form-grid-2">
            <Field label="Full Name *" name="name" value={form.name} onChange={handleChange} required />
            <Field label="Email *" name="email" type="email" value={form.email} onChange={handleChange} required />
            <Field label="Phone *" name="phone" value={form.phone} onChange={handleChange} required />
            <Field label="Password *" name="password" type="password" value={form.password} onChange={handleChange} required />
            <Field label="Confirm Password *" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required />
            <Field label="Position *" name="position" value={form.position} onChange={handleChange} required />
            <SelectField label="Company *" name="company" value={form.company} onChange={handleChange} required>
              <option value="">Select company</option>
              <option value="Urbancode">Urbancode</option>
              <option value="Jobzenter">Jobzenter</option>
              <option value="Other">Other</option>
            </SelectField>
            <SelectField label="Branch" name="branch" value={form.branch} onChange={handleChange}>
              <option value="">Select branch</option>
              {BRANCH_OPTIONS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </SelectField>
            <div className="uc-form-field">
              <label htmlFor="department">Department</label>
              <input
                id="department"
                type="text"
                name="department"
                list="department-options"
                value={form.department}
                onChange={handleChange}
                placeholder="e.g. Management, Freelancer"
              />
              <datalist id="department-options">
                <option value="Management" />
                <option value="Freelancer" />
              </datalist>
              <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.75 }}>
                Freelancer / Director-Founder / Management = no check-in (Placement Lead still required)
              </p>
            </div>
            <Field label="Salary" name="salary" type="number" value={form.salary} onChange={handleChange} />
            <Field label="Qualification" name="qualification" value={form.qualification} onChange={handleChange} />
            <Field label="Date of Joining" name="dateOfJoining" type="date" value={form.dateOfJoining} onChange={handleChange} />
            <Field label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} />
            <Field label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={handleChange} />
            <Field label="Address" name="address" value={form.address} onChange={handleChange} />
            <Field label="Bank Name" name="bankingName" value={form.bankingName} onChange={handleChange} />
            <Field label="Account Number" name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} />
            <Field label="IFSC" name="ifscCode" value={form.ifscCode} onChange={handleChange} />
            <Field label="UPI ID" name="upiId" value={form.upiId} onChange={handleChange} />
          </div>

          <div className="uc-form-actions">
            <button type="submit" className="uc-btn uc-btn-primary" disabled={submitting}>
              <FiUserPlus />
              {submitting ? 'Creating...' : 'Create User'}
            </button>
            <button type="button" className="uc-btn uc-btn-outline" onClick={() => navigate('/all-users')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function Field({ label, name, value, onChange, type = 'text', required = false }) {
  return (
    <div className="uc-form-field">
      <label htmlFor={name}>{label}</label>
      <input id={name} type={type} name={name} value={value} onChange={onChange} required={required} />
    </div>
  );
}

function SelectField({ label, name, value, onChange, required = false, children }) {
  return (
    <div className="uc-form-field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} value={value} onChange={onChange} required={required}>
        {children}
      </select>
    </div>
  );
}

export default AddUser;
