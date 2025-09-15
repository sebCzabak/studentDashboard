import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  Chip,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Tooltip,
  Switch,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GridViewIcon from '@mui/icons-material/GridView';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { TimetableFormModal } from '../../features/timetable/components/TimetableFormModal';
import {
  createTimetable,
  updateTimetable,
  deleteTimetableAndEntries,
  updateTimetableStatus,
  copyTimetable, // Importujemy nową funkcję
} from '../../features/timetable/scheduleService';
import { groupsService, getSemesters } from '../../features/shared/dictionaryService';
import { getCurriculums } from '../../features/curriculums/curriculumsService';
import type { Timetable, Group, Semester, Curriculum } from '../../features/timetable/types';

export const ManageTimetablesPage = () => {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<Timetable | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timetablesQuery = collection(db, 'timetables');
    const unsubscribe = onSnapshot(timetablesQuery, (snapshot) => {
      const timetablesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Timetable));
      setTimetables(timetablesData);
      if (loading) {
        Promise.all([groupsService.getAll(), getSemesters(), getCurriculums()])
          .then(([groupsData, semestersData, curriculumsData]) => {
            setGroups(groupsData as Group[]);
            setSemesters(semestersData as Semester[]);
            setCurriculums(curriculumsData as Curriculum[]);
          })
          .catch((_err) => toast.error('Błąd wczytywania danych słownikowych.'))
          .finally(() => setLoading(false));
      }
    });
    return () => unsubscribe();
  }, [loading]);

  const handleSave = async (data: Partial<Timetable>, id?: string) => {
    const promise = id ? updateTimetable(id, data) : createTimetable(data);
    await toast.promise(promise, {
      loading: 'Zapisywanie planu...',
      success: `Plan został pomyślnie ${id ? 'zaktualizowany' : 'utworzony'}!`,
      error: `Błąd podczas ${id ? 'aktualizacji' : 'tworzenia'} planu.`,
    });
  };

  const handleDelete = async (timetableId: string, timetableName: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć plan "${timetableName}" i wszystkie jego zajęcia?`)) {
      await toast.promise(deleteTimetableAndEntries(timetableId), {
        loading: 'Usuwanie planu i zajęć...',
        success: 'Plan został pomyślnie usunięty.',
        error: 'Błąd podczas usuwania.',
      });
    }
  };

  const handleStatusChange = async (timetable: Timetable) => {
    const newStatus = timetable.status === 'published' ? 'draft' : 'published';
    await toast.promise(updateTimetableStatus(timetable.id, newStatus), {
      loading: 'Aktualizowanie statusu...',
      success: `Status zmieniony na: ${newStatus === 'published' ? 'Opublikowany' : 'Roboczy'}`,
      error: 'Błąd podczas zmiany statusu.',
    });
  };

  const handleOpenModal = (timetable: Timetable | null = null) => {
    setEditingTimetable(timetable);
    setIsModalOpen(true);
  };

  const handleCopy = async (timetableToCopy: Timetable) => {
    const newName = window.prompt('Podaj nową nazwę dla kopii planu:', `${timetableToCopy.name} - Kopia`);

    if (newName) {
      const promise = copyTimetable(timetableToCopy.id, newName);
      await toast.promise(promise, {
        loading: 'Kopiowanie planu i wszystkich zajęć...',
        success: 'Plan został pomyślnie skopiowany!',
        error: (err) => err.message || 'Wystąpił błąd podczas kopiowania.',
      });
    }
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
      >
        Wróć do pulpitu
      </Button>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2 }}>
        <Typography variant="h4">Zarządzaj Planami Zajęć</Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => handleOpenModal()}
        >
          Dodaj nowy plan
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nazwa Planu</TableCell>
              <TableCell>Siatka Programowa</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Publikacja</TableCell>
              <TableCell align="right">Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {timetables.map((tt) => (
              <TableRow
                key={tt.id}
                hover
              >
                <TableCell>{tt.name}</TableCell>
                <TableCell>{tt.curriculumName || '---'}</TableCell>
                <TableCell>
                  <Chip
                    label={tt.status === 'published' ? 'Opublikowany' : 'Roboczy'}
                    color={tt.status === 'published' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Switch
                    checked={tt.status === 'published'}
                    onChange={() => handleStatusChange(tt)}
                    color="success"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Układaj w kreatorze">
                    <IconButton
                      color="secondary"
                      onClick={() => navigate(`/admin/timetables/${tt.id}`)}
                    >
                      <GridViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edytuj dane">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenModal(tt)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Kopiuj plan">
                    {/* ✅ POPRAWKA: Przycisk wywołuje nową funkcję `handleCopy` */}
                    <IconButton onClick={() => handleCopy(tt)}>
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Usuń plan">
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(tt.id, tt.name)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {isModalOpen && (
        <TimetableFormModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          timetable={editingTimetable}
          semesters={semesters}
          groups={groups}
          curriculums={curriculums}
        />
      )}
    </Box>
  );
};
