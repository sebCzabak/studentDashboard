import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  OutlinedInput,
  Chip,
  CircularProgress,
  Typography,
  Divider,
} from '@mui/material';
import toast from 'react-hot-toast';
import type { Timetable, Group, Semester, Curriculum } from '../types';

interface TimetableFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Timetable>, id?: string) => Promise<void>;
  timetable: Timetable | null;
  curriculums: Curriculum[];
  semesters: Semester[];
  groups: Group[];
}

export const TimetableFormModal: React.FC<TimetableFormModalProps> = ({
  open,
  onClose,
  onSave,
  timetable,
  curriculums,
  semesters,
  groups,
}) => {
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [studyMode, setStudyMode] = useState<'stacjonarny' | 'zaoczne' | 'podyplomowe' | 'anglojęzyczne'>(
    'stacjonarny',
  );
  const [curriculumId, setCurriculumId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isEditMode = useMemo(() => !!timetable?.id, [timetable]);

  useEffect(() => {
    if (open) {
      if (timetable) {
        setName(timetable.name || '');
        setAcademicYear(timetable.academicYear || '');
        setStudyMode(
          ['stacjonarny', 'zaoczne', 'podyplomowe', 'anglojęzyczne'].includes(timetable.studyMode as string)
            ? (timetable.studyMode as typeof studyMode)
            : 'stacjonarny',
        );
        setCurriculumId(timetable.curriculumId || '');
        setSemesterId(timetable.semesterId || '');
        setSelectedGroupIds(timetable.groupIds || []);
      } else {
        setName('');
        setAcademicYear('');
        setStudyMode('stacjonarny');
        setCurriculumId('');
        setSemesterId('');
        setSelectedGroupIds([]);
      }
    }
  }, [timetable, open]);

  const availableSemesters = useMemo(() => {
    if (!curriculumId) return [];
    const selectedCurriculum = curriculums.find((c) => c.id === curriculumId);
    if (!selectedCurriculum?.semesters) return [];
    return selectedCurriculum.semesters
      .map((curriculumSemester) => semesters.find((s) => s.id === curriculumSemester.semesterId))
      .filter((s): s is Semester => s !== undefined);
  }, [curriculumId, curriculums, semesters]);

  /** Grupy przypisane do wybranego semestru (semesterId) – tylko te pokazujemy w selectcie */
  const availableGroups = useMemo(() => {
    if (!semesterId) return [];
    return groups.filter((g) => g.semesterId === semesterId);
  }, [groups, semesterId]);

  useEffect(() => {
    const selectedCurriculum = curriculums.find((c) => c.id === curriculumId);
    if (selectedCurriculum) setAcademicYear(selectedCurriculum.academicYear);
    if (availableSemesters.length > 0 && !availableSemesters.find((s) => s.id === semesterId)) setSemesterId('');
  }, [curriculumId, curriculums, availableSemesters, semesterId]);

  /** Gdy semestr zostanie wyzerowany (np. po zmianie siatki), wyczyść zaznaczenie grup */
  useEffect(() => {
    if (!semesterId) setSelectedGroupIds([]);
  }, [semesterId]);

  const handleSemesterChange = (newSemesterId: string) => {
    setSemesterId(newSemesterId);
    if (!newSemesterId) {
      setSelectedGroupIds([]);
      return;
    }
    const newAvailable = groups.filter((g) => g.semesterId === newSemesterId);
    setSelectedGroupIds((prev) => prev.filter((id) => newAvailable.some((g) => g.id === id)));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Podaj nazwę planu.');
      return;
    }
    if (!curriculumId || !semesterId) {
      toast.error('Wybierz siatkę programową i semestr.');
      return;
    }
    if (selectedGroupIds.length === 0) {
      toast.error('Wybierz co najmniej jedną grupę studencką.');
      return;
    }
    setLoading(true);
    const data: Partial<Timetable> = {
      name: name.trim(),
      academicYear,
      studyMode,
      curriculumId,
      semesterId,
      groupIds: selectedGroupIds,
      curriculumName: curriculums.find((c) => c.id === curriculumId)?.programName,
      semesterName: semesters.find((s) => s.id === semesterId)?.name,
    };
    await onSave(data, timetable?.id);
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
      <DialogTitle>{isEditMode ? 'Edytuj Plan Zajęć' : 'Nowy Plan Zajęć'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2.5}
          sx={{ pt: 1 }}
        >
          <TextField
            label="Nazwa planu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            placeholder="np. Zarządzanie I st. – sem. 3, stacjonarne"
          />

          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              Tryb studiów
            </Typography>
            <ToggleButtonGroup
              color="primary"
              value={studyMode}
              exclusive
              onChange={(_, v) => v && setStudyMode(v)}
              fullWidth
              size="small"
            >
              <ToggleButton value="stacjonarny">Stacjonarne</ToggleButton>
              <ToggleButton value="zaoczne">Zaoczne</ToggleButton>
              <ToggleButton value="podyplomowe">Podyplomowe</ToggleButton>
              <ToggleButton value="anglojęzyczne">Anglojęzyczne</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider />

          <FormControl
            fullWidth
            required
          >
            <InputLabel>Siatka programowa</InputLabel>
            <Select
              value={curriculumId}
              label="Siatka programowa"
              onChange={(e) => setCurriculumId(e.target.value)}
            >
              {curriculums.map((c) => (
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
            required
            disabled={!curriculumId || availableSemesters.length === 0}
          >
            <InputLabel>Semestr</InputLabel>
            <Select
              value={semesterId}
              label="Semestr"
              onChange={(e) => handleSemesterChange(e.target.value)}
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

          <TextField
            label="Rok akademicki"
            value={academicYear}
            fullWidth
            InputProps={{ readOnly: true }}
            helperText="Ustawiany automatycznie z siatki programowej"
          />

          <Divider />

          <FormControl
            fullWidth
            required
            disabled={!semesterId || availableGroups.length === 0}
          >
            <InputLabel>Grupy studenckie</InputLabel>
            <Select<string[]>
              multiple
              value={selectedGroupIds}
              onChange={(e) => setSelectedGroupIds(e.target.value as string[])}
              input={<OutlinedInput label="Grupy studenckie" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => (
                    <Chip
                      key={id}
                      label={
                        groups.find((g) => g.id === id)?.name || availableGroups.find((g) => g.id === id)?.name || id
                      }
                      size="small"
                    />
                  ))}
                </Box>
              )}
            >
              {availableGroups.map((g) => (
                <MenuItem
                  key={g.id}
                  value={g.id}
                >
                  {g.name}
                </MenuItem>
              ))}
            </Select>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              {semesterId
                ? `Grupy przypisane do semestru (${availableGroups.length}) – wybierz grupy do planu`
                : 'Najpierw wybierz siatkę i semestr'}
            </Typography>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
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
