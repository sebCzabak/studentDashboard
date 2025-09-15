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
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import toast from 'react-hot-toast';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { ScheduleEntry, Timetable, Subject, Semester } from '../../features/timetable/types';
import { getAllLecturers, type UserProfile } from '../../features/user/userService';
import { getSemesters } from '../../features/shared/dictionaryService';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Definicja typu dla przetworzonych danych w raporcie
interface WorkloadRow {
  lecturerId: string;
  lecturerName: string;
  subjectName: string;
  studyMode: string;
  hours: {
    Wykład: number;
    Ćwiczenia: number;
    Laboratorium: number;
    Seminarium: number;
  };
  totalHours: number;
}

export const LecturerWorkloadReportPage = () => {
  const [loading, setLoading] = useState(true);
  const [allEntries, setAllEntries] = useState<ScheduleEntry[]>([]);
  const [allTimetables, setAllTimetables] = useState<Timetable[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [allLecturers, setAllLecturers] = useState<UserProfile[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [entriesSnap, timetablesSnap, subjectsSnap, lecturersSnap, semestersData] = await Promise.all([
          getDocs(collection(db, 'scheduleEntries')),
          getDocs(collection(db, 'timetables')),
          getDocs(collection(db, 'subjects')),
          getAllLecturers(),
          getSemesters(),
        ]);
        const mapDoc = (doc: any) => {
          const data = doc.data();
          return { id: doc.id, ...data };
        };

        setAllEntries(entriesSnap.docs.map(mapDoc) as ScheduleEntry[]);
        setAllTimetables(timetablesSnap.docs.map(mapDoc) as Timetable[]);
        setAllSubjects(subjectsSnap.docs.map(mapDoc) as Subject[]);
        setAllLecturers(lecturersSnap as UserProfile[]);
        setSemesters(semestersData as Semester[]);

        if (semestersData.length > 0) {
          setSelectedSemesterId(semestersData[0].id);
        }
      } catch (err) {
        toast.error('Błąd pobierania danych do raportu.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Logika agregacji danych
  const reportData = useMemo(() => {
    if (!selectedSemesterId) return [];

    const timetablesInSemester = allTimetables.filter((t) => t.semesterId === selectedSemesterId);
    const timetableIdsInSemester = new Set(timetablesInSemester.map((t) => t.id));
    const entriesInSemester = allEntries.filter((e) => timetableIdsInSemester.has(e.timetableId));

    const aggregation: Record<string, WorkloadRow> = {};

    entriesInSemester.forEach((entry) => {
      const timetable = timetablesInSemester.find((t) => t.id === entry.timetableId);
      if (!timetable) return;

      const key = `${entry.lecturerId}-${entry.subjectId}-${timetable.studyMode}`;

      if (!aggregation[key]) {
        aggregation[key] = {
          lecturerId: entry.lecturerId,
          lecturerName: entry.lecturerName,
          subjectName: entry.subjectName,
          studyMode: timetable.studyMode || 'stacjonarny',
          hours: { Wykład: 0, Ćwiczenia: 0, Laboratorium: 0, Seminarium: 0 },
          totalHours: 0,
        };
      }

      const hoursPerBlock = 1.5; // Zakładamy, że każde zajęcia trwają 1.5h
      aggregation[key].hours[entry.type] += hoursPerBlock;
      aggregation[key].totalHours += hoursPerBlock;
    });

    return Object.values(aggregation).sort((a, b) => a.lecturerName.localeCompare(b.lecturerName));
  }, [selectedSemesterId, allEntries, allTimetables, allSubjects, allLecturers]);

  // Logika eksportu
  const handleExport = (format: 'xlsx' | 'pdf') => {
    const headers = [
      'Prowadzący',
      'Przedmiot',
      'Tryb',
      'Wykłady (h)',
      'Ćwiczenia (h)',
      'Laboratoria (h)',
      'Seminaria (h)',
      'Suma (h)',
    ];
    const body = reportData.map((row) => [
      row.lecturerName,
      row.subjectName,
      row.studyMode,
      row.hours.Wykład,
      row.hours.Ćwiczenia,
      row.hours.Laboratorium,
      row.hours.Seminarium,
      row.totalHours,
    ]);

    if (format === 'xlsx') {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...body]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Raport Obciążenia');
      XLSX.writeFile(workbook, `raport_obciazenia_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    if (format === 'pdf') {
      const doc = new jsPDF();
      (doc as any).autoTable({
        head: [headers],
        body: body,
      });
      doc.save(`raport_obciazenia_${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        gutterBottom
      >
        Raport Obciążenia Prowadzących
      </Typography>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          component={RouterLink}
          to="/admin"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Wróć do pulpitu
        </Button>
        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel>Wybierz semestr</InputLabel>
          <Select
            value={selectedSemesterId}
            label="Wybierz semestr"
            onChange={(e) => setSelectedSemesterId(e.target.value)}
          >
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
        <Box>
          <Button
            sx={{ mr: 1 }}
            variant="outlined"
            onClick={() => handleExport('xlsx')}
            startIcon={<FileDownloadIcon />}
          >
            Eksportuj do Excel
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleExport('pdf')}
            startIcon={<FileDownloadIcon />}
          >
            Eksportuj do PDF
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Prowadzący</TableCell>
              <TableCell>Nazwa przedmiotu</TableCell>
              <TableCell>Tryb</TableCell>
              <TableCell align="right">Wykład (h)</TableCell>
              <TableCell align="right">Ćwiczenia (h)</TableCell>
              <TableCell align="right">Laboratorium (h)</TableCell>
              <TableCell align="right">Suma (h)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData.map((row, index) => (
              <TableRow
                key={`${row.lecturerId}-${row.subjectName}-${index}`}
                hover
              >
                <TableCell>{row.lecturerName}</TableCell>
                <TableCell>{row.subjectName}</TableCell>
                <TableCell>{row.studyMode}</TableCell>
                <TableCell align="right">{row.hours.Wykład || '-'}</TableCell>
                <TableCell align="right">{row.hours.Ćwiczenia || '-'}</TableCell>
                <TableCell align="right">{row.hours.Laboratorium || '-'}</TableCell>
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
    </Box>
  );
};
