import { Timestamp } from 'firebase/firestore';

export interface Payment {
  id?: string;
  title: string;
  amount: number;
  dueDate: Timestamp;
  isPaid: boolean;
  createdAt: Timestamp;
  studentId: string;
  studentName: string;
  studentEmail: string;
}
