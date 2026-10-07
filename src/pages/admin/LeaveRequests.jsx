import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import axios from 'axios';
import { API_ENDPOINTS } from '../../utils/api';
import {
  Box, Container, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, Paper, Button, Chip, Avatar, LinearProgress,
  Collapse, IconButton, Grid, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  FiCheckCircle as ApprovedIcon,
  FiXCircle as RejectedIcon,
  FiClock as PendingIcon,
  FiCalendar as CalendarIcon,
  FiChevronDown as ExpandIcon,
  FiChevronUp as CollapseIcon,
  FiTrash2 as DeleteIcon
} from 'react-icons/fi';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Loader from '../../components/admin-dashboard/common/Loader';

const theme = createTheme({
  typography: {
    fontFamily: 'Montserrat, sans-serif',
  },
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
        },
      },
    },
  },
});

// Styled components
const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  fontWeight: 600,
  ...(status === 'Approved' && {
    
    color: theme.palette.success.dark,
  }),
  ...(status === 'Rejected' && {
    
    color: theme.palette.error.dark,
  }),
  ...(status === 'Pending' && {
    
    color: theme.palette.warning.dark,
  }),
}));

const MonthHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.grey[600],
  color: theme.palette.primary.contrastText,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(2),
  boxShadow: theme.shadows[1],
}));

const LeaveDetailRow = ({ label, value, icon: Icon }) => (
  <Grid container spacing={1} alignItems="center" sx={{ mb: 1 }}>
    <Grid item xs={4} sm={3} md={2}>
      <Box display="flex" alignItems="center">
        {Icon && <Icon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />}
        <Typography variant="subtitle2" color="textSecondary">
          {label}
        </Typography>
      </Box>
    </Grid>
    <Grid item xs={8} sm={9} md={10}>
      <Typography variant="body2">{value}</Typography>
    </Grid>
  </Grid>
);

const LeaveRequestsAdmin = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, userName: '' });

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    const token = localStorage.getItem('token');
    try {
      setLoading(true);
      const res = await axios.get(API_ENDPOINTS.getAllLeaves, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaveRequests(res.data);
    } catch (err) {
      console.error('Error fetching leave requests', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(API_ENDPOINTS.updateLeaveStatus(id), { status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaveRequests((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status } : r))
      );
    } catch (err) {
      console.error('Error updating leave status', err);
    }
  };

  const toggleRowExpand = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDeleteClick = (id, userName) => {
    setDeleteDialog({ open: true, id, userName });
  };

  const handleDeleteConfirm = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(API_ENDPOINTS.deleteLeaveRequest(deleteDialog.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaveRequests((prev) => prev.filter((r) => r._id !== deleteDialog.id));
    } catch (err) {
      console.error('Error deleting leave request', err);
    } finally {
      setDeleteDialog({ open: false, id: null, userName: '' });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, id: null, userName: '' });
  };

  const groupedRequests = leaveRequests.reduce((acc, req) => {
    const month = dayjs(req.fromDate).format('YYYY-MM');
    if (!acc[month]) acc[month] = [];
    acc[month].push(req);
    return acc;
  }, {});

  const sortedMonths = Object.keys(groupedRequests).sort((a, b) => b.localeCompare(a));

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': return <ApprovedIcon size={18} />;
      case 'Rejected': return <RejectedIcon size={18} />;
      default: return <PendingIcon size={18} />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography
          variant="h6"
          component="h6"
          gutterBottom
          sx={{
            fontWeight: 700,
            mb: 4,
          }}
        >
          <span className='text-gray-600'>
          Leave Requests Management</span>
        </Typography>

        {loading && <Loader />}

        {sortedMonths.length === 0 && !loading && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="200px"
          >
            <Typography variant="h6" color="textSecondary">
              No leave requests found
            </Typography>
          </Box>
        )}

        {sortedMonths.map((month) => (
          <Box key={month} mb={6}>
            <MonthHeader>
              <CalendarIcon style={{ marginRight: 8 }} />
              <Typography sx={{ fontWeight: 600 }}>
                {dayjs(month + '-01').format('MMMM YYYY')}
              </Typography>
            </MonthHeader>

            <Paper elevation={2} sx={{ overflow: 'hidden' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.400' }}>
                    
                    <TableCell sx={{ color: 'primary.contrastText', fontWeight: 600 }}>Employee</TableCell>
                    <TableCell sx={{ color: 'primary.contrastText', fontWeight: 600 }}>Leave Period</TableCell>
                    <TableCell sx={{ color: 'primary.contrastText', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: 'primary.contrastText', fontWeight: 600 }}>Actions</TableCell>
                    <TableCell sx={{ color: 'primary.contrastText', fontWeight: 600, width: '40px' }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedRequests[month].map(req => {
                    const from = dayjs(req.fromDate);
                    const to = dayjs(req.toDate);
                    const noOfDays = to.diff(from, 'day') + 1;
                    const isExpanded = expandedRows[req._id];

                    return (
                      <React.Fragment key={req._id}>
                        <StyledTableRow>
                          
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              
                              <Box>
                                <Typography fontWeight={600}>{req.user?.name || 'N/A'}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {req.leaveType}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography>
                              {from.format('DD MMM YYYY')} - {to.format('DD MMM YYYY')}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {noOfDays} day{noOfDays > 1 ? 's' : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <StatusChip
                              icon={getStatusIcon(req.status)}
                              label={req.status}
                              status={req.status}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" gap={1} alignItems="center">
                              {req.status === 'Pending' && (
                                <>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    onClick={() => updateStatus(req._id, 'Approved')}
                                    startIcon={<ApprovedIcon />}
                                    sx={{ textTransform: 'none' }}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={() => updateStatus(req._id, 'Rejected')}
                                    startIcon={<RejectedIcon />}
                                    sx={{ textTransform: 'none' }}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteClick(req._id, req.user?.name || 'Unknown')}
                                title="Delete leave request"
                              >
                                <DeleteIcon size={16} />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              aria-label="expand row"
                              size="small"
                              onClick={() => toggleRowExpand(req._id)}
                            >
                              {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                            </IconButton>
                          </TableCell>
                        </StyledTableRow>
                        <TableRow>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ margin: 2 }}>
                                <Grid container spacing={3}>
                                  <Grid item xs={12} md={6}>
                                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                                        Leave Details
                                      </Typography>
                                      <LeaveDetailRow 
                                        label="Applied On" 
                                        value={dayjs(req.createdAt).format('DD MMM YYYY hh:mm A')} 
                                        icon={CalendarIcon} 
                                      />
                                      <LeaveDetailRow 
                                      sx={{marginTop: 5}}
                                        label="Reason : " 
                                        value={req.reason} 
                                      />
                                      
                                    </Paper>
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                                        Status History
                                      </Typography>
                                      <LeaveDetailRow 
                                        label="Current Status" 
                                        value={req.status} 
                                      />
                                      <LeaveDetailRow 
                                        label="Last Updated" 
                                        value={dayjs(req.updatedAt).format('DD MMM YYYY hh:mm A')} 
                                      />
                                      {req.statusNotes && (
                                        <LeaveDetailRow 
                                          label="Admin Notes" 
                                          value={req.statusNotes} 
                                        />
                                      )}
                                    </Paper>
                                  </Grid>
                                </Grid>
                              </Box>
                            </Collapse>
                          </TableCell>

                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        ))}
        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={handleDeleteCancel}
        >
          <DialogTitle>Delete Leave Request</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the leave request for <strong>{deleteDialog.userName}</strong>? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} color="inherit">Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
};

export default LeaveRequestsAdmin;