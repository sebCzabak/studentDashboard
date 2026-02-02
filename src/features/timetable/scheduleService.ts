import { db } from '../../config/firebase';
import {
  collection,
  getDocs,
  query,
  addDoc,
  where,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  orderBy,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import type { ScheduleEntry, Timetable } from './types';

// --- Funkcje dla Timetables (Planów) ---

export const getTimetables = async (): Promise<Timetable[]> => {
  const timetablesRef = collection(db, 'timetables');
  const q = query(timetablesRef, orderBy('academicYear', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Timetable[];
};

export const getTimetableById = async (timetableId: string): Promise<Timetable | null> => {
  const timetableRef = doc(db, 'timetables', timetableId);
  const docSnap = await getDoc(timetableRef);
  return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Timetable) : null;
};

export const createTimetable = async (data: Partial<Timetable>): Promise<void> => {
  await addDoc(collection(db, 'timetables'), {
    ...data,
    status: 'draft',
    createdAt: serverTimestamp(),
  });
};
export const updateTimetable = async (id: string, data: Partial<Timetable>) => {
  const timetableRef = doc(db, 'timetables', id);
  await updateDoc(timetableRef, {
    ...data,
    lastUpdatedAt: serverTimestamp(), // Opcjonalnie: dodajemy znacznik czasu aktualizacji
  });
};

export const updateTimetableStatus = (
  timetableId: string,
  newStatus: 'draft' | 'published' | 'archived'
) => {
  if (!timetableId) throw new Error('Brak ID planu.');
  const timetableDocRef = doc(db, 'timetables', timetableId);
  return updateDoc(timetableDocRef, {
    status: newStatus,
  });
};

export const deleteTimetableAndEntries = async (timetableId: string) => {
  if (!timetableId) throw new Error('Brak ID planu do usunięcia.');
  const batch = writeBatch(db);
  const entriesRef = collection(db, 'scheduleEntries');
  const q = query(entriesRef, where('timetableId', '==', timetableId));
  const entriesSnapshot = await getDocs(q);
  entriesSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  const timetableDocRef = doc(db, 'timetables', timetableId);
  batch.delete(timetableDocRef);
  return batch.commit();
};

export const getTimetablesForGroup = async (groupId: string): Promise<Timetable[]> => {
  if (!groupId) {
    throw new Error('Brak ID grupy do wyszukania planu.');
  }
  const timetablesRef = collection(db, 'timetables');

  // To zapytanie wymaga indeksu "Array" na polu 'groupIds'
  const q = query(timetablesRef, where('groupIds', 'array-contains', groupId));

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Timetable[];
};

// --- Funkcje dla ScheduleEntries (Wpisów w planie) ---
export const getScheduleEntries = async (timetableId: string): Promise<ScheduleEntry[]> => {
  if (!timetableId) return [];
  const entriesRef = collection(db, 'scheduleEntries');
  const q = query(entriesRef, where('timetableId', '==', timetableId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ScheduleEntry[];
};

type EntryPayload = Partial<Omit<ScheduleEntry, 'id'>>;

const checkForConflicts = async (newEntryData: EntryPayload, excludingId: string | null = null) => {
  if (!newEntryData.day || !newEntryData.startTime) return;

  const entriesRef = collection(db, 'scheduleEntries');
  const q = query(entriesRef, where('day', '==', newEntryData.day), where('startTime', '==', newEntryData.startTime));
  const querySnapshot = await getDocs(q);

  const docsToCheck = querySnapshot.docs.filter((d) => d.id !== excludingId);
  if (docsToCheck.length === 0) return;

  const timetableIds = [...new Set(docsToCheck.map((d) => (d.data() as ScheduleEntry).timetableId).filter(Boolean))] as string[];
  const nonArchivedIds = new Set<string>();
  await Promise.all(
    timetableIds.map(async (id) => {
      const tSnap = await getDoc(doc(db, 'timetables', id));
      if (tSnap.exists() && (tSnap.data() as Timetable).status !== 'archived') nonArchivedIds.add(id);
    })
  );

  const newEntryIsWeekly = !newEntryData.specificDates || newEntryData.specificDates.length === 0;
  const newEntryDates = new Set(newEntryData.specificDates?.map((d) => d.toDate().toISOString().split('T')[0]));

  for (const doc of docsToCheck) {
    const existingEntry = doc.data() as ScheduleEntry;
    if (existingEntry.timetableId && !nonArchivedIds.has(existingEntry.timetableId)) continue;
    const existingEntryIsWeekly = !existingEntry.specificDates || existingEntry.specificDates.length === 0;

    // Sprawdź, czy zasoby (prowadzący, sala, grupy) się pokrywają
    const resourcesConflict =
      existingEntry.lecturerId === newEntryData.lecturerId ||
      existingEntry.roomId === newEntryData.roomId ||
      (existingEntry.groupIds || []).some((g) => (newEntryData.groupIds || []).includes(g));

    if (resourcesConflict) {
      // Jeśli zasoby się pokrywają, sprawdź daty
      if (newEntryIsWeekly || existingEntryIsWeekly) {
        // Jeśli którekolwiek zajęcia są cykliczne, zawsze jest to kolizja
        throw new Error(`Wystąpiła kolizja z zajęciami cyklicznymi w tym terminie.`);
      } else {
        // Jeśli oba mają konkretne daty, sprawdź, czy daty się pokrywają
        const datesConflict = (existingEntry.specificDates || []).some((ts) =>
          newEntryDates.has(ts.toDate().toISOString().split('T')[0])
        );
        if (datesConflict) {
          throw new Error(`Wystąpiła kolizja terminów w jednej z wybranych dat.`);
        }
      }
    }
  }
};

export const createScheduleEntry = async (entryData: Omit<ScheduleEntry, 'id'>) => {
  await checkForConflicts(entryData);
  return addDoc(collection(db, 'scheduleEntries'), { ...entryData, createdAt: serverTimestamp() });
};

export const updateScheduleEntryService = async (entryId: string, updatedData: Partial<ScheduleEntry>) => {
  const entryRef = doc(db, 'scheduleEntries', entryId);
  const docSnap = await getDoc(entryRef);
  if (!docSnap.exists()) throw new Error('Nie znaleziono wpisu o podanym ID.');

  const dataToValidateAndSave = { ...docSnap.data(), ...updatedData };

  await checkForConflicts(dataToValidateAndSave, entryId);

  if (dataToValidateAndSave.specificDates && Array.isArray(dataToValidateAndSave.specificDates)) {
    dataToValidateAndSave.specificDates = dataToValidateAndSave.specificDates.map((date) =>
      date instanceof Date ? Timestamp.fromDate(date) : date
    );
  }
  dataToValidateAndSave.lastUpdatedAt = serverTimestamp();

  return updateDoc(entryRef, dataToValidateAndSave);
};

export const deleteScheduleEntry = (entryId: string) => {
  return deleteDoc(doc(db, 'scheduleEntries', entryId));
};

/** Zwraca wpisy planu dla prowadzącego – tylko z planów aktywnych (draft/published). Wpisy z planów zarchiwizowanych nie blokują dyspozycyjności. */
export const getEntriesForLecturer = async (lecturerId: string): Promise<ScheduleEntry[]> => {
  if (!lecturerId) return [];
  const entriesRef = collection(db, 'scheduleEntries');
  const q = query(entriesRef, where('lecturerId', '==', lecturerId));
  const querySnapshot = await getDocs(q);
  const entries = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ScheduleEntry[];
  const timetableIds = [...new Set(entries.map((e) => e.timetableId).filter(Boolean))] as string[];
  if (timetableIds.length === 0) return entries;

  const nonArchivedIds = new Set<string>();
  await Promise.all(
    timetableIds.map(async (id) => {
      const tSnap = await getDoc(doc(db, 'timetables', id));
      if (tSnap.exists() && (tSnap.data() as Timetable).status !== 'archived') nonArchivedIds.add(id);
    })
  );
  return entries.filter((e) => e.timetableId && nonArchivedIds.has(e.timetableId));
};
export const copyTimetable = async (sourceTimetableId: string, newTimetableName: string) => {
  console.log(`[copyTimetable] Rozpoczynam kopiowanie planu o ID: ${sourceTimetableId}`);

  if (!sourceTimetableId || !newTimetableName) {
    throw new Error('Brak ID źródłowego planu lub nowej nazwy.');
  }

  const batch = writeBatch(db);
  const timetablesRef = collection(db, 'timetables');
  const entriesRef = collection(db, 'scheduleEntries');

  const sourceTimetableRef = doc(timetablesRef, sourceTimetableId);
  const sourceTimetableSnap = await getDoc(sourceTimetableRef);
  if (!sourceTimetableSnap.exists()) {
    throw new Error('Oryginalny plan do skopiowania nie istnieje.');
  }

  const sourceData = sourceTimetableSnap.data();
  const newTimetableData = {
    ...sourceData,
    name: newTimetableName,
    status: 'draft',
    createdAt: serverTimestamp(),
  };

  const newTimetableRef = doc(timetablesRef);
  batch.set(newTimetableRef, newTimetableData);
  console.log(`[copyTimetable] Przygotowano nowy plan o ID: ${newTimetableRef.id}`);

  // Pobierz wszystkie zajęcia ze starego planu
  const sourceEntriesQuery = query(entriesRef, where('timetableId', '==', sourceTimetableId));
  const sourceEntriesSnap = await getDocs(sourceEntriesQuery);

  console.log(`[copyTimetable] Znaleziono ${sourceEntriesSnap.size} zajęć do skopiowania.`);

  sourceEntriesSnap.forEach((entryDoc) => {
    const sourceEntryData = entryDoc.data();
    const newEntryData = {
      ...sourceEntryData,
      timetableId: newTimetableRef.id,
    };
    const newEntryRef = doc(entriesRef);
    batch.set(newEntryRef, newEntryData);
  });

  await batch.commit();
  console.log('[copyTimetable] Operacja batch.commit() zakończona sukcesem.');
};
