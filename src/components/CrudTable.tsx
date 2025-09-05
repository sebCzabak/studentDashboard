import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';

// Generyczny formularz
const CrudForm = ({ open, onClose, onSave, initialData, singularName }: any) => {
  const [name, setName] = useState('');
  useEffect(() => {
    setName(initialData?.name || '');
  }, [initialData, open]);
  const handleSave = () => {
    if (!name.trim()) return toast.error(`Nazwa (${singularName}) jest wymagana.`);
    onSave({ name: name.trim() });
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogTitle>{initialData ? `Edytuj ${singularName}` : `Dodaj ${singularName}`}</DialogTitle>
      <DialogContent>
        <TextField
          label="Nazwa"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anuluj</Button>
        <Button
          onClick={handleSave}
          variant="contained"
        >
          Zapisz
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const CrudTable = ({ service, singularName }: { service: any; singularName: string }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const fetchData = () => {
    service
      .getAll()
      .then(setItems)
      .finally(() => setLoading(false));
  };
  useEffect(fetchData, [service]);

  const handleSave = (data: { name: string }) => {
    const action = editingItem ? service.update(editingItem.id, data) : service.add(data);
    toast.promise(action, {
      loading: 'Zapisywanie...',
      success: () => {
        setIsModalOpen(false);
        fetchData();
        return `${singularName} zapisano!`;
      },
      error: 'Błąd zapisu.',
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć?`)) {
      toast.promise(service.delete(id), {
        loading: 'Usuwanie...',
        success: () => {
          fetchData();
          return `${singularName} usunięto.`;
        },
        error: 'Błąd podczas usuwania.',
      });
    }
  };

  return (
    <Box>
      <Button
        variant="contained"
        onClick={() => {
          setEditingItem(null);
          setIsModalOpen(true);
        }}
        sx={{ mb: 2 }}
      >
        Dodaj Nowy {singularName}
      </Button>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nazwa</TableCell>
              <TableCell align="right">Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={() => {
                      setEditingItem(item);
                      setIsModalOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(item.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <CrudForm
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingItem}
        singularName={singularName}
      />
    </Box>
  );
};
