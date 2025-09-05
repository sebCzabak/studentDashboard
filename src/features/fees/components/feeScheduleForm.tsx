// src/features/fees/components/FeeScheduleForm.tsx
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Typography,
  Stack,
  Divider,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { Timestamp } from 'firebase/firestore';

// Definiujemy, jak wygląda pojedyncza rata w naszym formularzu
interface InstallmentState {
  title: string;
  amount: string; // Używamy stringów dla pól formularza
  dueDate: string; // Format YYYY-MM-DD dla inputa typu date
}

// Definiujemy, jakie propsy przyjmuje nasz modal
interface FeeScheduleFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (scheduleData: any) => void;
}

export const FeeScheduleForm = ({ open, onClose, onSave }: FeeScheduleFormProps) => {
  const [name, setName] = useState('');
  // Stan dla rat - tablica obiektów. Zaczynamy z jedną pustą ratą.
  const [installments, setInstallments] = useState<InstallmentState[]>([{ title: '', amount: '', dueDate: '' }]);

  const handleInstallmentChange = (index: number, field: keyof InstallmentState, value: string) => {
    const newInstallments = [...installments];
    newInstallments[index][field] = value;
    setInstallments(newInstallments);
  };

  const addInstallment = () => {
    setInstallments([...installments, { title: '', amount: '', dueDate: '' }]);
  };

  const removeInstallment = (index: number) => {
    const newInstallments = installments.filter((_, i) => i !== index);
    setInstallments(newInstallments);
  };

  const handleSave = () => {
    // Prosta walidacja
    if (!name || installments.some((i) => !i.title || !i.amount || !i.dueDate)) {
      alert('Proszę wypełnić wszystkie pola.');
      return;
    }

    // Przetwarzamy dane do formatu, który chcemy zapisać w Firestore
    const totalAmount = installments.reduce((sum, i) => sum + Number(i.amount), 0);
    const scheduleData = {
      name,
      totalAmount,
      installments: installments.map((i) => ({
        ...i,
        amount: Number(i.amount),
        dueDate: Timestamp.fromDate(new Date(i.dueDate)), // Konwertujemy datę na Timestamp
      })),
    };

    onSave(scheduleData);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Nowy Harmonogram Opłat</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ pt: 1 }}
        >
          <TextField
            label="Nazwa Harmonogramu (np. Czesne Inżynierskie 2026/2027)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <Divider sx={{ my: 2 }}>
            <Typography variant="overline">Raty</Typography>
          </Divider>

          {installments.map((installment, index) => (
            <Stack
              direction="row"
              spacing={1}
              key={index}
              alignItems="center"
            >
              <TextField
                label="Tytuł raty"
                value={installment.title}
                onChange={(e) => handleInstallmentChange(index, 'title', e.target.value)}
              />
              <TextField
                label="Kwota"
                type="number"
                value={installment.amount}
                onChange={(e) => handleInstallmentChange(index, 'amount', e.target.value)}
              />
              <TextField
                type="date"
                value={installment.dueDate}
                onChange={(e) => handleInstallmentChange(index, 'dueDate', e.target.value)}
                sx={{ minWidth: 150 }}
              />
              <IconButton
                onClick={() => removeInstallment(index)}
                color="error"
                disabled={installments.length <= 1}
              >
                <RemoveCircleOutlineIcon />
              </IconButton>
            </Stack>
          ))}

          <Button
            startIcon={<AddCircleOutlineIcon />}
            onClick={addInstallment}
          >
            Dodaj kolejną ratę
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button
          onClick={handleSave}
          variant="contained"
        >
          Zapisz Harmonogram
        </Button>
      </DialogActions>
    </Dialog>
  );
};
