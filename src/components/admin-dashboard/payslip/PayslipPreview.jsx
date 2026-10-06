import React, { useState } from "react";
import { Box, Button, Container, Typography, TextField, CircularProgress } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import PayslipDownloader from "./PayslipDownloader";
import PayslipTemplate from "./PayslipTemplate";
import { buildPayslipViewModel } from "../../../utils/payslipViewModel";
import { generatePayslipPdfBase64 } from "../../../utils/payslipPdf";
import { sendDocumentEmailApi } from "../../../utils/sendEmail";
import { toast } from "react-toastify";
import { FiMail } from "react-icons/fi";

const theme = createTheme({
  typography: {
    fontFamily: "Montserrat, sans-serif",
  },
});

const PayslipPreview = ({ payslipData, onBack }) => {
  const {
    employeeDetails,
    incomes,
    deductions,
    totalIncome,
    totalDeductions,
    netPay,
  } = payslipData;

  const [recipientEmail, setRecipientEmail] = useState(employeeDetails?.email || "");
  const [sendingEmail, setSendingEmail] = useState(false);

  const viewModel = buildPayslipViewModel(
    employeeDetails,
    incomes,
    deductions,
    totalIncome,
    totalDeductions,
    netPay
  );

  const handleSendMail = async () => {
    if (!recipientEmail || !recipientEmail.trim()) {
      toast.warning("Please enter a recipient email address.");
      return;
    }
    setSendingEmail(true);
    try {
      const pdfBase64 = await generatePayslipPdfBase64(viewModel);
      const fileName = `Payslip_${(employeeDetails.name || "Employee").replace(/\s+/g, "_")}_${(employeeDetails.month || "").replace(/\s+/g, "_")}.pdf`;
      await sendDocumentEmailApi({
        toEmail: recipientEmail.trim(),
        subject: `Payslip for ${employeeDetails.month || 'Selected Month'} - ${employeeDetails.name || 'Employee'}`,
        text: `Dear ${employeeDetails.name || 'Employee'},\n\nPlease find attached your Payslip for ${employeeDetails.month || 'the selected month'}.\n\nIf you have any questions, please contact HR.\n\nRegards,\nAdmin Team\nUrbancode Edutech Solutions Pvt. Ltd.`,
        pdfBase64,
        filename: fileName,
      });
      toast.success(`Payslip email sent successfully to ${recipientEmail.trim()}`);
    } catch (err) {
      console.error("Error sending payslip email:", err);
      toast.error(err.response?.data?.error || err.message || "Failed to send payslip email");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md" sx={{ my: 4 }}>
        <Box sx={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 1, p: 2, mb: 3 }}>
          <PayslipTemplate data={viewModel} />
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mb={2}>
          Before generating or sending the payslip, ensure all details are present and correct.
        </Typography>

        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            label="Recipient Email ID"
            type="email"
            size="small"
            fullWidth
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="Enter email ID to send payslip"
          />
        </Box>

        <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Button variant="outlined" onClick={onBack}>
            Back to Edit
          </Button>

          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={sendingEmail ? <CircularProgress size={20} color="inherit" /> : <FiMail />}
              onClick={handleSendMail}
              disabled={sendingEmail}
              sx={{ backgroundColor: '#0b2d67', '&:hover': { backgroundColor: '#071d44' } }}
            >
              {sendingEmail ? "Sending..." : "Send Mail"}
            </Button>

            <PayslipDownloader
              employeeDetails={{ ...employeeDetails, email: recipientEmail }}
              incomes={incomes}
              deductions={deductions}
              totalIncome={totalIncome}
              totalDeductions={totalDeductions}
              netPay={netPay}
            />
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default PayslipPreview;