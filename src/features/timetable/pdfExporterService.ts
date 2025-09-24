import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { ScheduleEntry, Timetable, Specialization, DayOfWeek } from './types';
import { TIME_SLOTS } from './constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

// Funkcja pomocnicza do ładowania obrazów
const imageToBase64 = (url: string): Promise<string> =>
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Nie można załadować obrazu: ${response.statusText}`);
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

export const exportTimetableToPdf = async (timetable: Timetable) => {
  const toastId = toast.loading('Przygotowywanie danych do PDF...');

  try {
    // Krok 1: Pobierz wszystkie potrzebne dane równolegle
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

    // Krok 2: Zarejestruj czcionki
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

    // Krok 3: Stwórz mapę i legendę dla specjalizacji
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

    // Krok 4: Przygotuj dane do tabeli
    const tableBody = [];
    const daysToDisplay: DayOfWeek[] =
      timetable.studyMode === 'zaoczne' || timetable.studyMode === 'podyplomowe'
        ? ['Sobota', 'Niedziela']
        : ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];

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
            let entryText =
              `${entry.subjectName} (${entry.type.slice(0, 1)})\n` +
              `${entry.lecturerName}\n` +
              `Gr: ${entry.groupNames.join(', ')}\n` +
              `Sala: ${entry.roomName}`;
            if (specNumbers) {
              entryText += ` [Spec: ${specNumbers}]`;
            }
            return entryText;
          })
          .join('\n\n');
        rowData.push(cellEntries || '\n'); // Dodajemy `\n` aby wymusić wysokość pustej komórki
      }
      tableBody.push(rowData);
    }

    // Krok 5: Wygeneruj PDF
    doc.text(`Plan zajęć: ${timetable.name}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Rok akademicki: ${timetable.academicYear || ''} | Semestr: ${timetable.semesterName || ''}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['Godziny', ...daysToDisplay]],
      body: tableBody,
      theme: 'grid',
      styles: { font: 'Roboto', fontSize: 7, cellPadding: 1.5, valign: 'middle' },
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
