import React, { useState, useEffect, useMemo } from 'react';
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
  TextField,
  Stack,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getSemesters, addSemester, updateSemester, deleteSemester } from '../../features/shared/dictionaryService';
import toast from 'react-hot-toast';
import { pl } from 'date-fns/locale';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';
import type { Semester } from '../../features/timetable/types';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// Wewnętrzny komponent formularza
interface SemesterFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    data: Omit<Semester, 'id' | 'startDate' | 'endDate'> & { startDate: Date; endDate: Date },
    id?: string
  ) => Promise<void>;
  initialData: Partial<Semester> | null;
}

const SemesterForm: React.FC<SemesterFormProps> = ({ open, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'stacjonarne' | 'niestacjonarne' | 'podyplomowe' | 'anglojęzyczne'>('stacjonarne');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setType(initialData?.type || 'stacjonarne');
      setStartDate(initialData?.startDate ? initialData.startDate.toDate() : null);
      setEndDate(initialData?.endDate ? initialData.endDate.toDate() : null);
    }
  }, [initialData, open]);

  const handleSave = async () => {
    if (!name || !type || !startDate || !endDate) {
      return toast.error('Wszystkie pola są wymagane.');
    }
    setLoading(true);
    await onSave({ name, type, startDate, endDate }, initialData?.id);
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
      <DialogTitle>{initialData?.id ? 'Edytuj Semestr' : 'Dodaj Nowy Semestr'}</DialogTitle>
      <DialogContent>
        <LocalizationProvider
          dateAdapter={AdapterDateFns}
          adapterLocale={pl}
        >
          <Stack
            spacing={2}
            sx={{ pt: 2 }}
          >
            <TextField
              label="Nazwa (np. Semestr Zimowy 2025/2026)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
            />
            <FormControl
              fullWidth
              required
            >
              <InputLabel>Typ studiów</InputLabel>
              <Select
                value={type}
                label="Typ studiów"
                onChange={(e) => setType(e.target.value as any)}
              >
                <MenuItem value="stacjonarne">Stacjonarne</MenuItem>
                <MenuItem value="niestacjonarne">Niestacjonarne</MenuItem>
                <MenuItem value="podyplomowe">Podyplomowe</MenuItem>
                <MenuItem value="anglojęzyczne">Anglojęzyczne</MenuItem>
              </Select>
            </FormControl>
            <DatePicker
              label="Data rozpoczęcia"
              value={startDate}
              onChange={setStartDate}
            />
            <DatePicker
              label="Data zakończenia"
              value={endDate}
              onChange={setEndDate}
            />
          </Stack>
        </LocalizationProvider>
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
export const ManageSemestersPage = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [activeTab, setActiveTab] = useState<'stacjonarne' | 'niestacjonarne' | 'podyplomowe' | 'anglojęzyczne'>(
    'stacjonarne'
  );

  // ✅ POPRAWKA: onSnapshot jest lepszy, ale wracamy do `fetchData`, zgodnie z Twoim kodem
  const fetchData = () => {
    setLoading(true);
    getSemesters()
      .then((data) => {
        setSemesters(data as Semester[]);
      })
      .catch((error) => {
        toast.error('Błąd wczytywania semestrów.');
        console.error(error);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (
    data: Omit<Semester, 'id' | 'startDate' | 'endDate'> & { startDate: Date; endDate: Date },
    id?: string
  ) => {
    // ✅ POPRAWKA: Wywołujemy osobne funkcje `updateSemester` i `addSemester`
    const promise = id ? updateSemester(id, data) : addSemester(data);

    await toast.promise(promise, {
      loading: 'Zapisywanie...',
      success: () => {
        fetchData(); // Odświeżamy dane po operacji
        return `Semestr został ${id ? 'zaktualizowany' : 'dodany'}.`;
      },
      error: 'Wystąpił błąd.',
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten semestr?')) {
      await toast.promise(deleteSemester(id), {
        loading: 'Usuwanie...',
        success: () => {
          fetchData(); // Odświeżamy dane po operacji
          return 'Semestr został usunięty.';
        },
        error: 'Wystąpił błąd.',
      });
    }
  };

  const filteredSemesters = useMemo(() => {
    return semesters.filter((s) => s.type === activeTab);
  }, [semesters, activeTab]);

  const handleOpenModal = (semester: Semester | null = null) => {
    setEditingSemester(semester);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Button
        component={RouterLink}
        to="/admin"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Wróć do pulpitu
      </Button>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography
          variant="h4"
          gutterBottom
        >
          Zarządzaj Semestrami
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => handleOpenModal()}
        >
          Dodaj Semestr
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, newValue) => setActiveTab(newValue)}
        >
          <Tab
            label="Stacjonarne"
            value="stacjonarne"
          />
          <Tab
            label="Niestacjonarne"
            value="niestacjonarne"
          />
          <Tab
            label="Podyplomowe"
            value="podyplomowe"
          />
          <Tab
            label="Anglojęzyczne"
            value="anglojęzyczne"
          />
        </Tabs>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nazwa</TableCell>
              <TableCell>Początek</TableCell>
              <TableCell>Koniec</TableCell>
              <TableCell align="right">Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSemesters.map((s) => (
              <TableRow
                key={s.id}
                hover
              >
                <TableCell>{s.name}</TableCell>
                <TableCell>{s.startDate ? s.startDate.toDate().toLocaleDateString('pl-PL') : '---'}</TableCell>
                <TableCell>{s.endDate ? s.endDate.toDate().toLocaleDateString('pl-PL') : '---'}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenModal(s)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(s.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {isModalOpen && (
        <SemesterForm
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          initialData={editingSemester}
        />
      )}
    </Box>
  );
};
