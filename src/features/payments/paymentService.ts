import { db } from '../../config/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  type DocumentData,
  doc,
  updateDoc,
  collectionGroup,
  getDocs,
  where,
} from 'firebase/firestore';
import type { Payment } from './types';

// --- Funkcje dla Panelu Studenta (bez zmian) ---

export const subscribeToPayments = (userId: string, callback: (payments: Payment[]) => void) => {
  if (!userId) return () => {};
  const paymentsColRef = collection(db, 'users', userId, 'payments');
  const q = query(paymentsColRef, orderBy('dueDate', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const payments = snapshot.docs.map((doc: DocumentData) => ({ id: doc.id, ...doc.data() } as Payment));
    callback(payments);
  });

  return unsubscribe;
};

// --- Funkcje dla Panelu Pracownika ---

export const togglePaymentStatus = (userId: string, paymentId: string, currentStatus: boolean) => {
  if (!userId || !paymentId) throw new Error('User ID and Payment ID are required');
  const paymentDocRef = doc(db, 'users', userId, 'payments', paymentId);
  return updateDoc(paymentDocRef, { isPaid: !currentStatus });
};

/**
 * Pobiera wszystkie płatności dla studentów, którzy należą do konkretnej grupy.
 * Używa zapytania do grupy kolekcji z filtrem 'where'.
 */
export const getPaymentsForGroup = async (groupId: string) => {
  if (!groupId) return [];

  const paymentsColGroup = collectionGroup(db, 'payments');
  // Szukamy we wszystkich płatnościach, ale filtrujemy tylko te z pasującym groupId
  const q = query(
    paymentsColGroup,
    where('groupId', '==', groupId),
    orderBy('studentName', 'asc') // Sortujemy po nazwisku studenta
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => {
    const studentId = doc.ref.parent.parent?.id;
    return { id: doc.id, studentId: studentId, ...doc.data() };
  });
};
