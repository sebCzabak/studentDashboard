import { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import { getSemesters, addSemester, updateSemester, deleteSemester } from '../../features/shared/dictionaryService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';

// Wewnętrzny komponent formularza
const SemesterForm = ({ open, onClose, onSave, initialData }: any) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setStartDate(initialData.startDate ? format(initialData.startDate.toDate(), 'yyyy-MM-dd') : '');
      setEndDate(initialData.endDate ? format(initialData.endDate.toDate(), 'yyyy-MM-dd') : '');
    } else {
      setName('');
      setStartDate('');
      setEndDate('');
    }
  }, [initialData, open]);

  const handleSave = () => {
    if (!name || !startDate || !endDate) return toast.error('Wszystkie pola są wymagane.');
    onSave({ name, startDate: new Date(startDate), endDate: new Date(endDate) });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogTitle>{initialData ? 'Edytuj Semestr' : 'Dodaj Nowy Semestr'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 1 }}
        >
          <TextField
            label="Nazwa (np. Semestr Zimowy 2025/2026)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Data rozpoczęcia"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Data zakończenia"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button
          onClick={handleSave}
          variant="contained"
        >
          Zapisz
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ManageSemestersPage = () => {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('stacjonarne');

  const fetchData = () => {
    getSemesters()
      .then((data) => setSemesters(data))
      .catch(() => toast.error('Błąd wczytywania semestrów.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = (data: any) => {
    // Tworzymy "opakowującą" funkcję async, która zawsze zwraca Promise<void>
    const saveAction = async () => {
      if (editingSemester) {
        await updateSemester(editingSemester.id, data);
      } else {
        await addSemester(data);
      }
    };

    // Przekazujemy wywołanie tej funkcji do toast.promise
    toast.promise(saveAction(), {
      loading: 'Zapisywanie...',
      success: () => {
        setIsModalOpen(false);
        fetchData();
        return 'Semestr został zapisany!';
      },
      error: 'Błąd podczas zapisu.',
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten semestr?')) {
      await toast.promise(deleteSemester(id), {
        loading: 'Usuwanie...',
        success: 'Semestr usunięty.',
        error: 'Błąd podczas usuwania.',
      });
      fetchData();
    }
  };
  const filteredSemesters = useMemo(() => {
    return semesters.filter((s) => s.type === activeTab);
  }, [semesters, activeTab]);

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '900px' }}>
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
            onClick={() => {
              setEditingSemester(null);
              setIsModalOpen(true);
            }}
          >
            Dodaj Semestr
          </Button>
        </Box>

        {/* SEKCJA Z ZAKŁADKAMI */}
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

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nazwa</TableCell>
                <TableCell>Początek</TableCell>
                <TableCell>Koniec</TableCell>
                <TableCell>Akcje</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSemesters.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{format(s.startDate.toDate(), 'd MMM yyyy', { locale: pl })}</TableCell>
                  <TableCell>{format(s.endDate.toDate(), 'd MMM yyyy', { locale: pl })}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => {
                        setEditingSemester(s);
                        setIsModalOpen(true);
                      }}
                    >
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
        <SemesterForm
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          initialData={editingSemester}
        />
      </Paper>
    </Box>
  );
};
