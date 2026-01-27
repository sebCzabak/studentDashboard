// src/features/recruitment/types.ts
import { Timestamp } from 'firebase/firestore';

// Definicja statusów weryfikacji (zgodna z zrzutem ekranu)
export type ApplicationStatusValue =
  | 'Nie wybrano'
  | 'Oczekuje'
  | 'W trakcie realizacji'
  | 'Zapłacono'
  | 'Zwrot'
  | 'Zaakceptowano'
  | 'Odrzucono';

// Struktura danych statusów weryfikacji
export interface ApplicationVerificationStatus {
  // Statusy finansowe / dokumentacyjne (zgodne z UI)
  enrollmentFee: ApplicationStatusValue; // Opłata wpisowa
  tuitionFee: ApplicationStatusValue; // Opłata czesnego
  entryExamFirst: ApplicationStatusValue; // Egzamin wstępny (Pierwsze podejście)
  entryExamSecond: ApplicationStatusValue; // Egzamin wstępny (Drugie podejście)
  interview: ApplicationStatusValue; // Rozmowa wstępna
  visaDocuments: ApplicationStatusValue; // Dokumenty do przyjęcia / wizowe
  generalStatus: ApplicationStatusValue; // Ogólny status zgłoszenia

  // Pola informacyjne
  informationNAWA: ApplicationStatusValue; // Informacja NAWA
  additionalComments: string; // Dodatkowe uwagi
}

export interface Application {
  id: string;
  // DANE PODSTAWOWE (Zgodne z Twoimi istniejącymi danymi)
  firstName: string;
  lastName: string;
  email: string;

  // DANE OSOBOWE I KONTAKTOWE (Rozszerzenie o UI)
  dateOfBirth?: Timestamp;
  phoneNumber?: string;
  country?: string;
  citizenship?: string;
  gender?: 'Kobieta' | 'Mężczyzna' | 'Inne';

  // DANE ADRESOWE
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // DANE O EDUKACJI
  previousEducation?: {
    schoolName: string;
    graduationYear: number;
    degree: string;
  };

  // DANE SYSTEMOWE I STATUS APLIKACJI (Zgodne z Twoimi logami)
  status: 'Nowe zgłoszenie' | 'wymaga uzupełnienia' | 'zaakceptowany' | 'odrzucony'; // Status ogólny
  submissionDate: Timestamp;
  processorId?: string;
  processorName?: string;
  notes?: string;

  // ✅ NOWE POLE: Statusy weryfikacyjne dla panelu
  verification: ApplicationVerificationStatus;
}
