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
  Switch,
  Tooltip,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  getTimetables,
  createTimetable,
  deleteTimetableAndEntries,
  updateTimetableStatus,
} from '../../features/timetable/scheduleService';
import { groupsService, getSemesters } from '../../features/shared/dictionaryService';
import { getCurriculums } from '../../features/curriculums/curriculumsService';
import { TimetableFormModal } from '../../features/timetable/components/TimetableFormModal';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import toast from 'react-hot-toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export const ManageTimetablesPage = () => {
  const [timetables, setTimetables] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<any | null>(null);

  const fetchData = () => {
    Promise.all([getTimetables(), groupsService.getAll(), getSemesters(), getCurriculums()])
      .then(([timetablesData, groupsData, semestersData, curriculumsData]) => {
        setTimetables(timetablesData);
        setGroups(groupsData);
        setSemesters(semestersData);
        setCurriculums(curriculumsData);
      })
      .catch((error) => {
        toast.error('Nie udało się wczytać danych.');
        console.error('Błąd w Promise.all:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (data: any) => {
    const promise = createTimetable(data);
    await toast.promise(promise, {
      loading: 'Tworzenie planu...',
      success: () => {
        fetchData();
        return 'Nowy plan został pomyślnie utworzony!';
      },
      error: 'Błąd podczas tworzenia planu.',
    });
  };

  const handleOpenCreateModal = () => {
    setEditingTimetable(null);
    setIsModalOpen(true);
  };

  const handleOpenCopyModal = (timetableToCopy: any) => {
    setEditingTimetable(timetableToCopy);
    setIsModalOpen(true);
  };

  const handleDelete = async (timetableId: string, timetableName: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć plan "${timetableName}" i wszystkie jego zajęcia?`)) {
      const promise = deleteTimetableAndEntries(timetableId);
      await toast.promise(promise, {
        loading: 'Usuwanie planu i zajęć...',
        success: () => {
          fetchData();
          return 'Plan został pomyślnie usunięty.';
        },
        error: 'Błąd podczas usuwania planu.',
      });
    }
  };

  const handleStatusChange = async (timetable: any) => {
    const newStatus = timetable.status === 'published' ? 'draft' : 'published';
    const promise = updateTimetableStatus(timetable.id, newStatus);

    await toast.promise(promise, {
      loading: 'Aktualizowanie statusu...',
      success: () => {
        fetchData();
        return `Status planu zmieniony na: ${newStatus}`;
      },
      error: 'Błąd podczas zmiany statusu.',
    });
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            variant="h4"
            gutterBottom
          >
            Zarządzaj Planami Zajęć
          </Typography>
          <Button
            variant="contained"
            onClick={handleOpenCreateModal}
          >
            Stwórz Nowy Plan
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nazwa Planu</TableCell>
                <TableCell>Rok Akademicki</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Opublikowany</TableCell>
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
                  <TableCell>{tt.academicYear}</TableCell>
                  <TableCell>{tt.status}</TableCell>
                  <TableCell align="center">
                    <Tooltip title={tt.status === 'published' ? 'Cofnij publikację' : 'Opublikuj plan'}>
                      <Switch
                        checked={tt.status === 'published'}
                        onChange={() => handleStatusChange(tt)}
                        color="success"
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edytuj w kreatorze">
                      <IconButton
                        component={RouterLink}
                        to={`/admin/timetable/${tt.id}`}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Kopiuj plan">
                      <IconButton onClick={() => handleOpenCopyModal(tt)}>
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Usuń plan">
                      <IconButton onClick={() => handleDelete(tt.id, tt.name)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TimetableFormModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleCreate}
          semesters={semesters}
          groups={groups}
          curriculums={curriculums}
          initialData={editingTimetable}
        />
      </Paper>
    </Box>
  );
};
