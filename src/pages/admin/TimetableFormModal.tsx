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
} from '@mui/material';
import toast from 'react-hot-toast';
import type { Timetable, Group, Semester, Curriculum, RecurrenceType, StudyMode } from '../../features/timetable/types';

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
  const [studyMode, setStudyMode] = useState<StudyMode>('stacjonarne');
  const [curriculumId, setCurriculumId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('weekly');

  const isEditMode = useMemo(() => !!timetable?.id, [timetable]);

  useEffect(() => {
    if (open) {
      if (timetable) {
        setName(timetable.name || '');
        setAcademicYear(timetable.academicYear || '');
        setStudyMode(timetable.studyMode || 'stacjonarne');
        setCurriculumId(timetable.curriculumId || '');
        setSemesterId(timetable.semesterId || '');
        setSelectedGroupIds(timetable.groupIds || []);
        setRecurrence(timetable.recurrence || 'weekly');
      } else {
        // Resetowanie formularza
        setName('');
        setAcademicYear('');
        setStudyMode('stacjonarne');
        setCurriculumId('');
        setSemesterId('');
        setSelectedGroupIds([]);
        setRecurrence('weekly');
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

  useEffect(() => {
    const selectedCurriculum = curriculums.find((c) => c.id === curriculumId);
    if (selectedCurriculum) {
      setAcademicYear(selectedCurriculum.academicYear);
    }
    if (availableSemesters.length > 0 && !availableSemesters.find((s) => s.id === semesterId)) {
      setSemesterId('');
    }
  }, [curriculumId, curriculums, availableSemesters, semesterId]);

  const handleSubmit = async () => {
    if (!name || !curriculumId || !semesterId || selectedGroupIds.length === 0) {
      toast.error('Proszę wypełnić wszystkie wymagane pola.');
      return;
    }
    setLoading(true);
    const data: Partial<Timetable> = {
      name,
      academicYear,
      studyMode,
      curriculumId,
      semesterId,
      groupIds: selectedGroupIds,
      recurrence,
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
      <DialogTitle>{isEditMode ? 'Edytuj Plan Zajęć' : 'Stwórz Nowy Plan Zajęć'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 2 }}
        >
          <TextField
            label="Nazwa Planu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Rok Akademicki"
            value={academicYear}
            InputProps={{ readOnly: true }}
            fullWidth
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
              onChange={(_, v) => v && setStudyMode(v)}
              fullWidth
            >
              <ToggleButton value="stacjonarne">Dzienne</ToggleButton>
              <ToggleButton value="niestacjonarne">Zaoczne</ToggleButton>
              <ToggleButton value="podyplomowe">Podyplomowe</ToggleButton>
              <ToggleButton value="anglojęzyczne">Anglojęzyczne</ToggleButton>
            </ToggleButtonGroup>
          </FormControl>

          {(studyMode === 'stacjonarne' || studyMode === 'anglojęzyczne') && (
            <FormControl fullWidth>
              <InputLabel>Cykliczność zajęć (dla Kal. Google)</InputLabel>
              <Select
                value={recurrence}
                label="Cykliczność zajęć (dla Kal. Google)"
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              >
                <MenuItem value="weekly">Co tydzień</MenuItem>
                <MenuItem value="bi-weekly">Co 2 tygodnie</MenuItem>
              </Select>
            </FormControl>
          )}

          <FormControl
            fullWidth
            required
          >
            <InputLabel>Siatka Programowa</InputLabel>
            <Select
              value={curriculumId}
              label="Siatka Programowa"
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
              onChange={(e) => setSemesterId(e.target.value)}
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

          <FormControl
            fullWidth
            required
          >
            <InputLabel>Grupy Studenckie</InputLabel>
            <Select<string[]>
              multiple
              value={selectedGroupIds}
              onChange={(e) => setSelectedGroupIds(e.target.value as string[])}
              input={<OutlinedInput label="Grupy Studenckie" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => (
                    <Chip
                      key={id}
                      label={groups.find((g) => g.id === id)?.name || id}
                    />
                  ))}
                </Box>
              )}
            >
              {groups.map((g) => (
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
