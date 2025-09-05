import { db } from '../../config/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  type DocumentData,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';

type SubmissionPayload = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  formType: string;
  formData: Record<string, any>; // Przechowamy tu wszystkie dane z formularza
};
/**
 * Pobiera WSZYSTKIE złożone wnioski, posortowane od najnowszych.
 * Używamy getDocs, bo admin nie potrzebuje tu aktualizacji w czasie rzeczywistym.
 */
export const getAllSubmissions = async () => {
  const submissionsColRef = collection(db, 'submittedForms');
  const q = query(submissionsColRef, orderBy('submissionDate', 'desc'));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc: DocumentData) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
/**
 *
 * @param submissionId ID dokumentu wionsku
 * @param newStaus Nowy status do ustaweinia
 */
export const updateSubmissionStatus = (submissionId: string, newStaus: string) => {
  if (!submissionId) throw new Error('SubmissionId is required');
  const submissionDocRef = doc(db, 'submittedForms', submissionId);
  return updateDoc(submissionDocRef, {
    status: newStaus,
  });
};

// Zapisuje informację o złożonym wniosku
export const addSubmission = (submissionData: SubmissionPayload) => {
  const submissionsColRef = collection(db, 'submittedForms');
  return addDoc(submissionsColRef, {
    ...submissionData,
    submissionDate: serverTimestamp(),
    status: 'Złożony (oczekuje na wysłanie)', // Domyślny status
  });
};

// Subskrybuje listę wniosków dla danego studenta
export const subscribeToUserSubmissions = (userId: string, callback: (submissions: any[]) => void) => {
  if (!userId) return () => {};
  const submissionsColRef = collection(db, 'submittedForms');
  const q = query(submissionsColRef, where('studentId', '==', userId), orderBy('submissionDate', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const submissions = snapshot.docs.map((doc: DocumentData) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(submissions);
  });

  return unsubscribe;
};
