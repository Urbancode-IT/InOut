import axios from 'axios';
import { API_ENDPOINTS } from './api';

/**
 * Upload PDF bytes to backend (Cloudinary + letterCopies metadata).
 * @param {Uint8Array|ArrayBuffer} pdfBytes
 * @param {string} filename
 * @param {string|object} [candidateIdOrMeta] - candidate user id, or meta object
 * @param {object} [maybeMeta] - optional meta when 3rd arg is candidateId
 */
export async function uploadLetterBytes(pdfBytes, filename, candidateIdOrMeta, maybeMeta) {
  const token = localStorage.getItem('token');
  const meta =
    candidateIdOrMeta && typeof candidateIdOrMeta === 'object'
      ? candidateIdOrMeta
      : { candidateId: candidateIdOrMeta, ...(maybeMeta || {}) };

  const file = new File([pdfBytes], filename, { type: 'application/pdf' });
  const fd = new FormData();
  fd.append('letter', file);
  if (meta.candidateId) fd.append('candidateId', meta.candidateId);
  if (meta.candidateName) fd.append('candidateName', meta.candidateName);
  if (meta.letterName) fd.append('letterName', meta.letterName);
  if (meta.letterType) fd.append('letterType', meta.letterType);

  const res = await axios.post(API_ENDPOINTS.uploadLetter, fd, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

/**
 * Fetch letter PDF via authenticated admin proxy (blob).
 */
export async function fetchAdminLetterBlob(url, filename, { inline = false } = {}) {
  const token = localStorage.getItem('token');
  const res = await axios.get(API_ENDPOINTS.downloadAdminLetter, {
    params: {
      url,
      filename: filename || 'letter.pdf',
      ...(inline ? { inline: '1' } : {}),
    },
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'blob',
    validateStatus: () => true,
  });

  const contentType = String(res.headers['content-type'] || '');
  if (res.status >= 400 || contentType.includes('application/json')) {
    let message = 'Failed to fetch letter PDF';
    try {
      const text = await res.data.text();
      const parsed = JSON.parse(text);
      if (parsed?.error) message = parsed.error;
    } catch (_) {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.data;
}

export async function downloadAdminLetter(url, filename) {
  const blob = await fetchAdminLetterBlob(url, filename, { inline: false });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename || 'letter.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

export async function viewAdminLetter(url, filename) {
  const blob = await fetchAdminLetterBlob(url, filename, { inline: true });
  const objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  return objectUrl;
}
