import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { ScheduleEntry, Timetable, Specialization, WorkloadRow, SemesterDate } from './types';
import { TIME_SLOTS, DAYS } from './constants';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DayOfWeek } from '../user/types';
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

// --- Funkcje eksportu ---

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
            .map((entry) => `${entry.subjectName}\n${entry.lecturerName}\nSala: ${entry.roomName}`)
            .join('\n---\n');
          row.push(cellEntries);
        }
        dataForSheet.push(row);
      }
    } else {
      const daysToDisplay: DayOfWeek[] = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
      const headers = ['Godzina', ...daysToDisplay];
      dataForSheet.push(headers);

      for (const timeSlot of TIME_SLOTS) {
        const row = [timeSlot.label];
        for (const day of daysToDisplay) {
          const cellEntries = entries
            .filter((e) => e.day === day && e.startTime === timeSlot.startTime)
            .map((entry) => `${entry.subjectName}\n${entry.lecturerName}\nSala: ${entry.roomName}`)
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

    if (isSessionBased) {
      const semesterDates = semesterDatesSnap.docs
        .map((doc) => doc.data() as SemesterDate)
        .sort((a, b) => a.date.toMillis() - b.date.toMillis());
      const entriesMap = new Map<string, ScheduleEntry[]>();
      entries.forEach((entry) => {
        if (!entry.date) return;
        const keyDate = normalizeDate(entry.date.toDate()).getTime();
        const mapKey = `${keyDate}_${entry.startTime}`;
        if (!entriesMap.has(mapKey)) entriesMap.set(mapKey, []);
        entriesMap.get(mapKey)?.push(entry);
      });

      const daysToGroup = 2;
      const groupedDates = [];
      for (let i = 0; i < semesterDates.length; i += daysToGroup) {
        groupedDates.push(semesterDates.slice(i, i + daysToGroup));
      }

      groupedDates.forEach((week, index) => {
        if (index > 0) doc.addPage();
        const weekDates = week.map((sd) => sd.date.toDate());
        const weekHeaders = week.map(
          (sd) =>
            `${DAYS[sd.date.toDate().getDay()]} (${sd.date
              .toDate()
              .toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })})`
        );
        const tableBody = [];
        for (const timeSlot of TIME_SLOTS) {
          const rowData = [timeSlot.label];
          for (const date of weekDates) {
            const keyDate = normalizeDate(date).getTime();
            const mapKey = `${keyDate}_${timeSlot.startTime}`;
            const cellEntries = (entriesMap.get(mapKey) || [])
              .map((entry) => {
                const specNumbers = (entry.specializationIds || [])
                  .map((id) => legendMap[id])
                  .filter(Boolean)
                  .join(',');
                let entryText = `${entry.subjectName} (${(entry.type || 'Z').slice(0, 1)})\n${
                  entry.lecturerName
                }\nSala: ${entry.roomName}`;
                if (specNumbers) entryText += `\n[Spec: ${specNumbers}]`;
                return entryText;
              })
              .join('\n---\n');
            rowData.push(cellEntries);
          }
          tableBody.push(rowData);
        }

        doc.text(`Plan zajęć: ${timetable.name} (Zjazd ${index + 1})`, 14, 15);
        autoTable(doc, {
          startY: 20,
          head: [['Godziny', ...weekHeaders]],
          body: tableBody,
          theme: 'grid',
          styles: { font: 'Roboto', fontSize: 8, valign: 'top' },
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
          },
        });
        if (legendText.length > 0) {
          const finalY = (doc as any).lastAutoTable.finalY;
          doc.setFontSize(9);
          doc.text('Legenda specjalizacji:', 14, finalY + 10);
          doc.text(legendText.join(' | '), 14, finalY + 15);
        }
      });
    } else {
      const daysToDisplay: DayOfWeek[] = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
      const tableBody = [];
      for (const timeSlot of TIME_SLOTS) {
        const rowData = [timeSlot.label];
        for (const day of daysToDisplay) {
          const cellEntries = entries
            .filter((e) => e.day === day && e.startTime === timeSlot.startTime)
            .map((entry) => {
              const specNumbers = (entry.specializationIds || [])
                .map((id) => legendMap[id])
                .filter(Boolean)
                .join(',');
              let entryText = `${entry.subjectName} (${(entry.type || 'Z').slice(0, 1)})\n${
                entry.lecturerName
              }\nSala: ${entry.roomName}`;
              if (specNumbers) entryText += `\n[Spec: ${specNumbers}]`;
              return entryText;
            })
            .join('\n---\n');
          rowData.push(cellEntries);
        }
        tableBody.push(rowData);
      }
      doc.text(`Plan zajęć: ${timetable.name}`, 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [['Godziny', ...daysToDisplay]],
        body: tableBody,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 8, valign: 'top' },
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
        },
      });
      if (legendText.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(9);
        doc.text('Legenda specjalizacji:', 14, finalY + 10);
        doc.text(legendText.join(' | '), 14, finalY + 15);
      }
    }

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
