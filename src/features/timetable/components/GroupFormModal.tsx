// src/features/groups/components/GroupFormModal.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  CircularProgress,
} from '@mui/material';
import type { Group } from '../../timetable/types';
import toast from 'react-hot-toast';

interface GroupFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Omit<Group, 'id'>>, id?: string) => Promise<void>;
  initialData: Partial<Group> | null;
}

export const GroupFormModal: React.FC<GroupFormModalProps> = ({ open, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [groupEmail, setGroupEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setGroupEmail(initialData?.groupEmail || '');
    }
  }, [initialData, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Nazwa grupy jest wymagana.');
      return;
    }
    setLoading(true);
    await onSave({ name, groupEmail }, initialData?.id);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{initialData?.id ? 'Edytuj Grupę' : 'Dodaj Nową Grupę'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 2 }}
        >
          <TextField
            autoFocus
            label="Nazwa grupy (np. Zarządzanie, I st., III sem.)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            label="Adres e-mail Grupy Google (opcjonalnie)"
            value={groupEmail}
            onChange={(e) => setGroupEmail(e.target.value)}
            placeholder="np. grupa-xyz@domena.com"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Zapisz'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
