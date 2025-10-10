import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import toast from 'react-hot-toast';
import { semesterDatesService, getSemesters } from '../../features/shared/dictionaryService';
import type { Semester, SemesterDate } from '../../features/timetable/types';
import { Timestamp } from 'firebase/firestore';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import 'react-multi-date-picker/styles/layouts/mobile.css';

const SemesterDateFormModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (data: any, id?: string) => Promise<void>;
  semesters: Semester[];
  initialData: Partial<SemesterDate> | null;
}> = ({ open, onClose, onSave, semesters, initialData }) => {
  const [semesterId, setSemesterId] = useState('');
  const [dates, setDates] = useState<DateObject[]>([]);
  const [format, setFormat] = useState<'stacjonarny' | 'online'>('stacjonarny');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSemesterId(initialData?.semesterId || (semesters.length > 0 ? semesters[0].id : ''));

      setDates(initialData?.date ? [new DateObject(initialData.date.toDate())] : []);
      setFormat(initialData?.format || 'stacjonarny');
    }
  }, [initialData, open, semesters]);

  const handleSave = async () => {
    if (!semesterId || dates.length === 0) {
      return toast.error('Wszystkie pola są wymagane.');
    }
    setLoading(true);
    const dataToSave = {
      semesterId,
      dates: dates.map((d) => Timestamp.fromDate(d.toDate())),
      format,
    };
    await onSave(dataToSave, initialData?.id);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>{initialData?.id ? 'Edytuj Daty' : 'Dodaj Nowe Daty'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 2 }}
        >
          <FormControl
            fullWidth
            required
          >
            <InputLabel>Semestr</InputLabel>
            <Select
              value={semesterId}
              label="Semestr"
              onChange={(e) => setSemesterId(e.target.value)}
            >
              {semesters.map((s: Semester) => (
                <MenuItem
                  key={s.id}
                  value={s.id}
                >
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <DatePicker
            multiple
            value={dates}
            onChange={(newDates) => setDates(newDates as DateObject[])}
            format="DD.MM.YYYY"
            containerClassName="rmdp-mobile"
            style={{ width: '100%' }}
            placeholder="Wybierz daty zjazdu"
          />
          <FormControl
            fullWidth
            required
          >
            <InputLabel>Forma zjazdu</InputLabel>
            <Select
              value={format}
              label="Forma zjazdu"
              onChange={(e) => setFormat(e.target.value as any)}
            >
              <MenuItem value="stacjonarny">Stacjonarny</MenuItem>
              <MenuItem value="online">Online</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Zapisz'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Główny komponent strony
export const ManageSessionsPage = () => {
  const [semesterDates, setSemesterDates] = useState<SemesterDate[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<SemesterDate | null>(null);

  const fetchData = async () => {
    try {
      // ✅ POPRAWKA: Używamy `semesterDatesService`
      const [datesData, semestersData] = await Promise.all([semesterDatesService.getAll('date'), getSemesters()]);
      setSemesterDates(datesData as SemesterDate[]);
      setSemesters(semestersData as Semester[]);
    } catch (e) {
      toast.error('Błąd pobierania danych.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (data: Omit<SemesterDate, 'id'>, id?: string) => {
    // ✅ POPRAWKA: Używamy `semesterDatesService`
    const promise = id ? semesterDatesService.update(id, data) : semesterDatesService.add(data);
    await toast.promise(promise, {
      loading: 'Zapisywanie...',
      success: `Daty zostały ${id ? 'zaktualizowane' : 'dodane'}.`,
      error: 'Wystąpił błąd.',
    });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć te daty?')) {
      // ✅ POPRAWKA: Używamy `semesterDatesService`
      await toast.promise(semesterDatesService.delete(id), {
        loading: 'Usuwanie...',
        success: 'Daty zostały usunięte.',
        error: 'Wystąpił błąd.',
      });
      fetchData();
    }
  };

  const handleOpenModal = (date: SemesterDate | null = null) => {
    setEditingDate(date);
    setIsModalOpen(true);
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Zarządzaj Datami Semestrów</Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => handleOpenModal()}
        >
          Dodaj Daty
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Semestr</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Forma</TableCell>
              <TableCell align="right">Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {semesterDates.map((dateEntry) => (
              <TableRow
                key={dateEntry.id}
                hover
              >
                <TableCell>{semesters.find((s) => s.id === dateEntry.semesterId)?.name || 'B/D'}</TableCell>
                <TableCell>{dateEntry.date.toDate().toLocaleDateString('pl-PL')}</TableCell>
                <TableCell>{dateEntry.format}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenModal(dateEntry)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(dateEntry.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {isModalOpen && (
        <SemesterDateFormModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          initialData={editingDate}
          semesters={semesters}
        />
      )}
    </Box>
  );
};
