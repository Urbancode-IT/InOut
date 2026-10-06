import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Typography, TextField, Button, FormControl, InputLabel, Select, MenuItem, CircularProgress, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { toast } from 'react-toastify';
import letterheadUrl from '../../assets/letterhead.pdf';
import { shrinkLetterheadPhoneIconOnAllPages } from '../../utils/letterheadFooter';
import { sanitizeTextForStandardFonts } from '../../utils/pdfTextSanitizer';
import { sendDocumentEmailApi } from '../../utils/sendEmail';
import axios from 'axios';
import { API_ENDPOINTS } from '../../utils/api';

const SIGNATORY_NAME = 'Sivagaminathan';
const SIGNATORY_TITLE = 'Founder';
const COMPANY_EMAIL = 'admin@urbancode.in';
const COMPANY_PHONE = '+91 98787 98797';

const InternshipOfferLetter = () => {
  const [form, setForm] = useState({
    candidateName: '',
    email: '',
    addressLine1: '',
    location: '',
    country: '',
    collegeName: '',
    designation: 'Full Stack Web Development',
    company: '',
    duration: '',
    joiningDate: ''
  });

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');

  const [titleText, setTitleText] = useState('INTERNSHIP OFFER LETTER');
  const [letterDate, setLetterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBytesData, setPdfBytesData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signatureBytes, setSignatureBytes] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);

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

  const formatLongDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(`${dateStr}T12:00:00`);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const defaultBody = (f) => `To,
Name: **${f.candidateName || ''}**

Subject: Offer of Internship - ${f.designation || 'Full Stack Web Development'}

Dear **${f.candidateName || ''}**,

We are delighted to offer you an internship opportunity with **${f.company || ''}** in the domain of ${f.designation || 'Full Stack Web Development'} for a duration of ${f.duration || ''} commencing from **${formatLongDate(f.joiningDate)}**.

This internship has been designed to provide practical industry exposure and hands-on learning experiences that complement your academic and technical development. Throughout the internship period, you will engage in real-world projects, guided assignments, technical workshops, and skill-enhancement activities aligned with current industry standards and practices.

As an intern, you will be expected to demonstrate professionalism, maintain confidentiality where required, adhere to organizational policies, actively participate in assigned tasks, and complete project deliverables within the stipulated timelines.

This internship serves as a valuable learning opportunity to strengthen your technical competencies, problem-solving abilities, and professional skills in a collaborative and innovation-driven environment.

Please note that this internship is intended for educational and skill development purposes and does not constitute an offer of employment. However, candidates who consistently demonstrate outstanding performance, technical excellence, commitment, and professionalism during the internship may be considered for future employment opportunities with **${f.company || ''}**, subject to organizational requirements and position availability.

We are excited to welcome you to the **${f.company || ''}** learning ecosystem and look forward to supporting your professional growth and career development.

We wish you a rewarding, productive, and successful internship experience.

Warm Regards,
For **${f.company || ''}**
Authorized Signatory`;

  const [body, setBody] = useState(defaultBody(form));
  const lastAutoBodyRef = useRef(body);

  // Keep the letter body in sync with the typed-in fields, unless the admin
  // has manually edited the body text away from the auto-generated version.
  useEffect(() => {
    const next = defaultBody(form);
    const previousAutoBody = lastAutoBodyRef.current;
    setBody(prev => (prev === previousAutoBody ? next : prev));
    lastAutoBodyRef.current = next;
  }, [
    form.candidateName,
    form.addressLine1,
    form.location,
    form.country,
    form.collegeName,
    form.designation,
    form.company,
    form.duration,
    form.joiningDate
  ]);

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

      const margins = { top: 143, bottom: 146, left: 40, right: 10 };

      const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      let fontBold = fontRegular;
      try { fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold); } catch (e) {}

      // Colors aligned with other letters
      const titleColor = rgb(53 / 255, 53 / 255, 53 / 255);
      const bodyColor = rgb(60 / 255, 60 / 255, 60 / 255);

      const contentTop = height - margins.top;
      const contentWidth = width - margins.left - margins.right;

      // date
      const fontDateSize = 10;
      const dateStr = letterDate ? new Date(letterDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB');
      const dateWidth = fontBold.widthOfTextAtSize(dateStr, fontDateSize);
      const dateX = margins.left + (contentWidth - dateWidth);
      const dateY = contentTop - fontDateSize;
      page.drawText(dateStr, { x: dateX, y: dateY, size: fontDateSize, font: fontBold, color: titleColor });

      // title
      const titleSize = 16;
      const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
      const titleX = margins.left + (contentWidth - titleWidth) / 2;
      const titleY = contentTop - titleSize - 6;
      page.drawText(titleText, { x: titleX, y: titleY, size: titleSize, font: fontBold, color: titleColor });

      // body drawing — shrink font to whatever fits so the letter never spills onto a second page
      const letterSpacing = 0.2;
      const maxWidth = contentWidth;
      const bodyStartY = titleY - 14;
      const hasSignature = !!(signatureBytes && signatureFile);
      // reserve room for the sign-off block, which is drawn separately below the wrapped body:
      // "Warm Regards," + signature + name + Founder + company + email + phone
      const signOffReserve = hasSignature ? 175 : 115;
      const maxBodyHeight = bodyStartY - margins.bottom - signOffReserve;

      // allow placeholders in the body like {{studentName}} and also respect manual edits
      const finalBodyFull = sanitizeTextForStandardFonts(replacePlaceholders(body, form), [fontRegular, fontBold]);
      const stripSignOffFromBody = (text) => {
        const lines = text.split('\n');
        const signOffIndex = lines.findIndex((line) => /^\s*(\*\*)?warm\s+regards?,?(\*\*)?\s*$/i.test(line.trim()));
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

      // Sign-off block, drawn right after the wrapped body: Warm Regards -> Signature -> For Company -> Authorized Signatory
      let signY = cursorY - 4;
      page.drawText('Warm Regards,', { x: margins.left, y: signY, size: layout.fontSize, font: fontRegular, color: bodyColor });
      signY -= layout.lineHeight + 4;

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

      // Signatory name (bold), then designation, company, and contact details (normal weight)
      page.drawText(SIGNATORY_NAME, { x: margins.left, y: signY, size: layout.fontSize, font: fontBold, color: titleColor });
      signY -= layout.lineHeight;

      page.drawText(SIGNATORY_TITLE, { x: margins.left, y: signY, size: layout.fontSize, font: fontRegular, color: bodyColor });
      signY -= layout.lineHeight;

      const companyName = form.company?.trim() || '';
      if (companyName) {
        page.drawText(companyName, { x: margins.left, y: signY, size: layout.fontSize, font: fontRegular, color: bodyColor });
        signY -= layout.lineHeight;
      }

      page.drawText(COMPANY_EMAIL, { x: margins.left, y: signY, size: layout.fontSize, font: fontRegular, color: bodyColor });
      signY -= layout.lineHeight;

      page.drawText(`Phone: ${COMPANY_PHONE}`, { x: margins.left, y: signY, size: layout.fontSize, font: fontRegular, color: bodyColor });

  await shrinkLetterheadPhoneIconOnAllPages(pdfDoc);
  const pdfBytes = await pdfDoc.save();
  setPdfBytesData(pdfBytes);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  setPdfUrl(URL.createObjectURL(blob));
  return pdfBytes;
    } catch (err) {
      console.error('PDF generation error', err);
      toast.error('Failed: Failed to generate PDF. See console for details.');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  // Fetch candidates (similar to OfferLetters.jsx)
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(API_ENDPOINTS.getUsers, { headers: { Authorization: `Bearer ${token}` } });
        const active = (res.data || []).filter(u => u.isActive && u.role === 'employee');
        setCandidates(active);
      } catch (err) {
        console.error('Failed to fetch candidates', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const cand = candidates.find(c => c._id === selected);
    if (cand) {
      const next = {
        candidateName: cand.name || '',
        email: cand.email || '',
        addressLine1: cand.addressLine1 || cand.address?.line1 || cand.address?.addressLine1 || cand.location || '',
        location: cand.city || cand.location || '',
        country: cand.country || 'India',
        collegeName: cand.collegeName || cand.college || '',
        designation: cand.position || 'Full Stack Web Development',
        company: cand.company || '',
        duration: cand.duration || '',
        joiningDate: cand.dateOfJoining ? cand.dateOfJoining.slice(0, 10) : ''
      };
      setForm(next);
      // populate the editable body with template filled for this candidate
      const autoBody = defaultBody(next);
      setBody(autoBody);
      lastAutoBodyRef.current = autoBody;
    }
  }, [selected, candidates]);

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
        subject: `Internship Offer Letter - ${form.candidateName || 'Candidate'}`,
        text: `Dear ${form.candidateName || 'Candidate'},\n\nPlease find attached your Internship Offer Letter from ${form.company || 'Urbancode'}.\n\nRegards,\nAdmin Team`,
        pdfBytes: bytes,
        filename: `${form.candidateName || 'internship-offer'}.pdf`,
      });
      toast.success(`Internship Offer Letter sent successfully to ${form.email.trim()}`);
    } catch (err) {
      console.error('Failed to send mail:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to send email');
    } finally {
      setSendingMail(false);
    }
  };

  const replacePlaceholders = (template, data) => {
    return template.replace(/{{\s*name\s*}}/gi, data.candidateName || '')
      .replace(/{{\s*designation\s*}}/gi, data.designation || '')
      .replace(/{{\s*duration\s*}}/gi, data.duration || '')
      .replace(/{{\s*joiningDate\s*}}/gi, formatLongDate(data.joiningDate))
      .replace(/{{\s*addressLine1\s*}}/gi, data.addressLine1 || '')
      .replace(/{{\s*location\s*}}/gi, data.location || '')
      .replace(/{{\s*country\s*}}/gi, data.country || '')
      .replace(/{{\s*collegeName\s*}}/gi, data.collegeName || '')
      .replace(/{{\s*company\s*}}/gi, data.company || '');
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const uploadAndDownload = async () => {
      try {
        if (pdfBytesData) {
          const { uploadLetterBytes } = await import('../../utils/uploadLetter');
          await uploadLetterBytes(pdfBytesData, `${form.candidateName || 'internship-offer'}.pdf`, selected || undefined);
          toast.success('Saved: Letter uploaded to cloud');
        }
      } catch (err) {
        console.error('Upload failed', err);
        toast.warning('Upload failed: Letter could not be uploaded to cloud. Download will continue.');
      } finally {
        const a = document.createElement('a'); a.href = pdfUrl; a.download = `${form.candidateName || 'internship-offer'}.pdf`; a.click();
      }
    };
    uploadAndDownload();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Internship Offer Letter</Typography>
      <Box sx={{ display: 'flex', gap: 4 }}>
        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="candidate-label">Candidate</InputLabel>
            <Select
              labelId="candidate-label"
              value={selected}
              label="Candidate"
              onChange={(e) => setSelected(e.target.value)}
            >
              <MenuItem value="">-- Select --</MenuItem>
              {loading ? (
                <MenuItem disabled><em>Loading...</em></MenuItem>
              ) : (
                candidates.map(c => (
                  <MenuItem key={c._id} value={c._id}>{c.name} ΓÇö {c.position || c.degree || ''}</MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <TextField label="Name" fullWidth sx={{ mb: 2 }} value={form.candidateName} onChange={(e) => handleChange('candidateName', e.target.value)} />
          <TextField label="Recipient Email ID" type="email" fullWidth sx={{ mb: 2 }} value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="Enter candidate email address" />
          <TextField label="Address" fullWidth sx={{ mb: 2 }} value={form.addressLine1} onChange={(e) => handleChange('addressLine1', e.target.value)} />
          <TextField label="Location" fullWidth sx={{ mb: 2 }} value={form.location} onChange={(e) => handleChange('location', e.target.value)} />
          <TextField label="Country" fullWidth sx={{ mb: 2 }} value={form.country} onChange={(e) => handleChange('country', e.target.value)} />
          <TextField label="College Name" fullWidth sx={{ mb: 2 }} value={form.collegeName} onChange={(e) => handleChange('collegeName', e.target.value)} />
          <TextField label="Internship Domain" fullWidth sx={{ mb: 2 }} value={form.designation} onChange={(e) => handleChange('designation', e.target.value)} />
          <TextField label="Company" fullWidth sx={{ mb: 2 }} value={form.company} onChange={(e) => handleChange('company', e.target.value)} />
          <TextField label="Duration" fullWidth sx={{ mb: 2 }} value={form.duration} onChange={(e) => handleChange('duration', e.target.value)} />
          <TextField label="Commencing From" type="date" fullWidth sx={{ mb: 2 }} value={form.joiningDate} onChange={(e) => handleChange('joiningDate', e.target.value)} InputLabelProps={{ shrink: true }} />

          <TextField label="Title" fullWidth sx={{ mb: 2 }} value={titleText} onChange={(e) => setTitleText(e.target.value)} />
          <TextField label="Letter Date" type="date" fullWidth sx={{ mb: 2 }} value={letterDate} onChange={(e) => setLetterDate(e.target.value)} InputLabelProps={{ shrink: true }} />

          <TextField label="Letter Body" multiline minRows={8} fullWidth value={body} onChange={(e) => setBody(e.target.value)} sx={{ mb: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Signature (upload PNG/JPG)</Typography>
            <input type="file" accept="image/*" onChange={handleSignatureUpload} />
            {signaturePreview && (<Box sx={{ mt: 1 }}><img src={signaturePreview} alt="signature preview" style={{ maxWidth: 200, maxHeight: 80 }} /></Box>)}
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={generatePdf} disabled={generating}>{generating ? 'Generating...' : 'Generate Preview'}</Button>
            <Button variant="outlined" onClick={downloadPdf} disabled={!pdfUrl}>Download PDF</Button>
            <Button variant="contained" color="secondary" onClick={handleSendMail} disabled={sendingMail} sx={{ backgroundColor: '#0b2d67', '&:hover': { backgroundColor: '#071d44' } }}>
              {sendingMail ? 'Sending...' : 'Send Mail'}
            </Button>
          </Box>
          {selected && (candidates.find(c => c._id === selected)?.letterCopies || []).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Uploaded copies</Typography>
              <List dense>
                {(candidates.find(c => c._id === selected).letterCopies || []).map((lc, i) => (
                  <ListItem key={i} disableGutters>
                    <ListItemText primary={lc.filename || lc.url?.split('/').pop() || `Letter ${i+1}`} secondary={lc.uploadedAt ? new Date(lc.uploadedAt).toLocaleString() : ''} />
                    <ListItemSecondaryAction>
                      <Button size="small" variant="text" onClick={() => window.open(lc.url, '_blank')}>View</Button>
                      <Button size="small" variant="text" onClick={() => { const a = document.createElement('a'); a.href = lc.url; a.download = lc.filename || ''; a.click(); }}>Download</Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>

        <Box sx={{ width: 420, minHeight: 553, border: '1px solid #eee' }}>
          {pdfUrl ? (<iframe title="Preview" src={pdfUrl} width="100%" height="553px" />) : (<Box sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">Preview will appear here after generating.</Typography></Box>)}
        </Box>
      </Box>
    </Container>
  );
};

export default InternshipOfferLetter;
