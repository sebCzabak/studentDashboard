import { db } from '../../config/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  type DocumentData,
  where,
} from 'firebase/firestore';
import { type Subject } from './types';

// Pobiera wszystkie przedmioty
export const getSubjects = async (): Promise<Subject[]> => {
  const subjectsRef = collection(db, 'subjects');
  const q = query(subjectsRef, orderBy('name'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() })) as Subject[];
};

// Sprawdza, czy przedmiot o danej nazwie już istnieje
export const checkIfSubjectExists = async (name: string): Promise<boolean> => {
  const subjectsRef = collection(db, 'subjects');
  const q = query(subjectsRef, where('name_normalized', '==', name.trim().toLowerCase()));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

// Dodaje nowy przedmiot
export const addSubject = (data: Omit<Subject, 'id'>) => {
  const normalizedName = data.name.trim().toLowerCase();
  return addDoc(collection(db, 'subjects'), {
    ...data,
    name_normalized: normalizedName,
  });
};

// Aktualizuje istniejący przedmiot
export const updateSubject = (id: string, data: Partial<Omit<Subject, 'id'>>) => {
  const normalizedName = data.name?.trim().toLowerCase();
  return updateDoc(doc(db, 'subjects', id), {
    ...data,
    // Aktualizuj pole do wyszukiwania, jeśli nazwa się zmieniła
    ...(normalizedName && { name_normalized: normalizedName }),
  });
};

// Usuwa przedmiot
export const deleteSubject = (id: string) => {
  return deleteDoc(doc(db, 'subjects', id));
};
