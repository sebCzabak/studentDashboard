import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getFeeSchedules, addFeeSchedule } from '../../features/fees/feeSchedulesService';
import { FeeScheduleForm } from '../../features/fees/components/feeScheduleForm';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import toast from 'react-hot-toast';

export const ManageFeeSchedulesPage = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSchedules = () => {
    setLoading(true);
    getFeeSchedules()
      .then((data) => setSchedules(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSchedules();
  }, []);
  if (loading) return <CircularProgress />;

  const handleSaveSchedule = async (scheduleData: any) => {
    try {
      await addFeeSchedule(scheduleData);
      toast.success('Nowy harmonogram został pomyślnie zapisany!');
      setIsModalOpen(false); // Zamknij modal
      fetchSchedules(); // Odśwież listę, aby pokazać nowy harmonogram
    } catch (error) {
      toast.error('Wystąpił błąd podczas zapisu.');
      console.error(error);
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
        ;
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            variant="h4"
            gutterBottom
          >
            Zarządzaj Harmonogramami Opłat
          </Typography>
          {/* Ten przycisk teraz otwiera nasze okno modalne */}
          <Button
            variant="contained"
            onClick={() => setIsModalOpen(true)}
          >
            Dodaj Nowy Harmonogram
          </Button>
        </Box>
        <Box sx={{ mt: 3 }}>
          {schedules.map((schedule) => (
            <Accordion key={schedule.id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ flexShrink: 0, width: '60%', fontWeight: 'bold' }}>{schedule.name}</Typography>
                <Typography sx={{ color: 'text.secondary' }}>Suma: {schedule.totalAmount.toFixed(2)} zł</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography
                  variant="h6"
                  gutterBottom
                >
                  Raty:
                </Typography>
                {schedule.installments.map((installment: any, index: number) => (
                  <Box
                    key={index}
                    sx={{ mb: 1, pl: 2 }}
                  >
                    <Typography>
                      <strong>{installment.title}:</strong> {installment.amount.toFixed(2)} zł - termin do{' '}
                      {format(installment.dueDate.toDate(), 'd MMMM yyyy', { locale: pl })}
                    </Typography>
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
        <FeeScheduleForm
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveSchedule}
        />
      </Paper>
    </Box>
  );
};
