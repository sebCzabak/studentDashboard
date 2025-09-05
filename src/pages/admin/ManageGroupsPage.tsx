import { useState, useEffect } from 'react';
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import {
  getGroups,
  getSpecializationsForGroup,
  addGroup,
  addSpecialization,
} from '../../features/groups/groupsService';
import toast from 'react-hot-toast';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export const ManageGroupsPage = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [newSpecName, setNewSpecName] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      const groupsData = await getGroups();
      setGroups(groupsData);
      // Dla każdej grupy pobieramy jej specjalizacje
      const specsPromises = groupsData.map((g) => getSpecializationsForGroup(g.id));
      const specsResults = await Promise.all(specsPromises);
      const specsMap = groupsData.reduce((acc, group, index) => {
        acc[group.id] = specsResults[index];
        return acc;
      }, {} as Record<string, any[]>);
      setSpecializations(specsMap);
    } catch (error) {
      toast.error('Błąd wczytywania danych.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return toast.error('Nazwa grupy jest wymagana.');
    await toast.promise(addGroup({ name: newGroupName }), {
      loading: 'Dodawanie grupy...',
      success: 'Grupa dodana!',
      error: 'Błąd zapisu.',
    });
    setNewGroupName('');
    fetchData();
  };

  const handleAddSpecialization = async (groupId: string) => {
    const name = newSpecName[groupId];
    if (!name || !name.trim()) return toast.error('Nazwa specjalizacji jest wymagana.');
    await toast.promise(addSpecialization({ name, groupId }), {
      loading: 'Dodawanie specjalizacji...',
      success: 'Specjalizacja dodana!',
      error: 'Błąd zapisu.',
    });
    setNewSpecName((prev) => ({ ...prev, [groupId]: '' }));
    fetchData();
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '900px' }}>
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

        {/* Formularz dodawania nowej grupy */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, mt: 2 }}>
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
        </Box>

        {/* Lista grup i ich specjalizacji */}
        {groups.map((group) => (
          <Accordion key={group.id}>
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
                {(specializations[group.id] || []).map((spec) => (
                  <ListItem key={spec.id}>
                    <ListItemText primary={spec.name} />
                  </ListItem>
                ))}
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
      </Paper>
    </Box>
  );
};
