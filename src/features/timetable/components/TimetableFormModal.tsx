import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import toast from 'react-hot-toast';

// Definicja typów dla propsów dla większego bezpieczeństwa
interface TimetableFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  semesters: any[];
  groups: any[];
  curriculums: any[];
  initialData?: any | null; // Do obsługi trybu kopiowania
}

export const TimetableFormModal = ({
  open,
  onClose,
  onSave,
  semesters,
  groups,
  curriculums,
  initialData = null,
}: TimetableFormModalProps) => {
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [curriculumId, setCurriculumId] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [studyMode, setStudyMode] = useState<'stacjonarny' | 'zaoczne' | 'podyplomowe' | 'anglojęzyczne'>(
    'stacjonarny'
  );
  const [loading, setLoading] = useState(false);

  // Efekt do wypełniania formularza danymi, gdy kopiujemy istniejący plan
  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name ? `${initialData.name} - Kopia` : '');
        setAcademicYear(initialData.academicYear || '');
        setSemesterId(initialData.semesterId || '');
        setCurriculumId(initialData.curriculumId || '');
        setSelectedGroupIds(initialData.groupIds || []);
        setStudyMode(initialData.studyMode || 'stacjonarny');
      } else {
        // Resetuj formularz do stanu początkowego, gdy tworzymy nowy plan
        setName('');
        setAcademicYear('');
        setSemesterId('');
        setCurriculumId('');
        setSelectedGroupIds([]);
        setStudyMode('stacjonarny');
      }
    }
  }, [initialData, open]);

  const filteredSemesters = useMemo(() => {
    if (!semesters) return [];
    // ================== OSTATECZNA POPRAWKA TUTAJ ==================
    // Dodajemy .trim() do porównania, aby uodpornić je na białe znaki
    const result = semesters.filter((s: any) => s.type?.trim() === studyMode);
    // =============================================================
    return result;
  }, [semesters, studyMode]);

  useEffect(() => {
    if (!filteredSemesters.find((s) => s.id === semesterId)) {
      setSemesterId('');
    }
  }, [filteredSemesters, semesterId]);

  const handleSave = async () => {
    if (!name || !academicYear || !semesterId || selectedGroupIds.length === 0 || !curriculumId) {
      return toast.error('Wszystkie pola są wymagane.');
    }
    setLoading(true);
    try {
      await onSave({
        name,
        academicYear,
        semesterId,
        groupIds: selectedGroupIds,
        curriculumId,
        studyMode,
      });
      onClose(); // Zamknij modal po pomyślnym zapisie
    } catch (error) {
      // Błąd jest już obsługiwany przez toast.promise w komponencie nadrzędnym
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{initialData ? 'Stwórz Kopię Planu Zajęć' : 'Stwórz Nowy Plan Zajęć'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 2 }}
        >
          <TextField
            label="Nazwa Planu (np. Plan - Zarządzanie I rok - Zima)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Rok Akademicki (np. 2025/2026)"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          />

          <FormControl>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              Tryb studiów
            </Typography>
            <ToggleButtonGroup
              color="primary"
              value={studyMode}
              exclusive
              onChange={(_e, newMode) => {
                if (newMode !== null) {
                  setStudyMode(newMode);
                }
              }}
              aria-label="tryb studiów"
            >
              <ToggleButton value="stacjonarny">Stacjonarne</ToggleButton>
              <ToggleButton value="zaoczne">Zaoczne</ToggleButton>
              <ToggleButton value="podyplomowe">Podyplomowe</ToggleButton>
              <ToggleButton value="anglojęzyczne">Anglojęzyczne</ToggleButton>
            </ToggleButtonGroup>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Siatka Programowa</InputLabel>
            <Select
              value={curriculumId}
              label="Siatka Programowa"
              onChange={(e) => setCurriculumId(e.target.value)}
            >
              {(curriculums || []).map((c: any) => (
                <MenuItem
                  key={c.id}
                  value={c.id}
                >
                  {c.programName} ({c.academicYear})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            fullWidth
            disabled={filteredSemesters.length === 0}
          >
            <InputLabel>Semestr</InputLabel>
            <Select
              value={semesterId}
              label="Semestr"
              onChange={(e) => setSemesterId(e.target.value)}
            >
              {(filteredSemesters || []).map((s: any) => (
                <MenuItem
                  key={s.id}
                  value={s.id}
                >
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Grupy Studenckie</InputLabel>
            <Select
              multiple
              value={selectedGroupIds}
              onChange={(e) =>
                setSelectedGroupIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)
              }
              input={<OutlinedInput label="Grupy Studenckie" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip
                      key={value}
                      label={groups.find((g: any) => g.id === value)?.name || value}
                    />
                  ))}
                </Box>
              )}
            >
              {(groups || []).map((g: any) => (
                <MenuItem
                  key={g.id}
                  value={g.id}
                >
                  {g.name}
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
          disabled={loading}
        >
          {loading ? 'Tworzenie...' : 'Stwórz'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
