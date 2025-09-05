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
  documentId,
  getDoc,
  orderBy,
  writeBatch,
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

export const createTimetable = (data: any) => {
  const timetablesRef = collection(db, 'timetables');
  return addDoc(timetablesRef, {
    ...data,
    status: 'draft',
    createdAt: serverTimestamp(),
  });
};

export const updateTimetableStatus = (timetableId: string, newStatus: 'draft' | 'published') => {
  if (!timetableId) throw new Error('Brak ID planu do aktualizacji.');
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

type EntryPayload = Omit<ScheduleEntry, 'id' | 'createdAt'>;

const checkForConflicts = async (entryData: Partial<EntryPayload>, excludingId: string | null = null) => {
  const entriesRef = collection(db, 'scheduleEntries');
  let baseQueryConditions = [
    where('dayOfWeek', '==', entryData.dayOfWeek),
    where('timeSlot', '==', entryData.timeSlot),
  ];
  if (excludingId) {
    baseQueryConditions.unshift(where(documentId(), '!=', excludingId));
  }

  // Sprawdzanie konfliktów dla prowadzącego i sali (bez zmian)
  const lecturerConflictQuery = query(
    entriesRef,
    ...baseQueryConditions,
    where('lecturerId', '==', entryData.lecturerId)
  );
  const roomConflictQuery = query(entriesRef, ...baseQueryConditions, where('roomId', '==', entryData.roomId));

  // NOWA, MĄDRZEJSZA WALIDACJA GRUP
  // Sprawdź, czy którakolwiek z grup w `entryData.groupIds` ma już zajęcia w tym czasie
  const groupConflictQuery = query(
    entriesRef,
    ...baseQueryConditions,
    where('groupIds', 'array-contains-any', entryData.groupIds)
  );

  const [lecturerConflict, groupConflict, roomConflict] = await Promise.all([
    getDocs(lecturerConflictQuery),
    getDocs(groupConflictQuery),
    getDocs(roomConflictQuery),
  ]);

  if (!lecturerConflict.empty) throw new Error(`Prowadzący jest już zajęty w tym terminie.`);
  if (!groupConflict.empty)
    throw new Error(`Co najmniej jedna z wybranych grup/specjalizacji ma już inne zajęcia w tym terminie.`);
  if (!roomConflict.empty) throw new Error(`Sala jest już zajęta w tym terminie.`);
};

export const createScheduleEntry = async (entryData: EntryPayload) => {
  await checkForConflicts(entryData);
  return addDoc(collection(db, 'scheduleEntries'), { ...entryData, createdAt: serverTimestamp() });
};

export const updateScheduleEntry = async (entryId: string, entryData: Partial<EntryPayload>) => {
  await checkForConflicts(entryData, entryId);
  return updateDoc(doc(db, 'scheduleEntries', entryId), { ...entryData, lastUpdatedAt: serverTimestamp() });
};

export const deleteScheduleEntry = (entryId: string) => {
  return deleteDoc(doc(db, 'scheduleEntries', entryId));
};
/**
 * Pobiera wszystkie istniejące wpisy w planie dla danego prowadzącego.
 */
export const getEntriesForLecturer = async (lecturerId: string) => {
  if (!lecturerId) return [];

  const entriesRef = collection(db, 'scheduleEntries');
  const q = query(entriesRef, where('lecturerId', '==', lecturerId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ScheduleEntry[];
};
