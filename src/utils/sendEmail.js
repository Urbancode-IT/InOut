import axios from 'axios';
import { API_ENDPOINTS } from './api';

/**
 * Convert a Uint8Array or ArrayBuffer to a Base64 string safely.
 */
export function uint8ArrayToBase64(bytes) {
  if (!bytes) return '';
  let binary = '';
  const uint8 = new Uint8Array(bytes);
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return window.btoa(binary);
}

/**
 * Send document / letter / payslip email with attached PDF.
 * @param {Object} params
 * @param {string} params.toEmail Recipient email address
 * @param {string} [params.subject] Email subject line
 * @param {string} [params.text] Email plain text body
 * @param {string} [params.html] Email HTML body
 * @param {string} [params.pdfBase64] Base64 string of the PDF
 * @param {Uint8Array|ArrayBuffer} [params.pdfBytes] Raw PDF bytes (converted if pdfBase64 not given)
 * @param {string} [params.filename] PDF filename (e.g. 'Experience_Letter.pdf')
 */
export async function sendDocumentEmailApi({
  toEmail,
  subject,
  text,
  html,
  pdfBase64,
  pdfBytes,
  filename,
}) {
  if (!toEmail || typeof toEmail !== 'string' || !toEmail.trim()) {
    throw new Error('Please enter a valid recipient email address');
  }

  let finalBase64 = pdfBase64 || '';
  if (!finalBase64 && pdfBytes) {
    finalBase64 = uint8ArrayToBase64(pdfBytes);
  }

  const token = localStorage.getItem('token');
  const response = await axios.post(
    API_ENDPOINTS.sendDocumentEmail,
    {
      toEmail: toEmail.trim(),
      subject: subject || 'Document / Letter from Urbancode',
      text: text || 'Please find attached your requested document.',
      html,
      pdfBase64: finalBase64,
      filename: filename || 'document.pdf',
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}
