import { useState, useEffect } from 'react';
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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  getSubjects,
  addSubject,
  updateSubject,
  deleteSubject,
  checkIfSubjectExists,
} from '../../features/subjects/subjectsService';
import { departmentsService, degreeLevelsService } from '../../features/shared/dictionaryService';
import toast from 'react-hot-toast';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { type Subject } from '../../features/subjects/types';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Wewnętrzny komponent formularza z walidacją
const SubjectForm = ({ open, onClose, onSave, initialData, departmentsList, degreeLevelsList }: any) => {
  const [name, setName] = useState('');
  const [degreeLevel, setDegreeLevel] = useState('');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setDegreeLevel(initialData?.degreeLevel || '');
      setDepartment(initialData?.department || '');
    }
  }, [initialData, open]);

  const handleSave = async () => {
    if (!name.trim() || !degreeLevel || !department) {
      return toast.error('Wszystkie pola są wymagane.');
    }

    if (!initialData) {
      const exists = await checkIfSubjectExists(name);
      if (exists) {
        return toast.error('Przedmiot o takiej nazwie już istnieje!');
      }
    }
    // Przekazujemy kompletny obiekt
    onSave({ name: name.trim(), degreeLevel, department });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogTitle>{initialData ? 'Edytuj Przedmiot' : 'Dodaj Nowy Przedmiot'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 1, mt: 1, minWidth: '400px' }}
        >
          <TextField
            label="Nazwa Przedmiotu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Stopień Studiów</InputLabel>
            <Select
              value={degreeLevel}
              label="Stopień Studiów"
              onChange={(e) => setDegreeLevel(e.target.value)}
            >
              {(degreeLevelsList || []).map((level: any) => (
                <MenuItem
                  key={level.id}
                  value={level.name}
                >
                  {level.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Katedra</InputLabel>
            <Select
              value={department}
              label="Katedra"
              onChange={(e) => setDepartment(e.target.value)}
            >
              {(departmentsList || []).map((dep: any) => (
                <MenuItem
                  key={dep.id}
                  value={dep.name}
                >
                  {dep.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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

export const ManageSubjectsPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Stany na "słowniki"
  const [departments, setDepartments] = useState<any[]>([]);
  const [degreeLevels, setDegreeLevels] = useState<any[]>([]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([getSubjects(), departmentsService.getAll(), degreeLevelsService.getAll()])
      .then(([subjectsData, departmentsData, levelsData]) => {
        setSubjects(subjectsData);
        setFilteredSubjects(subjectsData);
        setDepartments(departmentsData);
        setDegreeLevels(levelsData);
      })
      .catch(() => toast.error('Błąd wczytywania danych.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let results = subjects;

    // Filtrowanie po katedrze
    if (selectedDepartment !== 'all') {
      results = results.filter((subject) => subject.department === selectedDepartment);
    }

    // Filtrowanie po nazwie
    if (searchTerm) {
      results = results.filter((subject) => subject.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    setFilteredSubjects(results);
  }, [searchTerm, selectedDepartment, subjects]);

  const handleSave = (data: Omit<Subject, 'id'>) => {
    const saveAction = async () => {
      if (editingSubject) {
        await updateSubject(editingSubject.id, data);
      } else {
        await addSubject(data);
      }
    };
    toast.promise(saveAction(), {
      loading: 'Zapisywanie...',
      success: () => {
        setIsModalOpen(false);
        fetchData();
        return 'Przedmiot został zapisany!';
      },
      error: 'Błąd podczas zapisu.',
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten przedmiot?')) {
      toast.promise(deleteSubject(id), {
        loading: 'Usuwanie...',
        success: () => {
          fetchData();
          return 'Przedmiot usunięty.';
        },
        error: 'Błąd podczas usuwania.',
      });
    }
  };

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
            Zarządzaj Przedmiotami
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setEditingSubject(null);
              setIsModalOpen(true);
            }}
          >
            Dodaj Przedmiot
          </Button>
        </Box>

        <TextField
          label="Szukaj przedmiotu..."
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={selectedDepartment}
            onChange={(_, newValue) => setSelectedDepartment(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              label="Wszystkie"
              value="all"
            />
            {departments.map((department) => (
              <Tab
                key={department.id}
                label={department.name}
                value={department.name}
              />
            ))}
          </Tabs>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nazwa Przedmiotu</TableCell>
                <TableCell>Stopień</TableCell>
                <TableCell>Katedra</TableCell>
                <TableCell align="right">Akcje</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSubjects.map((s) => (
                <TableRow
                  key={s.id}
                  hover
                >
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.degreeLevel}</TableCell>
                  <TableCell>{s.department}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => {
                        setEditingSubject(s);
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
        <SubjectForm
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          initialData={editingSubject}
          departmentsList={departments}
          degreeLevelsList={degreeLevels}
        />
      </Paper>
    </Box>
  );
};
