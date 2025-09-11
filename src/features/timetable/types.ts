import type { FieldValue, Timestamp } from 'firebase/firestore';

export type DayOfWeek = 'Poniedziałek' | 'Wtorek' | 'Środa' | 'Czwartek' | 'Piątek' | 'Sobota' | 'Niedziela';

// ✅ Upewnij się, że ten typ jest wyeksportowany
export interface Timetable {
  id: string;
  name: string;
  status: 'draft' | 'published';
  curriculumId: string;
  semesterId: string;
  groupIds: string[];
  academicYear?: string;
  studyMode?: 'stacjonarny' | 'zaoczne' | 'podyplomowe' | 'anglojęzyczne';
  teachingMode?: 'stacjonarny' | 'online';
  curriculumName?: string;
  semesterName?: string;
}

export interface Group {
  specializations: any;
  id: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  lecturerId: string;
}

export interface AvailabilitySlot {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
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
  academicYear: string;
  programName: string;
  semesters: {
    semesterId: string;
    semesterNumber: number;
    subjects: any[];
  }[];
}
export interface Semester {
  id: string;
  name: string;
  startDate: any;
  endDate: any;
  type: 'stacjonarne' | 'niestacjonarne' | 'podyplomowe' | 'anglojęzyczne';
}
