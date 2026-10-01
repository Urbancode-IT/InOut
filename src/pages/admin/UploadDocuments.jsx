import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiUpload, FiDownload, FiFile } from 'react-icons/fi';
import { API_ENDPOINTS } from '../../utils/api';
import '../../components/admin-dashboard/allusers/edit-form.css';

const UploadDocuments = () => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selected, setSelected] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const token = localStorage.getItem('token');

  const fetchUsers = async () => {
    try {
      const res = await axios.get(API_ENDPOINTS.getUsers, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((res.data || []).filter((u) => u.role === 'employee'));
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedUser = users.find((u) => u._id === selected);
  const documents = (selectedUser?.letterCopies || []).slice().reverse();

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selected) {
      toast.warning('Select an employee first');
      return;
    }
    if (!file) {
      toast.warning('Choose a file to upload');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('letter', file);
      fd.append('candidateId', selected);
      await axios.post(API_ENDPOINTS.uploadLetter, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      await fetchUsers();
      setFile(null);
      e.target.reset();
      toast.success('Document uploaded');
    } catch (err) {
      console.error('Upload failed', err);
      toast.error(err.response?.data?.message || 'Upload failed. Please try again');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (doc) => {
    const a = document.createElement('a');
    a.href = doc.url;
    a.download = doc.filename || '';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  return (
    <div className="uc-page">
      <div className="uc-flex-between">
        <h1 className="uc-page-title">Upload Documents</h1>
      </div>

      <div className="uc-edit-card" style={{ maxWidth: 640 }}>
        <div className="uc-edit-header">
          <div className="uc-edit-header-left">
            <div className="uc-edit-avatar">
              <FiUpload />
            </div>
            <div>
              <h2 className="uc-edit-title">Attach a document</h2>
              <p className="uc-edit-subtitle">Upload ID proofs, certificates or other files to an employee's profile</p>
            </div>
          </div>
        </div>

        <form className="uc-edit-form" onSubmit={handleUpload}>
          <div className="uc-form-field">
            <label htmlFor="doc-employee">Employee *</label>
            <select
              id="doc-employee"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={loadingUsers}
              required
            >
              <option value="">{loadingUsers ? 'Loading...' : 'Select employee'}</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                  {u.employeeId ? ` (${u.employeeId})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="uc-form-field">
            <label htmlFor="doc-file">File *</label>
            <input
              id="doc-file"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
            <p className="uc-form-hint">PDF, Word or image files</p>
          </div>

          <button type="submit" className="uc-btn uc-btn-primary" disabled={uploading}>
            <FiUpload />
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </form>
      </div>

      {selected && (
        <div className="uc-list-panel">
          <div className="uc-list-header">
            <h2>Documents for {selectedUser?.name}</h2>
            <p>{documents.length + (selectedUser?.aadharCard?.url ? 1 : 0)} file{(documents.length + (selectedUser?.aadharCard?.url ? 1 : 0)) === 1 ? '' : 's'} uploaded</p>
          </div>

          {selectedUser?.aadharCard?.url && (
            <div
              className="uc-list-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                marginBottom: '0.75rem',
                borderRadius: '8px',
                padding: '0.75rem 1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <FiFile style={{ color: '#166534', flexShrink: 0, fontSize: '1.25rem' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534' }}>
                    Aadhaar Card Document {selectedUser.aadharNumber ? `(${selectedUser.aadharNumber})` : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                    Uploaded: {selectedUser.aadharCard.uploadedAt ? new Date(selectedUser.aadharCard.uploadedAt).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
              <a
                href={selectedUser.aadharCard.url}
                target="_blank"
                rel="noopener noreferrer"
                className="uc-btn uc-btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <FiDownload />
                View / Download Aadhaar
              </a>
            </div>
          )}

          {documents.length === 0 && !selectedUser?.aadharCard?.url ? (
            <div className="uc-empty-msg">No documents uploaded yet.</div>
          ) : (
            documents.map((doc, idx) => (
              <div
                key={idx}
                className="uc-list-item"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <FiFile style={{ color: '#159C8E', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.filename}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
                <button type="button" className="uc-btn uc-btn-outline" onClick={() => handleDownload(doc)}>
                  <FiDownload />
                  Download
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UploadDocuments;
