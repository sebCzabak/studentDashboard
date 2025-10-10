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
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Group, Specialization } from '../timetable/types';

// --- Funkcje dla Grup ---

export const getGroups = async (): Promise<Group[]> => {
  const q = query(collection(db, 'groups'), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Group));
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

export const addSpecialization = async (data: Omit<Specialization, 'id'>): Promise<void> => {
  await addDoc(collection(db, 'specializations'), data);
};

// ✅ POPRAWKA: Funkcja przyjmuje teraz obiekt z danymi
export const updateSpecialization = async (
  id: string,
  data: Partial<Omit<Specialization, 'id' | 'groupId'>>
): Promise<void> => {
  const specRef = doc(db, 'specializations', id);
  await updateDoc(specRef, data);
};

export const deleteSpecialization = async (id: string): Promise<void> => {
  const specRef = doc(db, 'specializations', id);
  await deleteDoc(specRef);
};
