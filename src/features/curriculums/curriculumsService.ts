import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Curriculum } from './types';

export const getCurriculums = async (): Promise<Curriculum[]> => {
  const curriculumsRef = collection(db, 'curriculums');
  const q = query(curriculumsRef, orderBy('academicYear', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Curriculum));
};

export const getAllSubjects = async () => {
  // Ta funkcja powinna być prawdopodobnie w `dictionaryService`
  const snapshot = await getDocs(collection(db, 'subjects'));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// ✅ POPRAWIONA FUNKCJA
export const addCurriculum = async (data: Omit<Curriculum, 'id'>): Promise<void> => {
  await addDoc(collection(db, 'curriculums'), data);
};

export const updateCurriculum = async (id: string, data: Partial<Omit<Curriculum, 'id'>>): Promise<void> => {
  const curriculumRef = doc(db, 'curriculums', id);
  await updateDoc(curriculumRef, data);
};

export const deleteCurriculum = (id: string): Promise<void> => {
  return deleteDoc(doc(db, 'curriculums', id));
};
