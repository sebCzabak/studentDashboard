import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase'; // Upewnij się, że ścieżka jest poprawna
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
  Switch,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import GridViewIcon from '@mui/icons-material/GridView';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Import Twojego zaawansowanego modala
import { TimetableFormModal } from '../../features/timetable/components/TimetableFormModal';
import { updateTimetableStatus } from '../../features/timetable/scheduleService';

// Uproszczone typy dla danych w tabeli i "słowników"
interface Timetable {
  id: string;
  name: string;
  curriculumName?: string;
  semesterName?: string;
  [key: string]: any; //
}
interface DictionaryData {
  id: string;
  name: string;
  [key: string]: any;
}

// Funkcja pomocnicza do pobierania danych "słownikowych"
const fetchDictionary = async (collectionName: string): Promise<DictionaryData[]> => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as DictionaryData));
};

export const TimetablesListPage = () => {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Stany dla danych "słownikowych" potrzebnych w modalu
  const [semesters, setSemesters] = useState<DictionaryData[]>([]);
  const [groups, setGroups] = useState<DictionaryData[]>([]);
  const [curriculums, setCurriculums] = useState<DictionaryData[]>([]);

  // Stany do zarządzania modalem
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialModalData, setInitialModalData] = useState<Timetable | null>(null);

  // Pobieranie danych dla list i dla selectów w modalu
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Równoległe pobieranie danych "słownikowych"
        const [semestersData, groupsData, curriculumsData] = await Promise.all([
          fetchDictionary('semesters'),
          fetchDictionary('groups'),
          fetchDictionary('curriculums'),
        ]);
        setSemesters(semestersData);
        setGroups(groupsData);
        setCurriculums(curriculumsData);
      } catch (error) {
        console.error('Błąd pobierania danych słownikowych:', error);
        toast.error('Nie udało się załadować danych potrzebnych do formularza.');
      }
    };

    fetchAllData();

    // Nasłuchiwanie na zmiany w planach zajęć
    const q = collection(db, 'timetables');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const timetablesData = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Timetable)
      );
      setTimetables(timetablesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Logika zapisu przekazywana do modala
  const handleSave = async (data: any) => {
    // Jeśli initialModalData ma ID, to edytujemy. W przeciwnym razie tworzymy nowy.
    // Twój modal obsługuje tylko tworzenie i kopiowanie, więc upraszczamy do tworzenia.
    await toast.promise(addDoc(collection(db, 'timetables'), data), {
      loading: 'Zapisywanie planu...',
      success: 'Plan zajęć został pomyślnie utworzony!',
      error: 'Wystąpił błąd podczas zapisu.',
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten plan zajęć? Tej operacji nie można cofnąć.')) {
      await toast.promise(deleteDoc(doc(db, 'timetables', id)), {
        loading: 'Usuwanie planu...',
        success: 'Plan został usunięty.',
        error: 'Nie udało się usunąć planu.',
      });
    }
  };
  const handleStatusChange = async (timetable: Timetable) => {
    const newStatus = timetable.status === 'published' ? 'draft' : 'published';
    const promise = updateTimetableStatus(timetable.id, newStatus);

    await toast.promise(promise, {
      loading: 'Aktualizowanie statusu...',
      success: `Status planu zmieniono na: ${newStatus === 'published' ? 'Opublikowany' : 'Roboczy'}`,
      error: 'Błąd podczas zmiany statusu.',
    });
    // onSnapshot automatycznie odświeży listę
  };

  const openModalForCopy = (timetable: Timetable) => {
    setInitialModalData(timetable);
    setIsModalOpen(true);
  };

  const openModalForNew = () => {
    setInitialModalData(null);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          component={RouterLink}
          to="/admin"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Wróć do pulpitu
        </Button>
        <Typography variant="h4">Zarządzanie Planami Zajęć</Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={openModalForNew}
        >
          Dodaj nowy plan
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nazwa Planu</TableCell>
              <TableCell>Rok Akademicki</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Publikacja</TableCell>
              <TableCell align="right">Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {timetables.map((timetable) => (
              <TableRow
                key={timetable.id}
                hover
              >
                <TableCell>{timetable.name}</TableCell>
                <TableCell>{timetable.academicYear || '---'}</TableCell>
                <TableCell>
                  {/* ✅ Dodajemy Chip z kolorem zależnym od statusu */}
                  <Chip
                    label={timetable.status === 'published' ? 'Opublikowany' : 'Roboczy'}
                    color={timetable.status === 'published' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={timetable.status === 'published' ? 'Cofnij publikację' : 'Opublikuj plan'}>
                    <Switch
                      checked={timetable.status === 'published'}
                      onChange={() => handleStatusChange(timetable)}
                      color="success"
                    />
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Układaj plan">
                    <IconButton
                      color="secondary"
                      onClick={() => navigate(`/admin/timetables/${timetable.id}`)}
                    >
                      <GridViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Kopiuj">
                    <IconButton
                      color="primary"
                      onClick={() => openModalForCopy(timetable)}
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                  {/* TODO: Można dodać przycisk edycji, który przekazywałby ID do onSave */}
                  {/* <Tooltip title="Edytuj"><IconButton>...</IconButton></Tooltip> */}
                  <Tooltip title="Usuń">
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(timetable.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TimetableFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        semesters={semesters}
        groups={groups}
        curriculums={curriculums}
        initialData={initialModalData}
      />
    </Box>
  );
};
