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
  Switch,
  CircularProgress,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  type SelectChangeEvent,
  Chip,
} from '@mui/material';
import { groupsService } from '../../features/shared/dictionaryService';
import { getPaymentsForGroup, togglePaymentStatus } from '../../features/payments/paymentService';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';

const getStatusChip = (payment: any) => {
  if (payment.isPaid)
    return (
      <Chip
        label="Opłacone"
        color="success"
        size="small"
      />
    );
  const daysLeft = differenceInDays(payment.dueDate.toDate(), new Date());
  if (daysLeft < 0)
    return (
      <Chip
        label="Zaległe"
        color="error"
        size="small"
      />
    );
  if (daysLeft <= 7)
    return (
      <Chip
        label="Termin się zbliża"
        color="warning"
        size="small"
      />
    );
  return (
    <Chip
      label="Do zapłaty"
      color="info"
      size="small"
      variant="outlined"
    />
  );
};

export const ManagePaymentsPage = () => {
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [payments, setPayments] = useState<any[]>([]);

  // Krok 1: Pobierz listę GRUP do wyboru
  useEffect(() => {
    groupsService
      .getAll()
      .then((data) => setGroups(data))
      .catch(() => toast.error('Nie udało się pobrać listy grup.'))
      .finally(() => setLoading(false));
  }, []);

  // Krok 2: Pobierz płatności DOPIERO GDY zostanie wybrana grupa
  useEffect(() => {
    if (selectedGroupId) {
      setLoadingPayments(true);
      setPayments([]); // Czyścimy stare dane

      getPaymentsForGroup(selectedGroupId)
        .then((data) => setPayments(data))
        .catch((error) => {
          console.error('Błąd pobierania płatności:', error);
          toast.error(
            'Błąd pobierania płatności. Sprawdź, czy stworzyłeś wymagany indeks w Firestore (wskazówka w konsoli F12).'
          );
        })
        .finally(() => setLoadingPayments(false));
    }
  }, [selectedGroupId]);

  const handleToggleStatus = async (paymentToUpdate: any) => {
    const originalPayments = [...payments];
    const updatedPayments = originalPayments.map((p) =>
      p.id === paymentToUpdate.id ? { ...p, isPaid: !p.isPaid } : p
    );
    setPayments(updatedPayments);
    try {
      await togglePaymentStatus(paymentToUpdate.studentId, paymentToUpdate.id, paymentToUpdate.isPaid);
    } catch (error) {
      toast.error('Błąd zapisu!');
      setPayments(originalPayments);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1200px' }}>
        <Button
          component={RouterLink}
          to="/admin"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Wróć do pulpitu
        </Button>
        <Typography
          variant="h4"
          gutterBottom
        >
          Zarządzaj Płatnościami Studentów
        </Typography>

        <FormControl
          fullWidth
          sx={{ mb: 3 }}
        >
          <InputLabel>Najpierw wybierz grupę studencką</InputLabel>
          <Select
            value={selectedGroupId}
            label="Najpierw wybierz grupę studencką"
            onChange={(e: SelectChangeEvent) => setSelectedGroupId(e.target.value)}
          >
            {groups.map((g) => (
              <MenuItem
                key={g.id}
                value={g.id}
              >
                {g.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {loadingPayments ? (
          <CircularProgress />
        ) : (
          selectedGroupId && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Tytuł</TableCell>
                    <TableCell align="right">Kwota</TableCell>
                    <TableCell>Termin</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Zaksięguj</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.length > 0 ? (
                    payments.map((payment) => (
                      <TableRow
                        key={payment.id}
                        hover
                      >
                        <TableCell>{payment.studentName}</TableCell>
                        <TableCell>{payment.title}</TableCell>
                        <TableCell align="right">{payment.amount.toFixed(2)} zł</TableCell>
                        <TableCell align="center">
                          {payment.dueDate ? format(payment.dueDate.toDate(), 'd MMM yy', { locale: pl }) : '-'}
                        </TableCell>
                        <TableCell align="center">{getStatusChip(payment)}</TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={payment.isPaid}
                            onChange={() => handleToggleStatus(payment)}
                            color="success"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align="center"
                      >
                        Brak płatności do wyświetlenia dla tej grupy.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
      </Paper>
    </Box>
  );
};
