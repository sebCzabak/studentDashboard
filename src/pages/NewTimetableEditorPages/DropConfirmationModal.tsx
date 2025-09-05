import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Box,
  Typography,
  OutlinedInput,
  Chip,
  type SelectChangeEvent,
} from '@mui/material';
import type { Group, Room, CurriculumSubject, ScheduleEntry } from '../../features/timetable/types';

interface DropConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (details: { groupIds: string[]; roomId: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialData: { subject: CurriculumSubject; day: string; time: string } | ScheduleEntry;
  availableGroups: Group[];
  availableRooms: Room[];
}

export const DropConfirmationModal: React.FC<DropConfirmationModalProps> = ({
  open,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  availableGroups,
  availableRooms,
}) => {
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [roomId, setRoomId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = useMemo(() => 'id' in initialData, [initialData]);

  const derivedData = useMemo(() => {
    if (isEditMode) {
      const entry = initialData as ScheduleEntry;
      return {
        subjectName: entry.subjectName,
        type: entry.type,
        lecturerName: entry.lecturerName,
        day: entry.day,
        time: entry.startTime,
      };
    } else {
      const newData = initialData as { subject: CurriculumSubject; day: string; time: string };
      return {
        subjectName: newData.subject.subjectName,
        type: newData.subject.type,
        lecturerName: newData.subject.lecturerName,
        day: newData.day,
        time: newData.time,
      };
    }
  }, [initialData, isEditMode]);

  useEffect(() => {
    if (open) {
      if (isEditMode) {
        setSelectedGroupIds((initialData as ScheduleEntry).groupIds || []);
        setRoomId((initialData as ScheduleEntry).roomId || '');
      } else {
        setSelectedGroupIds([]);
        setRoomId('');
      }
      setIsSubmitting(false);
    }
  }, [open, isEditMode, initialData]);

  const handleSubmit = async () => {
    if (selectedGroupIds.length === 0 || !roomId) return;
    setIsSubmitting(true);
    await onSubmit({ groupIds: selectedGroupIds, roomId });
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (onDelete) {
      setIsSubmitting(true);
      await onDelete();
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>{isEditMode ? 'Edytuj zajęcia' : 'Potwierdź dodanie zajęć'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography
            variant="subtitle1"
            gutterBottom
          >
            {derivedData.subjectName}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            <strong>Prowadzący:</strong> {derivedData.lecturerName}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            <strong>Typ:</strong> {derivedData.type}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            <strong>Termin:</strong> {derivedData.day}, {derivedData.time}
          </Typography>

          <FormControl
            fullWidth
            required
            margin="normal"
          >
            <InputLabel id="group-select-label">Grupy</InputLabel>
            {/* ✅ POPRAWKA: Dodajemy <string[]> do typu komponentu */}
            <Select<string[]>
              labelId="group-select-label"
              multiple
              value={selectedGroupIds}
              onChange={(e: SelectChangeEvent<string[]>) => setSelectedGroupIds(e.target.value as string[])}
              input={<OutlinedInput label="Grupy" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => (
                    <Chip
                      key={id}
                      label={availableGroups.find((g) => g.id === id)?.name || id}
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
            margin="normal"
          >
            <InputLabel id="room-select-label">Sala</InputLabel>
            <Select
              labelId="room-select-label"
              value={roomId}
              label="Sala"
              onChange={(e: SelectChangeEvent) => setRoomId(e.target.value)}
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
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', p: '16px 24px' }}>
        <Box>
          {isEditMode && onDelete && (
            <Button
              onClick={handleDelete}
              color="error"
              variant="outlined"
              disabled={isSubmitting}
            >
              Usuń
            </Button>
          )}
        </Box>
        <Box>
          <Button
            onClick={onClose}
            disabled={isSubmitting}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={selectedGroupIds.length === 0 || !roomId || isSubmitting}
            sx={{ minWidth: 120 }}
          >
            {isSubmitting ? (
              <CircularProgress
                size={24}
                color="inherit"
              />
            ) : isEditMode ? (
              'Zapisz zmiany'
            ) : (
              'Zatwierdź'
            )}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
