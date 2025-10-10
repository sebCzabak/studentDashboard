import React, { useState, useMemo } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { DndContext, type DragEndEvent, type DragStartEvent, useDroppable } from '@dnd-kit/core';
import {
  Grid,
  Box,
  CircularProgress,
  Typography,
  Button,
  Alert,
  Paper,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import toast from 'react-hot-toast';
import { useTimetableData } from './hooks/useTimetableData';
import { getEntriesForLecturer } from '../../features/timetable/scheduleService';
import { UnscheduledClassesPanel } from './UnscheduledClassesPanel';
import { ScheduleEntryFormModal } from '../../features/timetable/components/ScheduleEntryFormModal';
import { DraggableScheduleEntry } from './DraggableScheduleEntry';
import { TIME_SLOTS, DAYS } from '../../features/timetable/constants';
import type { CurriculumSubject, ScheduleEntry, DayOfWeek } from '../../features/timetable/types';
import { Timestamp } from 'firebase/firestore';
import { TimetableGrid } from './TimetableGrid';

// Funkcje pomocnicze
const getEndTime = (startTime: string): string => {
  const durationInMinutes = 90;
  const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() + durationInMinutes);
  return date.toTimeString().slice(0, 5);
};
const formatDate = (date: Date) => date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });

// Wewnętrzny komponent komórki dla widoku zjazdowego
const SessionDroppableCell: React.FC<{ date: Date; time: string; children?: React.ReactNode }> = ({
  date,
  time,
  children,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `${date.toISOString()}-${time}`,
    data: { date, time },
  });
  return (
    <TableCell
      ref={setNodeRef}
      sx={{
        border: '1px solid rgba(224, 224, 224, 1)',
        verticalAlign: 'top',
        height: '100px',
        backgroundColor: isOver ? 'action.hover' : 'inherit',
      }}
    >
      {children}
    </TableCell>
  );
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
    specializations,
    semesterDates,
    loading,
    error,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
  } = useTimetableData(timetableId);

  const [activeLecturerId, setActiveLecturerId] = useState<string | null>(null);
  const [conflictingEntries, setConflictingEntries] = useState<ScheduleEntry[]>([]);
  const [modalData, setModalData] = useState<(Partial<ScheduleEntry> & { subject?: CurriculumSubject }) | null>(null);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);

  const isPublished = timetable?.status === 'published';
  const studyMode = timetable?.studyMode || 'stacjonarne';

  const groupedSessions = useMemo(() => {
    const sortedDates = semesterDates.sort((a, b) => a.date.toMillis() - b.date.toMillis());
    const daysToGroup = 2; // Dla zaocznych i podyplomowych zawsze grupujemy po 2 dni
    const chunks = [];
    for (let i = 0; i < sortedDates.length; i += daysToGroup) {
      chunks.push(sortedDates.slice(i, i + daysToGroup));
    }
    return chunks;
  }, [semesterDates]);

  const currentSession = useMemo(() => groupedSessions[currentSessionIndex], [groupedSessions, currentSessionIndex]);
  const handleNextSession = () => setCurrentSessionIndex((prev) => Math.min(prev + 1, groupedSessions.length - 1));
  const handlePrevSession = () => setCurrentSessionIndex((prev) => Math.max(prev - 1, 0));

  const availableSpecializationsForTimetable = useMemo(() => {
    if (!timetable?.groupIds || !specializations) return [];
    const relevantGroupIds = new Set(timetable.groupIds);
    return specializations.filter((spec) => relevantGroupIds.has(spec.groupId));
  }, [timetable, specializations]);

  const handleDragStart = (event: DragStartEvent) => {
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
      getEntriesForLecturer(lecturerId)
        .then(setConflictingEntries)
        .catch(() => toast.error('Błąd pobierania kolizji.'));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLecturerId(null);
    setConflictingEntries([]);
    if (isPublished || !event.over) return;

    const { active, over } = event;
    const isSessionBasedMode = studyMode === 'podyplomowe' || studyMode === 'niestacjonarne';

    if (isSessionBasedMode && currentSession) {
      if (active.data.current?.type === 'new-subject') {
        const subject = active.data.current?.subject as CurriculumSubject;
        const { date, time } = over.data.current as { date: Date; time: string };
        const dayOfWeek = DAYS[date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1];

        const sessionForThisDate = semesterDates.find(
          (sd) => sd.date.toDate().toISOString().split('T')[0] === date.toISOString().split('T')[0]
        );

        const newEntryData: Partial<ScheduleEntry> & { subject: CurriculumSubject } = {
          subject,
          timetableId: timetableId!,
          subjectId: subject.subjectId,
          lecturerId: subject.lecturerId,
          type: subject.type,
          day: dayOfWeek,
          startTime: time,
          endTime: getEndTime(time),
          subjectName: subject.subjectName,
          lecturerName: subject.lecturerName,
          curriculumSubjectId: subject.id,
          date: Timestamp.fromDate(date),
          format: sessionForThisDate?.format || 'stacjonarny',
        };
        setModalData(newEntryData);
      }
    } else {
      const [day, time] = over.id.toString().split('-') as [DayOfWeek, string];
      if (active.data.current?.type === 'new-subject') {
        const subject = active.data.current?.subject as CurriculumSubject;
        setModalData({
          subjectName: subject.subjectName,
          day,
          lecturerName: subject.lecturerName,
          startTime: time,
          timetableId: timetableId!,
        });
      } else if (active.data.current?.type === 'existing-entry') {
        const entryToMove = active.data.current?.entry as ScheduleEntry;
        if (entryToMove.day === day && entryToMove.startTime === time) return;

        const promise = updateScheduleEntry(entryToMove.id, {
          day,
          startTime: time,
          endTime: getEndTime(time),
        });
        toast.promise(promise, { loading: 'Przenoszenie...', success: 'Przeniesiono!', error: 'Błąd.' });
      }
    }
  };

  const handleOpenEditModal = (entry: ScheduleEntry) => {
    if (!isPublished) setModalData(entry);
  };
  const handleCloseModals = () => setModalData(null);

  const handleSave = async (data: Partial<ScheduleEntry>) => {
    const finalData = { ...modalData, ...data };
    const promise = modalData?.id
      ? updateScheduleEntry(modalData.id, data)
      : addScheduleEntry(finalData as Omit<ScheduleEntry, 'id'>);

    await toast.promise(promise, { loading: 'Zapisywanie...', success: 'Zapisano!', error: (err) => err.message });
    handleCloseModals();
  };

  const handleDeleteEntry = async () => {
    // Sprawdzamy, czy w modalu znajdują się dane zajęć do usunięcia
    if (!modalData?.id) return;

    // Prosimy użytkownika o potwierdzenie
    if (window.confirm('Czy na pewno chcesz usunąć te zajęcia z planu?')) {
      const promise = deleteScheduleEntry(modalData.id);

      // Używamy toast.promise do obsługi stanu operacji
      await toast.promise(promise, {
        loading: 'Usuwanie zajęć...',
        success: 'Usunięto zajęcia z planu.',
        error: (err) => `Wystąpił błąd: ${err.message}`,
      });

      // Zamykamy modal po zakończeniu operacji
      handleCloseModals();
    }
  };

  if (loading || !timetable) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  const isSessionBasedMode = studyMode === 'podyplomowe' || studyMode === 'niestacjonarne';

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ p: 3, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Button
            component={RouterLink}
            to="/admin/timetableList"
            startIcon={<ArrowBackIcon />}
          >
            Wróć do listy planów
          </Button>
          <Typography variant="h5">{timetable.name}</Typography>
          <Box sx={{ width: 150 }} />
        </Box>
        {isPublished && (
          <Alert
            severity="warning"
            sx={{ my: 2 }}
          >
            Edycja jest zablokowana.
          </Alert>
        )}

        {isSessionBasedMode ? (
          <>
            <Paper sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <IconButton
                onClick={handlePrevSession}
                disabled={currentSessionIndex === 0}
              >
                <ArrowLeftIcon fontSize="large" />
              </IconButton>
              <Box textAlign="center">
                <Typography variant="h6">
                  {currentSession ? `Zjazd ${currentSessionIndex + 1}` : 'Zdefiniuj daty zjazdów'}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  {currentSession?.map((d) => d.date.toDate().toLocaleDateString('pl-PL')).join('  |  ')}
                </Typography>
              </Box>
              <IconButton
                onClick={handleNextSession}
                disabled={currentSessionIndex >= groupedSessions.length - 1}
              >
                <ArrowRightIcon fontSize="large" />
              </IconButton>
            </Paper>
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
                <TableContainer component={Paper}>
                  <Table sx={{ tableLayout: 'fixed' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '120px' }}>Godzina</TableCell>
                        {(currentSession || []).map(({ date }) => (
                          <TableCell
                            key={date.toMillis()}
                            align="center"
                            sx={{ fontWeight: 'bold' }}
                          >
                            {DAYS[date.toDate().getUTCDay() === 0 ? 6 : date.toDate().getUTCDay() - 1]} (
                            {formatDate(date.toDate())})
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {TIME_SLOTS.map((timeSlot) => (
                        <TableRow key={timeSlot.startTime}>
                          <TableCell sx={{ fontWeight: 'bold' }}>{timeSlot.label}</TableCell>
                          {(currentSession || []).map(({ date }) => {
                            const dateOnly = date.toDate().toISOString().split('T')[0];
                            const entriesInCell = scheduleEntries.filter(
                              (e) =>
                                e.date?.toDate().toISOString().split('T')[0] === dateOnly &&
                                e.startTime === timeSlot.startTime
                            );
                            return (
                              <SessionDroppableCell
                                key={date.toString()}
                                date={date.toDate()}
                                time={timeSlot.startTime}
                              >
                                {entriesInCell.map((entry) => (
                                  <DraggableScheduleEntry
                                    key={entry.id}
                                    entry={entry}
                                    onClick={handleOpenEditModal}
                                    isReadOnly={isPublished}
                                    allSpecializations={specializations}
                                  />
                                ))}
                              </SessionDroppableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </>
        ) : (
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
                onEntryClick={handleOpenEditModal}
                activeLecturerId={activeLecturerId}
                lecturerAvailability={lecturerAvailability}
                conflictingEntries={conflictingEntries}
                isReadOnly={isPublished}
                studyMode={studyMode}
                allSpecializations={specializations}
              />
            </Grid>
          </Grid>
        )}
      </Box>

      {modalData && (
        <ScheduleEntryFormModal
          open={!!modalData}
          onClose={handleCloseModals}
          onSave={handleSave}
          onDelete={modalData.id ? handleDeleteEntry : undefined}
          initialData={modalData}
          availableGroups={groups}
          availableRooms={rooms}
          availableSpecializations={availableSpecializationsForTimetable}
          availableSessions={semesterDates}
        />
      )}
    </DndContext>
  );
};
