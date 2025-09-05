// src/features/payments/components/PaymentsList.tsx
import { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '../../../context/AuthContext';
import { subscribeToPayments } from '../paymentService';
import type { Payment } from '../types';
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
  Grid,
  Chip,
} from '@mui/material';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export const PaymentsList = () => {
  const { user } = useAuthContext();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      // Nasza subskrypcja w czasie rzeczywistym wciąż działa idealnie
      const unsubscribe = subscribeToPayments(user.uid, (newPayments: Payment[]) => {
        setPayments(newPayments as Payment[]); // Rzutujemy typ dla pewności
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Logika do obliczania podsumowania finansowego
  const paymentSummary = useMemo(() => {
    const totalDue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = payments.filter((p) => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
    const remaining = totalDue - totalPaid;
    return {
      totalDue: totalDue.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      remaining: remaining.toFixed(2),
    };
  }, [payments]); // Przelicz tylko, gdy zmienią się płatności

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      {/* SEKCJA Z PODSUMOWANIEM FINANSOWYM */}
      <Grid
        container
        spacing={3}
        sx={{ mb: 4 }}
      >
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            variant="outlined"
            sx={{ p: 2, textAlign: 'center' }}
          >
            <Typography color="text.secondary">Suma zobowiązań</Typography>
            <Typography
              variant="h5"
              fontWeight="bold"
            >
              {paymentSummary.totalDue} zł
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            variant="outlined"
            sx={{ p: 2, textAlign: 'center' }}
          >
            <Typography color="text.secondary">Zapłacono</Typography>
            <Typography
              variant="h5"
              fontWeight="bold"
              color="success.main"
            >
              {paymentSummary.totalPaid} zł
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper
            variant="outlined"
            sx={{ p: 2, textAlign: 'center' }}
          >
            <Typography color="text.secondary">Pozostało do zapłaty</Typography>
            <Typography
              variant="h5"
              fontWeight="bold"
              color="error.main"
            >
              {paymentSummary.remaining} zł
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Typography
        variant="h6"
        gutterBottom
      >
        Historia płatności
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Tytuł</TableCell>
              <TableCell
                sx={{ fontWeight: 'bold' }}
                align="right"
              >
                Kwota
              </TableCell>
              <TableCell
                sx={{ fontWeight: 'bold' }}
                align="center"
              >
                Termin płatności
              </TableCell>
              <TableCell
                sx={{ fontWeight: 'bold' }}
                align="center"
              >
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.length > 0 ? (
              payments.map((payment) => (
                <TableRow
                  key={payment.id}
                  hover
                >
                  <TableCell>{payment.title}</TableCell>
                  <TableCell align="right">{payment.amount.toFixed(2)} zł</TableCell>
                  <TableCell align="center">
                    {payment.dueDate ? format(payment.dueDate.toDate(), 'd MMMM yyyy', { locale: pl }) : '-'}
                  </TableCell>
                  <TableCell align="center">
                    {/* Używamy komponentu Chip dla ładniejszego wyświetlania statusu */}
                    <Chip
                      label={payment.isPaid ? 'Opłacone' : 'Do zapłaty'}
                      color={payment.isPaid ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  align="center"
                >
                  Brak zarejestrowanych opłat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
