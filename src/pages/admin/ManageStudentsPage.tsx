import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { getAllStudents, assignStudentToSpecialization } from '../../features/students/studentsService';
import { groupsService } from '../../features/shared/dictionaryService';
import { getAllSpecializations } from '../../features/groups/groupsService';
import toast from 'react-hot-toast';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// ✅ Krok 2: Definiujemy typy dla naszych danych
interface Student {
  id: string;
  displayName: string;
  email?: string;
  specializationId?: string;
  specializationName?: string;
}

interface Group {
  id: string;
  name: string;
}

interface Specialization {
  id: string;
  name: string;
  groupId: string;
}

export const ManageStudentsPage = () => {
  // ✅ Używamy zdefiniowanych typów zamiast `any`
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ Krok 1: Pobieramy wszystko naraz w 3 zapytaniach, zamiast N+1
        const [studentsData, groupsData, allSpecsData] = await Promise.all([
          getAllStudents(),
          groupsService.getAll(), // Używamy groupsService, który już masz
          getAllSpecializations(),
        ]);

        setStudents(studentsData as Student[]);
        setGroups(groupsData as Group[]);
        setSpecializations(allSpecsData as Specialization[]);
      } catch (error) {
        console.error('Błąd podczas wczytywania danych:', error);
        toast.error('Błąd wczytywania danych.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSpecChange = (studentId: string, specId: string) => {
    setPendingChanges((prev) => ({ ...prev, [studentId]: specId }));
  };

  const handleSaveChanges = async (studentId: string) => {
    const specId = pendingChanges[studentId];
    if (!specId) return;

    // Znajdź pełen obiekt specjalizacji, aby pobrać jej nazwę
    const spec = specializations.find((s) => s.id === specId);
    if (!spec) return;

    await toast.promise(assignStudentToSpecialization(studentId, specId, spec.name), {
      loading: 'Zapisywanie...',
      success: 'Student został przypisany do specjalizacji!',
      error: 'Wystąpił błąd podczas zapisu.',
    });

    // Optymistyczna aktualizacja UI
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, specializationId: specId, specializationName: spec.name } : s))
    );

    // Wyczyść oczekującą zmianę
    setPendingChanges((prev) => {
      const newChanges = { ...prev };
      delete newChanges[studentId];
      return newChanges;
    });
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
          Zarządzaj Studentami
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Nr Indeksu</TableCell>
                <TableCell>Przypisana Grupa / Specjalizacja</TableCell>
                <TableCell>Akcja</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.displayName}</TableCell>
                  <TableCell>{student.email?.split('@')[0]}</TableCell>
                  <TableCell sx={{ minWidth: 300 }}>
                    <FormControl
                      fullWidth
                      size="small"
                    >
                      <Select
                        variant="standard"
                        value={pendingChanges[student.id] || student.specializationId || ''}
                        onChange={(e) => handleSpecChange(student.id, e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Brak przypisania</em>
                        </MenuItem>
                        {groups.map((group) => [
                          <MenuItem
                            key={group.id}
                            disabled
                            sx={{ fontWeight: 'bold', fontStyle: 'italic' }}
                          >
                            {group.name}
                          </MenuItem>,
                          // Filtrujemy teraz z pobranej, pełnej listy specjalizacji
                          ...specializations
                            .filter((s) => s.groupId === group.id)
                            .map((spec) => (
                              <MenuItem
                                key={spec.id}
                                value={spec.id}
                                sx={{ pl: 4 }}
                              >
                                {spec.name}
                              </MenuItem>
                            )),
                        ])}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleSaveChanges(student.id)}
                      disabled={!pendingChanges[student.id]}
                    >
                      Zapisz
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
