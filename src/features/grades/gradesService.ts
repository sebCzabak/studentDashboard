import { db } from '../../config/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  type DocumentData,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { Grade } from './types';

export const saveGradesBatch = (
  gradesToSave: Record<string, string>,
  subjectId: string,
  subjectName: string,
  lecturerId: string,
  lecturerName: string
) => {
  // 1. Tworzymy nową operację wsadową (batch)
  const batch = writeBatch(db);

  // 2. Iterujemy po ocenach, które wpisał prowadzący
  Object.entries(gradesToSave).forEach(([studentId, gradeValue]) => {
    if (gradeValue) {
      // Zapisujemy tylko te oceny, które nie są puste
      // Tworzymy referencję do dokumentu oceny dla konkretnego studenta i przedmiotu
      // Użycie ID przedmiotu jako ID dokumentu oceny gwarantuje, że student ma tylko jedną ocenę z danego przedmiotu
      const gradeDocRef = doc(db, 'users', studentId, 'grades', subjectId);

      // 3. Dodajemy operację zapisu/aktualizacji do naszego batcha
      // `set` z `{ merge: true }` utworzy dokument, jeśli nie istnieje, lub zaktualizuje go, jeśli już jest.
      batch.set(
        gradeDocRef,
        {
          gradeValue: gradeValue,
          subjectId: subjectId,
          subjectName: subjectName,
          lecturerId: lecturerId,
          lecturerName: lecturerName,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  });

  // 4. Wykonujemy wszystkie operacje w batchu naraz.
  return batch.commit();
};

// Typ dla danych wysyłanych do Firestore (bez 'id' i z innym typem daty)
type GradeDataPayload = Omit<Grade, 'id' | 'createdAt'>;

// Funkcja do dodawania nowej oceny
export const addGrade = (userId: string, gradeData: GradeDataPayload) => {
  if (!userId) throw new Error('User ID is required');
  const gradesColRef = collection(db, 'users', userId, 'grades');
  return addDoc(gradesColRef, {
    ...gradeData,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToGrades = (userId: string, callback: (grades: Grade[]) => void) => {
  if (!userId) throw new Error('User ID is required');
  const gradesColRef = collection(db, 'users', userId, 'grades');

  // Tworzymy zapytanie, sortując oceny od najnowszej do najstarszej
  const q = query(gradesColRef, orderBy('updatedAt', 'desc'));

  // onSnapshot tworzy subskrypcję, która będzie aktywna
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const grades: Grade[] = snapshot.docs.map(
      (doc: DocumentData) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Grade)
    );
    callback(grades); // Wywołaj callback z nową listą ocen
  });

  // Zwracamy funkcję `unsubscribe`, aby móc zakończyć nasłuchiwanie
  return unsubscribe;
};

//usuń ocenę
export const deleteGrade = (userId: string, gradeId: string) => {
  if (!userId || !gradeId) {
    throw new Error('User ID and Grade ID are required for deletion');
  }
  const gradeDocRef = doc(db, 'users', userId, 'grades', gradeId);
  return deleteDoc(gradeDocRef);
};
//edytuj ocenę

export const updateGrade = (userId: string, gradeId: string, updatedData: GradeDataPayload) => {
  if (!userId || !gradeId) {
    throw new Error('User ID and Grade ID are required for update');
  }
  const gradeDocRef = doc(db, 'users', userId, 'grades', gradeId);
  return updateDoc(gradeDocRef, updatedData);
};
