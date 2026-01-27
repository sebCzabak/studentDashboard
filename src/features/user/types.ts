// Potrzebny będzie import Timestamp
import type { Timestamp } from 'firebase/firestore';

export type DayOfWeek = 'Poniedziałek' | 'Wtorek' | 'Środa' | 'Czwartek' | 'Piątek' | 'Sobota' | 'Niedziela';

export interface AvailabilitySlot {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

export type OnboardingStatus = 'pending_email' | 'email_sent' | 'pending_post' | 'post_sent' | 'completed';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: 'student' | 'admin' | 'prowadzacy' | 'pracownik_dziekanatu' | 'pracownik_kwestury';

  groupId?: string;
  groupName?: string;
  specializationId?: string;
  specializationName?: string;

  createdAt?: Timestamp;
  photoURL?: string;
  onboardingStatus?: OnboardingStatus; // NOWE POLE: Dla statusu powitalnego (np. 'pending_post') // --- Inne dane do Modala (można dodać teraz lub później) --- // np. pesel?: string; // np. address?: string; // np. privateEmail?: string; // Prywatny email, na który poszedł list powitalny // To już masz (dla prowadzących)
  availability?: AvailabilitySlot[];
}
