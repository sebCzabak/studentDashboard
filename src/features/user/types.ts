export type DayOfWeek = 'Poniedziałek' | 'Wtorek' | 'Środa' | 'Czwartek' | 'Piątek' | 'Sobota' | 'Niedziela';

// ✅ Definiujemy i eksportujemy ten typ tutaj
export interface AvailabilitySlot {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: 'student' | 'admin' | 'prowadzacy' | 'pracownik_dziekanatu' | 'pracownik_kwestury';
  groupName?: string;
  availability?: AvailabilitySlot[];
}
