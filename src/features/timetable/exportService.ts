import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { ScheduleEntry, Timetable, Specialization, DayOfWeek, WorkloadRow, Semester } from './types';
import { TIME_SLOTS } from './constants';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Funkcja pomocnicza do ładowania obrazów
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

    const daysToDisplay: DayOfWeek[] =
      timetable.studyMode?.includes('zaoczne') || timetable.studyMode?.includes('podyplomowe')
        ? ['Sobota', 'Niedziela']
        : ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

    const dataForSheet = [];
    dataForSheet.push(['Godzina', ...daysToDisplay]);

    for (const timeSlot of TIME_SLOTS) {
      const row = [timeSlot.label];
      for (const day of daysToDisplay) {
        const cellEntries = entries
          .filter((e) => e.day === day && e.startTime === timeSlot.startTime)
          .map(
            (entry) =>
              `${entry.subjectName} (${entry.type.slice(0, 1)})\n` +
              `${entry.lecturerName}\n` +
              `Gr: ${entry.groupNames.join(', ')}\n` +
              `Sala: ${entry.roomName}`
          )
          .join('\n---\n');
        row.push(cellEntries);
      }
      dataForSheet.push(row);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(dataForSheet);
    worksheet['!cols'] = [{ wch: 12 }, ...daysToDisplay.map(() => ({ wch: 40 }))];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plan Zajęć');
    XLSX.writeFile(workbook, `plan_zajec_${timetable.name.replace(/ /g, '_')}.xlsx`);
    toast.success('Plik Excel został wygenerowany!', { id: toastId });
  } catch (error) {
    toast.error('Nie udało się wygenerować pliku.', { id: toastId });
  }
};

export const exportTimetableToPdf = async (timetable: Timetable) => {
  const toastId = toast.loading('Przygotowywanie danych do PDF...');
  try {
    const [entriesSnapshot, specializationsSnapshot, logoBase64, fontResponse, boldFontResponse] = await Promise.all([
      getDocs(query(collection(db, 'scheduleEntries'), where('timetableId', '==', timetable.id))),
      getDocs(collection(db, 'specializations')),
      imageToBase64('/images/logo-watermark.png'),
      fetch('/fonts/Roboto-Regular.ttf'),
      fetch('/fonts/Roboto-Bold.ttf'),
    ]);

    const entries = entriesSnapshot.docs.map((doc) => doc.data() as ScheduleEntry);
    const allSpecializations = specializationsSnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as Specialization)
    );

    if (entries.length === 0) {
      toast.error('Ten plan nie zawiera jeszcze żadnych zajęć.', { id: toastId });
      return;
    }

    toast.loading('Generowanie pliku PDF...', { id: toastId });
    const doc = new jsPDF({ orientation: 'landscape' });

    // Rejestracja czcionek
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

    // Tworzenie legendy
    const usedSpecIds = new Set(entries.flatMap((e) => e.specializationIds || []));
    const legendMap: Record<string, number> = {};
    const legendText: string[] = [];
    let legendCounter = 1;
    allSpecializations.forEach((spec) => {
      if (usedSpecIds.has(spec.id)) {
        legendMap[spec.id] = legendCounter;
        legendText.push(`${legendCounter}. ${spec.name}`);
        legendCounter++;
      }
    });
    const gridMap = new Map<string, ScheduleEntry[]>();
    entries.forEach((entry) => {
      const key = `${entry.day}-${entry.startTime}`;
      if (!gridMap.has(key)) {
        gridMap.set(key, []);
      }
      gridMap.get(key)?.push(entry);
    });

    const tableBody: (string | string[])[][] = [];
    const daysToDisplay: DayOfWeek[] =
      timetable.studyMode === 'zaoczne' || timetable.studyMode === 'podyplomowe'
        ? ['Sobota', 'Niedziela']
        : ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

    for (const timeSlot of TIME_SLOTS) {
      const rowData = [timeSlot.label];
      for (const day of daysToDisplay) {
        // ✅ KROK 2: Pobieramy zajęcia dla komórki z naszej mapy
        const cellEntries = gridMap.get(`${day}-${timeSlot.startTime}`) || [];

        // ✅ KROK 3: Tworzymy jeden, sformatowany string dla komórki
        const cellText = cellEntries
          .map((entry) => {
            const specNumbers = (entry.specializationIds || [])
              .map((id) => legendMap[id])
              .filter(Boolean)
              .join(',');
            let entryText = `${entry.subjectName}\n` + `${entry.lecturerName}\n` + `Sala: ${entry.roomName}`;
            if (specNumbers) {
              entryText += `\n[Spec: ${specNumbers}]`;
            }
            return entryText;
          })
          .join('\n---\n'); // Oddzielamy różne zajęcia w tej samej komórce
        rowData.push(cellText);
      }
      tableBody.push(rowData);
    }

    doc.text(`Plan zajęć: ${timetable.name}`, 14, 15);
    doc.setFontSize(9);

    autoTable(doc, {
      startY: 28,
      head: [['Godziny', ...daysToDisplay]],
      body: tableBody,
      theme: 'grid',
      styles: { font: 'Roboto', fontSize: 7, valign: 'top', cellPadding: 1.4 },
      headStyles: { font: 'Roboto', fontStyle: 'bold', fillColor: [44, 62, 80], textColor: 255 },

      didDrawPage: (data) => {
        try {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const imgWidth = 100;
          const imgHeight = 100;
          const x = (pageWidth - imgWidth) / 2;
          const y = (pageHeight - imgHeight) / 2;
          doc.saveGraphicsState();
          doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
          doc.addImage(logoBase64, 'PNG', x, y, imgWidth, imgHeight);
          doc.restoreGraphicsState();
        } catch (e) {
          console.error('Błąd podczas dodawania znaku wodnego:', e);
        }
      },
    });

    if (legendText.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(9);
      doc.text('Legenda specjalizacji:', 14, finalY + 10);
      doc.text(legendText, 14, finalY + 15);
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
