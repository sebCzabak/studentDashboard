// src/pages/admin/ManageSubmissionsPage.tsx
import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { getAllSubmissions, updateSubmissionStatus } from '../../features/submissions/submissionsService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Link as RouterLink } from 'react-router-dom';
import { Button } from '@mui/material';

export const ManageSubmissionsPage = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const subs = await getAllSubmissions();
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
    setSubmissions((prevSubs) =>
      prevSubs.map((sub) => (sub.id === submissionId ? { ...sub, status: newStatus } : sub))
    );

    try {
      await updateSubmissionStatus(submissionId, newStatus);
      toast.success('Status wniosku został zaktualizowany.');
    } catch (error) {
      toast.error('Błąd zapisu! Przywracanie statusu.');
      console.error(error);
    }
  };

  // Funkcja pomocnicza do wyciągania numeru indeksu z e-maila
  const getIndexNumberFromEmail = (studentEmail: string | undefined): string => {
    if (!studentEmail) {
      return 'Brak';
    }
    return studentEmail.split('@')[0];
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
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {/* NOWA KOLUMNA */}
                <TableCell sx={{ fontWeight: 'bold' }}>Nr Indeksu</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Typ Wniosku</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Data Złożenia</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow
                  key={sub.id}
                  hover
                >
                  {/* NOWA KOMÓRKA Z DANYMI */}
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
