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
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import type {
  UserProfile,
  Semester,
  Group,
  Department,
  DegreeLevel,
  Room,
  Specialization,
  Subject,
  SemesterDate,
} from '../timetable/types';

/**
 * Fabryka tworząca w pełni funkcjonalny i otypowany zestaw funkcji CRUD.
 */
const crudService = <T extends { id: string }>(collectionName: string) => ({
  getAll: async (orderByField = 'name', orderDirection: 'asc' | 'desc' = 'asc'): Promise<T[]> => {
    const ref = collection(db, collectionName);
    const q = query(ref, orderBy(orderByField, orderDirection));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as T[];
  },
  // Zwraca Promise<void> dla kompatybilności z toast.promise
  add: async (data: Omit<T, 'id'>): Promise<void> => {
    await addDoc(collection(db, collectionName), data);
  },
  update: (id: string, data: Partial<Omit<T, 'id'>>): Promise<void> => {
    return updateDoc(doc(db, collectionName, id), data);
  },
  delete: (id: string): Promise<void> => {
    return deleteDoc(doc(db, collectionName, id));
  },
});

// --- EKSPORTOWANE SERWISY SŁOWNIKOWE ---

export const groupsService = crudService<Group>('groups');
export const departmentsService = crudService<Department>('departments');
export const degreeLevelsService = crudService<DegreeLevel>('degreeLevels');
export const roomsService = crudService<Room>('rooms');
export const specializationsService = crudService<Specialization>('specializations');
export const subjectsService = crudService<Subject>('subjects');
export const semesterDatesService = crudService<SemesterDate>('semesterDates');

// --- FUNKCJE SPECJALNE ---

/**
 * Pobiera tylko użytkowników z rolą "prowadzacy".
 */
export const getAllLecturers = async (): Promise<UserProfile[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'prowadzacy'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UserProfile[];
};

// --- DEDYKOWANE FUNKCJE DLA SEMESTRÓW (ze względu na konwersję dat) ---

/**
 * Pobiera wszystkie zdefiniowane semestry, sortując od najnowszego.
 */
export const getSemesters = async (): Promise<Semester[]> => {
  const semestersRef = collection(db, 'semesters');
  const q = query(semestersRef, orderBy('startDate', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Semester[];
};

/**
 * Subskrybuje zmiany kolekcji semestrów w czasie rzeczywistym (onSnapshot).
 * Zwraca funkcję do odsubskrybowania.
 */
export const subscribeSemesters = (onUpdate: (semesters: Semester[]) => void): Unsubscribe => {
  const semestersRef = collection(db, 'semesters');
  const q = query(semestersRef, orderBy('startDate', 'desc'));
  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache) return;
    const semesters = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Semester);
    onUpdate(semesters);
  });
};

/**
 * Dodaje nowy semestr, konwertując daty na format Firestore Timestamp.
 */
export const addSemester = async (data: {
  name: string;
  startDate: Date;
  endDate: Date;
  type: string;
}): Promise<void> => {
  await addDoc(collection(db, 'semesters'), {
    ...data,
    startDate: Timestamp.fromDate(data.startDate),
    endDate: Timestamp.fromDate(data.endDate),
  });
};

/**
 * Aktualizuje istniejący semestr, konwertując daty na format Firestore Timestamp.
 */
export const updateSemester = (
  id: string,
  data: { name: string; startDate: Date; endDate: Date; type: string },
): Promise<void> => {
  return updateDoc(doc(db, 'semesters', id), {
    ...data,
    startDate: Timestamp.fromDate(data.startDate),
    endDate: Timestamp.fromDate(data.endDate),
  });
};

/**
 * Usuwa semestr z bazy danych.
 */
export const deleteSemester = (id: string): Promise<void> => {
  return deleteDoc(doc(db, 'semesters', id));
};
