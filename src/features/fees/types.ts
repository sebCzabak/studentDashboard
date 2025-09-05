import { Timestamp } from 'firebase/firestore';

export interface FeeSchedule {
  id: string;
  name: string;
  totalAmount: number;
  installments: {
    title: string;
    amount: number;
    dueDate: Timestamp;
  }[];
}
