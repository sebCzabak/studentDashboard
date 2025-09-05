// src/features/shared/dictionaryService.ts

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

/**
 * Fabryka tworząca podstawowy zestaw funkcji CRUD dla danej kolekcji.
 * @param collectionName Nazwa kolekcji w Firestore.
 * @returns Obiekt z funkcjami: getAll, add, update, delete.
 */
const crudService = (collectionName: string) => ({
  /**
   * Pobiera wszystkie dokumenty z kolekcji, sortując je według podanego pola.
   * @param orderByField Nazwa pola do sortowania (domyślnie 'name').
   * @param orderDirection Kierunek sortowania ('asc' lub 'desc', domyślnie 'asc').
   */
  getAll: async (orderByField = 'name', orderDirection: 'asc' | 'desc' = 'asc') => {
    const ref = collection(db, collectionName);
    const q = query(ref, orderBy(orderByField, orderDirection));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
  /**
   * Dodaje nowy dokument do kolekcji.
   */
  add: (data: any) => addDoc(collection(db, collectionName), data),
  /**
   * Aktualizuje istniejący dokument.
   */
  update: (id: string, data: any) => updateDoc(doc(db, collectionName, id), data),
  /**
   * Usuwa dokument z kolekcji.
   */
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
export const getSemesters = () => crudService('semesters').getAll('startDate', 'desc');

/**
 * Dodaje nowy semestr, konwertując daty na format Firestore Timestamp.
 */
export const addSemester = (data: { name: string; startDate: Date; endDate: Date; type: string }) => {
  return addDoc(collection(db, 'semesters'), {
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
