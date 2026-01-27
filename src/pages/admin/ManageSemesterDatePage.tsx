import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Chip,
  Stack,
  IconButton,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Drawer,
} from '@mui/material';
import toast from 'react-hot-toast';
import { collection, query, where, onSnapshot, writeBatch, doc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getSemesters } from '../../features/shared/dictionaryService';
import type { Semester, SemesterDate } from '../../features/timetable/types';
import { Timestamp } from 'firebase/firestore';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import 'react-multi-date-picker/styles/layouts/mobile.css';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ComputerIcon from '@mui/icons-material/Computer';
import SchoolIcon from '@mui/icons-material/School';
import EventIcon from '@mui/icons-material/Event';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import { Link as RouterLink } from 'react-router-dom';

// Wewnętrzny komponent modala do kopiowania dat
const CopyDatesModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCopy: (sourceSemesterId: string) => void;
  semesters: Semester[];
  currentSemesterId: string;
}> = ({ open, onClose, onCopy, semesters, currentSemesterId }) => {
  const [sourceSemesterId, setSourceSemesterId] = useState('');

  // ✅ POPRAWKA: Używamy useMemo, aby uniknąć tworzenia nowej tablicy przy każdym renderowaniu
  const availableSemesters = useMemo(() => {
    return semesters.filter((s) => s.id !== currentSemesterId);
  }, [semesters, currentSemesterId]);

  // ✅ POPRAWKA: useEffect ustawia wartość domyślną tylko raz, gdy modal się otwiera
  useEffect(() => {
    if (open && availableSemesters.length > 0) {
      setSourceSemesterId(availableSemesters[0].id);
    }
  }, [open, availableSemesters]);

  const handleConfirm = () => {
    if (sourceSemesterId) {
      onCopy(sourceSemesterId);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogTitle>Kopiuj daty z innego semestru</DialogTitle>
      <DialogContent sx={{ minWidth: 400 }}>
        <FormControl
          fullWidth
          sx={{ mt: 2 }}
        >
          <InputLabel>Wybierz semestr źródłowy</InputLabel>
          <Select
            value={sourceSemesterId}
            label="Wybierz semestr źródłowy"
            onChange={(e) => setSourceSemesterId(e.target.value)}
          >
            {availableSemesters.map((s) => (
              <MenuItem
                key={s.id}
                value={s.id}
              >
                {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
        >
          Kopiuj
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DRAWER_WIDTH = 400;

export const ManageSemesterDatesPage = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [datesFromDB, setDatesFromDB] = useState<SemesterDate[]>([]);
  const [editedFormats, setEditedFormats] = useState<Map<string, 'stacjonarny' | 'online'>>(new Map());
  const [selectedDates, setSelectedDates] = useState<DateObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isCalendarDrawerOpen, setIsCalendarDrawerOpen] = useState(false);

  useEffect(() => {
    getSemesters().then((data) => {
      const semesterData = data as Semester[];
      setSemesters(semesterData);
      if (semesterData.length > 0) {
        setSelectedSemesterId(semesterData[0].id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedSemesterId) return;

    setLoading(true);
    const q = query(collection(db, 'semesterDates'), where('semesterId', '==', selectedSemesterId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const datesData = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as SemesterDate))
          .sort((a, b) => a.date.toMillis() - b.date.toMillis());

        setDatesFromDB(datesData);
        setSelectedDates(datesData.map((d) => new DateObject(d.date.toDate())));
        setEditedFormats(new Map());
        setLoading(false);
      },
      (_error) => {
        toast.error('Błąd pobierania dat semestru.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedSemesterId]);

  const displayedDates = useMemo(() => {
    return selectedDates
      .map((dateObj) => {
        const date = dateObj.toDate();
        const dateKey = date.toISOString().split('T')[0];
        const existingDate = datesFromDB.find((d) => d.date.toDate().toISOString().split('T')[0] === dateKey);

        return {
          id: existingDate?.id || `new-${dateKey}`,
          date: date,
          format: editedFormats.get(dateKey) || existingDate?.format || 'stacjonarny',
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [selectedDates, editedFormats, datesFromDB]);

  // Statystyki dla wybranego semestru
  const stats = useMemo(() => {
    const totalDates = displayedDates.length;
    const stacjonarnyCount = displayedDates.filter((d) => d.format === 'stacjonarny').length;
    const onlineCount = displayedDates.filter((d) => d.format === 'online').length;
    const selectedSemester = semesters.find((s) => s.id === selectedSemesterId);

    return {
      totalDates,
      stacjonarnyCount,
      onlineCount,
      semesterName: selectedSemester?.name || 'Brak wybranego semestru',
    };
  }, [displayedDates, semesters, selectedSemesterId]);

  const handleFormatChange = (date: Date, newFormat: 'stacjonarny' | 'online') => {
    const dateKey = date.toISOString().split('T')[0];
    setEditedFormats((prev) => new Map(prev).set(dateKey, newFormat));
  };

  const handleSaveChanges = async () => {
    if (!selectedSemesterId) return;
    const toastId = toast.loading('Zapisywanie zmian...');
    try {
      const batch = writeBatch(db);
      const collectionRef = collection(db, 'semesterDates');

      const oldDatesQuery = query(collectionRef, where('semesterId', '==', selectedSemesterId));
      const oldDatesSnap = await getDocs(oldDatesQuery);
      oldDatesSnap.forEach((doc) => batch.delete(doc.ref));

      displayedDates.forEach((dateInfo) => {
        const newDateRef = doc(collectionRef);
        batch.set(newDateRef, {
          semesterId: selectedSemesterId,
          date: Timestamp.fromDate(dateInfo.date),
          format: dateInfo.format,
        });
      });

      await batch.commit();
      toast.success('Kalendarz semestru został zaktualizowany!', { id: toastId });
    } catch (error) {
      toast.error('Wystąpił błąd podczas zapisu.', { id: toastId });
      console.error(error);
    }
  };

  const handleCopyDates = async (sourceSemesterId: string) => {
    const toastId = toast.loading('Kopiowanie dat...');
    try {
      const q = query(collection(db, 'semesterDates'), where('semesterId', '==', sourceSemesterId));
      const snapshot = await getDocs(q);
      const sourceDates = snapshot.docs.map((doc) => doc.data() as Omit<SemesterDate, 'id'>);

      const newSelectedDates = sourceDates.map((d) => new DateObject(d.date.toDate()));
      const newEditedFormats = new Map(sourceDates.map((d) => [d.date.toDate().toISOString().split('T')[0], d.format]));

      setSelectedDates(newSelectedDates);
      setEditedFormats(newEditedFormats);

      toast.success('Daty skopiowane. Kliknij "Zapisz zmiany", aby zatwierdzić.', { id: toastId, duration: 4000 });
    } catch (err) {
      console.error('[COPY] Błąd kopiowania:', err);
      toast.error('Nie udało się skopiować dat.', { id: toastId });
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
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
              <Typography variant="h4">{stats.totalDates}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Dat zjazdów
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{stats.stacjonarnyCount}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Stacjonarnych
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">{stats.onlineCount}</Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Online
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="body1"
                sx={{ fontWeight: 'bold', mt: 1 }}
              >
                {stats.semesterName}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Wybrany semestr
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Pasek z wyborem semestru i akcjami */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          flexWrap="wrap"
        >
          <FormControl
            size="small"
            sx={{ minWidth: 250 }}
          >
            <InputLabel>Wybierz semestr</InputLabel>
            <Select
              value={selectedSemesterId}
              label="Wybierz semestr"
              onChange={(e) => setSelectedSemesterId(e.target.value)}
            >
              {semesters.map((s) => (
                <MenuItem
                  key={s.id}
                  value={s.id}
                >
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<CalendarTodayIcon />}
            onClick={() => setIsCalendarDrawerOpen(true)}
          >
            Otwórz kalendarz
          </Button>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => setIsCopyModalOpen(true)}
            disabled={!selectedSemesterId}
          >
            Kopiuj daty
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveChanges}
            disabled={!selectedSemesterId || displayedDates.length === 0}
            sx={{ ml: 'auto' }}
          >
            Zapisz zmiany
          </Button>
        </Stack>
      </Paper>

      {/* Widok kart z datami */}
      {displayedDates.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography
            variant="h6"
            color="text.secondary"
          >
            Brak dat zjazdów
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Kliknij "Otwórz kalendarz" aby dodać daty zjazdów dla wybranego semestru
          </Typography>
        </Paper>
      ) : (
        <Grid
          container
          spacing={2}
        >
          {displayedDates.map((d) => (
            <Grid
              key={d.id}
              size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
            >
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderLeft: `4px solid ${d.format === 'online' ? '#1976d2' : '#ed6c02'}`,
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 'bold', mb: 0.5 }}
                      >
                        {d.date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {d.date.toLocaleDateString('pl-PL', { weekday: 'long' })}
                      </Typography>
                    </Box>
                    <Chip
                      label={d.format === 'online' ? 'Online' : 'Stacjonarny'}
                      size="small"
                      color={d.format === 'online' ? 'primary' : 'warning'}
                      icon={d.format === 'online' ? <ComputerIcon /> : <SchoolIcon />}
                    />
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <ToggleButtonGroup
                    value={d.format}
                    exclusive
                    fullWidth
                    size="small"
                    onChange={(_, newFormat) => newFormat && handleFormatChange(d.date, newFormat)}
                  >
                    <ToggleButton value="stacjonarny">
                      <SchoolIcon sx={{ mr: 0.5 }} />
                      Stacjonarny
                    </ToggleButton>
                    <ToggleButton value="online">
                      <ComputerIcon sx={{ mr: 0.5 }} />
                      Online
                    </ToggleButton>
                  </ToggleButtonGroup>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Drawer z kalendarzem */}
      <Drawer
        anchor="right"
        open={isCalendarDrawerOpen}
        onClose={() => setIsCalendarDrawerOpen(false)}
        PaperProps={{ sx: { width: DRAWER_WIDTH, p: 3 } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Wybierz daty zjazdów</Typography>
          <IconButton
            size="small"
            onClick={() => setIsCalendarDrawerOpen(false)}
          >
            <ClearIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <DatePicker
          multiple
          value={selectedDates}
          onChange={setSelectedDates}
          format="DD.MM.YYYY"
          containerClassName="rmdp-mobile"
          style={{ width: '100%' }}
          mapDays={({ date }) => {
            const isSelected = selectedDates.some((d) => d.format() === date.format());
            if (isSelected) return { style: { backgroundColor: '#1976d2', color: 'white' } };
          }}
        />
        <Box sx={{ mt: 3 }}>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Wybrano: {selectedDates.length} dat{selectedDates.length === 1 ? 'ę' : 'y'}
          </Typography>
        </Box>
      </Drawer>

      <CopyDatesModal
        open={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        onCopy={handleCopyDates}
        semesters={semesters}
        currentSemesterId={selectedSemesterId}
      />
    </Box>
  );
};
