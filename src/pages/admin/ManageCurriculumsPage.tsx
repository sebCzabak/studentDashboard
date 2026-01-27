import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  TextField,
  InputAdornment,
  Paper,
  Chip,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SchoolIcon from '@mui/icons-material/School';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BookIcon from '@mui/icons-material/Book';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Link as RouterLink } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  updateCurriculum,
  addCurriculum,
  deleteCurriculum,
  getAllSubjects,
} from '../../features/curriculums/curriculumsService';
import {
  getAllLecturers,
  getSemesters,
  groupsService,
  departmentsService,
} from '../../features/shared/dictionaryService';
import { CurriculumFormModal } from '../../features/curriculums/components/CurriculumFormModal';
import toast from 'react-hot-toast';
import type { Curriculum, Subject, UserProfile, Semester, Group, Department } from '../../features/timetable/types';

const DRAWER_WIDTH = 500;

export const ManageCurriculumsPage = () => {
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lecturers, setLecturers] = useState<UserProfile[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [_groups, setGroups] = useState<Group[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuCurriculum, setMenuCurriculum] = useState<Curriculum | null>(null);
  const [drawerSearchTerm, setDrawerSearchTerm] = useState('');

  useEffect(() => {
    isMountedRef.current = true;
    console.log('[ManageCurriculumsPage] useEffect rozpoczęty, isMounted:', isMountedRef.current);
    // ✅ POPRAWKA: Przebudowana logika pobierania danych
    const fetchDictionaries = async () => {
      console.log('[ManageCurriculumsPage] fetchDictionaries rozpoczęty');
      try {
        console.log('[ManageCurriculumsPage] Rozpoczynam Promise.all dla słowników');
        const [subjectsData, lecturersData, semestersData, groupsData, departmentsData] = await Promise.all([
          getAllSubjects(),
          getAllLecturers(),
          getSemesters(),
          groupsService.getAll(),
          departmentsService.getAll(),
        ]);

        console.log('[ManageCurriculumsPage] Promise.all zakończony:', {
          subjects: subjectsData?.length,
          lecturers: lecturersData?.length,
          semesters: semestersData?.length,
          groups: groupsData?.length,
          departments: departmentsData?.length,
        });

        setSubjects((subjectsData as Subject[]).sort((a, b) => a.name.localeCompare(b.name, 'pl')));
        setLecturers((lecturersData as UserProfile[]).sort((a, b) => a.displayName.localeCompare(b.displayName, 'pl')));
        setSemesters(semestersData as Semester[]);
        setGroups(groupsData as Group[]);
        setDepartments(departmentsData as Department[]);
        console.log('[ManageCurriculumsPage] fetchDictionaries zakończony sukcesem');
        return true;
      } catch (error) {
        console.error('[ManageCurriculumsPage] Błąd w fetchDictionaries:', error);
        toast.error('Wystąpił błąd podczas pobierania danych słownikowych.');
        setLoading(false);
        return false;
      }
    };

    fetchDictionaries().then((success) => {
      console.log('[ManageCurriculumsPage] fetchDictionaries.then, success:', success);
      if (success) {
        console.log('[ManageCurriculumsPage] Ustawiam onSnapshot dla curriculums');
        // Dopiero po pobraniu słowników, ustawiamy nasłuch na siatki
        const curriculumsQuery = collection(db, 'curriculums');
        unsubscribeRef.current = onSnapshot(
          curriculumsQuery,
          (snapshot) => {
            try {
              console.log('[ManageCurriculumsPage] onSnapshot callback wywołany, docs:', snapshot.docs.length);
              const curriculumsData = snapshot.docs.map((doc) => {
                const data = doc.data();
                console.log('[ManageCurriculumsPage] Dokument:', doc.id, 'programName:', data.programName);
                return { id: doc.id, ...data } as Curriculum;
              });
              console.log('[ManageCurriculumsPage] Ustawiam curriculums:', curriculumsData.length);
              
              // Sortowanie z zabezpieczeniem
              const sortedCurriculums = curriculumsData.sort((a, b) => {
                const nameA = a.programName || '';
                const nameB = b.programName || '';
                return nameA.localeCompare(nameB, 'pl');
              });
              console.log('[ManageCurriculumsPage] Posortowane curriculums:', sortedCurriculums.length);
              
              setCurriculums(sortedCurriculums);
              console.log('[ManageCurriculumsPage] setCurriculums wywołane');
              
              console.log('[ManageCurriculumsPage] Ustawiam loading na false, isMounted:', isMountedRef.current);
              if (isMountedRef.current) {
                setLoading(false);
                console.log('[ManageCurriculumsPage] setLoading(false) wywołane');
              } else {
                console.log('[ManageCurriculumsPage] Komponent odmontowany, pomijam setLoading');
              }
            } catch (error) {
              console.error('[ManageCurriculumsPage] Błąd w onSnapshot callback:', error);
              toast.error('Błąd przetwarzania danych siatek programowych.');
              setLoading(false);
            }
          },
          (error) => {
            console.error('[ManageCurriculumsPage] Błąd w onSnapshot:', error);
            toast.error('Błąd synchronizacji siatek programowych.');
            setLoading(false);
          }
        );
        console.log('[ManageCurriculumsPage] onSnapshot ustawiony, unsubscribeRef.current:', !!unsubscribeRef.current);
      } else {
        console.log('[ManageCurriculumsPage] fetchDictionaries nie powiódł się, nie ustawiam onSnapshot');
      }
    }).catch((error) => {
      console.error('[ManageCurriculumsPage] Błąd w fetchDictionaries promise:', error);
      setLoading(false);
    });

    // Funkcja czyszcząca dla useEffect
    return () => {
      console.log('[ManageCurriculumsPage] Cleanup useEffect');
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        console.log('[ManageCurriculumsPage] Wywołuję unsubscribe');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  const handleOpenModal = (curriculum: Curriculum | null) => {
    setEditingCurriculum(curriculum);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCurriculum(null);
  };

  const handleSaveCurriculum = async (curriculumData: Omit<Curriculum, 'id'>, id?: string) => {
    const promise = id ? updateCurriculum(id, curriculumData) : addCurriculum(curriculumData);
    await toast.promise(promise, {
      loading: 'Zapisywanie siatki...',
      success: 'Siatka została pomyślnie zapisana!',
      error: 'Wystąpił błąd podczas zapisu.',
    });
    handleCloseModal();
  };

  const handleDeleteCurriculum = async (id: string, name: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć siatkę "${name}"? Tej operacji nie można cofnąć.`)) {
      await toast.promise(deleteCurriculum(id), {
        loading: 'Usuwanie...',
        success: 'Siatka została usunięta.',
        error: 'Wystąpił błąd podczas usuwania.',
      });
    }
  };

  const subjectsMap = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const lecturersMap = useMemo(() => new Map(lecturers.map((l) => [l.id, l.displayName])), [lecturers]);

  // Statystyki
  const stats = useMemo(() => {
    const totalCurriculums = curriculums.length;
    const totalSubjects = curriculums.reduce((acc, curr) => {
      return acc + (curr.semesters || []).reduce((semAcc, sem) => semAcc + (sem.subjects || []).length, 0);
    }, 0);
    const totalSemesters = curriculums.reduce((acc, curr) => acc + (curr.semesters || []).length, 0);
    const totalHours = curriculums.reduce((acc, curr) => {
      return (
        acc +
        (curr.semesters || []).reduce((semAcc, sem) => {
          return semAcc + (sem.subjects || []).reduce((subAcc, sub) => subAcc + (sub.hours || 0), 0);
        }, 0)
      );
    }, 0);

    return {
      totalCurriculums,
      totalSubjects,
      totalSemesters,
      totalHours,
    };
  }, [curriculums]);

  // Unikalne lata akademickie dla filtra
  const academicYears = useMemo(() => {
    const years = Array.from(new Set(curriculums.map((c) => c.academicYear))).sort().reverse();
    return years;
  }, [curriculums]);

  // Filtrowanie
  const filteredCurriculums = useMemo(() => {
    let results = curriculums;

    // Filtrowanie po nazwie lub roku
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      results = results.filter(
        (c) =>
          c.programName.toLowerCase().includes(lowerSearch) ||
          c.academicYear.toLowerCase().includes(lowerSearch)
      );
    }

    // Filtrowanie po roku akademickim
    if (selectedAcademicYear !== 'all') {
      results = results.filter((c) => c.academicYear === selectedAcademicYear);
    }

    return results;
  }, [curriculums, searchTerm, selectedAcademicYear]);

  // Obliczanie statystyk dla pojedynczej siatki
  const getCurriculumStats = (curriculum: Curriculum) => {
    const totalSemesters = (curriculum.semesters || []).length;
    const totalSubjects = (curriculum.semesters || []).reduce(
      (acc, sem) => acc + (sem.subjects || []).length,
      0
    );
    const totalHours = (curriculum.semesters || []).reduce((acc, sem) => {
      return acc + (sem.subjects || []).reduce((subAcc, sub) => subAcc + (sub.hours || 0), 0);
    }, 0);

    return { totalSemesters, totalSubjects, totalHours };
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, curriculum: Curriculum) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuCurriculum(curriculum);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuCurriculum(null);
  };

  const handleOpenDrawer = (curriculum: Curriculum) => {
    setSelectedCurriculum(curriculum);
    setIsDrawerOpen(true);
    setDrawerSearchTerm(''); // Resetuj wyszukiwanie przy otwieraniu
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedCurriculum(null);
    setDrawerSearchTerm(''); // Resetuj wyszukiwanie przy zamykaniu
  };

  // Filtrowanie przedmiotów w drawerze
  const filteredSubjectsInDrawer = useMemo(() => {
    if (!selectedCurriculum || !drawerSearchTerm) return null;

    const lowerSearch = drawerSearchTerm.toLowerCase();
    const filtered: Array<{
      semester: any;
      semesterIndex: number;
      semesterName: string;
      subject: any;
      subjectIndex: number;
    }> = [];

    (selectedCurriculum.semesters || []).forEach((semester: any, semesterIndex: number) => {
      const semesterName = semesters.find((s) => s.id === semester.semesterId)?.name || `Semestr ${semester.semesterNumber || semesterIndex + 1}`;
      (semester.subjects || []).forEach((subject: any, subjectIndex: number) => {
        const subjectName = subjectsMap.get(subject.subjectId) || '';
        const lecturerName = lecturersMap.get(subject.lecturerId) || '';
        const searchableText = `${subjectName} ${lecturerName} ${subject.type}`.toLowerCase();

        if (searchableText.includes(lowerSearch)) {
          filtered.push({
            semester,
            semesterIndex,
            semesterName,
            subject,
            subjectIndex,
          });
        }
      });
    });

    return filtered;
  }, [selectedCurriculum, drawerSearchTerm, subjectsMap, lecturersMap, semesters]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedAcademicYear('all');
  };

  const activeFiltersCount = (searchTerm ? 1 : 0) + (selectedAcademicYear !== 'all' ? 1 : 0);

  console.log('[ManageCurriculumsPage] Render - loading:', loading, 'curriculums:', curriculums.length);

  if (loading) {
    console.log('[ManageCurriculumsPage] Pokazuję CircularProgress');
    return <CircularProgress />;
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
              <Typography variant="h4">{stats.totalCurriculums}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Siatek programowych
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{stats.totalSubjects}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Przedmiotów
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{stats.totalSemesters}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Semestrów
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{stats.totalHours}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Godzin łącznie
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Pasek z wyszukiwarką i filtrami */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          flexWrap="wrap"
        >
          <TextField
            placeholder="Szukaj po nazwie lub roku..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 250 }}
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
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormControl
            size="small"
            sx={{ minWidth: 200 }}
          >
            <InputLabel>Rok akademicki</InputLabel>
            <Select
              value={selectedAcademicYear}
              label="Rok akademicki"
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
            >
              <MenuItem value="all">Wszystkie</MenuItem>
              {academicYears.map((year) => (
                <MenuItem
                  key={year}
                  value={year}
                >
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<SchoolIcon />}
            onClick={() => handleOpenModal(null)}
          >
            Dodaj Siatkę
          </Button>
        </Stack>

        {/* Aktywne filtry */}
        {activeFiltersCount > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography
              variant="caption"
              color="text.secondary"
            >
              Aktywne filtry:
            </Typography>
            {searchTerm && (
              <Chip
                label={`Szukaj: "${searchTerm}"`}
                size="small"
                onDelete={() => setSearchTerm('')}
              />
            )}
            {selectedAcademicYear !== 'all' && (
              <Chip
                label={`Rok: ${selectedAcademicYear}`}
                size="small"
                onDelete={() => setSelectedAcademicYear('all')}
              />
            )}
            <Button
              size="small"
              onClick={handleClearFilters}
            >
              Wyczyść wszystkie
            </Button>
          </Box>
        )}
      </Paper>

      {/* Widok kart */}
      {filteredCurriculums.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography
            variant="h6"
            color="text.secondary"
          >
            {curriculums.length === 0 ? 'Brak siatek programowych' : 'Nie znaleziono pasujących siatek'}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            {curriculums.length === 0
              ? 'Kliknij "Dodaj Siatkę" aby utworzyć pierwszą siatkę programową'
              : 'Spróbuj zmienić kryteria wyszukiwania'}
          </Typography>
        </Paper>
      ) : (
        <Grid
          container
          spacing={2}
        >
          {filteredCurriculums.map((curriculum) => {
            const curriculumStats = getCurriculumStats(curriculum);
            return (
              <Grid
                key={curriculum.id}
                size={{ xs: 12, sm: 6, md: 4 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => handleOpenDrawer(curriculum)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 'bold', mb: 0.5 }}
                        >
                          {curriculum.programName}
                        </Typography>
                        <Chip
                          label={curriculum.academicYear}
                          size="small"
                          color="primary"
                          icon={<CalendarTodayIcon />}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMenu(e, curriculum)}
                        sx={{ ml: 1 }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack
                      spacing={1}
                      sx={{ mt: 2 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BookIcon
                          fontSize="small"
                          color="action"
                        />
                        <Typography variant="body2">
                          <strong>{curriculumStats.totalSubjects}</strong> przedmiotów
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchoolIcon
                          fontSize="small"
                          color="action"
                        />
                        <Typography variant="body2">
                          <strong>{curriculumStats.totalSemesters}</strong> semestrów
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon
                          fontSize="small"
                          color="action"
                        />
                        <Typography variant="body2">
                          <strong>{curriculumStats.totalHours}</strong> godzin
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDrawer(curriculum);
                      }}
                    >
                      Szczegóły
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Menu akcji */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem
          onClick={() => {
            if (menuCurriculum) {
              handleOpenModal(menuCurriculum);
            }
            handleCloseMenu();
          }}
        >
          <EditIcon sx={{ mr: 1 }} />
          Edytuj
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuCurriculum) {
              handleDeleteCurriculum(menuCurriculum.id, menuCurriculum.programName);
            }
            handleCloseMenu();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Usuń
        </MenuItem>
      </Menu>

      {/* Drawer z szczegółami */}
      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{ sx: { width: DRAWER_WIDTH } }}
      >
        {selectedCurriculum && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">{selectedCurriculum.programName}</Typography>
              <IconButton
                size="small"
                onClick={handleCloseDrawer}
              >
                <ClearIcon />
              </IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ mb: 2 }}>
              <Chip
                label={selectedCurriculum.academicYear}
                color="primary"
                icon={<CalendarTodayIcon />}
                sx={{ mb: 1 }}
              />
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Statystyki:
                </Typography>
                <Typography variant="body2">
                  • {getCurriculumStats(selectedCurriculum).totalSemesters} semestrów
                </Typography>
                <Typography variant="body2">
                  • {getCurriculumStats(selectedCurriculum).totalSubjects} przedmiotów
                </Typography>
                <Typography variant="body2">
                  • {getCurriculumStats(selectedCurriculum).totalHours} godzin łącznie
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography
              variant="h6"
              gutterBottom
            >
              Semestry i przedmioty
            </Typography>

            {/* Wyszukiwarka w drawerze */}
            <TextField
              fullWidth
              size="small"
              placeholder="Szukaj przedmiotu, prowadzącego, typu..."
              value={drawerSearchTerm}
              onChange={(e) => setDrawerSearchTerm(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: drawerSearchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setDrawerSearchTerm('')}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Widok filtrowany lub normalny */}
            {drawerSearchTerm && filteredSubjectsInDrawer ? (
              filteredSubjectsInDrawer.length === 0 ? (
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'grey.50' }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Nie znaleziono przedmiotów pasujących do wyszukiwania
                  </Typography>
                </Paper>
              ) : (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1, display: 'block' }}
                  >
                    Znaleziono {filteredSubjectsInDrawer.length} przedmiot{filteredSubjectsInDrawer.length === 1 ? '' : 'ów'}
                  </Typography>
                  {filteredSubjectsInDrawer.map((item, idx) => (
                    <Box
                      key={`filtered-${idx}`}
                      sx={{ mb: 2 }}
                    >
                      <Chip
                        label={item.semesterName}
                        size="small"
                        color="primary"
                        sx={{ mb: 1 }}
                      />
                      <ListItem
                        sx={{
                          borderLeft: '3px solid',
                          borderColor: 'primary.main',
                          pl: 2,
                          mb: 0.5,
                          backgroundColor: 'action.selected',
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                        onClick={() => {
                          handleOpenModal(selectedCurriculum);
                          handleCloseDrawer();
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {subjectsMap.get(item.subject.subjectId) || 'Błąd'}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography
                                variant="caption"
                                display="block"
                              >
                                <strong>Typ:</strong> {item.subject.type}
                              </Typography>
                              <Typography
                                variant="caption"
                                display="block"
                              >
                                <strong>Prowadzący:</strong> {lecturersMap.get(item.subject.lecturerId) || 'Błąd'}
                              </Typography>
                              <Typography
                                variant="caption"
                                display="block"
                              >
                                <strong>Godziny:</strong> {item.subject.hours} | <strong>ECTS:</strong> {item.subject.ects}
                              </Typography>
                            </Box>
                          }
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(selectedCurriculum);
                            handleCloseDrawer();
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </ListItem>
                    </Box>
                  ))}
                </Box>
              )
            ) : (
              // Normalny widok wszystkich przedmiotów
              (selectedCurriculum.semesters || []).map((semester: any, semesterIndex: number) => {
                const semesterName = semesters.find((s) => s.id === semester.semesterId)?.name || `Semestr ${semester.semesterNumber || semesterIndex + 1}`;
                return (
                  <Box
                    key={`${selectedCurriculum.id}-semester-${semester.semesterId || semester.semesterNumber || semesterIndex}`}
                    sx={{ mb: 3 }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}
                    >
                      {semesterName}
                    </Typography>
                    <List dense>
                      {(semester.subjects || []).map((subject: any, index: number) => (
                        <ListItem
                          key={`${selectedCurriculum.id}-semester-${semester.semesterId || semester.semesterNumber || semesterIndex}-subject-${subject.subjectId || index}`}
                          sx={{
                            borderLeft: '3px solid',
                            borderColor: 'primary.light',
                            pl: 2,
                            mb: 0.5,
                            backgroundColor: 'grey.50',
                            borderRadius: 1,
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'grey.100',
                            },
                          }}
                          onClick={() => {
                            handleOpenModal(selectedCurriculum);
                            handleCloseDrawer();
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {subjectsMap.get(subject.subjectId) || 'Błąd'}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography
                                  variant="caption"
                                  display="block"
                                >
                                  <strong>Typ:</strong> {subject.type}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  display="block"
                                >
                                  <strong>Prowadzący:</strong> {lecturersMap.get(subject.lecturerId) || 'Błąd'}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  display="block"
                                >
                                  <strong>Godziny:</strong> {subject.hours} | <strong>ECTS:</strong> {subject.ects}
                                </Typography>
                              </Box>
                            }
                          />
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(selectedCurriculum);
                              handleCloseDrawer();
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                );
              })
            )}
            <Divider sx={{ my: 2 }} />
            <Button
              variant="contained"
              fullWidth
              startIcon={<EditIcon />}
              onClick={() => {
                handleOpenModal(selectedCurriculum);
                handleCloseDrawer();
              }}
            >
              Edytuj Siatkę
            </Button>
          </Box>
        )}
      </Drawer>

      {isModalOpen && (
        <CurriculumFormModal
          open={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveCurriculum}
          subjectsList={subjects}
          lecturersList={lecturers}
          semestersList={semesters}
          initialData={editingCurriculum}
          departments={departments}
          groups={[]}
        />
      )}
    </Box>
  );
};
