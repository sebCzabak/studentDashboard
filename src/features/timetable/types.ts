import type { FieldValue, Timestamp } from 'firebase/firestore';

export type DayOfWeek = 'Poniedziałek' | 'Wtorek' | 'Środa' | 'Czwartek' | 'Piątek' | 'Sobota' | 'Niedziela';

export interface Timetable {
  id: string;
  name: string;
  status: 'draft' | 'published';
  curriculumId: string;
  semesterId: string;
  groupIds: string[];
  academicYear?: string;
  studyMode?: 'stacjonarny' | 'zaoczne' | 'podyplomowe' | 'anglojęzyczne';
  curriculumName?: string;
  semesterName?: string;
  createdAt?: Timestamp | FieldValue;
  lastUpdatedAt?: Timestamp | FieldValue;
}

export interface Group {
  id: string;
  name: string;
  semesterId: string; // Grupa powinna być przypisana do semestru
  specializations?: { id: string; name: string }[];
}

export interface Room {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  departmentId: string;
  lecturerId: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface AvailabilitySlot {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: 'student' | 'prowadzacy' | 'admin' | 'pracownik_dziekanatu' | 'pracownik_kwestury';
  availability?: AvailabilitySlot[];
}

export interface CurriculumSubject {
  id: string;
  subjectId: string;
  subjectName: string;
  lecturerId: string;
  lecturerName: string;
  type: 'Wykład' | 'Ćwiczenia' | 'Laboratorium' | 'Seminarium';
  hours: number;
}

export interface ScheduleEntry {
  specializationIds: string[];
  id: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
  lecturerId: string;
  lecturerName: string;
  type: 'Wykład' | 'Ćwiczenia' | 'Laboratorium' | 'Seminarium';
  roomId: string;
  roomName: string;
  curriculumSubjectId: string;
  groupIds: string[];
  groupNames: string[];
  timetableId: string;
  specificDates?: Timestamp[];
  createdAt?: Timestamp | FieldValue;
  lastUpdatedAt?: Timestamp | FieldValue;
}

export interface LecturerAvailability {
  [lecturerId: string]: AvailabilitySlot[];
}

export interface Curriculum {
  id: string;
  name: string;
  programName: string;
  academicYear: string;
  semesters: {
    semesterId: string;
    semesterNumber: number;
    subjects: {
      subjectId: string;
      lecturerId: string;
      type: string;
      hours: number;
      ects: number;
    }[];
  }[];
}

export interface Semester {
  id: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  type: 'stacjonarne' | 'niestacjonarne' | 'podyplomowe' | 'anglojęzyczne';
  semesterNumber?: number; // Dodane dla spójności
}

// Typy, które mogły być brakujące
export interface Specialization {
  id: string;
  name: string;
  groupId: string;
}

export interface DegreeLevel {
  id: string;
  name: string;
}
export interface WorkloadRow {
  lecturerId: string;
  lecturerName: string;
  subjectName: string;
  studyMode: string;
  hours: { [key: string]: number };
  totalHours: number;
}
