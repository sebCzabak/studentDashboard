import { getDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type {
  ScheduleEntry,
  Timetable,
  Semester,
  DayOfWeek,
  UserProfile,
  Group,
  Specialization,
  SemesterDate,
} from '../../../features/timetable/types';
import toast from 'react-hot-toast';

const GOOGLE_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';

// Definicje typów dla API Google
interface GoogleCalendar {
  id: string;
  summary: string;
  accessRole: 'owner' | 'writer' | 'reader';
}
interface GoogleCalendarEvent {
  summary: string;
  location: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees: { email: string }[];
  recurrence?: string[];
  conferenceData?: {
    createRequest: { requestId: string };
  };
}

// --- Funkcje publiczne ---

export const listCalendars = async (accessToken: string): Promise<GoogleCalendar[]> => {
  const response = await fetch(`${GOOGLE_API_BASE_URL}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Nie udało się pobrać listy kalendarzy.');
  const data = await response.json();
  return (data.items || []).filter((cal: GoogleCalendar) => cal.accessRole === 'owner' || cal.accessRole === 'writer');
};

export const createCalendar = async (accessToken: string, name: string): Promise<GoogleCalendar> => {
  const response = await fetch(`${GOOGLE_API_BASE_URL}/calendars`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ summary: name }),
  });
  if (!response.ok) throw new Error('Nie udało się utworzyć nowego kalendarza.');
  return await response.json();
};

// --- Główna funkcja eksportu ---

export const exportToGoogleCalendar = async (
  timetable: Timetable,
  entries: ScheduleEntry[],
  accessToken: string,
  calendarId: string,
  allLecturers: UserProfile[],
  allGroups: Group[],
  allSpecializations: Specialization[],
  allSemesterDates: SemesterDate[]
) => {
  const toastId = toast.loading('Przygotowywanie danych do eksportu...');
  try {
    console.log(
      `%c[EXPORT DEBUG] Rozpoczynam eksport dla planu: "${timetable.name}"`,
      'color: blue; font-weight: bold;'
    );
    console.log(`[EXPORT DEBUG] Otrzymano ${entries.length} zajęć do przetworzenia.`);
    console.log(
      `[EXPORT DEBUG] Otrzymano ${allSemesterDates.length} zdefiniowanych dat w semestrze.`,
      allSemesterDates
    );

    const semesterDoc = await getDoc(doc(db, 'semesters', timetable.semesterId));
    if (!semesterDoc.exists()) throw new Error('Nie znaleziono semestru dla tego planu.');
    const semester = semesterDoc.data() as Semester;
    console.log(`[EXPORT DEBUG] Znaleziono semestr: "${semester.name}"`);

    let eventsToCreate: GoogleCalendarEvent[] = [];
    const isSessionBased = timetable.studyMode === 'niestacjonarne' || timetable.studyMode === 'podyplomowe';
    console.log(`[EXPORT DEBUG] Tryb zjazdowy (niestacjonarne/podyplomowe): ${isSessionBased}`);

    if (isSessionBased) {
      const semesterDatesMap = new Map(allSemesterDates.map((sd) => [sd.id, sd]));
      const jsDayToDayOfWeek: DayOfWeek[] = [
        'Niedziela',
        'Poniedziałek',
        'Wtorek',
        'Środa',
        'Czwartek',
        'Piątek',
        'Sobota',
      ];
      console.log(`[EXPORT DEBUG] Zbudowano mapę ${semesterDatesMap.size} dat dla semestru.`);

      for (const entry of entries) {
        console.log(`[EXPORT DEBUG] -> Przetwarzam wpis: ${entry.subjectName} (${entry.day})`);
        if (!entry.sessionIds || entry.sessionIds.length === 0) {
          console.log(`   -> Pomijam, brak przypisanych zjazdów (sessionIds).`);
          continue;
        }
        console.log(`   -> Znaleziono przypisane sessionIds:`, entry.sessionIds);

        for (const sessionId of entry.sessionIds) {
          const semesterDate = semesterDatesMap.get(sessionId);
          if (!semesterDate) {
            console.warn(`   -> BŁĄD: Nie znaleziono daty o ID: ${sessionId} w przekazanej mapie!`);
            continue;
          }

          const date = semesterDate.date.toDate();
          const dayOfWeekFromDate = jsDayToDayOfWeek[date.getDay()];

          console.log(
            `   -> Sprawdzam zjazd: ${sessionId}, data: ${date.toLocaleDateString()}, forma: ${
              semesterDate.format
            }. Dzień zajęć: ${entry.day}, dzień daty: ${dayOfWeekFromDate}`
          );

          if (dayOfWeekFromDate === entry.day) {
            console.log(`%c   --> DOPASOWANO! Tworzę wydarzenie.`, 'color: green;');
            const attendees = buildAttendees(entry, allLecturers, allGroups, allSpecializations);
            const description = `Prowadzący: ${entry.lecturerName}\nGrupy: ${entry.groupNames.join(', ')}`;
            const dateStr = date.toISOString().split('T')[0];

            // Oblicz czas zakończenia - dla online na zjazdach: 1.1h, dla pozostałych: 1.5h
            const endTimeForExport = calculateEndTimeForExport(entry.startTime, semesterDate.format, true);

            const event: Partial<GoogleCalendarEvent> = {
              summary: entry.subjectName,
              location: entry.roomName,
              description,
              attendees,
              start: { dateTime: `${dateStr}T${entry.startTime}:00`, timeZone: 'Europe/Warsaw' },
              end: { dateTime: `${dateStr}T${endTimeForExport}:00`, timeZone: 'Europe/Warsaw' },
            };

            if (semesterDate.format === 'online') {
              console.log('   --> Dodaję link do Google Meet (czas trwania: 1h 10min).');
              // Dla każdego zjazdu tworzymy osobne spotkanie (osobny requestId)
              // Każde spotkanie będzie miało swój unikalny link
              event.conferenceData = { createRequest: { requestId: `${entry.id}-${sessionId}-${Date.now()}` } };
            }
            eventsToCreate.push(event as GoogleCalendarEvent);
          }
        }
      }
    } else {
      console.log('[EXPORT DEBUG] Uruchamiam logikę dla studiów cyklicznych (stacjonarne).');
      for (const entry of entries) {
        const attendees = buildAttendees(entry, allLecturers, allGroups, allSpecializations);
        let description = `Prowadzący: ${entry.lecturerName}\nGrupy: ${entry.groupNames.join(', ')}`;
        if (entry.groupNames && entry.groupNames.length > 1) {
          description += `\n\nUwaga: Zajęcia łączone.`;
        }

        // Dla trybu cyklicznego zawsze używamy 1.5h (nie ma zjazdów online z krótszym czasem)
        const endTimeForExport = calculateEndTimeForExport(entry.startTime, entry.format, false);

        const baseEvent: Partial<GoogleCalendarEvent> = {
          summary: entry.subjectName,
          location: entry.roomName,
          description,
          attendees,
        };

        if (entry.format === 'online') {
          // Dla trybu cyklicznego: wszystkie instancje dzielą ten sam link do spotkania
          baseEvent.conferenceData = {
            createRequest: { requestId: `recurring-${entry.id}` },
          };
        }

        const untilString = semester.endDate.toDate().toISOString().split('T')[0].replace(/-/g, '');
        const dayMap: { [key in DayOfWeek]: string } = {
          Poniedziałek: 'MO',
          Wtorek: 'TU',
          Środa: 'WE',
          Czwartek: 'TH',
          Piątek: 'FR',
          Sobota: 'SA',
          Niedziela: 'SU',
        };
        const firstDate = getNextDateForDay(semester.startDate.toDate(), entry.day);

        let interval = 1;
        if (timetable.recurrence === 'bi-weekly') interval = 2;

        const recurringEvent: GoogleCalendarEvent = {
          ...(baseEvent as GoogleCalendarEvent),
          start: { dateTime: `${firstDate}T${entry.startTime}:00`, timeZone: 'Europe/Warsaw' },
          end: { dateTime: `${firstDate}T${endTimeForExport}:00`, timeZone: 'Europe/Warsaw' },
          recurrence: [`RRULE:FREQ=WEEKLY;INTERVAL=${interval};BYDAY=${dayMap[entry.day]};UNTIL=${untilString}`],
        };
        eventsToCreate.push(recurringEvent);
      }
    }

    console.log(
      `[EXPORT DEBUG] Zakończono przygotowywanie danych. Liczba wydarzeń do stworzenia: ${eventsToCreate.length}`
    );
    if (eventsToCreate.length === 0) {
      toast.error('Nie znaleziono pasujących zajęć do wyeksportowania.', { id: toastId });
      return;
    }

    toast.loading(`Znaleziono ${eventsToCreate.length} wydarzeń. Rozpoczynam wysyłanie...`, { id: toastId });
    let successCount = 0;
    for (const eventPayload of eventsToCreate) {
      await createGoogleEvent(accessToken, calendarId, eventPayload);
      successCount++;
      toast.loading(`Eksportowanie... (${successCount}/${eventsToCreate.length})`, { id: toastId });
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    console.log('%c[EXPORT END] Zakończono pomyślnie!', 'color: green; font-weight: bold;');
    toast.success(`Wyeksportowano pomyślnie ${successCount} wydarzeń!`, { id: toastId, duration: 5000 });
  } catch (error: any) {
    console.error('Błąd krytyczny podczas eksportu do Google Calendar:', error);
    toast.error(`Wystąpił błąd podczas eksportu: ${error.message}`, { id: toastId });
  }
};

// --- Funkcje pomocnicze ---

/**
 * Oblicza czas zakończenia zajęć dla eksportu do Google Calendar
 * Dla zajęć online na zjazdach: 1h 10min (70 minut)
 * Dla pozostałych (stacjonarne i online cykliczne): 1h 30min (90 minut)
 */
const calculateEndTimeForExport = (
  startTime: string,
  format: 'stacjonarny' | 'online' | undefined,
  isSessionBased: boolean
): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  // Dla zajęć online na zjazdach: 1h 10min (70 minut)
  // Dla pozostałych (stacjonarne i online cykliczne): 1h 30min (90 minut)
  const durationInMinutes = format === 'online' && isSessionBased ? 70 : 90;

  date.setMinutes(date.getMinutes() + durationInMinutes);
  return date.toTimeString().slice(0, 5);
};

const createGoogleEvent = (accessToken: string, calendarId: string, event: GoogleCalendarEvent) => {
  return fetch(`${GOOGLE_API_BASE_URL}/calendars/${calendarId}/events?conferenceDataVersion=1`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  }).then(async (res) => {
    if (!res.ok) {
      const errorBody = await res.json();
      console.error('Szczegółowy błąd od API Google:', errorBody);
      throw new Error(errorBody.error.message || 'Nie udało się utworzyć wydarzenia w Google Calendar.');
    }
    return res.json();
  });
};

const buildAttendees = (
  entry: ScheduleEntry,
  allLecturers: UserProfile[],
  allGroups: Group[],
  allSpecializations: Specialization[]
): Array<{
  email: string;
  optional?: boolean;
  responseStatus?: 'accepted' | 'declined' | 'needsAction' | 'tentative';
}> => {
  const attendeesMap = new Map<string, { email: string; optional: boolean; responseStatus?: 'accepted' }>();
  
  // Prowadzący - zawsze obowiązkowy uczestnik, zaakceptowany (może rozpoczynać spotkania)
  const lecturer = allLecturers.find((l) => l.id === entry.lecturerId);
  if (lecturer?.email) {
    attendeesMap.set(lecturer.email, {
      email: lecturer.email,
      optional: false,
      responseStatus: 'accepted', // Zaakceptowany - może rozpoczynać spotkania
    });
  }

  // Grupy/Specjalizacje - obowiązkowi uczestnicy
  if (entry.specializationIds && entry.specializationIds.length > 0) {
    entry.specializationIds.forEach((specId) => {
      const specialization = allSpecializations.find((s) => s.id === specId);
      specialization?.emails?.forEach((email) => {
        if (!attendeesMap.has(email)) {
          attendeesMap.set(email, {
            email,
            optional: false,
          });
        }
      });
    });
  } else {
    entry.groupIds.forEach((groupId) => {
      const group = allGroups.find((g) => g.id === groupId);
      if (group?.groupEmail && !attendeesMap.has(group.groupEmail)) {
        attendeesMap.set(group.groupEmail, {
          email: group.groupEmail,
          optional: false,
        });
      }
    });
  }

  return Array.from(attendeesMap.values());
};

function getNextDateForDay(startDate: Date, dayOfWeek: DayOfWeek): string {
  const dayMap: { [key in DayOfWeek]: number } = {
    Niedziela: 0,
    Poniedziałek: 1,
    Wtorek: 2,
    Środa: 3,
    Czwartek: 4,
    Piątek: 5,
    Sobota: 6,
  };
  const targetDay = dayMap[dayOfWeek];
  const currentDate = new Date(startDate.valueOf());
  currentDate.setUTCHours(0, 0, 0, 0);
  while (currentDate.getDay() !== targetDay) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return currentDate.toISOString().split('T')[0];
}
