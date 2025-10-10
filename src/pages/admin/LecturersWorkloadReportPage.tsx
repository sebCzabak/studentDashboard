import { useState, useEffect, useMemo } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Autocomplete,
  TextField,
  Chip,
  Tooltip,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { Link as RouterLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getSemesters, getAllLecturers } from '../../features/shared/dictionaryService';
import { getCurriculums, getAllSubjects } from '../../features/curriculums/curriculumsService';
import { exportWorkloadReportToPdf } from '../../features/timetable/exportService';
import type {
  ScheduleEntry,
  Timetable,
  Semester,
  UserProfile,
  Curriculum,
  Subject,
} from '../../features/timetable/types';
import * as XLSX from 'xlsx';
import React from 'react';

interface EnhancedWorkloadRow {
  lecturerId: string;
  lecturerName: string;
  subjectId: string;
  subjectName: string;
  studyMode: string;
  plannedHours: { [key: string]: number };
  scheduledHours: { [key: string]: number };
  totalPlanned: number;
  totalScheduled: number;
}

const dayOrder: { [key: string]: number } = {
  Poniedziałek: 1,
  Wtorek: 2,
  Środa: 3,
  Czwartek: 4,
  Piątek: 5,
  Sobota: 6,
  Niedziela: 7,
};

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
        })
    );

export const LecturerWorkloadReportPage = () => {
  const [loading, setLoading] = useState(true);
  const [allEntries, setAllEntries] = useState<ScheduleEntry[]>([]);
  const [allTimetables, setAllTimetables] = useState<Timetable[]>([]);
  const [allLecturers, setAllLecturers] = useState<UserProfile[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);

  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('all');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [entriesSnap, timetablesSnap, lecturersData, semestersData, curriculumsData, subjectsSnap] =
          await Promise.all([
            getDocs(collection(db, 'scheduleEntries')),
            getDocs(collection(db, 'timetables')),
            getAllLecturers(),
            getSemesters(),
            getCurriculums(),
            getDocs(collection(db, 'subjects')),
          ]);

        const mapDoc = (doc: any) => ({ id: doc.id, ...doc.data() });
        setAllEntries(entriesSnap.docs.map(mapDoc) as ScheduleEntry[]);
        setAllTimetables(timetablesSnap.docs.map(mapDoc) as Timetable[]);
        setAllLecturers(lecturersData as UserProfile[]);
        setSemesters(semestersData as Semester[]);
        setCurriculums(curriculumsData as Curriculum[]);
        setAllSubjects(subjectsSnap.docs.map(mapDoc) as Subject[]);
      } catch (err) {
        toast.error('Błąd pobierania danych do raportu.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const academicYears = useMemo(() => {
    const years = new Set(allTimetables.map((t) => t.academicYear).filter(Boolean));
    return ['all', ...Array.from(years).sort().reverse()];
  }, [allTimetables]);

  const reportData = useMemo(() => {
    const aggregation: Record<string, EnhancedWorkloadRow> = {};
    const subjectsMap = new Map(allSubjects.map((s) => [s.id, s.name]));

    const filteredCurriculums = curriculums.filter(
      (c) => selectedAcademicYear === 'all' || c.academicYear === selectedAcademicYear
    );

    filteredCurriculums.forEach((curr) => {
      curr.semesters.forEach((sem) => {
        if (selectedSemesterId !== 'all' && sem.semesterId !== selectedSemesterId) return;
        sem.subjects.forEach((subj) => {
          if (selectedLecturerId !== 'all' && subj.lecturerId !== selectedLecturerId) return;

          const key = `${subj.lecturerId}-${subj.subjectId}`;
          if (!aggregation[key]) {
            const lecturer = allLecturers.find((l) => l.id === subj.lecturerId);
            aggregation[key] = {
              lecturerId: subj.lecturerId,
              lecturerName: lecturer?.displayName || 'B/D',
              subjectId: subj.subjectId,
              subjectName: subjectsMap.get(subj.subjectId) || 'B/D',
              studyMode: '',
              plannedHours: {},
              scheduledHours: {},
              totalPlanned: 0,
              totalScheduled: 0,
            };
          }
          aggregation[key].plannedHours[subj.type] = (aggregation[key].plannedHours[subj.type] || 0) + subj.hours;
          aggregation[key].totalPlanned += subj.hours;
        });
      });
    });

    const filteredTimetables = allTimetables.filter(
      (t) =>
        (selectedSemesterId === 'all' || t.semesterId === selectedSemesterId) &&
        (selectedAcademicYear === 'all' || t.academicYear === selectedAcademicYear)
    );
    const filteredTimetableIds = new Set(filteredTimetables.map((t) => t.id));
    const entriesToReport = allEntries.filter((e) => filteredTimetableIds.has(e.timetableId));

    entriesToReport.forEach((entry) => {
      if (selectedLecturerId !== 'all' && entry.lecturerId !== selectedLecturerId) return;

      const key = `${entry.lecturerId}-${entry.subjectId}`;
      if (aggregation[key]) {
        const hoursPerBlock = 1.5;
        const entryType = entry.type || 'Inne';
        aggregation[key].scheduledHours[entryType] = (aggregation[key].scheduledHours[entryType] || 0) + hoursPerBlock;
        aggregation[key].totalScheduled += hoursPerBlock;
        const timetable = filteredTimetables.find((t) => t.id === entry.timetableId);
        if (timetable) aggregation[key].studyMode = timetable.studyMode || 'stacjonarny';
      }
    });

    return Object.values(aggregation).sort((a, b) => a.lecturerName.localeCompare(b.lecturerName));
  }, [
    selectedSemesterId,
    selectedAcademicYear,
    selectedLecturerId,
    allEntries,
    allTimetables,
    allLecturers,
    curriculums,
    allSubjects,
  ]);

  const lecturerDetailData = useMemo(() => {
    if (selectedLecturerId === 'all' || !reportData) return [];
    const filteredTimetables = allTimetables.filter(
      (t) =>
        (selectedSemesterId === 'all' || t.semesterId === selectedSemesterId) &&
        (selectedAcademicYear === 'all' || t.academicYear === selectedAcademicYear)
    );
    const filteredTimetableIds = new Set(filteredTimetables.map((t) => t.id));
    return allEntries
      .filter((e) => e.lecturerId === selectedLecturerId && filteredTimetableIds.has(e.timetableId))
      .sort((a, b) => {
        const dayComparison = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
        if (dayComparison !== 0) return dayComparison;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [selectedLecturerId, reportData, allEntries, allTimetables, selectedSemesterId, selectedAcademicYear]);

  const lecturerSubtotals = useMemo(() => {
    const subtotals: Record<string, { totalPlanned: number; totalScheduled: number }> = {};
    reportData.forEach((row) => {
      if (!subtotals[row.lecturerId]) {
        subtotals[row.lecturerId] = { totalPlanned: 0, totalScheduled: 0 };
      }
      subtotals[row.lecturerId].totalPlanned += row.totalPlanned;
      subtotals[row.lecturerId].totalScheduled += row.totalScheduled;
    });
    return subtotals;
  }, [reportData]);

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (reportData.length === 0) return;
    const toastId = toast.loading(`Przygotowywanie danych do eksportu...`);

    // Przygotowanie danych (wspólne dla obu formatów)
    const allTypes = ['Wykład', 'Ćwiczenia', 'Laboratorium', 'Seminarium'];
    const fileName = `raport_obciazenia_${new Date().toISOString().split('T')[0]}`;
    if (format === 'pdf') {
      const semesterName = semesters.find((s) => s.id === selectedSemesterId)?.name || 'wszystkie';
      const yearName = selectedAcademicYear === 'all' ? 'wszystkie' : selectedAcademicYear;
      exportWorkloadReportToPdf(
        reportData.map((row) => ({
          ...row,
          hours: row.plannedHours, // or adapt as needed for your WorkloadRow type
          totalHours: row.totalPlanned, // or adapt as needed for your WorkloadRow type
        })),
        allTypes,
        { year: yearName, semester: semesterName }
      );
      return;
    }

    if (format === 'xlsx') {
      try {
        const headers = [
          'Prowadzący',
          'Przedmiot',
          'Tryb',
          'Plan (W)',
          'Plan (Ć)',
          'Plan (L)',
          'Plan (S)',
          'Plan Σ',
          'Real. (W)',
          'Real. (Ć)',
          'Real. (L)',
          'Real. (S)',
          'Real. Σ',
        ];
        const dataForSheet: (string | number)[][] = [headers];
        const merges: XLSX.Range[] | undefined = [];
        let lastLecturerId = '';
        let mergeStartRow = 1; // Zaczynamy od wiersza 1 (bo 0 to nagłówek)

        reportData.forEach((row, index) => {
          const isSameLecturerAsPrevious = row.lecturerId === lastLecturerId;

          // Dodajemy wiersz z danymi
          dataForSheet.push([
            isSameLecturerAsPrevious ? '' : row.lecturerName,
            row.subjectName,
            row.studyMode,
            row.plannedHours['Wykład'] || 0,
            row.plannedHours['Ćwiczenia'] || 0,
            row.plannedHours['Laboratorium'] || 0,
            row.plannedHours['Seminarium'] || 0,
            row.totalPlanned || 0,
            row.scheduledHours['Wykład'] || 0,
            row.scheduledHours['Ćwiczenia'] || 0,
            row.scheduledHours['Laboratorium'] || 0,
            row.scheduledHours['Seminarium'] || 0,
            row.totalScheduled || 0,
          ]);

          const isLastRowForLecturer =
            index === reportData.length - 1 || reportData[index + 1].lecturerId !== row.lecturerId;

          if (isLastRowForLecturer) {
            // Dodajemy wiersz podsumowania
            const subtotal = lecturerSubtotals[row.lecturerId];
            dataForSheet.push([
              '',
              '',
              '',
              '',
              '',
              '',
              'SUMA:',
              subtotal.totalPlanned,
              '',
              '',
              '',
              '',
              subtotal.totalScheduled,
            ]);

            // Definiujemy scalenie dla komórki z nazwiskiem prowadzącego
            const currentRowIndex = dataForSheet.length - 2; // Indeks ostatniego wiersza z danymi
            if (currentRowIndex > mergeStartRow) {
              merges.push({ s: { r: mergeStartRow, c: 0 }, e: { r: currentRowIndex, c: 0 } });
            }
            mergeStartRow = currentRowIndex + 2; // Ustawiamy start dla następnej grupy
          }

          lastLecturerId = row.lecturerId;
        });

        const worksheet = XLSX.utils.aoa_to_sheet(dataForSheet);
        worksheet['!merges'] = merges;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Raport Obciążenia');
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
        toast.success('Plik Excel wygenerowany!', { id: toastId });
      } catch (e) {
        toast.error('Błąd podczas generowania pliku Excel.', { id: toastId });
        console.error(e);
      }
    }
  };

  if (loading) return <CircularProgress />;

  let lastLecturerIdRendered = '';

  return (
    <Box sx={{ p: 3 }}>
      <Button
        component={RouterLink}
        to="/admin"
        startIcon={<ArrowBackIcon />}
      >
        Wróć do pulpit
      </Button>
      <Typography
        variant="h4"
        gutterBottom
      >
        Raport Obciążenia Prowadzących
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid
          container
          spacing={2}
          alignItems="center"
        >
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Rok akademicki</InputLabel>
              <Select
                value={selectedAcademicYear}
                label="Rok akademicki"
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
              >
                {academicYears.map((year) => (
                  <MenuItem
                    key={year}
                    value={year}
                  >
                    {year === 'all' ? 'Wszystkie lata' : year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Semestr</InputLabel>
              <Select
                value={selectedSemesterId}
                label="Semestr"
                onChange={(e) => setSelectedSemesterId(e.target.value)}
              >
                <MenuItem value="all">Wszystkie semestry</MenuItem>
                {semesters.map((s) => (
                  <MenuItem
                    key={s.id}
                    value={s.id}
                  >
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Autocomplete
              options={[{ id: 'all', displayName: 'Wszyscy prowadzący' }, ...allLecturers]}
              getOptionLabel={(option) => option.displayName}
              value={
                allLecturers.find((l) => l.id === selectedLecturerId) || {
                  id: 'all',
                  displayName: 'Wszyscy prowadzący',
                }
              }
              onChange={(_e, newValue) => setSelectedLecturerId(newValue?.id || 'all')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Prowadzący"
                />
              )}
            />
          </Grid>
          <Grid
            size={{ xs: 12, sm: 6, md: 3 }}
            sx={{ textAlign: { md: 'right', xs: 'left' } }}
          >
            <Button
              sx={{ mr: 1, mt: { xs: 1, sm: 0 } }}
              variant="outlined"
              onClick={() => handleExport('xlsx')}
              startIcon={<FileDownloadIcon />}
              disabled={reportData.length === 0}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleExport('pdf')}
              startIcon={<PictureAsPdfIcon />}
              disabled={reportData.length === 0}
              sx={{ mt: { xs: 1, sm: 0 } }}
            >
              PDF
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table
          stickyHeader
          size="small"
        >
          <TableHead>
            <TableRow>
              <TableCell
                rowSpan={2}
                sx={{ verticalAlign: 'bottom' }}
              >
                Prowadzący
              </TableCell>
              <TableCell
                rowSpan={2}
                sx={{ verticalAlign: 'bottom' }}
              >
                Przedmiot
              </TableCell>
              <TableCell
                rowSpan={2}
                sx={{ verticalAlign: 'bottom' }}
              >
                Tryb
              </TableCell>
              <TableCell
                colSpan={5}
                align="center"
              >
                Godziny Planowane (z siatki)
              </TableCell>
              <TableCell
                colSpan={5}
                align="center"
              >
                Godziny Przydzielone (w planie)
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="center">W</TableCell>
              <TableCell align="center">Ć</TableCell>
              <TableCell align="center">L</TableCell>
              <TableCell align="center">S</TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: 'bold' }}
              >
                Σ
              </TableCell>
              <TableCell align="center">W</TableCell>
              <TableCell align="center">Ć</TableCell>
              <TableCell align="center">L</TableCell>
              <TableCell align="center">S</TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: 'bold' }}
              >
                Σ
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData.map((row, index) => {
              const showLecturer = row.lecturerId !== lastLecturerIdRendered;
              if (showLecturer) {
                lastLecturerIdRendered = row.lecturerId;
              }
              const isLastRowForLecturer =
                index === reportData.length - 1 || reportData[index + 1].lecturerId !== row.lecturerId;

              return (
                <React.Fragment key={index}>
                  <TableRow hover>
                    <TableCell sx={{ fontWeight: showLecturer ? 600 : 'normal' }}>
                      {showLecturer ? row.lecturerName : ''}
                    </TableCell>
                    <TableCell>{row.subjectName}</TableCell>
                    {/* ✅ DODANA KOLUMNA "TRYB" */}
                    <TableCell>{row.studyMode}</TableCell>
                    {/* Godziny Planowane */}
                    <TableCell align="center">{row.plannedHours['Wykład'] || '-'}</TableCell>
                    <TableCell align="center">{row.plannedHours['Ćwiczenia'] || '-'}</TableCell>
                    <TableCell align="center">{row.plannedHours['Laboratorium'] || '-'}</TableCell>
                    <TableCell align="center">{row.plannedHours['Seminarium'] || '-'}</TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 'bold' }}
                    >
                      {row.totalPlanned || '-'}
                    </TableCell>
                    {/* Godziny Przydzielone */}
                    <TableCell align="center">{row.scheduledHours['Wykład'] || '-'}</TableCell>
                    <TableCell align="center">{row.scheduledHours['Ćwiczenia'] || '-'}</TableCell>
                    <TableCell align="center">{row.scheduledHours['Laboratorium'] || '-'}</TableCell>
                    <TableCell align="center">{row.scheduledHours['Seminarium'] || '-'}</TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 'bold' }}
                    >
                      {row.totalScheduled || '-'}
                    </TableCell>
                  </TableRow>

                  {/* ✅ DODANY WIERSZ PODSUMOWANIA DLA PROWADZĄCEGO */}
                  {isLastRowForLecturer && (
                    <TableRow sx={{ backgroundColor: 'grey.200' }}>
                      <TableCell colSpan={3} />
                      <TableCell
                        colSpan={4}
                        align="right"
                        sx={{ fontWeight: 'bold' }}
                      >
                        Suma dla prowadzącego:
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 'bold' }}
                      >
                        {lecturerSubtotals[row.lecturerId]?.totalPlanned || 0}
                      </TableCell>
                      <TableCell colSpan={4} />
                      <TableCell
                        align="center"
                        sx={{ fontWeight: 'bold' }}
                      >
                        {lecturerSubtotals[row.lecturerId]?.totalScheduled || 0}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedLecturerId !== 'all' && lecturerDetailData.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography
              variant="h5"
              gutterBottom
            >
              Szczegółowy harmonogram dla: {allLecturers.find((l) => l.id === selectedLecturerId)?.displayName}
            </Typography>
            <Button
              variant="outlined"
              component={RouterLink}
              to={`/admin/schedule-view/${selectedLecturerId}`}
              startIcon={<VisibilityIcon />}
            >
              Pokaż widok planu
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Przedmiot</TableCell>
                  <TableCell>Dzień</TableCell>
                  <TableCell>Godziny</TableCell>
                  <TableCell>Grupy</TableCell>
                  <TableCell>Daty</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lecturerDetailData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Chip
                        label={entry.type}
                        size="small"
                      />{' '}
                      {entry.subjectName}
                    </TableCell>
                    <TableCell>{entry.day}</TableCell>
                    <TableCell>
                      {entry.startTime}-{entry.endTime}
                    </TableCell>
                    <TableCell>{entry.groupNames.join(', ')}</TableCell>
                    <TableCell>
                      {entry.specificDates && entry.specificDates.length > 0
                        ? entry.specificDates.map((ts) => ts.toDate().toLocaleDateString()).join('; ')
                        : 'Co tydzień'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};
