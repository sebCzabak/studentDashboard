// src/features/submissions/components/SubmissionsList.tsx
import { useState, useEffect } from 'react';
import { useAuthContext } from '../../../context/AuthContext';
import { subscribeToUserSubmissions } from '../submissionsService';
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
} from '@mui/material';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export const SubmissionsList = () => {
  const { user } = useAuthContext();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToUserSubmissions(user.uid, (newSubmissions) => {
        setSubmissions(newSubmissions);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  return (
    <Box sx={{ mt: 4 }}>
      <Typography
        variant="h5"
        gutterBottom
      >
        Moje Złożone Sprawy
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Typ Wniosku</TableCell>
              <TableCell>Data Złożenia</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={3}>Ładowanie...</TableCell>
              </TableRow>
            )}
            {!loading && submissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>Brak złożonych spraw.</TableCell>
              </TableRow>
            )}
            {submissions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell>{sub.formType}</TableCell>
                <TableCell>{format(sub.submissionDate.toDate(), 'd MMMM yyyy, HH:mm', { locale: pl })}</TableCell>
                <TableCell>{sub.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
