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
  type SelectChangeEvent,
  CircularProgress,
} from '@mui/material';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import 'react-multi-date-picker/styles/layouts/mobile.css';
import { Timestamp } from 'firebase/firestore';
import type { ScheduleEntry, Group, Room, CurriculumSubject, Specialization } from '../../../features/timetable/types';

interface ScheduleEntryFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ScheduleEntry>) => Promise<void>;
  onDelete?: () => Promise<void>; // Opcjonalne dla trybu tworzenia
  initialData: Partial<ScheduleEntry> & { subject?: CurriculumSubject }; // Typ uniwersalny
  availableGroups: Group[];
  availableRooms: Room[];
  availableSpecializations: Specialization[];
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
}) => {
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [roomId, setRoomId] = useState('');
  const [dates, setDates] = useState<DateObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSpecIds, setSelectedSpecIds] = useState<string[]>([]);

  const isEditMode = !!initialData.id;

  useEffect(() => {
    if (initialData) {
      setGroupIds(initialData.groupIds || []);
      setRoomId(initialData.roomId || '');
      setSelectedSpecIds(initialData.specializationIds || []);
      if (initialData.specificDates && Array.isArray(initialData.specificDates)) {
        setDates(initialData.specificDates.map((ts) => new DateObject(ts.toDate())));
      } else {
        setDates([]);
      }
    }
  }, [initialData]);

  const handleSave = async () => {
    setLoading(true);
    const dataToSave: Partial<ScheduleEntry> = {
      groupIds,
      roomId,
      groupNames: groupIds.map((id) => availableGroups.find((g) => g.id === id)?.name || ''),
      roomName: availableRooms.find((r) => r.id === roomId)?.name || '',
      specificDates: dates.map((d) => Timestamp.fromDate(d.toDate())),
      specializationIds: selectedSpecIds,
    };

    // Jeśli tworzymy nowy wpis, dodajemy dane z przeciągniętego "klocka"
    if (!isEditMode && initialData.subject) {
      Object.assign(dataToSave, {
        day: initialData.day,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        subjectId: initialData.subject.subjectId,
        subjectName: initialData.subject.subjectName,
        lecturerId: initialData.subject.lecturerId,
        lecturerName: initialData.subject.lecturerName,
        type: initialData.subject.type,
        curriculumSubjectId: initialData.subject.id,
        timetableId: initialData.timetableId,
      });
    }

    await onSave(dataToSave);
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{isEditMode ? 'Edytuj Zajęcia' : 'Dodaj Nowe Zajęcia'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 2 }}
        >
          <Typography variant="h6">{initialData.subjectName || initialData.subject?.subjectName}</Typography>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Prowadzący: {initialData.lecturerName || initialData.subject?.lecturerName}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Termin: {initialData.day}, {initialData.startTime}
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
          <FormControl fullWidth>
            <InputLabel>Specjalizacje (opcjonalnie)</InputLabel>
            <Select<string[]>
              multiple
              value={selectedSpecIds}
              onChange={(e) => setSelectedSpecIds(e.target.value as string[])}
              input={<OutlinedInput label="Specjalizacje (opcjonalnie)" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => (
                    <Chip
                      key={id}
                      label={availableSpecializations.find((s) => s.id === id)?.name || id}
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
          <Divider sx={{ my: 2 }} />
          <Typography
            variant="h6"
            gutterBottom
          >
            Konkretne terminy zajęć (opcjonalnie)
          </Typography>
          <DatePicker
            multiple
            value={dates}
            onChange={setDates}
            format="DD/MM/YYYY"
            containerClassName="rmdp-mobile"
            style={{ width: '100%' }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', p: '16px 24px' }}>
        <Button
          onClick={onDelete}
          color="error"
          variant="outlined"
          disabled={!isEditMode || loading}
        >
          Usuń Zajęcia
        </Button>
        <Box>
          <Button
            onClick={onClose}
            disabled={loading}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : isEditMode ? 'Zapisz zmiany' : 'Dodaj Zajęcia'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
