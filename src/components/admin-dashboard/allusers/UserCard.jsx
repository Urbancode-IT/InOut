import React, { useState } from 'react';
import {
  FiMapPin,
  FiCalendar as CalendarIcon,
  FiHome,
  FiEye,
  FiEyeOff,
  FiEdit3,
  FiMail,
  FiPhone,
  FiAward,
  FiCreditCard,
  FiUser,
  FiChevronDown,
  FiX,
  FiDroplet,
  FiFileText,
} from 'react-icons/fi';
import urbancodeLogoSrc from '../../../assets/uclogo.png';
import jobzenterLogoSrc from '../../../assets/jzlogo.png';
import { getUserWorks, normalizeStringList } from '../../../utils/userWorks';
import { getUserBranch, branchBadgeClass } from '../../../utils/branches';
import './user-profile.css';

const UserCard = ({ user, className = '', onEdit, forceExpanded = false, onClose, showCloseButton = true }) => {
  const [showBankingDetails, setShowBankingDetails] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!!forceExpanded);

  const formatBankingDetails = (details) => {
    if (!details) return null;

    return {
      accountNumber: showBankingDetails ? details.bankAccountNumber : `****${details.bankAccountNumber?.slice(-4) || ''}`,
      ifscCode: showBankingDetails ? details.ifscCode : `****${details.ifscCode?.slice(-4) || ''}`,
      bankName: details.bankingName,
      upiId: details.upiId ? (showBankingDetails ? details.upiId : `****${details.upiId.split('@')[0].slice(-2)}@${details.upiId.split('@')[1]}`) : null
    };
  };

  const getCompanyLogo = (company) => {
    return company.toLowerCase() === 'jobzenter' ?jobzenterLogoSrc: urbancodeLogoSrc ;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formattedBankingDetails = formatBankingDetails(user.bankDetails);
  const works = getUserWorks(user);
  const skills = normalizeStringList(user.skills);
  const roles = normalizeStringList(user.rolesAndResponsibility);

  if (!isExpanded) {
    return (
      <div 
        className={`relative w-full hover:bg-blue-50 hover:border-blue-200 rounded-xl border bg-white p-3 shadow-sm transition-all duration-300 cursor-pointer ${className}`}
        onClick={() => setIsExpanded(true)}
      >
        <div className={`absolute top-3 right-3 w-5 h-3 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'} shadow-sm`} ></div>


        <div className="flex items-center gap-4">
          <div className="relative">
            {user.profilePic ? (
              <img
                src={user.profilePic}
                alt={`${user.name}'s avatar`}
                className={`w-16 h-16 rounded-full object-cover ring-2 ring-gray-200 p-1 `}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className={`w-16 h-16 text-3xl font-semibold rounded-full flex justify-center items-center ring-2 ring-gray-200 p-1 `}>{(user.name || 'U').charAt(0)}</div>
            )}
            <img
              src={getCompanyLogo(user.company)}
              alt={`${user.company} logo`}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white ring-2 p-0.5 object-contain ring-white"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-600 truncate">{user.name}</h3>
            <p className="text-sm font-semibold text-gray-600 truncate">{user.position}</p>
            <div className="flex items-center gap-1 mt-1">
              <FiHome className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-500 truncate">{user.company}</span>
            </div>
          </div>

          <FiChevronDown className="w-5 h-5 text-gray-400 bg-gray-200 rounded-full" />
        </div>
      </div>
    );
  }

  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit && user._id) onEdit(user._id);
  };

  return (
    <div className={`uc-profile-card ${className}`}>
      {showCloseButton && (
        <button
          type="button"
          className="uc-profile-close"
          onClick={(e) => {
            e.stopPropagation();
            if (onClose) onClose();
            else setIsExpanded(false);
          }}
          aria-label="Close"
        >
          <FiX size={22} color="#6b7280" />
        </button>
      )}

      <div className="uc-profile-layout">
        <div className="uc-profile-sidebar">
          <div className="uc-profile-avatar-wrap">
            <img
              src={
                user.profilePic ||
                'https://www.pikpng.com/pngl/m/154-1540525_male-user-filled-icon-my-profile-icon-png.png'
              }
              alt={`${user.name}'s avatar`}
              className="uc-profile-avatar"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  'https://www.pikpng.com/pngl/m/154-1540525_male-user-filled-icon-my-profile-icon-png.png';
              }}
            />
            <img
              src={getCompanyLogo(works[0]?.company || user.company)}
              alt="Company logo"
              className="uc-profile-company-logo"
            />
          </div>

          <h3 className="uc-profile-name">{user.name}</h3>

          {getUserBranch(user) && (
            <span
              className={branchBadgeClass(getUserBranch(user))}
              style={{ marginTop: 8 }}
            >
              {getUserBranch(user)}
            </span>
          )}

          <p className="uc-profile-role">
            {works[0]?.position || user.position || '—'}
            {(works[0]?.company || user.company) && ` at ${works[0]?.company || user.company}`}
            {works.length > 1 && (
              <span style={{ display: 'block', fontSize: '0.875rem', color: '#4f46e5', marginTop: 4 }}>
                +{works.length - 1} more work assignment{works.length > 1 ? 's' : ''}
              </span>
            )}
          </p>

          {skills.length > 0 && (
            <>
              <div className="uc-profile-skills-label">Skills</div>
              <div className="uc-profile-skills">
                {skills.map((skill, i) => (
                  <span key={`${skill}-${i}`} className="uc-profile-skill-chip">
                    {skill}
                  </span>
                ))}
              </div>
            </>
          )}

          {onEdit && (
            <button type="button" className="uc-btn uc-btn-primary" style={{ marginTop: '1.5rem' }} onClick={handleEditClick}>
              <FiEdit3 size={16} />
              Edit Profile
            </button>
          )}
        </div>

        <div className="uc-profile-main">
          <div className="uc-profile-grid-2">
            <div className="uc-profile-section">
              <h4>
                <FiHome size={18} color="#159C8E" />
                Work Information
                {works.length > 1 && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#4f46e5', marginLeft: 6 }}>
                    ({works.length} assignments)
                  </span>
                )}
              </h4>
              <div>
                {works.map((work, i) => (
                  <div key={i} className="uc-profile-row" style={i > 0 ? { borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' } : undefined}>
                    <FiHome size={18} color="#6b7280" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      {works.length > 1 && (
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                          {i === 0 ? 'Primary' : `Work ${i + 1}`}
                        </div>
                      )}
                      <div style={{ fontWeight: 600 }}>{work.position || '—'}</div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{work.company || '—'}</div>
                      {work.department && (
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{work.department}</div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="uc-profile-row">
                  <CalendarIcon size={18} color="#6b7280" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div>Joined {formatDate(user.dateOfJoining)}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {user.dateOfRelieving ? `Relieved ${formatDate(user.dateOfRelieving)}` : 'Currently working'}
                    </div>
                  </div>
                </div>
                {user.qualification && (
                  <div className="uc-profile-row">
                    <FiAward size={18} color="#6b7280" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{user.qualification}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="uc-profile-section">
              <h4>
                <FiUser size={18} color="#159C8E" />
                Personal Details
              </h4>
              <div className="uc-profile-row">
                <FiMail size={18} color="#6b7280" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ wordBreak: 'break-all' }}>{user.email || '—'}</span>
              </div>
              <div className="uc-profile-row">
                <FiPhone size={18} color="#6b7280" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{user.phone || '—'}</span>
              </div>
              <div className="uc-profile-row">
                <FiDroplet size={18} color="#6b7280" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{user.bloodGroup || 'N/A'}</span>
              </div>
              <div className="uc-profile-row">
                <FiMapPin size={18} color="#6b7280" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{user.address || 'N/A'}</span>
              </div>
              <div className="uc-profile-row">
                <CalendarIcon size={18} color="#6b7280" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>DOB: {user.dateOfBirth ? formatDate(user.dateOfBirth) : 'N/A'}</span>
              </div>
              {(user.aadharNumber || user.aadharCard?.url) && (
                <div className="uc-profile-row">
                  <FiFileText size={18} color="#159C8E" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    {user.aadharNumber && <div><strong>Aadhaar:</strong> {user.aadharNumber}</div>}
                    {user.aadharCard?.url ? (
                      <a
                        href={user.aadharCard.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0f766e', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'underline' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Aadhaar Card Document
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#9a3412' }}>Aadhaar Card Document Not Uploaded</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {roles.length > 0 && (
            <div className="uc-profile-section">
              <h4>Roles &amp; Responsibilities</h4>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#374151' }}>
                {roles.map((item, i) => (
                  <li key={`${item}-${i}`} style={{ marginBottom: '0.35rem' }}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {formattedBankingDetails && (
            <div className="uc-profile-section" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
              <div className="uc-flex-between" style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>
                  <FiCreditCard size={18} color="#dc2626" />
                  Banking Details
                </h4>
                <button
                  type="button"
                  className="uc-btn uc-btn-outline"
                  style={{ padding: '4px 8px' }}
                  onClick={() => setShowBankingDetails(!showBankingDetails)}
                >
                  {showBankingDetails ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <div className="uc-profile-grid-2">
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Bank Name</div>
                  <div style={{ fontWeight: 500 }}>{formattedBankingDetails.bankName || 'Not provided'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Account Number</div>
                  <div style={{ fontFamily: 'monospace' }}>{formattedBankingDetails.accountNumber || 'Not provided'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>IFSC Code</div>
                  <div style={{ fontFamily: 'monospace' }}>{formattedBankingDetails.ifscCode || 'Not provided'}</div>
                </div>
                {formattedBankingDetails.upiId && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>UPI ID</div>
                    <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{formattedBankingDetails.upiId}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {user.adminComments && user.adminComments.trim() !== '' && (
            <div className="uc-profile-section" style={{ background: '#fefce8', borderColor: '#fde047' }}>
              <h4>Admin Comments</h4>
              <div style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{user.adminComments}</div>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <span><strong>Account Created:</strong> {formatDate(user.createdAt)}</span>
            <span><strong>Last Updated:</strong> {formatDate(user.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCard;