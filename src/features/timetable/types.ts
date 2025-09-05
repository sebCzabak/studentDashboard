// Plik: src/features/timetable/types.ts

// Ten plik powinien być JEDYNYM źródłem tych typów w projekcie.

export type DayOfWeek = 'Poniedziałek' | 'Wtorek' | 'Środa' | 'Czwartek' | 'Piątek' | 'Sobota' | 'Niedziela';

export interface Group {
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

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: 'student' | 'prowadzacy' | 'admin';
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
}

export interface LecturerAvailability {
  [lecturerId: string]: AvailabilitySlot[];
}
