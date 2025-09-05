import { Timestamp } from 'firebase/firestore';

export interface Grade {
  id?: string; // To jest ID dokumentu oceny (równe ID przedmiotu)
  gradeValue: string;
  subjectName: string;
  subjectId: string;
  lecturerId: string;
  lecturerName: string;
  updatedAt: Timestamp;
}
