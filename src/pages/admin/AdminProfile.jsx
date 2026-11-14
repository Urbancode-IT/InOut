import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiCamera, FiSave, FiArrowLeft, FiTrash2, FiEye, FiEyeOff } from 'react-icons/fi';
import { API_ENDPOINTS } from '../../utils/api';
import '../../styles/admin-ui.css';
import '../../components/admin-dashboard/allusers/user-profile.css';
import './AdminProfile.css';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  profilePic: '',
};

const notifyNavbar = (payload) => {
  try {
    window.dispatchEvent(new CustomEvent('admin-profile-updated', { detail: payload }));
  } catch {
    /* ignore */
  }
};

const AdminProfile = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [original, setOriginal] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get(API_ENDPOINTS.getProfile, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const data = res.data || {};
        const next = {
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          password: '',
          confirmPassword: '',
          profilePic: data.profilePic || '',
        };
        setForm(next);
        setOriginal(next);
      } catch (err) {
        console.error('Failed to load admin profile', err);
        toast.error('Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewSrc) URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setForm({ ...original, password: '', confirmPassword: '' });
    if (previewSrc) {
      URL.revokeObjectURL(previewSrc);
      setPreviewSrc(null);
    }
    navigate(-1);
  };

  const saveChanges = async () => {
    if (!form.name.trim()) {
      toast.warning('Name is required');
      return;
    }
    if (!form.email.trim()) {
      toast.warning('Email is required');
      return;
    }
    if (form.password) {
      if (form.password.length < 6) {
        toast.warning('Password must be at least 6 characters');
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.warning('Passwords do not match');
        return;
      }
    }

    const token = localStorage.getItem('token');
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };
    if (form.password) payload.password = form.password;

    setSaving(true);
    try {
      const res = await axios.put(API_ENDPOINTS.updateProfile, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data || {};
      const next = {
        name: data.name || payload.name,
        email: data.email || payload.email,
        phone: data.phone || payload.phone,
        password: '',
        confirmPassword: '',
        profilePic: data.profilePic !== undefined ? data.profilePic : form.profilePic,
      };
      setForm(next);
      setOriginal(next);
      notifyNavbar({ name: next.name, profilePic: next.profilePic });
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Failed to update admin profile', err);
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePicUpload = async (e) => {
    if (uploading) return;
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    let localUrl = null;
    try {
      localUrl = URL.createObjectURL(file);
      setPreviewSrc(localUrl);
    } catch {
      /* ignore */
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.warning('Only JPG and PNG images are allowed');
      if (localUrl) URL.revokeObjectURL(localUrl);
      setPreviewSrc(null);
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.warning('Maximum allowed size is 2 MB');
      if (localUrl) URL.revokeObjectURL(localUrl);
      setPreviewSrc(null);
      e.target.value = '';
      return;
    }

    const token = localStorage.getItem('token');
    const body = new FormData();
    body.append('profilePic', file);
    setUploading(true);
    try {
      const res = await axios.post(API_ENDPOINTS.uploadProfile, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pic = res.data?.profilePic || '';
      setForm((prev) => ({ ...prev, profilePic: pic }));
      setOriginal((prev) => ({ ...prev, profilePic: pic }));
      if (localUrl) URL.revokeObjectURL(localUrl);
      setPreviewSrc(null);
      notifyNavbar({ name: form.name, profilePic: pic });
      toast.success('Profile picture updated');
    } catch (err) {
      console.error('Upload failed', err);
      toast.error(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeProfilePic = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        API_ENDPOINTS.updateProfile,
        { profilePic: '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setForm((prev) => ({ ...prev, profilePic: '' }));
      setOriginal((prev) => ({ ...prev, profilePic: '' }));
      if (previewSrc) {
        URL.revokeObjectURL(previewSrc);
        setPreviewSrc(null);
      }
      notifyNavbar({ name: form.name, profilePic: '' });
      toast.success('Profile picture removed');
    } catch (err) {
      console.error('Failed to remove profile pic', err);
      toast.error('Could not remove profile picture');
    }
  };

  const avatarSrc = previewSrc || form.profilePic;
  const initial = (form.name || 'A').charAt(0).toUpperCase();

  return (
    <div className="uc-profile-page">
      <div className="uc-profile-shell admin-profile-page-shell">
        <button type="button" className="uc-profile-back" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>

        <div className="uc-profile-card admin-profile-page-card">
          <div className="admin-profile-page-header">
            <div>
              <h1 className="admin-profile-page-title">Edit Profile</h1>
              <p className="admin-profile-page-subtitle">Administrator account details</p>
            </div>
          </div>

          {loading ? (
            <p className="admin-profile-muted">Loading profile...</p>
          ) : (
            <>
              <div className="admin-profile-avatar-block">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="admin-profile-avatar-img" />
                ) : (
                  <div className="admin-profile-avatar-fallback" aria-hidden>
                    {initial}
                  </div>
                )}
                <div className="admin-profile-pic-actions">
                  <label className="uc-btn uc-btn-slate admin-profile-upload-btn">
                    <FiCamera />
                    {uploading ? 'Uploading...' : 'Change Photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      disabled={uploading}
                      onChange={handlePicUpload}
                      hidden
                    />
                  </label>
                  {(form.profilePic || previewSrc) && (
                    <button
                      type="button"
                      className="uc-btn uc-btn-outline"
                      onClick={removeProfilePic}
                      disabled={uploading}
                    >
                      <FiTrash2 /> Remove
                    </button>
                  )}
                  <span className="admin-profile-hint">JPG or PNG, max 2 MB</span>
                </div>
              </div>

              <div className="admin-profile-fields">
                <div className="admin-profile-field">
                  <label htmlFor="admin-profile-name">Name</label>
                  <input
                    id="admin-profile-name"
                    className="uc-input"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    autoComplete="name"
                  />
                </div>

                <div className="admin-profile-field">
                  <label htmlFor="admin-profile-email">Email</label>
                  <input
                    id="admin-profile-email"
                    className="uc-input"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>

                <div className="admin-profile-field">
                  <label htmlFor="admin-profile-phone">Phone</label>
                  <input
                    id="admin-profile-phone"
                    className="uc-input"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                  />
                </div>

                <div className="admin-profile-field">
                  <label>Role</label>
                  <p className="admin-profile-role-badge">Administrator</p>
                </div>

                <div className="admin-profile-field admin-profile-field-span">
                  <label htmlFor="admin-profile-password">New Password</label>
                  <div className="admin-profile-password-wrap">
                    <input
                      id="admin-profile-password"
                      className="uc-input"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Leave blank to keep current"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="admin-profile-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="admin-profile-field admin-profile-field-span">
                  <label htmlFor="admin-profile-confirm-password">Confirm Password</label>
                  <div className="admin-profile-password-wrap">
                    <input
                      id="admin-profile-confirm-password"
                      className="uc-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="admin-profile-password-toggle"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="admin-profile-page-actions">
                <button
                  type="button"
                  className="uc-btn uc-btn-primary"
                  onClick={saveChanges}
                  disabled={saving || loading}
                >
                  <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="uc-btn uc-btn-outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
