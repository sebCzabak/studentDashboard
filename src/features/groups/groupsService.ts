// src/features/groups/groupsService.ts

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  writeBatch,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Group, Specialization } from '../timetable/types';

// --- Funkcje dla Grup ---

export const getGroups = async (): Promise<Group[]> => {
  const q = query(collection(db, 'groups'), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Group);
};

/**
 * Subskrybuje zmiany kolekcji grup w czasie rzeczywistym (onSnapshot).
 * Aktualizuje UI tylko danymi z serwera (pomija cache), żeby chip z semestrem/rokem od razu miał pełne dane.
 * Zwraca funkcję do odsubskrybowania.
 */
export const subscribeGroups = (onUpdate: (groups: Group[]) => void): Unsubscribe => {
  const q = query(collection(db, 'groups'), orderBy('name'));
  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache) return;
    const groups = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Group);
    onUpdate(groups);
  });
};

// ✅ POPRAWKA: Funkcja jest teraz `async` i zwraca `Promise<void>`
export const addGroup = async (data: Partial<Omit<Group, 'id'>>): Promise<void> => {
  if (!data.name) throw new Error('Nazwa grupy jest wymagana.');
  await addDoc(collection(db, 'groups'), data);
};

export const updateGroup = async (id: string, data: Partial<Omit<Group, 'id'>>): Promise<void> => {
  const groupRef = doc(db, 'groups', id);
  await updateDoc(groupRef, data);
};

/** Promuje grupę na następny semestr (currentSemester += 1). Tylko jeśli currentSemester < 6. */
export const promoteGroup = async (id: string, currentSemester: number): Promise<void> => {
  if (currentSemester >= 6) throw new Error('Grupa jest już na ostatnim (6.) semestrze.');
  const groupRef = doc(db, 'groups', id);
  await updateDoc(groupRef, { currentSemester: currentSemester + 1 });
};

export const deleteGroup = async (groupId: string): Promise<void> => {
  const batch = writeBatch(db);
  const specsQuery = query(collection(db, 'specializations'), where('groupId', '==', groupId));
  const specsSnapshot = await getDocs(specsQuery);
  specsSnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  const groupRef = doc(db, 'groups', groupId);
  batch.delete(groupRef);
  await batch.commit();
};

// --- Funkcje dla Specjalizacji ---

export const getAllSpecializations = async (): Promise<Specialization[]> => {
  const querySnapshot = await getDocs(collection(db, 'specializations'));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Specialization[];
};

/**
 * Subskrybuje zmiany kolekcji specjalizacji w czasie rzeczywistym (onSnapshot).
 */
export const subscribeSpecializations = (onUpdate: (specs: Specialization[]) => void): Unsubscribe => {
  return onSnapshot(collection(db, 'specializations'), { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache) return;
    const specs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Specialization);
    onUpdate(specs);
  });
};

export const addSpecialization = async (data: Omit<Specialization, 'id'>): Promise<void> => {
  await addDoc(collection(db, 'specializations'), data);
};

// ✅ POPRAWKA: Funkcja przyjmuje teraz obiekt z danymi
export const updateSpecialization = async (
  id: string,
  data: Partial<Omit<Specialization, 'id' | 'groupId'>>,
): Promise<void> => {
  const specRef = doc(db, 'specializations', id);
  await updateDoc(specRef, data);
};

export const deleteSpecialization = async (id: string): Promise<void> => {
  const specRef = doc(db, 'specializations', id);
  await deleteDoc(specRef);
};
