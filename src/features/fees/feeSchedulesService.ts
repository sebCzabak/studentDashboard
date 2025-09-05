import { db } from '../../config/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  type DocumentData,
  addDoc,
  doc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { getStudentsInGroup } from '../user/userService';

// Definicja typu dla danych przychodzących z formularza
export interface FeeSchedulePayload {
  name: string;
  totalAmount: number;
  installments: {
    title: string;
    amount: number;
    dueDate: Timestamp;
  }[];
}

/**
 * Pobiera wszystkie zdefiniowane harmonogramy opłat, posortowane po nazwie.
 */
export const getFeeSchedules = async () => {
  const schedulesColRef = collection(db, 'feeSchedules');
  const q = query(
    schedulesColRef,
    // TRICK: Znajdź tylko te dokumenty, gdzie pole 'name' jest stringiem i nie jest puste.
    // Operator ">" dla stringów działa jak "nie jest puste".
    where('name', '>', ''),
    orderBy('name')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc: DocumentData) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Dodaje nowy harmonogram opłat do kolekcji 'feeSchedules'.
 * @param scheduleData Obiekt z danymi nowego harmonogramu.
 */
export const addFeeSchedule = (scheduleData: FeeSchedulePayload) => {
  const schedulesColRef = collection(db, 'feeSchedules');
  return addDoc(schedulesColRef, {
    ...scheduleData,
    createdAt: serverTimestamp(),
  });
};

/**
 * Dla podanej grupy i harmonogramu, tworzy indywidualne dokumenty płatności
 * dla każdego studenta w tej grupie za pomocą operacji wsadowej.
 */
export const generatePaymentsForGroup = async (groupId: string, schedule: any) => {
  if (!groupId || !schedule || !schedule.installments) {
    throw new Error('Niekompletne dane do wygenerowania płatności.');
  }

  // 1. Pobierz wszystkich studentów z danej grupy
  const students = await getStudentsInGroup(groupId);
  if (students.length === 0) {
    throw new Error('W wybranej grupie nie ma żadnych studentów.');
  }

  // 2. Stwórz nową operację wsadową (batch)
  const batch = writeBatch(db);

  console.log(`Generowanie płatności dla ${students.length} studentów...`);

  // 3. Dla każdego studenta...
  students.forEach((student) => {
    schedule.installments.forEach((installment: any) => {
      const paymentDocRef = doc(collection(db, 'users', student.id, 'payments'));
      batch.set(paymentDocRef, {
        title: `${schedule.name} - ${installment.title}`, // np. "Czesne - Rata 1"
        amount: installment.amount,
        dueDate: installment.dueDate, // To już jest Timestamp z szablonu
        isPaid: false,
        createdAt: serverTimestamp(),
        studentId: student.id,
        studentName: student.displayName || student.email || 'Student bez nazwy',
        studentEmail: student.email || '',
        groupId: groupId,
      });
    });
  });

  // 4. Wykonaj wszystkie operacje zapisu naraz. To jest operacja atomowa.
  return batch.commit();
};
