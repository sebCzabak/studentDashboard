import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  TextField,
  Box,
} from '@mui/material';
import { listCalendars, createCalendar } from '../../calendar/services/googleCalendarService';
import { useAuthContext } from '../../../context/AuthContext';
import type { Group } from '../types';
import toast from 'react-hot-toast';

interface GoogleCalendar {
  id: string;
  summary: string;
  accessRole: 'owner' | 'writer' | 'reader';
}

interface GroupSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (group: Group, calendarId: string) => void;
  groups: Group[];
}

export const GroupSelectionModal: React.FC<GroupSelectionModalProps> = ({ open, onClose, onConfirm, groups }) => {
  const { accessToken } = useAuthContext();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [newCalendarName, setNewCalendarName] = useState('');

  useEffect(() => {
    console.log('[Modal] Otwarto modal. Dostępny accessToken:', !!accessToken);
    if (open && accessToken) {
      setLoading(true);
      listCalendars(accessToken)
        .then((calendarList) => {
          const writableCalendars = calendarList.filter(
            (cal: GoogleCalendar) => cal.accessRole === 'owner' || cal.accessRole === 'writer'
          );
          console.log('[Modal] Pobrano listę kalendarzy. Znaleziono zapisywalnych:', writableCalendars);
          setCalendars(writableCalendars);
          if (writableCalendars.length > 0) {
            setSelectedCalendarId(writableCalendars[0].id);
          }
        })
        .catch((err) => {
          console.error('[Modal] Błąd podczas pobierania listy kalendarzy:', err);
          toast.error('Nie udało się pobrać listy kalendarzy.');
        })
        .finally(() => setLoading(false));
    }
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [open, accessToken, groups]);

  const handleConfirm = async () => {
    console.log('[Modal] Kliknięto "Eksportuj". Aktualne wartości:');
    console.log({ selectedGroupId, selectedCalendarId, newCalendarName });

    setLoading(true);
    let finalCalendarId = selectedCalendarId;

    if (finalCalendarId === 'new') {
      const suggestedName = groups.find((g) => g.id === selectedGroupId)?.name || 'Nowy Plan';
      const calendarName = newCalendarName.trim() || suggestedName;
      console.log(`[Modal] Próba stworzenia nowego kalendarza o nazwie: "${calendarName}"`);
      if (!calendarName) {
        setLoading(false);
        return toast.error('Nazwa nowego kalendarza jest wymagana.');
      }
      try {
        const newCalendar = await createCalendar(accessToken!, calendarName);
        finalCalendarId = newCalendar.id;
        console.log('[Modal] Stworzono nowy kalendarz. ID:', finalCalendarId);
        toast.success(`Stworzono nowy kalendarz: ${calendarName}`);
      } catch (err) {
        console.error('[Modal] Błąd podczas tworzenia kalendarza:', err);
        setLoading(false);
        return toast.error('Nie udało się stworzyć nowego kalendarza.');
      }
    }

    const selectedGroup = groups.find((g) => g.id === selectedGroupId);

    console.log('[Modal] Przygotowano do eksportu:');
    console.log({ selectedGroup, finalCalendarId });

    if (selectedGroup && finalCalendarId) {
      onConfirm(selectedGroup, finalCalendarId);
    } else {
      toast.error('Proszę wybrać grupę i kalendarz docelowy.');
    }
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogTitle>Eksport do Kalendarza Google</DialogTitle>
      <DialogContent sx={{ minWidth: '400px' }}>
        {loading ? (
          <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />
        ) : (
          <Box sx={{ pt: 2 }}>
            <FormControl
              fullWidth
              margin="normal"
            >
              <InputLabel>Grupa</InputLabel>
              <Select
                value={selectedGroupId}
                label="Grupa"
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {(groups || []).map((group) => (
                  <MenuItem
                    key={group.id}
                    value={group.id}
                  >
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              fullWidth
              margin="normal"
            >
              <InputLabel>Kalendarz Docelowy</InputLabel>
              <Select
                value={selectedCalendarId}
                label="Kalendarz Docelowy"
                onChange={(e) => setSelectedCalendarId(e.target.value)}
              >
                {calendars.map((cal) => (
                  <MenuItem
                    key={cal.id}
                    value={cal.id}
                  >
                    {cal.summary}
                  </MenuItem>
                ))}
                <MenuItem
                  value="new"
                  sx={{ fontWeight: 'bold' }}
                >
                  Stwórz nowy kalendarz...
                </MenuItem>
              </Select>
            </FormControl>
            {selectedCalendarId === 'new' && (
              <TextField
                autoFocus
                margin="dense"
                label="Nazwa nowego kalendarza"
                type="text"
                fullWidth
                variant="standard"
                value={newCalendarName}
                onChange={(e) => setNewCalendarName(e.target.value)}
                placeholder={groups.find((g) => g.id === selectedGroupId)?.name || ''}
              />
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          disabled={loading}
        >
          Anuluj
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Eksportuj'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
