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
import letterheadUrl from '../../assets/letterhead.pdf';
import { toast } from 'react-toastify';
import { shrinkLetterheadPhoneIconOnAllPages } from '../../utils/letterheadFooter';
import { sanitizeTextForStandardFonts } from '../../utils/pdfTextSanitizer';
import { sendDocumentEmailApi } from '../../utils/sendEmail';

const SIGN_OFF_GAP = 14;
const MIN_PAGE_BOTTOM = 88;


const OFFICE_ADDRESSES = {
  'Chennai - Pallikaranai': '9/29, 5th Street, Kamakoti Nagar, Pallikaranai, Chennai - 600100',
  'Chennai - Velachery': '52/159, Velachery Main Rd, next to GURU NANAK COLLEGE, near Phoenix Marketcity, Anna Garden, Velachery, Chennai, Tamil Nadu 600042',
  Tirunelveli: 'Fab Sapphire Towers, No 29/5, 4th Floor, South Bypass Road, Tirunelveli - 627005',
};

const guessWorkLocationBranch = (address) => {
  if (!address) return '';
  if (/tirunelveli/i.test(address)) return 'Tirunelveli';
  if (/velachery|velechery/i.test(address)) return 'Chennai - Velachery';
  if (/chennai|pallikaranai/i.test(address)) return 'Chennai - Pallikaranai';
  return 'Other';
};

const stripSignOffFromBody = (text) => {
  const lines = text.split('\n');
  const signOffIndex = lines.findIndex((line) => /^\s*(\*\*)?warm\s+regards?,?(\*\*)?\s*$/i.test(line.trim()));
  if (signOffIndex >= 0) return lines.slice(0, signOffIndex).join('\n').trimEnd();
  return text;
};

/** Makes the signature's background transparent so it blends into the white
 * letter page regardless of whatever color the uploaded image's background is. */
const removeImageBackground = (file) => new Promise((resolve, reject) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(url);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const { width, height } = canvas;
      const imageData = ctx.getImageData(0, 0, width, height);
      const { data } = imageData;

      const cornerIndexes = [
        0,
        (width - 1) * 4,
        (height - 1) * width * 4,
        ((height - 1) * width + (width - 1)) * 4,
      ];
      let r = 0, g = 0, b = 0;
      cornerIndexes.forEach((idx) => { r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; });
      r /= cornerIndexes.length;
      g /= cornerIndexes.length;
      b /= cornerIndexes.length;

      const tolerance = 38;
      const feather = 22;
      for (let i = 0; i < data.length; i += 4) {
        const dr = data[i] - r;
        const dg = data[i + 1] - g;
        const db = data[i + 2] - b;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist <= tolerance) {
          data[i + 3] = 0;
        } else if (dist <= tolerance + feather) {
          data[i + 3] = Math.round(data[i + 3] * ((dist - tolerance) / feather));
        }
      }
      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  };
  img.onerror = reject;
  img.src = url;
});

const LETTER_TEMPLATES = {
  Standard: {
    title: 'OFFER LETTER',
    body: `To,
{{name}},
{{addressLine1}},
{{addressLine2}}.

**Dear {{name}},**

We are pleased to offer you the position of **{{designation}}** at **{{company}}**. Based on your qualifications, experience, and performance during the selection process, we believe that you will be a valuable addition to our team.

Your employment with **{{company}}** will commence on **{{joiningDate}}**. On your joining date, you will be required to report to your designated reporting manager or management representative. Your annual compensation for this position will be **{{salary}}**, along with other benefits and entitlements as per the company's policies.

Your roles and responsibilities will be communicated in detail by your reporting manager. We expect you to perform your duties with dedication, professionalism, and integrity while adhering to all company policies, rules, and regulations.

This offer of employment is subject to the successful verification of all documents, credentials, and information provided by you during the recruitment process.

During your employment with **{{company}}**, you will be required to maintain strict confidentiality regarding company information, internal processes, client data, and any other proprietary information. Any breach of confidentiality or professional conduct may result in disciplinary action, including termination of employment.

To confirm your acceptance of this offer, please sign and return a copy of this letter or provide your confirmation via email before your joining date.

We are excited to welcome you to the **{{company}}** team and look forward to your contributions and success with us. We wish you a rewarding and successful career journey ahead.

If you have any questions or require further clarification, please feel free to contact the Founder.`,
  },
  Employment: {
    title: 'EMPLOYMENT OFFER LETTER',
    body: `To,
{{name}},
{{addressLine1}},
{{addressLine2}}.

**Dear {{name}},**

We are pleased to extend to you an offer of employment with **{{company}}** for the position of **{{designation}}**. Based on your qualifications, skills, and experience, your Annual Cost to Company (CTC) will be **Rs. {{salary}}**. We are confident that you will be a valuable addition to our team. We are excited to welcome you to our organization and look forward to your contribution towards our continued growth and success.

**Employment Details**
Designation: {{designation}}
Date of Joining: {{joiningDate}}
Employment Type: Full-Time
Work Location: {{workLocation}}

**Roles and Responsibilities**
You will be responsible for performing duties associated with your role and any additional responsibilities assigned by the management from time to time. You are expected to maintain the highest standards of professionalism, integrity, and ethical conduct while representing the organization.

**Terms and Conditions**
1. Your employment will be governed by the policies, rules, and regulations of **{{company}}**.
2. You shall maintain confidentiality of all company information, client data, business strategies, intellectual property, and other proprietary information.
3. Any violation of company policies, code of conduct, or unethical behavior may result in disciplinary action, including termination of employment.
4. The company reserves the right to modify job responsibilities, reporting structures, and operational requirements based on business needs.
5. Either party may terminate the employment relationship by providing notice as per company policy.

We at **{{company}}** look forward to your valuable contribution in shaping confident communicators and future professionals.`,
  },
  Consultant: {
    title: 'OFFER LETTER',
    body: `To,
{{name}},

**Dear {{name}},**

We are pleased to offer you the position of **{{designation}}** at **{{company}}** effective from **{{joiningDate}}**. Based on our discussions and assessment of your profile we have agreed to offer a compensation of **INR {{salary}}/- PA**. We believe that your skills and experience will be valuable in supporting our students and contributing to the growth of our Study Abroad and Language Training services.

**Position & Responsibilities**
As a **{{designation}}**, your key responsibilities will include:
- Counselling students regarding suitable study abroad opportunities, universities, courses, and countries.
- Guiding students through the complete admission and application process.
- Providing support and guidance for documentation, university applications, and related student requirements.
- Assisting students in understanding visa processes and study abroad procedures.
- Conducting and supporting language training programs, including English language and IELTS-related training, as applicable.
- Assessing students' language proficiency and helping them improve their communication and language skills.
- Maintaining professional communication and regular follow-ups with prospective students and parents.
- Supporting student enrolment, counselling activities, seminars, workshops, and promotional events.
- Coordinating with the management and internal teams to ensure a smooth student journey.

**Terms of Employment**
Your employment will be subject to the terms and conditions, policies, procedures, and guidelines of **{{company}}**.

Your date of joining, compensation, working hours, probation period, and other employment terms will be communicated and mutually agreed upon as part of your appointment process. Any applicable incentives, bonuses, or performance-based compensation will be governed by the company's policies and may be based on individual and organizational performance.

We expect you to maintain the highest standards of professionalism, integrity, confidentiality, and commitment while representing the organization and interacting with students, parents, universities, and other stakeholders. We are confident that your contribution will play an important role in helping students achieve their international education goals and strengthening Urbancode's Study Abroad and Language Training services.

We are delighted to welcome you to **{{company}}** and look forward to having you as part of our team.

We wish you a successful and rewarding career with us.`,
    secondSheetTitle: 'URBANCODE EDUTECH',
    secondSheetSubtitle: 'Rules & Regulations – Educational Counsellor',
    secondSheetBody: `This document outlines the key professional responsibilities, performance expectations, workplace conduct, and operational standards applicable to the role of **Educational Counsellor** at **Urbancode Edutech**.

**1. Student Counselling & Professional Communication**
- Provide **accurate and transparent information** about courses, eligibility, fees, duration, curriculum, career pathways, and placement support.
- Understand each student's educational background and career goals before recommending a suitable program.
- Maintain a **professional, polite, and student-focused approach** with students and parents.
- **Do not make false promises or unauthorized guarantees** regarding jobs, salary packages, admissions, visas, or other outcomes.
- Escalate complex queries, complaints, and exceptional cases to the reporting manager.

**2. Lead Management & Follow-Up**
- Record and maintain **all assigned enquiries and follow-up activities** in the approved CRM/lead-management system.
- Ensure timely follow-ups through approved calls, emails, and communication channels.
- Maintain accurate records of counselling sessions, student interests, admission status, and pending actions.
- **No enquiry should be neglected, left untracked, or incorrectly updated.**

**3. Admissions, Fees & Payments**
- Clearly explain approved **course fees, instalment options, discounts, payment deadlines, and refund policies**.
- Process or accept payments **only through officially authorized channels**.
- **Unauthorized discounts, fee waivers, payment extensions, or financial commitments are strictly prohibited.**
- Ensure admission forms, payment records, and required documents are completed accurately.

**4. Performance & Reporting**
- Work towards assigned **enquiry, conversion, admission, counselling, and follow-up targets**.
- Maintain daily activity records and submit **daily, weekly, or monthly reports** as required.
- Participate actively in team meetings, training sessions, and performance reviews.
- Performance will be evaluated based on **counselling quality, student satisfaction, lead discipline, conversions, admissions, and policy compliance**.

**5. Attendance & Workplace Discipline**
- Follow the organization's **working hours, attendance, leave, and break policies**.
- Report on time and inform the reporting manager promptly regarding any absence or delay.
- Maintain **professional behaviour, respectful communication, and appropriate workplace conduct** at all times.
- Follow lawful instructions and approved organizational policies.

**6. Confidentiality & Data Protection**
- Protect all **student information, contact details, academic records, payment information, enquiry data, and company documents**.
- **Do not share, copy, download, transfer, or use institutional data without authorization.**
- Use official systems and communication channels wherever required.
- Return all company assets, documents, and access credentials upon separation.

**7. Ethical Conduct & Professional Integrity**
- Represent **Urbancode Edutech honestly and professionally**.
- **Unauthorized fee collection, personal payments, data manipulation, false reporting, fraud, or misrepresentation are strictly prohibited.**
- Treat all students fairly, respectfully, and without inappropriate pressure.
- Disclose any actual or potential conflict of interest to management.

**8. Coordination & Continuous Improvement**
- Coordinate effectively with **Admissions, Training, Placement, Accounts, and Digital Marketing teams**.
- Participate in product knowledge, counselling, communication, and professional development training.
- Stay updated on course offerings, curriculum changes, institutional policies, and approved procedures.

**9. Policy Compliance**
Failure to comply with these rules may result in **counselling, warnings, performance improvement measures, disciplinary action, or termination**, depending on the seriousness of the violation and applicable law.`,
  },
};

const OfferLetters = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [form, setForm] = useState({
    candidateName: '',
    designation: '',
    department: '',
    company: '',
    salary: '',
    addressLine1: '',
    addressLine2: '',
    offerDate: new Date().toISOString().slice(0, 10),
    joiningDate: '',
    email: '',
    probationPeriod: '',
    workingHours: '',
    workLocation: '',
    workLocationBranch: '',
    noticePeriod: '',
    founderName: 'Sivagaminathan',
    directorName: '',
    branchHeadName: '',
    signatoryTitle: 'Founder',
  });
  const [letterTemplate, setLetterTemplate] = useState('Standard');
  const [titleText, setTitleText] = useState(LETTER_TEMPLATES.Standard.title);
  const [body, setBody] = useState(LETTER_TEMPLATES.Standard.body);
  const [secondSheetTitle, setSecondSheetTitle] = useState('');
  const [secondSheetSubtitle, setSecondSheetSubtitle] = useState('');
  const [secondSheetBody, setSecondSheetBody] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBytesData, setPdfBytesData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signatureBytes, setSignatureBytes] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(API_ENDPOINTS.getUsers, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
      setForm(prev => ({
        ...prev,
        candidateName: cand.name || '',
        designation: cand.position || '',
        department: cand.department || '',
        company: cand.company || '',
        salary: cand.salary || '',
        addressLine1: cand.addressLine1 || cand.address?.line1 || cand.address?.addressLine1 || cand.location || '',
        addressLine2: cand.addressLine2 || cand.address?.line2 || cand.address?.addressLine2 || cand.city || '',
        joiningDate: cand.dateOfJoining ? cand.dateOfJoining.slice(0, 10) : '',
        email: cand.email || '',
        probationPeriod: cand.probationPeriod || '',
        workingHours: cand.workingHours || '',
        workLocation: cand.workLocation || '',
        workLocationBranch: guessWorkLocationBranch(cand.workLocation),
        noticePeriod: cand.noticePeriod || '',
      }));
    }
  }, [selected, candidates]);

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSignatureUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setSignatureFile(file);
    setSignaturePreview(URL.createObjectURL(file));
    removeImageBackground(file)
      .then((bytes) => setSignatureBytes(bytes))
      .catch((err) => {
        console.error('Signature background removal failed, using original image', err);
        const reader = new FileReader();
        reader.onload = () => setSignatureBytes(reader.result);
        reader.readAsArrayBuffer(file);
      });
  };

  const formatJoiningDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(`${dateStr}T12:00:00`);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const sanitizeBoldMarkers = (text) => text.replace(/\*\*([^*]*)\*\*/g, (_, inner) => {
    const trimmed = inner.trim();
    if (!trimmed) return '';
    const stripped = trimmed.replace(/[,.\s]/g, '');
    if (!stripped || /^Dear$/i.test(stripped)) {
      return trimmed.toLowerCase().startsWith('dear') ? 'Dear,' : '';
    }
    return `**${trimmed}**`;
  });

  const normalizeLetterLines = (text) =>
    text
      .split('\n')
      .map((line) => line.replace(/,\s*$/, '').trimEnd())
      .filter((line) => {
        const t = line.trim();
        return t !== '' && t !== ',' && t !== '.';
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');

  const replacePlaceholders = (template, data) => {
    const replaced = template
      .replace(/{{\s*name\s*}}/gi, data.candidateName || '')
      .replace(/{{\s*designation\s*}}/gi, data.designation || '')
      .replace(/{{\s*department\s*}}/gi, data.department || '')
      .replace(/{{\s*date\s*}}/gi, formatJoiningDate(data.offerDate || new Date().toISOString().slice(0, 10)))
      .replace(/{{\s*company\s*}}/gi, data.company || '')
      .replace(/{{\s*salary\s*}}/gi, data.salary || '')
      .replace(/{{\s*joiningDate\s*}}/gi, data.joiningDate ? formatJoiningDate(data.joiningDate) : '')
      .replace(/{{\s*probationPeriod\s*}}/gi, data.probationPeriod || '')
      .replace(/{{\s*workingHours\s*}}/gi, data.workingHours || '')
      .replace(/{{\s*workLocation\s*}}/gi, data.workLocation || '')
      .replace(/{{\s*noticePeriod\s*}}/gi, data.noticePeriod || '')
      .replace(/{{\s*addressLine1\s*}}/gi, data.addressLine1 || '')
      .replace(/{{\s*addressLine2\s*}}/gi, data.addressLine2 || '');

    return normalizeLetterLines(sanitizeBoldMarkers(replaced));
  };

  const drawSignOffBlock = async (page, pdfDoc, fontRegular, fontBold, fontSize, startY) => {
    const x = 40;
    const lineHeight = fontSize + 1.5;
    const bodyColor = rgb(60 / 255, 60 / 255, 60 / 255);
    const titleColor = rgb(53 / 255, 53 / 255, 53 / 255);
    const signatoryTitle = form.signatoryTitle?.trim() || 'Founder';
    const signatoryNameByTitle = {
      Founder: form.founderName?.trim() || 'Sivagaminathan',
      Director: form.directorName?.trim() || '',
      'Branch Head': form.branchHeadName?.trim() || '',
    };
    const signatoryName = signatoryNameByTitle[signatoryTitle] || '';
    const company = form.company?.trim() || '';

    let y = startY;

    // 1. Warm Regards,
    page.drawText('Warm Regards,', { x, y, size: fontSize, font: fontRegular, color: bodyColor });
    y -= lineHeight + 4;

    // 2. Signature (right after Warm Regards)
    if (signatureBytes && signatureFile) {
      try {
        const sigUint8 = new Uint8Array(signatureBytes);
        let embeddedSig;
        try {
          embeddedSig = await pdfDoc.embedPng(sigUint8);
        } catch {
          embeddedSig = await pdfDoc.embedJpg(sigUint8);
        }

        const maxSigWidth = 120;
        const maxSigHeight = 48;
        const scale = Math.min(1, maxSigWidth / (embeddedSig.width || 1), maxSigHeight / (embeddedSig.height || 1));
        const sigDims = embeddedSig.scale(scale);

        page.drawImage(embeddedSig, {
          x,
          y: y - sigDims.height,
          width: sigDims.width,
          height: sigDims.height,
        });
        y -= sigDims.height + 6;
      } catch (sigErr) {
        console.error('Signature embed error', sigErr);
        page.drawText('Signature', { x, y, size: fontSize, font: fontRegular, color: bodyColor });
        y -= lineHeight + 6;
      }
    } else {
      page.drawText('Signature', { x, y, size: fontSize, font: fontRegular, color: bodyColor });
      y -= lineHeight + 6;
    }

    // 3. Signatory name (bold)
    page.drawText(signatoryName, { x, y, size: fontSize, font: fontBold, color: titleColor });
    y -= lineHeight;

    // 4. Designation and company (normal weight)
    page.drawText(signatoryTitle, { x, y, size: fontSize, font: fontRegular, color: bodyColor });
    y -= lineHeight;

    if (company) {
      page.drawText(company, { x, y, size: fontSize, font: fontRegular, color: bodyColor });
      y -= lineHeight;
    }
  };

  const generatePdf = async () => {
    if (!form.candidateName?.trim() || !form.company?.trim() || !form.designation?.trim()) {
      toast.warning('Missing details: Select a candidate and ensure name, company, and designation are filled before generating.');
      return;
    }

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

      const margins = { top: 132, left: 40, right: 50 };
      const contentTop = height - margins.top;
      const contentWidth = width - margins.left - margins.right;
      const dateSize = 10;
      const dateY = contentTop - dateSize;
      const titleSize = 14;
      const titleY = dateY - titleSize - 10;
      const bodyStartY = titleY - 10;
      const signOffReserve = signatureBytes ? 167 : 119;
      const maxBodyHeight = bodyStartY - MIN_PAGE_BOTTOM - signOffReserve - SIGN_OFF_GAP;

      const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      let fontBold = fontRegular;
      try {
        fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      } catch {
        fontBold = fontRegular;
      }

      const finalBody = stripSignOffFromBody(sanitizeTextForStandardFonts(replacePlaceholders(body, form), [fontRegular, fontBold]));
      const sourceLines = finalBody.split('\n');

      const titleColor = rgb(53 / 255, 53 / 255, 53 / 255);
      const bodyColor = rgb(60 / 255, 60 / 255, 60 / 255);
      const letterSpacing = 0.15;

      const tokenizeLineForBold = (line) => {
        const parts = [];
        const pattern = /\*\*(.+?)\*\*/g;
        let lastIndex = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push({ text: line.slice(lastIndex, match.index), bold: false });
          }
          parts.push({ text: match[1], bold: true });
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < line.length) parts.push({ text: line.slice(lastIndex), bold: false });
        return parts;
      };

      const HEADER_LINE_GAP = 11;
      const isHeaderLine = (line) => {
        const trimmed = line.trim();
        return /^\*{0,2}dear\b/i.test(trimmed) || /^\*\*[^*]+\*\*$/.test(trimmed);
      };

      const buildLayout = (fontSize) => {
        const lineHeight = fontSize + 1.5;
        const paragraphGap = 3;
        const spaceWidth = fontRegular.widthOfTextAtSize(' ', fontSize) + letterSpacing;

        const measureWord = (text, font) => {
          if (!text) return 0;
          return font.widthOfTextAtSize(text, fontSize) + letterSpacing * Math.max(0, text.length - 1);
        };

        const visualLines = [];

        for (const rawLine of sourceLines) {
          const isHeader = isHeaderLine(rawLine);

          if (isHeader && visualLines.length > 0) {
            visualLines.push({ words: [], isParagraphBreak: true, gap: HEADER_LINE_GAP });
          }

          const segments = tokenizeLineForBold(rawLine);
          const words = [];
          segments.forEach(seg => {
            seg.text.split(/\s+/).filter(Boolean).forEach(w => {
              words.push({ text: w, bold: !!seg.bold });
            });
          });

          if (words.length === 0) {
            visualLines.push({ words: [], isParagraphBreak: true });
            continue;
          }

          let lineWords = [];
          let lineWidth = 0;

          const pushLine = () => {
            if (lineWords.length === 0) return;
            visualLines.push({ words: lineWords, isParagraphBreak: false });
            lineWords = [];
            lineWidth = 0;
          };

          for (const wobj of words) {
            const usedFont = wobj.bold ? fontBold : fontRegular;
            const wordWidth = measureWord(wobj.text, usedFont);
            const extra = lineWords.length > 0 ? spaceWidth : 0;
            if (lineWidth + extra + wordWidth > contentWidth) pushLine();
            lineWords.push(wobj);
            lineWidth = lineWidth + (lineWords.length > 1 ? spaceWidth : 0) + wordWidth;
          }
          pushLine();
          visualLines.push({ words: [], isParagraphBreak: true, gap: isHeader ? HEADER_LINE_GAP : undefined });
        }

        let totalHeight = 0;
        visualLines.forEach((vl, idx) => {
          if (vl.isParagraphBreak) {
            if (idx > 0 && idx < visualLines.length - 1) totalHeight += (vl.gap ?? paragraphGap);
            return;
          }
          totalHeight += lineHeight;
        });

        return { visualLines, totalHeight, lineHeight, paragraphGap, fontSize, spaceWidth, measureWord };
      };

      let layout = buildLayout(11);
      for (let size = 11; size >= 9 && layout.totalHeight > maxBodyHeight; size -= 0.5) {
        layout = buildLayout(size);
      }

      const { visualLines, lineHeight, paragraphGap, fontSize, spaceWidth, measureWord } = layout;

      const dateStr = formatJoiningDate(form.offerDate) || new Date().toLocaleDateString('en-GB');
      const dateWidth = fontBold.widthOfTextAtSize(dateStr, dateSize);
      const dateX = margins.left + (contentWidth - dateWidth);
      page.drawText(dateStr, { x: dateX, y: dateY, size: dateSize, font: fontBold, color: titleColor });

      const title = titleText || '';
      const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
      const titleX = margins.left + (contentWidth - titleWidth) / 2;
      page.drawText(title, { x: titleX, y: titleY, size: titleSize, font: fontBold, color: titleColor });

      let cursorY = bodyStartY;

      for (const vl of visualLines) {
        if (vl.isParagraphBreak) {
          cursorY -= (vl.gap ?? paragraphGap);
          continue;
        }
        if (vl.words.length === 0) continue;

        let x = margins.left;
        for (let i = 0; i < vl.words.length; i++) {
          const wobj = vl.words[i];
          const usedFont = wobj.bold ? fontBold : fontRegular;
          let cx = x;
          for (let ci = 0; ci < wobj.text.length; ci++) {
            const ch = wobj.text[ci];
            page.drawText(ch, {
              x: cx,
              y: cursorY,
              size: fontSize,
              font: usedFont,
              color: wobj.bold ? titleColor : bodyColor
            });
            cx += usedFont.widthOfTextAtSize(ch, fontSize) + letterSpacing;
          }
          x += measureWord(wobj.text, usedFont);
          if (i !== vl.words.length - 1) x += spaceWidth;
        }
        cursorY -= lineHeight;
      }

      await drawSignOffBlock(page, pdfDoc, fontRegular, fontBold, fontSize, cursorY - SIGN_OFF_GAP);

      if (secondSheetBody?.trim()) {
        const sheet2TopMargin = 54;
        const sheet2BottomMargin = 48;
        const bulletIndent = 14;
        const sheet2LetterSpacing = 0.05;
        const sheet2Source = sanitizeTextForStandardFonts(
          replacePlaceholders(secondSheetBody, form),
          [fontRegular, fontBold]
        ).split('\n');

        const isBulletLine = (line) => /^\s*[-•]\s+/.test(line);
        const isSectionHeader = (line) => {
          const trimmed = line.trim();
          return /^\*\*\d+\.\s+[^*]+\*\*$/.test(trimmed) || /^\d+\.\s+/.test(trimmed);
        };

        const buildSheet2Layout = (fs) => {
          const lh = fs + 3;
          const pGap = 4;
          const sw = fontRegular.widthOfTextAtSize(' ', fs) + sheet2LetterSpacing;
          const measure = (text, font) => {
            if (!text) return 0;
            return font.widthOfTextAtSize(text, fs) + sheet2LetterSpacing * Math.max(0, text.length - 1);
          };
          const lines = [];
          for (const rawLine of sheet2Source) {
            const trimmedRaw = rawLine.trim();
            const header = isSectionHeader(rawLine) || isHeaderLine(rawLine);
            const bullet = isBulletLine(rawLine);
            if (header && lines.length > 0) {
              lines.push({ words: [], isParagraphBreak: true, gap: 12 });
            }

            const textForTokens = bullet
              ? trimmedRaw.replace(/^[-•]\s+/, '')
              : trimmedRaw;
            const segments = tokenizeLineForBold(textForTokens);
            const words = [];
            if (bullet) words.push({ text: '-', bold: false });
            segments.forEach((seg) => {
              seg.text.split(/\s+/).filter(Boolean).forEach((w) => {
                words.push({ text: w, bold: !!seg.bold || header });
              });
            });
            if (words.length === 0) {
              lines.push({ words: [], isParagraphBreak: true, gap: 6 });
              continue;
            }

            const indent = bullet ? bulletIndent : 0;
            const usableWidth = contentWidth - indent;
            let lineWords = [];
            let lineWidth = 0;
            let isFirstWrapped = true;
            const pushLine = () => {
              if (lineWords.length === 0) return;
              lines.push({
                words: lineWords,
                isParagraphBreak: false,
                indent: isFirstWrapped ? indent : indent + (bullet ? 10 : 0),
                isHeader: header && isFirstWrapped,
              });
              isFirstWrapped = false;
              lineWords = [];
              lineWidth = 0;
            };
            for (const wobj of words) {
              const usedFont = wobj.bold ? fontBold : fontRegular;
              const wordWidth = measure(wobj.text, usedFont);
              const extra = lineWords.length > 0 ? sw : 0;
              if (lineWidth + extra + wordWidth > usableWidth) pushLine();
              lineWords.push(wobj);
              lineWidth = lineWidth + (lineWords.length > 1 ? sw : 0) + wordWidth;
            }
            pushLine();
            lines.push({
              words: [],
              isParagraphBreak: true,
              gap: header ? 5 : (bullet ? 2 : 4),
            });
          }
          return { lines, lineHeight: lh, paragraphGap: pGap, fontSize: fs, spaceWidth: sw, measure };
        };

        let sheet2Layout = buildSheet2Layout(10.5);
        const pageBodyHeight = height - sheet2TopMargin - sheet2BottomMargin - 70;
        for (
          let size = 10.5;
          size >= 9 && sheet2Layout.lines.filter((l) => !l.isParagraphBreak).length * sheet2Layout.lineHeight > pageBodyHeight * 2.4;
          size -= 0.5
        ) {
          sheet2Layout = buildSheet2Layout(size);
        }

        const addPlainPage = () => {
          pdfDoc.addPage([width, height]);
          return pdfDoc.getPage(pdfDoc.getPageCount() - 1);
        };

        let sheet2Page = addPlainPage();
        let sheet2Y = height - sheet2TopMargin;
        const s2Title = sanitizeTextForStandardFonts((secondSheetTitle || '').trim(), [fontRegular, fontBold]);
        const s2Subtitle = sanitizeTextForStandardFonts((secondSheetSubtitle || '').trim(), [fontRegular, fontBold]);

        if (s2Title) {
          const s2TitleSize = 14;
          const s2TitleWidth = fontBold.widthOfTextAtSize(s2Title, s2TitleSize);
          sheet2Page.drawText(s2Title, {
            x: margins.left + (contentWidth - s2TitleWidth) / 2,
            y: sheet2Y - s2TitleSize,
            size: s2TitleSize,
            font: fontBold,
            color: titleColor,
          });
          sheet2Y -= s2TitleSize + 10;
        }
        if (s2Subtitle) {
          const s2SubSize = 12;
          const s2SubWidth = fontBold.widthOfTextAtSize(s2Subtitle, s2SubSize);
          sheet2Page.drawText(s2Subtitle, {
            x: s2SubWidth > contentWidth
              ? margins.left
              : margins.left + (contentWidth - s2SubWidth) / 2,
            y: sheet2Y - s2SubSize,
            size: s2SubSize,
            font: fontBold,
            color: titleColor,
          });
          sheet2Y -= s2SubSize + 16;
        }

        const {
          lines: sheet2Lines,
          lineHeight: s2Lh,
          paragraphGap: s2Gap,
          fontSize: s2Fs,
          spaceWidth: s2Sw,
          measure: s2Measure,
        } = sheet2Layout;

        for (const vl of sheet2Lines) {
          if (vl.isParagraphBreak) {
            sheet2Y -= (vl.gap ?? s2Gap);
            continue;
          }
          if (vl.words.length === 0) continue;

          if (sheet2Y - s2Lh < sheet2BottomMargin) {
            sheet2Page = addPlainPage();
            sheet2Y = height - sheet2TopMargin;
          }

          let x = margins.left + (vl.indent || 0);
          for (let i = 0; i < vl.words.length; i++) {
            const wobj = vl.words[i];
            const usedFont = wobj.bold ? fontBold : fontRegular;
            let cx = x;
            for (let ci = 0; ci < wobj.text.length; ci++) {
              const ch = wobj.text[ci];
              sheet2Page.drawText(ch, {
                x: cx,
                y: sheet2Y,
                size: s2Fs,
                font: usedFont,
                color: wobj.bold ? titleColor : bodyColor,
              });
              cx += usedFont.widthOfTextAtSize(ch, s2Fs) + sheet2LetterSpacing;
            }
            x += s2Measure(wobj.text, usedFont);
            if (i !== vl.words.length - 1) x += s2Sw;
          }
          sheet2Y -= s2Lh;
        }
      }

      // Letterhead is only on page 1; still safe to run footer cleanup on all pages
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
        subject: `Offer Letter - ${form.candidateName || 'Candidate'}`,
        text: `Dear ${form.candidateName || 'Candidate'},\n\nPlease find attached your Offer Letter from ${form.company || 'Urbancode Edutech Solutions Pvt. Ltd.'}.\n\nIf you have any questions, please feel free to contact us.\n\nRegards,\nAdmin Team\nUrbancode Edutech Solutions Pvt. Ltd.`,
        pdfBytes: bytes,
        filename: `${form.candidateName || 'offer-letter'}.pdf`,
      });
      toast.success(`Offer Letter sent successfully to ${form.email.trim()}`);
    } catch (err) {
      console.error('Failed to send mail:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to send email');
    } finally {
      setSendingMail(false);
    }
  };

  const printPdf = () => {
    if (!pdfUrl) return;
    const win = window.open(pdfUrl, '_blank');
    if (win) {
      win.addEventListener('load', () => {
        win.focus();
        win.print();
      });
    }
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const uploadAndDownload = async () => {
      try {
        if (pdfBytesData) {
          const { uploadLetterBytes } = await import('../../utils/uploadLetter');
          await uploadLetterBytes(pdfBytesData, `${form.candidateName || 'offer-letter'}.pdf`, selected || undefined);
          toast.success('Saved: Letter uploaded to cloud');
        }
      } catch (err) {
        console.error('Upload failed', err);
        toast.warning('Upload failed: Letter could not be uploaded to cloud. Download will continue.');
      } finally {
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `${form.candidateName || 'offer-letter'}.pdf`;
        a.click();
      }
    };
    uploadAndDownload();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Offer Letters</Typography>

      {loading ? (
        <CircularProgress />
      ) : (
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
                {candidates.map(c => (
                  <MenuItem key={c._id} value={c._id}>{c.name} — {c.position}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField label="Name" fullWidth sx={{ mb: 2 }} value={form.candidateName} onChange={(e) => handleChange('candidateName', e.target.value)} />
            <TextField label="Recipient Email ID" type="email" fullWidth sx={{ mb: 2 }} value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="Enter candidate email address" />
            <TextField label="Offer Date" type="date" fullWidth sx={{ mb: 2 }} value={form.offerDate} onChange={(e) => handleChange('offerDate', e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField label="Address Line 1" fullWidth sx={{ mb: 2 }} value={form.addressLine1} onChange={(e) => handleChange('addressLine1', e.target.value)} />
            <TextField label="Address Line 2" fullWidth sx={{ mb: 2 }} value={form.addressLine2} onChange={(e) => handleChange('addressLine2', e.target.value)} />
            <TextField label="Designation" fullWidth sx={{ mb: 2 }} value={form.designation} onChange={(e) => handleChange('designation', e.target.value)} />
            <TextField label="Department" fullWidth sx={{ mb: 2 }} value={form.department} onChange={(e) => handleChange('department', e.target.value)} />
            <TextField label="Company" fullWidth sx={{ mb: 2 }} value={form.company} onChange={(e) => handleChange('company', e.target.value)} />
            <TextField label="Salary" fullWidth sx={{ mb: 2 }} value={form.salary} onChange={(e) => handleChange('salary', e.target.value)} />
            <TextField label="Joining Date" type="date" fullWidth sx={{ mb: 2 }} value={form.joiningDate} onChange={(e) => handleChange('joiningDate', e.target.value)} InputLabelProps={{ shrink: true }} />

            <TextField label="Probation Period (months)" fullWidth sx={{ mb: 2 }} value={form.probationPeriod} onChange={(e) => handleChange('probationPeriod', e.target.value)} />
            <TextField label="Working Hours" fullWidth sx={{ mb: 2 }} value={form.workingHours} onChange={(e) => handleChange('workingHours', e.target.value)} />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="work-location-branch-label">Work Location</InputLabel>
              <Select
                labelId="work-location-branch-label"
                value={form.workLocationBranch}
                label="Work Location"
                onChange={(e) => {
                  const branch = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    workLocationBranch: branch,
                    workLocation: OFFICE_ADDRESSES[branch] || (branch === 'Other' ? '' : prev.workLocation),
                  }));
                }}
              >
                <MenuItem value="Chennai - Pallikaranai">Chennai - Pallikaranai</MenuItem>
                <MenuItem value="Chennai - Velachery">Chennai - Velachery</MenuItem>
                <MenuItem value="Tirunelveli">Tirunelveli</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
            {form.workLocationBranch === 'Other' && (
              <TextField label="Work Location (custom)" fullWidth sx={{ mb: 2 }} value={form.workLocation} onChange={(e) => handleChange('workLocation', e.target.value)} />
            )}
            <TextField label="Notice Period (days)" fullWidth sx={{ mb: 2 }} value={form.noticePeriod} onChange={(e) => handleChange('noticePeriod', e.target.value)} />

            <TextField
              label="Founder Name"
              fullWidth
              sx={{ mb: 2 }}
              value={form.founderName}
              onChange={(e) => handleChange('founderName', e.target.value)}
            />

            <TextField
              label="Director Name"
              fullWidth
              sx={{ mb: 2 }}
              value={form.directorName}
              onChange={(e) => handleChange('directorName', e.target.value)}
            />

            <TextField
              label="Branch Head Name"
              fullWidth
              sx={{ mb: 2 }}
              value={form.branchHeadName}
              onChange={(e) => handleChange('branchHeadName', e.target.value)}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="signatory-title-label">Designation</InputLabel>
              <Select
                labelId="signatory-title-label"
                value={form.signatoryTitle}
                label="Designation"
                onChange={(e) => handleChange('signatoryTitle', e.target.value)}
              >
                <MenuItem value="Founder">Founder</MenuItem>
                <MenuItem value="Director">Director</MenuItem>
                <MenuItem value="Branch Head">Branch Head</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="letter-template-label">Letter Template</InputLabel>
              <Select
                labelId="letter-template-label"
                value={letterTemplate}
                label="Letter Template"
                onChange={(e) => {
                  const key = e.target.value;
                  const preset = LETTER_TEMPLATES[key];
                  setLetterTemplate(key);
                  setTitleText(preset.title);
                  setBody(preset.body);
                  setSecondSheetTitle(preset.secondSheetTitle || '');
                  setSecondSheetSubtitle(preset.secondSheetSubtitle || '');
                  setSecondSheetBody(preset.secondSheetBody || '');
                }}
              >
                <MenuItem value="Standard">Standard (any role)</MenuItem>
                <MenuItem value="Employment">Employment Offer Letter (Edutech wording)</MenuItem>
                <MenuItem value="Consultant">Consultant Offer Letter</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Title"
              fullWidth
              sx={{ mb: 2 }}
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
            />

            <TextField
              label="Letter Body"
              multiline
              minRows={8}
              fullWidth
              value={body}
              onChange={(e) => setBody(e.target.value)}
              sx={{ mb: 2 }}
            />

            {secondSheetBody ? (
              <>
                <TextField
                  label="Second Sheet Title"
                  fullWidth
                  sx={{ mb: 2 }}
                  value={secondSheetTitle}
                  onChange={(e) => setSecondSheetTitle(e.target.value)}
                />
                <TextField
                  label="Second Sheet Subtitle"
                  fullWidth
                  sx={{ mb: 2 }}
                  value={secondSheetSubtitle}
                  onChange={(e) => setSecondSheetSubtitle(e.target.value)}
                />
                <TextField
                  label="Second Sheet Body (Rules & Regulations)"
                  multiline
                  minRows={10}
                  fullWidth
                  value={secondSheetBody}
                  onChange={(e) => setSecondSheetBody(e.target.value)}
                  sx={{ mb: 2 }}
                />
              </>
            ) : null}

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Signature (upload PNG/JPG)</Typography>
              <input type="file" accept="image/*" onChange={handleSignatureUpload} />
              {signaturePreview && (
                <Box sx={{ mt: 1 }}>
                  <img src={signaturePreview} alt="signature preview" style={{ maxWidth: 200, maxHeight: 80 }} />
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="contained" onClick={generatePdf} disabled={generating}>{generating ? 'Generating...' : 'Generate Preview'}</Button>
              <Button variant="outlined" onClick={downloadPdf} disabled={!pdfUrl}>Download PDF</Button>
              <Button variant="outlined" onClick={printPdf} disabled={!pdfUrl}>Print</Button>
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
            {pdfUrl ? (
              <iframe title="Preview" src={pdfUrl} width="100%" height="553px" />
            ) : (
              <Box sx={{ p: 2 }}><Typography variant="body2" color="text.secondary">Preview will appear here after generating.</Typography></Box>
            )}
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default OfferLetters;
