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

  // Exact byte copy — pdf-lib Uint8Array views can share a large buffer
  const src =
    pdfBytes instanceof Uint8Array
      ? pdfBytes
      : new Uint8Array(pdfBytes || []);
  if (!src.length) {
    throw new Error('PDF is empty — generate preview again before download');
  }
  const copy = new Uint8Array(src.byteLength);
  copy.set(src);

  const safeName = /\.pdf$/i.test(filename || '')
    ? filename
    : `${filename || 'letter'}.pdf`;

  // File (not bare Blob) keeps MIME as application/pdf for multer fileFilter
  const file =
    typeof File !== 'undefined'
      ? new File([copy], safeName, { type: 'application/pdf' })
      : new Blob([copy], { type: 'application/pdf' });

  const fd = new FormData();
  if (file instanceof File) {
    fd.append('letter', file);
  } else {
    fd.append('letter', file, safeName);
  }
  if (meta.candidateId) fd.append('candidateId', String(meta.candidateId));
  if (meta.candidateName) fd.append('candidateName', meta.candidateName);
  if (meta.letterName) fd.append('letterName', meta.letterName);
  if (meta.letterType) fd.append('letterType', meta.letterType);

  // Never set Content-Type manually — missing boundary breaks multer ("No file uploaded")
  const res = await axios.post(API_ENDPOINTS.uploadLetter, fd, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
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
