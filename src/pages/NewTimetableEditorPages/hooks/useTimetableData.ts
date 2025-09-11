import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import type {
  CurriculumSubject,
  ScheduleEntry,
  Group,
  Room,
  LecturerAvailability,
  Subject,
  Timetable,
  Curriculum,
} from '../../../features/timetable/types';
import type { UserProfile } from '../../../features/user/userService';
interface TimetablePageData {
  timetableData: Timetable;
  curriculumSubjects: CurriculumSubject[];
  groups: Group[];
  rooms: Room[];
  lecturerAvailability: LecturerAvailability;
}

const fetchRelatedData = async (timetableId: string): Promise<TimetablePageData> => {
  const timetableRef = doc(db, 'timetables', timetableId);
  const timetableSnap = await getDoc(timetableRef);
  if (!timetableSnap.exists()) throw new Error('Plan zajęć o podanym ID nie istnieje!');

  const timetableData = { id: timetableSnap.id, ...timetableSnap.data() } as Timetable;

  if (!timetableData.curriculumId || !timetableData.semesterId) {
    throw new Error("Dokument 'timetable' nie zawiera 'curriculumId' lub 'semesterId'!");
  }

  const curriculumRef = doc(db, 'curriculums', timetableData.curriculumId);
  const curriculumSnap = await getDoc(curriculumRef);
  if (!curriculumSnap.exists()) throw new Error(`Nie znaleziono siatki o ID: ${timetableData.curriculumId}`);
  const curriculumData = curriculumSnap.data() as Curriculum;

  const targetSemester = curriculumData.semesters?.find(
    (semester) => semester.semesterId?.trim() === timetableData.semesterId?.trim()
  );
  if (!targetSemester) throw new Error(`W siatce nie znaleziono semestru o ID: ${timetableData.semesterId}`);

  const subjectsFromSemester = targetSemester.subjects;
  if (!subjectsFromSemester || subjectsFromSemester.length === 0) {
    return { timetableData, curriculumSubjects: [], groups: [], rooms: [], lecturerAvailability: {} };
  }

  const subjectIds = subjectsFromSemester.map((s) => s.subjectId).filter(Boolean);
  if (subjectIds.length === 0) {
    return { timetableData, curriculumSubjects: [], groups: [], rooms: [], lecturerAvailability: {} };
  }

  const subjectsQuery = query(collection(db, 'subjects'), where('__name__', 'in', subjectIds));
  const subjectsSnap = await getDocs(subjectsQuery);
  const subjectsMap = new Map<string, Subject>();
  subjectsSnap.forEach((doc) => subjectsMap.set(doc.id, { id: doc.id, ...doc.data() } as Subject));

  const lecturerIds = [
    ...new Set(subjectsFromSemester.map((subject) => subject.lecturerId).filter(Boolean)),
  ] as string[];
  const lecturersMap = new Map<string, UserProfile>();
  const lecturerAvailability: LecturerAvailability = {};

  if (lecturerIds.length > 0) {
    const lecturersQuery = query(collection(db, 'users'), where('__name__', 'in', lecturerIds));
    const lecturersSnap = await getDocs(lecturersQuery);
    lecturersSnap.forEach((doc) => lecturersMap.set(doc.id, { id: doc.id, ...doc.data() } as UserProfile));

    // ✅ POPRAWKA: Poprawnie pobieramy dane z dedykowanej kolekcji
    const availabilityQuery = query(collection(db, 'lecturerAvailabilities'), where('__name__', 'in', lecturerIds));
    const availabilitySnap = await getDocs(availabilityQuery);
    availabilitySnap.forEach((doc) => {
      lecturerAvailability[doc.id] = doc.data().slots || [];
    });
  }

  const curriculumSubjects = subjectsFromSemester
    .map((curriculumSubj): CurriculumSubject | null => {
      const subjectDetails = subjectsMap.get(curriculumSubj.subjectId);
      if (!subjectDetails) return null;
      const lecturerDetails = lecturersMap.get(curriculumSubj.lecturerId);
      return {
        id: `${curriculumSubj.subjectId}-${curriculumSubj.type || 'zajecia'}`,
        subjectId: curriculumSubj.subjectId,
        subjectName: subjectDetails.name || 'Brak nazwy',
        lecturerId: curriculumSubj.lecturerId,
        lecturerName: lecturerDetails?.displayName || 'Brak prowadzącego',
        type: curriculumSubj.type,
        hours: curriculumSubj.hours,
      };
    })
    .filter((subj): subj is CurriculumSubject => subj !== null);

  let groups: Group[] = [];
  if (timetableData.groupIds && timetableData.groupIds.length > 0) {
    const groupsQuery = query(collection(db, 'groups'), where('__name__', 'in', timetableData.groupIds));
    const groupsSnap = await getDocs(groupsQuery);
    groups = groupsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Group));
  }
  const roomsSnap = await getDocs(collection(db, 'rooms'));
  const rooms: Room[] = roomsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Room));

  return { timetableData, curriculumSubjects, groups, rooms, lecturerAvailability };
};

export const useTimetableData = (timetableId: string | undefined) => {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState<CurriculumSubject[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [lecturerAvailability, setLecturerAvailability] = useState<LecturerAvailability>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!timetableId) {
      setLoading(false);
      return;
    }
    const getInitialData = async () => {
      try {
        setError(null);
        setLoading(true);
        const data = await fetchRelatedData(timetableId);
        setTimetable(data.timetableData);
        setCurriculumSubjects(data.curriculumSubjects);
        setGroups(data.groups);
        setRooms(data.rooms);
        setLecturerAvailability(data.lecturerAvailability);
      } catch (err: any) {
        console.error('Błąd krytyczny podczas pobierania danych powiązanych:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    getInitialData();

    const entriesCollectionRef = collection(db, 'scheduleEntries');
    const q = query(entriesCollectionRef, where('timetableId', '==', timetableId));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const entries = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ScheduleEntry));
        setScheduleEntries(entries);
      },
      (err) => {
        console.error('Błąd pobierania wpisów planu (onSnapshot):', err);
        setError('Nie udało się zsynchronizować planu.');
      }
    );

    return () => unsubscribe();
  }, [timetableId]);

  const addScheduleEntry = useCallback(
    async (newEntryData: Omit<ScheduleEntry, 'id'>) => {
      if (!timetableId) return;
      await addDoc(collection(db, 'scheduleEntries'), { ...newEntryData, timetableId });
    },
    [timetableId]
  );

  const updateScheduleEntry = useCallback(async (entryId: string, updatedData: Partial<ScheduleEntry>) => {
    const entryDocRef = doc(db, 'scheduleEntries', entryId);
    await updateDoc(entryDocRef, updatedData);
  }, []);

  const deleteScheduleEntry = useCallback(async (entryId: string) => {
    const entryDocRef = doc(db, 'scheduleEntries', entryId);
    await deleteDoc(entryDocRef);
  }, []);

  return {
    timetable,
    curriculumSubjects,
    scheduleEntries,
    groups,
    rooms,
    lecturerAvailability,
    loading,
    error,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
  };
};
