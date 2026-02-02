import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
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
  Card,
  CardContent,
  CardActions,
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
  TextField,
  InputAdornment,
  Stack,
  Chip as MuiChip,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress,
  Toolbar,
  Checkbox,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GridViewIcon from '@mui/icons-material/GridView';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GoogleIcon from '@mui/icons-material/Google';
import TableChartIcon from '@mui/icons-material/TableChart';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import { TimetableFormModal } from '../../features/timetable/components/TimetableFormModal';
import { GroupSelectionModal } from '../../features/timetable/components/GroupSelectionModal';
import {
  createTimetable,
  updateTimetable,
  deleteTimetableAndEntries,
  updateTimetableStatus,
  copyTimetable,
} from '../../features/timetable/scheduleService';
import { exportToGoogleCalendar } from '../../features/calendar/services/googleCalendarService';
import { exportTimetableToPdf, exportTimetableToExcel } from '../../features/timetable/exportService';
import {
  groupsService,
  getSemesters,
  getAllLecturers,
  specializationsService,
  semesterDatesService,
} from '../../features/shared/dictionaryService';
import { getCurriculums } from '../../features/curriculums/curriculumsService';
import { useAuthContext } from '../../context/AuthContext';
import type {
  Timetable,
  Group,
  Semester,
  Curriculum,
  ScheduleEntry,
  UserProfile,
  Specialization,
  SemesterDate,
} from '../../features/timetable/types';

export const TimetablesListPage = () => {
  const { accessToken } = useAuthContext();
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [lecturers, setLecturers] = useState<UserProfile[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [semesterDates, setSemesterDates] = useState<SemesterDate[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<Timetable | null>(null);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'stacjonarny' | 'zaoczne' | 'podyplomowe' | 'anglojęzyczne'>('stacjonarny');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [isGoogleExportModalOpen, setGoogleExportModalOpen] = useState(false);
  const [timetableToExport, setTimetableToExport] = useState<Timetable | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTimetableForMenu, setSelectedTimetableForMenu] = useState<Timetable | null>(null);
  const [selectedTimetables, setSelectedTimetables] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    setLoading(true);

    const collectionsToWatch = [
      { name: 'timetables', setter: setTimetables },
      { name: 'groups', setter: setGroups },
      { name: 'semesters', setter: setSemesters },
      { name: 'curriculums', setter: setCurriculums },
      { name: 'specializations', setter: setSpecializations },
      { name: 'semesterDates', setter: setSemesterDates },
      { name: 'scheduleEntries', setter: setScheduleEntries },
    ];

    collectionsToWatch.forEach((c) => {
      const q = query(collection(db, c.name));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          c.setter(data as any);
        },
        (error) => {
          toast.error(`Błąd synchronizacji kolekcji: ${c.name}`);
          console.error(error);
        }
      );
      unsubscribers.push(unsubscribe);
    });

    getAllLecturers()
      .then((data) => setLecturers(data as UserProfile[]))
      .catch(() => toast.error('Błąd pobierania listy prowadzących.'))
      .finally(() => setLoading(false)); // Ustawiamy loading na false po ostatnim zapytaniu

    return () => unsubscribers.forEach((unsub) => unsub());
  }, []);

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
    return timetables.filter((t) => {
      // Filtry podstawowe
      const matchesTab = (t.studyMode || 'stacjonarny') === activeTab;
      const matchesYear = selectedYear === 'all' || t.academicYear === selectedYear;
      const matchesCurriculum = selectedCurriculumId === 'all' || t.curriculumId === selectedCurriculumId;
      const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;

      // Wyszukiwarka - szuka w nazwie planu i nazwie siatki programowej
      const matchesSearch =
        searchTerm === '' ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.curriculumName || '').toLowerCase().includes(searchTerm.toLowerCase());

      return matchesTab && matchesYear && matchesCurriculum && matchesStatus && matchesSearch;
    });
  }, [timetables, activeTab, selectedYear, selectedCurriculumId, selectedStatus, searchTerm]);

  // Obliczanie całkowitej liczby przedmiotów z curriculum dla każdego planu (tylko z przypisanego semestru)
  const totalSubjectsByTimetable = useMemo(() => {
    const result: Record<string, number> = {};
    timetables.forEach((tt) => {
      if (!tt.curriculumId || !tt.semesterId) {
        result[tt.id] = 0;
        return;
      }
      const curriculum = curriculums.find((c) => c.id === tt.curriculumId);
      if (!curriculum) {
        result[tt.id] = 0;
        return;
      }
      // Znajdź semestr w curriculum który odpowiada semesterId z timetable
      const semester = curriculum.semesters.find((s) => s.semesterId === tt.semesterId);
      if (!semester) {
        result[tt.id] = 0;
        return;
      }
      // Licz tylko przedmioty z tego konkretnego semestru
      result[tt.id] = semester.subjects?.length || 0;
    });
    return result;
  }, [timetables, curriculums]);

  // Obliczanie liczby unikalnych przedmiotów zaplanowanych dla każdego planu
  const scheduledSubjectsByTimetable = useMemo(() => {
    const result: Record<string, number> = {};
    timetables.forEach((tt) => {
      const entriesForTimetable = scheduleEntries.filter((e) => e.timetableId === tt.id);
      // Zbierz unikalne subjectId - sprawdzamy czy subjectId istnieje i nie jest pusty
      const subjectIds = entriesForTimetable
        .map((e) => e.subjectId)
        .filter((id): id is string => Boolean(id) && id !== '');
      const uniqueSubjects = new Set(subjectIds);
      result[tt.id] = uniqueSubjects.size;
    });
    return result;
  }, [timetables, scheduleEntries]);

  // Statystyki
  const stats = useMemo(() => {
    const totalPlans = filteredTimetables.length;
    const publishedPlans = filteredTimetables.filter((t) => t.status === 'published').length;
    const draftPlans = filteredTimetables.filter((t) => t.status === 'draft').length;
    const archivedPlans = filteredTimetables.filter((t) => t.status === 'archived').length;
    const totalEntries = scheduleEntries.length;
    const entriesByTimetable = scheduleEntries.reduce((acc, entry) => {
      acc[entry.timetableId] = (acc[entry.timetableId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPlans,
      publishedPlans,
      draftPlans,
      archivedPlans,
      totalEntries,
      entriesByTimetable,
    };
  }, [filteredTimetables, scheduleEntries]);

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

  const handleArchive = async (timetable: Timetable) => {
    await toast.promise(updateTimetableStatus(timetable.id, 'archived'), {
      loading: 'Archiwizowanie planu...',
      success: 'Plan zarchiwizowany. Terminy dyspozycyjności się zwolnią.',
      error: 'Błąd podczas archiwizacji.',
    });
  };

  const handleUnarchive = async (timetable: Timetable) => {
    await toast.promise(updateTimetableStatus(timetable.id, 'draft'), {
      loading: 'Przywracanie planu...',
      success: 'Plan przywrócony z archiwum (status: Roboczy).',
      error: 'Błąd podczas przywracania.',
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

  const handleOpenGoogleExportModal = (timetable: Timetable) => {
    setTimetableToExport(timetable);
    setGoogleExportModalOpen(true);
  };

  const handleConfirmGoogleExport = async (selectedGroup: Group, calendarId: string) => {
    setGoogleExportModalOpen(false);
    if (!accessToken || !timetableToExport) {
      toast.error('Brak danych autoryzacyjnych lub planu do eksportu.');
      return;
    }

    const entriesRef = collection(db, 'scheduleEntries');
    const q = query(entriesRef, where('timetableId', '==', timetableToExport.id));
    const entriesSnapshot = await getDocs(q);
    const entries = entriesSnapshot.docs.map((doc) => doc.data() as ScheduleEntry);

    if (entries.length === 0) return toast.error('Ten plan jest pusty.');

    const entriesForGroup = entries.filter((e) => e.groupIds?.includes(selectedGroup.id));
    if (entriesForGroup.length === 0) {
      return toast.error('Brak zajęć dla wybranej grupy w tym planie.');
    }

    await exportToGoogleCalendar(
      timetableToExport,
      entriesForGroup,
      accessToken,
      calendarId,
      lecturers,
      groups,
      specializations,
      semesterDates
    );
    setTimetableToExport(null);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, timetable: Timetable) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTimetableForMenu(timetable);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedTimetableForMenu(null);
  };

  const handleMenuAction = (action: string) => {
    if (!selectedTimetableForMenu) return;

    switch (action) {
      case 'edit':
        handleOpenModal(selectedTimetableForMenu);
        break;
      case 'open':
        navigate(`/admin/timetables/${selectedTimetableForMenu.id}`);
        break;
      case 'archive':
        handleArchive(selectedTimetableForMenu);
        break;
      case 'unarchive':
        handleUnarchive(selectedTimetableForMenu);
        break;
      case 'pdf':
        exportTimetableToPdf(selectedTimetableForMenu);
        break;
      case 'excel':
        exportTimetableToExcel(selectedTimetableForMenu);
        break;
      case 'google':
        handleOpenGoogleExportModal(selectedTimetableForMenu);
        break;
      case 'copy':
        handleCopy(selectedTimetableForMenu);
        break;
      case 'delete':
        handleDelete(selectedTimetableForMenu.id, selectedTimetableForMenu.name);
        break;
    }

    handleCloseMenu();
  };

  const handleToggleSelect = (timetableId: string) => {
    setSelectedTimetables((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(timetableId)) {
        newSet.delete(timetableId);
      } else {
        newSet.add(timetableId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedTimetables.size === filteredTimetables.length) {
      setSelectedTimetables(new Set());
    } else {
      setSelectedTimetables(new Set(filteredTimetables.map((tt) => tt.id)));
    }
  };

  const handleBulkPublish = async () => {
    const promises = Array.from(selectedTimetables).map((id) => {
      const timetable = timetables.find((t) => t.id === id);
      if (timetable && timetable.status !== 'published') {
        return updateTimetableStatus(id, 'published');
      }
      return Promise.resolve();
    });
    await toast.promise(Promise.all(promises), {
      loading: 'Publikowanie planów...',
      success: `Opublikowano ${selectedTimetables.size} planów.`,
      error: 'Błąd podczas publikowania.',
    });
    setSelectedTimetables(new Set());
  };

  const handleBulkUnpublish = async () => {
    const promises = Array.from(selectedTimetables).map((id) => {
      const timetable = timetables.find((t) => t.id === id);
      if (timetable && timetable.status === 'published') {
        return updateTimetableStatus(id, 'draft');
      }
      return Promise.resolve();
    });
    await toast.promise(Promise.all(promises), {
      loading: 'Cofanie publikacji planów...',
      success: `Cofnięto publikację ${selectedTimetables.size} planów.`,
      error: 'Błąd podczas cofania publikacji.',
    });
    setSelectedTimetables(new Set());
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Czy na pewno chcesz usunąć ${selectedTimetables.size} planów i wszystkie ich zajęcia?`)) {
      return;
    }
    const promises = Array.from(selectedTimetables).map((id) => {
      const timetable = timetables.find((t) => t.id === id);
      if (timetable) {
        return deleteTimetableAndEntries(id);
      }
      return Promise.resolve();
    });
    await toast.promise(Promise.all(promises), {
      loading: 'Usuwanie planów...',
      success: `Usunięto ${selectedTimetables.size} planów.`,
      error: 'Błąd podczas usuwania.',
    });
    setSelectedTimetables(new Set());
  };

  if (loading) return <CircularProgress />;

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

      {/* Panel statystyk */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
        >
          Statystyki
        </Typography>
        <Grid
          container
          spacing={2}
        >
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{stats.totalPlans}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Wszystkich Planów
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h4"
                color="success.main"
              >
                {stats.publishedPlans}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Opublikowanych
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h4"
                color="warning.main"
              >
                {stats.draftPlans}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Roboczych
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{stats.totalEntries}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Zajęć w Planach
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Pasek wyszukiwarki i filtrów */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          spacing={2}
        >
          {/* Wyszukiwarka */}
          <TextField
            fullWidth
            placeholder="Szukaj po nazwie planu lub siatce programowej..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchTerm('')}
                    edge="end"
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Filtry */}
          <Grid
            container
            spacing={2}
            alignItems="center"
          >
            <Grid size={{ xs: 12, lg: 4 }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue as any)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
              >
                <Tab
                  label="Dzienne"
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
            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
              <FormControl
                fullWidth
                size="small"
              >
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedStatus}
                  label="Status"
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <MenuItem value="all">Wszystkie</MenuItem>
                  <MenuItem value="published">Opublikowane</MenuItem>
                  <MenuItem value="draft">Robocze</MenuItem>
                  <MenuItem value="archived">Archiwum</MenuItem>
                </Select>
              </FormControl>
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

          {/* Aktywne filtry - chipy */}
          {(searchTerm || selectedStatus !== 'all' || selectedYear !== 'all' || selectedCurriculumId !== 'all') && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <FilterListIcon
                fontSize="small"
                color="action"
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mr: 1 }}
              >
                Aktywne filtry:
              </Typography>
              {searchTerm && (
                <MuiChip
                  label={`Szukaj: "${searchTerm}"`}
                  size="small"
                  onDelete={() => setSearchTerm('')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {selectedStatus !== 'all' && (
                <MuiChip
                  label={`Status: ${
                    selectedStatus === 'published'
                      ? 'Opublikowane'
                      : selectedStatus === 'archived'
                        ? 'Archiwum'
                        : 'Robocze'
                  }`}
                  size="small"
                  onDelete={() => setSelectedStatus('all')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {selectedYear !== 'all' && (
                <MuiChip
                  label={`Rok: ${selectedYear}`}
                  size="small"
                  onDelete={() => setSelectedYear('all')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {selectedCurriculumId !== 'all' && (
                <MuiChip
                  label={`Program: ${availableCurriculums.find((c) => c.id === selectedCurriculumId)?.programName || ''}`}
                  size="small"
                  onDelete={() => setSelectedCurriculumId('all')}
                  color="primary"
                  variant="outlined"
                />
              )}
              <Button
                size="small"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('all');
                  setSelectedYear('all');
                  setSelectedCurriculumId('all');
                }}
                startIcon={<ClearIcon />}
              >
                Wyczyść wszystkie
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Quick actions toolbar */}
      {selectedTimetables.size > 0 && (
        <Paper sx={{ mb: 2 }}>
          <Toolbar
            sx={{
              bgcolor: 'action.selected',
              borderRadius: 1,
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography>
                Zaznaczono: {selectedTimetables.size} {selectedTimetables.size === 1 ? 'plan' : 'planów'}
              </Typography>
              <Button
                size="small"
                onClick={handleSelectAll}
              >
                {selectedTimetables.size === filteredTimetables.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                color="success"
                startIcon={<EditIcon />}
                onClick={handleBulkPublish}
                disabled={!Array.from(selectedTimetables).some((id) => {
                  const tt = timetables.find((t) => t.id === id);
                  return tt && tt.status !== 'published';
                })}
              >
                Opublikuj
              </Button>
              <Button
                size="small"
                color="warning"
                startIcon={<EditIcon />}
                onClick={handleBulkUnpublish}
                disabled={!Array.from(selectedTimetables).some((id) => {
                  const tt = timetables.find((t) => t.id === id);
                  return tt && tt.status === 'published';
                })}
              >
                Cofnij publikację
              </Button>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleBulkDelete}
              >
                Usuń zaznaczone
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedTimetables(new Set())}
              >
                Anuluj
              </Button>
            </Box>
          </Toolbar>
        </Paper>
      )}

      {/* Widok kart */}
      {filteredTimetables.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography
            variant="h6"
            color="text.secondary"
          >
            Brak planów spełniających kryteria wyszukiwania
          </Typography>
        </Paper>
      ) : (
        <Grid
          container
          spacing={2}
        >
          {filteredTimetables.map((tt) => {
            const entriesCount = stats.entriesByTimetable[tt.id] || 0;
            const scheduledSubjects = scheduledSubjectsByTimetable[tt.id] || 0;
            const totalSubjects = totalSubjectsByTimetable[tt.id] || 0;
            const progressPercentage = totalSubjects > 0 ? Math.min((scheduledSubjects / totalSubjects) * 100, 100) : 0;
            return (
              <Grid
                size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                key={tt.id}
              >
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: selectedTimetables.has(tt.id) ? 2 : 1,
                    borderColor: selectedTimetables.has(tt.id) ? 'primary.main' : 'divider',
                    '&:hover': {
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                      <Checkbox
                        checked={selectedTimetables.has(tt.id)}
                        onChange={() => handleToggleSelect(tt.id)}
                        onClick={(e) => e.stopPropagation()}
                        size="small"
                        sx={{ mt: -1, ml: -1 }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexGrow: 1 }}>
                        <Typography
                          variant="h6"
                          component="div"
                          sx={{ fontWeight: 'bold', flexGrow: 1 }}
                        >
                          {tt.name}
                        </Typography>
                        <Chip
                          label={
                            tt.status === 'published'
                              ? 'Opublikowany'
                              : tt.status === 'archived'
                                ? 'Archiwum'
                                : 'Roboczy'
                          }
                          color={
                            tt.status === 'published'
                              ? 'success'
                              : tt.status === 'archived'
                                ? 'default'
                                : 'default'
                          }
                          variant={tt.status === 'archived' ? 'outlined' : 'filled'}
                          size="small"
                        />
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Siatka programowa:
                      </Typography>
                      <Typography variant="body1">
                        {tt.curriculumName || '---'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Postęp planowania:
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontWeight: 'bold' }}
                        >
                          {scheduledSubjects} / {totalSubjects} przedmiotów
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progressPercentage}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                          },
                        }}
                        color={progressPercentage === 100 ? 'success' : progressPercentage >= 50 ? 'primary' : 'warning'}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        {Math.round(progressPercentage)}% ukończono
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Publikacja:
                      </Typography>
                      <Tooltip title={tt.status === 'published' ? 'Cofnij publikację' : 'Opublikuj plan'}>
                        <Switch
                          checked={tt.status === 'published'}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusChange(tt);
                          }}
                          color="success"
                          size="small"
                        />
                      </Tooltip>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'flex-end', pt: 0, pb: 1 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => handleOpenMenu(e, tt)}
                      aria-label="więcej opcji"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

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
      {timetableToExport && (
        <GroupSelectionModal
          open={isGoogleExportModalOpen}
          onClose={() => setGoogleExportModalOpen(false)}
          onConfirm={handleConfirmGoogleExport}
          groups={
            (timetableToExport.groupIds || []).map((id) => groups.find((g) => g.id === id)).filter(Boolean) as Group[]
          }
        />
      )}

      {/* Menu akcji */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={() => handleMenuAction('open')}>
          <ListItemIcon>
            <GridViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Układaj w kreatorze</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('edit')}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edytuj dane</ListItemText>
        </MenuItem>
        {selectedTimetableForMenu?.status === 'archived' ? (
          <MenuItem onClick={() => handleMenuAction('unarchive')}>
            <ListItemIcon>
              <UnarchiveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Przywróć z archiwum</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleMenuAction('archive')}>
            <ListItemIcon>
              <ArchiveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Archiwizuj plan (zwolnij dyspozycyjność)</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => handleMenuAction('pdf')}>
          <ListItemIcon>
            <PictureAsPdfIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Eksportuj do PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('excel')}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Eksportuj do Excel</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('google')}>
          <ListItemIcon>
            <GoogleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Eksportuj do Kalendarza Google</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleMenuAction('copy')}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Kopiuj plan</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => handleMenuAction('delete')}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon
              fontSize="small"
              color="error"
            />
          </ListItemIcon>
          <ListItemText>Usuń plan</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};
