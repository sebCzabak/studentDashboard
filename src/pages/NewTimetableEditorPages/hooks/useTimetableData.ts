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
import { specializationsService } from '../../../features/shared/dictionaryService';
import type {
  CurriculumSubject,
  ScheduleEntry,
  Group,
  Room,
  LecturerAvailability,
  Subject,
  Timetable,
  Curriculum,
  UserProfile,
  Specialization,
  SemesterDate, // ✅ Poprawny typ
} from '../../../features/timetable/types';

interface TimetablePageData {
  timetableData: Timetable;
  curriculumSubjects: CurriculumSubject[];
  groups: Group[];
  rooms: Room[];
  lecturerAvailability: LecturerAvailability;
  specializations: Specialization[];
  semesterDates: SemesterDate[]; // ✅ Poprawna nazwa
}

const fetchRelatedData = async (timetableId: string): Promise<TimetablePageData> => {
  const timetableRef = doc(db, 'timetables', timetableId);
  const timetableSnap = await getDoc(timetableRef);
  if (!timetableSnap.exists()) throw new Error('Plan zajęć o podanym ID nie istnieje!');
  const timetableData = { id: timetableSnap.id, ...timetableSnap.data() } as Timetable;

  if (!timetableData.curriculumId || !timetableData.semesterId) {
    throw new Error("Dokument 'timetable' nie zawiera 'curriculumId' lub 'semesterId'!");
  }

  const [
    curriculumSnap,
    subjectsSnap,
    lecturersSnap,
    availabilitySnap,
    groupsSnap,
    roomsSnap,
    specializationsData,
    semesterDatesSnap, // ✅ Poprawna nazwa
  ] = await Promise.all([
    getDoc(doc(db, 'curriculums', timetableData.curriculumId)),
    getDocs(collection(db, 'subjects')),
    getDocs(query(collection(db, 'users'), where('role', '==', 'prowadzacy'))),
    getDocs(collection(db, 'lecturerAvailabilities')),
    timetableData.groupIds && timetableData.groupIds.length > 0
      ? getDocs(query(collection(db, 'groups'), where('__name__', 'in', timetableData.groupIds)))
      : Promise.resolve({ docs: [] }),
    getDocs(collection(db, 'rooms')),
    specializationsService.getAll(),
    getDocs(query(collection(db, 'semesterDates'), where('semesterId', '==', timetableData.semesterId))), // ✅ Poprawna nazwa kolekcji
  ]);

  if (!curriculumSnap.exists()) throw new Error(`Nie znaleziono siatki o ID: ${timetableData.curriculumId}`);
  const curriculumData = curriculumSnap.data() as Curriculum;

  const targetSemester = curriculumData.semesters?.find((s) => s.semesterId === timetableData.semesterId);
  if (!targetSemester) throw new Error(`W siatce nie znaleziono semestru o ID: ${timetableData.semesterId}`);

  const subjectsFromSemester = targetSemester.subjects || [];

  const subjectsMap = new Map(subjectsSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() } as Subject]));
  const lecturersMap = new Map(lecturersSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() } as UserProfile]));

  const lecturerAvailability: LecturerAvailability = {};
  availabilitySnap.forEach((doc) => {
    lecturerAvailability[doc.id] = doc.data().slots || [];
  });

  const curriculumSubjects = subjectsFromSemester
    .map((curriculumSubj: any, index: number): CurriculumSubject | null => {
      const subjectDetails = subjectsMap.get(curriculumSubj.subjectId);
      if (!subjectDetails) return null;
      const lecturerDetails = lecturersMap.get(curriculumSubj.lecturerId);
      return {
        id: `${curriculumSubj.subjectId}-${curriculumSubj.type || 'zajecia'}-${index}`,
        subjectId: curriculumSubj.subjectId,
        subjectName: subjectDetails.name || 'Brak nazwy',
        lecturerId: curriculumSubj.lecturerId,
        lecturerName: lecturerDetails?.displayName || 'Brak prowadzącego',
        type: curriculumSubj.type,
        hours: curriculumSubj.hours,
      };
    })
    .filter((subj): subj is CurriculumSubject => subj !== null);

  const groups: Group[] = groupsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Group));
  const rooms: Room[] = roomsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Room));
  const semesterDates: SemesterDate[] = semesterDatesSnap.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as SemesterDate)
  ); // ✅ Poprawna nazwa i typ

  return {
    timetableData,
    curriculumSubjects,
    groups,
    rooms,
    lecturerAvailability,
    specializations: specializationsData as Specialization[],
    semesterDates, // ✅ Poprawna nazwa
  };
};

export const useTimetableData = (timetableId: string | undefined) => {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState<CurriculumSubject[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [lecturerAvailability, setLecturerAvailability] = useState<LecturerAvailability>({});
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [semesterDates, setSemesterDates] = useState<SemesterDate[]>([]); // ✅ Poprawna nazwa
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
        setSpecializations(data.specializations);
        setSemesterDates(data.semesterDates); // ✅ Poprawna nazwa
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
    specializations,
    semesterDates, // ✅ Poprawna nazwa
    loading,
    error,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
  };
};
