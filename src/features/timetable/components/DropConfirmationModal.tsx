import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';

export const DropConfirmationModal = ({
  open,
  onClose,
  onConfirm,
  dropData,
  availableGroups,
  availableRooms,
  maps,
}: any) => {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedRoomId('');
      if (availableGroups?.length === 1) {
        setSelectedGroupId(availableGroups[0].id);
      } else {
        setSelectedGroupId('');
      }
    }
  }, [open, availableGroups]);

  const handleConfirm = () => {
    if (!selectedGroupId || !selectedRoomId) {
      return toast.error('Proszę wybrać grupę i salę.');
    }
    onConfirm({
      groupId: selectedGroupId,
      roomId: selectedRoomId,
    });
  };

  if (!open || !dropData) return null;

  // ================== KLUCZOWA POPRAWKA TUTAJ ==================
  // Bezpiecznie odczytujemy dane, zakładając, że mogą nie istnieć
  const classData = dropData.active?.data?.current;
  const [day, timeSlot] = dropData.over?.id?.toString().split('__') || ['Błąd', 'Błąd'];

  // Jeśli z jakiegoś powodu dane są niekompletne, nie renderujemy modala
  if (!classData) {
    console.error('Błąd krytyczny: Brak danych (classData) w operacji upuszczania.', dropData);
    return null;
  }
  // =============================================================

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>Potwierdź Dodanie Zajęć</DialogTitle>
      <DialogContent>
        <Stack
          spacing={1}
          sx={{ pt: 1 }}
        >
          <Typography>
            Termin:{' '}
            <strong>
              {day}, {timeSlot}
            </strong>
          </Typography>
          <Typography>
            Przedmiot:{' '}
            <strong>
              {maps.subjects[classData.subjectId]} ({classData.type})
            </strong>
          </Typography>
          <Typography>
            Prowadzący: <strong>{maps.lecturers[classData.lecturerId]}</strong>
          </Typography>

          <FormControl
            fullWidth
            sx={{ mt: 2 }}
          >
            <InputLabel>Wybierz Grupę</InputLabel>
            <Select
              value={selectedGroupId}
              label="Wybierz Grupę"
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              {(availableGroups || []).map((g: any) => (
                <MenuItem
                  key={g.id}
                  value={g.id}
                >
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Wybierz Salę</InputLabel>
            <Select
              value={selectedRoomId}
              label="Wybierz Salę"
              onChange={(e) => setSelectedRoomId(e.target.value)}
            >
              {(availableRooms || []).map((r: any) => (
                <MenuItem
                  key={r.id}
                  value={r.id}
                >
                  {r.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
        >
          Zatwierdź i Zapisz
        </Button>
      </DialogActions>
    </Dialog>
  );
};
