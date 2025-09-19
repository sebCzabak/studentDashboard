import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Typography,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Paper,
  Autocomplete,
  type SelectChangeEvent,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import toast from 'react-hot-toast';
import type { Curriculum, Subject, Semester, Department, Group } from '../../../features/timetable/types';
import type { UserProfile } from '../../../features/user/userService';
interface CurriculumFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (scheduleData: Omit<Curriculum, 'id'>, id?: string) => Promise<void>;
  subjectsList: Subject[];
  lecturersList: UserProfile[];
  semestersList: Semester[];
  initialData: Curriculum | null;
  departments: Department[];
  groups: Group[];
}

const initialSubject = { subjectId: '', lecturerId: '', type: 'Wykład', hours: 30, ects: 5 };
const initialSemester = { semesterId: '', subjects: [{ ...initialSubject }] };

export const CurriculumFormModal: React.FC<CurriculumFormModalProps> = ({
  open,
  onClose,
  onSave,
  subjectsList,
  lecturersList,
  semestersList,
  initialData,
  departments,
}) => {
  const [programName, setProgramName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semesters, setSemesters] = useState<any[]>([initialSemester]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');

  useEffect(() => {
    if (open) {
      if (initialData) {
        setProgramName(initialData.programName || '');
        setAcademicYear(initialData.academicYear || '');
        setSemesters(
          initialData.semesters && initialData.semesters.length > 0 ? initialData.semesters : [{ ...initialSemester }]
        );
      } else {
        setProgramName('');
        setAcademicYear('');
        setSemesters([{ ...initialSemester }]);
      }
    }
  }, [initialData, open]);

  const filteredAndSortedSubjects = useMemo(() => {
    const filtered =
      selectedDepartmentId === 'all'
        ? subjectsList
        : subjectsList.filter((subject) => subject.departmentId === selectedDepartmentId);
    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [subjectsList, selectedDepartmentId]);

  const sortedLecturers = useMemo(
    () => [...lecturersList].sort((a, b) => a.displayName.localeCompare(b.displayName, 'pl')),
    [lecturersList]
  );

  const handleSemesterChange = (semIndex: number, newSemesterId: string) => {
    const newSemesters = [...semesters];
    newSemesters[semIndex].semesterId = newSemesterId;
    setSemesters(newSemesters);
  };

  const handleSubjectChange = (semIndex: number, subjIndex: number, field: string, value: any) => {
    const newSemesters = JSON.parse(JSON.stringify(semesters));
    (newSemesters[semIndex].subjects[subjIndex] as any)[field] = value;
    setSemesters(newSemesters);
  };

  const addSubject = (semIndex: number) => {
    const newSemesters = [...semesters];
    newSemesters[semIndex].subjects.push({ ...initialSubject });
    setSemesters(newSemesters);
  };

  const removeSubject = (semIndex: number, subjIndex: number) => {
    const newSemesters = [...semesters];
    newSemesters[semIndex].subjects.splice(subjIndex, 1);
    setSemesters(newSemesters);
  };

  const addSemester = () => {
    setSemesters([...semesters, { ...initialSemester }]);
  };

  const handleSave = async () => {
    if (!programName || !academicYear) {
      return toast.error('Nazwa programu i rok akademicki są wymagane.');
    }
    const curriculumData = {
      programName,
      academicYear,
      semesters: semesters.map((semester) => ({
        semesterId: semester.semesterId,
        semesterNumber: semestersList.find((s) => s.id === semester.semesterId)?.semesterNumber || 0,
        subjects: semester.subjects.map((subject: any) => ({
          subjectId: subject.subjectId,
          lecturerId: subject.lecturerId,
          type: subject.type,
          hours: Number(subject.hours) || 0,
          ects: Number(subject.ects) || 0,
        })),
      })),
    };
    await onSave(curriculumData as Omit<Curriculum, 'id'>, initialData?.id);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>{initialData ? 'Edytuj Siatkę Programową' : 'Nowa Siatka Programowa'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 1 }}
        >
          <TextField
            label="Nazwa Programu (np. Informatyka, I stopień)"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Rok Akademicki (np. 2025/2026)"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            fullWidth
          />
          <Divider sx={{ my: 2 }}>
            <Typography variant="overline">Semestry</Typography>
          </Divider>

          {semesters.map((semester, semIndex) => (
            <Paper
              key={semIndex}
              variant="outlined"
              sx={{ p: 2 }}
            >
              <FormControl
                fullWidth
                sx={{ mb: 2 }}
              >
                <InputLabel>Wybierz Semestr</InputLabel>
                <Select
                  value={semester.semesterId}
                  label="Wybierz Semestr"
                  onChange={(e: SelectChangeEvent) => handleSemesterChange(semIndex, e.target.value)}
                >
                  {(semestersList || []).map((s) => (
                    <MenuItem
                      key={s.id}
                      value={s.id}
                    >
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 240, mb: 2 }}>
                <InputLabel size="small">Filtruj przedmioty po katedrze</InputLabel>
                <Select
                  value={selectedDepartmentId}
                  label="Filtruj przedmioty po katedrze"
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  size="small"
                >
                  <MenuItem value="all">Wszystkie katedry</MenuItem>
                  {departments.map((dep) => (
                    <MenuItem
                      key={dep.id}
                      value={dep.id}
                    >
                      {dep.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {(semester.subjects || []).map((subject: any, subjIndex: number) => (
                <Stack
                  direction="row"
                  spacing={1}
                  key={subjIndex}
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Autocomplete
                    options={filteredAndSortedSubjects}
                    getOptionLabel={(option) => option.name}
                    value={subjectsList.find((s) => s.id === subject.subjectId) || null}
                    onChange={(_, newValue) =>
                      handleSubjectChange(semIndex, subjIndex, 'subjectId', newValue?.id || '')
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Przedmiot"
                        size="small"
                      />
                    )}
                    sx={{ flex: 3 }}
                  />
                  <Autocomplete
                    options={sortedLecturers}
                    getOptionLabel={(option) => option.displayName}
                    value={lecturersList.find((l) => l.id === subject.lecturerId) || null}
                    onChange={(_, newValue) =>
                      handleSubjectChange(semIndex, subjIndex, 'lecturerId', newValue?.id || '')
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Prowadzący"
                        size="small"
                      />
                    )}
                    sx={{ flex: 3 }}
                  />
                  <FormControl
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    <InputLabel>Typ</InputLabel>
                    <Select
                      value={subject.type}
                      onChange={(e) => handleSubjectChange(semIndex, subjIndex, 'type', e.target.value)}
                    >
                      <MenuItem value="Wykład">Wykład</MenuItem>
                      <MenuItem value="Ćwiczenia">Ćwiczenia</MenuItem>
                      <MenuItem value="Laboratorium">Laboratorium</MenuItem>
                      <MenuItem value="Seminarium">Seminarium</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Godziny"
                    type="number"
                    size="small"
                    value={subject.hours}
                    onChange={(e) => handleSubjectChange(semIndex, subjIndex, 'hours', e.target.value)}
                    sx={{ width: 90 }}
                  />
                  <TextField
                    label="ECTS"
                    type="number"
                    size="small"
                    value={subject.ects}
                    onChange={(e) => handleSubjectChange(semIndex, subjIndex, 'ects', e.target.value)}
                    sx={{ width: 120 }}
                  />
                  <IconButton
                    onClick={() => removeSubject(semIndex, subjIndex)}
                    color="error"
                    disabled={(semester.subjects || []).length <= 1}
                  >
                    <RemoveCircleOutlineIcon />
                  </IconButton>
                </Stack>
              ))}
              <Button
                size="small"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => addSubject(semIndex)}
                sx={{ mt: 1 }}
              >
                Dodaj przedmiot
              </Button>
            </Paper>
          ))}
          <Button onClick={addSemester}>Dodaj kolejny semestr</Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button
          onClick={handleSave}
          variant="contained"
        >
          Zapisz Zmiany
        </Button>
      </DialogActions>
    </Dialog>
  );
};
