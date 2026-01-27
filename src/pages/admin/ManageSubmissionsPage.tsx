// src/pages/admin/ManageSubmissionsPage.tsx
import { useState, useEffect, useMemo } from 'react'; // NOWY IMPORT: useMemo
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  CircularProgress,
  type SelectChangeEvent,
  FormControl, // NOWY IMPORT
  InputLabel, // NOWY IMPORT
} from '@mui/material';
import { getAllSubmissions, updateSubmissionStatus } from '../../features/submissions/submissionsService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@mui/material';

// Definicja typu dla wniosku (zamiast any[])
interface Submission {
  id: string;
  studentEmail?: string;
  studentName?: string;
  formType: string;
  submissionDate?: { toDate: () => Date }; // Typ Firestore Timestamp
  status: string;
}

export const ManageSubmissionsPage = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]); // Lepiej użyć typu
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all'); // NOWY STAN DLA FILTRA

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const subs = (await getAllSubmissions()) as Submission[]; // Typowanie
        setSubmissions(subs);
      } catch (error) {
        toast.error('Nie udało się pobrać listy wniosków.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const handleStatusChange = async (submissionId: string, newStatus: string) => {
    // Aktualizacja optymistyczna
    setSubmissions((prevSubs) =>
      prevSubs.map((sub) => (sub.id === submissionId ? { ...sub, status: newStatus } : sub))
    );

    try {
      await updateSubmissionStatus(submissionId, newStatus);
      toast.success('Status wniosku został zaktualizowany.');
    } catch (error) {
      toast.error('Błąd zapisu! Przywracanie statusu.');
      console.error(error);
      // TODO: Rozważyć logikę przywracania stanu w razie błędu
    }
  };

  // Funkcja pomocnicza do wyciągania numeru indeksu z e-maila
  const getIndexNumberFromEmail = (studentEmail: string | undefined): string => {
    if (!studentEmail) {
      return 'Brak';
    }
    return studentEmail.split('@')[0];
  };

  // NOWA LOGIKA: Wyodrębnij dostępne lata z wniosków
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    submissions.forEach((sub) => {
      if (sub.submissionDate && sub.submissionDate.toDate) {
        yearsSet.add(sub.submissionDate.toDate().getFullYear().toString());
      }
    });
    // Sortuj malejąco
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [submissions]);

  // NOWA LOGIKA: Filtruj wnioski na podstawie wybranego roku
  const filteredSubmissions = useMemo(() => {
    if (selectedYear === 'all') {
      return submissions;
    }
    return submissions.filter((sub) => {
      if (sub.submissionDate && sub.submissionDate.toDate) {
        return sub.submissionDate.toDate().getFullYear().toString() === selectedYear;
      }
      return false; // Nie pokazuj wniosków bez daty, jeśli filtr jest aktywny
    });
  }, [submissions, selectedYear]);

  const handleYearChange = (event: SelectChangeEvent) => {
    setSelectedYear(event.target.value as string);
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1200px' }}>
        <Button
          component={RouterLink}
          to="/admin"
          sx={{ mb: 2 }}
        >
          &larr; Wróć do panelu
        </Button>
        <Typography
          variant="h4"
          gutterBottom
        >
          Zarządzaj Wnioskami Studentów
        </Typography>

        {/* NOWY FILTR UI */}
        <Box sx={{ mb: 3, mt: 2, maxWidth: 200 }}>
          <FormControl fullWidth>
            <InputLabel id="year-filter-label">Filtruj po roku</InputLabel>
            <Select
              labelId="year-filter-label"
              id="year-filter-select"
              value={selectedYear}
              label="Filtruj po roku"
              onChange={handleYearChange}
              size="small"
            >
              <MenuItem value="all">Wszystkie lata</MenuItem>
              {availableYears.map((year) => (
                <MenuItem
                  key={year}
                  value={year}
                >
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Nr Indeksu</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Typ Wniosku</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Data Złożenia</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* UŻYCIE FILTROWANYCH DANYCH */}
              {filteredSubmissions.map((sub) => (
                <TableRow
                  key={sub.id}
                  hover
                >
                  <TableCell>{getIndexNumberFromEmail(sub.studentEmail)}</TableCell>
                  <TableCell>{sub.studentName || 'Brak danych'}</TableCell>
                  <TableCell>{sub.formType}</TableCell>
                  <TableCell>
                    {sub.submissionDate
                      ? format(sub.submissionDate.toDate(), 'd MMM yyyy, HH:mm', { locale: pl })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={sub.status}
                      onChange={(e: SelectChangeEvent) => handleStatusChange(sub.id, e.target.value)}
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="Złożony (oczekuje na wysłanie)">Złożony</MenuItem>
                      <MenuItem value="W trakcie rozpatrywania">W trakcie rozpatrywania</MenuItem>
                      <MenuItem value="Zaakceptowany">Zaakceptowany</MenuItem>
                      <MenuItem value="Odrzucony">Odrzucony</MenuItem>
                      <MenuItem value="Wymaga uzupełnienia">Wymaga uzupełnienia</MenuItem>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
