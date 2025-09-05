import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { type Application } from './types';

/**
 * Generyczna funkcja do pobierania wniosków z podanej kolekcji i o podanym statusie.
 * @param collectionName Nazwa kolekcji.
 * @param status Status do filtrowania (np. 'Nowe zgłoszenie', 'zaakceptowany').
 */
const getApplicationsFromCollection = async (collectionName: string, status: string): Promise<Application[]> => {
  const applicationsRef = collection(db, collectionName);

  let q;
  if (status === 'wszystkie') {
    q = query(applicationsRef, orderBy('submissionDate', 'desc'));
  } else {
    q = query(applicationsRef, where('status', '==', status), orderBy('submissionDate', 'desc'));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Application[];
};

export const getDomesticApplications = (status: string) => {
  return getApplicationsFromCollection('applications', status);
};

export const getInternationalApplications = (status: string) => {
  return getApplicationsFromCollection('international_applications', status);
};

export const getApplicationById = async (
  collectionName: string,
  applicationId: string
): Promise<Application | null> => {
  const appDocRef = doc(db, collectionName, applicationId);
  const docSnap = await getDoc(appDocRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Application;
  } else {
    throw new Error('Nie znaleziono wniosku o podanym ID.');
  }
};

export const updateApplication = (collectionName: string, applicationId: string, dataToUpdate: any) => {
  const appDocRef = doc(db, collectionName, applicationId);
  return updateDoc(appDocRef, dataToUpdate);
};
export const getPostgraduateApplications = (status: string) => {
  return getApplicationsFromCollection('postgraduate_applications', status);
};
