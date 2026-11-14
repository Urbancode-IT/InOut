/**
 * Metadata-only registry for the centralized Letter Generator hub.
 * Does NOT contain letter body text — existing page components own templates/PDF layout.
 */

export const LETTER_TEMPLATE_IDS = {
  STANDARD_OFFER: 'standard-offer',
  CONSULTANT_OFFER: 'consultant-offer',
  INTERNSHIP_OFFER: 'internship-offer',
  EXPERIENCE: 'experience',
  RELIEVING: 'relieving',
  INTERNSHIP_CERTIFICATE: 'internship-certificate',
};

/** Map stored letterType (All Letters) → hub template id */
export const LETTER_TYPE_TO_TEMPLATE = {
  offer: LETTER_TEMPLATE_IDS.STANDARD_OFFER,
  experience: LETTER_TEMPLATE_IDS.EXPERIENCE,
  relieving: LETTER_TEMPLATE_IDS.RELIEVING,
  'internship-offer': LETTER_TEMPLATE_IDS.INTERNSHIP_OFFER,
  internship: LETTER_TEMPLATE_IDS.INTERNSHIP_CERTIFICATE,
};

/**
 * Fields each existing page already shows (for QA / documentation).
 * Hub does not invent new fields — it embeds the existing form.
 */
export const LETTER_TEMPLATES = [
  {
    id: LETTER_TEMPLATE_IDS.STANDARD_OFFER,
    label: 'Standard Employee Offer Letter',
    letterType: 'offer',
    componentKey: 'offer',
    forcedOfferPreset: 'Standard',
    employeeRequired: true,
    fields: [
      'candidateName', 'email', 'offerDate', 'addressLine1', 'addressLine2',
      'designation', 'department', 'company', 'salary', 'joiningDate',
      'probationPeriod', 'workingHours', 'workLocation', 'noticePeriod',
      'founderName', 'directorName', 'branchHeadName', 'signatoryTitle',
      'title', 'body', 'signature',
    ],
  },
  {
    id: LETTER_TEMPLATE_IDS.CONSULTANT_OFFER,
    label: 'Consultant Offer Letter',
    letterType: 'offer',
    componentKey: 'offer',
    forcedOfferPreset: 'Consultant',
    employeeRequired: true,
    fields: [
      'candidateName', 'email', 'offerDate', 'addressLine1', 'addressLine2',
      'designation', 'department', 'company', 'salary', 'joiningDate',
      'probationPeriod', 'workingHours', 'workLocation', 'noticePeriod',
      'founderName', 'directorName', 'branchHeadName', 'signatoryTitle',
      'title', 'body', 'secondSheet', 'signature',
    ],
  },
  {
    id: LETTER_TEMPLATE_IDS.INTERNSHIP_OFFER,
    label: 'Internship Offer Letter',
    letterType: 'internship-offer',
    componentKey: 'internshipOffer',
    forcedOfferPreset: null,
    employeeRequired: true,
    fields: [
      'candidateName', 'email', 'addressLine1', 'location', 'country',
      'collegeName', 'designation', 'company', 'duration', 'joiningDate',
      'title', 'letterDate', 'body', 'signature',
    ],
  },
  {
    id: LETTER_TEMPLATE_IDS.EXPERIENCE,
    label: 'Experience Letter',
    letterType: 'experience',
    componentKey: 'experience',
    forcedOfferPreset: null,
    employeeRequired: true,
    fields: [
      'candidateName', 'email', 'designation', 'company',
      'joiningDate', 'relievingDate', 'title', 'letterDate', 'body', 'signature',
    ],
  },
  {
    id: LETTER_TEMPLATE_IDS.RELIEVING,
    label: 'Relieving Letter',
    letterType: 'relieving',
    componentKey: 'relieving',
    forcedOfferPreset: null,
    employeeRequired: true,
    fields: [
      'candidateName', 'email', 'designation', 'company',
      'joiningDate', 'relievingDate', 'title', 'letterDate', 'body', 'signature',
    ],
  },
  {
    id: LETTER_TEMPLATE_IDS.INTERNSHIP_CERTIFICATE,
    label: 'Internship Certificate',
    letterType: 'internship',
    componentKey: 'internshipCertificate',
    forcedOfferPreset: null,
    // Students may not be users — employee select is optional
    employeeRequired: false,
    fields: [
      'salutation', 'studentName', 'email', 'collegeName', 'address',
      'registrationNumber', 'designation', 'company', 'duration',
      'startDate', 'endDate', 'subject', 'letterDate',
      'directorName', 'directorTitle', 'body', 'signature', 'seal',
    ],
  },
];

export const getLetterTemplateById = (id) =>
  LETTER_TEMPLATES.find((t) => t.id === id) || LETTER_TEMPLATES[0];

export const resolveTemplateIdFromLetterType = (letterType, hints = {}) => {
  const type = String(letterType || '').toLowerCase();
  if (type === 'offer') {
    const hay = [hints.letterName, hints.filename, hints.url]
      .filter(Boolean)
      .map((p) => String(p).toLowerCase())
      .join(' ');
    if (/consultant/.test(hay)) return LETTER_TEMPLATE_IDS.CONSULTANT_OFFER;
    return LETTER_TEMPLATE_IDS.STANDARD_OFFER;
  }
  return LETTER_TYPE_TO_TEMPLATE[type] || LETTER_TEMPLATE_IDS.STANDARD_OFFER;
};
