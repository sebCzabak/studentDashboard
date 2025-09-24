import { useMemo, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { DndContext, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { Grid, Box, CircularProgress, Typography, Button, Alert, AlertTitle, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import toast from 'react-hot-toast';
import { useTimetableData } from './hooks/useTimetableData';
import { getEntriesForLecturer } from '../../features/timetable/scheduleService';
import { UnscheduledClassesPanel } from './UnscheduledClassesPanel';
import { TimetableGrid } from './TimetableGrid';
import { DropConfirmationModal } from './DropConfirmationModal';
import { ScheduleEntryFormModal } from '../../features/timetable/components/ScheduleEntryFormModal';
import type { CurriculumSubject, ScheduleEntry, DayOfWeek } from '../../features/timetable/types';

const getEndTime = (startTime: string): string => {
  const durationInMinutes = 90;
  const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() + durationInMinutes);
  return date.toTimeString().slice(0, 5);
};

export const NewTimetableEditorPage = () => {
  const { timetableId } = useParams<{ timetableId: string }>();
  // ✅ Pobieramy funkcje do modyfikacji danych z naszego hooka
  const {
    timetable,
    curriculumSubjects,
    scheduleEntries,
    groups,
    rooms,
    lecturerAvailability,
    loading,
    error,
    specializations,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
  } = useTimetableData(timetableId);

  const [activeLecturerId, setActiveLecturerId] = useState<string | null>(null);
  const [conflictingEntries, setConflictingEntries] = useState<ScheduleEntry[]>([]);

  // ✅ Używamy dwóch oddzielnych, jasnych stanów: jeden dla tworzenia, drugi dla edycji
  const [dropData, setDropData] = useState<{ subject: CurriculumSubject; day: DayOfWeek; time: string } | null>(null);
  const [editData, setEditData] = useState<ScheduleEntry | null>(null);

  const specializationLegend = useMemo(() => {
    const legend: Record<string, number> = {};
    let count = 1;
    // Można by to pobierać dynamicznie, ale dla uproszczenia filtrujemy te używane w planie
    const relevantSpecIds = new Set(scheduleEntries.flatMap((e) => e.specializationIds || []));
    specializations.forEach((spec) => {
      if (relevantSpecIds.has(spec.id)) {
        legend[spec.id] = count++;
      }
    });
    return legend;
  }, [scheduleEntries, specializations]);

  const isPublished = timetable?.status === 'published';
  const studyMode = timetable?.studyMode || 'stacjonarny';

  const handleDragStart = async (event: DragStartEvent) => {
    if (isPublished) return;
    const { active } = event;
    let lecturerId: string | null = null;
    if (active.data.current?.type === 'new-subject') {
      lecturerId = active.data.current?.subject?.lecturerId;
    } else if (active.data.current?.type === 'existing-entry') {
      lecturerId = active.data.current?.entry?.lecturerId;
    }
    setActiveLecturerId(lecturerId);
    if (lecturerId) {
      try {
        const conflicts = await getEntriesForLecturer(lecturerId);
        setConflictingEntries(conflicts);
      } catch {
        toast.error('Nie udało się pobrać danych o kolizjach.');
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (isPublished) return;
    const { active, over } = event;
    setActiveLecturerId(null);
    setConflictingEntries([]);
    if (!over) return;
    const [day, time] = over.id.toString().split('-') as [DayOfWeek, string];
    const activeDataType = active.data.current?.type;

    if (activeDataType === 'new-subject') {
      const subject = active.data.current?.subject as CurriculumSubject;
      if (day && time && subject) {
        setDropData({ subject, day, time });
      }
    }

    if (activeDataType === 'existing-entry') {
      const entryToMove = active.data.current?.entry as ScheduleEntry;
      if (entryToMove.day === day && entryToMove.startTime === time) return;

      const promise = updateScheduleEntry(entryToMove.id, { day, startTime: time, endTime: getEndTime(time) });

      toast.promise(promise, {
        loading: 'Przenoszenie zajęć...',
        success: 'Zajęcia zostały przeniesione!',
        error: (err) => `Błąd: ${err.message}`,
      });
    }
  };

  const handleOpenEditModal = (entry: ScheduleEntry) => {
    if (isPublished) return;
    setEditData(entry);
  };

  const handleCloseModals = () => {
    setDropData(null);
    setEditData(null);
  };

  const handleConfirmDrop = async (details: { groupIds: string[]; roomId: string }) => {
    if (!dropData || !timetableId) return;
    const { subject, day, time } = dropData;
    const selectedGroups = groups.filter((g) => details.groupIds.includes(g.id));
    const room = rooms.find((r) => r.id === details.roomId);

    if (!selectedGroups.length || !room) {
      toast.error('Błąd danych.');
      return;
    }

    const newEntryData = {
      timetableId,
      subjectId: subject.subjectId,
      lecturerId: subject.lecturerId,
      type: subject.type,
      groupIds: details.groupIds,
      roomId: details.roomId,
      day,
      startTime: time,
      endTime: getEndTime(time),
      subjectName: subject.subjectName,
      lecturerName: subject.lecturerName,
      groupNames: selectedGroups.map((g) => g.name),
      roomName: room.name,
      curriculumSubjectId: subject.id,
    };

    await toast.promise(addScheduleEntry(newEntryData as Omit<ScheduleEntry, 'id'>), {
      loading: 'Zapisywanie...',
      success: 'Zajęcia dodane!',
      error: (err) => err.message,
    });

    handleCloseModals();
  };

  const handleSaveEdit = async (entryData: Partial<ScheduleEntry>) => {
    if (!editData?.id) return;
    await toast.promise(updateScheduleEntry(editData.id, entryData), {
      loading: 'Aktualizowanie zajęć...',
      success: 'Zmiany zapisane!',
      error: (err) => err.message,
    });
    handleCloseModals();
  };

  const handleDeleteEntry = async () => {
    if (!editData?.id) return;
    if (window.confirm('Czy na pewno chcesz usunąć te zajęcia?')) {
      await toast.promise(deleteScheduleEntry(editData.id), {
        loading: 'Usuwanie...',
        success: 'Zajęcia usunięte.',
        error: (err) => err.message,
      });
      handleCloseModals();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Wczytywanie edytora...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography
          variant="h6"
          color="error"
        >
          Wystąpił błąd
        </Typography>
        <Typography color="error.secondary">{error}</Typography>
      </Box>
    );
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ p: 3, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Button
            component={RouterLink}
            to="/admin/TimetableList"
            startIcon={<ArrowBackIcon />}
          >
            Wróć do listy planów
          </Button>
          <Typography variant="h5">{timetable?.name}</Typography>
        </Box>

        {isPublished && (
          <Alert
            severity="warning"
            sx={{ my: 2 }}
          >
            <AlertTitle>Plan jest opublikowany</AlertTitle>
            Edycja jest zablokowana. Aby wprowadzić zmiany, zmień status planu na "roboczy".
          </Alert>
        )}

        <Grid
          container
          spacing={2}
          sx={{ mt: 0.5 }}
        >
          <Grid size={{ xs: 12, md: 3 }}>
            <UnscheduledClassesPanel
              subjects={curriculumSubjects}
              entries={scheduleEntries}
              isReadOnly={isPublished}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 9 }}>
            <TimetableGrid
              entries={scheduleEntries}
              activeLecturerId={activeLecturerId}
              lecturerAvailability={lecturerAvailability}
              conflictingEntries={conflictingEntries}
              onEntryClick={handleOpenEditModal}
              isReadOnly={isPublished}
              studyMode={studyMode}
            />
          </Grid>
        </Grid>
        {Object.keys(specializationLegend).length > 0 && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6">Legenda specjalizacji</Typography>
            {specializations
              .filter((s) => specializationLegend[s.id])
              .map((s) => (
                <Typography
                  key={s.id}
                  variant="body2"
                >
                  {specializationLegend[s.id]}. {s.name}
                </Typography>
              ))}
          </Paper>
        )}
      </Box>

      {dropData && (
        <DropConfirmationModal
          open={!!dropData}
          onClose={handleCloseModals}
          onSubmit={handleConfirmDrop}
          initialData={dropData}
          availableGroups={groups}
          availableRooms={rooms}
        />
      )}

      {editData && (
        <ScheduleEntryFormModal
          open={!!editData}
          onClose={handleCloseModals}
          onSave={handleSaveEdit}
          onDelete={handleDeleteEntry}
          initialData={editData}
          availableGroups={groups}
          availableRooms={rooms}
          availableSpecializations={[]}
        />
      )}
    </DndContext>
  );
};
