import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { updateCurriculum, addCurriculum, deleteCurriculum } from '../../features/curriculums/curriculumsService';
import { getAllLecturers, getSemesters, groupsService } from '../../features/shared/dictionaryService';
import { CurriculumFormModal } from '../../features/curriculums/components/CurriculumFormModal';
import toast from 'react-hot-toast';
import type { Curriculum, Subject, Semester, Group } from '../../features/timetable/types';
import type { UserProfile } from '../../features/user/userService';
import { getSubjects } from '../../features/subjects/subjectsService';

export const ManageCurriculumsPage = () => {
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lecturers, setLecturers] = useState<UserProfile[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [_groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);

  useEffect(() => {
    // Ustawiamy nasłuch na zmiany w siatkach w czasie rzeczywistym
    const curriculumsQuery = collection(db, 'curriculums');
    const unsubscribe = onSnapshot(curriculumsQuery, (snapshot) => {
      const curriculumsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Curriculum));
      setCurriculums(curriculumsData);

      // Dane słownikowe pobieramy tylko raz
      if (loading) {
        Promise.all([getSubjects(), getAllLecturers(), getSemesters(), groupsService.getAll()])
          .then(([subjectsData, lecturersData, semestersData, groupsData]) => {
            // ✅ Sortujemy alfabetycznie wszystkie pobrane listy
            setSubjects((subjectsData as unknown as Subject[]).sort((a, b) => a.name.localeCompare(b.name, 'pl')));
            setLecturers(
              (lecturersData as UserProfile[]).sort((a, b) => a.displayName.localeCompare(b.displayName, 'pl'))
            );
            setSemesters(semestersData as Semester[]);
            setGroups(groupsData as Group[]);
          })
          .catch((_error) => toast.error('Wystąpił błąd podczas pobierania danych słownikowych.'))
          .finally(() => setLoading(false));
      }
    });

    return () => unsubscribe();
  }, [loading]);

  const handleOpenModal = (curriculum: Curriculum | null) => {
    setEditingCurriculum(curriculum);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCurriculum(null);
  };

  const handleSaveCurriculum = async (curriculumData: Omit<Curriculum, 'id'>, id?: string) => {
    const promise = id ? updateCurriculum(id, curriculumData) : addCurriculum(curriculumData);
    await toast.promise(promise, {
      loading: 'Zapisywanie siatki...',
      success: 'Siatka została pomyślnie zapisana!',
      error: 'Wystąpił błąd podczas zapisu.',
    });
    handleCloseModal();
  };

  const handleDeleteCurriculum = async (id: string, name: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć siatkę "${name}"? Tej operacji nie można cofnąć.`)) {
      await toast.promise(deleteCurriculum(id), {
        loading: 'Usuwanie...',
        success: 'Siatka została usunięta.',
        error: 'Wystąpił błąd podczas usuwania.',
      });
    }
  };

  // Mapy do szybkiego wyszukiwania nazw po ID
  const subjectsMap = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const lecturersMap = useMemo(() => new Map(lecturers.map((l) => [l.id, l.displayName])), [lecturers]);

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Button
        component={RouterLink}
        to="/admin"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Wróć do pulpitu
      </Button>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography
          variant="h4"
          gutterBottom
        >
          Zarządzaj Siatkami Programowymi
        </Typography>
        <Button
          variant="contained"
          onClick={() => handleOpenModal(null)}
        >
          Dodaj Nową Siatkę
        </Button>
      </Box>

      <Box sx={{ mt: 3 }}>
        {curriculums.map((curriculum) => (
          <Accordion key={curriculum.id}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', justifyContent: 'space-between' } }}
            >
              <Box>
                <Typography sx={{ fontWeight: 500 }}>{curriculum.programName}</Typography>
                <Typography sx={{ color: 'text.secondary' }}>{curriculum.academicYear}</Typography>
              </Box>
              <Box>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenModal(curriculum);
                  }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCurriculum(curriculum.id, curriculum.programName);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {(curriculum.semesters || []).map((semester: any) => (
                <Box
                  key={semester.semesterId || semester.semesterNumber}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6">
                    Semestr {semesters.find((s) => s.id === semester.semesterId)?.name || semester.semesterNumber + 1}
                  </Typography>
                  <List dense>
                    {(semester.subjects || []).map((subject: any, index: number) => (
                      <ListItem key={`${subject.subjectId}-${index}`}>
                        <ListItemText
                          primary={`${subjectsMap.get(subject.subjectId) || 'Błąd'} (${subject.type})`}
                          secondary={`Prowadzący: ${lecturersMap.get(subject.lecturerId) || 'Błąd'} | Godziny: ${
                            subject.hours
                          } | ECTS: ${subject.ects}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {isModalOpen && (
        <CurriculumFormModal
          open={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveCurriculum}
          subjectsList={subjects}
          lecturersList={lecturers}
          semestersList={semesters}
          initialData={editingCurriculum}
          groups={[]}
        />
      )}
    </Box>
  );
};
