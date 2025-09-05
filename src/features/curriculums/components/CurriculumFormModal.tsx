import { useState, useEffect } from 'react';
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
  type SelectChangeEvent,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { type CurriculumSemester } from '../types';
import toast from 'react-hot-toast';

interface CurriculumFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (scheduleData: any) => void;
  subjectsList: any[];
  lecturersList: any[];
  semestersList: any[];
  initialData?: any | null;
  groups: any[];
}

const initialSubject = { subjectId: '', lecturerId: '', type: 'wykład', hours: 0, ects: 0 };
const initialSemester = { semesterId: '', subjects: [{ ...initialSubject }] };

export const CurriculumFormModal = ({
  open,
  onClose,
  onSave,
  subjectsList,
  lecturersList,
  semestersList,
  initialData = null,
}: CurriculumFormModalProps) => {
  const [programName, setProgramName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semesters, setSemesters] = useState<any[]>([initialSemester]);

  useEffect(() => {
    if (open && initialData) {
      setProgramName(initialData.programName || '');
      setAcademicYear(initialData.academicYear || '');
      setSemesters(
        initialData.semesters && initialData.semesters.length > 0 ? initialData.semesters : [initialSemester]
      );
    } else {
      setProgramName('');
      setAcademicYear('');
      setSemesters([{ ...initialSemester }]);
    }
  }, [initialData, open]);

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

  const handleSave = () => {
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
    onSave(curriculumData);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>{initialData ? 'Edytuj Siatkę Programową' : 'Nowa Siatka Programowa'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 1, minHeight: '60vh' }}
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
              <FormControl fullWidth>
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

              {semester.subjects.map((subject: any, subjIndex: number) => (
                <Stack
                  direction="row"
                  spacing={1}
                  key={subjIndex}
                  alignItems="center"
                  sx={{ mt: 2 }}
                >
                  <FormControl
                    size="small"
                    sx={{ minWidth: 220 }}
                  >
                    <InputLabel>Przedmiot</InputLabel>
                    <Select
                      value={subject.subjectId}
                      onChange={(e) => handleSubjectChange(semIndex, subjIndex, 'subjectId', e.target.value)}
                    >
                      {subjectsList.map((s) => (
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
                    size="small"
                    sx={{ minWidth: 220 }}
                  >
                    <InputLabel>Prowadzący</InputLabel>
                    <Select
                      value={subject.lecturerId}
                      onChange={(e) => handleSubjectChange(semIndex, subjIndex, 'lecturerId', e.target.value)}
                    >
                      {lecturersList.map((l) => (
                        <MenuItem
                          key={l.id}
                          value={l.id}
                        >
                          {l.displayName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    <InputLabel>Typ</InputLabel>
                    <Select
                      value={subject.type}
                      onChange={(e) => handleSubjectChange(semIndex, subjIndex, 'type', e.target.value)}
                    >
                      <MenuItem value="wykład">Wykład</MenuItem>
                      <MenuItem value="ćwiczenia">Ćwiczenia</MenuItem>
                      <MenuItem value="laboratorium">Laboratorium</MenuItem>
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
                    disabled={semester.subjects.length <= 1}
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
