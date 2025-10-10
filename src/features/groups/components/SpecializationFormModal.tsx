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
  IconButton,
  Box,
  Divider,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import type { Specialization } from '../../timetable/types';
import toast from 'react-hot-toast';

interface SpecializationFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Omit<Specialization, 'id' | 'groupId'>>, id?: string) => Promise<void>;
  initialData: Partial<Specialization> | null;
}

export const SpecializationFormModal: React.FC<SpecializationFormModalProps> = ({
  open,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [emails, setEmails] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setAbbreviation(initialData?.abbreviation || '');
      setEmails(initialData?.emails && initialData.emails.length > 0 ? initialData.emails : ['']);
    }
  }, [initialData, open]);

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const addEmailField = () => {
    setEmails([...emails, '']);
  };

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      const newEmails = emails.filter((_, i) => i !== index);
      setEmails(newEmails);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Nazwa specjalizacji jest wymagana.');
      return;
    }
    setLoading(true);
    // Filtrujemy puste pola e-mail przed zapisem
    const validEmails = emails.map((e) => e.trim()).filter(Boolean);
    await onSave({ name, abbreviation, emails: validEmails }, initialData?.id);
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
      <DialogTitle>{initialData?.id ? 'Edytuj Specjalizację' : 'Dodaj Nową Specjalizację'}</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 2 }}
        >
          <TextField
            autoFocus
            label="Nazwa specjalizacji (np. Menedżer Sportu)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            label="Skrót (np. MS)"
            value={abbreviation}
            onChange={(e) => setAbbreviation(e.target.value)}
          />
          <Divider>Adresy e-mail</Divider>
          {emails.map((email, index) => (
            <Box
              key={index}
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <TextField
                label={`E-mail ${index + 1}`}
                value={email}
                onChange={(e) => handleEmailChange(index, e.target.value)}
                fullWidth
                size="small"
              />
              <IconButton
                onClick={() => removeEmailField(index)}
                disabled={emails.length <= 1}
              >
                <RemoveCircleOutlineIcon />
              </IconButton>
            </Box>
          ))}
          <Button
            onClick={addEmailField}
            startIcon={<AddCircleOutlineIcon />}
            size="small"
          >
            Dodaj kolejny e-mail
          </Button>
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
