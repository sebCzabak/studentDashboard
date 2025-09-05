import { Box, Typography } from '@mui/material';
import { DraggableClass } from './DraggableClass';

interface UnscheduledClassesPanelProps {
  availableSubjects: any[];
  scheduledClassIds: Set<string>;
  maps: any;
}

export const UnscheduledClassesPanel = ({
  availableSubjects,
  scheduledClassIds,
  maps,
}: UnscheduledClassesPanelProps) => {
  return (
    <Box>
      <Typography
        variant="h6"
        gutterBottom
      >
        Zajęcia do zaplanowania
      </Typography>
      <Box sx={{ mt: 2, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
        {(availableSubjects || []).length > 0 ? (
          (availableSubjects || []).map((classItem: any, index: number) => {
            // Tworzymy unikalne ID dla "klocka" na podstawie kluczowych danych
            const uniqueId = `${classItem.subjectId}__${classItem.type}__${classItem.lecturerId}`;
            // Sprawdzamy, czy "klocek" o takim ID jest już na planie
            const isScheduled = scheduledClassIds.has(uniqueId);

            return (
              <DraggableClass
                key={`${uniqueId}-${index}`}
                id={`${uniqueId}__${index}`} // ID do przeciągania musi być unikalne
                classData={classItem}
                isScheduled={isScheduled}
                maps={maps}
              />
            );
          })
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Brak przedmiotów w wybranej siatce programowej.
          </Typography>
        )}
      </Box>
    </Box>
  );
};
