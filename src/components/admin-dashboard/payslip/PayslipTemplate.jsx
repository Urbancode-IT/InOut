import React from "react";
import uclogo from "../../../assets/uclogo.png";

const GREEN = "#149c63";
const BORDER = "1px solid #1a1a1a";

const cellStyle = {
  border: BORDER,
  padding: "8px 12px",
  fontSize: 13,
  color: "#1a1a1a",
  verticalAlign: "middle",
};

const labelStyle = {
  ...cellStyle,
  fontWeight: 600,
};

const formatMoney = (amount) =>
  Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Empty / missing values → "-" */
const d = (value) => {
  if (value === 0 || value === "0") return "0";
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text === "" ? "-" : text;
};

const PayslipTemplate = ({ data }) => {
  const {
    companyName,
    cin,
    gstin,
    address,
    email,
    website,
    phone,
    tan,
    pfNumber,
    esiRegNumber,
    mobile,
    payPeriodLabel,
    monthLabel,
    payslipReference,
    generatedOn,
    name,
    empId,
    empGrade,
    pan,
    uan,
    esi,
    bankName,
    bankAccNo,
    ifsc,
    daysInMonth,
    lopDays,
    paidDays,
    ctc,
    grossPay,
    paidGrossPay,
    department,
    designation,
    joiningDate,
    workingLocation,
    earnings = [],
    deductions = [],
    totalEarnings,
    totalDeductions,
    netPay,
    netPayWords,
    remittedOn,
  } = data;

  const rowCount = Math.max(earnings.length, deductions.length, 1);

  return (
    <div
      style={{
        width: 760,
        background: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: 24,
        boxSizing: "border-box",
        color: "#1a1a1a",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <img src={uclogo} alt="logo" style={{ width: 46, height: 46, borderRadius: 8 }} />
        <h1 style={{ color: GREEN, fontSize: 28, margin: 0, fontWeight: 800 }}>{companyName}</h1>
      </div>
      <div style={{ textAlign: "center", fontSize: 11, marginTop: 4, marginBottom: 14 }}>
        {cin && <span>CIN - {cin}</span>}
        {cin && gstin && <span>&nbsp;||&nbsp;</span>}
        {gstin && <span>GSTIN - {gstin}</span>}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", border: BORDER }}>
        <tbody>
          <tr>
            <td style={labelStyle}>TAN : <span style={{ fontWeight: 400 }}>{d(tan)}</span></td>
            <td style={labelStyle}>PF : <span style={{ fontWeight: 400 }}>{d(pfNumber)}</span></td>
            <td style={labelStyle}>ESI : <span style={{ fontWeight: 400 }}>{d(esiRegNumber)}</span></td>
          </tr>
          <tr>
            <td style={labelStyle} colSpan={2}>Pay Period : <span style={{ fontWeight: 400 }}>{d(payPeriodLabel)}</span></td>
            <td style={labelStyle}>Mobile : <span style={{ fontWeight: 400 }}>{d(mobile)}</span></td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, textAlign: "center", fontWeight: 700, fontSize: 17 }} colSpan={3}>
              Payslip for the Month Of {d(monthLabel)}
            </td>
          </tr>
          <tr>
            <td style={labelStyle} colSpan={2}>Payslip Reference : <span style={{ fontWeight: 400 }}>{d(payslipReference)}</span></td>
            <td style={labelStyle}>Generated On : <span style={{ fontWeight: 400 }}>{d(generatedOn)}</span></td>
          </tr>
          <tr>
            <td style={labelStyle}>Name : <span style={{ fontWeight: 400 }}>{d(name)}</span></td>
            <td style={labelStyle}>Emp ID : <span style={{ fontWeight: 400 }}>{d(empId)}</span></td>
            <td style={labelStyle}>Emp Grade : <span style={{ fontWeight: 400 }}>{d(empGrade)}</span></td>
          </tr>
          <tr>
            <td style={labelStyle}>Pan : <span style={{ fontWeight: 400 }}>{d(pan)}</span></td>
            <td style={labelStyle}>PF-UAN : <span style={{ fontWeight: 400 }}>{d(uan)}</span></td>
            <td style={labelStyle}>ESI : <span style={{ fontWeight: 400 }}>{d(esi)}</span></td>
          </tr>
          <tr>
            <td style={labelStyle}>Bank : <span style={{ fontWeight: 400 }}>{d(bankName)}</span></td>
            <td style={labelStyle}>Bank Acc No : <span style={{ fontWeight: 400 }}>{d(bankAccNo)}</span></td>
            <td style={labelStyle}>IFSC : <span style={{ fontWeight: 400 }}>{d(ifsc)}</span></td>
          </tr>
          <tr>
            <td style={labelStyle}>Days in Month : <span style={{ fontWeight: 400 }}>{d(daysInMonth)}</span></td>
            <td style={labelStyle}>LOP Days : <span style={{ fontWeight: 400 }}>{d(lopDays)}</span></td>
            <td style={labelStyle}>Paid Days : <span style={{ fontWeight: 400 }}>{d(paidDays)}</span></td>
          </tr>
          <tr>
            <td style={labelStyle}>CTC : <span style={{ fontWeight: 400 }}>{d(ctc)}</span></td>
            <td style={labelStyle}>Gross Pay : <span style={{ fontWeight: 400 }}>{d(grossPay)}</span></td>
            <td style={labelStyle}>Paid Gross Pay : <span style={{ fontWeight: 400 }}>{d(paidGrossPay)}</span></td>
          </tr>
          <tr>
            <td style={labelStyle} colSpan={2}>Department : <span style={{ fontWeight: 400 }}>{d(department)}</span></td>
            <td style={labelStyle}>Designation : <span style={{ fontWeight: 400 }}>{d(designation)}</span></td>
          </tr>
          <tr>
            <td style={labelStyle} colSpan={2}>Joining Date : <span style={{ fontWeight: 400 }}>{d(joiningDate)}</span></td>
            <td style={labelStyle}>Working Location : <span style={{ fontWeight: 400 }}>{d(workingLocation)}</span></td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, height: 22 }} colSpan={3}>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", border: BORDER, borderTop: "none", marginTop: -1 }}>
        <tbody>
          <tr>
            <td style={{ ...cellStyle, color: GREEN, fontWeight: 700, width: "30%" }}>Earnings</td>
            <td style={{ ...cellStyle, color: GREEN, fontWeight: 700, width: "20%" }}>Amount</td>
            <td style={{ ...cellStyle, color: GREEN, fontWeight: 700, width: "30%" }}>Deduction</td>
            <td style={{ ...cellStyle, color: GREEN, fontWeight: 700, width: "20%" }}>Amount</td>
          </tr>
          {Array.from({ length: rowCount }).map((_, i) => (
            <tr key={i}>
              <td style={cellStyle}>{earnings[i]?.label || ""}</td>
              <td style={cellStyle}>{earnings[i] ? formatMoney(earnings[i].amount) : ""}</td>
              <td style={cellStyle}>{deductions[i]?.label || ""}</td>
              <td style={cellStyle}>{deductions[i] ? formatMoney(deductions[i].amount) : ""}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cellStyle, textAlign: "right", fontWeight: 700 }}>Total Earning(E)</td>
            <td style={{ ...cellStyle, fontWeight: 700 }}>{formatMoney(totalEarnings)}</td>
            <td style={{ ...cellStyle, textAlign: "right", fontWeight: 700 }}>Total Deduction(D)</td>
            <td style={{ ...cellStyle, fontWeight: 700 }}>{formatMoney(totalDeductions)}</td>
          </tr>
          <tr>
            <td style={cellStyle} colSpan={2} rowSpan={2}>
              <div style={{ fontWeight: 600 }}>Net Pay-Amount in Words:</div>
              <div style={{ marginTop: 4 }}>{d(netPayWords)}</div>
            </td>
            <td style={labelStyle} colSpan={2}>
              Net Pay(E-D): <span style={{ fontWeight: 700 }}>{formatMoney(netPay)}</span>
            </td>
          </tr>
          <tr>
            <td style={labelStyle} colSpan={2}>
              Remitted On: <span style={{ fontWeight: 400 }}>{d(remittedOn)}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: "center", fontSize: 10.5, marginTop: 18, color: "#333" }}>
        This is a computer generated payslip and does not require signature. For any discrepancies,
        <br />
        please contact Management within 7 days.
      </div>

      <div style={{ textAlign: "center", marginTop: 26 }}>
        <h2 style={{ color: GREEN, margin: 0, fontSize: 22, fontWeight: 800 }}>{companyName}</h2>
        {address && <div style={{ fontSize: 11, marginTop: 4 }}>{address}</div>}
      </div>

      {(email || website || phone) && (
        <div style={{ background: GREEN, color: "#fff", textAlign: "center", padding: "9px 0", marginTop: 14, fontSize: 11 }}>
          {email && <span>Email : {email}</span>}
          {email && website && <span>&nbsp;|&nbsp;</span>}
          {website && <span>Website : {website}</span>}
          {(email || website) && phone && <span>&nbsp;|&nbsp;</span>}
          {phone && <span>Ph no : {phone}</span>}
        </div>
      )}
    </div>
  );
};

export default PayslipTemplate;
