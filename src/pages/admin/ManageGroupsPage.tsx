import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  getGroups,
  addSpecialization,
  updateSpecialization,
  deleteSpecialization,
  updateGroup,
  deleteGroup,
  addGroup,
  getAllSpecializations,
} from '../../features/groups/groupsService';
import toast from 'react-hot-toast';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { GroupFormModal } from '../../features/timetable/components/GroupFormModal';
import { SpecializationFormModal } from '../../features/groups/components/SpecializationFormModal';
import type { Group, Specialization } from '../../features/timetable/types';

export const ManageGroupsPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Partial<Specialization> | null>(null);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  // ✅ POPRAWKA: Tworzymy jedną, centralną funkcję do pobierania danych
  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsData, specsData] = await Promise.all([getGroups(), getAllSpecializations()]);
      setGroups(groupsData as Group[]);
      setSpecializations(specsData as Specialization[]);
    } catch (error) {
      toast.error('Błąd podczas pobierania danych.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const specsByGroup = useMemo(() => {
    return specializations.reduce((acc, spec) => {
      const groupId = spec.groupId;
      if (!acc[groupId]) acc[groupId] = [];
      acc[groupId].push(spec);
      return acc;
    }, {} as Record<string, Specialization[]>);
  }, [specializations]);

  const handleOpenGroupModal = (group: Group | null = null) => {
    setEditingGroup(group);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (data: Partial<Omit<Group, 'id'>>, id?: string) => {
    const promise = id ? updateGroup(id, data) : addGroup(data);
    await toast.promise(promise, {
      loading: 'Zapisywanie grupy...',
      success: 'Grupa zapisana!',
      error: (err) => err.message || 'Błąd zapisu.',
    });
    fetchData(); // ✅ Odświeżamy dane po operacji
  };

  const handleDeleteGroup = async (group: Group) => {
    if (window.confirm(`Czy na pewno chcesz usunąć grupę "${group.name}"?`)) {
      await toast.promise(deleteGroup(group.id), {
        loading: 'Usuwanie grupy...',
        success: 'Grupa usunięta.',
        error: 'Błąd podczas usuwania.',
      });
      fetchData(); // ✅ Odświeżamy dane po operacji
    }
  };

  const handleOpenSpecModal = (groupId: string, spec: Specialization | null = null) => {
    setCurrentGroupId(groupId);
    setEditingSpec(spec);
    setIsSpecModalOpen(true);
  };

  const handleSaveSpecialization = async (
    data: Partial<Omit<Specialization, 'id' | 'groupId'>>,
    id?: string
  ): Promise<void> => {
    if (!id && !currentGroupId) {
      toast.error('Błąd: Brak wybranej grupy.');
      return;
    }

    const dataToSave = id ? data : { ...data, groupId: currentGroupId! };
    const promise = id
      ? updateSpecialization(id, dataToSave)
      : addSpecialization(dataToSave as Omit<Specialization, 'id'>);

    await toast.promise(promise, {
      loading: 'Zapisywanie specjalizacji...',
      success: `Specjalizacja ${id ? 'zaktualizowana' : 'dodana'}!`,
      error: 'Błąd zapisu.',
    });
    fetchData();
  };

  const handleDeleteSpecialization = async (spec: Specialization) => {
    if (window.confirm(`Czy na pewno chcesz usunąć specjalizację "${spec.name}"?`)) {
      await toast.promise(deleteSpecialization(spec.id), {
        loading: 'Usuwanie...',
        success: 'Specjalizacja usunięta.',
        error: 'Błąd podczas usuwania.',
      });
      fetchData();
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography
          variant="h4"
          gutterBottom
        >
          Zarządzaj Grupami i Specjalizacjami
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenGroupModal()}
        >
          Dodaj Nową Grupę
        </Button>
      </Box>

      {groups.map((group) => (
        <Accordion
          key={group.id}
          TransitionProps={{ unmountOnExit: true }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ '& .MuiAccordionSummary-content': { alignItems: 'center', justifyContent: 'space-between' } }}
          >
            <Box>
              <Typography sx={{ fontWeight: 500 }}>{group.name}</Typography>
              {group.groupEmail && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {group.groupEmail}
                </Typography>
              )}
            </Box>
            <Box>
              {/* ✅ POPRAWKA: Używamy `onMouseDown` do zatrzymania propagacji zdarzenia */}
              <IconButton
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenGroupModal(group);
                }}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGroup(group);
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                variant="h6"
                gutterBottom
              >
                Specjalizacje:
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => handleOpenSpecModal(group.id)}
              >
                Dodaj specjalizację
              </Button>
            </Box>
            <List dense>
              {(specsByGroup[group.id] || []).map((spec) => (
                <ListItem
                  key={spec.id}
                  secondaryAction={
                    <>
                      <IconButton
                        edge="end"
                        onClick={() => handleOpenSpecModal(group.id, spec)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteSpecialization(spec)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={spec.name}
                    secondary={spec.emails ? `E-maile: ${spec.emails.join(', ')}` : 'Brak e-maili'}
                  />
                </ListItem>
              ))}
              {(!specsByGroup[group.id] || specsByGroup[group.id].length === 0) && (
                <ListItem>
                  <ListItemText secondary="Brak zdefiniowanych specjalizacji dla tej grupy." />
                </ListItem>
              )}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}

      {isGroupModalOpen && (
        <GroupFormModal
          open={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          onSave={handleSaveGroup}
          initialData={editingGroup}
        />
      )}

      {isSpecModalOpen && (
        <SpecializationFormModal
          open={isSpecModalOpen}
          onClose={() => setIsSpecModalOpen(false)}
          onSave={handleSaveSpecialization}
          initialData={editingSpec}
        />
      )}
    </Box>
  );
};
