// src/pages/admin/GradingPage.tsx
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  type SelectChangeEvent,
} from '@mui/material';
import { useAuthContext } from '../../context/AuthContext';
import { groupsService } from '../../features/shared/dictionaryService';
import { getSubjectsForLecturer, getStudentsInGroup } from '../../features/user/userService';
import { saveGradesBatch } from '../../features/grades/gradesService';
import toast from 'react-hot-toast';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const gradeOptions = ['2.0', '3.0', '3.5', '4.0', '4.5', '5.0', 'ZAL', 'NZAL'];

export const GradingPage = () => {
  const { user } = useAuthContext();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const [grades, setGrades] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      Promise.all([getSubjectsForLecturer(user.uid), groupsService.getAll()])
        .then(([subjectsData, groupsData]) => {
          setSubjects(subjectsData);
          setAllGroups(groupsData);
        })
        .catch(() => {
          toast.error('Nie udało się wczytać przedmiotów lub grup.');
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroupId) {
      setLoadingStudents(true);
      getStudentsInGroup(selectedGroupId)
        .then((data) => setStudents(data))
        .finally(() => setLoadingStudents(false));
    } else {
      setStudents([]);
    }
  }, [selectedGroupId]);

  const handleGradeChange = (studentId: string, value: string) => {
    setGrades((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleSaveGrades = async () => {
    if (!selectedSubjectId) {
      return toast.error('Proszę najpierw wybrać przedmiot z listy.');
    }
    if (Object.keys(grades).length === 0) {
      return toast.error('Nie wprowadzono żadnych ocen do zapisu.');
    }
    setIsSaving(true);
    try {
      const subjectName = subjects.find((s) => s.id === selectedSubjectId)?.name || '';
      await saveGradesBatch(grades, selectedSubjectId, subjectName, user!.uid, user!.displayName || 'Brak nazwy');
      toast.success('Oceny zostały pomyślnie zapisane!');
      setGrades({}); // Czyścimy stan wprowadzonych ocen po zapisie
    } catch (error) {
      console.error('Błąd podczas zapisywania ocen:', error);
      toast.error('Wystąpił błąd podczas zapisu.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1200px' }}>
        <Button
          component={RouterLink}
          to="/admin"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Wróć do pulpitu
        </Button>
        <Typography
          variant="h4"
          gutterBottom
        >
          Panel Oceniania
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <FormControl fullWidth>
            <InputLabel>Wybierz Przedmiot</InputLabel>
            <Select
              value={selectedSubjectId}
              label="Wybierz Przedmiot"
              onChange={(e: SelectChangeEvent) => setSelectedSubjectId(e.target.value)}
            >
              {subjects.map((s) => (
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
            <InputLabel>Wybierz Grupę</InputLabel>
            <Select
              value={selectedGroupId}
              label="Wybierz Grupę"
              onChange={(e: SelectChangeEvent) => setSelectedGroupId(e.target.value)}
            >
              {allGroups.map((g) => (
                <MenuItem
                  key={g.id}
                  value={g.id}
                >
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {loadingStudents && <CircularProgress />}

        {students.length > 0 && !loadingStudents && (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nr Indeksu</TableCell>
                    <TableCell>Imię i Nazwisko</TableCell>
                    <TableCell sx={{ width: '20%' }}>Ocena</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.email?.split('@')[0]}</TableCell>
                      <TableCell>{student.displayName}</TableCell>
                      <TableCell>
                        <FormControl
                          fullWidth
                          variant="standard"
                        >
                          <Select
                            value={grades[student.id] || ''}
                            onChange={(e) => handleGradeChange(student.id, e.target.value)}
                          >
                            {/* Pusta opcja do wyczyszczenia oceny */}
                            <MenuItem value="">
                              <em>Brak</em>
                            </MenuItem>
                            {gradeOptions.map((option) => (
                              <MenuItem
                                key={option}
                                value={option}
                              >
                                {option}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={handleSaveGrades}
              disabled={isSaving}
            >
              {isSaving ? 'Zapisywanie...' : 'Zapisz Oceny'}
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};
