import React, { useMemo } from 'react';
import { Paper, Typography, Box, Divider } from '@mui/material';
import type { CurriculumSubject, ScheduleEntry } from '../../features/timetable/types';
import { DraggableClass } from './DraggableObject';

interface UnscheduledClassesPanelProps {
  subjects: CurriculumSubject[];
  entries: ScheduleEntry[];
  isReadOnly: boolean;
}

const HOURS_PER_BLOCK = 1.5;

export const UnscheduledClassesPanel: React.FC<UnscheduledClassesPanelProps> = ({ subjects, entries, isReadOnly }) => {
  // Liczymy ile razy każdy przedmiot został użyty (liczba bloków)
  const usageCountMap = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((entry) => {
      if (entry.curriculumSubjectId) {
        const currentCount = map.get(entry.curriculumSubjectId) || 0;
        map.set(entry.curriculumSubjectId, currentCount + 1);
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
          const usageCount = usageCountMap.get(subject.id) || 0;
          const isUsed = usageCount > 0;
          const isDoubleBlock = usageCount >= 2; // Podwójny lub więcej bloków

          return (
            <DraggableClass
              key={subject.id}
              subject={subject}
              isUsed={isUsed}
              isReadOnly={isReadOnly}
              usageCount={usageCount}
              isDoubleBlock={isDoubleBlock}
            />
          );
        })}
      </Box>
    </Paper>
  );
};
