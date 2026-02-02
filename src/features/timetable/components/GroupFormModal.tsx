// src/features/groups/components/GroupFormModal.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import type { Group, Semester } from '../../timetable/types';
import toast from 'react-hot-toast';

interface GroupFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Omit<Group, 'id'>>, id?: string) => Promise<void>;
  initialData: Partial<Group> | null;
  /** Semestry z kolekcji /semesters – do przypisania grupy do semestru akademickiego (żeby grupa była w planach przy tym semestrze). */
  semesters: Semester[];
}

export const GroupFormModal: React.FC<GroupFormModalProps> = ({ open, onClose, onSave, initialData, semesters }) => {
  const [name, setName] = useState('');
  const [groupEmail, setGroupEmail] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [semester, setSemester] = useState<'letni' | 'zimowy' | ''>('');
  const [recruitmentYear, setRecruitmentYear] = useState('');
  const [currentSemester, setCurrentSemester] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  // Funkcja do wyciągania roku rekrutacji z emaila (format: z24-25 lub l24-25)
  const extractRecruitmentYearFromEmail = (email: string): string | null => {
    if (!email) return null;
    // Szukamy wzorca z24-25 lub l24-25 na początku emaila
    const match = email.match(/^[zl](\d{2})-(\d{2})/);
    if (match) {
      const startYear = parseInt(match[1], 10);
      const endYear = parseInt(match[2], 10);
      // Konwertujemy 24-25 na 2024/2025
      const fullStartYear = startYear < 50 ? 2000 + startYear : 1900 + startYear;
      const fullEndYear = endYear < 50 ? 2000 + endYear : 1900 + endYear;
      return `${fullStartYear}/${fullEndYear}`;
    }
    return null;
  };

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setGroupEmail(initialData?.groupEmail || '');
      setSemesterId(initialData?.semesterId || '');
      setSemester(initialData?.semester || '');
      setRecruitmentYear(initialData?.recruitmentYear || '');
      setCurrentSemester(initialData?.currentSemester ?? '');
    }
  }, [initialData, open]);

  // Zawsze aktualizuj rok rekrutacji z emaila przy zmianie – po poprawce np. z24-25 na z23-24 pole samo się poprawi
  useEffect(() => {
    if (groupEmail) {
      const extractedYear = extractRecruitmentYearFromEmail(groupEmail);
      if (extractedYear) {
        setRecruitmentYear(extractedYear);
      }
    }
  }, [groupEmail]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Nazwa grupy jest wymagana.');
      return;
    }
    setLoading(true);
    await onSave(
      {
        name,
        groupEmail,
        semesterId: semesterId || undefined,
        semester: semester || undefined,
        recruitmentYear: recruitmentYear || undefined,
        currentSemester: currentSemester === '' ? undefined : Number(currentSemester),
      },
      initialData?.id,
    );
    setLoading(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{initialData?.id ? 'Edytuj Grupę' : 'Dodaj Nową Grupę'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 2 }}
        >
          <TextField
            autoFocus
            label="Nazwa grupy (np. Zarządzanie, I st., III sem.)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            label="Adres e-mail Grupy Google (opcjonalnie)"
            value={groupEmail}
            onChange={(e) => setGroupEmail(e.target.value)}
            placeholder="np. z24-25@domena.com lub l24-25@domena.com"
            helperText="Format: z24-25 (zimowy 2024/2025) lub l24-25 (letni 2024/2025)"
          />
          <TextField
            label="Rok rekrutacji (opcjonalnie)"
            value={recruitmentYear}
            onChange={(e) => setRecruitmentYear(e.target.value)}
            placeholder="np. 2024/2025"
            helperText="Automatycznie wyciągany z emaila, jeśli email ma format z24-25 lub l24-25"
          />
          <FormControl fullWidth>
            <InputLabel>Semestr akademicki (z /semesters)</InputLabel>
            <Select
              value={semesterId}
              label="Semestr akademicki (z /semesters)"
              onChange={(e) => setSemesterId(e.target.value)}
            >
              <MenuItem value="">Brak</MenuItem>
              {semesters.map((s) => (
                <MenuItem
                  key={s.id}
                  value={s.id}
                >
                  {s.name}
                </MenuItem>
              ))}
            </Select>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: 'block' }}
            >
              Przypisanie grupy do semestru – w planach zajęć (siatka → semestr) zobaczysz tylko grupy z tego semestru
            </Typography>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Semestr w cyklu 1–6 (opcjonalnie)</InputLabel>
            <Select
              value={currentSemester === '' ? '' : currentSemester}
              label="Semestr w cyklu 1–6 (opcjonalnie)"
              onChange={(e) => setCurrentSemester(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <MenuItem value="">Brak</MenuItem>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <MenuItem
                  key={n}
                  value={n}
                >
                  Semestr {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Semestr letni/zimowy (opcjonalnie)</InputLabel>
            <Select
              value={semester}
              label="Semestr letni/zimowy (opcjonalnie)"
              onChange={(e) => setSemester(e.target.value as 'letni' | 'zimowy' | '')}
            >
              <MenuItem value="">Brak</MenuItem>
              <MenuItem value="zimowy">Zimowy</MenuItem>
              <MenuItem value="letni">Letni</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Zapisz'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
