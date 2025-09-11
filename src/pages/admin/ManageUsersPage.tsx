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
    if (!searchTerm) {
      return users;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.displayName.toLowerCase().includes(lowercasedFilter) || user.email.toLowerCase().includes(lowercasedFilter)
    );
  }, [users, searchTerm]);

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
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
          }}
        />
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
