import type { FieldValue, Timestamp } from 'firebase/firestore';

export type DayOfWeek = 'Poniedziałek' | 'Wtorek' | 'Środa' | 'Czwartek' | 'Piątek' | 'Sobota' | 'Niedziela';
export type StudyMode = 'stacjonarne' | 'niestacjonarne' | 'podyplomowe' | 'anglojęzyczne';

export type EntryType = 'Wykład' | 'Ćwiczenia' | 'Laboratorium' | 'Seminarium' | 'Inne';
export type RecurrenceType = 'weekly' | 'bi-weekly' | 'monthly';
export type UserRole = 'student' | 'prowadzacy' | 'admin' | 'pracownik_dziekanatu' | 'pracownik_kwestury';

export interface SemesterDate {
  id: string;
  semesterId: string;
  date: Timestamp;
  format: 'stacjonarny' | 'online';
}
export interface Timetable {
  id: string;
  name: string;
  status: 'draft' | 'published';
  curriculumId: string;
  semesterId: string;
  groupIds: string[];
  academicYear?: string;
  studyMode?: StudyMode;
  curriculumName?: string;
  semesterName?: string;
  createdAt?: Timestamp | FieldValue;
  lastUpdatedAt?: Timestamp | FieldValue;
  recurrence?: RecurrenceType;
}

export interface Group {
  id: string;
  name: string;
  semesterId: string;
  specializations?: { id: string; name: string }[];
  groupEmail?: string;
}

export interface Room {
  id: string;
  name: string;
  capacity?: number;
  equipment?: string[];
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
  role: UserRole;
  availability?: AvailabilitySlot[];
}

export interface CurriculumSubject {
  id: string;
  subjectId: string;
  subjectName: string;
  lecturerId: string;
  lecturerName: string;
  type: EntryType;
  hours: number;
}

export interface ScheduleEntry {
  id: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
  lecturerId: string;
  lecturerName: string;
  type: EntryType;
  roomId: string;
  roomName: string;
  curriculumSubjectId: string;
  groupIds: string[];
  groupNames: string[];
  timetableId: string;
  specializationIds?: string[];
  specificDates?: Timestamp[];
  createdAt?: Timestamp | FieldValue;
  lastUpdatedAt?: Timestamp | FieldValue;
  format?: 'stacjonarny' | 'online';
  date?: Timestamp;
  sessionIds?: string[];
  notes?: string;
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
  type: StudyMode;
  semesterNumber?: number;
}

export interface Specialization {
  id: string;
  name: string;
  groupId: string;
  abbreviation?: string;
  emails?: string[];
}

export interface WorkloadRow {
  lecturerId: string;
  lecturerName: string;
  subjectName: string;
  studyMode: string;
  hours: { [key: string]: number };
  totalHours: number;
}
// export interface SemesterDate {
//   id: string;
//   semesterId: string;
//   date: Timestamp;
//   format: 'stacjonarny' | 'online';
// }

export interface DegreeLevel {
  id: string;
  name: string; // np. "I stopień", "II stopień", "Podyplomowe"
}
