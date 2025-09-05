import { db } from '../../config/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  type DocumentData,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { type Curriculum } from './types';

export const getCurriculums = async (): Promise<Curriculum[]> => {
  const curriculumsRef = collection(db, 'curriculums');
  const q = query(curriculumsRef, orderBy('academicYear', 'desc'));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc: DocumentData) => ({
    id: doc.id,
    ...doc.data(),
  })) as Curriculum[];
};

export const getAllSubjects = async () => {
  const subjectsRef = collection(db, 'subjects');
  const q = query(subjectsRef, orderBy('name'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc: DocumentData) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const addCurriculum = (curriculumData: any) => {
  const curriculumsRef = collection(db, 'curriculums');
  // Używamy `addDoc`, aby Firestore sam wygenerował unikalne ID
  return addDoc(curriculumsRef, {
    ...curriculumData,
    createdAt: serverTimestamp(),
  });
};

export const updateCurriculum = (id: string, curriculumData: any) => {
  const curriculumDocRef = doc(db, 'curriculums', id);
  return updateDoc(curriculumDocRef, {
    ...curriculumData,
    lastUpdatedAt: serverTimestamp(),
  });
};

export const deleteCurriculum = (id: string) => {
  const curriculumDocRef = doc(db, 'curriculums', id);
  return deleteDoc(curriculumDocRef);
};
export const getCurriculumById = async (curriculumId: string) => {
  const curriculumDocRef = doc(db, 'curriculums', curriculumId);
  const docSnap = await getDoc(curriculumDocRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  } else {
    throw new Error(`Nie znaleziono siatki programowej o ID: ${curriculumId}`);
  }
};
