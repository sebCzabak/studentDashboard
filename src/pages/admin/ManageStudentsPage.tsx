// src/pages/admin/ManageStudentsPage.tsx
import { useState, useEffect, useMemo } from 'react';
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
  type SelectChangeEvent,
  InputLabel,
  Link,
} from '@mui/material';
import { getAllStudents, updateStudentAssignment } from '../../features/students/studentsService';
import { groupsService } from '../../features/shared/dictionaryService';
import { getAllSpecializations } from '../../features/groups/groupsService';
import toast from 'react-hot-toast';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

// --- IMPORTY Z NASZYCH NOWYCH PLIKÓW ---
import type { UserProfile } from '../../features/user/types';
import { StudentProfileModal } from '../../features/students/components/StudentProfilModal';
import { OnboardingStatusChip } from '../../features/students/components/OnboardingStatusChip';

// --- Typy danych słownikowych ---
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
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);

  // --- NOWE STANY ---
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);

  // Zmieniamy logikę pendingChanges na bardziej granularną
  const [pendingAssignments, setPendingAssignments] = useState<
    Record<string, { groupId?: string; specializationId?: string }>
  >({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsData, groupsData, allSpecsData] = await Promise.all([
          getAllStudents(),
          groupsService.getAll(),
          getAllSpecializations(),
        ]);

        setStudents(studentsData as UserProfile[]); // Używamy pełnego typu UserProfile
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

  // --- LOGIKA FILTROWANIA PO ROKU ---
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    students.forEach((s) => {
      if (s.createdAt) {
        yearsSet.add(s.createdAt.toDate().getFullYear().toString());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (selectedYear === 'all') {
      return students;
    }
    return students.filter((s) => {
      if (s.createdAt) {
        return s.createdAt.toDate().getFullYear().toString() === selectedYear;
      }
      return false;
    });
  }, [students, selectedYear]);

  // --- LOGIKA MODALA ---
  const handleOpenModal = (student: UserProfile) => {
    setSelectedStudent(student);
  };
  const handleCloseModal = () => {
    setSelectedStudent(null);
  };

  const handleSaveProfile = (updatedStudent: UserProfile) => {
    setStudents((prevStudents) => prevStudents.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
    // Upewnij się, że jeśli edytowany student był tym wybranym,
    // to aktualizujemy również 'selectedStudent', aby modal pokazał nowe dane
    if (selectedStudent && selectedStudent.id === updatedStudent.id) {
      setSelectedStudent(updatedStudent);
    }
  };

  const handleGroupChange = (studentId: string, newGroupId: string) => {
    const currentSpecId =
      pendingAssignments[studentId]?.specializationId || students.find((s) => s.id === studentId)?.specializationId;
    let newSpecId = currentSpecId;

    // Sprawdź, czy obecna specjalizacja należy do nowej grupy
    if (currentSpecId) {
      const spec = specializations.find((s) => s.id === currentSpecId);
      if (spec && spec.groupId !== newGroupId) {
        newSpecId = undefined; // Wyczyść specjalizację, jeśli nie pasuje
      }
    }

    setPendingAssignments((prev) => ({
      ...prev,
      [studentId]: {
        groupId: newGroupId,
        specializationId: newSpecId,
      },
    }));
  };

  const handleSpecChange = (studentId: string, newSpecId: string) => {
    setPendingAssignments((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        specializationId: newSpecId,
      },
    }));
  };

  const handleSaveChanges = async (studentId: string) => {
    const changes = pendingAssignments[studentId];
    if (!changes) return;

    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    // Użyj wartości z pending lub oryginalnej
    const finalGroupId = changes.groupId ?? student.groupId;
    const finalSpecId = changes.specializationId ?? student.specializationId;

    // Znajdź nazwy dla ID
    const group = groups.find((g) => g.id === finalGroupId);
    const spec = specializations.find((s) => s.id === finalSpecId);

    // Przygotuj dane do wysłania
    const assignmentData = {
      groupId: finalGroupId || '',
      groupName: group?.name || '',
      specializationId: finalSpecId || '',
      specializationName: spec?.name || '',
    };

    await toast.promise(updateStudentAssignment(studentId, assignmentData), {
      loading: 'Zapisywanie...',
      success: 'Przypisanie studenta zostało zaktualizowane!',
      error: 'Wystąpił błąd podczas zapisu.',
    });

    // Optymistyczna aktualizacja UI
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, ...assignmentData } : s)));

    // Wyczyść oczekującą zmianę
    setPendingAssignments((prev) => {
      const newChanges = { ...prev };
      delete newChanges[studentId];
      return newChanges;
    });
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1400px' }}>
        {' '}
        {/* Zwiększony maxWidth */}
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
        {/* NOWY FILTR ROKU */}
        <Box sx={{ mb: 3, mt: 2, maxWidth: 200 }}>
          <FormControl
            fullWidth
            size="small"
          >
            <InputLabel id="year-filter-label">Filtruj po roku rekrutacji</InputLabel>
            <Select
              labelId="year-filter-label"
              value={selectedYear}
              label="Filtruj po roku rekrutacji"
              onChange={(e: SelectChangeEvent) => setSelectedYear(e.target.value)}
            >
              <MenuItem value="all">Wszystkie lata</MenuItem>
              {availableYears.map((year) => (
                <MenuItem
                  key={year}
                  value={year}
                >
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Nr Indeksu</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Data Rekrutacji</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status Powitalny</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Grupa</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Specjalizacja</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Akcja</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Używamy przefiltrowanej listy studentów */}
              {filteredStudents.map((student) => {
                // Pobierz aktualne wartości (z pending lub ze stanu studenta)
                const pending = pendingAssignments[student.id];
                const currentGroupId = pending?.groupId ?? student.groupId ?? '';
                const currentSpecId = pending?.specializationId ?? student.specializationId ?? '';

                // Filtruj specjalizacje dostępne dla wybranej grupy
                const availableSpecs = specializations.filter((s) => s.groupId === currentGroupId);

                return (
                  <TableRow
                    key={student.id}
                    hover
                  >
                    <TableCell>
                      {/* KILKALNA NAZWA OTWIERAJĄCA MODAL */}
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => handleOpenModal(student)}
                        sx={{ textAlign: 'left' }}
                      >
                        {student.displayName}
                      </Link>
                    </TableCell>
                    <TableCell>{student.email?.split('@')[0]}</TableCell>

                    {/* NOWA KOLUMNA: Data Rekrutacji */}
                    <TableCell>
                      {student.createdAt ? format(student.createdAt.toDate(), 'd MMM yyyy', { locale: pl }) : '-'}
                    </TableCell>

                    {/* NOWA KOLUMNA: Status Powitalny */}
                    <TableCell>
                      <OnboardingStatusChip status={student.onboardingStatus} />
                    </TableCell>

                    {/* NOWY SELECT DLA GRUPY */}
                    <TableCell sx={{ minWidth: 250 }}>
                      <FormControl
                        fullWidth
                        size="small"
                        variant="standard"
                      >
                        <Select
                          value={currentGroupId}
                          onChange={(e) => handleGroupChange(student.id, e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>Brak grupy</em>
                          </MenuItem>
                          {groups.map((group) => (
                            <MenuItem
                              key={group.id}
                              value={group.id}
                            >
                              {group.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>

                    {/* NOWY SELECT DLA SPECJALIZACJI */}
                    <TableCell sx={{ minWidth: 250 }}>
                      <FormControl
                        fullWidth
                        size="small"
                        variant="standard"
                        disabled={!currentGroupId}
                      >
                        <Select
                          value={currentSpecId}
                          onChange={(e) => handleSpecChange(student.id, e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>{currentGroupId ? 'Brak specjalizacji' : '(Wybierz grupę)'}</em>
                          </MenuItem>
                          {availableSpecs.map((spec) => (
                            <MenuItem
                              key={spec.id}
                              value={spec.id}
                            >
                              {spec.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>

                    {/* ZAKTUALIZOWANA AKCJA */}
                    <TableCell>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleSaveChanges(student.id)}
                        disabled={!pendingAssignments[student.id]} // Włączony tylko jeśli są zmiany
                      >
                        Zapisz
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* RENDEROWANIE MODALA */}
      <StudentProfileModal
        open={!!selectedStudent}
        onClose={handleCloseModal}
        student={selectedStudent}
        onSave={handleSaveProfile} // <-- DODAJ TĘ LINIĘ
      />
    </Box>
  );
};
