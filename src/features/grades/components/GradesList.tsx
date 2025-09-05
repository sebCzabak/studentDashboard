import { useState, useEffect } from 'react';
import { subscribeToGrades } from '../gradesService';
import { useAuthContext } from '../../../context/AuthContext';
import type { Grade } from '../types';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export const GradesList = () => {
  const { user } = useAuthContext();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToGrades(user.uid, (newGrades) => {
        setGrades(newGrades);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Przedmiot</TableCell>
              <TableCell
                sx={{ fontWeight: 'bold' }}
                align="center"
              >
                Ocena
              </TableCell>
              {/* NOWE NAGŁÓWKI */}
              <TableCell sx={{ fontWeight: 'bold' }}>Wystawiono przez</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Data modyfikacji</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grades.length > 0 ? (
              grades.map((grade) => (
                <TableRow
                  key={grade.id}
                  hover
                >
                  <TableCell>{grade.subjectName}</TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="h6"
                      component="span"
                    >
                      {grade.gradeValue}
                    </Typography>
                  </TableCell>
                  <TableCell>{grade.lecturerName || 'Brak danych'}</TableCell>
                  <TableCell>
                    {/* Sprawdzamy, czy data istnieje, zanim ją sformatujemy */}
                    {grade.updatedAt ? format(grade.updatedAt.toDate(), 'd MMM yyyy', { locale: pl }) : 'Brak daty'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  align="center"
                >
                  Brak wystawionych ocen.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
