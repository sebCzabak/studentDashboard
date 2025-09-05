import { useState, useEffect, useMemo, useRef } from 'react';
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
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useAuthContext } from '../context/AuthContext';
import { getUserProfileData } from '../features/user/userService';
import { getTimetablesForGroup, getScheduleEntries } from '../features/timetable/scheduleService';
import { getAllSubjects } from '../features/curriculums/curriculumsService.js';
import { getAllLecturers, getSemesters } from '../features/shared/dictionaryService.js';
import { getAllRooms } from '../features/rooms/roomService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Import czcionki dla PDF
import '../lib/Roboto-Regular-normal.js';

const timeSlots = [
  '08:00-09:30',
  '09:45-11:15',
  '11:30-13:00',
  '13:30-15:00',
  '15:15-16:45',
  '17:00-18:30',
  '18:45-20:15',
];

export const MyTimetablePage = () => {
  const { user } = useAuthContext();
  const [timetable, setTimetable] = useState<any>(null);
  const [scheduleEntries, setScheduleEntries] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const timetableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const profile = await getUserProfileData(user.uid);
        if (!profile || !profile.groupId) {
          throw new Error('Nie jesteś przypisany do żadnej grupy studenckiej.');
        }

        const allTimetablesForGroup = await getTimetablesForGroup(profile.groupId);

        // POPRAWKA TUTAJ: Filtrujemy i bierzemy PIERWSZY opublikowany plan z tablicy
        const publishedTimetable = allTimetablesForGroup.find((tt) => tt.status === 'published');

        if (!publishedTimetable) {
          setTimetable(null);
          setScheduleEntries([]);
          // Używamy toasta zamiast ustawiania nazwy, aby było jaśniej
          toast.success('Plan zajęć nie został jeszcze opublikowany dla Twojej grupy.');
          return;
        }
        setTimetable(publishedTimetable);

        // Pobieramy resztę danych, używając .id z znalezionego obiektu
        const [entries, allSubjects, allLecturers, allRooms, allSemesters] = await Promise.all([
          getScheduleEntries(publishedTimetable.id),
          getAllSubjects(),
          getAllLecturers(),
          getAllRooms(),
          getSemesters(),
        ]);
        setScheduleEntries(entries);
        setSubjects(allSubjects);
        setLecturers(allLecturers);
        setRooms(allRooms);
        setSemesters(allSemesters);
      } catch (error: any) {
        toast.error(error.message || 'Błąd wczytywania planu zajęć.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const maps = useMemo(
    () => ({
      subjects: subjects.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {}),
      lecturers: lecturers.reduce((acc, l) => ({ ...acc, [l.id]: l.displayName }), {}),
      rooms: rooms.reduce((acc, r) => ({ ...acc, [r.id]: r.name }), {}),
      semesters: semesters.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {}),
    }),
    [subjects, lecturers, rooms, semesters]
  );

  const dynamicTimetableTitle = useMemo(() => {
    if (!timetable) return 'Plan zajęć nieopublikowany';
    const semesterName = maps.semesters[timetable.semesterId] || '';
    const academicYear = timetable.academicYear || '';
    return `${semesterName} (${academicYear})`;
  }, [timetable, maps.semesters]);

  const daysOfWeek = useMemo(() => {
    if (timetable?.studyMode === 'zaoczny') {
      return ['Sobota', 'Niedziela'];
    }
    return ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
  }, [timetable]);

  const handleExportPdf = () => {
    const input = timetableRef.current;
    if (!input) return toast.error('Błąd: Nie można znaleźć elementu do wydrukowania.');

    toast.loading('Generowanie pliku PDF...');
    html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      pdf.setFont('Roboto', 'normal');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      pdf.setFontSize(16);
      pdf.text(dynamicTimetableTitle, pdfWidth / 2, 15, { align: 'center' });

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth - 20;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      pdf.addImage(
        imgData,
        'PNG',
        10,
        25,
        imgWidth,
        imgHeight > pdf.internal.pageSize.getHeight() - 30 ? pdf.internal.pageSize.getHeight() - 30 : imgHeight
      );
      pdf.save(`plan-zajec-${user?.displayName?.replace(' ', '_') || 'student'}.pdf`);
      toast.dismiss();
      toast.success('Plik PDF został pomyślnie wygenerowany.');
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1200px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography
              variant="h4"
              gutterBottom
            >
              Mój Plan Zajęć
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
            >
              {dynamicTimetableTitle}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportPdf}
            disabled={scheduleEntries.length === 0}
          >
            Pobierz jako PDF
          </Button>
        </Box>

        {scheduleEntries.length > 0 ? (
          <TableContainer
            ref={timetableRef}
            component={Paper}
            variant="outlined"
            sx={{ p: 2, backgroundColor: 'white' }}
          >
            <Typography
              variant="h5"
              sx={{ textAlign: 'center', mb: 2, display: { xs: 'none', print: 'block' } }}
            >
              {dynamicTimetableTitle}
            </Typography>
            <Table
              sx={{ minWidth: 650, tableLayout: 'fixed' }}
              aria-label="plan zajęć studenta"
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Godziny</TableCell>
                  {daysOfWeek.map((day) => (
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
                {timeSlots.map((timeSlot) => (
                  <TableRow
                    key={timeSlot}
                    sx={{ '& td, & th': { border: '1px solid #eee' } }}
                  >
                    <TableCell
                      component="th"
                      scope="row"
                    >
                      {timeSlot}
                    </TableCell>
                    {daysOfWeek.map((day) => {
                      const entry = scheduleEntries.find((e) => e.dayOfWeek === day && e.timeSlot === timeSlot);
                      return (
                        <TableCell
                          key={day}
                          align="center"
                          sx={{ verticalAlign: 'top', p: 0.5, height: '120px' }}
                        >
                          {entry && (
                            <Paper
                              elevation={0}
                              sx={{
                                p: 1,
                                height: '100%',
                                textAlign: 'left',
                                backgroundColor: 'secondary.light',
                                color: 'secondary.contrastText',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                borderRadius: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                              >
                                {maps.subjects[entry.subjectId] || 'Błąd'}
                              </Typography>
                              <Typography variant="caption">{maps.lecturers[entry.lecturerId] || 'Błąd'}</Typography>
                              <br />
                              <Typography
                                variant="caption"
                                color="inherit"
                              >
                                Sala: {maps.rooms[entry.roomId] || 'Błąd'}
                              </Typography>
                            </Paper>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </Paper>
    </Box>
  );
};
