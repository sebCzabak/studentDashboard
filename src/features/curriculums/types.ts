export interface CurriculumSubject {
  subjectId: string;
  lecturerId: string;
  type: string;
  hours: number;
  ects: number;
}
export interface CurriculumSemester {
  semesterNumber: number;
  subjects: CurriculumSubject[];
}
export interface Curriculum {
  id: string;
  programName: string;
  academicYear: string;
  semesters: CurriculumSemester[];
}
