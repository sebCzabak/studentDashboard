import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Paper, Typography, Box, Chip, Badge } from '@mui/material';
import { type CurriculumSubject } from '../../features/timetable/types';

interface DraggableClassProps {
  subject: CurriculumSubject;
  isUsed: boolean;
  isReadOnly: boolean;
  usageCount?: number;
  isDoubleBlock?: boolean;
}

export const DraggableClass: React.FC<DraggableClassProps> = ({
  subject,
  isUsed,
  isReadOnly,
  usageCount = 0,
  isDoubleBlock = false,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: subject.id,
    data: {
      type: 'new-subject',
      subject: subject,
    },
    disabled: isReadOnly, // Nie blokuj przeciągania nawet jeśli jest użyty
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
        cursor: isReadOnly ? 'not-allowed' : 'grab',
        opacity: isUsed ? 0.6 : 1, // Wyszarzanie dla użytych przedmiotów
        backgroundColor: isUsed ? 'grey.200' : 'background.paper',
        borderLeft: '5px solid',
        borderColor: isDoubleBlock ? 'warning.main' : 'primary.main', // Pomarańczowa ramka dla podwójnego bloku
        borderWidth: isDoubleBlock ? '6px' : '5px',
        position: 'relative',
        '&:hover': {
          boxShadow: !isReadOnly ? 3 : 2,
          opacity: isUsed ? 0.8 : 1, // Lekkie rozjaśnienie przy hover
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="body1"
            fontWeight="bold"
            sx={{ textDecoration: isDoubleBlock ? 'underline' : 'none' }}
          >
            {subject.subjectName}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {subject.lecturerName}
          </Typography>
        </Box>
        {isDoubleBlock && (
          <Badge
            badgeContent={usageCount}
            color="warning"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.75rem',
                fontWeight: 'bold',
              },
            }}
          >
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: 'warning.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'warning.contrastText' }}
              >
                {usageCount}x
              </Typography>
            </Box>
          </Badge>
        )}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <Chip
          label={subject.type}
          size="small"
          color="secondary"
        />
        {isDoubleBlock && (
          <Typography
            variant="caption"
            color="warning.main"
            sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
          >
            {usageCount === 2 ? 'Podwójny blok' : `${usageCount}x blok`}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
