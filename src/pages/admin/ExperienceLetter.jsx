import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../utils/api';
import {
  Box,
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  TextField,
  Button,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { toast } from 'react-toastify';
import letterheadUrl from '../../assets/letterhead.pdf';
import { shrinkLetterheadPhoneIconOnAllPages } from '../../utils/letterheadFooter';
import { sanitizeTextForStandardFonts } from '../../utils/pdfTextSanitizer';
import { sendDocumentEmailApi } from '../../utils/sendEmail';

const ExperienceLetter = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [form, setForm] = useState({ candidateName: '', designation: '', company: '', joiningDate: '', relievingDate: '', email: '' });
  const [titleText, setTitleText] = useState('EXPERIENCE LETTER');
  const [letterDate, setLetterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [body, setBody] = useState(`\n\nTo Whom It May Concern,\n\nThis is to certify that **{{name}}** was employed with **{{company}}** in the capacity of {{designation}} from **{{joiningDate}}** to **{{relievingDate}}**.\n\nDuring the course of their internship, {{name}} was responsible for carrying out assigned duties and responsibilities with dedication and sincerity. They demonstrated a good level of professional competence, discipline, and commitment toward their work. Their conduct throughout the tenure was found to be professional and in accordance with the company's policies and standards.\n\n{{name}} maintained cordial relationships with colleagues, supervisors, and clients, and contributed positively to the work environment. We found them to be reliable and cooperative in performing their assigned tasks and responsibilities.\n\nThis certificate is being issued upon the request of {{name}} for whatever purpose it may serve. We confirm that {{name}} has been relieved from their duties with **{{company}}** as of **{{relievingDate}}**.\n\nWe wish {{name}} every success in their future career and personal endeavors.\n\n**Sivagaminathan C**\nFounder & Director\n**{{company}}**`);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBytesData, setPdfBytesData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signatureBytes, setSignatureBytes] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);

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
      setForm({ candidateName: cand.name || '', designation: cand.position || '', company: cand.company || '', joiningDate: cand.dateOfJoining ? cand.dateOfJoining.slice(0,10) : '', relievingDate: '', email: cand.email || '' });
    }
  }, [selected, candidates]);

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

  const replacePlaceholders = (template, data) => template.replace(/{{\s*name\s*}}/gi, data.candidateName || '')
    .replace(/{{\s*designation\s*}}/gi, data.designation || '')
    .replace(/{{\s*company\s*}}/gi, data.company || '')
    .replace(/{{\s*joiningDate\s*}}/gi, data.joiningDate || '')
    .replace(/{{\s*relievingDate\s*}}/gi, data.relievingDate || '');

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const resp = await fetch(letterheadUrl);
      const arrayBuffer = await resp.arrayBuffer();
      const srcPdf = await PDFDocument.load(arrayBuffer);
      const pdfDoc = await PDFDocument.create();

      const [copiedFirst] = await pdfDoc.copyPages(srcPdf, [0]);
      pdfDoc.addPage(copiedFirst);
      let page = pdfDoc.getPage(0);
      const { width, height } = page.getSize();

      const margins = { top: 150, bottom: 146, left: 40, right: 10 };

      const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      let fontBold = fontRegular;
      try { fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold); } catch (e) {}

      const finalBody = sanitizeTextForStandardFonts(replacePlaceholders(body, form), [fontRegular, fontBold]);
      const allLines = finalBody.split('\n');
      const signOffMarkerIndex = allLines.findIndex(l => l.trim() === '**Sivagaminathan C**');
      const lines = signOffMarkerIndex >= 0 ? allLines.slice(0, signOffMarkerIndex) : allLines;
      const signOffLines = signOffMarkerIndex >= 0 ? allLines.slice(signOffMarkerIndex) : [];
  // Title/bold and body color (match OfferLetters)
  const titleColor = rgb(53 / 255, 53 / 255, 53 / 255);
  const bodyColor = rgb(60 / 255, 60 / 255, 60 / 255);

      const contentTop = height - margins.top;
      const contentWidth = width - margins.left - margins.right;
      const fontDateSize = 10;
      let dateStr = '';
      try { dateStr = letterDate ? new Date(letterDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB'); } catch (e) { dateStr = new Date().toLocaleDateString('en-GB'); }
      const dateWidth = fontBold.widthOfTextAtSize(dateStr, fontDateSize);
      const dateX = margins.left + (contentWidth - dateWidth);
      const dateY = contentTop - fontDateSize;
  page.drawText(dateStr, { x: dateX, y: dateY, size: fontDateSize, font: fontBold, color: titleColor });

      const titleSize = 16;
      const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
      const titleX = margins.left + (contentWidth - titleWidth) / 2;
      const titleY = contentTop - titleSize - 6;
  page.drawText(titleText, { x: titleX, y: titleY, size: titleSize, font: fontBold, color: titleColor });

      const fontSize = 12;
      const lineHeight = fontSize + 4;
      let cursorY = titleY - 14;
      const maxWidth = contentWidth;

      // letter spacing in points (adds small tracking between characters)
      const letterSpacing = 0.5;
      // width of a single space in the chosen font (used for wrapping)
      const spaceWidth = fontRegular.widthOfTextAtSize(' ', fontSize) + letterSpacing;

      const measureWord = (text, font) => {
        if (!text) return 0;
        return font.widthOfTextAtSize(text, fontSize) + letterSpacing * Math.max(0, text.length - 1);
      };
      const tokenizeLineForBold = (line) => {
        const parts = []; const pattern = /\*\*(.+?)\*\*/g; let lastIndex = 0; let match;
        while ((match = pattern.exec(line)) !== null) {
          if (match.index > lastIndex) parts.push({ text: line.slice(lastIndex, match.index), bold: false });
          parts.push({ text: match[1], bold: true });
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < line.length) parts.push({ text: line.slice(lastIndex), bold: false });
        return parts;
      };

      const drawParagraphLines = async (paragraphLines) => {
        for (const rawLine of paragraphLines) {
          const segments = tokenizeLineForBold(rawLine);
          const words = [];
          segments.forEach(seg => seg.text.split(/\s+/).filter(Boolean).forEach(w => words.push({ text: w, bold: !!seg.bold })));

          let lineWords = []; let lineWidth = 0;
          const flushLine = async () => {
            if (lineWords.length === 0) return;
            if (cursorY - lineHeight < margins.bottom) {
              const [bg] = await pdfDoc.copyPages(srcPdf, [0]); pdfDoc.addPage(bg); page = pdfDoc.getPage(pdfDoc.getPageCount() - 1); cursorY = height - margins.top - fontSize;
            }
            let x = margins.left;
            for (let i = 0; i < lineWords.length; i++) {
              const wobj = lineWords[i];
              const usedFont = wobj.bold ? fontBold : fontRegular;
              // draw word character-by-character to apply letterSpacing
              let cx = x;
                for (let ci = 0; ci < wobj.text.length; ci++) {
                const ch = wobj.text[ci];
                const charColor = wobj.bold ? titleColor : bodyColor;
                page.drawText(ch, { x: cx, y: cursorY, size: fontSize, font: usedFont, color: charColor });
                const cw = usedFont.widthOfTextAtSize(ch, fontSize);
                cx += cw + letterSpacing;
              }
              const w = measureWord(wobj.text, usedFont);
              x += w; if (i !== lineWords.length - 1) x += spaceWidth;
            }
            cursorY -= lineHeight; lineWords = []; lineWidth = 0;
          };

          for (let i = 0; i < words.length; i++) {
            const wobj = words[i]; const usedFont = wobj.bold ? fontBold : fontRegular; const wordWidth = measureWord(wobj.text, usedFont);
            const extra = lineWords.length > 0 ? spaceWidth : 0;
            if (lineWidth + extra + wordWidth > maxWidth) await flushLine();
            lineWords.push(wobj); lineWidth = lineWidth + (lineWords.length > 1 ? spaceWidth : 0) + wordWidth;
          }
          await flushLine(); cursorY -= lineHeight / 2;
        }
      };

      await drawParagraphLines(lines);

      if (signatureBytes && signatureFile) {
        try {
          const sigUint8 = new Uint8Array(signatureBytes);
          let embeddedSig = null; const mime = signatureFile.type || '';
          if (mime.includes('png')) embeddedSig = await pdfDoc.embedPng(sigUint8); else embeddedSig = await pdfDoc.embedJpg(sigUint8);
          const maxSigWidth = 150; const maxSigHeight = 80; const origW = embeddedSig.width || 1; const origH = embeddedSig.height || 1;
          const scale = Math.min(1, maxSigWidth / origW, maxSigHeight / origH); const sigDims = embeddedSig.scale(scale);

          // place signature where the body content ends, before the sign-off block
          let targetY = cursorY - lineHeight * 0.4;
          if (targetY - sigDims.height < margins.bottom) {
            const [bg] = await pdfDoc.copyPages(srcPdf, [0]); pdfDoc.addPage(bg); page = pdfDoc.getPage(pdfDoc.getPageCount() - 1); targetY = height - margins.top - fontSize;
          }
          const x = margins.left;
          page.drawImage(embeddedSig, { x, y: targetY - sigDims.height, width: sigDims.width, height: sigDims.height });
          cursorY = targetY - sigDims.height - lineHeight * 0.3;
        } catch (sigErr) { console.error('Signature embed error', sigErr); }
      }

      await drawParagraphLines(signOffLines);

  await shrinkLetterheadPhoneIconOnAllPages(pdfDoc);
  const pdfBytes = await pdfDoc.save();
  setPdfBytesData(pdfBytes);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  setPdfUrl(URL.createObjectURL(blob));
  return pdfBytes;
  } catch (err) { console.error('PDF generation error', err); toast.error('Failed: Failed to generate PDF. See console for details.'); return null; } finally { setGenerating(false); }
  };

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
        subject: `Experience Letter - ${form.candidateName || 'Employee'}`,
        text: `Dear ${form.candidateName || 'Employee'},\n\nPlease find attached your Experience Letter from ${form.company || 'Urbancode'}.\n\nRegards,\nAdmin Team`,
        pdfBytes: bytes,
        filename: `${form.candidateName || 'experience-letter'}.pdf`,
      });
      toast.success(`Experience Letter sent successfully to ${form.email.trim()}`);
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
          const { uploadLetterBytes } = await import('../../utils/uploadLetter');
          await uploadLetterBytes(pdfBytesData, `${form.candidateName || 'experience-letter'}.pdf`, selected || undefined);
          toast.success('Saved: Letter uploaded to cloud');
        }
      } catch (err) {
        console.error('Upload failed', err);
        toast.warning('Upload failed: Letter could not be uploaded to cloud. Download will continue.');
      } finally {
        const a = document.createElement('a'); a.href = pdfUrl; a.download = `${form.candidateName || 'experience-letter'}.pdf`; a.click();
      }
    };
    uploadAndDownload();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Experience Letter</Typography>
      {loading ? <CircularProgress /> : (
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Box sx={{ flex: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="candidate-label">Candidate</InputLabel>
              <Select labelId="candidate-label" value={selected} label="Candidate" onChange={(e) => setSelected(e.target.value)}>
                <MenuItem value="">-- Select --</MenuItem>
                {candidates.map(c => <MenuItem key={c._id} value={c._id}>{c.name} — {c.position}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Name" fullWidth sx={{ mb: 2 }} value={form.candidateName} onChange={(e) => handleChange('candidateName', e.target.value)} />
            <TextField label="Recipient Email ID" type="email" fullWidth sx={{ mb: 2 }} value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="Enter candidate email address" />
            <TextField label="Designation" fullWidth sx={{ mb: 2 }} value={form.designation} onChange={(e) => handleChange('designation', e.target.value)} />
            <TextField label="Company" fullWidth sx={{ mb: 2 }} value={form.company} onChange={(e) => handleChange('company', e.target.value)} />
            <TextField label="Joining Date" type="date" fullWidth sx={{ mb: 2 }} value={form.joiningDate} onChange={(e) => handleChange('joiningDate', e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Relieving Date" type="date" fullWidth sx={{ mb: 2 }} value={form.relievingDate || ''} onChange={(e) => handleChange('relievingDate', e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Title" fullWidth sx={{ mb: 2 }} value={titleText} onChange={(e) => setTitleText(e.target.value)} />
            <TextField label="Letter Date" type="date" fullWidth sx={{ mb: 2 }} value={letterDate} onChange={(e) => setLetterDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Letter Body" multiline minRows={6} fullWidth value={body} onChange={(e) => setBody(e.target.value)} sx={{ mb: 2 }} />
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
      )}
    </Container>
  );
};

export default ExperienceLetter;
