import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { DraggableScheduleEntry } from './DraggableScheduleEntry';
import type { ScheduleEntry, DayOfWeek, LecturerAvailability } from '../../features/timetable/types';

// Definicje dni i godzin, które mogą być współdzielone
const STUDY_MODE_DAYS: Record<string, DayOfWeek[]> = {
  stacjonarny: ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'],
  zaoczne: ['Sobota', 'Niedziela'],
  podyplomowe: ['Sobota', 'Niedziela'],
  anglojęzyczne: ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'],
};
const TIME_SLOTS_STACJONARNE = ['08:00', '09:45', '11:30', '13:15', '15:00', '16:45', '18:30'];
const TIME_SLOTS_ONLINE = ['08:00', '09:20', '10:40', '12:00', '13:20', '14:40', '16:00', '17:20', '18:40'];

const timeToMinutes = (time?: string): number | null => {
  if (!time || !time.includes(':')) {
    return null;
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

type CellStatus = 'default' | 'available' | 'conflicting';

const DroppableCell: React.FC<{ day: DayOfWeek; time: string; children?: React.ReactNode; status: CellStatus }> = ({
  day,
  time,
  children,
  status,
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: `${day}-${time}` });

  const backgroundColor = () => {
    if (isOver) return 'action.hover';
    switch (status) {
      case 'available':
        return 'success.light';
      case 'conflicting':
        return 'error.light';
      default:
        return 'inherit';
    }
  };

  return (
    <TableCell
      ref={setNodeRef}
      sx={{
        border: '1px solid rgba(224, 224, 224, 1)',
        verticalAlign: 'top',
        height: '100px',
        width: '18%',
        backgroundColor: backgroundColor(),
        transition: 'background-color 0.2s ease-in-out',
      }}
    >
      {children}
    </TableCell>
  );
};

interface TimetableGridProps {
  entries: ScheduleEntry[];
  onEntryClick: (entry: ScheduleEntry) => void;
  activeLecturerId: string | null;
  lecturerAvailability: LecturerAvailability;
  conflictingEntries: ScheduleEntry[];
  isReadOnly: boolean;
  studyMode: 'stacjonarny' | 'zaoczne' | 'podyplomowe' | 'anglojęzyczne';
  teachingMode: 'stacjonarny' | 'online';
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  entries,
  onEntryClick,
  activeLecturerId,
  lecturerAvailability,
  conflictingEntries,
  isReadOnly, // Odbieramy prop `isReadOnly`
  studyMode,
  teachingMode,
}) => {
  const daysToDisplay = STUDY_MODE_DAYS[studyMode] || STUDY_MODE_DAYS['stacjonarny'];
  const timeSlots = teachingMode === 'online' ? TIME_SLOTS_ONLINE : TIME_SLOTS_STACJONARNE;

  const cellStatusMap = useMemo(() => {
    const map = new Map<string, CellStatus>();
    if (!activeLecturerId) return map;

    const availabilitySlots = lecturerAvailability[activeLecturerId] || [];

    for (const slot of availabilitySlots) {
      const startMinutes = timeToMinutes(slot.startTime);
      const endMinutes = timeToMinutes(slot.endTime);

      if (startMinutes === null || endMinutes === null) continue;

      for (const time of timeSlots) {
        const timeMinutes = timeToMinutes(time);
        if (timeMinutes !== null && timeMinutes >= startMinutes && timeMinutes < endMinutes) {
          map.set(`${slot.day}-${time}`, 'available');
        }
      }
    }

    for (const conflict of conflictingEntries) {
      if (conflict.day && conflict.startTime) {
        map.set(`${conflict.day}-${conflict.startTime}`, 'conflicting');
      }
    }

    return map;
  }, [activeLecturerId, lecturerAvailability, conflictingEntries, timeSlots]);

  return (
    <TableContainer
      component={Paper}
      sx={{ height: 'calc(100vh - 120px)' }}
    >
      <Table sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Godzina</TableCell>
            {daysToDisplay.map((day) => (
              <TableCell
                key={day}
                align="center"
                sx={{ fontWeight: 'bold' }}
              >
                {day}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {timeSlots.map((time) => (
            <TableRow key={time}>
              <TableCell
                component="th"
                scope="row"
              >
                <Typography variant="subtitle2">{time}</Typography>
              </TableCell>
              {daysToDisplay.map((day) => {
                const key = `${day}-${time}`;
                const cellEntries = entries.filter((e) => e.day === day && e.startTime === time);
                const status = cellStatusMap.get(key) || 'default';

                return (
                  <DroppableCell
                    key={key}
                    day={day}
                    time={time}
                    status={status}
                  >
                    {cellEntries.map((entry) => (
                      <DraggableScheduleEntry
                        key={entry.id}
                        entry={entry}
                        onClick={onEntryClick}
                        isReadOnly={isReadOnly} // ✅ Używamy przekazanego propa
                      />
                    ))}
                  </DroppableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
