import { useState, useEffect, useMemo } from 'react';
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
  Tabs,
  Tab,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GridViewIcon from '@mui/icons-material/GridView';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import { TimetableFormModal } from '../../features/timetable/components/TimetableFormModal';
import {
  createTimetable,
  updateTimetable,
  deleteTimetableAndEntries,
  updateTimetableStatus,
  copyTimetable,
} from '../../features/timetable/scheduleService';
import { exportTimetableToPdf } from '../../features/timetable/exportService';
import { groupsService, getSemesters } from '../../features/shared/dictionaryService';
import { getCurriculums } from '../../features/curriculums/curriculumsService';
import type { Timetable, Group, Semester, Curriculum } from '../../features/timetable/types';
import { exportTimetableToExcel } from '../../features/timetable/exportService';

export const TimetablesListPage = () => {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<Timetable | null>(null);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'stacjonarny' | 'zaoczne' | 'podyplomowe' | 'anglojęzyczne'>(
    'stacjonarny'
  );
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('all');

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

  const academicYears = useMemo(
    () => ['all', ...Array.from(new Set(timetables.map((t) => t.academicYear).filter(Boolean)))],
    [timetables]
  );
  const availableCurriculums = useMemo(() => {
    const allOption: Curriculum = {
      id: 'all',
      programName: 'Wszystkie programy',
      name: '',
      academicYear: '',
      semesters: [],
    };
    return [allOption, ...curriculums];
  }, [curriculums]);

  const filteredTimetables = useMemo(() => {
    return timetables.filter(
      (t) =>
        (t.studyMode || 'stacjonarny') === activeTab &&
        (selectedYear === 'all' || t.academicYear === selectedYear) &&
        (selectedCurriculumId === 'all' || t.curriculumId === selectedCurriculumId)
    );
  }, [timetables, activeTab, selectedYear, selectedCurriculumId]);

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

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid
          container
          spacing={2}
          alignItems="center"
        >
          <Grid size={{ xs: 12, lg: 6 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
              <Tab
                label="Stacjonarne"
                value="stacjonarny"
              />
              <Tab
                label="Zaoczne"
                value="zaoczne"
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
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <FormControl
              fullWidth
              size="small"
            >
              <InputLabel>Rok Akademicki</InputLabel>
              <Select
                value={selectedYear}
                label="Rok Akademicki"
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <MenuItem value="all">Wszystkie</MenuItem>
                {academicYears.map(
                  (year) =>
                    year !== 'all' && (
                      <MenuItem
                        key={year}
                        value={year}
                      >
                        {year}
                      </MenuItem>
                    )
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <FormControl
              fullWidth
              size="small"
            >
              <InputLabel>Program studiów</InputLabel>
              <Select
                value={selectedCurriculumId}
                label="Program studiów"
                onChange={(e) => setSelectedCurriculumId(e.target.value)}
              >
                {availableCurriculums.map((c) => (
                  <MenuItem
                    key={c.id}
                    value={c.id}
                  >
                    {c.programName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

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
            {filteredTimetables.map((tt) => (
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
                  <Tooltip title={tt.status === 'published' ? 'Cofnij publikację' : 'Opublikuj plan'}>
                    <Switch
                      checked={tt.status === 'published'}
                      onChange={() => handleStatusChange(tt)}
                      color="success"
                    />
                  </Tooltip>
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
                  <Tooltip title="Eksportuj do PDF">
                    <IconButton onClick={() => exportTimetableToPdf(tt)}>
                      <PictureAsPdfIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eksportuj do Excel/Google Sheets">
                    <IconButton onClick={() => exportTimetableToExcel(tt)}>
                      <TableChartIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Kopiuj plan">
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
