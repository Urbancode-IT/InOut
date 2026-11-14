import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../utils/api';
import { BRANCH_OPTIONS } from '../utils/branches';
import {
  BLOOD_GROUP_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  createDefaultWeeklySchedule,
  createEmptyWorkExperience,
  isValidMobile,
  normalizeEmploymentType,
  calculateTotalYearsFromWorkExperience,
  formatDisplayDate,
  splitDateParts,
  validateBankDetails,
} from '../utils/registrationConstants';
import {
  FiUser, FiMail, FiLock, FiBriefcase, FiHome, FiPhone, FiChevronLeft, FiChevronRight,
  FiImage, FiFileText, FiCreditCard, FiPlus, FiTrash2, FiClock
} from 'react-icons/fi';

const PROFILE_MAX_BYTES = 2 * 1024 * 1024;
const DOC_MAX_BYTES = 5 * 1024 * 1024;

export default function RegisterMultiStep() {
  const initialForm = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    position: '',
    company: '',
    department: '',
    qualification: '',
    dateOfJoining: '',
    rolesAndResponsibility: '',
    skills: '',
    bloodGroup: '',
    address: '',
    branch: '',
    dateOfBirth: '',
    aadharNumber: '',
    previousCompany: '',
    previousWorkExperience: '',
    previousJobRole: '',
    totalYearsOfExperience: '',
    isFresher: false,
    workExperience: [createEmptyWorkExperience()],

    bankDetails: {
      accountHolderName: '',
      bankingName: '',
      bankAccountNumber: '',
      confirmBankAccountNumber: '',
      ifscCode: '',
      branchName: '',
      accountType: '',
      upiId: ''
    },
    employmentType: 'Full-Time',
    schedule: createDefaultWeeklySchedule('Full-Time'),
  };

  const [formData, setFormData] = useState(initialForm);
  const [files, setFiles] = useState({
    profilePic: null,
    resume: null,
    aadharCard: null,
  });
  const [previews, setPreviews] = useState({
    profilePic: '',
  });
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const stepsCount = 6; // Personal, Job, Schedule, Bank, Documents, Review

  const clearFieldError = (name) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === 'phone') {
      nextValue = value.replace(/\D/g, '').slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [name]: nextValue }));

    if (name === 'phone') {
      if (!nextValue) {
        setFieldErrors((prev) => ({ ...prev, phone: 'Mobile number is required.' }));
      } else if (!isValidMobile(nextValue)) {
        setFieldErrors((prev) => ({
          ...prev,
          phone: 'Please enter a valid 10-digit mobile number.',
        }));
      } else {
        clearFieldError('phone');
      }
      return;
    }

    if (name === 'bloodGroup') {
      if (!nextValue) {
        setFieldErrors((prev) => ({ ...prev, bloodGroup: 'Please select your blood group.' }));
      } else {
        clearFieldError('bloodGroup');
      }
      return;
    }

    if ([
      'name', 'email', 'password', 'confirmPassword', 'branch', 'position', 'company',
      'department', 'qualification', 'dateOfJoining', 'rolesAndResponsibility', 'skills',
    ].includes(name)) {
      if (String(nextValue || '').trim()) clearFieldError(name);
    }

    if (name === 'confirmPassword' || name === 'password') {
      const pwd = name === 'password' ? nextValue : formData.password;
      const confirm = name === 'confirmPassword' ? nextValue : formData.confirmPassword;
      if (confirm && pwd !== confirm) {
        setFieldErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
      } else {
        clearFieldError('confirmPassword');
      }
    }
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === 'bankAccountNumber' || name === 'confirmBankAccountNumber') {
      nextValue = String(value || '').replace(/\D/g, '').slice(0, 18);
    }
    if (name === 'ifscCode') {
      nextValue = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    }
    setFormData((prev) => ({
      ...prev,
      bankDetails: { ...prev.bankDetails, [name]: nextValue },
    }));
    clearFieldError(name);
    if (name === 'bankAccountNumber' || name === 'confirmBankAccountNumber') {
      clearFieldError('confirmBankAccountNumber');
    }
  };

  const handleScheduleChange = (day, field, value) => {
    setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, [day]: { ...prev.schedule[day], [field]: value } } }));
    clearFieldError(`schedule.${day}`);
    clearFieldError('schedule');
  };

  const handleScheduleToggle = (day, checked) => {
    setFormData((prev) => {
      const current = prev.schedule[day] || {};
      const defaults = createDefaultWeeklySchedule(prev.employmentType)[day] || {};
      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          [day]: {
            ...current,
            isLeave: checked,
            start: checked ? '' : (current.start || defaults.start || '10:00'),
            end: checked ? '' : (current.end || defaults.end || (prev.employmentType === 'Part-Time' ? '14:00' : '18:00')),
          },
        },
      };
    });
    clearFieldError(`schedule.${day}`);
    clearFieldError('schedule');
  };

  const handleEmploymentTypeChange = (value) => {
    const employmentType = normalizeEmploymentType(value);
    setFormData((prev) => ({
      ...prev,
      employmentType,
      schedule: createDefaultWeeklySchedule(employmentType),
    }));
    clearFieldError('employmentType');
    clearFieldError('schedule');
  };

  const handleFresherChange = (isFresher) => {
    setFormData((prev) => ({
      ...prev,
      isFresher,
      workExperience: isFresher ? [] : (prev.workExperience.length ? prev.workExperience : [createEmptyWorkExperience()]),
      totalYearsOfExperience: isFresher ? '0' : prev.totalYearsOfExperience,
      previousCompany: isFresher ? '' : prev.previousCompany,
      previousJobRole: isFresher ? '' : prev.previousJobRole,
      previousWorkExperience: isFresher ? '' : prev.previousWorkExperience,
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith('workExperience.')) delete next[key];
      });
      return next;
    });
  };

  const handleWorkExperienceChange = (index, field, value) => {
    setFormData((prev) => {
      const list = prev.workExperience.map((entry, i) => {
        if (i !== index) return entry;
        const updated = { ...entry, [field]: value };
        if (field === 'currentlyWorking' && value) {
          updated.endDate = '';
        }
        return updated;
      });
      return { ...prev, workExperience: list };
    });
    clearFieldError(`workExperience.${index}.${field}`);
    if (field === 'currentlyWorking') {
      clearFieldError(`workExperience.${index}.endDate`);
      clearFieldError(`workExperience.${index}.dateRange`);
    }
    if (field === 'startDate' || field === 'endDate') {
      clearFieldError(`workExperience.${index}.dateRange`);
    }
  };

  const addWorkExperience = () => {
    setFormData((prev) => ({
      ...prev,
      workExperience: [...prev.workExperience, createEmptyWorkExperience()],
    }));
  };

  const removeWorkExperience = (index) => {
    setFormData((prev) => {
      const list = prev.workExperience.filter((_, i) => i !== index);
      return {
        ...prev,
        workExperience: list.length ? list : [createEmptyWorkExperience()],
      };
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(`workExperience.${index}.`)) delete next[key];
      });
      return next;
    });
  };

  const getFileExt = (file) =>
    String(file?.name || '')
      .split('.')
      .pop()
      ?.toLowerCase() || '';

  const isImageFile = (file) => {
    const ext = getFileExt(file);
    const mimeOk = !file.type || ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
    const extOk = ['jpg', 'jpeg', 'png'].includes(ext);
    return mimeOk && extOk;
  };

  const isPdfFile = (file) => {
    const ext = getFileExt(file);
    const mimeOk = !file.type || file.type === 'application/pdf';
    return mimeOk && ext === 'pdf';
  };

  const handleFileChange = (field, file) => {
    if (!file) {
      setFiles((prev) => ({ ...prev, [field]: null }));
      if (field === 'profilePic') setPreviews((prev) => ({ ...prev, profilePic: '' }));
      return true;
    }

    if (field === 'profilePic') {
      if (!isImageFile(file)) {
        toast.warning('Profile picture must be a JPG or PNG image');
        setFieldErrors((prev) => ({
          ...prev,
          profilePic: 'Please upload a JPG or PNG profile photo.',
        }));
        return false;
      }
      if (file.size > PROFILE_MAX_BYTES) {
        toast.warning('Profile picture must be under 2 MB');
        setFieldErrors((prev) => ({
          ...prev,
          profilePic: 'Profile picture must be under 2 MB.',
        }));
        return false;
      }
      setPreviews((prev) => ({ ...prev, profilePic: URL.createObjectURL(file) }));
      clearFieldError('profilePic');
    }

    if (field === 'resume') {
      if (!isPdfFile(file)) {
        toast.warning('Resume must be a PDF file only');
        setFieldErrors((prev) => ({
          ...prev,
          resume: 'Please upload your resume as a PDF file.',
        }));
        return false;
      }
      if (file.size > DOC_MAX_BYTES) {
        toast.warning('Resume must be under 5 MB');
        setFieldErrors((prev) => ({
          ...prev,
          resume: 'Resume must be under 5 MB.',
        }));
        return false;
      }
      clearFieldError('resume');
    }

    if (field === 'aadharCard') {
      if (!isImageFile(file) && !isPdfFile(file)) {
        toast.warning('Aadhaar card must be JPG, PNG, or PDF');
        setFieldErrors((prev) => ({
          ...prev,
          aadharCard: 'Please upload Aadhaar as JPG, PNG, or PDF.',
        }));
        return false;
      }
      if (file.size > DOC_MAX_BYTES) {
        toast.warning('Aadhaar card must be under 5 MB');
        setFieldErrors((prev) => ({
          ...prev,
          aadharCard: 'Aadhaar card must be under 5 MB.',
        }));
        return false;
      }
      clearFieldError('aadharCard');
    }

    setFiles((prev) => ({ ...prev, [field]: file }));
    return true;
  };

  const next = () => setStep(s => Math.min(s + 1, stepsCount));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const validateWorkExperienceEntries = (errors) => {
    if (formData.isFresher) return true;
    const list = formData.workExperience || [];
    if (!list.length) return true; // optional overall — experienced can skip if they want

    let ok = true;
    list.forEach((entry, index) => {
      const hasAny =
        entry.companyName ||
        entry.jobRole ||
        entry.startDate ||
        entry.endDate ||
        entry.responsibilities ||
        entry.reasonForLeaving ||
        entry.currentlyWorking;

      if (!hasAny) return;

      if (!String(entry.companyName || '').trim()) {
        errors[`workExperience.${index}.companyName`] = 'Company name is required.';
        ok = false;
      }
      if (!String(entry.jobRole || '').trim()) {
        errors[`workExperience.${index}.jobRole`] = 'Job role / designation is required.';
        ok = false;
      }
      if (!entry.startDate) {
        errors[`workExperience.${index}.startDate`] = 'From date is required.';
        ok = false;
      }
      if (!entry.currentlyWorking && !entry.endDate) {
        errors[`workExperience.${index}.endDate`] = 'End date is required.';
        ok = false;
      }
      if (entry.startDate && !entry.currentlyWorking && entry.endDate) {
        if (entry.endDate < entry.startDate) {
          errors[`workExperience.${index}.dateRange`] =
            'End date cannot be earlier than from date.';
          ok = false;
        }
      }
    });
    return ok;
  };

  const collectErrorsForStep = (targetStep, errors) => {
    if (targetStep === 1) {
      if (!String(formData.name || '').trim()) errors.name = 'Full name is required.';
      if (!String(formData.email || '').trim()) errors.email = 'Email is required.';
      if (!String(formData.password || '').trim()) errors.password = 'Password is required.';
      if (!String(formData.confirmPassword || '').trim()) {
        errors.confirmPassword = 'Please confirm your password.';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
      if (!String(formData.phone || '').trim()) {
        errors.phone = 'Mobile number is required.';
      } else if (!isValidMobile(formData.phone)) {
        errors.phone = 'Please enter a valid 10-digit mobile number.';
      }
      if (!formData.bloodGroup) {
        errors.bloodGroup = 'Please select your blood group.';
      } else if (!BLOOD_GROUP_OPTIONS.includes(formData.bloodGroup)) {
        errors.bloodGroup = 'Please select your blood group.';
      }
      if (!formData.branch) errors.branch = 'Branch is required.';
    }

    if (targetStep === 2) {
      if (!String(formData.position || '').trim()) errors.position = 'Position is required.';
      if (!formData.company) errors.company = 'Company is required.';
      if (!String(formData.department || '').trim()) errors.department = 'Department is required.';
      if (!String(formData.qualification || '').trim()) errors.qualification = 'Qualification is required.';
      if (!formData.dateOfJoining) errors.dateOfJoining = 'Date of joining is required.';
      if (!String(formData.rolesAndResponsibility || '').trim()) {
        errors.rolesAndResponsibility = 'Roles & responsibilities are required.';
      }
      if (!String(formData.skills || '').trim()) errors.skills = 'Skills are required.';

      const { totalYearsOfExperience } = formData;
      if (
        totalYearsOfExperience !== '' &&
        totalYearsOfExperience != null &&
        (Number.isNaN(Number(totalYearsOfExperience)) ||
          Number(totalYearsOfExperience) < 0 ||
          Number(totalYearsOfExperience) > 60)
      ) {
        errors.totalYearsOfExperience = 'Total Years of Experience must be a number between 0 and 60.';
      }

      validateWorkExperienceEntries(errors);
    }

    if (targetStep === 3) {
      if (!EMPLOYMENT_TYPE_OPTIONS.includes(formData.employmentType)) {
        errors.employmentType = 'Please select employment type.';
      }
      const days = Object.keys(formData.schedule || {});
      const workingDays = days.filter((day) => !formData.schedule[day]?.isLeave);
      if (workingDays.length === 0) {
        errors.schedule = 'Select at least one working day.';
      }
      workingDays.forEach((day) => {
        const daySch = formData.schedule[day] || {};
        if (!daySch.start || !daySch.end) {
          errors[`schedule.${day}`] = 'Start and end time are required for working days.';
        } else if (daySch.start >= daySch.end) {
          errors[`schedule.${day}`] = 'End time must be after start time.';
        }
      });
    }

    if (targetStep === 4) {
      const bankErrors = validateBankDetails(formData.bankDetails);
      Object.assign(errors, bankErrors);
    }

    if (targetStep === 5) {
      if (!files.profilePic) {
        errors.profilePic = 'Please upload a profile picture.';
      } else if (!isImageFile(files.profilePic)) {
        errors.profilePic = 'Profile picture must be JPG or PNG.';
      }
      if (!files.resume) {
        errors.resume = 'Please upload your resume (PDF).';
      } else if (!isPdfFile(files.resume)) {
        errors.resume = 'Resume must be a PDF file.';
      }
      if (!files.aadharCard) {
        errors.aadharCard = 'Please upload your Aadhaar card.';
      } else if (!isImageFile(files.aadharCard) && !isPdfFile(files.aadharCard)) {
        errors.aadharCard = 'Aadhaar must be JPG, PNG, or PDF.';
      }
    }
  };

  const validateStep = (targetStep = step) => {
    const errors = {};
    collectErrorsForStep(targetStep, errors);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateForSubmit = () => {
    const errors = {};
    collectErrorsForStep(1, errors);
    collectErrorsForStep(2, errors);
    collectErrorsForStep(3, errors);
    collectErrorsForStep(4, errors);
    collectErrorsForStep(5, errors);
    setFieldErrors(errors);
    return { ok: Object.keys(errors).length === 0, errors };
  };

  const handleNext = () => {
    if (!validateStep()) {
      toast.warning('Please fix the highlighted fields before continuing.');
      return;
    }
    next();
  };

  const syncLegacyExperienceFields = () => {
    if (formData.isFresher) {
      return {
        previousCompany: '',
        previousJobRole: '',
        previousWorkExperience: '',
        totalYearsOfExperience: '0',
        workExperience: [],
      };
    }

    const filled = (formData.workExperience || []).filter(
      (e) => String(e.companyName || '').trim() && String(e.jobRole || '').trim()
    );

    const summary = filled
      .map((e, i) => {
        const from = formatDisplayDate(e.startDate);
        const to = e.currentlyWorking ? 'Present' : formatDisplayDate(e.endDate);
        return `${i + 1}. ${e.companyName} — ${e.jobRole} (${from} to ${to})`;
      })
      .join('\n');

    const calculated = calculateTotalYearsFromWorkExperience(filled);
    const total =
      formData.totalYearsOfExperience !== '' && formData.totalYearsOfExperience != null
        ? formData.totalYearsOfExperience
        : calculated != null
          ? String(calculated)
          : '';

    return {
      previousCompany: filled[0]?.companyName || formData.previousCompany || '',
      previousJobRole: filled[0]?.jobRole || formData.previousJobRole || '',
      previousWorkExperience: summary || formData.previousWorkExperience || '',
      totalYearsOfExperience: total,
      workExperience: filled.map((e) => {
        const startParts = splitDateParts(e.startDate);
        const endParts = e.currentlyWorking ? { day: null, month: null, year: null } : splitDateParts(e.endDate);
        return {
          companyName: String(e.companyName).trim(),
          jobRole: String(e.jobRole).trim(),
          startDate: e.startDate,
          endDate: e.currentlyWorking ? null : e.endDate,
          startDay: startParts.day,
          startMonth: startParts.month,
          startYear: startParts.year,
          endDay: endParts.day,
          endMonth: endParts.month,
          endYear: endParts.year,
          currentlyWorking: Boolean(e.currentlyWorking),
          responsibilities: String(e.responsibilities || '').trim(),
          reasonForLeaving: String(e.reasonForLeaving || '').trim(),
        };
      }),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { ok, errors } = validateForSubmit();
    if (!ok) {
      toast.warning('Please fix the highlighted fields before submitting.');
      if (
        errors.name ||
        errors.email ||
        errors.password ||
        errors.confirmPassword ||
        errors.phone ||
        errors.bloodGroup ||
        errors.branch
      ) {
        setStep(1);
      } else if (
        errors.position ||
        errors.company ||
        errors.department ||
        errors.qualification ||
        errors.dateOfJoining ||
        errors.rolesAndResponsibility ||
        errors.skills ||
        Object.keys(errors).some((k) => k.startsWith('workExperience.'))
      ) {
        setStep(2);
      } else if (
        errors.employmentType ||
        errors.schedule ||
        Object.keys(errors).some((k) => k.startsWith('schedule.'))
      ) {
        setStep(3);
      } else if (
        errors.accountHolderName ||
        errors.bankingName ||
        errors.bankAccountNumber ||
        errors.confirmBankAccountNumber ||
        errors.ifscCode ||
        errors.accountType ||
        errors.upiId
      ) {
        setStep(4);
      } else if (errors.profilePic || errors.resume || errors.aadharCard) {
        setStep(5);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const legacy = syncLegacyExperienceFields();
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('email', formData.email);
      fd.append('password', formData.password);
      fd.append('phone', formData.phone);
      fd.append('position', formData.position);
      fd.append('company', formData.company);
      // Salary is admin-only — registrants cannot set it
      fd.append('salary', '0');
      fd.append('department', formData.department || formData.branch || '');
      fd.append('branch', formData.branch || '');
      fd.append('qualification', formData.qualification || '');
      if (formData.dateOfJoining) fd.append('dateOfJoining', formData.dateOfJoining);
      if (formData.dateOfBirth) fd.append('dateOfBirth', formData.dateOfBirth);
      fd.append('bloodGroup', formData.bloodGroup || '');
      fd.append('address', formData.address || '');
      fd.append('aadharNumber', formData.aadharNumber || '');
      fd.append('isFresher', formData.isFresher ? 'true' : 'false');
      fd.append('previousCompany', legacy.previousCompany);
      fd.append('previousWorkExperience', legacy.previousWorkExperience);
      fd.append('previousJobRole', legacy.previousJobRole);
      fd.append('workExperience', JSON.stringify(legacy.workExperience));
      if (
        legacy.totalYearsOfExperience !== '' &&
        legacy.totalYearsOfExperience != null
      ) {
        fd.append('totalYearsOfExperience', String(legacy.totalYearsOfExperience));
      }
      fd.append(
        'rolesAndResponsibility',
        formData.rolesAndResponsibility
          ? formData.rolesAndResponsibility.split(',').map((s) => s.trim()).filter(Boolean).join(',')
          : ''
      );
      fd.append(
        'skills',
        formData.skills
          ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean).join(',')
          : ''
      );
      fd.append(
        'bankDetails',
        JSON.stringify({
          accountHolderName: formData.bankDetails.accountHolderName || '',
          bankingName: formData.bankDetails.bankingName || '',
          bankAccountNumber: formData.bankDetails.bankAccountNumber || '',
          ifscCode: String(formData.bankDetails.ifscCode || '').toUpperCase(),
          branchName: formData.bankDetails.branchName || '',
          accountType: formData.bankDetails.accountType || '',
          upiId: formData.bankDetails.upiId || '',
          officeBranch: formData.branch,
        })
      );
      fd.append('employmentType', normalizeEmploymentType(formData.employmentType));
      fd.append('schedule', JSON.stringify(formData.schedule));

      fd.append('profilePic', files.profilePic);
      fd.append('resume', files.resume);
      fd.append('aadharCard', files.aadharCard);

      await axios.post(API_ENDPOINTS.register, fd);

      toast.success('Submitted: Registration submitted and is pending admin approval');
      setFormData(initialForm);
      setFiles({ profilePic: null, resume: null, aadharCard: null });
      setPreviews({ profilePic: '' });
      setFieldErrors({});
      setStep(1);

    } catch (error) {
      console.error(error);
      toast.error(`Error: ${error.response?.data?.error || error.response?.data?.message || 'Failed to submit registration'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedTotal = formData.isFresher
    ? 0
    : calculateTotalYearsFromWorkExperience(
        (formData.workExperience || []).filter(
          (e) => e.companyName && e.jobRole && e.startDate
        )
      );

  return (
    <div className="min-h-screen bg-[#f0f4ff] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white/80 border border-[#e0ecff] shadow-lg rounded-2xl p-8">
        <Header step={step} stepsCount={stepsCount} />

        <p className="mt-3 text-sm text-gray-600">
          Fields marked with <span className="text-red-600 font-semibold">*</span> are mandatory.
        </p>

        <form onSubmit={handleSubmit} className="mt-6" noValidate>
          {step === 1 && (
            <PersonalDetails
              formData={formData}
              handleChange={handleChange}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              fieldErrors={fieldErrors}
            />
          )}

          {step === 2 && (
            <JobDetails
              formData={formData}
              handleChange={handleChange}
              fieldErrors={fieldErrors}
              onFresherChange={handleFresherChange}
              onWorkExperienceChange={handleWorkExperienceChange}
              onAddWorkExperience={addWorkExperience}
              onRemoveWorkExperience={removeWorkExperience}
              calculatedTotal={calculatedTotal}
              onTagListChange={(name, next) => {
                setFormData((prev) => ({ ...prev, [name]: next }));
                if (String(next || '').trim()) clearFieldError(name);
              }}
            />
          )}

          {step === 3 && (
            <ScheduleStep
              employmentType={formData.employmentType}
              schedule={formData.schedule}
              onEmploymentTypeChange={handleEmploymentTypeChange}
              onChange={handleScheduleChange}
              onToggle={handleScheduleToggle}
              fieldErrors={fieldErrors}
            />
          )}

          {step === 4 && (
            <BankDetails
              bankDetails={formData.bankDetails}
              handleBankChange={handleBankChange}
              fieldErrors={fieldErrors}
            />
          )}

          {step === 5 && (
            <DocumentsStep
              formData={formData}
              handleChange={handleChange}
              files={files}
              previews={previews}
              onFileChange={handleFileChange}
              fieldErrors={fieldErrors}
            />
          )}

          {step === 6 && (
            <Review formData={formData} files={files} previews={previews} />
          )}

          <div className="flex justify-between mt-6">
            <button type="button" onClick={back} disabled={step === 1} className={`inline-flex items-center px-4 py-2 rounded-md border ${step === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}>
              <FiChevronLeft className="mr-2" /> Back
            </button>

            <div className="flex gap-2">
              {step < stepsCount && (
                <button type="button" onClick={handleNext} className="inline-flex items-center px-4 py-2 bg-[#159C8E] text-white rounded-md hover:bg-[#0F7A6E]">
                  Next <FiChevronRight className="ml-2" />
                </button>
              )}

              {step === stepsCount && (
                <button type="submit" disabled={isSubmitting} className={`inline-flex items-center px-4 py-2 bg-[#159C8E] text-white rounded-md ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Header({ step, stepsCount }) {
  const labels = ['Personal', 'Job', 'Schedule', 'Bank', 'Documents', 'Review'];
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#2c2e3e]">Multi-step Registration</h2>
      <p className="text-sm text-gray-600 mt-1">
        Step {step} of {stepsCount} — {labels[step - 1]}
      </p>
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mt-3">
        <div className="h-2 bg-[#159C8E]" style={{ width: `${(step / stepsCount) * 100}%` }} />
      </div>
    </div>
  );
}

function FieldLabel({ label, required, icon }) {
  return (
    <label className="block text-sm font-medium text-[#2c2e3e] mb-1 flex items-center flex-wrap gap-x-1">
      {icon && <span className="mr-1 text-[#159C8E]">{icon}</span>}
      <span>
        {label}
        {required ? <span className="text-red-600 ml-0.5">*</span> : null}
      </span>
    </label>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function inputClass(hasError) {
  return `block w-full rounded-md border px-3 py-2 ${
    hasError ? 'border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500' : 'border-gray-300'
  }`;
}

function PersonalDetails({ formData, handleChange, showPassword, setShowPassword, fieldErrors }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        label="Full Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        icon={<FiUser />}
        required
        error={fieldErrors.name}
      />
      <Input
        label="Email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        type="email"
        icon={<FiMail />}
        required
        error={fieldErrors.email}
      />

      <div>
        <FieldLabel label="Password" required />
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••"
            className={inputClass(!!fieldErrors.password)}
          />
          <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-2 top-2 text-sm text-[#159C8E]">{showPassword ? 'Hide' : 'Show'}</button>
        </div>
        <FieldError message={fieldErrors.password} />
      </div>

      <Input
        label="Confirm Password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        type={showPassword ? 'text' : 'password'}
        icon={<FiLock />}
        required
        error={fieldErrors.confirmPassword}
      />

      <Input
        label="Mobile Number"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        icon={<FiPhone />}
        required
        error={fieldErrors.phone}
        type="tel"
        inputMode="numeric"
        maxLength={10}
        pattern="[0-9]{10}"
        autoComplete="tel"
        placeholder="10-digit mobile number"
      />

      <div>
        <FieldLabel label="Blood Group" required />
        <select
          name="bloodGroup"
          value={formData.bloodGroup}
          onChange={handleChange}
          className={inputClass(!!fieldErrors.bloodGroup)}
        >
          <option value="">Select Blood Group</option>
          {BLOOD_GROUP_OPTIONS.map((bg) => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>
        <FieldError message={fieldErrors.bloodGroup} />
      </div>

      <div className="max-w-xs">
        <FieldLabel label="Branch" required icon={<FiHome />} />
        <select
          name="branch"
          value={formData.branch}
          onChange={handleChange}
          className={inputClass(!!fieldErrors.branch)}
        >
          <option value="">Select branch</option>
          {BRANCH_OPTIONS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <FieldError message={fieldErrors.branch} />
      </div>

      <Input
        label="Address"
        name="address"
        value={formData.address}
        onChange={handleChange}
      />
      <div>
        <FieldLabel label="Date of Birth" />
        <input
          type="date"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={handleChange}
          className="block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
    </div>
  );
}

function JobDetails({
  formData,
  handleChange,
  fieldErrors,
  onFresherChange,
  onWorkExperienceChange,
  onAddWorkExperience,
  onRemoveWorkExperience,
  calculatedTotal,
  onTagListChange,
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Position"
          name="position"
          value={formData.position}
          onChange={handleChange}
          icon={<FiBriefcase />}
          required
          error={fieldErrors.position}
        />
        <div>
          <FieldLabel label="Company" required icon={<FiHome />} />
          <select
            name="company"
            value={formData.company}
            onChange={handleChange}
            className={inputClass(!!fieldErrors.company)}
          >
            <option value="">Select Company</option>
            <option value="Jobzenter">Jobzenter</option>
            <option value="Urbancode">Urbancode</option>
            <option value="Other">Other</option>
          </select>
          <FieldError message={fieldErrors.company} />
        </div>

        <Input label="Department" name="department" value={formData.department} onChange={handleChange} required error={fieldErrors.department} />
        <Input label="Qualification" name="qualification" value={formData.qualification} onChange={handleChange} required error={fieldErrors.qualification} />
        <Input label="Date of Joining" name="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} type="date" required error={fieldErrors.dateOfJoining} />
        <TagListField
          label="Roles & Responsibilities"
          name="rolesAndResponsibility"
          value={formData.rolesAndResponsibility}
          onChangeList={(next) => onTagListChange('rolesAndResponsibility', next)}
          required
          error={fieldErrors.rolesAndResponsibility}
          placeholder="Type one role and click Add"
        />
        <TagListField
          label="Skills"
          name="skills"
          value={formData.skills}
          onChangeList={(next) => onTagListChange('skills', next)}
          required
          error={fieldErrors.skills}
          placeholder="Type one skill and click Add"
        />
      </div>

      <div className="rounded-xl border border-[#e0ecff] bg-white p-4">
        <h3 className="text-sm font-semibold text-[#2c2e3e] mb-3">Work Experience</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="experienceType"
              checked={formData.isFresher === true}
              onChange={() => onFresherChange(true)}
            />
            Fresher
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="experienceType"
              checked={formData.isFresher === false}
              onChange={() => onFresherChange(false)}
            />
            Experienced
          </label>
        </div>

        {formData.isFresher ? (
          <p className="text-sm text-gray-600">
            Fresher selected — company work history is not required.
          </p>
        ) : (
          <div className="space-y-4">
            {(formData.workExperience || []).map((entry, index) => (
              <WorkExperienceCard
                key={index}
                index={index}
                entry={entry}
                fieldErrors={fieldErrors}
                onChange={onWorkExperienceChange}
                onRemove={onRemoveWorkExperience}
                canRemove={(formData.workExperience || []).length > 1}
              />
            ))}

            <button
              type="button"
              onClick={onAddWorkExperience}
              className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-[#159C8E] text-[#159C8E] hover:bg-[#159C8E]/hover:text-white"
            >
              <FiPlus className="mr-2" /> Add Another Company
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <FieldLabel label="Total Years of Experience" />
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    name="totalYearsOfExperience"
                    min={0}
                    max={60}
                    step={0.1}
                    value={formData.totalYearsOfExperience}
                    onChange={handleChange}
                    className={inputClass(!!fieldErrors.totalYearsOfExperience)}
                    placeholder={calculatedTotal != null ? String(calculatedTotal) : 'e.g. 2.5'}
                  />
                  {calculatedTotal != null && (
                    <button
                      type="button"
                      onClick={() =>
                        handleChange({
                          target: {
                            name: 'totalYearsOfExperience',
                            value: String(calculatedTotal),
                          },
                        })
                      }
                      className="shrink-0 px-3 py-2 text-xs rounded-md border border-[#159C8E] text-[#159C8E] hover:bg-[#159C8E] hover:text-white"
                    >
                      Use calculated ({calculatedTotal})
                    </button>
                  )}
                </div>
                {calculatedTotal != null && (
                  <p className="mt-1 text-xs text-gray-500">
                    Calculated from company dates (overlapping periods are not double-counted). Review and adjust if needed.
                  </p>
                )}
                <FieldError message={fieldErrors.totalYearsOfExperience} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkExperienceCard({ index, entry, fieldErrors, onChange, onRemove, canRemove }) {
  const prefix = `workExperience.${index}`;
  return (
    <div className="rounded-lg border border-gray-200 bg-[#f8fafc] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#2c2e3e]">Company {index + 1}</h4>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="inline-flex items-center text-xs text-red-600 hover:text-red-700"
          >
            <FiTrash2 className="mr-1" /> Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <FieldLabel label="Company / Organization Name" />
          <input
            type="text"
            value={entry.companyName}
            onChange={(e) => onChange(index, 'companyName', e.target.value)}
            className={inputClass(!!fieldErrors[`${prefix}.companyName`])}
            placeholder="e.g. ABC Technologies"
          />
          <FieldError message={fieldErrors[`${prefix}.companyName`]} />
        </div>
        <div>
          <FieldLabel label="Job Role / Designation" />
          <input
            type="text"
            value={entry.jobRole}
            onChange={(e) => onChange(index, 'jobRole', e.target.value)}
            className={inputClass(!!fieldErrors[`${prefix}.jobRole`])}
            placeholder="e.g. Software Developer"
          />
          <FieldError message={fieldErrors[`${prefix}.jobRole`]} />
        </div>

        <div className="md:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-[#2c2e3e]">
            <input
              type="checkbox"
              checked={!!entry.currentlyWorking}
              onChange={(e) => onChange(index, 'currentlyWorking', e.target.checked)}
            />
            Currently Working Here
          </label>
        </div>

        <div>
          <FieldLabel label="From Date" />
          <input
            type="date"
            value={entry.startDate || ''}
            onChange={(e) => onChange(index, 'startDate', e.target.value)}
            className={inputClass(!!fieldErrors[`${prefix}.startDate`] || !!fieldErrors[`${prefix}.dateRange`])}
          />
          <FieldError message={fieldErrors[`${prefix}.startDate`]} />
        </div>

        <div>
          <FieldLabel label="End Date" />
          {entry.currentlyWorking ? (
            <div className={`${inputClass(false)} bg-gray-100 text-sm text-[#0F7A6E] flex items-center`}>
              Present
            </div>
          ) : (
            <input
              type="date"
              value={entry.endDate || ''}
              min={entry.startDate || undefined}
              onChange={(e) => onChange(index, 'endDate', e.target.value)}
              className={inputClass(!!fieldErrors[`${prefix}.endDate`] || !!fieldErrors[`${prefix}.dateRange`])}
            />
          )}
          <FieldError message={fieldErrors[`${prefix}.endDate`] || fieldErrors[`${prefix}.dateRange`]} />
        </div>

        <div className="md:col-span-2">
          <FieldLabel label="Job Responsibilities" />
          <textarea
            value={entry.responsibilities}
            onChange={(e) => onChange(index, 'responsibilities', e.target.value)}
            rows={2}
            className="block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="Brief responsibilities"
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel label="Reason for Leaving" />
          <input
            type="text"
            value={entry.reasonForLeaving}
            onChange={(e) => onChange(index, 'reasonForLeaving', e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2"
            disabled={!!entry.currentlyWorking}
            placeholder={entry.currentlyWorking ? 'N/A — currently working' : ''}
          />
        </div>
      </div>
    </div>
  );
}

function ScheduleStep({
  employmentType,
  schedule,
  onEmploymentTypeChange,
  onChange,
  onToggle,
  fieldErrors = {},
}) {
  const days = Object.keys(schedule);
  const isPartTime = employmentType === 'Part-Time';

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel label="Employment Type" required icon={<FiClock />} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
          {EMPLOYMENT_TYPE_OPTIONS.map((type) => {
            const selected = employmentType === type;
            return (
              <label
                key={type}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition ${
                  selected
                    ? 'border-[#159C8E] bg-[#e8f7f5] ring-1 ring-[#159C8E]'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="employmentType"
                  value={type}
                  checked={selected}
                  onChange={() => onEmploymentTypeChange(type)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium text-[#2c2e3e]">{type}</span>
                  <span className="block text-xs text-gray-600 mt-0.5">
                    {type === 'Full-Time'
                      ? 'Standard weekly schedule with full working hours.'
                      : 'Flexible days and shorter shifts as needed.'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {fieldErrors.employmentType ? (
          <p className="text-xs text-red-600 mt-1">{fieldErrors.employmentType}</p>
        ) : null}
      </div>

      <p className="text-sm text-gray-600">
        {isPartTime
          ? 'Select working days and set individual start/end times. Part-time shifts can be shorter than full-time. Mark unused days as Day Off.'
          : 'Set the weekly schedule for each day. Toggle Day Off for non-working days and set Start/End times for working days.'}
      </p>
      {fieldErrors.schedule ? (
        <p className="text-xs text-red-600">{fieldErrors.schedule}</p>
      ) : null}

      {days.map((day) => (
        <div
          key={day}
          className={`p-3 rounded-md border ${
            schedule[day].isLeave ? 'bg-gray-100' : isPartTime ? 'bg-amber-50' : 'bg-green-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={schedule[day].isLeave}
                onChange={(e) => onToggle(day, e.target.checked)}
              />
              <span className="font-medium">{day}</span>
            </label>
            <span className="text-xs text-gray-600">
              {schedule[day].isLeave ? 'Day Off' : 'Working'}
            </span>
          </div>
          {!schedule[day].isLeave && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                <input
                  type="time"
                  value={schedule[day].start}
                  onChange={(e) => onChange(day, 'start', e.target.value)}
                  className="w-full rounded-md border px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Time</label>
                <input
                  type="time"
                  value={schedule[day].end}
                  onChange={(e) => onChange(day, 'end', e.target.value)}
                  className="w-full rounded-md border px-2 py-1"
                />
              </div>
            </div>
          )}
          {fieldErrors[`schedule.${day}`] ? (
            <p className="text-xs text-red-600 mt-1">{fieldErrors[`schedule.${day}`]}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function BankDetails({ bankDetails, handleBankChange, fieldErrors }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Input
        label="Account Holder Name"
        name="accountHolderName"
        value={bankDetails.accountHolderName}
        onChange={handleBankChange}
        required
        error={fieldErrors.accountHolderName}
        placeholder="Name as per bank account"
      />
      <Input
        label="Bank Name"
        name="bankingName"
        value={bankDetails.bankingName}
        onChange={handleBankChange}
        required
        error={fieldErrors.bankingName}
        placeholder="e.g. HDFC Bank"
      />
      <Input
        label="Account Number"
        name="bankAccountNumber"
        value={bankDetails.bankAccountNumber}
        onChange={handleBankChange}
        required
        error={fieldErrors.bankAccountNumber}
        inputMode="numeric"
        maxLength={18}
        autoComplete="off"
        placeholder="9–18 digit account number"
      />
      <Input
        label="Confirm Account Number"
        name="confirmBankAccountNumber"
        value={bankDetails.confirmBankAccountNumber}
        onChange={handleBankChange}
        required
        error={fieldErrors.confirmBankAccountNumber}
        inputMode="numeric"
        maxLength={18}
        autoComplete="off"
        placeholder="Re-enter account number"
      />
      <Input
        label="IFSC Code"
        name="ifscCode"
        value={bankDetails.ifscCode}
        onChange={handleBankChange}
        required
        error={fieldErrors.ifscCode}
        maxLength={11}
        placeholder="e.g. HDFC0001234"
      />
      <Input
        label="Branch Name"
        name="branchName"
        value={bankDetails.branchName}
        onChange={handleBankChange}
        error={fieldErrors.branchName}
        placeholder="Bank branch name"
      />
      <div>
        <FieldLabel label="Account Type" required />
        <select
          name="accountType"
          value={bankDetails.accountType}
          onChange={handleBankChange}
          className={inputClass(!!fieldErrors.accountType)}
        >
          <option value="">Select Account Type</option>
          {ACCOUNT_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <FieldError message={fieldErrors.accountType} />
      </div>
      <Input
        label="UPI ID"
        name="upiId"
        value={bankDetails.upiId}
        onChange={handleBankChange}
        error={fieldErrors.upiId}
        placeholder="e.g. name@upi"
      />
    </div>
  );
}

const fileInputClass =
  'block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-[#159C8E] file:text-white hover:file:bg-[#0F7A6E]';

function DocumentUploadRow({ preview, accept, onFileChange, hint, selectedName, error }) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-4 items-start">
      <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
        {preview}
      </div>
      <div className="min-w-0 pt-1">
        <input
          type="file"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            const ok = onFileChange(file);
            // Clear picker if validation rejected the file
            if (ok === false) e.target.value = '';
          }}
          className={fileInputClass}
        />
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
        {selectedName ? (
          <p className="text-xs text-[#0F7A6E] mt-1 truncate">Selected: {selectedName}</p>
        ) : null}
        <FieldError message={error} />
      </div>
    </div>
  );
}

function DocumentsStep({ formData, handleChange, files, previews, onFileChange, fieldErrors }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Attach your profile photo, resume, and Aadhaar card. These are required for registration.
      </p>

      <div className={`rounded-xl border bg-white p-4 ${fieldErrors.profilePic ? 'border-red-500' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <FiImage className="text-[#159C8E]" />
          <h4 className="text-sm font-semibold text-[#2c2e3e]">1. Profile Picture <span className="text-red-600">*</span></h4>
        </div>
        <DocumentUploadRow
          preview={
            previews.profilePic ? (
              <img src={previews.profilePic} alt="Profile preview" className="w-full h-full object-cover" />
            ) : (
              <FiUser className="text-gray-400 text-2xl" />
            )
          }
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          onFileChange={(file) => onFileChange('profilePic', file)}
          hint="Profile photo only — JPG or PNG, max 2 MB"
          selectedName={files.profilePic?.name}
          error={fieldErrors.profilePic}
        />
      </div>

      <div className={`rounded-xl border bg-white p-4 ${fieldErrors.resume ? 'border-red-500' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <FiFileText className="text-[#159C8E]" />
          <h4 className="text-sm font-semibold text-[#2c2e3e]">2. Resume <span className="text-red-600">*</span></h4>
        </div>
        <DocumentUploadRow
          preview={<FiFileText className="text-gray-400 text-2xl" />}
          accept="application/pdf,.pdf"
          onFileChange={(file) => onFileChange('resume', file)}
          hint="Resume only — PDF file, max 5 MB"
          selectedName={files.resume?.name}
          error={fieldErrors.resume}
        />
      </div>

      <div className={`rounded-xl border bg-white p-4 ${fieldErrors.aadharCard ? 'border-red-500' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <FiCreditCard className="text-[#159C8E]" />
          <h4 className="text-sm font-semibold text-[#2c2e3e]">3. Aadhaar Card <span className="text-red-600">*</span></h4>
        </div>
        <DocumentUploadRow
          preview={<FiCreditCard className="text-gray-400 text-2xl" />}
          accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
          onFileChange={(file) => onFileChange('aadharCard', file)}
          hint="Aadhaar only — JPG, PNG or PDF, max 5 MB"
          selectedName={files.aadharCard?.name}
          error={fieldErrors.aadharCard}
        />
        <div className="mt-4">
          <FieldLabel label="Aadhaar Number" />
          <input
            type="text"
            name="aadharNumber"
            value={formData.aadharNumber}
            onChange={handleChange}
            placeholder="XXXX XXXX XXXX"
            className="block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>
    </div>
  );
}

function Review({ formData, files, previews }) {
  const workList = formData.isFresher
    ? []
    : (formData.workExperience || []).filter((e) => e.companyName || e.jobRole);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Review details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Stat label="Name" value={formData.name} />
        <Stat label="Email" value={formData.email} />
        <Stat label="Mobile Number" value={formData.phone} />
        <Stat label="Branch" value={formData.branch || '-'} />
        <Stat label="Blood Group" value={formData.bloodGroup || '-'} />
        <Stat label="Address" value={formData.address || '-'} />

        <Stat label="Position" value={formData.position} />
        <Stat label="Company" value={formData.company} />
        <Stat label="Department" value={formData.department || '-'} />
        <Stat label="Qualification" value={formData.qualification || '-'} />
        <Stat label="Date Of Joining" value={formData.dateOfJoining || '-'} />
        <Stat label="Employment Type" value={formData.employmentType || '-'} />
        <Stat label="Experience Type" value={formData.isFresher ? 'Fresher' : 'Experienced'} />
        <Stat label="Total Years Experience" value={formData.totalYearsOfExperience || '-'} />
        <Stat label="Roles" value={formData.rolesAndResponsibility || '-'} />
        <Stat label="Skills" value={formData.skills || '-'} />

        <div className="col-span-1 md:col-span-2 p-3 border rounded-md">
          <h4 className="font-medium mb-2">Weekly Schedule ({formData.employmentType || 'Full-Time'})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.keys(formData.schedule || {}).map((day) => {
              const daySch = formData.schedule[day] || {};
              return (
                <Stat
                  key={day}
                  label={day}
                  value={daySch.isLeave ? 'Day Off' : `${daySch.start || '—'} – ${daySch.end || '—'}`}
                />
              );
            })}
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 p-3 border rounded-md">
          <h4 className="font-medium mb-2">Work History</h4>
          {formData.isFresher ? (
            <p className="text-sm text-gray-600">Fresher — no company experience.</p>
          ) : workList.length === 0 ? (
            <p className="text-sm text-gray-600">No company experience entered.</p>
          ) : (
            <div className="space-y-2">
              {workList.map((e, i) => (
                <div key={i} className="text-sm border-t first:border-t-0 pt-2 first:pt-0">
                  <p className="font-medium">Company {i + 1}: {e.companyName || '—'}</p>
                  <p>Role: {e.jobRole || '—'}</p>
                  <p>
                    From: {formatDisplayDate(e.startDate)} — To:{' '}
                    {e.currentlyWorking ? 'Present' : formatDisplayDate(e.endDate)}
                  </p>
                  {e.responsibilities ? <p>Responsibilities: {e.responsibilities}</p> : null}
                  {e.reasonForLeaving && !e.currentlyWorking ? (
                    <p>Reason for leaving: {e.reasonForLeaving}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-1 md:col-span-2 p-3 border rounded-md">
          <h4 className="font-medium mb-2">Documents</h4>
          {previews.profilePic ? (
            <div className="mb-3">
              <img
                src={previews.profilePic}
                alt="Profile"
                className="w-14 h-14 rounded-full object-cover border"
              />
            </div>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Stat label="Profile" value={files.profilePic?.name || '-'} />
            <Stat label="Resume" value={files.resume?.name || '-'} />
            <Stat label="Aadhaar" value={files.aadharCard?.name || '-'} />
            <Stat label="Aadhaar No" value={formData.aadharNumber || '-'} />
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 p-3 border rounded-md">
          <h4 className="font-medium mb-2">Bank Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Stat label="Account Holder" value={formData.bankDetails.accountHolderName || '-'} />
            <Stat label="Bank" value={formData.bankDetails.bankingName || '-'} />
            <Stat label="Account" value={formData.bankDetails.bankAccountNumber || '-'} />
            <Stat label="IFSC" value={formData.bankDetails.ifscCode || '-'} />
            <Stat label="Branch" value={formData.bankDetails.branchName || '-'} />
            <Stat label="Account Type" value={formData.bankDetails.accountType || '-'} />
            <Stat label="UPI" value={formData.bankDetails.upiId || '-'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-2 border rounded-md">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  type = 'text',
  icon,
  required = false,
  error,
  inputMode,
  maxLength,
  pattern,
  autoComplete,
  placeholder,
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} icon={icon} />
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={inputClass(!!error)}
      />
      <FieldError message={error} />
    </div>
  );
}

function parseCommaList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Add many skills / roles one-by-one as tags (stored as comma-separated string). */
function TagListField({
  label,
  name,
  value,
  onChangeList,
  required = false,
  error,
  placeholder = 'Type and click Add',
}) {
  const [draft, setDraft] = useState('');
  const items = parseCommaList(value);

  const commitItems = (parts) => {
    const cleaned = [];
    parts.forEach((part) => {
      const t = String(part || '').trim();
      if (!t) return;
      if (cleaned.some((x) => x.toLowerCase() === t.toLowerCase())) return;
      cleaned.push(t);
    });
    onChangeList(cleaned.join(', '));
  };

  const addDraft = () => {
    const chunks = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!chunks.length) return;
    commitItems([...items, ...chunks]);
    setDraft('');
  };

  const removeAt = (index) => {
    commitItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="col-span-1 md:col-span-2">
      <FieldLabel label={label} required={required} />
      <div
        className={`rounded-xl border bg-white p-3 ${
          error ? 'border-red-400' : 'border-[#e0ecff]'
        }`}
      >
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {items.map((item, index) => (
              <span
                key={`${name}-${item}-${index}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#eef5ff] text-[#0b2d67] px-3 py-1 text-sm font-medium"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="text-[#64748b] hover:text-red-600 leading-none"
                  aria-label={`Remove ${item}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            name={name}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addDraft();
              }
            }}
            placeholder={placeholder}
            className={inputClass(false)}
          />
          <button
            type="button"
            onClick={addDraft}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0b2d67] text-white px-4 py-2 text-sm font-semibold hover:bg-[#071d44] whitespace-nowrap"
          >
            <FiPlus size={16} />
            Add
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Add one by one with Add / Enter. You can also paste several separated by commas.
        </p>
      </div>
      <FieldError message={error} />
    </div>
  );
}
