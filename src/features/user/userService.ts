import { db, storage } from '../../config/firebase';
import { collection, getDocs, query, where, doc, updateDoc, getDoc, setDoc, orderBy } from 'firebase/firestore';
import { updateProfile, type User } from 'firebase/auth';
import { type UserProfile } from './types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Aktualizuje profil użytkownika w Firebase Auth i Firestore.
 * Używane na stronie Ustawień.
 */
export const updateUserProfile = async (user: User, newDisplayName: string) => {
  if (!user) throw new Error('Użytkownik nie jest zalogowany.');

  await updateProfile(user, {
    displayName: newDisplayName,
  });

  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, {
    displayName: newDisplayName,
  });
};

/**
 * Pobiera pełne dane użytkownika z jego dokumentu w kolekcji 'users'.
 */
export const getUserProfileData = async (userId: string): Promise<UserProfile | null> => {
  const userDocRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userDocRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as UserProfile;
  } else {
    console.warn('Nie znaleziono dokumentu profilu dla użytkownika:', userId);
    return null;
  }
};

/**
 * Pobiera wszystkich użytkowników z rolą 'student'.
 */
export const getAllStudents = async (): Promise<UserProfile[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'student'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UserProfile[];
};

/**
 * Pobiera studentów należących do danej grupy.
 */
export const getStudentsInGroup = async (groupId: string): Promise<UserProfile[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('groupId', '==', groupId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UserProfile[];
};

/**
 * Pobiera przedmioty przypisane do danego prowadzącego.
 */
export const getSubjectsForLecturer = async (lecturerId: string) => {
  const subjectsRef = collection(db, 'subjects');
  const q = query(subjectsRef, where('lecturerId', '==', lecturerId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/**
 * Przypisuje harmonogram opłat do grupy.
 */
export const assignScheduleToGroup = (groupId: string, feeScheduleId: string) => {
  if (!groupId) throw new Error('Group ID is required');
  const groupDocRef = doc(db, 'groups', groupId);
  return updateDoc(groupDocRef, {
    feeScheduleId: feeScheduleId,
  });
};

/**
 * Przypisuje grupę do studenta.
 * Używane w panelu admina "Zarządzaj Studentami".
 */
export const assignGroupToStudent = (studentId: string, groupId: string, groupName: string) => {
  if (!studentId) throw new Error('Student ID is required');
  const studentDocRef = doc(db, 'users', studentId);
  return updateDoc(studentDocRef, {
    groupId: groupId,
    groupName: groupName, // Zapisujemy też nazwę dla łatwiejszego wyświetlania
  });
};

/**
 * Pobiera wszystkich użytkowników z rolą 'prowadzacy'.
 */

export const getAllLecturers = async (): Promise<UserProfile[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'prowadzacy'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UserProfile[];
};
export const updateUserAvailability = async (uid: string, slots: any[]) => {
  // Zapisujemy dostępność w osobnej kolekcji, gdzie ID dokumentu to ID użytkownika
  const availabilityRef = doc(db, 'lecturerAvailabilities', uid);
  // Używamy `setDoc` z opcją `merge`, aby nadpisać tylko pole `slots`
  await setDoc(availabilityRef, { slots }, { merge: true });
};
export const getUserAvailability = async (uid: string) => {
  const availabilityRef = doc(db, 'lecturerAvailabilities', uid);
  const docSnap = await getDoc(availabilityRef);

  if (docSnap.exists()) {
    // Zwraca pole `slots` z dokumentu, lub pustą tablicę jeśli go nie ma
    return docSnap.data().slots || [];
  } else {
    // Jeśli dokument nie istnieje, zwraca pustą tablicę
    return [];
  }
};

export type { UserProfile };
export const getAllUsers = async (): Promise<UserProfile[]> => {
  const usersRef = collection(db, 'users');
  // ✅ Dodajemy sortowanie na poziomie zapytania do bazy danych
  const q = query(usersRef, orderBy('displayName', 'asc'));
  const querySnapshot = await getDocs(q);
  // Już nie musimy sortować w komponencie Reacta
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UserProfile[];
};
export const updateStudentProfile = (studentId: string, data: Partial<UserProfile>): Promise<void> => {
  if (!studentId) throw new Error('Brak ID studenta.');
  const studentDocRef = doc(db, 'users', studentId);
  return updateDoc(studentDocRef, data);
};
export const uploadStudentPhoto = async (studentId: string, file: File): Promise<string> => {
  if (!studentId) throw new Error('Brak ID studenta do przypisania zdjęcia.');
  if (!file) throw new Error('Brak pliku do przesłania.');

  // Tworzymy unikalną ścieżkę, np. 'student_avatars/uid-studenta/profile.jpg'
  // Użycie stałej nazwy pliku (np. 'profile') gwarantuje, że student ma tylko 1 awatar
  const filePath = `student_avatars/${studentId}/profile.jpg`;
  const storageRef = ref(storage, filePath);

  // Przesyłamy plik
  const uploadResult = await uploadBytes(storageRef, file);

  // Pobieramy URL do pobrania pliku
  const downloadURL = await getDownloadURL(uploadResult.ref);

  return downloadURL;
};
