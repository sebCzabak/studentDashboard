import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  TextField,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  addGroup,
  addSpecialization,
  deleteSpecialization,
  updateSpecialization,
} from '../../features/groups/groupsService';
import toast from 'react-hot-toast';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { Group, Specialization } from '../../features/timetable/types';

export const ManageGroupsPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [newSpecName, setNewSpecName] = useState<Record<string, string>>({});

  useEffect(() => {
    // Nasłuchujemy na zmiany w grupach w czasie rzeczywistym
    const groupsQuery = query(collection(db, 'groups'), orderBy('name'));
    const unsubscribeGroups = onSnapshot(
      groupsQuery,
      (snapshot) => {
        const groupsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Group));
        setGroups(groupsData);
        if (loading) setLoading(false); // Wyłącz ładowanie po pierwszym pobraniu grup
      },
      (_error) => {
        toast.error('Błąd pobierania grup.');
        setLoading(false);
      }
    );

    // Nasłuchujemy na zmiany w specjalizacjach w czasie rzeczywistym
    const specsQuery = collection(db, 'specializations');
    const unsubscribeSpecs = onSnapshot(specsQuery, (snapshot) => {
      const specsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Specialization));
      setSpecializations(specsData);
    });

    return () => {
      unsubscribeGroups();
      unsubscribeSpecs();
    };
  }, []); // Pusta tablica zależności, aby uruchomić tylko raz

  // Grupujemy specjalizacje po ID grupy dla łatwiejszego wyświetlania
  const specsByGroup = useMemo(() => {
    return specializations.reduce((acc, spec) => {
      const groupId = spec.groupId;
      if (!acc[groupId]) {
        acc[groupId] = [];
      }
      acc[groupId].push(spec);
      return acc;
    }, {} as Record<string, Specialization[]>);
  }, [specializations]);

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return toast.error('Nazwa grupy jest wymagana.');
    await toast.promise(addGroup({ name: newGroupName }), {
      loading: 'Dodawanie grupy...',
      success: 'Grupa dodana!',
      error: (err) => err.message || 'Błąd zapisu.',
    });
    setNewGroupName('');
  };

  const handleAddSpecialization = async (groupId: string) => {
    const name = newSpecName[groupId];
    if (!name || !name.trim()) return toast.error('Nazwa specjalizacji jest wymagana.');
    await toast.promise(addSpecialization({ name, groupId }), {
      loading: 'Dodawanie specjalizacji...',
      success: 'Specjalizacja dodana!',
      error: (err) => err.message || 'Błąd zapisu.',
    });
    setNewSpecName((prev) => ({ ...prev, [groupId]: '' }));
  };
  const handleEditSpecialization = async (spec: Specialization) => {
    const newName = window.prompt('Wprowadź nową nazwę dla specjalizacji:', spec.name);
    if (newName && newName.trim() !== '') {
      await toast.promise(updateSpecialization(spec.id, newName.trim()), {
        loading: 'Aktualizowanie nazwy...',
        success: 'Nazwa zaktualizowana!',
        error: 'Błąd podczas aktualizacji.',
      });
    }
  };

  const handleDeleteSpecialization = async (spec: Specialization) => {
    if (window.confirm(`Czy na pewno chcesz usunąć specjalizację "${spec.name}"?`)) {
      await toast.promise(deleteSpecialization(spec.id), {
        loading: 'Usuwanie...',
        success: 'Specjalizacja usunięta.',
        error: 'Błąd podczas usuwania.',
      });
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Button
        component={RouterLink}
        to="/admin"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Wróć do pulpitu
      </Button>
      <Typography
        variant="h4"
        gutterBottom
      >
        Zarządzaj Grupami i Specjalizacjami
      </Typography>

      <Paper sx={{ p: 2, display: 'flex', gap: 2, mb: 4, mt: 2 }}>
        <TextField
          label="Nazwa nowej grupy (np. Zarządzanie, I st., III sem.)"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          fullWidth
          size="small"
        />
        <Button
          variant="contained"
          onClick={handleAddGroup}
          startIcon={<AddIcon />}
        >
          Dodaj
        </Button>
      </Paper>

      {groups.map((group) => (
        <Accordion
          key={group.id}
          TransitionProps={{ unmountOnExit: true }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 500 }}>{group.name}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography
              variant="h6"
              gutterBottom
            >
              Specjalizacje:
            </Typography>
            <List dense>
              {(specsByGroup[group.id] || []).map((spec) => (
                <ListItem
                  key={spec.id}
                  secondaryAction={
                    <>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => handleEditSpecialization(spec)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteSpecialization(spec)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText primary={spec.name} />
                </ListItem>
              ))}
              {(!specsByGroup[group.id] || specsByGroup[group.id].length === 0) && (
                <ListItem>
                  <ListItemText secondary="Brak zdefiniowanych specjalizacji dla tej grupy." />
                </ListItem>
              )}
            </List>
            <Box sx={{ display: 'flex', gap: 2, mt: 2, borderTop: '1px solid #eee', pt: 2 }}>
              <TextField
                label="Nazwa nowej specjalizacji"
                value={newSpecName[group.id] || ''}
                onChange={(e) => setNewSpecName((prev) => ({ ...prev, [group.id]: e.target.value }))}
                fullWidth
                size="small"
              />
              <Button
                variant="outlined"
                onClick={() => handleAddSpecialization(group.id)}
                size="small"
              >
                Dodaj specjalizację
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};
