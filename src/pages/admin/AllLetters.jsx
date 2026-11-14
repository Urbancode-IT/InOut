import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../../utils/api';
import { downloadAdminLetter, fetchAdminLetterBlob } from '../../utils/uploadLetter';
import {
  Box,
  Container,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material';
import { FiDownload, FiEye, FiEdit2 } from 'react-icons/fi';

const LETTER_EDIT_ROUTES = {
  offer: '/letter-generator',
  experience: '/letter-generator',
  relieving: '/letter-generator',
  'internship-offer': '/letter-generator',
  internship: '/letter-generator',
  uploaded: '/upload-documents',
};

const LETTER_TYPE_LABELS = {
  offer: 'Offer Letter',
  experience: 'Experience Letter',
  relieving: 'Relieving Letter',
  'internship-offer': 'Internship Offer Letter',
  internship: 'Internship Certificate',
  uploaded: 'Uploaded Document',
};

const isGenericLetterLabel = (value) => {
  const v = String(value || '')
    .trim()
    .replace(/\.pdf$/i, '');
  return (
    !v ||
    /^file$/i.test(v) ||
    /^letter$/i.test(v) ||
    /^unknown([_\s-]?letter)?$/i.test(v)
  );
};

const inferLetterType = (...parts) => {
  const hay = parts
    .filter(Boolean)
    .map((p) => String(p).toLowerCase())
    .join(' ');
  if (!hay) return '';
  if (/internship[_\s-]*offer/.test(hay)) return 'internship-offer';
  if (
    /internship[_\s-]*(certificate|completion|letter)/.test(hay) ||
    /certificate[_\s-]*of[_\s-]*internship/.test(hay)
  ) {
    return 'internship';
  }
  if (/experience/.test(hay)) return 'experience';
  if (/relieving/.test(hay)) return 'relieving';
  if (/\boffer\b/.test(hay) || /offer[_\s-]*letter/.test(hay)) return 'offer';
  return '';
};

const titleCaseLetterLabel = (value) =>
  String(value || '')
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const AllLetters = () => {
  const navigate = useNavigate();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [preview, setPreview] = useState({ open: false, url: '', title: '' });

  useEffect(() => {
    const fetchLetters = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(API_ENDPOINTS.getAdminLetters, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLetters(res.data || []);
      } catch (err) {
        console.error('Failed to fetch letters', err);
        toast.error('Failed to load uploaded letters');
      } finally {
        setLoading(false);
      }
    };
    fetchLetters();
  }, []);

  useEffect(() => {
    return () => {
      if (preview.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview.url]);

  const filtered = letters.filter((l) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return (
      (l.userName && l.userName.toLowerCase().includes(q)) ||
      (l.candidateName && l.candidateName.toLowerCase().includes(q)) ||
      (l.filename && l.filename.toLowerCase().includes(q)) ||
      (l.letterName && l.letterName.toLowerCase().includes(q)) ||
      (l.userEmail && l.userEmail.toLowerCase().includes(q))
    );
  });

  const rowKey = (l, idx) => `${l.url || ''}-${l.uploadedAt || ''}-${idx}`;

  // Offer / letter person name (API prefers letter → offer details → account name)
  const displayName = (l) => {
    const fromLetter = String(l.candidateName || '').trim();
    if (fromLetter) return fromLetter;
    const mapped = String(l.userName || '').trim();
    if (mapped) return mapped;
    const account = String(l.accountName || '').trim();
    if (account) return account;
    return '—';
  };

  // Exact letter type title (Offer Letter, Experience Letter, ...)
  const displayFilename = (l) => {
    const typeKey =
      String(l.letterType || '').toLowerCase() ||
      inferLetterType(l.letterName, l.filename, l.url);
    const typeLabel = LETTER_TYPE_LABELS[typeKey];

    const fromMeta = String(l.letterName || '').trim().replace(/\.pdf$/i, '');
    if (fromMeta && !isGenericLetterLabel(fromMeta)) {
      if (/letter|certificate|document/i.test(fromMeta)) {
        return titleCaseLetterLabel(fromMeta);
      }
      if (typeLabel) return typeLabel;
      return titleCaseLetterLabel(fromMeta);
    }

    if (typeLabel) return typeLabel;

    const fromFile = String(l.filename || '').trim().replace(/\.pdf$/i, '');
    if (fromFile && !isGenericLetterLabel(fromFile)) {
      const inferred = inferLetterType(fromFile);
      if (inferred && LETTER_TYPE_LABELS[inferred]) return LETTER_TYPE_LABELS[inferred];
      if (/letter|certificate|document/i.test(fromFile)) {
        return titleCaseLetterLabel(fromFile);
      }
    }

    const inferredUrl = inferLetterType(l.url);
    if (inferredUrl && LETTER_TYPE_LABELS[inferredUrl]) {
      return LETTER_TYPE_LABELS[inferredUrl];
    }

    // Legacy rows were mostly offer letters uploaded as generic "file"
    return 'Offer Letter';
  };

  const handleView = async (l, idx) => {
    const key = `view-${rowKey(l, idx)}`;
    setBusyKey(key);
    try {
      const fname = displayFilename(l);
      const blob = await fetchAdminLetterBlob(
        l.url,
        /\.pdf$/i.test(fname) ? fname : `${fname}.pdf`,
        { inline: true }
      );
      if (preview.url) URL.revokeObjectURL(preview.url);
      const objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setPreview({
        open: true,
        url: objectUrl,
        title: `${displayFilename(l)} — ${displayName(l)}`,
      });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Unable to open letter PDF');
    } finally {
      setBusyKey('');
    }
  };

  const handleDownload = async (l, idx) => {
    const key = `dl-${rowKey(l, idx)}`;
    setBusyKey(key);
    try {
      const name = displayFilename(l);
      await downloadAdminLetter(l.url, /\.pdf$/i.test(name) ? name : `${name}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Download failed');
    } finally {
      setBusyKey('');
    }
  };

  const handleEdit = (l) => {
    const type = String(l.letterType || '').toLowerCase();
    const route = LETTER_EDIT_ROUTES[type] || '/letter-generator';
    const params = new URLSearchParams();
    if (route === '/letter-generator') {
      // Lazy import avoided — map letterType to hub template id inline
      const templateByType = {
        offer: 'standard-offer',
        experience: 'experience',
        relieving: 'relieving',
        'internship-offer': 'internship-offer',
        internship: 'internship-certificate',
      };
      let templateId = templateByType[type] || 'standard-offer';
      if (type === 'offer') {
        const hay = [l.letterName, l.filename, l.url]
          .filter(Boolean)
          .map((p) => String(p).toLowerCase())
          .join(' ');
        if (/consultant/.test(hay)) templateId = 'consultant-offer';
      }
      params.set('template', templateId);
    }
    if (l.userId) params.set('userId', l.userId);
    if (l.candidateName || l.userName) params.set('candidateName', l.candidateName || l.userName);
    if (l.userEmail) params.set('email', l.userEmail);
    navigate(`${route}?${params.toString()}`);
  };

  const closePreview = () => {
    if (preview.url) URL.revokeObjectURL(preview.url);
    setPreview({ open: false, url: '', title: '' });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        All Uploaded Letters
      </Typography>

      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Search by user, filename or email"
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Filename</TableCell>
              <TableCell>Uploaded At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((l, idx) => {
              const key = rowKey(l, idx);
              return (
                <TableRow key={key}>
                  <TableCell>{displayName(l)}</TableCell>
                  <TableCell>{l.userEmail}</TableCell>
                  <TableCell>{displayFilename(l)}</TableCell>
                  <TableCell>
                    {l.uploadedAt ? new Date(l.uploadedAt).toLocaleString() : ''}
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        flexWrap: 'nowrap',
                      }}
                    >
                      <Tooltip title="View">
                        <span>
                          <IconButton
                            onClick={() => handleView(l, idx)}
                            disabled={!!busyKey}
                            title="View"
                            size="small"
                            sx={{ p: 1 }}
                          >
                            {busyKey === `view-${key}` ? (
                              <CircularProgress size={18} />
                            ) : (
                              <FiEye size={18} />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Edit / Regenerate">
                        <IconButton
                          onClick={() => handleEdit(l)}
                          title="Edit"
                          size="small"
                          sx={{ p: 1 }}
                        >
                          <FiEdit2 size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download PDF">
                        <span>
                          <IconButton
                            onClick={() => handleDownload(l, idx)}
                            disabled={!!busyKey}
                            title="Download"
                            size="small"
                            sx={{ p: 1 }}
                          >
                            {busyKey === `dl-${key}` ? (
                              <CircularProgress size={18} />
                            ) : (
                              <FiDownload size={18} />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No letters found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={preview.open}
        onClose={closePreview}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 520, md: 560 },
            maxWidth: { xs: '100%', sm: 560 },
            height: { xs: '100%', sm: '94vh' },
            maxHeight: { xs: '100%', sm: '94vh' },
            m: { xs: 0, sm: 1.5 },
            borderRadius: { xs: 0, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            flexShrink: 0,
            py: 1.5,
            px: 2.5,
            fontSize: '1.05rem',
            fontWeight: 600,
          }}
        >
          {preview.title || 'Letter preview'}
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            p: 0,
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            bgcolor: '#525659',
          }}
        >
          {preview.url ? (
            <Box
              component="iframe"
              title="Letter preview"
              src={`${preview.url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              sx={{
                display: 'block',
                border: 0,
                width: '100%',
                height: '100%',
              }}
            />
          ) : null}
        </DialogContent>
        <DialogActions sx={{ flexShrink: 0, px: 2.5, py: 1.5, gap: 1 }}>
          <Button
            onClick={() => {
              if (preview.url) window.open(preview.url, '_blank', 'noopener,noreferrer');
            }}
          >
            Open in new tab
          </Button>
          <Button onClick={closePreview} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AllLetters;
