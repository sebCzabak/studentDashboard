import { useState, useEffect, useMemo } from 'react';
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
  ListItemSecondaryAction,
  Checkbox,
  Toolbar,
  Tooltip,
  Badge,
  Stack,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import GroupIcon from '@mui/icons-material/Group';
import SchoolIcon from '@mui/icons-material/School';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import {
  subscribeGroups,
  subscribeSpecializations,
  addSpecialization,
  updateSpecialization,
  deleteSpecialization,
  updateGroup,
  deleteGroup,
  addGroup,
  promoteGroup,
} from '../../features/groups/groupsService';
import { subscribeSemesters } from '../../features/shared/dictionaryService';
import toast from 'react-hot-toast';
import { Link as RouterLink } from 'react-router-dom';
import { GroupFormModal } from '../../features/timetable/components/GroupFormModal';
import { SpecializationFormModal } from '../../features/groups/components/SpecializationFormModal';
import type { Group, Specialization, Semester } from '../../features/timetable/types';

const DRAWER_WIDTH = 400;

export const ManageGroupsPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'withSpecs' | 'withoutSpecs'>('all');
  const [filterSemester, setFilterSemester] = useState<'all' | 'letni' | 'zimowy'>('all');
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Partial<Specialization> | null>(null);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  // Wszystkie dane przez onSnapshot – chip z semestrem/rokem od razu ma pełne dane (tylko snapshot z serwera)
  useEffect(() => {
    setLoading(true);
    const unsubGroups = subscribeGroups((data) => {
      setGroups(data as Group[]);
      setLoading(false);
    });
    const unsubSpecs = subscribeSpecializations((data) => {
      setSpecializations(data as Specialization[]);
    });
    const unsubSems = subscribeSemesters((data) => {
      setSemesters(data as Semester[]);
    });
    return () => {
      unsubGroups();
      unsubSpecs();
      unsubSems();
    };
  }, []);

  const specsByGroup = useMemo(() => {
    return specializations.reduce(
      (acc, spec) => {
        const groupId = spec.groupId;
        if (!acc[groupId]) acc[groupId] = [];
        acc[groupId].push(spec);
        return acc;
      },
      {} as Record<string, Specialization[]>,
    );
  }, [specializations]);

  // Oblicza aktualny numer semestru na podstawie roku rekrutacji i bieżącej daty (np. 2024/2025 → semestr 4)
  const getCurrentSemesterFromRecruitmentYear = (recruitmentYear: string | undefined): number | null => {
    if (!recruitmentYear) return null;
    const match = recruitmentYear.match(/^(\d{4})\/(\d{4})$/);
    if (!match) return null;
    const startYear = parseInt(match[1], 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    // Rok akademicki: zimowy od IX, letni II–VI. Początek roku akademickiego = wrzesień.
    const academicYearStart = month >= 9 ? currentYear : currentYear - 1;
    const yearsFromStart = academicYearStart - startYear;
    if (yearsFromStart < 0) return null;
    const semesterInYear = month >= 2 && month <= 6 ? 2 : 1; // 2 = letni, 1 = zimowy
    return yearsFromStart * 2 + semesterInYear;
  };

  // Funkcja do obliczania numeru semestru dla grupy (z semesterId / słownika semestrów)
  const calculateSemesterNumber = (group: Group): number | null => {
    if (!group.semesterId || !group.semester) return null;

    const semester = semesters.find((s) => s.id === group.semesterId);
    if (!semester) return null;

    // Wyciągnij rok akademicki z nazwy semestru (np. "Semestr 2024/2025" lub "2024/2025")
    const yearMatch = semester.name.match(/(\d{4})\/(\d{4})/);
    if (!yearMatch) return null;

    const startYear = parseInt(yearMatch[1], 10);
    const endYear = parseInt(yearMatch[2], 10);

    // Oblicz numer semestru na podstawie roku i typu
    // Zimowe = nieparzyste (1, 3, 5...), Letnie = parzyste (2, 4, 6...)
    // Zakładamy, że pierwszy semestr to zimowy 2024/2025 = semestr 1
    // Różnica lat od 2024/2025
    const yearsDiff = startYear - 2024;
    const baseSemester = yearsDiff * 2 + 1; // Zimowy dla danego roku

    if (group.semester === 'zimowy') {
      return baseSemester;
    } else {
      // Letni = następny semestr po zimowym
      return baseSemester + 1;
    }
  };

  // Statystyki
  const stats = useMemo(() => {
    const totalGroups = groups.length;
    const totalSpecs = specializations.length;
    const groupsWithSpecs = groups.filter((g) => (specsByGroup[g.id]?.length || 0) > 0).length;
    const groupsWithoutSpecs = totalGroups - groupsWithSpecs;
    const allEmails = new Set<string>();
    groups.forEach((g) => {
      if (g.groupEmail) allEmails.add(g.groupEmail);
    });
    specializations.forEach((s) => {
      s.emails?.forEach((e) => allEmails.add(e));
    });

    return {
      totalGroups,
      totalSpecs,
      groupsWithSpecs,
      groupsWithoutSpecs,
      uniqueEmails: allEmails.size,
    };
  }, [groups, specializations, specsByGroup]);

  // Filtrowanie
  const filteredGroups = useMemo(() => {
    let results = groups;

    // Filtrowanie po nazwie
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      results = results.filter((g) => g.name.toLowerCase().includes(lowerSearch));
    }

    // Filtrowanie po typie
    if (filterType === 'withSpecs') {
      results = results.filter((g) => (specsByGroup[g.id]?.length || 0) > 0);
    } else if (filterType === 'withoutSpecs') {
      results = results.filter((g) => (specsByGroup[g.id]?.length || 0) === 0);
    }

    // Filtrowanie po semestrze letni/zimowy
    if (filterSemester !== 'all') {
      results = results.filter((g) => g.semester === filterSemester);
    }

    return results;
  }, [groups, searchTerm, filterType, filterSemester, specsByGroup]);

  const handleOpenGroupModal = (group: Group | null = null) => {
    setEditingGroup(group);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (data: Partial<Omit<Group, 'id'>>, id?: string) => {
    const promise = id ? updateGroup(id, data) : addGroup(data);
    await toast.promise(promise, {
      loading: 'Zapisywanie grupy...',
      success: 'Grupa zapisana!',
      error: (err) => err.message || 'Błąd zapisu.',
    });
    setIsGroupModalOpen(false);
  };

  const handleDeleteGroup = async (group: Group) => {
    if (window.confirm(`Czy na pewno chcesz usunąć grupę "${group.name}"?`)) {
      await toast.promise(deleteGroup(group.id), {
        loading: 'Usuwanie grupy...',
        success: 'Grupa usunięta.',
        error: 'Błąd podczas usuwania.',
      });
      if (selectedGroup?.id === group.id) {
        setIsDrawerOpen(false);
        setSelectedGroup(null);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedGroups.size === 0) return;
    if (!window.confirm(`Czy na pewno chcesz usunąć ${selectedGroups.size} grup?`)) return;

    const promises = Array.from(selectedGroups).map((id) => deleteGroup(id));
    await toast.promise(Promise.all(promises), {
      loading: 'Usuwanie grup...',
      success: `Usunięto ${selectedGroups.size} grup.`,
      error: 'Błąd podczas usuwania.',
    });
    setSelectedGroups(new Set());
    if (selectedGroup && selectedGroups.has(selectedGroup.id)) {
      setIsDrawerOpen(false);
      setSelectedGroup(null);
    }
  };

  const handleOpenSpecModal = (groupId: string, spec: Specialization | null = null) => {
    setCurrentGroupId(groupId);
    setEditingSpec(spec);
    setIsSpecModalOpen(true);
  };

  const handleSaveSpecialization = async (
    data: Partial<Omit<Specialization, 'id' | 'groupId'>>,
    id?: string,
  ): Promise<void> => {
    if (!id && !currentGroupId) {
      toast.error('Błąd: Brak wybranej grupy.');
      return;
    }

    const dataToSave = id ? data : { ...data, groupId: currentGroupId! };
    const promise = id
      ? updateSpecialization(id, dataToSave)
      : addSpecialization(dataToSave as Omit<Specialization, 'id'>);

    await toast.promise(promise, {
      loading: 'Zapisywanie specjalizacji...',
      success: `Specjalizacja ${id ? 'zaktualizowana' : 'dodana'}!`,
      error: 'Błąd zapisu.',
    });
    setIsSpecModalOpen(false);
  };

  const handleDeleteSpecialization = async (spec: Specialization) => {
    if (window.confirm(`Czy na pewno chcesz usunąć specjalizację "${spec.name}"?`)) {
      await toast.promise(deleteSpecialization(spec.id), {
        loading: 'Usuwanie...',
        success: 'Specjalizacja usunięta.',
        error: 'Błąd podczas usuwania.',
      });
    }
  };

  const handleToggleSelect = (groupId: string) => {
    const newSelected = new Set(selectedGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedGroups(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredGroups.map((g) => g.id)));
    }
  };

  const handleOpenDrawer = (group: Group) => {
    setSelectedGroup(group);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedGroup(null);
  };

  const handlePromoteGroup = async (group: Group) => {
    const current = group.currentSemester ?? 0;
    if (current >= 6) {
      toast.error('Grupa jest już na ostatnim (6.) semestrze.');
      return;
    }
    await toast.promise(promoteGroup(group.id, current), {
      loading: 'Promowanie grupy...',
      success: `Grupa promowana na semestr ${current + 1}.`,
      error: (err) => err.message || 'Błąd promocji.',
    });
    setSelectedGroup((prev) => (prev?.id === group.id ? { ...prev, currentSemester: current + 1 } : prev));
  };

  if (loading) return <CircularProgress />;

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
              <Typography variant="h4">{stats.totalGroups}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Grup
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{stats.totalSpecs}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Specjalizacji
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{stats.uniqueEmails}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Unikalnych Emaili
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{stats.groupsWithoutSpecs}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Grup bez Spec.
              </Typography>
            </Box>
          </Grid>
        </Grid>
        {stats.groupsWithoutSpecs > 0 && (
          <Alert
            severity="warning"
            sx={{ mt: 2 }}
          >
            {stats.groupsWithoutSpecs} {stats.groupsWithoutSpecs === 1 ? 'grupa nie ma' : 'grupy nie mają'} przypisanych
            specjalizacji.
          </Alert>
        )}
      </Paper>

      {/* Pasek z wyszukiwarką i filtrami */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {filteredGroups.length > 0 && (
            <Checkbox
              checked={selectedGroups.size === filteredGroups.length && filteredGroups.length > 0}
              indeterminate={selectedGroups.size > 0 && selectedGroups.size < filteredGroups.length}
              onChange={handleSelectAll}
            />
          )}
          <TextField
            placeholder="Szukaj grup..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl
            size="small"
            sx={{ minWidth: 200 }}
          >
            <InputLabel>Filtruj</InputLabel>
            <Select
              value={filterType}
              label="Filtruj"
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            >
              <MenuItem value="all">Wszystkie</MenuItem>
              <MenuItem value="withSpecs">Ze specjalizacjami</MenuItem>
              <MenuItem value="withoutSpecs">Bez specjalizacji</MenuItem>
            </Select>
          </FormControl>
          <FormControl
            size="small"
            sx={{ minWidth: 200 }}
          >
            <InputLabel>Semestr</InputLabel>
            <Select
              value={filterSemester}
              label="Semestr"
              onChange={(e) => setFilterSemester(e.target.value as typeof filterSemester)}
            >
              <MenuItem value="all">Wszystkie</MenuItem>
              <MenuItem value="zimowy">Zimowy</MenuItem>
              <MenuItem value="letni">Letni</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenGroupModal()}
          >
            Dodaj Grupę
          </Button>
        </Box>

        {/* Bulk actions toolbar */}
        {selectedGroups.size > 0 && (
          <Toolbar
            sx={{
              bgcolor: 'action.selected',
              mt: 2,
              borderRadius: 1,
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography>
                Zaznaczono: {selectedGroups.size} {selectedGroups.size === 1 ? 'grupa' : 'grup'}
              </Typography>
              <Button
                size="small"
                onClick={handleSelectAll}
              >
                {selectedGroups.size === filteredGroups.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
              </Button>
            </Box>
            <Box>
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
                onClick={() => setSelectedGroups(new Set())}
                sx={{ ml: 1 }}
              >
                Anuluj
              </Button>
            </Box>
          </Toolbar>
        )}
      </Paper>

      {/* Karty grup w siatce */}
      <Grid
        container
        spacing={2}
      >
        {filteredGroups.map((group) => {
          const groupSpecs = specsByGroup[group.id] || [];
          const isSelected = selectedGroups.has(group.id);

          return (
            <Grid
              size={{ xs: 12, sm: 6, md: 4 }}
              key={group.id}
            >
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  border: isSelected ? 2 : 1,
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  '&:hover': {
                    boxShadow: 4,
                  },
                }}
                onClick={() => handleOpenDrawer(group)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(group.id);
                        }}
                        size="small"
                      />
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{ fontWeight: 600 }}
                      >
                        {group.name}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenGroupModal(group);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                    {group.groupEmail && (
                      <Chip
                        icon={<EmailIcon />}
                        label={group.groupEmail}
                        size="small"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    {group.semester && (
                      <Chip
                        label={group.semester === 'letni' ? 'Letni' : 'Zimowy'}
                        size="small"
                        color={group.semester === 'letni' ? 'success' : 'info'}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    {(() => {
                      const semesterNumber = calculateSemesterNumber(group);
                      const semester = semesters.find((s) => s.id === group.semesterId);
                      if (semesterNumber && semester) {
                        const yearMatch = semester.name.match(/(\d{4})\/(\d{4})/);
                        const academicYear = yearMatch ? yearMatch[0] : '';
                        return (
                          <Chip
                            label={`${semesterNumber}. semestr${academicYear ? ` (${academicYear})` : ''}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            onClick={(e) => e.stopPropagation()}
                          />
                        );
                      }
                      return null;
                    })()}
                    {group.recruitmentYear &&
                      (() => {
                        const currentSem = getCurrentSemesterFromRecruitmentYear(group.recruitmentYear);
                        return (
                          <Chip
                            label={
                              currentSem != null
                                ? `${group.recruitmentYear} (semestr ${currentSem})`
                                : group.recruitmentYear
                            }
                            size="small"
                            variant="outlined"
                            onClick={(e) => e.stopPropagation()}
                          />
                        );
                      })()}
                    {group.currentSemester != null && (
                      <Chip
                        label={`Sem. ${group.currentSemester}/6`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Badge
                      badgeContent={groupSpecs.length}
                      color="primary"
                    >
                      <SchoolIcon color="action" />
                    </Badge>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {groupSpecs.length} {groupSpecs.length === 1 ? 'specjalizacja' : 'specjalizacji'}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          );
        })}

        {filteredGroups.length === 0 && (
          <Grid size={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography
                variant="h6"
                color="text.secondary"
              >
                {searchTerm || filterType !== 'all'
                  ? 'Brak grup spełniających kryteria wyszukiwania'
                  : 'Brak grup. Dodaj pierwszą grupę!'}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Drawer ze szczegółami */}
      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: { width: DRAWER_WIDTH },
        }}
      >
        {selectedGroup && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar sx={{ justifyContent: 'space-between' }}>
              <Typography variant="h6">Szczegóły Grupy</Typography>
              <IconButton onClick={handleCloseDrawer}>
                <CloseIcon />
              </IconButton>
            </Toolbar>
            <Divider />

            <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
              <Stack spacing={2}>
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                  >
                    Nazwa grupy
                  </Typography>
                  <Typography variant="h6">{selectedGroup.name}</Typography>
                </Box>

                {selectedGroup.groupEmail && (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                    >
                      Email grupy
                    </Typography>
                    <Chip
                      icon={<EmailIcon />}
                      label={selectedGroup.groupEmail}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                )}

                {(selectedGroup.semester || selectedGroup.recruitmentYear || selectedGroup.currentSemester != null) && (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                    >
                      Semestr / Rok rekrutacji
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {selectedGroup.semester && (
                        <Chip
                          label={selectedGroup.semester === 'letni' ? 'Letni' : 'Zimowy'}
                          color={selectedGroup.semester === 'letni' ? 'success' : 'info'}
                        />
                      )}
                      {(() => {
                        const semesterNumber = calculateSemesterNumber(selectedGroup);
                        const semester = semesters.find((s) => s.id === selectedGroup.semesterId);
                        if (semesterNumber && semester) {
                          const yearMatch = semester.name.match(/(\d{4})\/(\d{4})/);
                          const academicYear = yearMatch ? yearMatch[0] : '';
                          return (
                            <Chip
                              label={`${semesterNumber}. semestr${academicYear ? ` (${academicYear})` : ''}`}
                              color="primary"
                              variant="outlined"
                            />
                          );
                        }
                        return null;
                      })()}
                      {selectedGroup.recruitmentYear &&
                        (() => {
                          const currentSem = getCurrentSemesterFromRecruitmentYear(selectedGroup.recruitmentYear);
                          return (
                            <Chip
                              label={
                                currentSem != null
                                  ? `${selectedGroup.recruitmentYear} (semestr ${currentSem})`
                                  : selectedGroup.recruitmentYear
                              }
                              variant="outlined"
                            />
                          );
                        })()}
                      {selectedGroup.currentSemester != null && (
                        <Chip
                          label={`Sem. ${selectedGroup.currentSemester}/6 w cyklu`}
                          color="secondary"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    {selectedGroup.currentSemester != null && selectedGroup.currentSemester < 6 && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ArrowUpwardIcon />}
                        onClick={() => handlePromoteGroup(selectedGroup)}
                        sx={{ mt: 1 }}
                      >
                        Promuj na semestr {selectedGroup.currentSemester + 1}
                      </Button>
                    )}
                  </Box>
                )}

                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Specjalizacje</Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      handleOpenSpecModal(selectedGroup.id);
                    }}
                  >
                    Dodaj
                  </Button>
                </Box>

                <List>
                  {(specsByGroup[selectedGroup.id] || []).map((spec) => (
                    <ListItem
                      key={spec.id}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <ListItemText
                        primary={spec.name}
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {spec.abbreviation && (
                              <Chip
                                label={spec.abbreviation}
                                size="small"
                                sx={{ mr: 0.5 }}
                              />
                            )}
                            {spec.emails && spec.emails.length > 0 ? (
                              spec.emails.map((email, idx) => (
                                <Chip
                                  key={idx}
                                  icon={<EmailIcon />}
                                  label={email}
                                  size="small"
                                  sx={{ mr: 0.5, mt: 0.5 }}
                                />
                              ))
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Brak emaili
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleOpenSpecModal(selectedGroup.id, spec)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          edge="end"
                          size="small"
                          color="error"
                          onClick={() => handleDeleteSpecialization(spec)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                  {(!specsByGroup[selectedGroup.id] || specsByGroup[selectedGroup.id].length === 0) && (
                    <ListItem>
                      <ListItemText
                        secondary="Brak specjalizacji. Kliknij 'Dodaj' aby utworzyć pierwszą."
                        sx={{ textAlign: 'center', py: 2 }}
                      />
                    </ListItem>
                  )}
                </List>
              </Stack>
            </Box>

            <Divider />
            <Toolbar>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => {
                  handleOpenGroupModal(selectedGroup);
                  handleCloseDrawer();
                }}
                sx={{ mr: 1 }}
              >
                Edytuj grupę
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  handleDeleteGroup(selectedGroup);
                  handleCloseDrawer();
                }}
              >
                Usuń grupę
              </Button>
            </Toolbar>
          </Box>
        )}
      </Drawer>

      {/* Modale */}
      {isGroupModalOpen && (
        <GroupFormModal
          open={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          onSave={handleSaveGroup}
          initialData={editingGroup}
          semesters={semesters}
        />
      )}

      {isSpecModalOpen && (
        <SpecializationFormModal
          open={isSpecModalOpen}
          onClose={() => setIsSpecModalOpen(false)}
          onSave={handleSaveSpecialization}
          initialData={editingSpec}
        />
      )}
    </Box>
  );
};
