import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
  TextField,
  Tabs,
  Tab,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import toast from 'react-hot-toast';
import { getAllUsers } from '../../features/user/userService';
import type { UserProfile } from '../../features/user/types';
import { AvailabilityEditorModal } from '../../components/AvailabilityEditorModal';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';

export const ManageUsersPage = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const roles = [
    { value: 'all', label: 'Wszystkie' },
    { value: 'admin', label: 'Admin' },
    { value: 'prowadzacy', label: 'Prowadzący' },
    { value: 'pracownik_dziekanatu', label: 'Pracownik Dziekanatu' },
    { value: 'pracownik_kwestury', label: 'Pracownik Kwestury' },
    { value: 'student', label: 'Student' },
  ];

  useEffect(() => {
    getAllUsers()
      .then((data) => {
        // ✅ Sortujemy alfabetycznie po `displayName`
        const sortedData = data.sort((a, b) =>
          a.displayName.localeCompare(b.displayName, 'pl', { sensitivity: 'base' })
        );
        setUsers(sortedData);
      })
      .catch(() => toast.error('Błąd pobierania listy użytkowników.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    let results = users;

    // Filtrowanie po roli
    if (selectedRole !== 'all') {
      results = results.filter((user) => user.role === selectedRole);
    }

    // Filtrowanie po nazwie lub emailu
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      results = results.filter(
        (user) =>
          user.displayName.toLowerCase().includes(lowercasedFilter) || user.email.toLowerCase().includes(lowercasedFilter)
      );
    }

    return results;
  }, [users, searchTerm, selectedRole]);

  const handleOpenAvailabilityModal = (user: UserProfile) => {
    setSelectedUser(user);
    setIsAvailabilityModalOpen(true);
  };
  const handleAddNewUser = () => {
    // TODO: Otworzyć modal do tworzenia użytkownika
    toast('Funkcjonalność w budowie (wymaga Cloud Function)');
  };

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          component={RouterLink}
          to="/admin"
          startIcon={<ArrowBackIcon />}
        >
          Wróć do pulipitu
        </Button>
        <Typography variant="h4">Zarządzaj Użytkownikami</Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={handleAddNewUser}
        >
          Dodaj Pracownika
        </Button>
      </Box>

      {/* ✅ NOWY ELEMENT: Pole wyszukiwania */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Szukaj po nazwisku lub emailu"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
          }}
        />

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={selectedRole}
            onChange={(_, newValue) => setSelectedRole(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {roles.map((role) => (
              <Tab
                key={role.value}
                label={role.label}
                value={role.value}
              />
            ))}
          </Tabs>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nazwa</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rola</TableCell>
              <TableCell align="right">Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* ✅ Mapujemy po przefiltrowanej liście */}
            {filteredUsers.map((user) => (
              <TableRow
                key={user.id}
                hover
              >
                <TableCell>{user.displayName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  {user.role === 'prowadzacy' && (
                    <Tooltip title="Zarządzaj dostępnością">
                      <IconButton
                        color="secondary"
                        onClick={() => handleOpenAvailabilityModal(user)}
                      >
                        <EventAvailableIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Edytuj (w budowie)">
                    <IconButton
                      color="primary"
                      onClick={() => toast('Funkcjonalność w budowie')}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedUser && (
        <AvailabilityEditorModal
          open={isAvailabilityModalOpen}
          onClose={() => setIsAvailabilityModalOpen(false)}
          user={selectedUser}
        />
      )}
    </Box>
  );
};
