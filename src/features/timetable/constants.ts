// src/features/timetable/constants.ts
import type { DayOfWeek } from './types';

export const DAYS: DayOfWeek[] = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

// To jest teraz nasze jedyne, centralne źródło prawdy o blokach godzinowych
export const TIME_SLOTS = [
  { label: '08:00-09:30', startTime: '08:00', endTime: '09:30' },
  { label: '09:45-11:15', startTime: '09:45', endTime: '11:15' },
  { label: '11:30-13:00', startTime: '11:30', endTime: '13:00' },
  { label: '13:15-14:45', startTime: '13:15', endTime: '14:45' },
  { label: '15:00-16:30', startTime: '15:00', endTime: '16:30' },
  { label: '16:45-18:15', startTime: '16:45', endTime: '18:15' },
  { label: '18:30-20:00', startTime: '18:30', endTime: '20:00' },
];
