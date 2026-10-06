import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button
} from '@mui/material';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { toast } from 'react-toastify';
import letterheadUrl from '../../assets/letterhead.pdf';
import { shrinkLetterheadPhoneIconOnAllPages } from '../../utils/letterheadFooter';
import { sanitizeTextForStandardFonts } from '../../utils/pdfTextSanitizer';
import { sendDocumentEmailApi } from '../../utils/sendEmail';

const InternshipLetter = () => {
  // simple form (no candidate lookup) to support students
  const [form, setForm] = useState({
    salutation: 'Mr.',
    studentName: '',
    email: '',
    collegeName: '',
    address: '',
    registrationNumber: '',
    designation: 'Intern',
    company: '',
    duration: '',
    startDate: '',
    endDate: '',
    subject: 'Certificate of internship completion',
    directorName: 'Sivagaminathan chandran',
    directorTitle: 'Founder'
  });
  const [letterDate, setLetterDate] = useState(() => new Date().toISOString().slice(0, 10));

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(`${dateStr}T12:00:00`);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB');
    } catch {
      return dateStr;
    }
  };

  // Builds the certificate body from the current fields. College/address/registration
  // number are optional, so they're only stitched in when present, instead of
  // relying on {{#section}}...{{/section}} tags (those were never expanded by
  // replacePlaceholders and used to print literally on the certificate).
  const defaultBody = (f) => {
    const name = f.studentName || '';
    const salutation = f.salutation ? `${f.salutation} ` : '';
    const collegePart = f.collegeName ? `, of **${f.collegeName}**` : '';
    const addressPart = f.address ? `, ${f.address}` : '';
    const regPart = f.registrationNumber ? ` (Reg. No: **${f.registrationNumber}**)` : '';
    const subject = name || 'the intern';

    return `**To:**
${salutation}${name}

**Subject:** ${f.subject || 'Certificate of internship completion'}

This is to certify that **${name}**${collegePart}${addressPart}${regPart} has successfully completed an internship at **${f.company || ''}** in the role of **${f.designation || 'Intern'}** for a duration of ${f.duration || ''}, from **${formatDate(f.startDate)}** to **${formatDate(f.endDate)}**.

During the internship period, ${subject} was actively involved in the assigned tasks and responsibilities. The intern demonstrated a positive attitude, professional conduct, and a strong willingness to learn and adapt, showing sincere commitment toward understanding practical concepts and contributing responsibly to the work assigned during the training period.

Throughout the internship, ${subject} maintained discipline, punctuality, and effective communication, and worked well under guidance and supervision. Performance and behaviour during the internship period were found to be satisfactory.

This certificate is issued for ${subject} based only on their performance and may be used for academic, professional, or personal reference purposes.

We wish ${subject} every success in their future academic pursuits and professional career.

Sincerely,`;
  };

  const [body, setBody] = useState(defaultBody({
    salutation: 'Mr.', studentName: '', collegeName: '', address: '', registrationNumber: '', designation: 'Intern', company: '', duration: '', startDate: '', endDate: '', subject: 'Certificate of internship completion'
  }));
  const lastAutoBodyRef = useRef(body);

  // Keep the letter body in sync with the typed-in fields, unless the admin
  // has manually edited the body text away from the auto-generated version.
  useEffect(() => {
    const next = defaultBody(form);
    const previousAutoBody = lastAutoBodyRef.current;
    setBody(prev => (prev === previousAutoBody ? next : prev));
    lastAutoBodyRef.current = next;
  }, [
    form.salutation,
    form.studentName,
    form.collegeName,
    form.address,
    form.registrationNumber,
    form.designation,
    form.company,
    form.duration,
    form.startDate,
    form.endDate,
    form.subject
  ]);

  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBytesData, setPdfBytesData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signatureBytes, setSignatureBytes] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [sealFile, setSealFile] = useState(null);
  const [sealBytes, setSealBytes] = useState(null);
  const [sealPreview, setSealPreview] = useState(null);

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSignatureUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setSignatureFile(file);
    setSignaturePreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => setSignatureBytes(reader.result);
    reader.readAsArrayBuffer(file);
  };

  const handleSealUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setSealFile(file);
    setSealPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => setSealBytes(reader.result);
    reader.readAsArrayBuffer(file);
  };

  // simple placeholder replace, kept for admins who type {{tokens}} into a manually edited body
  const replacePlaceholders = (template, data) => {
    return template.replace(/{{\s*salutation\s*}}/gi, data.salutation || '')
      .replace(/{{\s*studentName\s*}}/gi, data.studentName || '')
      .replace(/{{\s*collegeName\s*}}/gi, data.collegeName || '')
      .replace(/{{\s*address\s*}}/gi, data.address || '')
      .replace(/{{\s*registrationNumber\s*}}/gi, data.registrationNumber || '')
      .replace(/{{\s*designation\s*}}/gi, data.designation || '')
      .replace(/{{\s*company\s*}}/gi, data.company || '')
      .replace(/{{\s*duration\s*}}/gi, data.duration || '')
      .replace(/{{\s*subject\s*}}/gi, data.subject || '')
      .replace(/{{\s*startDate\s*}}/gi, formatDate(data.startDate))
      .replace(/{{\s*endDate\s*}}/gi, formatDate(data.endDate));
  };

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const resp = await fetch(letterheadUrl);
      const arrayBuffer = await resp.arrayBuffer();
      const srcPdf = await PDFDocument.load(arrayBuffer);
      const pdfDoc = await PDFDocument.create();

      const [copiedFirst] = await pdfDoc.copyPages(srcPdf, [0]);
      pdfDoc.addPage(copiedFirst);
      const page = pdfDoc.getPage(0);
      const { width, height } = page.getSize();

      const margins = { top: 154, bottom: 146, left: 40, right: 40 };

      const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      let fontBold = fontRegular;
      try { fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold); } catch (e) {}

      // Title/bold color (#2b2b2b) and body color (#858585)
      const titleColor = rgb(53 / 255, 53 / 255, 53 / 255);
      const bodyColor = rgb(60 / 255, 60 / 255, 60 / 255);

      const contentTop = height - margins.top;
      const contentWidth = width - margins.left - margins.right;

      // date, right-aligned, no big centered title — the letter opens with To:/Subject: instead
      const fontDateSize = 10;
      let dateStr = '';
      try { dateStr = letterDate ? `Date: ${new Date(letterDate).toLocaleDateString('en-GB')}` : `Date: ${new Date().toLocaleDateString('en-GB')}`; } catch (e) { dateStr = `Date: ${new Date().toLocaleDateString('en-GB')}`; }
      const dateWidth = fontBold.widthOfTextAtSize(dateStr, fontDateSize);
      const dateX = margins.left + (contentWidth - dateWidth);
      const dateY = contentTop - fontDateSize;
      page.drawText(dateStr, { x: dateX, y: dateY, size: fontDateSize, font: fontBold, color: titleColor });

      // body drawing — shrink font to whatever fits so the certificate never spills onto a second page
      const letterSpacing = 0.2;
      const maxWidth = contentWidth;
      const bodyStartY = dateY - 26;
      const hasSignature = !!(signatureBytes && signatureFile);
      const hasSeal = !!(sealBytes && sealFile);
      // reserve room for the sign-off block, drawn separately below the wrapped body:
      // "Sincerely," + seal + signature + name + Founder
      const signOffReserve = 60 + (hasSeal ? 100 : 0) + (hasSignature ? 55 : 0);
      const maxBodyHeight = bodyStartY - margins.bottom - signOffReserve;

      const finalBodyFull = sanitizeTextForStandardFonts(replacePlaceholders(body, form), [fontRegular, fontBold]);
      const stripSignOffFromBody = (text) => {
        const lines = text.split('\n');
        const signOffIndex = lines.findIndex((line) => /^\s*(\*\*)?sincerely,?(\*\*)?\s*$/i.test(line.trim()));
        if (signOffIndex >= 0) return lines.slice(0, signOffIndex).join('\n').trimEnd();
        return text;
      };
      const finalBody = stripSignOffFromBody(finalBodyFull);
      const sourceLines = finalBody.split('\n');

      // **text** marks the important bits (name, dates, company) to be rendered bold
      const tokenizeLineForBold = (line) => {
        const parts = [];
        const pattern = /\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
          if (match.index > lastIndex) parts.push({ text: line.slice(lastIndex, match.index), bold: false });
          parts.push({ text: match[1], bold: true });
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < line.length) parts.push({ text: line.slice(lastIndex), bold: false });
        return parts;
      };

      const buildLayout = (fontSize) => {
        const lineHeight = fontSize + 2;
        const paragraphGap = 4;
        const spaceWidth = fontRegular.widthOfTextAtSize(' ', fontSize) + letterSpacing;
        const measureWord = (text, font = fontRegular) => font.widthOfTextAtSize(text, fontSize) + letterSpacing * Math.max(0, text.length - 1);

        const items = [];
        let totalHeight = 0;

        for (const rawLine of sourceLines) {
          const words = [];
          tokenizeLineForBold(rawLine).forEach((seg) => {
            seg.text.split(/\s+/).filter(Boolean).forEach((w) => words.push({ text: w, bold: seg.bold }));
          });
          let lineWords = [];
          let lineWidth = 0;

          const pushLine = () => {
            if (lineWords.length === 0) return;
            items.push({ words: lineWords });
            totalHeight += lineHeight;
            lineWords = []; lineWidth = 0;
          };

          for (const w of words) {
            const usedFont = w.bold ? fontBold : fontRegular;
            const wWidth = measureWord(w.text, usedFont);
            const extra = lineWords.length > 0 ? spaceWidth : 0;
            if (lineWidth + extra + wWidth > maxWidth) pushLine();
            lineWords.push(w);
            lineWidth = lineWidth + (lineWords.length > 1 ? spaceWidth : 0) + wWidth;
          }
          pushLine();
          items.push({ gap: paragraphGap });
          totalHeight += paragraphGap;
        }

        return { items, totalHeight, lineHeight, fontSize, spaceWidth, measureWord };
      };

      let layout = buildLayout(12);
      for (let size = 11.5; size >= 6.5 && layout.totalHeight > maxBodyHeight; size -= 0.5) {
        layout = buildLayout(size);
      }

      let cursorY = bodyStartY;
      for (const item of layout.items) {
        if (item.gap !== undefined) { cursorY -= item.gap; continue; }
        let x = margins.left;
        for (let i = 0; i < item.words.length; i++) {
          const w = item.words[i];
          const usedFont = w.bold ? fontBold : fontRegular;
          const usedColor = w.bold ? titleColor : bodyColor;
          let cx = x;
          for (let ci = 0; ci < w.text.length; ci++) {
            const ch = w.text[ci];
            page.drawText(ch, { x: cx, y: cursorY, size: layout.fontSize, font: usedFont, color: usedColor });
            const cw = usedFont.widthOfTextAtSize(ch, layout.fontSize);
            cx += cw + letterSpacing;
          }
          const wWidth = layout.measureWord(w.text, usedFont);
          x += wWidth; if (i !== item.words.length - 1) x += layout.spaceWidth;
        }
        cursorY -= layout.lineHeight;
      }

      // Sign-off block, drawn right after the wrapped body: Sincerely -> Seal -> Signature -> Name -> Founder
      let signY = cursorY - 4;
      page.drawText('Sincerely,', { x: margins.left, y: signY, size: layout.fontSize, font: fontRegular, color: bodyColor });
      signY -= layout.lineHeight + 4;

      if (hasSeal) {
        try {
          const sealUint8 = new Uint8Array(sealBytes);
          const mime = sealFile.type || '';
          const embeddedSeal = mime.includes('png') ? await pdfDoc.embedPng(sealUint8) : await pdfDoc.embedJpg(sealUint8);
          const maxSealWidth = 100; const maxSealHeight = 100;
          const origW = embeddedSeal.width || 1; const origH = embeddedSeal.height || 1;
          const scale = Math.min(1, maxSealWidth / origW, maxSealHeight / origH);
          const sealDims = embeddedSeal.scale(scale);

          page.drawImage(embeddedSeal, { x: margins.left, y: signY - sealDims.height, width: sealDims.width, height: sealDims.height });
          signY -= sealDims.height + 4;
        } catch (sealErr) {
          console.error('Seal embed error', sealErr);
        }
      }

      if (hasSignature) {
        try {
          const sigUint8 = new Uint8Array(signatureBytes);
          const mime = signatureFile.type || '';
          const embeddedSig = mime.includes('png') ? await pdfDoc.embedPng(sigUint8) : await pdfDoc.embedJpg(sigUint8);
          const maxSigWidth = 120; const maxSigHeight = 48;
          const origW = embeddedSig.width || 1; const origH = embeddedSig.height || 1;
          const scale = Math.min(1, maxSigWidth / origW, maxSigHeight / origH);
          const sigDims = embeddedSig.scale(scale);

          page.drawImage(embeddedSig, { x: margins.left, y: signY - sigDims.height, width: sigDims.width, height: sigDims.height });
          signY -= sigDims.height + 6;
        } catch (sigErr) {
          console.error('Signature embed error', sigErr);
          signY -= layout.lineHeight + 6;
        }
      } else {
        signY -= 6;
      }

      // Signatory name (bold), then designation (normal weight) — no company/email/phone, the letterhead footer already carries those
      page.drawText(form.directorName || '', { x: margins.left, y: signY, size: layout.fontSize, font: fontBold, color: titleColor });
      signY -= layout.lineHeight;

      page.drawText(form.directorTitle || '', { x: margins.left, y: signY, size: layout.fontSize, font: fontRegular, color: bodyColor });

      await shrinkLetterheadPhoneIconOnAllPages(pdfDoc);
      const pdfBytes = await pdfDoc.save();
      setPdfBytesData(pdfBytes);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setPdfUrl(URL.createObjectURL(blob));
      return pdfBytes;
    } catch (err) { console.error('PDF generation error', err); toast.error('Failed: Failed to generate PDF. See console for details.'); return null; } finally { setGenerating(false); }
  };

  const [sendingMail, setSendingMail] = useState(false);

  const handleSendMail = async () => {
    if (!form.email || !form.email.trim()) {
      toast.warning('Please enter a recipient email ID.');
      return;
    }
    setSendingMail(true);
    try {
      let bytes = pdfBytesData;
      if (!bytes) {
        bytes = await generatePdf();
      }
      if (!bytes) {
        toast.error('Could not generate PDF for email.');
        return;
      }
      await sendDocumentEmailApi({
        toEmail: form.email.trim(),
        subject: `Internship Certificate - ${form.studentName || 'Student'}`,
        text: `Dear ${form.studentName || 'Student'},\n\nPlease find attached your Internship Certificate from ${form.company || 'Urbancode'}.\n\nRegards,\nAdmin Team\nUrbancode Edutech Solutions Pvt. Ltd.`,
        pdfBytes: bytes,
        filename: `${form.studentName || 'internship-certificate'}.pdf`,
      });
      toast.success(`Internship Certificate sent successfully to ${form.email.trim()}`);
    } catch (err) {
      console.error('Failed to send mail:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to send email');
    } finally {
      setSendingMail(false);
    }
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const uploadAndDownload = async () => {
      try {
        if (pdfBytesData) {
          const token = localStorage.getItem('token');
          const file = new File([pdfBytesData], `${form.studentName || 'internship-certificate'}.pdf`, { type: 'application/pdf' });
          const { uploadLetterBytes } = await import('../../utils/uploadLetter');
          await uploadLetterBytes(pdfBytesData, `${form.studentName || 'internship-certificate'}.pdf`);
          toast.success('Saved: Letter uploaded to cloud');
        }
      } catch (err) {
        console.error('Upload failed', err);
      } finally {
        const a = document.createElement('a'); a.href = pdfUrl; a.download = `${form.studentName || 'internship-certificate'}.pdf`; a.click();
      }
    };
    uploadAndDownload();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Internship Certificate</Typography>
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Box sx={{ flex: 1 }}>
          <TextField label="Salutation (Mr./Ms./Dr.)" fullWidth sx={{ mb: 2 }} value={form.salutation} onChange={(e) => handleChange('salutation', e.target.value)} />
          <TextField label="Student Name" fullWidth sx={{ mb: 2 }} value={form.studentName} onChange={(e) => handleChange('studentName', e.target.value)} />
          <TextField label="Recipient Email ID" type="email" fullWidth sx={{ mb: 2 }} value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="Enter student email address" />
          <TextField label="College Name (optional)" fullWidth sx={{ mb: 2 }} value={form.collegeName} onChange={(e) => handleChange('collegeName', e.target.value)} />
          <TextField label="Address (optional)" fullWidth sx={{ mb: 2 }} value={form.address} onChange={(e) => handleChange('address', e.target.value)} />
          <TextField label="Registration Number (optional)" fullWidth sx={{ mb: 2 }} value={form.registrationNumber} onChange={(e) => handleChange('registrationNumber', e.target.value)} />
          <TextField label="Designation / Role" fullWidth sx={{ mb: 2 }} value={form.designation} onChange={(e) => handleChange('designation', e.target.value)} />
          <TextField label="Company" fullWidth sx={{ mb: 2 }} value={form.company} onChange={(e) => handleChange('company', e.target.value)} />
          <TextField label="Duration (e.g. 3 months)" fullWidth sx={{ mb: 2 }} value={form.duration} onChange={(e) => handleChange('duration', e.target.value)} />
          <TextField label="Start Date" type="date" fullWidth sx={{ mb: 2 }} value={form.startDate} onChange={(e) => handleChange('startDate', e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="End Date" type="date" fullWidth sx={{ mb: 2 }} value={form.endDate} onChange={(e) => handleChange('endDate', e.target.value)} InputLabelProps={{ shrink: true }} />

          <TextField label="Subject" fullWidth sx={{ mb: 2 }} value={form.subject} onChange={(e) => handleChange('subject', e.target.value)} />
          <TextField label="Letter Date" type="date" fullWidth sx={{ mb: 2 }} value={letterDate} onChange={(e) => setLetterDate(e.target.value)} InputLabelProps={{ shrink: true }} />

          <TextField label="Director Name" fullWidth sx={{ mb: 2 }} value={form.directorName} onChange={(e) => handleChange('directorName', e.target.value)} />
          <TextField label="Director Title" fullWidth sx={{ mb: 2 }} value={form.directorTitle} onChange={(e) => handleChange('directorTitle', e.target.value)} />

          <TextField label="Letter Body" multiline minRows={8} fullWidth value={body} onChange={(e) => setBody(e.target.value)} sx={{ mb: 2 }} helperText="Add an extra paragraph here manually (e.g. a full-time job offer) for candidates who need one." />

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Signature (upload PNG/JPG)</Typography>
            <input type="file" accept="image/*" onChange={handleSignatureUpload} />
            {signaturePreview && (<Box sx={{ mt: 1 }}><img src={signaturePreview} alt="signature preview" style={{ maxWidth: 200, maxHeight: 80 }} /></Box>)}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Company Seal (upload PNG/JPG)</Typography>
            <input type="file" accept="image/*" onChange={handleSealUpload} />
            {sealPreview && (<Box sx={{ mt: 1 }}><img src={sealPreview} alt="seal preview" style={{ maxWidth: 120, maxHeight: 120 }} /></Box>)}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={generatePdf} disabled={generating}>{generating ? 'Generating...' : 'Generate Preview'}</Button>
            <Button variant="outlined" onClick={downloadPdf} disabled={!pdfUrl}>Download PDF</Button>
            <Button variant="contained" color="secondary" onClick={handleSendMail} disabled={sendingMail} sx={{ backgroundColor: '#0b2d67', '&:hover': { backgroundColor: '#071d44' } }}>
              {sendingMail ? 'Sending...' : 'Send Mail'}
            </Button>
          </Box>
        </Box>

        <Box sx={{ width: 420, minHeight: 553, border: '1px solid #eee' }}>
          {pdfUrl ? (<iframe title="Preview" src={pdfUrl} width="100%" height="553px" />) : (<Box sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">Preview will appear here after generating.</Typography></Box>)}
        </Box>
      </Box>
    </Container>
  );
};

export default InternshipLetter;
