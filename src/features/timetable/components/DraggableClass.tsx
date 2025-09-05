// src/features/timetable/components/DraggableClass.tsx
import { Paper, Typography } from '@mui/material';
import { useDraggable } from '@dnd-kit/core';

interface DraggableClassProps {
  id: string;
  classData: any;
  isScheduled: boolean;
  maps: any;
}

export const DraggableClass = ({ id, classData, isScheduled, maps }: DraggableClassProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    data: classData,
    disabled: isScheduled, // Wyłącz przeciąganie, jeśli zajęcia są już na planie
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999, // Upewnij się, że przeciągany element jest na wierzchu
      }
    : undefined;

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      elevation={3}
      sx={{
        p: 1,
        mb: 1,
        cursor: isScheduled ? 'not-allowed' : 'grab',
        opacity: isScheduled ? 0.4 : 1, // "Wyszaryzowanie", jeśli zajęcia są na planie
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        '&:hover': {
          backgroundColor: isScheduled ? 'primary.main' : 'primary.dark',
        },
      }}
    >
      <Typography
        variant="body2"
        fontWeight="bold"
      >
        {maps.subjects[classData.subjectId]} ({classData.type})
      </Typography>
      <Typography variant="caption">{maps.lecturers[classData.lecturerId]}</Typography>
    </Paper>
  );
};
