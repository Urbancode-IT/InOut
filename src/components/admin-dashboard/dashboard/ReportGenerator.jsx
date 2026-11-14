import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FiDownload } from 'react-icons/fi';
import {
  activeEmployees,
  normalizeId,
  presentEmployeeIds,
} from '../../../utils/dashboardLogs';

const ReportGenerator = ({ logs, allUsers, selectedDate }) => {


  const calculateHours = (checkIn, checkOut) => {
    const start = new Date(checkIn.timestamp);
    const end = new Date(checkOut.timestamp);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    return `${hours}h ${minutes}m`;
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    
    // Manually assign autoTable if not automatically available
    if (!doc.autoTable) {
      doc.autoTable = autoTable;
    }

    const generationDate = new Date();
    const reportDate = new Date(selectedDate);
    
    // Filter logs for selected date only
    const selectedDateLogs = logs.filter(log => 
      new Date(log.timestamp).toDateString() === reportDate.toDateString()
    );

    // Only active employees (excludes inactive / relieved / skip-attendance roles)
    const activeUsers = activeEmployees(allUsers);
    const presentIds = presentEmployeeIds(selectedDateLogs);
    const presentCount = activeUsers.filter((user) =>
      presentIds.has(normalizeId(user._id))
    ).length;
    const absentees = activeUsers.filter(
      (user) => !presentIds.has(normalizeId(user._id))
    );

    // Report header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('ATTENDANCE REPORT', 105, 20, { align: 'center' });
    
    // Report dates information
    doc.setFontSize(12);
    doc.setTextColor(100);
    
    // Report date (the date being reported on)
    doc.text(`Report Date: ${reportDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, 14, 35);
    
    // Generation date (when PDF was created)
    doc.text(`Generated on: ${generationDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })} at ${generationDate.toLocaleTimeString()}`, 14, 42);
    
    // Add a line separator
    doc.setDrawColor(200);
    doc.line(14, 46, 196, 46);
    
    // Attendance records section
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('ATTENDANCE RECORDS', 14, 56);
    
    // Group logs for the table
    const groupedLogs = selectedDateLogs.reduce((acc, log) => {
      const key = `${log.employeeName}-${log.userId}`;
      if (!acc[key]) {
        acc[key] = {
          employeeName: log.employeeName,
          checkIn: null,
          checkOut: null
        };
      }
      if (log.type === "check-in") acc[key].checkIn = log;
      if (log.type === "check-out") acc[key].checkOut = log;
      return acc;
    }, {});
    
    const attendanceData = Object.values(groupedLogs).map(log => [
      log.employeeName || 'Unknown',
      log.checkIn ? new Date(log.checkIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      log.checkOut ? new Date(log.checkOut.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      log.checkIn && log.checkOut ? calculateHours(log.checkIn, log.checkOut) : '—',
      log.checkIn?.officeName || '—',
      log.checkOut?.officeName || '—'
    ]);
    
    
   doc.autoTable({
  startY: 60,
  head: [['Employee', 'Check-In', 'Check-Out', 'Hours', 'Office (In)', 'Office (Out)']],
  body: attendanceData,
  theme: 'grid',
  headStyles: { 
    fillColor: [41, 128, 185],
    textColor: 255,
    fontStyle: 'bold'
  },
  alternateRowStyles: { fillColor: [245, 245, 245] },
  margin: { top: 10 }
});

// ✅ Now `doc.lastAutoTable.finalY` exists
doc.setFontSize(12);
doc.text(`Total Present: ${presentCount}`, 14, doc.lastAutoTable.finalY + 10);

    
    // Absentees section
    if (absentees.length > 0) {
      // Add new page if less than 50mm space left
      if (doc.lastAutoTable.finalY > 240) {
        doc.addPage();
      }
      
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('ABSENT EMPLOYEES', 14, doc.lastAutoTable.finalY + 20);
      
      doc.setFontSize(12);
      doc.text(`Total Absent: ${absentees.length}`, 14, doc.lastAutoTable.finalY + 28);
      
      const absentData = absentees.map(user => [
        user.name,
        user.position,
        user.company
      ]);
      
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 35,
        head: [['Name', 'Designation', 'Company']],
        body: absentData,
        theme: 'grid',
        headStyles: { 
          fillColor: [231, 76, 60],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
    } else {
      if (doc.lastAutoTable.finalY > 240) {
        doc.addPage();
      }
      doc.setFontSize(14);
      doc.text('No absent employees', 14, doc.lastAutoTable.finalY + 20);
    }
    doc.setFontSize(12);
doc.text(`Total Employees: ${activeUsers.length}`, 14, doc.lastAutoTable.finalY + 10);
doc.text(`Total Present: ${presentCount}`, 14, doc.lastAutoTable.finalY + 16);
doc.text(`Total Absent: ${absentees.length}`, 14, doc.lastAutoTable.finalY + 22);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('InOut Report Generator', 
      105, 285, { align: 'center' });
    
    doc.save(`attendance_report_${reportDate.toISOString().split('T')[0]}.pdf`);
  };

  return (
    <button
      type="button"
      onClick={generatePDFReport}
      className="dash-btn-primary"
    >
      <FiDownload />
      Download PDF Report
    </button>
  );
};

export default ReportGenerator;