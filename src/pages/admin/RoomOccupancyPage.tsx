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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { ScheduleEntry, Timetable, Room, Semester, DayOfWeek } from '../../features/timetable/types';
import { getSemesters } from '../../features/shared/dictionaryService';
import { TIME_SLOTS, DAYS } from '../../features/timetable/constants';
import toast from 'react-hot-toast';

export const RoomOccupancyPage = () => {
  const [loading, setLoading] = useState(true);
  const [allEntries, setAllEntries] = useState<ScheduleEntry[]>([]);
  const [allTimetables, setAllTimetables] = useState<Timetable[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Poniedziałek');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [entriesSnap, timetablesSnap, roomsSnap, semestersData] = await Promise.all([
          getDocs(collection(db, 'scheduleEntries')),
          getDocs(collection(db, 'timetables')),
          getDocs(collection(db, 'rooms')),
          getSemesters(),
        ]);

        setAllEntries(entriesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ScheduleEntry)));
        setAllTimetables(timetablesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Timetable)));
        setAllRooms(
          roomsSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as Room))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setSemesters(semestersData as Semester[]);

        if (semestersData.length > 0) {
          setSelectedSemesterId(semestersData[0].id);
        }
      } catch (err) {
        toast.error('Błąd pobierania danych do raportu.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ✅ POPRAWKA: Logika jest teraz bardziej zaawansowana.
  // Zamiast przechowywać jeden wpis, przechowuje tablicę wpisów dla każdej komórki.
  const occupancyData = useMemo(() => {
    if (!selectedSemesterId) return {};

    const timetablesInSemester = allTimetables.filter((t) => t.semesterId === selectedSemesterId);
    const timetableIds = new Set(timetablesInSemester.map((t) => t.id));

    const filteredEntries = allEntries.filter((e) => timetableIds.has(e.timetableId) && e.day === selectedDay);

    // Struktura danych: { '08:00': { 'sala_id': [entry1, entry2], ... }, ... }
    const grid: Record<string, Record<string, ScheduleEntry[]>> = {};
    filteredEntries.forEach((entry) => {
      const startTime = entry.startTime;
      const roomId = entry.roomId;

      if (!grid[startTime]) {
        grid[startTime] = {};
      }
      if (!grid[startTime][roomId]) {
        grid[startTime][roomId] = [];
      }
      grid[startTime][roomId].push(entry);
    });
    return grid;
  }, [selectedSemesterId, selectedDay, allEntries, allTimetables]);

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        gutterBottom
      >
        Raport Obłożenia Sal
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid
          container
          spacing={2}
          alignItems="center"
        >
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Wybierz semestr</InputLabel>
              <Select
                value={selectedSemesterId}
                label="Wybierz semestr"
                onChange={(e) => setSelectedSemesterId(e.target.value)}
              >
                {semesters.map((s) => (
                  <MenuItem
                    key={s.id}
                    value={s.id}
                  >
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Wybierz dzień</InputLabel>
              <Select
                value={selectedDay}
                label="Wybierz dzień"
                onChange={(e) => setSelectedDay(e.target.value as DayOfWeek)}
              >
                {DAYS.map((day) => (
                  <MenuItem
                    key={day}
                    value={day}
                  >
                    {day}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '120px', fontWeight: 'bold' }}>Godziny</TableCell>
              {allRooms.map((room) => (
                <TableCell
                  key={room.id}
                  align="center"
                  sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}
                >
                  {room.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {TIME_SLOTS.map((timeSlot) => (
              <TableRow
                key={timeSlot.startTime}
                hover
              >
                <TableCell sx={{ fontWeight: 'bold' }}>{timeSlot.label}</TableCell>
                {allRooms.map((room) => {
                  const entriesInCell = occupancyData[timeSlot.startTime]?.[room.id] || [];
                  const isConflict = entriesInCell.length > 1;

                  return (
                    <TableCell
                      key={room.id}
                      sx={{
                        border: '1px solid #eee',
                        p: 0.5,
                        // ✅ POPRAWKA: Logika kolorowania
                        backgroundColor: isConflict ? 'error.light' : entriesInCell.length > 0 ? '#e3f2fd' : 'inherit',
                      }}
                    >
                      {/* ✅ POPRAWKA: Mapujemy po tablicy wpisów w komórce */}
                      {entriesInCell.map((entry) => (
                        <Paper
                          key={entry.id}
                          elevation={0}
                          sx={{ p: 1, mb: 0.5, backgroundColor: 'transparent' }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                          >
                            {entry.subjectName}
                          </Typography>
                          <Typography
                            variant="caption"
                            display="block"
                          >
                            {entry.lecturerName}
                          </Typography>
                          <Typography
                            variant="caption"
                            display="block"
                          >
                            Gr: {entry.groupNames.join(', ')}
                          </Typography>
                        </Paper>
                      ))}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
