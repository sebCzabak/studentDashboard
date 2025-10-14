import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type {
  ScheduleEntry,
  Timetable,
  Specialization,
  DayOfWeek,
  WorkloadRow,
  Semester,
  SemesterDate,
  EntryType,
} from './types';
import { TIME_SLOTS, DAYS } from './constants';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Helper Functions ---

const imageToBase64 = (url: string): Promise<string> =>
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Nie można załadować obrazu: ${url}`);
      return response.blob();
    })
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );

const normalizeDate = (date: Date): Date => {
  const newDate = new Date(date.valueOf());
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const getTypeAbbreviation = (type: EntryType | undefined | null): string => {
  if (!type) return 'Z';
  switch (type) {
    case 'Wykład':
      return 'W';
    case 'Ćwiczenia':
      return 'Ć';
    case 'Laboratorium':
      return 'L';
    case 'Seminarium':
      return 'S';
    case 'Inne':
      return 'I';
    default:
      return 'Z';
  }
};

// --- Export Functions ---

export const exportTimetableToExcel = async (timetable: Timetable) => {
  const toastId = toast.loading('Przygotowywanie danych do Excela...');
  try {
    const entriesRef = collection(db, 'scheduleEntries');
    const q = query(entriesRef, where('timetableId', '==', timetable.id));
    const entriesSnapshot = await getDocs(q);
    const entries = entriesSnapshot.docs.map((doc) => doc.data() as ScheduleEntry);

    if (entries.length === 0) {
      toast.error('Ten plan nie zawiera jeszcze żadnych zajęć.', { id: toastId });
      return;
    }

    toast.loading('Generowanie pliku .xlsx...', { id: toastId });

    const isSessionBased = timetable.studyMode === 'niestacjonarne' || timetable.studyMode === 'podyplomowe';
    const dataForSheet: (string | number)[][] = [];

    if (isSessionBased) {
      const semesterDatesSnap = await getDocs(
        query(collection(db, 'semesterDates'), where('semesterId', '==', timetable.semesterId))
      );
      const semesterDates = semesterDatesSnap.docs
        .map((doc) => doc.data() as SemesterDate)
        .sort((a, b) => a.date.toMillis() - b.date.toMillis());
      const uniqueDates = Array.from(
        new Set(semesterDates.map((sd) => sd.date.toDate().toISOString().split('T')[0]))
      ).map((d) => new Date(d));

      const headers = [
        'Godzina',
        ...uniqueDates.map((d) =>
          d.toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit' })
        ),
      ];
      dataForSheet.push(headers);

      for (const timeSlot of TIME_SLOTS) {
        const row = [timeSlot.label];
        for (const date of uniqueDates) {
          const dateOnly = date.toISOString().split('T')[0];
          const cellEntries = entries
            .filter(
              (e) => e.date?.toDate().toISOString().split('T')[0] === dateOnly && e.startTime === timeSlot.startTime
            )
            .map((entry) => {
              let entryText = `${entry.subjectName}\n${entry.lecturerName}\nSala: ${entry.roomName}`;
              if (entry.notes) entryText += `\nNotatki: ${entry.notes}`;
              return entryText;
            })
            .join('\n---\n');
          row.push(cellEntries);
        }
        dataForSheet.push(row);
      }
    } else {
      const daysToDisplay: DayOfWeek[] =
        timetable.studyMode === 'niestacjonarne'
          ? ['Sobota', 'Niedziela']
          : ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

      const headers = ['Godzina', ...daysToDisplay];
      dataForSheet.push(headers);

      for (const timeSlot of TIME_SLOTS) {
        const row = [timeSlot.label];
        for (const day of daysToDisplay) {
          const cellEntries = entries
            .filter((e) => e.day === day && e.startTime === timeSlot.startTime)
            .map((entry) => {
              const datesText =
                entry.specificDates && entry.specificDates.length > 0
                  ? `\nDaty: ${entry.specificDates.map((ts) => ts.toDate().toLocaleDateString('pl-PL')).join(', ')}`
                  : '';
              let entryText = `${entry.subjectName}\n${entry.lecturerName}\nSala: ${entry.roomName}${datesText}`;
              if (entry.notes) entryText += `\nNotatki: ${entry.notes}`;
              return entryText;
            })
            .join('\n---\n');
          row.push(cellEntries);
        }
        dataForSheet.push(row);
      }
    }

    const worksheet = XLSX.utils.aoa_to_sheet(dataForSheet);
    worksheet['!cols'] = [{ wch: 12 }, ...dataForSheet[0].slice(1).map(() => ({ wch: 40 }))];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: R };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        if (!worksheet[cell_ref]) continue;
        if (!worksheet[cell_ref].s) worksheet[cell_ref].s = {};
        worksheet[cell_ref].s.alignment = { wrapText: true, vertical: 'top' };
      }
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plan Zajęć');
    XLSX.writeFile(workbook, `plan_zajec_${timetable.name.replace(/ /g, '_')}.xlsx`);
    toast.success('Plik Excel został wygenerowany!', { id: toastId });
  } catch (error) {
    console.error('Błąd generowania Excela:', error);
    toast.error('Nie udało się wygenerować pliku.', { id: toastId });
  }
};

export const exportTimetableToPdf = async (timetable: Timetable) => {
  const toastId = toast.loading('Przygotowywanie danych do PDF...');
  try {
    // Step 1: Fetch all necessary data in parallel
    const [entriesSnapshot, specializationsSnapshot, semesterDatesSnap, logoBase64, fontResponse, boldFontResponse] =
      await Promise.all([
        getDocs(query(collection(db, 'scheduleEntries'), where('timetableId', '==', timetable.id))),
        getDocs(collection(db, 'specializations')),
        getDocs(query(collection(db, 'semesterDates'), where('semesterId', '==', timetable.semesterId))),
        imageToBase64('/images/logo-watermark.png'),
        fetch('/fonts/Roboto-Regular.ttf'),
        fetch('/fonts/Roboto-Bold.ttf'),
      ]);

    const entries = entriesSnapshot.docs.map((doc) => doc.data() as ScheduleEntry);
    if (entries.length === 0) {
      toast.error('Ten plan nie zawiera jeszcze żadnych zajęć.', { id: toastId });
      return;
    }

    const allSpecializations = specializationsSnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Specialization)
    );

    toast.loading('Generowanie pliku PDF...', { id: toastId });
    const doc = new jsPDF({ orientation: 'landscape' });

    // Step 2: Register fonts for Polish characters
    const fontBuffer = await fontResponse.arrayBuffer();
    const boldFontBuffer = await boldFontResponse.arrayBuffer();
    const fontBase64 = btoa(new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
    const boldFontBase64 = btoa(
      new Uint8Array(boldFontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', boldFontBase64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    doc.setFont('Roboto', 'normal');

    // Step 3: Create specialization legend
    const usedSpecIds = new Set(entries.flatMap((e) => e.specializationIds || []));
    const legendMap: Record<string, number> = {};
    const legendText: string[] = [];
    let legendCounter = 1;
    allSpecializations.forEach((spec) => {
      if (usedSpecIds.has(spec.id)) {
        legendMap[spec.id] = legendCounter;
        legendText.push(`${legendCounter}. ${spec.name} (${spec.abbreviation})`);
        legendCounter++;
      }
    });

    const isSessionBased = timetable.studyMode === 'niestacjonarne' || timetable.studyMode === 'podyplomowe';

    // Step 4: Build the table headers and body based on study mode
    let tableHeaders: string[] = [];
    const tableBody: string[][] = [];

    if (isSessionBased) {
      // Logic for DATE-BASED schedules (zaoczne/podyplomowe)
      const semesterDates = semesterDatesSnap.docs
        .map((doc) => doc.data() as SemesterDate)
        .sort((a, b) => a.date.toMillis() - b.date.toMillis());
      const uniqueDates = Array.from(
        new Set(semesterDates.map((sd) => sd.date.toDate().toISOString().split('T')[0]))
      ).map((d) => new Date(d));

      if (uniqueDates.length === 0) {
        toast.error('Brak zdefiniowanych dat w Kalendarzu Semestru dla tego planu.', { id: toastId });
        return;
      }

      tableHeaders = [
        'Godziny',
        ...uniqueDates.map(
          (date) => `${DAYS[date.getDay()]} (${date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })})`
        ),
      ];

      for (const timeSlot of TIME_SLOTS) {
        const rowData = [timeSlot.pdfLabel];
        for (const date of uniqueDates) {
          const dateOnly = date.toISOString().split('T')[0];
          const cellEntries = entries
            .filter(
              (e) => e.date?.toDate().toISOString().split('T')[0] === dateOnly && e.startTime === timeSlot.startTime
            )
            .map((entry) => {
              const specNumbers = (entry.specializationIds || [])
                .map((id) => legendMap[id])
                .filter(Boolean)
                .join(',');
              const typeAbbr = getTypeAbbreviation(entry.type);
              let entryText = `${entry.subjectName} (${typeAbbr})\n${entry.lecturerName}\nSala: ${entry.roomName}`;
              if (specNumbers) entryText += `\n[Spec: ${specNumbers}]`;
              if (entry.notes) entryText += `\nNotatki: ${entry.notes}`;
              return entryText;
            })
            .join('\n---\n');
          rowData.push(cellEntries);
        }
        tableBody.push(rowData);
      }
    } else {
      // Logic for DAY-BASED schedules (stacjonarne/anglojęzyczne)
      const daysToDisplay: DayOfWeek[] = ['Sobota', 'Niedziela'];
      tableHeaders = ['Godziny', ...daysToDisplay];

      for (const timeSlot of TIME_SLOTS) {
        const rowData = [timeSlot.pdfLabel];
        for (const day of daysToDisplay) {
          const cellEntries = entries
            .filter((e) => e.day === day && e.startTime === timeSlot.startTime)
            .map((entry) => {
              const specNumbers = (entry.specializationIds || [])
                .map((id) => legendMap[id])
                .filter(Boolean)
                .join(',');
              const typeAbbr = getTypeAbbreviation(entry.type);
              const datesText =
                entry.specificDates && entry.specificDates.length > 0
                  ? `\nDaty: ${entry.specificDates.map((ts) => ts.toDate().toLocaleDateString('pl-PL')).join(', ')}`
                  : '';
              let entryText = `${entry.subjectName} (${typeAbbr})\n${entry.lecturerName}\nSala: ${entry.roomName}`;
              if (specNumbers) entryText += `\n[Spec: ${specNumbers}]`;
              if (entry.notes) entryText += `\nNotatki: ${entry.notes}`;
              if (datesText) entryText += datesText;
              return entryText;
            })
            .join('\n---\n');
          rowData.push(cellEntries);
        }
        tableBody.push(rowData);
      }
    }

    // Step 5: Generate the PDF
    doc.text(`Plan zajęć: ${timetable.name}`, 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [tableHeaders],
      body: tableBody,
      theme: 'grid',
      styles: { font: 'Roboto', fontSize: 7, valign: 'top', cellPadding: 2 },
      headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: [44, 62, 80], textColor: 255 },
      didDrawPage: (data) => {
        try {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.saveGraphicsState();
          doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
          doc.addImage(logoBase64, 'PNG', (pageWidth - 100) / 2, (pageHeight - 100) / 2, 100, 100);
          doc.restoreGraphicsState();
        } catch (e) {
          console.error('Błąd znaku wodnego', e);
        }

        if (legendText.length > 0) {
          const finalY = (doc as any).lastAutoTable.finalY;
          if (finalY < doc.internal.pageSize.getHeight() - 20) {
            // Draw only if there's space
            doc.setFontSize(9);
            doc.text('Legenda specjalizacji:', 14, finalY + 10);
            doc.text(legendText, 14, finalY + 15);
          }
        }
      },
    });

    doc.save(`plan_zajec_${timetable.name.replace(/ /g, '_')}.pdf`);
    toast.success('PDF został wygenerowany!', { id: toastId });
  } catch (error) {
    console.error('Błąd generowania PDF:', error);
    toast.error('Nie udało się wygenerować PDF.', { id: toastId });
  }
};

export const exportWorkloadReportToPdf = async (
  reportData: WorkloadRow[],
  allTypes: string[],
  fileNameDetails: { year: string; semester: string }
) => {
  const toastId = toast.loading('Generowanie PDF z raportem...');
  try {
    const [logoBase64, fontResponse, boldFontResponse] = await Promise.all([
      imageToBase64('/images/logo-watermark.png'),
      fetch('/fonts/Roboto-Regular.ttf'),
      fetch('/fonts/Roboto-Bold.ttf'),
    ]);

    const doc = new jsPDF();

    const fontBuffer = await fontResponse.arrayBuffer();
    const boldFontBuffer = await boldFontResponse.arrayBuffer();
    const fontBase64 = btoa(new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
    const boldFontBase64 = btoa(
      new Uint8Array(boldFontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', boldFontBase64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    const headers = ['Prowadzący', 'Przedmiot', 'Tryb', ...allTypes.map((t) => `${t} (h)`), 'Suma (h)'];
    const body = reportData.map((row) => [
      row.lecturerName,
      row.subjectName,
      row.studyMode,
      ...allTypes.map((type) => row.hours[type] || 0),
      row.totalHours,
    ]);

    doc.text(`Raport obciążenia prowadzących`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Rok akademicki: ${fileNameDetails.year} | Semestr: ${fileNameDetails.semester}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [headers],
      body: body,
      styles: { font: 'Roboto' },
      headStyles: { font: 'Roboto', fontStyle: 'bold' },
      didDrawPage: (data) => {
        try {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const imgWidth = 80;
          const imgHeight = 80;
          const x = (pageWidth - imgWidth) / 2;
          const y = (pageHeight - imgHeight) / 2;
          doc.saveGraphicsState();
          doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
          doc.addImage(logoBase64, 'PNG', x, y, imgWidth, imgHeight);
          doc.restoreGraphicsState();
        } catch (e) {
          console.warn('Błąd podczas dodawania znaku wodnego.', e);
        }
      },
    });

    const fileName = `raport_obciazenia_${fileNameDetails.year.replace('/', '-')}_${fileNameDetails.semester.replace(
      / /g,
      '_'
    )}`;
    doc.save(`${fileName}.pdf`);
    toast.success('PDF został wygenerowany!', { id: toastId });
  } catch (error) {
    console.error('Błąd generowania PDF:', error);
    toast.error('Nie udało się wygenerować PDF.', { id: toastId });
  }
};
