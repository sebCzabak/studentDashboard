import React, { useMemo } from 'react';
import { Paper, Typography, Box, Divider } from '@mui/material';
import type { CurriculumSubject, ScheduleEntry } from '../../features/timetable/types';
import { DraggableClass } from './DraggableObject';

interface UnscheduledClassesPanelProps {
  subjects: CurriculumSubject[];
  entries: ScheduleEntry[];
  isReadOnly: boolean; // ✅ KROK 1: Dodajemy brakujący prop
}

const HOURS_PER_BLOCK = 1.5;

export const UnscheduledClassesPanel: React.FC<UnscheduledClassesPanelProps> = ({
  subjects,
  entries,
  isReadOnly, // Odbieramy prop
}) => {
  const usedHoursMap = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((entry) => {
      if (entry.curriculumSubjectId) {
        const currentHours = map.get(entry.curriculumSubjectId) || 0;
        map.set(entry.curriculumSubjectId, currentHours + HOURS_PER_BLOCK);
      }
    });
    return map;
  }, [entries]);

  return (
    <Paper
      elevation={3}
      sx={{ p: 2, height: 'calc(100vh - 120px)', overflowY: 'auto' }}
    >
      <Typography
        variant="h6"
        gutterBottom
      >
        Zajęcia do zaplanowania
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Box>
        {subjects.map((subject) => {
          const usedHours = usedHoursMap.get(subject.id) || 0;
          const isFullyScheduled = usedHours >= subject.hours;

          return (
            <DraggableClass
              key={subject.id}
              subject={subject}
              isUsed={isFullyScheduled}
              isReadOnly={isReadOnly} // ✅ KROK 2: Przekazujemy prop dalej w dół
            />
          );
        })}
      </Box>
    </Paper>
  );
};
