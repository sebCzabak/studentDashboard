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
import type { ScheduleEntry, UserProfile } from '../../features/timetable/types';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DAYS, TIME_SLOTS } from '../../features/timetable/constants';

/** Jeden blok po scaleniu wpisów (te same zajęcia, różne plany/grupy łączone). */
interface MergedEntry {
  subjectName: string;
  roomName: string;
  groupNames: string[];
  hasSpecificDates: boolean;
  specificDatesLabel?: string;
  /** Komentarz / notatki (np. daty zajęć) – z pierwszego wpisu z niepustym notes. */
  notes?: string;
}

/** Grupuje wpisy w komórce po (przedmiot, prowadzący, sala) – zwraca jeden blok na „slot” z połączonymi grupami. */
function mergeCellEntries(cellEntries: ScheduleEntry[]): MergedEntry[] {
  const byKey = new Map<string, ScheduleEntry[]>();
  for (const e of cellEntries) {
    const key = `${e.day}|${e.startTime}|${e.subjectId}|${e.lecturerId}|${e.roomId || ''}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(e);
  }
  return Array.from(byKey.entries()).map(([, group]) => {
    const first = group[0];
    const allGroupNames = group.flatMap((e) => e.groupNames || []);
    const uniqueGroupNames = Array.from(new Set(allGroupNames));
    const hasSpecificDates = group.some((e) => e.specificDates && e.specificDates.length > 0);
    const datesLabels = group
      .filter((e) => e.specificDates?.length)
      .flatMap((e) => (e.specificDates || []).map((ts) => ts.toDate().toLocaleDateString('pl-PL')));
    const uniqueDates = Array.from(new Set(datesLabels)).sort();
    const notes = group.map((e) => e.notes?.trim()).find(Boolean) || undefined;
    return {
      subjectName: first.subjectName,
      roomName: first.roomName || '',
      groupNames: uniqueGroupNames,
      hasSpecificDates,
      specificDatesLabel: uniqueDates.length > 0 ? uniqueDates.join(', ') : undefined,
      notes,
    };
  });
}

// Funkcja pomocnicza do konwersji obrazu na Base64
const imageToBase64 = (url: string): Promise<string> =>
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Nie można załadować obrazu: ${url}`);
      return response.blob();
    })
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }),
    );

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

      const [logoBase64, fontResponse, boldFontResponse] = await Promise.all([
        imageToBase64('/images/logo-watermark.png'),
        fetch('/fonts/Roboto-Regular.ttf'),
        fetch('/fonts/Roboto-Bold.ttf'),
      ]);

      const fontBuffer = await fontResponse.arrayBuffer();
      const boldFontBuffer = await boldFontResponse.arrayBuffer();
      const fontBase64 = btoa(new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      const boldFontBase64 = btoa(
        new Uint8Array(boldFontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
      );

      doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.addFileToVFS('Roboto-Bold.ttf', boldFontBase64);
      doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
      doc.setFont('Roboto');

      const tableBody = [];
      for (const timeSlot of TIME_SLOTS) {
        const rowData = [timeSlot.label];
        for (const day of DAYS) {
          const cellEntries = entries.filter((e) => e.day === day && e.startTime === timeSlot.startTime);
          const merged = mergeCellEntries(cellEntries);
          const cellText = merged
            .map(
              (m) =>
                `${m.subjectName}\nGr: ${m.groupNames.join(', ')}\nSala: ${m.roomName}` +
                (m.specificDatesLabel ? `\n(${m.specificDatesLabel})` : '') +
                (m.notes ? `\n${m.notes}` : ''),
            )
            .join('\n\n');
          rowData.push(cellText);
        }
        tableBody.push(rowData);
      }

      doc.text(`Harmonogram dla: ${user?.displayName}`, 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [['Godziny', ...DAYS]],
        body: tableBody,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 8, cellPadding: 2 },
        headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: [44, 62, 80] },
        didDrawPage: (data) => {
          try {
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const imgWidth = 100;
            const imgHeight = 100;
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
            doc.addImage(logoBase64, 'PNG', x, y, imgWidth, imgHeight);
            doc.restoreGraphicsState();
          } catch (e) {
            console.warn('Błąd podczas dodawania znaku wodnego:', e);
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
                  const merged = mergeCellEntries(cellEntries);
                  return (
                    <TableCell
                      key={day}
                      sx={{ verticalAlign: 'top', border: '1px solid #eee', p: 0.5 }}
                    >
                      {merged.map((m, idx) => (
                        <Paper
                          key={`${day}-${timeSlot.startTime}-${m.subjectName}-${idx}`}
                          elevation={0}
                          sx={{ p: 1, mb: 0.5, backgroundColor: 'grey.100' }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                          >
                            {m.subjectName}
                          </Typography>
                          <Typography
                            variant="caption"
                            display="block"
                          >
                            Gr: {m.groupNames.join(', ')}
                          </Typography>
                          <Typography
                            variant="caption"
                            display="block"
                          >
                            Sala: {m.roomName}
                          </Typography>
                          {m.hasSpecificDates && (
                            <Tooltip title={m.specificDatesLabel || ''}>
                              <Typography
                                variant="caption"
                                color="primary"
                                sx={{ cursor: 'pointer' }}
                              >
                                (Konkretne daty)
                              </Typography>
                            </Tooltip>
                          )}
                          {m.notes && (
                            <Typography
                              variant="caption"
                              display="block"
                              sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.secondary' }}
                            >
                              {m.notes}
                            </Typography>
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
