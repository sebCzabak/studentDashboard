import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Paper, Typography, Box, Chip } from '@mui/material';
import { type CurriculumSubject } from '../../features/timetable/types';

interface DraggableClassProps {
  subject: CurriculumSubject;
  isUsed: boolean;
  isReadOnly: boolean;
}

export const DraggableClass: React.FC<DraggableClassProps> = ({ subject, isUsed, isReadOnly }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: subject.id,
    data: {
      type: 'new-subject',
      subject: subject,
    },
    disabled: isUsed || isReadOnly,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 }
    : undefined;

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      elevation={2}
      sx={{
        p: 1.5,
        mb: 1.5,
        cursor: isUsed ? 'not-allowed' : 'grab',
        opacity: isUsed ? 0.5 : 1,
        backgroundColor: isUsed ? 'grey.200' : 'background.paper',
        borderLeft: '5px solid',
        borderColor: 'primary.main',
        '&:hover': {
          boxShadow: !isUsed ? 3 : 2,
        },
      }}
    >
      <Typography
        variant="body1"
        fontWeight="bold"
      >
        {subject.subjectName}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
      >
        {subject.lecturerName}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <Chip
          label={subject.type}
          size="small"
          color="secondary"
        />
        <Typography variant="caption">{subject.hours}h</Typography>
      </Box>
    </Paper>
  );
};
