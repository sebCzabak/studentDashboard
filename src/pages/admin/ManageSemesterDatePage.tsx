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
  List,
  ListItem,
  ListItemText,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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

export const ManageSemesterDatesPage = () => {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [datesFromDB, setDatesFromDB] = useState<SemesterDate[]>([]);
  const [editedFormats, setEditedFormats] = useState<Map<string, 'stacjonarny' | 'online'>>(new Map());
  const [selectedDates, setSelectedDates] = useState<DateObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

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
      >
        Wróć do pulpitu
      </Button>
      <Typography
        variant="h4"
        gutterBottom
      >
        Zarządzaj Kalendarzem Semestru
      </Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControl fullWidth>
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
      </Paper>

      <Grid
        container
        spacing={3}
      >
        <Grid
          size={{ xs: 12, md: 5 }}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <Typography
            variant="h6"
            gutterBottom
          >
            Wybierz daty zjazdów
          </Typography>
          <DatePicker
            multiple
            value={selectedDates}
            onChange={setSelectedDates}
            format="DD.MM.YYYY"
            mapDays={({ date }) => {
              const isSelected = selectedDates.some((d) => d.format() === date.format());
              if (isSelected) return { style: { backgroundColor: '#1976d2', color: 'white' } };
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h6">Wybrane daty i forma zajęć</Typography>
          <Paper
            variant="outlined"
            sx={{ maxHeight: 350, overflow: 'auto', mt: 1 }}
          >
            <List>
              {displayedDates.length > 0 ? (
                displayedDates.map((d) => (
                  <ListItem key={d.id}>
                    <ListItemText
                      primary={d.date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    />
                    <ToggleButtonGroup
                      value={d.format}
                      exclusive
                      size="small"
                      onChange={(_, newFormat) => newFormat && handleFormatChange(d.date, newFormat)}
                    >
                      <ToggleButton value="stacjonarny">Stacjonarne</ToggleButton>
                      <ToggleButton value="online">Online</ToggleButton>
                    </ToggleButtonGroup>
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText secondary="Brak wybranych dat. Wybierz je z kalendarza po lewej." />
                </ListItem>
              )}
            </List>
          </Paper>
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={handleSaveChanges}
            >
              Zapisz zmiany
            </Button>
            <Button
              variant="outlined"
              onClick={() => setIsCopyModalOpen(true)}
            >
              Kopiuj daty z semestru
            </Button>
          </Box>
        </Grid>
      </Grid>

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
