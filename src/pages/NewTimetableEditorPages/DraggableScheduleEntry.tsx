import React, { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Paper, Typography, Box, IconButton, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import type { ScheduleEntry, Specialization } from '../../features/timetable/types';

// ✅ POPRAWKA: Dodajemy `allSpecializations` do definicji propsów
interface DraggableScheduleEntryProps {
  entry: ScheduleEntry;
  onClick: (entry: ScheduleEntry) => void;
  isReadOnly: boolean;
  allSpecializations: Specialization[];
}

export const DraggableScheduleEntry: React.FC<DraggableScheduleEntryProps> = ({
  entry,
  onClick,
  isReadOnly,
  allSpecializations, // ✅ Odbieramy nowy prop
}) => {
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

  const assignedSpecializations = useMemo(() => {
    if (!entry.specializationIds || !allSpecializations) return [];
    const specMap = new Map(allSpecializations.map((s) => [s.id, s]));
    return entry.specializationIds.map((id) => specMap.get(id)).filter(Boolean) as Specialization[];
  }, [entry.specializationIds, allSpecializations]);

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
          Sala: {entry.roomName}
        </Typography>
      </Box>

      {assignedSpecializations.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {assignedSpecializations.map((spec) => (
            <Chip
              key={spec.id}
              label={spec.abbreviation || '?'}
              color="info"
              size="small"
            />
          ))}
        </Box>
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
