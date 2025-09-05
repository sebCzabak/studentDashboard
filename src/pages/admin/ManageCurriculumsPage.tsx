import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
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
import {
  getCurriculums,
  getAllSubjects,
  addCurriculum,
  updateCurriculum,
  deleteCurriculum,
} from '../../features/curriculums/curriculumsService';
import { getAllLecturers, getSemesters, groupsService } from '../../features/shared/dictionaryService';
import { CurriculumFormModal } from '../../features/curriculums/components/CurriculumFormModal';
import toast from 'react-hot-toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';
import type { Curriculum } from '../../features/curriculums/types';

export const ManageCurriculumsPage = () => {
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([getCurriculums(), getAllSubjects(), getAllLecturers(), getSemesters(), groupsService.getAll()])
      .then(([curriculumsData, subjectsData, lecturersData, semestersData, groupsData]) => {
        setCurriculums(curriculumsData);
        setSubjects(subjectsData);
        setLecturers(lecturersData);
        setSemesters(semestersData);
        setGroups(groupsData);
      })
      .catch((error) => {
        console.error('Błąd pobierania danych:', error);
        toast.error('Wystąpił błąd podczas pobierania danych.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (curriculum: Curriculum | null) => {
    setEditingCurriculum(curriculum);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCurriculum(null);
  };

  // ================== OSTATECZNA POPRAWKA TUTAJ ==================
  const handleSaveCurriculum = (curriculumData: any) => {
    // 1. Definiujemy operację jako nową funkcję asynchroniczną.
    // Ponieważ ta funkcja nie ma instrukcji `return`, jej typem zawsze będzie Promise<void>.
    const saveAction = async () => {
      if (editingCurriculum) {
        // Jesteśmy w trybie edycji
        await updateCurriculum(editingCurriculum.id, curriculumData);
      } else {
        // Jesteśmy w trybie tworzenia
        await addCurriculum(curriculumData);
      }
    };

    // 2. Przekazujemy WYWOŁANIE tej funkcji (które zwraca Promise<void>) do toast.promise.
    toast.promise(saveAction(), {
      loading: 'Zapisywanie...',
      success: () => {
        handleCloseModal();
        fetchData(); // Odśwież dane po sukcesie
        return 'Siatka została pomyślnie zapisana!';
      },
      error: 'Wystąpił błąd podczas zapisu.',
    });
  };

  const handleDeleteCurriculum = async (id: string, name: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć siatkę "${name}"? Tej operacji nie można cofnąć.`)) {
      const promise = deleteCurriculum(id);
      await toast.promise(promise, {
        loading: 'Usuwanie...',
        success: () => {
          fetchData();
          return 'Siatka została usunięta.';
        },
        error: 'Wystąpił błąd podczas usuwania.',
      });
    }
  };

  const subjectsMap = useMemo(() => {
    return subjects.reduce((acc, subject) => {
      acc[subject.id] = subject.name;
      return acc;
    }, {} as Record<string, string>);
  }, [subjects]);

  const lecturersMap = useMemo(() => {
    return lecturers.reduce((acc, lecturer) => {
      acc[lecturer.id] = lecturer.displayName;
      return acc;
    }, {} as Record<string, string>);
  }, [lecturers]);

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
                      Semestr {semesters.find((s) => s.id === semester.semesterId)?.name || semester.semesterNumber}
                    </Typography>
                    <List dense>
                      {Array.isArray(semester.subjects) &&
                        semester.subjects.map((subject: any, index: number) => (
                          <ListItem key={index}>
                            <ListItemText
                              primary={`${subjectsMap[subject.subjectId] || 'Błąd'} (${subject.type})`}
                              secondary={`Prowadzący: ${lecturersMap[subject.lecturerId] || 'Błąd'} | Godziny: ${
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
            groups={groups} // Dodajemy grupy do propsów
            initialData={editingCurriculum}
          />
        )}
      </Paper>
    </Box>
  );
};
