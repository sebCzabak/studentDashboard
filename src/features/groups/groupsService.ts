import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, addDoc, where } from 'firebase/firestore';

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
export const getAllSpecializations = async () => {
  const querySnapshot = await getDocs(collection(db, 'specializations'));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
