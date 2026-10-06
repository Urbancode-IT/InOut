import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import PayslipPreview from "../../components/admin-dashboard/payslip/PayslipPreview";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import dayjs from "dayjs";
import axios from "axios";
import uclogo from "../../assets/logo.png";
import jzlogo from "../../assets/jzlogo.png";
import { API_ENDPOINTS } from "../../utils/api";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Loader from "../../components/admin-dashboard/common/Loader";
import { localDateYMD } from "../../utils/localDate";
import {
  enrichLogNames,
  getLogTimestamp,
  normalizeLogs,
} from "../../utils/dashboardLogs";
import {
  annualToMonthlySalary,
  calculateLopDays,
  calculatePaidGrossPay,
} from "../../utils/payslipViewModel";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const normalizeName = (name) => (name || "").trim().toLowerCase();

const normalizeWeeklySchedule = (ws) => {
  if (!ws || typeof ws !== "object") return {};
  const dayMap = {
    sun: "Sunday", sunday: "Sunday",
    mon: "Monday", monday: "Monday",
    tue: "Tuesday", tues: "Tuesday", tuesday: "Tuesday",
    wed: "Wednesday", wednesday: "Wednesday",
    thu: "Thursday", thur: "Thursday", thurs: "Thursday", thursday: "Thursday",
    fri: "Friday", friday: "Friday",
    sat: "Saturday", saturday: "Saturday",
  };
  const out = {};
  Object.entries(ws).forEach(([day, val]) => {
    const lower = String(day).trim().toLowerCase();
    const full = dayMap[lower] || (day.charAt(0).toUpperCase() + day.slice(1).toLowerCase());
    if (WEEKDAYS.includes(full)) out[full] = val;
  });
  return out;
};

const getDayName = (date) => date.toLocaleDateString("en-US", { weekday: "long" });

const isScheduledWorkDay = (dateObj, weeklySchedule, isHolidayDate) => {
  if (isHolidayDate || dateObj.getDay() === 0) return false;
  if (dateObj.getDay() === 6) return true;
  const norm = normalizeWeeklySchedule(weeklySchedule);
  if (Object.keys(norm).length === 0) return true;
  const daySchedule = norm[getDayName(dateObj)];
  if (daySchedule === undefined) return false;
  return !daySchedule.isLeave;
};

const isOfficeLeaveDay = (dateObj, scheduled) =>
  dateObj.getDay() === 0 || (dateObj.getDay() !== 6 && !!scheduled?.isLeave);

const eachDateInRange = (from, to) => {
  const dates = [];
  const start = new Date(from);
  const end = new Date(to);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return dates;
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

const normalizeHolidayList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.holidays)) return data.holidays;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const fetchPayslipAttendanceLogs = async (headers, users) => {
  try {
    const res = await axios.get(
      `${API_ENDPOINTS.getRecentDashboardLogs}?days=1095&_=${Date.now()}`,
      { headers }
    );
    const rows = enrichLogNames(normalizeLogs(res.data), users);
    if (rows.length > 0) return rows;
  } catch {
    /* fall through */
  }

  try {
    const res = await axios.get(API_ENDPOINTS.getRecentAttendanceLogs, { headers });
    return enrichLogNames(normalizeLogs(res.data), users);
  } catch {
    return [];
  }
};

const PayslipGenerator = () => {
  const [companyLogo, setCompanyLogo] = useState(uclogo);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [logs, setLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  

  const [employeeDetails, setEmployeeDetails] = useState({
    name: "",
    userId: "",
    employeeId: "",
    designation: "",
    department: "",
    company: "",
    bankAccountName: "",
    bankAccountNumber: "",
    dateOfJoining: "",
    generatedDate: dayjs().format("YYYY-MM-DD"),
    // paymentDate: "",
    month: dayjs().format("MMMM YYYY"),
    email: "",
    workingDays: 0,
    leaveDays: 0,
    lateDays: 0,
    halfDays: 0,
    absentDays: 0,
    lopDays: 0,
    totalDays: 0,
    presentDays: 0,
    empGrade: "",
    tan: "",
    pfNumber: "",
    esiRegNumber: "",
    pan: "",
    uan: "",
    esiNumber: "",
    ifsc: "",
    ctc: "",
    grossPay: "",
    paidGrossPay: "",
    workingLocation: "Chennai",
    mobile: "",
    remittedOn: "",
  });

  const [incomes, setIncomes] = useState([
    { label: "Basic Pay", amount: 40000 },
    { label: "HRA", amount: 10000 },
  ]);

  const [deductions, setDeductions] = useState([
    { label: "PF", amount: 2000 },
    { label: "TDS", amount: 1500 },
  ]);

  const findEmployeeProfile = (employeeName, sampleLog) => {
    if (!employeeName || !Array.isArray(users) || users.length === 0) return null;
    const userId = sampleLog?.userId ?? sampleLog?.user?._id ?? sampleLog?.user?.id;
    if (userId != null) {
      const byId = users.find((u) => String(u._id) === String(userId));
      if (byId) return byId;
    }
    const target = String(employeeName).trim().toLowerCase();
    return (
      users.find((u) => String(u.name || "").trim().toLowerCase() === target) || null
    );
  };

  const profileField = (value) => {
    if (value == null) return "";
    const text = String(value).trim();
    return text;
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [schedulesRes, usersRes, leavesRes, holidaysRes] = await Promise.all([
          axios.get(API_ENDPOINTS.getSchedules, { headers }),
          axios
            .get(`${API_ENDPOINTS.getUsers}?_=${Date.now()}`, { headers })
            .catch((err) => {
              console.error("Error loading users for payslip autofill:", err);
              return { data: [] };
            }),
          axios.get(API_ENDPOINTS.getAllLeaves, { headers }).catch(() => ({ data: [] })),
          axios.get(API_ENDPOINTS.getHolidays, { headers }).catch(() => ({ data: [] })),
        ]);
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
        const logsData = await fetchPayslipAttendanceLogs(headers, usersData);

        setLogs(logsData);
        setSchedules(Array.isArray(schedulesRes.data) ? schedulesRes.data : []);
        setUsers(usersData);
        setLeaves(Array.isArray(leavesRes.data) ? leavesRes.data : []);
        setHolidays(normalizeHolidayList(holidaysRes.data));

        const names = [
          ...new Set(
            logsData
              .map((log) => log.employeeName || log.user?.name || "Unknown")
              .filter((n) => n && n !== "Unknown")
          ),
        ];
        setEmployees(names);
      } catch (err) {
        console.error("Error loading payslip data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedEmployee || loading) return;

    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const allDates = Array.from(
      { length: new Date(year, month + 1, 0).getDate() },
      (_, i) => new Date(year, month, i + 1)
    );

    const empKey = normalizeName(selectedEmployee);
    const holidayKeys = new Set(
      holidays
        .map((h) => localDateYMD(h.date))
        .filter((key) => {
          if (!key) return false;
          const d = new Date(`${key}T00:00:00`);
          return d.getFullYear() === year && d.getMonth() === month;
        })
    );
    const isHolidayDate = (dateObj) => holidayKeys.has(localDateYMD(dateObj));

    const isOnApprovedLeave = (dateObj) => {
      const key = localDateYMD(dateObj);
      return leaves.some((leave) => {
        const name = leave.user?.name || leave.employeeName;
        if (normalizeName(name) !== empKey) return false;
        if ((leave.status || "").toLowerCase() !== "approved") return false;
        return eachDateInRange(leave.fromDate, leave.toDate).some(
          (d) => localDateYMD(d) === key
        );
      });
    };

    const filteredLogs = logs.filter((log) => {
      const ts = getLogTimestamp(log);
      if (!ts) return false;
      const logName = log.employeeName || log.user?.name || "";
      return (
        normalizeName(logName) === empKey &&
        ts.getFullYear() === year &&
        ts.getMonth() === month
      );
    });

    const grouped = {};
    filteredLogs.forEach((log) => {
      const ts = getLogTimestamp(log);
      if (!ts) return;
      const dateKey = ts.toDateString();
      if (!grouped[dateKey]) grouped[dateKey] = { checkIn: null, checkOut: null };
      if (log.type === "check-in") grouped[dateKey].checkIn = log;
      if (log.type === "check-out") grouped[dateKey].checkOut = log;
    });

    const userSchedule = schedules.find(
      (sch) => normalizeName(sch.user?.name) === empKey
    );
    const weeklySchedule = normalizeWeeklySchedule(userSchedule?.weeklySchedule || {});

    let workingDays = 0;
    let leaveDays = 0;
    let lateDays = 0;
    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    allDates.forEach((date) => {
      if (date > today) return;

      const dateKey = date.toDateString();
      const dayName = getDayName(date);
      const scheduled = weeklySchedule[dayName];
      const holiday = isHolidayDate(date);
      const workDay = isScheduledWorkDay(date, weeklySchedule, holiday);
      const onLeave = isOnApprovedLeave(date);
      const attendance = grouped[dateKey];

      if (holiday) return;

      if (onLeave) {
        leaveDays++;
        return;
      }

      if (isOfficeLeaveDay(date, scheduled)) return;

      if (workDay) workingDays++;

      if (attendance?.checkIn) {
        presentDays++;

        if (scheduled?.start) {
          const [h, m] = scheduled.start.split(":").map(Number);
          const expected = new Date(date);
          expected.setHours(h, m + 10, 0, 0);
          const actual =
            getLogTimestamp(attendance.checkIn) ||
            new Date(attendance.checkIn.timestamp);
          const diffMinutes = (actual - expected) / 60000;

          if (diffMinutes >= 60) halfDays++;
          else if (diffMinutes > 0) lateDays++;
        }
      } else if (workDay) {
        absentDays++;
      }
    });

    const sampleLog = logs.find(
      (l) => normalizeName(l.employeeName || l.user?.name) === empKey
    );
    let profile = findEmployeeProfile(selectedEmployee, sampleLog);
    const resolvedUserId = sampleLog?.userId || sampleLog?.user?._id || profile?._id;

    const applyProfileToForm = (resolvedProfile) => {
      const annualSalary = Number(resolvedProfile?.salary) || 0;
      const monthlySalary = annualToMonthlySalary(annualSalary);

      setEmployeeDetails((prev) => ({
        ...prev,
        name: selectedEmployee,
        userId: resolvedUserId || resolvedProfile?._id,
        employeeId: resolvedProfile?.employeeId || sampleLog?._id || "uc_202501",
        designation: resolvedProfile?.position || sampleLog?.position || "Software Engineer",
        department: resolvedProfile?.department || sampleLog?.department || "Development",
        company: resolvedProfile?.company || sampleLog?.company || "",
        month: dayjs(selectedMonth).format("MMMM YYYY"),
        totalDays: allDates.length,
        bankAccountName:
          resolvedProfile?.bankDetails?.bankingName ||
          sampleLog?.bankDetails?.bankingName ||
          "",
        bankAccountNumber:
          resolvedProfile?.bankDetails?.bankAccountNumber ||
          sampleLog?.bankDetails?.bankAccountNumber ||
          sampleLog?.bankDetails?.accountNumber ||
          "",
        empGrade: profileField(resolvedProfile?.empGrade),
        pan: profileField(resolvedProfile?.pan),
        uan: profileField(resolvedProfile?.uan),
        esiNumber: profileField(resolvedProfile?.esiNumber),
        ifsc: profileField(
          resolvedProfile?.bankDetails?.ifscCode || sampleLog?.bankDetails?.ifscCode
        ),
        mobile: resolvedProfile?.phone || sampleLog?.phone || "",
        email: resolvedProfile?.email || sampleLog?.user?.email || sampleLog?.email || "",
        dateOfJoining: (resolvedProfile?.dateOfJoining || sampleLog?.dateOfJoining)
          ? dayjs(resolvedProfile?.dateOfJoining || sampleLog?.dateOfJoining).format(
              "YYYY-MM-DD"
            )
          : "",
        ctc: annualSalary > 0 ? String(annualSalary) : "",
        grossPay: "",
        paidGrossPay: "",
        workingDays,
        leaveDays,
        lateDays,
        halfDays,
        absentDays,
        lopDays: calculateLopDays(leaveDays, absentDays),
        presentDays,
      }));

      if (annualSalary > 0) {
        setIncomes([{ label: "Basic Pay", amount: monthlySalary }]);
      } else {
        setIncomes([{ label: "Basic Pay", amount: 0 }]);
      }
    };

    // Fill immediately from list, then refresh full profile by id (empGrade/PAN/etc.).
    applyProfileToForm(profile);

    if (resolvedUserId) {
      const token = localStorage.getItem("token");
      axios
        .get(API_ENDPOINTS.getUserById(resolvedUserId), {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(({ data }) => {
          if (data && typeof data === "object") {
            applyProfileToForm(data);
          }
        })
        .catch((err) => {
          console.error("Error loading full employee profile for payslip:", err);
        });
    }
    // Autofill only on employee/month change or after initial load so manual edits stick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee, selectedMonth, loading]);


const theme = createTheme({
  typography: {
    fontFamily: 'Montserrat, sans-serif',
  },
});

  const handleChange = (section, index, field, value) => {
    const updater = section === "income" ? [...incomes] : [...deductions];
      // Convert amount to number safely
  if (field === "amount") {
    updater[index][field] = Number(value) || 0;
  } else {
    updater[index][field] = value;
  }
    
    section === "income" ? setIncomes(updater) : setDeductions(updater);
  };

  const addRow = (section) => {
    const row = { label: "", amount: 0 };
    section === "income" ? setIncomes([...incomes, row]) : setDeductions([...deductions, row]);
  };

  const removeRow = (section, index) => {
    const updater = section === "income" ? [...incomes] : [...deductions];
    updater.splice(index, 1);
    section === "income" ? setIncomes(updater) : setDeductions(updater);
  };

  const totalIncome = incomes.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalDeductions = deductions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const daysInMonth = Number(employeeDetails.totalDays) || 0;
  const lopDays =
    employeeDetails.lopDays !== "" && employeeDetails.lopDays !== undefined
      ? Number(employeeDetails.lopDays) || 0
      : calculateLopDays(employeeDetails.leaveDays, employeeDetails.absentDays);
  const paidGrossPay = calculatePaidGrossPay(totalIncome, daysInMonth, lopDays);
  const netPay = Math.round((paidGrossPay - totalDeductions) * 100) / 100;

  const handleAttendanceChange = (key, value) => {
    const next = { ...employeeDetails, [key]: value };
    if (key === "leaveDays" || key === "absentDays") {
      next.lopDays = calculateLopDays(next.leaveDays, next.absentDays);
    }
    setEmployeeDetails(next);
  };

  if (loading) {
    return (
      // <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      //   <CircularProgress />
      // </Box>
      <Loader/>
    );
  }

  if (previewMode) {
    return (
      <PayslipPreview
        payslipData={{
          employeeDetails,
          incomes,
          deductions,
          totalIncome,
          totalDeductions,
          netPay,
          companyLogo,
          
        }}
        onBack={() => setPreviewMode(false)}
      />
    );
  }

  return (
    <ThemeProvider theme={theme}>
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
          
          <Typography variant="h5" fontWeight="bold" >
            <span className="text-gray-600">
            Pay Slip Generator</span>
          </Typography>
        </Box>

      <Paper elevation={3} sx={{ p: 4,border:'1px solid #ddd', borderRadius: 3, mt: 3 }}>
        {/* Header with logo */}
        
    
       

        {/* Employee & Month Selector */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6}>
            <TextField
  select
  sx={{
    minWidth: 300,
    '& .MuiInputLabel-root': { color: '#159C8E' },
    '& .MuiFilledInput-root': {
      backgroundColor: '#f9fafb',
      '&:hover': { backgroundColor: '#f1f5f9' },
      '&.Mui-focused': { backgroundColor: '#fff' }
    },
    '& .MuiFilledInput-underline:after': {
      borderBottomColor: '#159C8E'
    }
  }}
  fullWidth
  label="Select Employee"
  variant="filled"
  value={selectedEmployee}
  onChange={(e) => setSelectedEmployee(e.target.value)}
>
  <MenuItem value="" disabled>
    Select Employee
  </MenuItem>
  {employees.map((employee) => (
    <MenuItem
      key={employee._id || employee}
      value={employee.name || employee}
    >
      {employee.name || employee}
    </MenuItem>
  ))}
</TextField>

          </Grid>
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                views={["year", "month"]}
                openTo="month"
                label="Select Month"
                value={selectedMonth}
                onChange={(newValue) => {
                  if (newValue) setSelectedMonth(newValue);
                }}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
 <Divider sx={{ my: 2 }} />
        {/* Employee Info */}
        <Grid container spacing={2}>
          {["name", "designation", "department","employeeId"].map((field) => (
            <Grid item xs={12} sm={6} key={field}>
              <TextField
                fullWidth
                label={field.charAt(0).toUpperCase() + field.slice(1)}
                value={employeeDetails[field]}
                onChange={(e) =>
                  setEmployeeDetails({ ...employeeDetails, [field]: e.target.value })
                }
              />
            </Grid>
          ))}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Recipient Email ID"
              type="email"
              value={employeeDetails.email || ""}
              onChange={(e) =>
                setEmployeeDetails({ ...employeeDetails, email: e.target.value })
              }
              helperText="Email where payslip PDF will be sent"
            />
          </Grid>
        </Grid>
        
        <Grid container spacing={2} mt={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Bank Account Name"
              value={employeeDetails.bankAccountName}
              onChange={(e) =>
                setEmployeeDetails({ ...employeeDetails, bankAccountName: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Bank Account Number"
              value={employeeDetails.bankAccountNumber}
              onChange={(e) =>
                setEmployeeDetails({ ...employeeDetails, bankAccountNumber: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Date of Joining"
              InputLabelProps={{ shrink: true }}
              value={employeeDetails.dateOfJoining}
              onChange={(e) =>
                setEmployeeDetails({ ...employeeDetails, dateOfJoining: e.target.value })
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Generated Date"
              InputLabelProps={{ shrink: true }}
              value={employeeDetails.generatedDate}
              onChange={(e) =>
                setEmployeeDetails({ ...employeeDetails, generatedDate: e.target.value })
              }
            />
          </Grid>
        </Grid>
 <Divider sx={{ my: 2 }} />
        {/* Statutory & Other Details */}
        <Box mt={1} mb={2}>
          <Typography variant="h6" gutterBottom>
            Statutory & Other Details
          </Typography>
          <Grid container spacing={2}>
            {[
              { key: "tan", label: "Company TAN" },
              { key: "pfNumber", label: "Company PF" },
              { key: "esiRegNumber", label: "Company ESI" },
              { key: "empGrade", label: "Emp Grade" },
              { key: "pan", label: "PAN" },
              { key: "uan", label: "PF-UAN" },
              { key: "esiNumber", label: "ESI Number" },
              { key: "ifsc", label: "IFSC" },
              { key: "ctc", label: "CTC" },
              { key: "grossPay", label: "Gross Pay (Optional Override)" },
              { key: "paidGrossPay", label: "Paid Gross Pay (Optional Override)" },
              { key: "workingLocation", label: "Working Location" },
              { key: "mobile", label: "Mobile" },
            ].map(({ key, label }) => (
              <Grid item xs={12} sm={6} md={3} key={key}>
                <TextField
                  fullWidth
                  label={label}
                  value={employeeDetails[key]}
                  onChange={(e) =>
                    setEmployeeDetails({ ...employeeDetails, [key]: e.target.value })
                  }
                />
              </Grid>
            ))}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="date"
                label="Remitted On"
                InputLabelProps={{ shrink: true }}
                value={employeeDetails.remittedOn}
                onChange={(e) =>
                  setEmployeeDetails({ ...employeeDetails, remittedOn: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </Box>
 <Divider sx={{ my: 2 }} />
        {/* Attendance Summary */}
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Attendance Summary
          </Typography>
          <Grid container spacing={2}>
            {[
              "totalDays",
              "workingDays",
              "presentDays",
              "leaveDays",
              "lateDays",
              "halfDays",
              "absentDays",
              "lopDays",
            ].map((key) => (
              <Grid item xs={6} sm={3} key={key}>
                <TextField
                  fullWidth
                  label={key === "lopDays" ? "LOP Days" : key.replace(/([A-Z])/g, " $1")}
                  value={employeeDetails[key]}
                  onChange={(e) => handleAttendanceChange(key, e.target.value)}
                  helperText={
                    key === "lopDays"
                      ? "Only days above 2 (leave + absent)"
                      : undefined
                  }
                />
              </Grid>
            ))}
          </Grid>
        </Box>
 <Divider sx={{ my: 2 }} />
        {/* Incomes */}
        <Box mt={4}>
          <Typography variant="h6">Income</Typography>
          {incomes.map((item, index) => (
            <Grid container spacing={2} key={index} alignItems="center" mt={1}>
              <Grid item xs={6}>
                <TextField
                  label="Label"
                  fullWidth
                  value={item.label}
                  onChange={(e) => handleChange("income", index, "label", e.target.value)}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Amount"
                  fullWidth
                  type="number"
                  value={item.amount}
                  onChange={(e) => handleChange("income", index, "amount", e.target.value)}
                />
              </Grid>
              <Grid item xs={2}>
                <IconButton onClick={() => removeRow("income", index)}>
                  <FiTrash2 />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          <Button startIcon={<FiPlus />} onClick={() => addRow("income")} sx={{ mt: 2 }}>
            Add Income
          </Button>
        </Box>

        {/* Deductions */}
        <Box mt={4}>
          <Typography variant="h6">Deductions</Typography>
          {deductions.map((item, index) => (
            <Grid container spacing={2} key={index} alignItems="center" mt={1}>
              <Grid item xs={6}>
                <TextField
                  label="Label"
                  fullWidth
                  value={item.label}
                  onChange={(e) => handleChange("deduction", index, "label", e.target.value)}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Amount"
                  fullWidth
                  type="number"
                  value={item.amount}
                  onChange={(e) => handleChange("deduction", index, "amount", e.target.value)}
                />
              </Grid>
              <Grid item xs={2}>
                <IconButton onClick={() => removeRow("deduction", index)}>
                  <FiTrash2 />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          <Button startIcon={<FiPlus />} onClick={() => addRow("deduction")} sx={{ mt: 2 }}>
            Add Deduction
          </Button>
        </Box>

        {/* Summary */}
        <Divider sx={{ my: 4 }} />
        <Box>
          <Typography variant="h6">Summary</Typography>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={4}>
              <TextField label="Total Income" fullWidth value={totalIncome} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={4}>
              <TextField label="Total Deductions" fullWidth value={totalDeductions} InputProps={{ readOnly: true }} />
            </Grid>
            <Grid item xs={4}>
              <TextField label="Net Pay" fullWidth value={netPay} InputProps={{ readOnly: true }} />
            </Grid>
          </Grid>
        </Box>
      </Paper>
      
      <Box mt={4} display="flex" justifyContent="flex-end">
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => setPreviewMode(true)}
          disabled={!selectedEmployee}
        >
          Preview Payslip
        </Button>
      </Box>
    </Container>
    </ThemeProvider>
  );
};

export default PayslipGenerator;