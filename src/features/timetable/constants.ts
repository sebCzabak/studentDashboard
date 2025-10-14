// src/features/timetable/constants.ts

import type { DayOfWeek } from './types';

export const DAYS: DayOfWeek[] = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

export const TIME_SLOTS = [
  {
    startTime: '08:00',
    endTime: '09:30',
    label: '08:00 - 09:30',
    pdfLabel: 'Blok I\n8:00-9:30\n8:00-9:10 online',
  },
  {
    startTime: '09:40',
    endTime: '11:10',
    label: '09:40 - 11:10',
    pdfLabel: 'Blok II\n9:40-11:10\n9:20-10:30 online',
  },
  {
    startTime: '11:20',
    endTime: '12:50',
    label: '11:20 - 12:50',
    pdfLabel: 'Blok III\n11:20-12:50\n10:40-11:50 online',
  },
  {
    startTime: '13:20',
    endTime: '14:50',
    label: '13:20 - 14:50',
    pdfLabel: 'Blok IV\n13:20-14:50\n12:00-13:10 online',
  },
  {
    startTime: '15:00',
    endTime: '16:30',
    label: '15:00 - 16:30',
    pdfLabel: 'Blok V\n15:00-16:30\n13:20-14:30 online',
  },
  {
    startTime: '16:40',
    endTime: '18:10',
    label: '16:40 - 18:10',
    pdfLabel: 'Blok VI\n16:40-18:10\n14:40-15:50 online',
  },
  {
    startTime: '18:20',
    endTime: '19:50',
    label: '18:20 - 19:50',
    pdfLabel: 'Blok VII\n18:20-19:50\n16:00-17:10 online',
  },
];
