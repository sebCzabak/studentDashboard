import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { Grid, Box, CircularProgress, Typography, Button, Alert, AlertTitle } from '@mui/material';
import toast from 'react-hot-toast';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getEntriesForLecturer } from '../../features/timetable/scheduleService';
import { UnscheduledClassesPanel } from './UnscheduledClassesPanel';
import { TimetableGrid } from './TimetableGrid';
import { DropConfirmationModal } from './DropConfirmationModal';
import { useTimetableData } from './hooks/useTimetableData';
import type { CurriculumSubject, ScheduleEntry, DayOfWeek } from '../../features/timetable/types';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';

const getEndTime = (startTime: string): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() + 90);
  return date.toTimeString().slice(0, 5);
};

export const NewTimetableEditorPage = () => {
  const { timetableId } = useParams<{ timetableId: string }>();
  const {
    timetable,
    curriculumSubjects,
    scheduleEntries,
    groups,
    rooms,
    lecturerAvailability,
    loading,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    error,
  } = useTimetableData(timetableId);
  const isPublished = timetable?.status === 'published';
  const [activeLecturerId, setActiveLecturerId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    mode: 'new' | 'edit';
    data: ScheduleEntry | { subject: CurriculumSubject; day: DayOfWeek; time: string };
  } | null>(null);
  const [conflictingEntries, setConflictingEntries] = useState<ScheduleEntry[]>([]);

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
        setModalState({ mode: 'new', data: { subject, day, time } });
      }
    }

    if (activeDataType === 'existing-entry') {
      const entryToMove = active.data.current?.entry as ScheduleEntry;
      if (entryToMove.day === day && entryToMove.startTime === time) return;

      const promise = new Promise<void>(async (resolve, reject) => {
        try {
          const entriesRef = collection(db, 'scheduleEntries');
          const q = query(entriesRef, where('day', '==', day), where('startTime', '==', time));
          const querySnapshot = await getDocs(q);

          for (const doc of querySnapshot.docs) {
            if (doc.id === entryToMove.id) continue;
            const existingEntry = doc.data() as ScheduleEntry;
            if (existingEntry.lecturerId === entryToMove.lecturerId) {
              reject(new Error(`Prowadzący ${existingEntry.lecturerName} jest już zajęty.`));
              return;
            }
            if (existingEntry.roomId === entryToMove.roomId) {
              reject(new Error(`Sala ${existingEntry.roomName} jest już zajęta.`));
              return;
            }
            const conflictingGroup = groups.find(
              (g) => entryToMove.groupIds.includes(g.id) && existingEntry.groupIds.includes(g.id)
            );
            if (conflictingGroup) {
              reject(new Error(`Grupa ${conflictingGroup.name} ma już inne zajęcia.`));
              return;
            }
          }
          await updateScheduleEntry(entryToMove.id, { day, startTime: time, endTime: getEndTime(time) });
          resolve();
        } catch (e) {
          reject(e);
        }
      });

      toast.promise(promise, {
        loading: 'Przenoszenie zajęć...',
        success: 'Zajęcia zostały przeniesione!',
        error: (err) => `Błąd: ${err.message}`,
      });
    }
  };

  const handleEntryClick = (entry: ScheduleEntry) => {
    setModalState({ mode: 'edit', data: entry });
  };

  const handleModalSubmit = async (details: { groupIds: string[]; roomId: string }) => {
    if (!modalState) return;

    const selectedGroups = groups.filter((g) => details.groupIds.includes(g.id));
    const room = rooms.find((r) => r.id === details.roomId);

    if (selectedGroups.length === 0 || !room) {
      toast.error('Proszę wybrać przynajmniej jedną grupę i salę.');
      return;
    }

    const promise = new Promise<void>(async (resolve, reject) => {
      try {
        if (modalState.mode === 'new') {
          const { subject, day, time } = modalState.data as {
            subject: CurriculumSubject;
            day: DayOfWeek;
            time: string;
          };

          if (!subject.lecturerId || subject.lecturerId === 'Brak ID') {
            return reject(new Error('Przedmiotowi nie przypisano prowadzącego.'));
          }

          const entriesRef = collection(db, 'scheduleEntries');
          const q = query(entriesRef, where('day', '==', day), where('startTime', '==', time));
          const querySnapshot = await getDocs(q);

          for (const doc of querySnapshot.docs) {
            const entry = doc.data() as ScheduleEntry;
            if (entry.lecturerId === subject.lecturerId)
              return reject(new Error(`Prowadzący ${subject.lecturerName} jest już zajęty.`));
            if (entry.roomId === room.id) return reject(new Error(`Sala ${room.name} jest już zajęta.`));
            const conflictingGroup = selectedGroups.find((g) => entry.groupIds?.includes(g.id));
            if (conflictingGroup) return reject(new Error(`Grupa ${conflictingGroup.name} ma już inne zajęcia.`));
          }

          const newEntry = {
            day,
            startTime: time,
            endTime: getEndTime(time),
            subjectId: subject.subjectId,
            subjectName: subject.subjectName,
            lecturerId: subject.lecturerId,
            lecturerName: subject.lecturerName,
            type: subject.type,
            groupIds: selectedGroups.map((g) => g.id),
            groupNames: selectedGroups.map((g) => g.name),
            roomId: room.id,
            roomName: room.name,
            curriculumSubjectId: subject.id,
          };
          await addScheduleEntry(newEntry);
        } else {
          // tryb 'edit'
          const entryToUpdate = modalState.data as ScheduleEntry;
          // Tutaj również można dodać sprawdzanie kolizji dla edycji
          await updateScheduleEntry(entryToUpdate.id, {
            groupIds: selectedGroups.map((g) => g.id),
            groupNames: selectedGroups.map((g) => g.name),
            roomId: room.id,
            roomName: room.name,
          });
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    toast.promise(promise, {
      loading: 'Zapisywanie...',
      success: modalState.mode === 'new' ? 'Dodano nowe zajęcia!' : 'Zajęcia zostały zaktualizowane!',
      error: (err) => `Błąd zapisu: ${err.message.includes('permission-denied') ? 'Brak uprawnień.' : err.message}`,
    });

    setModalState(null);
  };

  const handleModalDelete = async () => {
    if (modalState && modalState.mode === 'edit') {
      const entryId = (modalState.data as ScheduleEntry).id;
      const promise = deleteScheduleEntry(entryId);

      toast.promise(promise, {
        loading: 'Usuwanie zajęć...',
        success: 'Usunięto zajęcia z planu.',
        error: 'Wystąpił błąd podczas usuwania.',
      });

      setModalState(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Wczytywanie...</Typography>
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
        <Button
          component={RouterLink}
          to="/admin/TimetableList"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Wróć do listy planów
        </Button>
        {isPublished && (
          <Alert
            severity="warning"
            sx={{ mt: 2 }}
          >
            <AlertTitle>Plan jest opublikowany</AlertTitle>
            Ten plan został opublikowany i jest widoczny dla studentów. Edycja jest zablokowana. Aby wprowadzić zmiany,
            zmień jego status na "roboczy" w liście planów.
          </Alert>
        )}
        <Grid
          container
          spacing={2}
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
              onEntryClick={handleEntryClick}
              isReadOnly={isPublished}
            />
          </Grid>
        </Grid>
      </Box>

      {modalState && (
        <DropConfirmationModal
          open={!!modalState}
          onClose={() => setModalState(null)}
          onSubmit={handleModalSubmit}
          onDelete={modalState.mode === 'edit' ? handleModalDelete : undefined}
          initialData={modalState.data}
          availableGroups={groups}
          availableRooms={rooms}
        />
      )}
    </DndContext>
  );
};
