import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import { API_ENDPOINTS } from '../../../utils/api';
import OfferLetters from '../OfferLetters';
import ExperienceLetter from '../ExperienceLetter';
import RelievingLetter from '../RelievingLetter';
import InternshipOfferLetter from '../InternshipOfferLetter';
import InternshipLetter from '../InternshipLetter';
import {
  LETTER_TEMPLATES,
  getLetterTemplateById,
  LETTER_TEMPLATE_IDS,
} from './letterTemplates';

const LetterGenerator = () => {
  const [searchParams] = useSearchParams();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState(LETTER_TEMPLATE_IDS.STANDARD_OFFER);
  const [selectedUserId, setSelectedUserId] = useState('');
  const onboardingMode = searchParams.get('onboarding') === '1';
  const pendingRegistrationId = searchParams.get('pendingId') || '';

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(API_ENDPOINTS.getUsers, {
          headers: { Authorization: `Bearer ${token}` },
        });
        let list = (res.data || []).filter((u) => u.role === 'employee');
        // Standalone hub: active employees. Onboarding: also include pending-activation.
        if (!onboardingMode) {
          list = list.filter((u) => u.isActive);
        } else {
          list = list.filter((u) => u.isActive || u.activationStatus === 'Pending Activation' || u.isActive === false);
        }
        setCandidates(list);

        // Ensure deep-linked onboarding user is present even if filtered oddly
        const deepUserId = searchParams.get('userId');
        if (deepUserId && !list.some((u) => String(u._id) === String(deepUserId))) {
          try {
            const one = await axios.get(API_ENDPOINTS.getUserById(deepUserId), {
              headers: { Authorization: `Bearer ${token}` },
            });
            const full = one.data?.user || one.data;
            if (full && full._id) {
              setCandidates((prev) =>
                prev.some((u) => String(u._id) === String(full._id))
                  ? prev
                  : [full, ...prev]
              );
            }
          } catch (_) {
            /* ignore */
          }
        }
      } catch (err) {
        console.error('Failed to fetch employees', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, [onboardingMode, searchParams]);

  // Prefill from All Letters → Edit / deep links
  useEffect(() => {
    const tpl = searchParams.get('template');
    const userId = searchParams.get('userId');
    if (tpl && LETTER_TEMPLATES.some((t) => t.id === tpl)) {
      setTemplateId(tpl);
    }
    if (userId) setSelectedUserId(userId);
  }, [searchParams]);

  const template = useMemo(
    () => getLetterTemplateById(templateId),
    [templateId]
  );

  const embedProps = {
    embedded: true,
    forcedTemplate: template.forcedOfferPreset || null,
    externalCandidateId: selectedUserId || null,
    onboardingMode,
    pendingRegistrationId,
  };

  const renderLetterForm = () => {
    // Remount only when template changes so body/title reset to that preset
    const key = `${template.id}-${selectedUserId || 'none'}-${onboardingMode ? 'onb' : 'std'}`;
    switch (template.componentKey) {
      case 'offer':
        return (
          <OfferLetters
            key={key}
            {...embedProps}
            forcedTemplate={template.forcedOfferPreset}
          />
        );
      case 'experience':
        return <ExperienceLetter key={key} {...embedProps} />;
      case 'relieving':
        return <RelievingLetter key={key} {...embedProps} />;
      case 'internshipOffer':
        return <InternshipOfferLetter key={key} {...embedProps} />;
      case 'internshipCertificate':
        return <InternshipLetter key={key} {...embedProps} />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Generate Letter
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select a letter template and employee. Available details fill automatically;
        enter only missing fields, then generate preview / download.
      </Typography>
      {onboardingMode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Registration onboarding mode: employee details are auto-filled from the
          registration. Edit offer-specific fields, generate the PDF, preview, then
          send. The employee account stays inactive until they accept the offer.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 3,
        }}
      >
        <FormControl fullWidth>
          <InputLabel id="letter-template-hub-label">Letter Template</InputLabel>
          <Select
            labelId="letter-template-hub-label"
            value={templateId}
            label="Letter Template"
            onChange={(e) => {
              setTemplateId(e.target.value);
            }}
          >
            {LETTER_TEMPLATES.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="employee-hub-label">Employee</InputLabel>
          <Select
            labelId="employee-hub-label"
            value={selectedUserId}
            label="Employee"
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={loading}
          >
            <MenuItem value="">
              {template.employeeRequired
                ? '-- Select employee --'
                : '-- Optional (or enter manually) --'}
            </MenuItem>
            {loading ? (
              <MenuItem disabled>
                <em>Loading...</em>
              </MenuItem>
            ) : (
              candidates.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.name} — {c.position || ''}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Box>

      {template.employeeRequired && !selectedUserId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Select an employee to auto-fill available details for{' '}
          <strong>{template.label}</strong>. You can still edit any field before
          generating.
        </Alert>
      )}

      {loading ? (
        <CircularProgress />
      ) : (
        <Box>{renderLetterForm()}</Box>
      )}
    </Container>
  );
};

export default LetterGenerator;
