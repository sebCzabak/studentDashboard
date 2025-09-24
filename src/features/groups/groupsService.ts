import { db } from '../../config/firebase';
import { collection, doc, updateDoc, deleteDoc, getDocs, query, orderBy, addDoc, where } from 'firebase/firestore';
import type { Specialization } from '../timetable/types';

export const getGroups = async () => {
  const ref = collection(db, 'groups');
  const q = query(ref, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const getSpecializationsForGroup = async (groupId: string) => {
  const ref = collection(db, 'specs');
  const q = query(ref, where('groupId', '==', groupId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addGroup = (data: { name: string }) => addDoc(collection(db, 'groups'), data);
export const addSpecialization = (data: { name: string; groupId: string }) =>
  addDoc(collection(db, 'specializations'), data);

export const getAllSpecializations = async (): Promise<Specialization[]> => {
  const querySnapshot = await getDocs(collection(db, 'specializations'));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Specialization[];
};

export const updateSpecialization = async (id: string, newName: string): Promise<void> => {
  const specRef = doc(db, 'specializations', id);
  await updateDoc(specRef, { name: newName });
};

export const deleteSpecialization = async (id: string): Promise<void> => {
  const specRef = doc(db, 'specializations', id);
  await deleteDoc(specRef);
};
