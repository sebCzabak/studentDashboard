// src/pages/TimetableEditorPage/DraggableScheduleEntry.tsx

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Paper, Typography, Box, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { type ScheduleEntry } from '../../features/timetable/types';

interface DraggableScheduleEntryProps {
  entry: ScheduleEntry;
  onClick: (entry: ScheduleEntry) => void;
  isReadOnly: boolean;
}

export const DraggableScheduleEntry: React.FC<DraggableScheduleEntryProps> = ({ entry, onClick, isReadOnly }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: entry.id,
    data: { type: 'existing-entry', entry: entry },
    disabled: isReadOnly,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 }
    : undefined;

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClick(entry);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    event.stopPropagation();
  };

  // ✅ Tworzymy listę dat do wyświetlenia w tooltipie
  const datesTooltip = entry.specificDates?.map((ts) => ts.toDate().toLocaleDateString('pl-PL')).join('\n');

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      elevation={2}
      sx={{
        position: 'relative',
        p: 1,
        my: 0.5,
        textAlign: 'left',
        backgroundColor: 'primary.light',
        color: 'primary.contrastText',
        cursor: isReadOnly ? 'not-allowed' : 'grab',
        '&:hover': { backgroundColor: 'primary.dark', '& .edit-icon': { opacity: 1 } },
      }}
    >
      <Box>
        <Typography
          variant="body2"
          fontWeight="bold"
        >
          {entry.subjectName}
        </Typography>
        <Typography variant="caption">{entry.lecturerName}</Typography>
        <br />
        <Typography
          variant="caption"
          color="inherit"
        >
          {(entry.groupNames || []).join(', ')}
        </Typography>
        <br />
        <Typography
          variant="caption"
          color="inherit"
        >
          Sala: {entry.roomName}
        </Typography>
      </Box>

      {/* ✅ Wyświetlamy ikonkę kalendarza, jeśli są zdefiniowane konkretne daty */}
      {entry.specificDates && entry.specificDates.length > 0 && (
        <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{datesTooltip}</div>}>
          <CalendarTodayIcon
            sx={{ position: 'absolute', bottom: 4, right: 4, fontSize: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}
          />
        </Tooltip>
      )}

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
            color: 'primary.contrastText',
            backgroundColor: 'rgba(0,0,0,0.2)',
            opacity: 0,
            transition: 'opacity 0.2s',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.4)' },
          }}
        >
          <EditIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      )}
    </Paper>
  );
};
