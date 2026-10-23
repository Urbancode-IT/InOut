import dayjs from "dayjs";
import { rupeesInWords } from "./numberToWords";

const DEFAULT_COMPANY_NAME = "Urbancode Edutech Solutions Pvt Ltd";

/** Company policy: up to this many leave days per month are paid; excess is LOP. */
export const ALLOWED_LEAVE_DAYS_PER_MONTH = 2;

/**
 * Company policy: 2 days per month are allowed (leave + absent combined).
 * Only the excess becomes LOP.
 *
 * Examples:
 * - leave=2, absent=0 → LOP 0
 * - leave=4, absent=0 → LOP 2
 * - leave=0, absent=1 → LOP 0
 * - leave=0, absent=3 → LOP 1
 */
export function calculateLopDays(leaveDays = 0, absentDays = 0) {
  const leave = Number(leaveDays) || 0;
  const absent = Number(absentDays) || 0;
  return Math.max(0, leave + absent - ALLOWED_LEAVE_DAYS_PER_MONTH);
}

/** Profile salary is annual (/year) → monthly gross for the payslip. */
export function annualToMonthlySalary(annualSalary = 0) {
  const annual = Number(annualSalary) || 0;
  return Math.round((annual / 12) * 100) / 100;
}

/** Per-day rate from monthly gross and calendar days in the month. */
export function perDaySalary(monthlySalary = 0, daysInMonth = 0) {
  const monthly = Number(monthlySalary) || 0;
  const days = Number(daysInMonth) || 0;
  if (days <= 0) return 0;
  return monthly / days;
}

/** Monthly gross minus LOP (per-day × LOP days). */
export function calculatePaidGrossPay(monthlySalary = 0, daysInMonth = 0, lopDays = 0) {
  const days = Number(daysInMonth) || 0;
  const monthly = Number(monthlySalary) || 0;
  if (days <= 0) return monthly;
  const paidDays = Math.max(days - (Number(lopDays) || 0), 0);
  return Math.round(perDaySalary(monthly, days) * paidDays * 100) / 100;
}

const COMPANY_INFO = {
  "urbancode edutech solutions pvt ltd": {
    cin: "U46512TN2025PTC175901",
    gstin: "33AADCU7262Q1ZR",
    address: "9/29, 5th Street Kamakoti Nagar, Pallikaranai, Chennai - 600100",
    email: "admin@urbancode.in",
    website: "urbancode.in",
    phone: "98787 98797",
    tan: "",
    pfNumber: "",
    esiRegNumber: "",
  },
  jobzenter: {
    cin: "",
    gstin: "",
    address: "",
    email: "",
    website: "",
    phone: "",
    tan: "",
    pfNumber: "",
    esiRegNumber: "",
  },
};

/** Resolve company statutory defaults (TAN / PF / ESI) from employee company name. */
export function getCompanyStatutoryDefaults(company = "") {
  const key = String(company || "").trim().toLowerCase();
  if (!key) return { tan: "", pfNumber: "", esiRegNumber: "" };

  if (key.includes("jobzenter")) {
    const info = COMPANY_INFO.jobzenter || {};
    return {
      tan: info.tan || "",
      pfNumber: info.pfNumber || "",
      esiRegNumber: info.esiRegNumber || "",
    };
  }

  const urbancode =
    COMPANY_INFO["urbancode edutech solutions pvt ltd"] || {};
  return {
    tan: urbancode.tan || "",
    pfNumber: urbancode.pfNumber || "",
    esiRegNumber: urbancode.esiRegNumber || "",
  };
}

function normalizeItems(items) {
  if (Array.isArray(items)) {
    return items
      .filter((i) => i && i.label)
      .map((i) => ({ label: i.label, amount: Number(i.amount || 0) }));
  }
  return Object.entries(items || {}).map(([label, amount]) => ({
    label,
    amount: Number(amount || 0),
  }));
}

function payPeriodLabel(monthLabel) {
  const start = dayjs(monthLabel, "MMMM YYYY");
  if (!start.isValid()) return "";
  const end = start.endOf("month");
  return `${start.format("DD-MMM-YYYY").toUpperCase()} to ${end.format("DD-MMM-YYYY").toUpperCase()}`;
}

export function buildPayslipViewModel(employeeDetails = {}, incomes = [], deductions = [], totalIncome = 0, totalDeductions = 0, _netPay = 0) {
  const earnings = normalizeItems(incomes);
  const deds = normalizeItems(deductions);

  const companyName = employeeDetails.company?.toLowerCase() === "jobzenter"
    ? "Jobzenter Placement Solutions"
    : DEFAULT_COMPANY_NAME;

  const companyInfo = COMPANY_INFO[companyName.toLowerCase()] || {};

  const daysInMonth = Number(employeeDetails.totalDays || 0);
  const lopDays =
    employeeDetails.lopDays !== "" && employeeDetails.lopDays !== undefined && employeeDetails.lopDays !== null
      ? Number(employeeDetails.lopDays) || 0
      : calculateLopDays(employeeDetails.leaveDays, employeeDetails.absentDays);
  const paidDays = Math.max(daysInMonth - lopDays, 0);
  const calculatedGrossPay = Number(totalIncome || 0);
  const calculatedPaidGrossPay = calculatePaidGrossPay(calculatedGrossPay, daysInMonth, lopDays);

  const grossPay = employeeDetails.grossPay !== "" && employeeDetails.grossPay !== undefined
    ? Number(employeeDetails.grossPay)
    : calculatedGrossPay;

  const paidGrossPay = employeeDetails.paidGrossPay !== "" && employeeDetails.paidGrossPay !== undefined
    ? Number(employeeDetails.paidGrossPay)
    : calculatedPaidGrossPay;

  const monthLabel = employeeDetails.month || "";
  // Net = paid gross (after LOP) minus deductions
  const netPayNum = Math.round((Number(paidGrossPay) - Number(totalDeductions || 0)) * 100) / 100;

  return {
    companyName,
    cin: companyInfo.cin || "",
    gstin: companyInfo.gstin || "",
    address: companyInfo.address || "",
    email: companyInfo.email || "",
    website: companyInfo.website || "",
    phone: companyInfo.phone || "",

    tan: employeeDetails.tan || "",
    pfNumber: employeeDetails.pfNumber || "",
    esiRegNumber: employeeDetails.esiRegNumber || "",
    mobile: employeeDetails.mobile || "",

    payPeriodLabel: payPeriodLabel(monthLabel),
    monthLabel,

    payslipReference:
      employeeDetails.payslipReference ||
      (employeeDetails.employeeId
        ? `PS-${employeeDetails.employeeId}-${monthLabel.replace(/\s+/g, "")}`
        : ""),
    generatedOn: employeeDetails.generatedDate
      ? dayjs(employeeDetails.generatedDate).format("DD-MMM-YYYY")
      : dayjs().format("DD-MMM-YYYY"),

    name: employeeDetails.name || "",
    empId: employeeDetails.employeeId || "",
    empGrade: employeeDetails.empGrade || "",

    pan: employeeDetails.pan || "",
    uan: employeeDetails.uan || "",
    esi: employeeDetails.esiNumber || "",

    bankName: employeeDetails.bankAccountName || "",
    bankAccNo: employeeDetails.bankAccountNumber || "",
    ifsc: employeeDetails.ifsc || "",

    daysInMonth,
    lopDays,
    paidDays,

    ctc: employeeDetails.ctc || "",
    grossPay: grossPay.toFixed(2),
    paidGrossPay: paidGrossPay.toFixed(2),

    department: employeeDetails.department || "",
    designation: employeeDetails.designation || "",

    joiningDate: employeeDetails.dateOfJoining
      ? dayjs(employeeDetails.dateOfJoining).format("DD-MMM-YYYY")
      : "",
    workingLocation: employeeDetails.workingLocation || "",

    earnings,
    deductions: deds,
    totalEarnings: Number(totalIncome || 0),
    totalDeductions: Number(totalDeductions || 0),
    netPay: netPayNum,
    netPayWords: rupeesInWords(netPayNum),
    remittedOn: employeeDetails.remittedOn
      ? dayjs(employeeDetails.remittedOn).isValid()
        ? dayjs(employeeDetails.remittedOn).format("DD-MMM-YYYY")
        : employeeDetails.remittedOn
      : "",
  };
}
