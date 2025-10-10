// src/features/timetable/constants.ts
import type { DayOfWeek } from './types';

export const DAYS: DayOfWeek[] = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

// To jest teraz nasze jedyne, centralne źródło prawdy o blokach godzinowych
export const TIME_SLOTS = [
  { label: '08:00-09:30', startTime: '08:00', endTime: '09:30' },
  { label: '09:35-11:05', startTime: '09:35', endTime: '11:05' },
  { label: '11:10-12:40', startTime: '11:10', endTime: '12:40' },
  { label: '13:10-14:40', startTime: '13:10', endTime: '14:40' },
  { label: '14:45-16:15', startTime: '14:45', endTime: '16:15' },
  { label: '16:20-17:50', startTime: '16:20', endTime: '17:50' },
  { label: '17:55-19:25', startTime: '17:55', endTime: '19:25' },
  { label: '19:30-21:00', startTime: '19:30', endTime: '21:00' },
];
