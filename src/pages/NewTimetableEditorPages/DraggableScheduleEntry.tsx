import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Paper, Typography, Box, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { type ScheduleEntry } from '../../features/timetable/types';

interface DraggableScheduleEntryProps {
  entry: ScheduleEntry;
  onClick: (entry: ScheduleEntry) => void;
  isReadOnly: boolean;
}

export const DraggableScheduleEntry: React.FC<DraggableScheduleEntryProps> = ({ entry, onClick, isReadOnly }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: entry.id,
    data: {
      type: 'existing-entry',
      entry: entry,
      disabled: isReadOnly,
    },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 }
    : undefined;

  const handleEditClick = () => {
    onClick(entry);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    event.stopPropagation();
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      elevation={2}
      sx={{
        position: 'relative',
        p: 0.5,
        mb: 0.5,
        backgroundColor: 'secondary.main',
        color: 'secondary.contrastText',
        cursor: 'grab',
        '&:hover': {
          backgroundColor: 'secondary.dark',
          '& .edit-icon': { opacity: 1 },
        },
      }}
    >
      <Box>
        <Typography
          variant="caption"
          display="block"
          fontWeight="bold"
        >
          {entry.subjectName} ({entry.type.slice(0, 1)})
        </Typography>
        <Typography
          variant="caption"
          display="block"
        >
          {entry.lecturerName.split(' ').pop()}
        </Typography>
        <Typography
          variant="caption"
          display="block"
        >
          {entry.groupNames.join(', ')} / {entry.roomName}
        </Typography>
      </Box>
      {!isReadOnly && (
        <IconButton
          className="edit-icon"
          size="small"
          onClick={handleEditClick}
          onPointerDown={handlePointerDown}
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            color: 'secondary.contrastText',
            backgroundColor: 'rgba(0,0,0,0.2)',
            opacity: 0,
            transition: 'opacity 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.4)',
            },
          }}
        >
          <EditIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      )}
    </Paper>
  );
};
