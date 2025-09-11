import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Avatar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
} from '@mui/material';
import { useAuthContext } from '../context/AuthContext';
import {
  updateUserProfile,
  getUserProfileData,
  updateUserAvailability,
  getUserAvailability,
} from '../features/user/userService';
import toast from 'react-hot-toast';
// ✅ Importujemy nasze centralne typy
import type { UserProfile, DayOfWeek } from '../features/user/types';

// Definicje typów dla tego komponentu
interface TimeSlot {
  label: string;
  startTime: string;
  endTime: string;
}
// ✅ Używamy centralnego typu DayOfWeek
export interface AvailabilitySlot {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

const timeSlots: TimeSlot[] = [
  { label: '08:00-09:30', startTime: '08:00', endTime: '09:30' },
  { label: '09:45-11:15', startTime: '09:45', endTime: '11:15' },
  { label: '11:30-13:00', startTime: '11:30', endTime: '13:00' },
  { label: '13:30-15:00', startTime: '13:30', endTime: '15:00' },
  { label: '15:15-16:45', startTime: '15:15', endTime: '16:45' },
  { label: '17:00-18:30', startTime: '17:00', endTime: '18:30' },
];
// ✅ Definiujemy stałą z typem DayOfWeek[], aby zapewnić spójność
const daysOfWeek: DayOfWeek[] = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

export const AvailabilityPanel = ({
  userProfile,
  initialAvailability,
}: {
  userProfile: UserProfile;
  initialAvailability: AvailabilitySlot[];
}) => {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());

  useEffect(() => {
    const initialSet = new Set<string>();
    (initialAvailability || []).forEach((slot) => {
      initialSet.add(`${slot.day}__${slot.startTime}`);
    });
    setSelectedSlots(initialSet);
  }, [initialAvailability]);

  const handleSlotToggle = (day: DayOfWeek, timeSlot: TimeSlot) => {
    const newSelectedSlots = new Set(selectedSlots);
    const slotId = `${day}__${timeSlot.startTime}`;
    if (newSelectedSlots.has(slotId)) {
      newSelectedSlots.delete(slotId);
    } else {
      newSelectedSlots.add(slotId);
    }
    setSelectedSlots(newSelectedSlots);
  };

  const handleSaveAvailability = async () => {
    const newAvailability: AvailabilitySlot[] = Array.from(selectedSlots).map((slotId) => {
      const [day, startTime] = slotId.split('__');
      const timeSlot = timeSlots.find((ts) => ts.startTime === startTime);

      return { day: day as DayOfWeek, startTime, endTime: timeSlot?.endTime || '' };
    });

    const promise = updateUserAvailability(userProfile.id, newAvailability);
    await toast.promise(promise, {
      loading: 'Zapisywanie dostępności...',
      success: 'Twoja dostępność została zaktualizowana!',
      error: 'Wystąpił błąd podczas zapisu.',
    });
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography
        variant="h6"
        gutterBottom
      >
        Zdefiniuj swoją dostępność
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        Zaznacz "okienka", w których jesteś dostępny do prowadzenia zajęć. Pomoże to dziekanatowi w układaniu planu.
      </Typography>
      <TableContainer
        component={Paper}
        variant="outlined"
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Godziny</TableCell>
              {daysOfWeek.map((day) => (
                <TableCell
                  key={day}
                  align="center"
                >
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {timeSlots.map((timeSlot) => (
              <TableRow key={timeSlot.startTime}>
                <TableCell>{timeSlot.label}</TableCell>
                {daysOfWeek.map((day) => (
                  <TableCell
                    key={day}
                    align="center"
                  >
                    <Checkbox
                      checked={selectedSlots.has(`${day}__${timeSlot.startTime}`)}
                      onChange={() => handleSlotToggle(day, timeSlot)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button
        variant="contained"
        sx={{ mt: 2 }}
        onClick={handleSaveAvailability}
      >
        Zapisz Dostępność
      </Button>
    </Box>
  );
};

export const SettingsPage = () => {
  const { user, role } = useAuthContext();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [availabilityData, setAvailabilityData] = useState<AvailabilitySlot[]>([]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');

      const fetchData = async () => {
        try {
          setLoading(true);
          // Używamy Promise.all, aby pobrać oba zestawy danych równolegle
          const [profile, availability] = await Promise.all([
            getUserProfileData(user.uid),
            getUserAvailability(user.uid),
          ]);
          setProfileData(profile as UserProfile);
          setAvailabilityData(availability as AvailabilitySlot[]);
        } catch (error) {
          toast.error('Błąd podczas pobierania danych użytkownika.');
          console.error(error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName) return;

    setLoading(true);
    try {
      await updateUserProfile(user, displayName);
      toast.success('Profil został pomyślnie zaktualizowany!');
    } catch (error) {
      toast.error('Wystąpił błąd podczas aktualizacji profilu.');
    } finally {
      setLoading(false);
    }
  };

  const canSetAvailability = role === 'prowadzacy' || role === 'admin';

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '900px' }}>
        <Typography
          variant="h4"
          gutterBottom
        >
          Profil i Ustawienia
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar
            alt={user?.displayName || 'U'}
            src={user?.photoURL || ''}
            sx={{ width: 80, height: 80, mr: 2 }}
          />
          <Box>
            <Typography variant="h6">{user?.displayName}</Typography>
            <Typography
              variant="body1"
              color="text.secondary"
            >
              {user?.email}
            </Typography>
          </Box>
        </Box>
        <Box
          component="form"
          onSubmit={handleSubmit}
        >
          <Typography
            variant="h6"
            gutterBottom
          >
            Zmień dane
          </Typography>
          <TextField
            label="Nazwa wyświetlana"
            variant="outlined"
            fullWidth
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Zapisz zmiany'}
          </Button>
        </Box>
        {canSetAvailability && profileData && (
          <>
            <Divider sx={{ my: 4 }} />
            <AvailabilityPanel
              userProfile={profileData}
              initialAvailability={availabilityData}
            />
          </>
        )}
      </Paper>
    </Box>
  );
};
