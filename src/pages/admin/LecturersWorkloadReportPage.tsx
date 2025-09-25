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
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { Link as RouterLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { ScheduleEntry, Timetable, Semester, UserProfile, WorkloadRow } from '../../features/timetable/types';
import { getSemesters, getAllLecturers } from '../../features/shared/dictionaryService';
import { exportWorkloadReportToPdf } from '../../features/timetable/exportService';
import * as XLSX from 'xlsx';

// Mapowanie dni tygodnia na potrzeby sortowania
const dayOrder: { [key: string]: number } = {
  Poniedziałek: 1,
  Wtorek: 2,
  Środa: 3,
  Czwartek: 4,
  Piątek: 5,
  Sobota: 6,
  Niedziela: 7,
};

export const LecturerWorkloadReportPage = () => {
  const [loading, setLoading] = useState(true);
  const [allEntries, setAllEntries] = useState<ScheduleEntry[]>([]);
  const [allTimetables, setAllTimetables] = useState<Timetable[]>([]);
  const [allLecturers, setAllLecturers] = useState<UserProfile[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('all');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [entriesSnap, timetablesSnap, lecturersData, semestersData] = await Promise.all([
          getDocs(collection(db, 'scheduleEntries')),
          getDocs(collection(db, 'timetables')),
          getAllLecturers(),
          getSemesters(),
        ]);

        const mapDoc = (doc: any) => ({ id: doc.id, ...doc.data() });
        setAllEntries(entriesSnap.docs.map(mapDoc) as ScheduleEntry[]);
        setAllTimetables(timetablesSnap.docs.map(mapDoc) as Timetable[]);
        setAllLecturers(lecturersData as UserProfile[]);
        setSemesters(semestersData as Semester[]);
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
    const filteredTimetables = allTimetables.filter(
      (t) =>
        (selectedSemesterId === 'all' || t.semesterId === selectedSemesterId) &&
        (selectedAcademicYear === 'all' || t.academicYear === selectedAcademicYear)
    );
    const filteredTimetableIds = new Set(filteredTimetables.map((t) => t.id));

    let entriesToReport = allEntries.filter((e) => filteredTimetableIds.has(e.timetableId));

    if (selectedLecturerId !== 'all') {
      entriesToReport = entriesToReport.filter((e) => e.lecturerId === selectedLecturerId);
    }

    const aggregation: Record<string, WorkloadRow> = {};
    entriesToReport.forEach((entry) => {
      const timetable = filteredTimetables.find((t) => t.id === entry.timetableId);
      if (!timetable) return;
      const key = `${entry.lecturerId}-${entry.subjectId}-${timetable.studyMode}`;
      if (!aggregation[key]) {
        aggregation[key] = {
          lecturerId: entry.lecturerId,
          lecturerName: entry.lecturerName,
          subjectName: entry.subjectName,
          studyMode: timetable.studyMode || 'stacjonarny',
          hours: {},
          totalHours: 0,
        };
      }

      const hoursPerBlock = 1.5;
      const entryType = entry.type || 'Inne';
      aggregation[key].hours[entryType] = (aggregation[key].hours[entryType] || 0) + hoursPerBlock;
      aggregation[key].totalHours += hoursPerBlock;
    });
    return Object.values(aggregation).sort((a, b) => a.lecturerName.localeCompare(b.lecturerName));
  }, [selectedSemesterId, selectedAcademicYear, selectedLecturerId, allEntries, allTimetables]);

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

  const handleExport = (format: 'xlsx' | 'pdf') => {
    const semesterName = semesters.find((s) => s.id === selectedSemesterId)?.name || 'wszystkie';
    const yearName = selectedAcademicYear === 'all' ? 'wszystkie' : selectedAcademicYear;
    const fileNameDetails = { year: yearName, semester: semesterName };

    if (format === 'xlsx') {
      // Logika dla Excela jest prosta, więc może zostać w komponencie
      const headers = ['Prowadzący', 'Przedmiot', 'Tryb', ...allTypes.map((t) => `${t} (h)`), 'Suma (h)'];
      const body = reportData.map((row) => [
        row.lecturerName,
        row.subjectName,
        row.studyMode,
        ...allTypes.map((type) => row.hours[type] || 0),
        row.totalHours,
      ]);
      const fileName = `raport_obciazenia_${yearName.replace('/', '-')}_${semesterName.replace(/ /g, '_')}`;
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Raport Obciążenia');
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }

    if (format === 'pdf') {
      // Wywołujemy naszą nową, dedykowaną funkcję z serwisu
      exportWorkloadReportToPdf(reportData, allTypes, fileNameDetails);
    }
  };

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    reportData.forEach((row) => Object.keys(row.hours).forEach((type) => types.add(type)));
    return ['Wykład', 'Ćwiczenia', 'Laboratorium', 'Seminarium', ...Array.from(types)].filter(
      (value, index, self) => self.indexOf(value) === index
    );
  }, [reportData]);

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Button
        component={RouterLink}
        to="/admin"
        startIcon={<ArrowBackIcon />}
      >
        Wróć do pulpitu
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Prowadzący</TableCell>
              <TableCell>Przedmiot</TableCell>
              <TableCell>Tryb</TableCell>
              {allTypes.map((type) => (
                <TableCell
                  key={type}
                  align="right"
                >
                  {type} (h)
                </TableCell>
              ))}
              <TableCell
                align="right"
                sx={{ fontWeight: 'bold' }}
              >
                Suma (h)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData.map((row, index) => (
              <TableRow
                key={`${row.lecturerId}-${row.subjectName}-${row.studyMode}-${index}`}
                hover
              >
                <TableCell>{row.lecturerName}</TableCell>
                <TableCell>{row.subjectName}</TableCell>
                <TableCell>{row.studyMode}</TableCell>
                {allTypes.map((type) => (
                  <TableCell
                    key={type}
                    align="right"
                  >
                    {row.hours[type] || '-'}
                  </TableCell>
                ))}
                <TableCell
                  align="right"
                  sx={{ fontWeight: 'bold' }}
                >
                  {row.totalHours}
                </TableCell>
              </TableRow>
            ))}
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
                      {entry.subjectName}{' '}
                      <Chip
                        label={entry.type}
                        size="small"
                      />
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
