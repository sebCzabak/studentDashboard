import { useEffect, useState, useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';
import {
  Box,
  Typography,
  Paper,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { format, startOfWeek, endOfWeek, getWeek } from 'date-fns';
import { pl } from 'date-fns/locale';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { getAuth, reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';

// Typy
interface DetailedCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  hangoutLink?: string;
  organizer?: { displayName?: string; email: string };
}
interface GoogleApiResponse {
  items: DetailedCalendarEvent[];
}
type GroupedEvents = Record<string, DetailedCalendarEvent[]>;

export const CalendarPage = () => {
  const { role, profileInfo, accessToken, login, permissions } = useAuthContext();
  const [groupedEvents, setGroupedEvents] = useState<GroupedEvents>({});
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Używamy useCallback, aby funkcja nie była tworzona na nowo przy każdym renderze,
  // co zapobiega nieskończonym pętlom w useEffect.
  const fetchCalendarEvents = useCallback(async (token: string | null) => {
    if (!token) {
      setError('Sesja dla Kalendarza Google wygasła. Kliknij przycisk, aby ją odświeżyć.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        maxResults: '50',
        orderBy: 'startTime',
        singleEvents: 'true',
        timeMin: new Date().toISOString(),
        fields: 'items(id,summary,start,end,organizer,hangoutLink)',
      });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || `Błąd serwera: ${response.status}`);
      }

      const data: GoogleApiResponse = await response.json();

      const eventsByWeek = (data.items || []).reduce((acc: GroupedEvents, event) => {
        const eventDate = new Date(event.start.dateTime || event.start.date!);
        const weekStart = startOfWeek(eventDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(eventDate, { weekStartsOn: 1 });
        const weekKey = `Tydzień ${getWeek(eventDate, { weekStartsOn: 1 })}: ${format(weekStart, 'd MMM', {
          locale: pl,
        })} - ${format(weekEnd, 'd MMM yy', { locale: pl })}`;
        if (!acc[weekKey]) acc[weekKey] = [];
        acc[weekKey].push(event);
        return acc;
      }, {});

      setGroupedEvents(eventsByWeek);

      const sortedWeekKeys = Object.keys(eventsByWeek).sort();
      const now = new Date();
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const currentWeekKey = `Tydzień ${getWeek(now, { weekStartsOn: 1 })}: ${format(currentWeekStart, 'd MMM', {
        locale: pl,
      })} - ${format(currentWeekEnd, 'd MMM yy', { locale: pl })}`;
      const currentWeekIdx = sortedWeekKeys.findIndex((key) => key === currentWeekKey);
      setActiveWeekIndex(currentWeekIdx > -1 ? currentWeekIdx : 0);
    } catch (err: any) {
      if (err.message === 'Unauthorized') {
        setError('Sesja dla Kalendarza Google wygasła. Kliknij przycisk, aby ją odświeżyć.');
      } else {
        setError(err.message || 'Nie udało się pobrać wydarzeń z kalendarza.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReauthenticate = async () => {
    const auth = getAuth();
    if (auth.currentUser) {
      setLoading(true);
      setError(null);
      try {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/calendar');

        const result = await reauthenticateWithPopup(auth.currentUser, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const newAccessToken = credential?.accessToken;

        login(result.user, newAccessToken || null, profileInfo, role, permissions);
      } catch (error) {
        console.error('Błąd podczas ponownego uwierzytelniania:', error);
        setError('Nie udało się odświeżyć sesji. Spróbuj zalogować się ponownie od zera.');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Wywołujemy funkcję tylko raz, gdy komponent się załaduje lub gdy zmieni się token w kontekście
    fetchCalendarEvents(accessToken);
  }, [accessToken, fetchCalendarEvents]);

  const weekKeys = Object.keys(groupedEvents).sort();
  const activeWeekKey = weekKeys[activeWeekIndex];
  const activeWeekEvents = groupedEvents[activeWeekKey] || [];
  const handlePreviousWeek = () => setActiveWeekIndex((prevIndex) => Math.max(0, prevIndex - 1));
  const handleNextWeek = () => setActiveWeekIndex((prevIndex) => Math.min(weekKeys.length - 1, prevIndex + 1));
  const formatEventDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Brak daty';
    return format(new Date(dateStr), 'eeee, d MMMM, HH:mm', { locale: pl });
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1200px' }}>
        <Typography
          variant="h4"
          gutterBottom
        >
          Mój Kalendarz
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert
            severity="warning"
            sx={{ mt: 2 }}
          >
            {error}
            {error.includes('Sesja') && (
              <Button
                variant="contained"
                onClick={handleReauthenticate}
                sx={{ mt: 2, display: 'block' }}
              >
                Odśwież Sesję Google
              </Button>
            )}
          </Alert>
        )}

        {!loading && !error && (
          <>
            {weekKeys.length > 0 ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <IconButton
                    onClick={handlePreviousWeek}
                    disabled={activeWeekIndex === 0}
                  >
                    <ArrowBackIosNewIcon />
                  </IconButton>
                  <Typography variant="h6">{activeWeekKey}</Typography>
                  <IconButton
                    onClick={handleNextWeek}
                    disabled={activeWeekIndex === weekKeys.length - 1}
                  >
                    <ArrowForwardIosIcon />
                  </IconButton>
                </Box>
                <TableContainer>
                  <Table
                    size="small"
                    aria-label={`wydarzenia na ${activeWeekKey}`}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell>Nazwa</TableCell>
                        <TableCell>Prowadzący</TableCell>
                        <TableCell>Link</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeWeekEvents.map((event) => (
                        <TableRow
                          key={event.id}
                          hover
                        >
                          <TableCell sx={{ width: '25%' }}>
                            {formatEventDate(event.start.dateTime || event.start.date)}
                          </TableCell>
                          <TableCell sx={{ width: '40%' }}>{event.summary}</TableCell>
                          <TableCell sx={{ width: '20%' }}>
                            {event.organizer?.displayName || event.organizer?.email || ''}
                          </TableCell>
                          <TableCell sx={{ width: '15%' }}>
                            {event.hangoutLink ? (
                              <Link
                                href={event.hangoutLink}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Dołącz
                              </Link>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <Typography>Brak nadchodzących wydarzeń w kalendarzu.</Typography>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};
