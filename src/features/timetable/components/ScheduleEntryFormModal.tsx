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
  Box,
  type SelectChangeEvent,
  OutlinedInput,
  Chip,
} from '@mui/material';
import { type ScheduleEntry } from '../types';
import toast from 'react-hot-toast';

interface ScheduleEntryFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (entryData: Omit<ScheduleEntry, 'id' | 'createdAt' | 'timetableId'>) => Promise<void>;
  onDelete: () => Promise<void>;
  initialData: any | null;
  availableSubjects: any[];
  availableGroups: any[];
  availableRooms: any[];
  lecturersMap: Record<string, string>;
  subjectsMap: Record<string, string>;
}

export const ScheduleEntryFormModal = ({
  open,
  onClose,
  onSave,
  onDelete,
  initialData,
  availableSubjects,
  availableGroups,
  availableRooms,
  lecturersMap,
  subjectsMap,
}: ScheduleEntryFormModalProps) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData?.id) {
      // Tryb edycji
      setSelectedSubjectId(initialData.subjectId || '');
      setSelectedGroupIds(initialData.groupIds || []);
      setSelectedRoomId(initialData.roomId || '');
    } else {
      // Tryb tworzenia
      setSelectedSubjectId('');
      setSelectedGroupIds([]);
      setSelectedRoomId('');
    }
  }, [initialData, open]);

  const handleSave = async () => {
    const subjectDetails = (availableSubjects || []).find((s: any) => s.subjectId === selectedSubjectId);
    if (!subjectDetails || selectedGroupIds.length === 0 || !selectedRoomId) {
      return toast.error('Proszę wypełnić wszystkie pola.');
    }

    setLoading(true);
    const entryData = {
      subjectId: selectedSubjectId,
      lecturerId: subjectDetails.lecturerId,
      type: subjectDetails.type,
      groupIds: selectedGroupIds,
      roomId: selectedRoomId,
      dayOfWeek: initialData.dayOfWeek,
      timeSlot: initialData.timeSlot,
    };
    try {
      await onSave(entryData);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (event: SelectChangeEvent<typeof selectedGroupIds>) => {
    const {
      target: { value },
    } = event;
    setSelectedGroupIds(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{initialData?.id ? 'Edytuj Zajęcia' : 'Dodaj Nowe Zajęcia'}</DialogTitle>
      <DialogContent>
        <Typography
          variant="h6"
          gutterBottom
        >
          {initialData?.dayOfWeek}, {initialData?.timeSlot}
        </Typography>
        <Stack
          spacing={2}
          sx={{ pt: 2 }}
        >
          <FormControl fullWidth>
            <InputLabel>Przedmiot / Prowadzący</InputLabel>
            <Select
              value={selectedSubjectId}
              label="Przedmiot / Prowadzący"
              onChange={(e: SelectChangeEvent) => setSelectedSubjectId(e.target.value)}
            >
              {(availableSubjects || []).map((s: any, i: number) => (
                <MenuItem
                  key={`${s.subjectId}-${i}`}
                  value={s.subjectId}
                >
                  {subjectsMap[s.subjectId]} ({s.type}) - {lecturersMap[s.lecturerId]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Grupy Studenckie</InputLabel>
            <Select
              multiple
              value={selectedGroupIds}
              onChange={handleGroupChange} // Używamy naszej nowej, dedykowanej funkcji
              input={<OutlinedInput label="Grupy Studenckie" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip
                      key={value}
                      label={availableGroups.find((g: any) => g.id === value)?.name || value}
                    />
                  ))}
                </Box>
              )}
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
            <InputLabel>Sala</InputLabel>
            <Select
              value={selectedRoomId}
              label="Sala"
              onChange={(e: SelectChangeEvent) => setSelectedRoomId(e.target.value)}
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
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        {initialData?.id ? (
          <Button
            onClick={handleDelete}
            color="error"
            disabled={loading}
          >
            Usuń
          </Button>
        ) : (
          <Box />
        )}
        <Box>
          <Button onClick={onClose}>Anuluj</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
