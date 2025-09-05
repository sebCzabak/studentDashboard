// src/features/calendar/components/CalendarView.tsx
import { useEffect, useState } from 'react';
import { useAuthContext } from '../../../context/AuthContext';
import type { CalendarEvent } from '../types';

// Typ dla odpowiedzi z API Google Calendar
interface GoogleApiResponse {
  items: CalendarEvent[];
}

export const CalendarView = () => {
  const { accessToken } = useAuthContext();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Uruchom logikę tylko jeśli mamy token dostępu
    if (!accessToken) {
      setLoading(false);
      setError('Brak tokenu dostępu do Google API. Spróbuj zalogować się ponownie.');
      return;
    }

    // Funkcja do pobierania wydarzeń za pomocą standardowego fetch
    const fetchCalendarEvents = async () => {
      try {
        // Budujemy URL do API
        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true&timeMin=' +
            new Date().toISOString(),
          {
            method: 'GET',
            headers: {
              // NAJWAŻNIEJSZY ELEMENT: Ręcznie dodajemy nagłówek autoryzacyjny z naszym tokenem
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        // Jeśli odpowiedź nie jest OK (np. błąd 403, 500), rzuć błędem
        if (!response.ok) {
          // Próbujemy odczytać treść błędu z odpowiedzi API
          const errorData = await response.json();
          throw new Error(errorData.error.message || `Błąd serwera: ${response.status}`);
        }

        const data: GoogleApiResponse = await response.json();
        setEvents(data.items || []);
      } catch (err: any) {
        setError(err.message || 'Nie udało się pobrać wydarzeń z kalendarza.');
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarEvents();
  }, [accessToken]); // Uruchom efekt ponownie, jeśli zmieni się token

  if (loading) {
    return <div>Ładowanie wydarzeń z kalendarza...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Wystąpił błąd: {error}</div>;
  }

  return (
    <div>
      <h2>Nadchodzące wydarzenia</h2>
      {events.length > 0 ? (
        <ul>
          {events.map((event) => {
            const eventDate = event.start.dateTime || event.start.date;
            return (
              <li key={event.id}>
                <strong>{event.summary}</strong>
                <br />
                {eventDate && <small>{new Date(eventDate).toLocaleString()}</small>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p>Brak nadchodzących wydarzeń.</p>
      )}
    </div>
  );
};
