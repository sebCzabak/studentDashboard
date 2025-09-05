// Plik: src/features/recruitment/types.ts
import { Timestamp } from 'firebase/firestore';

export interface Application {
  id: string;
  // Dane podstawowe
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: Timestamp; // Data urodzenia

  photoUrl?: string;
  previousEducation?: string;
  hasPaidEnrollmentFee: boolean;

  // Adres
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // Dane o edukacji
  education?: {
    schoolName: string;
    graduationYear: number;
    degree: string;
  };

  // Dane systemowe
  status: 'Nowe zgłoszenie' | 'wymaga uzupełnienia' | 'zaakceptowany' | 'odrzucony';
  submissionDate: Timestamp;
  processorId?: string;
  processorName?: string;
  notes?: string;
}
