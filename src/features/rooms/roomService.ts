import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, type DocumentData } from 'firebase/firestore';
import { type Room } from './types';

/**
 * Pobiera wszystkie sale, posortowane po nazwie.
 */
export const getAllRooms = async (): Promise<Room[]> => {
  const roomsRef = collection(db, 'rooms');
  const q = query(roomsRef, orderBy('name'));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc: DocumentData) => ({
    id: doc.id,
    ...doc.data(),
  })) as Room[];
};
