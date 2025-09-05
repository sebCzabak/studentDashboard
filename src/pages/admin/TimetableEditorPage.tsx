import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Grid,
} from '@mui/material';
import { useParams, Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DndContext, type DragEndEvent, useDroppable, type DragStartEvent } from '@dnd-kit/core';
import { type ScheduleEntry } from '../../features/timetable/types';
import {
  getScheduleEntries,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  getTimetableById,
} from '../../features/timetable/scheduleService';
import { getCurriculumById, getAllSubjects } from '../../features/curriculums/curriculumsService';
import { getAllLecturers, groupsService } from '../../features/shared/dictionaryService';
import { getAllRooms } from '../../features/rooms/roomService';
import { UnscheduledClassesPanel } from '../../features/timetable/components/UnscheduledClassesPanel';
import { DropConfirmationModal } from '../../features/timetable/components/DropConfirmationModal';
import { ScheduleEntryFormModal } from '../../features/timetable/components/ScheduleEntryFormModal';
import toast from 'react-hot-toast';

// Wewnętrzny komponent dla komórki tabeli (bez zmian)
const DroppableCell = ({
  day,
  timeSlot,
  isHighlighted,
  children,
}: {
  day: string;
  timeSlot: string;
  isHighlighted: boolean;
  children: React.ReactNode;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: `${day}__${timeSlot}` });
  const backgroundColor = isOver ? 'action.hover' : isHighlighted ? 'success.light' : 'transparent';
  return (
    <TableCell
      ref={setNodeRef}
      align="center"
      sx={{
        verticalAlign: 'top',
        p: 0.5,
        height: '120px',
        border: '1px solid #eee',
        backgroundColor: backgroundColor,
        transition: 'background-color 0.2s ease-in-out',
      }}
    >
      {children}
    </TableCell>
  );
};

export const TimetableEditorPage = () => {
  const { timetableId } = useParams<{ timetableId: string }>();

  const [timetable, setTimetable] = useState<any>(null);
  const [curriculum, setCurriculum] = useState<any>(null);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dropData, setDropData] = useState<any>(null);
  const [editData, setEditData] = useState<any>(null);
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    if (!timetableId) return;
    try {
      setLoading(true);
      const timetableData = await getTimetableById(timetableId);
      if (!timetableData || !timetableData.curriculumId) {
        toast.error('Błąd: Ten plan nie ma przypisanej siatki programowej!');
        setLoading(false);
        return;
      }
      setTimetable(timetableData);

      const [entries, curriculumData, allSubjects, allLecturers, allGroups, allRooms] = await Promise.all([
        getScheduleEntries(timetableId),
        getCurriculumById(timetableData.curriculumId),
        getAllSubjects(),
        getAllLecturers(),
        groupsService.getAll(),
        getAllRooms(),
      ]);

      setScheduleEntries(entries);
      setCurriculum(curriculumData);
      setSubjects(allSubjects);
      setLecturers(allLecturers);
      setGroups(allGroups);
      setRooms(allRooms);
    } catch (error) {
      toast.error('Błąd pobierania danych dla kreatora planu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timetableId]);

  const maps = useMemo(
    () => ({
      subjects: subjects.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {}),
      lecturers: lecturers.reduce((acc, l) => ({ ...acc, [l.id]: l.displayName }), {}),
      groups: groups.reduce((acc, g) => ({ ...acc, [g.id]: g.name }), {}),
      rooms: rooms.reduce((acc, r) => ({ ...acc, [r.id]: r.name }), {}),
    }),
    [subjects, lecturers, groups, rooms]
  );

  const availableGroupsForTimetable = useMemo(() => {
    if (!groups || !timetable) return [];
    return groups.filter((g) => timetable.groupIds?.includes(g.id));
  }, [groups, timetable]);

  const availableSubjectsForTimetable = useMemo(() => {
    if (!curriculum || !timetable) return [];
    const semester = curriculum.semesters?.find((s: any) => s.semesterId === timetable.semesterId);
    return semester?.subjects || [];
  }, [curriculum, timetable]);

  const scheduledClassIds = useMemo(() => {
    const ids = new Set<string>();
    scheduleEntries.forEach((entry) => {
      const classData = availableSubjectsForTimetable.find((s: any) => s.subjectId === entry.subjectId);
      if (classData) {
        const uniqueId = `${entry.subjectId}__${classData.type}__${entry.lecturerId}`;
        ids.add(uniqueId);
      }
    });
    return ids;
  }, [scheduleEntries, availableSubjectsForTimetable]);

  const daysOfWeek = useMemo(() => {
    switch (timetable?.studyMode) {
      case 'zaoczny':
        return ['Sobota', 'Niedziela'];
      case 'podyplomowe':
        return ['Piątek', 'Sobota', 'Niedziela'];
      default:
        return ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
    }
  }, [timetable]);

  const timeSlots = useMemo(() => {
    return ['08:00-09:30', '09:45-11:15', '11:30-13:00', '13:30-15:00', '15:15-16:45', '17:00-18:30', '18:45-20:15'];
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const classData = active.data.current;
    if (classData?.lecturerId) {
      const lecturer = lecturers.find((l) => l.id === classData.lecturerId);
      if (lecturer?.availability) {
        const availableSlots = new Set<string>();
        lecturer.availability.forEach((slot: { day: string; timeSlot: string }) => {
          availableSlots.add(`${slot.day}__${slot.timeSlot}`);
        });
        setHighlightedCells(availableSlots);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setHighlightedCells(new Set());
    const { over, active } = event;
    if (over && active) {
      setDropData({ active, over });
    }
  };

  const handleConfirmDrop = async ({ groupId, roomId }: { groupId: string; roomId: string }) => {
    if (!dropData || !timetableId) return;
    const { active, over } = dropData;
    const classData = active.data.current;
    const [day, timeSlot] = over.id.toString().split('__');
    const entryData = {
      timetableId,
      subjectId: classData.subjectId,
      lecturerId: classData.lecturerId,
      type: classData.type,
      groupIds: [groupId],
      roomId,
      dayOfWeek: day,
      timeSlot,
    };
    const promise = createScheduleEntry(entryData as any);
    await toast.promise(promise, {
      loading: 'Sprawdzanie konfliktów...',
      success: () => {
        fetchData();
        setDropData(null);
        return 'Zajęcia dodane!';
      },
      error: (err) => err.message || 'Wystąpił błąd.',
    });
  };

  const handleEntryClick = (entry: ScheduleEntry) => {
    setEditData(entry);
  };
  const handleCloseModals = () => {
    setDropData(null);
    setEditData(null);
  };

  const handleSaveEdit = async (entryData: any) => {
    const promise = updateScheduleEntry(editData.id, entryData);
    await toast.promise(promise, {
      loading: 'Zapisywanie zmian...',
      success: () => {
        fetchData();
        handleCloseModals();
        return 'Zajęcia zaktualizowane!';
      },
      error: (err) => err.message,
    });
  };

  const handleDeleteEntry = async () => {
    if (window.confirm('Czy na pewno chcesz usunąć te zajęcia?')) {
      const promise = deleteScheduleEntry(editData.id);
      await toast.promise(promise, {
        loading: 'Usuwanie...',
        success: () => {
          fetchData();
          handleCloseModals();
          return 'Zajęcia usunięte.';
        },
        error: (err) => err.message,
      });
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Paper sx={{ p: 3, width: '100%', maxWidth: '1800px' }}>
          <Button
            component={RouterLink}
            to="/admin/timetables"
            startIcon={<ArrowBackIcon />}
            sx={{ mb: 2 }}
          >
            Wróć do listy planów
          </Button>
          <Typography
            variant="h4"
            gutterBottom
          >
            Kreator Planu Zajęć: {timetable?.name}
          </Typography>
          <Grid
            container
            spacing={2}
            sx={{ mt: 1 }}
          >
            <Grid size={{ xs: 12, lg: 3 }}>
              <Paper
                variant="outlined"
                sx={{ p: 2, height: '100%' }}
              >
                <UnscheduledClassesPanel
                  availableSubjects={availableSubjectsForTimetable}
                  scheduledClassIds={scheduledClassIds}
                  maps={maps}
                />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, lg: 9 }}>
              <TableContainer
                component={Paper}
                variant="outlined"
              >
                <Table sx={{ tableLayout: 'fixed' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Godziny</TableCell>
                      {daysOfWeek.map((day) => (
                        <TableCell
                          key={day}
                          align="center"
                          sx={{ fontWeight: 'bold' }}
                        >
                          {day}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {timeSlots.map((timeSlot) => (
                      <TableRow key={timeSlot}>
                        <TableCell
                          component="th"
                          scope="row"
                        >
                          {timeSlot}
                        </TableCell>
                        {daysOfWeek.map((day) => {
                          const entry = scheduleEntries.find((e) => e.dayOfWeek === day && e.timeSlot === timeSlot);
                          const cellId = `${day}__${timeSlot}`;
                          const isHighlighted = highlightedCells.has(cellId);

                          return (
                            <DroppableCell
                              key={day}
                              day={day}
                              timeSlot={timeSlot}
                              isHighlighted={isHighlighted}
                            >
                              {entry && (
                                <Paper
                                  onClick={() => handleEntryClick(entry)}
                                  elevation={2}
                                  sx={{
                                    p: 1,
                                    height: '100%',
                                    textAlign: 'left',
                                    backgroundColor: 'primary.light',
                                    color: 'primary.contrastText',
                                    cursor: 'pointer',
                                    '&:hover': { backgroundColor: 'primary.dark' },
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                  >
                                    {maps.subjects[entry.subjectId]}
                                  </Typography>
                                  <Typography variant="caption">{maps.lecturers[entry.lecturerId]}</Typography>
                                  <br />
                                  {/* ================== POPRAWKA TUTAJ ================== */}
                                  <Typography
                                    variant="caption"
                                    color="inherit"
                                  >
                                    {/* Iterujemy po tablicy ID, szukamy nazw i łączymy je przecinkiem */}
                                    {(entry.groupIds || []).map((id) => maps.groups[id]).join(', ')}
                                  </Typography>
                                  <br />
                                  {/* ================================================ */}
                                  <Typography
                                    variant="caption"
                                    color="inherit"
                                  >
                                    Sala: {maps.rooms[entry.roomId]}
                                  </Typography>
                                </Paper>
                              )}
                            </DroppableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
          <DropConfirmationModal
            open={!!dropData}
            onClose={() => setDropData(null)}
            onConfirm={handleConfirmDrop}
            dropData={dropData}
            availableGroups={availableGroupsForTimetable}
            availableRooms={rooms}
            maps={maps}
          />
          {editData && (
            <ScheduleEntryFormModal
              open={!!editData}
              onClose={handleCloseModals}
              onSave={handleSaveEdit}
              onDelete={handleDeleteEntry}
              initialData={editData}
              availableSubjects={availableSubjectsForTimetable}
              availableGroups={availableGroupsForTimetable}
              availableRooms={rooms}
              lecturersMap={maps.lecturers}
              subjectsMap={maps.subjects}
            />
          )}
        </Paper>
      </Box>
    </DndContext>
  );
};
