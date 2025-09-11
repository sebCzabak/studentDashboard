import { db } from '../../config/firebase';

import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';

import { type UserProfile } from '../user/types'; // Upewnij się, że ta ścieżka jest poprawna
import type { Semester } from '../timetable/types';

/**

 * Fabryka tworząca podstawowy zestaw funkcji CRUD dla danej kolekcji.

 * @param collectionName Nazwa kolekcji w Firestore.

 * @returns Obiekt z funkcjami: getAll, add, update, delete.

 */

const crudService = (collectionName: string) => ({
  getAll: async (orderByField = 'name', orderDirection: 'asc' | 'desc' = 'asc') => {
    const ref = collection(db, collectionName);
    const q = query(ref, orderBy(orderByField, orderDirection));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
  add: (data: any) => addDoc(collection(db, collectionName), data),
  update: (id: string, data: any) => updateDoc(doc(db, collectionName, id), data),
  delete: (id: string) => deleteDoc(doc(db, collectionName, id)),
});
// --- EKSPORTOWANE SERWISY SŁOWNIKOWE ---

// Użycie fabryki do prostych słowników

export const groupsService = crudService('groups');

export const departmentsService = crudService('departments');

export const degreeLevelsService = crudService('degreeLevels');

export const roomsService = crudService('rooms');

export const specializationsService = crudService('specializations');

export const subjectsService = crudService('subjects');

// --- FUNKCJE SPECJALISTYCZNE ---

/**

 * Pobiera wszystkich użytkowników z rolą 'prowadzacy'.

 */

export const getAllLecturers = async (): Promise<UserProfile[]> => {
  const usersRef = collection(db, 'users');

  const q = query(usersRef, where('role', '==', 'prowadzacy'));

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UserProfile[];
};

/**

 * Pobiera wszystkie zdefiniowane semestry, sortując od najnowszego.

 */

export const getSemesters = async (): Promise<Semester[]> => {
  console.log('dictionaryService: Pobieram semestry...');
  const semestersRef = collection(db, 'semesters');
  const q = query(semestersRef, orderBy('startDate', 'desc'));
  const querySnapshot = await getDocs(q);
  console.log(`dictionaryService: Znaleziono ${querySnapshot.docs.length} semestrów.`);
  // Używamy asercji typu, aby TypeScript wiedział, że to jest tablica typu Semester
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Semester[];
};

/**

 * Dodaje nowy semestr, konwertując daty na format Firestore Timestamp.

 */

export const addSemester = async (data: { name: string; startDate: Date; endDate: Date; type: string }) => {
  await addDoc(collection(db, 'semesters'), {
    ...data,
    startDate: Timestamp.fromDate(data.startDate),
    endDate: Timestamp.fromDate(data.endDate),
  });
};
/**

 * Aktualizuje istniejący semestr, konwertując daty na format Firestore Timestamp.

 */

export const updateSemester = (id: string, data: { name: string; startDate: Date; endDate: Date; type: string }) => {
  return updateDoc(doc(db, 'semesters', id), {
    ...data,

    startDate: Timestamp.fromDate(data.startDate),

    endDate: Timestamp.fromDate(data.endDate),
  });
};

/**

 * Usuwa semestr z bazy danych.

 */

export const deleteSemester = (id: string) => {
  return deleteDoc(doc(db, 'semesters', id));
};
