import React, { useState, useEffect } from 'react';
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
  Divider,
  Typography,
  Box,
  OutlinedInput,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  FormGroup,
  FormControlLabel,
  Checkbox,
  type SelectChangeEvent,
  Paper,
  TextField,
} from '@mui/material';
import type { ScheduleEntry, Group, Room, Specialization, SemesterDate } from '../../../features/timetable/types';

interface ScheduleEntryFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ScheduleEntry>) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialData: Partial<ScheduleEntry>;
  availableGroups: Group[];
  availableRooms: Room[];
  availableSpecializations: Specialization[];
  availableSessions: SemesterDate[];
}

export const ScheduleEntryFormModal: React.FC<ScheduleEntryFormModalProps> = ({
  open,
  onClose,
  onSave,
  onDelete,
  initialData,
  availableGroups,
  availableRooms,
  availableSpecializations,
  availableSessions,
}) => {
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [roomId, setRoomId] = useState('');
  const [specializationIds, setSpecializationIds] = useState<string[]>([]);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [format, setFormat] = useState<'stacjonarny' | 'online'>('stacjonarny');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      const validGroupIds = (initialData.groupIds || []).filter((id) => availableGroups.some((g) => g.id === id));
      setGroupIds(validGroupIds);

      const roomExists = availableRooms.some((r) => r.id === initialData.roomId);
      setRoomId(roomExists ? initialData.roomId! : '');

      const validSpecIds = (initialData.specializationIds || []).filter((id) =>
        availableSpecializations.some((s) => s.id === id)
      );
      setSpecializationIds(validSpecIds);

      // Pole `date` nie jest już używane, więc nie musimy go ustawiać
      setSessionIds(initialData.sessionIds || []);

      setFormat(initialData.format || 'stacjonarny');
      setNotes(initialData.notes || '');
    }
  }, [initialData, availableGroups, availableRooms, availableSpecializations]);

  const handleSave = () => {
    const entryData: Partial<ScheduleEntry> = {
      groupIds,
      roomId,
      specializationIds,
      sessionIds,
      format,
      groupNames: groupIds.map((id) => availableGroups.find((g) => g.id === id)?.name || ''),
      roomName: availableRooms.find((r) => r.id === roomId)?.name || '',
      notes: notes,
    };
    onSave(entryData);
  };

  const handleSessionToggle = (sessionId: string) => {
    setSessionIds((prev) => (prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]));
  };

  const isSessionBased = availableSessions && availableSessions.length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{initialData.id ? 'Edytuj Zajęcia' : 'Dodaj Nowe Zajęcia'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 2 }}
        >
          <Typography variant="h6">{initialData.subjectName}</Typography>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Prowadzący: {initialData.lecturerName}
          </Typography>

          <Divider sx={{ my: 1 }} />

          <FormControl
            fullWidth
            required
          >
            <InputLabel>Grupy Studenckie</InputLabel>
            <Select<string[]>
              multiple
              value={groupIds}
              onChange={(e: SelectChangeEvent<string[]>) => setGroupIds(e.target.value as string[])}
              input={<OutlinedInput label="Grupy Studenckie" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => (
                    <Chip
                      key={id}
                      label={availableGroups.find((g) => g.id === id)?.name || `(Usunięta)`}
                    />
                  ))}
                </Box>
              )}
            >
              {availableGroups.map((group) => (
                <MenuItem
                  key={group.id}
                  value={group.id}
                >
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            fullWidth
            required
          >
            <InputLabel>Sala</InputLabel>
            <Select
              value={roomId}
              label="Sala"
              onChange={(e) => setRoomId(e.target.value)}
            >
              {availableRooms.map((room) => (
                <MenuItem
                  key={room.id}
                  value={room.id}
                >
                  {room.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Specjalizacje (opcjonalnie)</InputLabel>
            <Select<string[]>
              multiple
              value={specializationIds}
              onChange={(e) => setSpecializationIds(e.target.value as string[])}
              input={<OutlinedInput label="Specjalizacje (opcjonalnie)" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => (
                    <Chip
                      key={id}
                      label={availableSpecializations.find((s) => s.id === id)?.name || `(Usunięta)`}
                    />
                  ))}
                </Box>
              )}
            >
              {availableSpecializations.map((spec) => (
                <MenuItem
                  key={spec.id}
                  value={spec.id}
                >
                  {spec.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {isSessionBased && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography
                variant="h6"
                gutterBottom
              >
                Przypisz do zjazdów
              </Typography>
              <Paper
                variant="outlined"
                sx={{ p: 1, maxHeight: 200, overflow: 'auto' }}
              >
                <FormGroup>
                  {availableSessions.map((session) => (
                    <FormControlLabel
                      key={session.id}
                      control={
                        <Checkbox
                          checked={sessionIds.includes(session.id)}
                          onChange={() => handleSessionToggle(session.id)}
                        />
                      }
                      label={`${session.date.toDate().toLocaleDateString('pl-PL')} - ${session.format}`}
                    />
                  ))}
                </FormGroup>
              </Paper>
            </>
          )}

          <Divider sx={{ my: 1 }} />
          {/* ✅ NEW FIELD: Text field for notes/dates */}
          <TextField
            label="Additional Notes/Dates (for PDF/Excel)"
            fullWidth
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., 'Only on even weeks', 'Mid-term exam'"
          />
          <FormControl>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              Forma zajęć (dla Kal. Google)
            </Typography>
            <ToggleButtonGroup
              color="primary"
              value={format}
              exclusive
              onChange={(_, v) => v && setFormat(v)}
            >
              <ToggleButton value="stacjonarny">Stacjonarne</ToggleButton>
              <ToggleButton value="online">Online</ToggleButton>
            </ToggleButtonGroup>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', p: '16px 24px' }}>
        <Button
          onClick={onDelete}
          color="error"
          variant="outlined"
          disabled={!initialData.id}
        >
          Usuń
        </Button>
        <Box>
          <Button onClick={onClose}>Anuluj</Button>
          <Button
            onClick={handleSave}
            variant="contained"
          >
            Zapisz
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
