import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Tooltip,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getEntriesForLecturer } from '../../features/timetable/scheduleService';
import { getUserProfileData } from '../../features/user/userService';
import type { ScheduleEntry } from '../../features/timetable/types';
import type { UserProfile } from '../../features/user/userService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DAYS, TIME_SLOTS } from '../../features/timetable/constants';

export const PrintableSchedulePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [userData, entriesData] = await Promise.all([getUserProfileData(userId), getEntriesForLecturer(userId)]);
        setUser(userData as UserProfile);
        setEntries(entriesData);
      } catch (err) {
        toast.error('Błąd pobierania danych do harmonogramu.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    const toastId = toast.loading('Generowanie PDF...');
    try {
      const doc = new jsPDF({ orientation: 'landscape' });

      const [fontResponse, boldFontResponse] = await Promise.all([
        fetch('/fonts/Roboto-Regular.ttf'),
        fetch('/fonts/Roboto-Bold.ttf'),
      ]);

      const fontBuffer = await fontResponse.arrayBuffer();
      const boldFontBuffer = await boldFontResponse.arrayBuffer();

      const fontBase64 = btoa(new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      const boldFontBase64 = btoa(
        new Uint8Array(boldFontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

      doc.addFileToVFS('Roboto-Bold.ttf', boldFontBase64);
      doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

      doc.setFont('Roboto', 'normal');

      const tableBody = [];
      for (const timeSlot of TIME_SLOTS) {
        const rowData = [timeSlot.label];
        for (const day of DAYS) {
          const cellEntries = entries
            .filter((e) => e.day === day && e.startTime === timeSlot.startTime)
            .map(
              (entry) => `${entry.subjectName}\n` + `Gr: ${entry.groupNames.join(', ')}\n` + `Sala: ${entry.roomName}`
            )
            .join('\n\n');
          rowData.push(cellEntries);
        }
        tableBody.push(rowData);
      }

      doc.text(`Harmonogram dla: ${user?.displayName}`, 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [['Godziny', ...DAYS]],
        body: tableBody,
        theme: 'grid',
        styles: {
          font: 'Roboto',
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [44, 62, 80],
          textColor: 255,
          fontStyle: 'bold',
          font: 'Roboto',
        },
        didDrawCell: (data) => {
          if (data.cell.section === 'body') {
            data.cell.styles.valign = 'top';
          }
        },
      });
      doc.save(`harmonogram_${user?.displayName?.replace(/ /g, '_')}.pdf`);
      toast.success('PDF został wygenerowany!', { id: toastId });
    } catch (error) {
      console.error('Błąd generowania PDF:', error);
      toast.error('Nie udało się wygenerować PDF.', { id: toastId });
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          '@media print': { display: 'none' },
        }}
      >
        <Button
          component={RouterLink}
          to="/admin/reports/workload"
          startIcon={<ArrowBackIcon />}
        >
          Wróć do raportu
        </Button>
        <Typography variant="h4">Harmonogram dla: {user?.displayName}</Typography>
        <Box>
          <Button
            sx={{ mr: 1 }}
            variant="contained"
            onClick={handlePrint}
            startIcon={<PrintIcon />}
          >
            Drukuj
          </Button>
          <Button
            variant="outlined"
            onClick={handleExportPdf}
            startIcon={<PictureAsPdfIcon />}
          >
            Pobierz PDF
          </Button>
        </Box>
      </Box>

      <style type="text/css">
        {`
          @media print {
            body { -webkit-print-color-adjust: exact; }
            @page { size: A4 landscape; margin: 20px; }
          }
        `}
      </style>

      <TableContainer component={Paper}>
        <Table sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '120px', fontWeight: 'bold' }}>Godziny</TableCell>
              {DAYS.map((day) => (
                <TableCell
                  key={day}
                  align="center"
                  sx={{ fontWeight: 'bold' }}
                >
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {TIME_SLOTS.map((timeSlot) => (
              <TableRow key={timeSlot.label}>
                <TableCell>{timeSlot.label}</TableCell>
                {DAYS.map((day) => {
                  const cellEntries = entries.filter((e) => e.day === day && e.startTime === timeSlot.startTime);
                  return (
                    <TableCell
                      key={day}
                      sx={{ verticalAlign: 'top', border: '1px solid #eee', p: 0.5 }}
                    >
                      {cellEntries.map((entry) => (
                        <Paper
                          key={entry.id}
                          elevation={0}
                          sx={{ p: 1, mb: 0.5, backgroundColor: 'grey.100' }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                          >
                            {entry.subjectName}
                          </Typography>
                          <Typography
                            variant="caption"
                            display="block"
                          >
                            Gr: {(entry.groupNames || []).join(', ')}
                          </Typography>
                          <Typography
                            variant="caption"
                            display="block"
                          >
                            Sala: {entry.roomName}
                          </Typography>
                          {entry.specificDates && entry.specificDates.length > 0 && (
                            <Tooltip
                              title={(entry.specificDates || [])
                                .map((ts) => ts.toDate().toLocaleDateString())
                                .join(', ')}
                            >
                              <Typography
                                variant="caption"
                                color="primary"
                                sx={{ cursor: 'pointer' }}
                              >
                                (Konkretne daty)
                              </Typography>
                            </Tooltip>
                          )}
                        </Paper>
                      ))}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
