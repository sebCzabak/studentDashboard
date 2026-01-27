// src/features/students/studentsService.ts
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, doc, updateDoc, where } from 'firebase/firestore';
import { type UserProfile } from '../user/types'; // Zakładając, że typ UserProfile istnieje

/**
 * Pobiera wszystkich użytkowników, którzy mają rolę 'student'.
 */
export const getAllStudents = async (): Promise<UserProfile[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'student'), orderBy('displayName'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UserProfile[];
};

/**
 * Przypisuje studenta do konkretnej specjalizacji.
 */
export const assignStudentToSpecialization = (
  studentId: string,
  specializationId: string,
  specializationName: string
) => {
  if (!studentId || !specializationId) throw new Error('Brak wymaganych ID.');
  const studentDocRef = doc(db, 'users', studentId);
  return updateDoc(studentDocRef, {
    specializationId: specializationId,
    specializationName: specializationName, // Zapisujemy też nazwę dla wygody
  });
};
export const updateStudentAssignment = (
  studentId: string,
  assignmentData: {
    groupId: string;
    groupName: string;
    specializationId: string;
    specializationName: string;
  }
): Promise<void> => {
  if (!studentId) throw new Error('Brak ID studenta.');
  const studentDocRef = doc(db, 'users', studentId);
  return updateDoc(studentDocRef, assignmentData);
};
