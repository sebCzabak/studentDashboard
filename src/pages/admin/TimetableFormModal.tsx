import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Przykładowe typy, które powinny być pobierane z bazy
interface Curriculum {
  id: string;
  name: string;
}
interface Group {
  id: string;
  name: string;
}

export const TimetableFormModal = ({ open, onClose, timetable }) => {
  const [name, setName] = useState('');
  const [curriculumId, setCurriculumId] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);

  // TODO: Dodać stany do ładowania i pobierania danych dla selectów
  const [availableCurriculums, setAvailableCurriculums] = useState<Curriculum[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);

  useEffect(() => {
    if (timetable) {
      setName(timetable.name || '');
      setCurriculumId(timetable.curriculumId || '');
      setGroupIds(timetable.groupIds || []);
    } else {
      // Resetuj formularz, jeśli dodajemy nowy
      setName('');
      setCurriculumId('');
      setGroupIds([]);
    }
  }, [timetable, open]);

  const handleSubmit = async () => {
    const data = { name, curriculumId, groupIds };
    if (timetable) {
      // Edycja
      await updateDoc(doc(db, 'timetables', timetable.id), data);
    } else {
      // Tworzenie
      await addDoc(collection(db, 'timetables'), data);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
    >
      <DialogTitle>{timetable ? 'Edytuj Plan Zajęć' : 'Stwórz Nowy Plan Zajęć'}</DialogTitle>
      <DialogContent>
        <Box
          component="form"
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
        >
          <TextField
            label="Nazwa planu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Siatka Programowa</InputLabel>
            <Select
              value={curriculumId}
              label="Siatka Programowa"
              onChange={(e) => setCurriculumId(e.target.value)}
            >
              {/* Tutaj mapowanie po `availableCurriculums` */}
              <MenuItem value="1">Informatyka Stacjonarne 2025</MenuItem>
            </Select>
          </FormControl>
          {/* TODO: Dodać multi-select dla grup */}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
        >
          Zapisz
        </Button>
      </DialogActions>
    </Dialog>
  );
};
