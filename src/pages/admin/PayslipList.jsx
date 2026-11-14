import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { buildPayslipViewModel } from "../../utils/payslipViewModel";
import { downloadPayslipPdf } from "../../utils/payslipPdf";
import {
  Card,
  CardContent,
  Grid,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  FiSearch,
  FiCalendar,
  FiEye,
  FiEdit2,
  FiTrash2,
} from "react-icons/fi";
import { API_ENDPOINTS } from "../../utils/api";
import Loader from "../../components/admin-dashboard/common/Loader";
import PayslipDetailModal from "../../components/admin-dashboard/payslip/PayslipDetailModal";
import { confirmToast } from "../../utils/interactiveToast";
import "../../styles/dashboard-ui.css";

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const parsePayslipMonthYear = (monthStr = '') => {
  const parts = String(monthStr).trim().split(/\s+/);
  if (parts.length < 2) {
    return { monthName: parts[0] || '', year: '' };
  }
  const year = parts[parts.length - 1];
  const monthName = parts.slice(0, -1).join(' ');
  return { monthName, year };
};

const PayslipList = () => {
  const currentYear = String(new Date().getFullYear());
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [activePayslip, setActivePayslip] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchPayslips = async () => {
    try {
      const { data } = await axios.get(API_ENDPOINTS.getPayslips, {
        headers: authHeaders(),
      });
      setPayslips(data);
    } catch (err) {
      console.error("Error fetching payslips:", err);
    } finally {
      setLoading(false);
    }
  };

  // Year options: payslip years + nearby years around current
  const years = useMemo(() => {
    const yearSet = new Set();
    const now = new Date().getFullYear();
    for (let y = now + 1; y >= now - 10; y -= 1) {
      yearSet.add(String(y));
    }
    payslips.forEach((payslip) => {
      const { year } = parsePayslipMonthYear(payslip.month);
      if (year && /^\d{4}$/.test(year)) yearSet.add(year);
    });
    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
  }, [payslips]);

  // Filter and search payslips
  const filteredPayslips = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return payslips.filter((payslip) => {
      if (q) {
        const haystack = [
          payslip.employeeDetails?.name,
          payslip.employeeId,
          payslip.employeeDetails?.department,
          payslip.employeeDetails?.email,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      const { monthName, year } = parsePayslipMonthYear(payslip.month);
      const matchesMonth =
        monthFilter === 'all' ||
        monthName.toLowerCase() === monthFilter.toLowerCase();
      const matchesYear = yearFilter === 'all' || year === String(yearFilter);

      return matchesMonth && matchesYear;
    });
  }, [payslips, searchTerm, monthFilter, yearFilter]);

  // Group payslips by month
  const payslipsByMonth = useMemo(() => {
    const grouped = {};
    
    filteredPayslips.forEach(payslip => {
      if (!payslip.month) return;
      
      if (!grouped[payslip.month]) {
        grouped[payslip.month] = [];
      }
      
      grouped[payslip.month].push(payslip);
    });
    
    return grouped;
  }, [filteredPayslips]);

  const generatePDF = async (payslip) => {
    const {
      employeeDetails,
      incomes,
      deductions,
      totalIncome,
      totalDeductions,
      netPay,
      month,
    } = payslip;

    const viewModel = buildPayslipViewModel(
      { ...employeeDetails, employeeId: payslip.employeeId, month },
      incomes,
      deductions,
      totalIncome,
      totalDeductions,
      netPay
    );

    const fileName = `Payslip_${(employeeDetails?.name || "Employee").replace(/\s+/g, "_")}_${(month || "").replace(/\s+/g, "_")}.pdf`;
    await downloadPayslipPdf(viewModel, fileName);
  };

  const openView = (payslip) => {
    setActivePayslip(payslip);
    setModalMode("view");
  };

  const openEdit = (payslip) => {
    setActivePayslip(payslip);
    setModalMode("edit");
  };

  const closeModal = () => {
    setActivePayslip(null);
    setModalMode("view");
  };

  const handleSavePayslip = async (draft) => {
    if (!activePayslip?._id) return;
    setSaving(true);
    try {
      const { data } = await axios.put(
        API_ENDPOINTS.updatePayslip(activePayslip._id),
        {
          month: draft.month,
          year: draft.year,
          employeeId: draft.employeeId,
          employeeDetails: draft.employeeDetails,
          incomes: draft.incomes,
          deductions: draft.deductions,
          totalIncome: draft.totalIncome,
          totalDeductions: draft.totalDeductions,
          netPay: draft.netPay,
        },
        { headers: authHeaders() }
      );
      setPayslips((prev) =>
        prev.map((p) => (p._id === data._id ? data : p))
      );
      toast.success("Payslip updated");
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update payslip");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayslip = async (payslip) => {
    const confirmed = await confirmToast({
      title: "Delete payslip?",
      text: `Delete payslip for ${payslip.employeeDetails?.name || "employee"} (${payslip.month || ""})?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await axios.delete(API_ENDPOINTS.deletePayslip(payslip._id), {
        headers: authHeaders(),
      });
      setPayslips((prev) => prev.filter((p) => p._id !== payslip._id));
      toast.success("Payslip deleted");
      if (activePayslip?._id === payslip._id) closeModal();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to delete payslip");
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="p-4">
      {/* Header with title and filters */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h4" fontWeight="bold" color="#16192aff">
          <span className="text-gray-600">Employee Payslips</span>
        </Typography>
      </Box>

      {/* Filter and Search Section — plain controls (MUI Grid v7 was blocking typing) */}
      <div className="dash-filters" style={{ marginBottom: '1rem' }}>
        <div className="dash-field">
          <FiSearch />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
          />
        </div>

        <select
          className="dash-select"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          aria-label="Filter by Month"
        >
          <option value="all">All Months</option>
          {MONTH_NAMES.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>

        <select
          className="dash-select"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          aria-label="Filter by Year"
        >
          <option value="all">All Years</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <Chip
          label={`${filteredPayslips.length} payslips`}
          color="primary"
          variant="outlined"
        />
      </div>

      {/* Payslips List */}
      {Object.keys(payslipsByMonth).length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            No payslips found
          </Typography>
        </Box>
      ) : (
        Object.entries(payslipsByMonth).map(([month, monthPayslips]) => (
          <Box key={month} mb={4}>
            {/* Month Heading */}
            <Typography 
              variant="h5" 
              component="h2" 
              sx={{ 
                mb: 2, 
                p: 1, 
                backgroundColor: '#616161', 
                color: 'white', 
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <FiCalendar style={{ marginRight: 8 }} />
              {month}
            </Typography>
            
            <Grid container spacing={3}>
              {monthPayslips.map((payslip) => (
                <Grid item xs={12} md={6} key={payslip._id}>
                  <Card className="shadow-lg rounded-xl p-4 h-full">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                        <Box minWidth={0} flex={1}>
                          <Typography variant="h6" component="h3" color="textSecondary" fontWeight="bold">
                            {payslip.employeeDetails?.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            ID: {payslip.employeeId}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Dept: {payslip.employeeDetails?.department}
                          </Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
                          <Chip
                            label={`₹${Number(payslip.netPay || 0).toFixed(2)}`}
                            color="success"
                            variant="outlined"
                            size="small"
                          />
                          <Box display="flex" alignItems="center" gap={0.25}>
                            <Tooltip title="View">
                              <IconButton
                                size="small"
                                aria-label="View payslip"
                                onClick={() => openView(payslip)}
                                sx={{ color: '#2563eb' }}
                              >
                                <FiEye size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                aria-label="Edit payslip"
                                onClick={() => openEdit(payslip)}
                                sx={{ color: '#0f766e' }}
                              >
                                <FiEdit2 size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                aria-label="Delete payslip"
                                onClick={() => handleDeletePayslip(payslip)}
                                sx={{ color: '#dc2626' }}
                              >
                                <FiTrash2 size={18} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}

      {activePayslip && (
        <PayslipDetailModal
          payslip={activePayslip}
          mode={modalMode}
          saving={saving}
          onClose={closeModal}
          onSave={handleSavePayslip}
          onDownload={generatePDF}
        />
      )}
    </div>
  );
};

export default PayslipList;