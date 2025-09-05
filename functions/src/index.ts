// Importujemy potrzebne moduły z pakietów Firebase
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

try {
  admin.initializeApp();
} catch (e) {
  logger.error('Błąd inicjalizaji Firebase admin SDK');
}
export const acceptApplicant = onCall(async (request) => {
  // Krok 1: Bezpieczeństwo - sprawdzamy, czy funkcję wywołuje uprawniony pracownik
  if (!request.auth || !['admin', 'pracownik_dziekanatu'].includes(request.auth.token.role as string)) {
    logger.error('Nieautoryzowana próba akceptacji kandydata przez:', request.auth?.uid);
    throw new HttpsError('permission-denied', 'Nie masz uprawnień do wykonania tej operacji.');
  }

  const { collectionName, applicationId } = request.data;
  if (!collectionName || !applicationId) {
    throw new HttpsError('invalid-argument', 'Brak wymaganych danych (collectionName, applicationId).');
  }

  try {
    const db = admin.firestore();

    // Krok 2: Pobierz dane kandydata z jego wniosku
    logger.info(`Pobieranie wniosku: ${collectionName}/${applicationId}`);
    const applicationRef = db.collection(collectionName).doc(applicationId);
    const applicationDoc = await applicationRef.get();

    if (!applicationDoc.exists) {
      throw new HttpsError('not-found', 'Nie znaleziono takiego wniosku.');
    }
    const applicantData = applicationDoc.data()!;

    // Krok 3: Stwórz nowe konto użytkownika w Firebase Authentication
    const tempPassword = Math.random().toString(36).slice(-8); // Generujemy losowe hasło tymczasowe
    logger.info(`Tworzenie konta w Authentication dla: ${applicantData.email}`);
    const userRecord = await admin.auth().createUser({
      email: applicantData.email,
      password: tempPassword,
      displayName: `${applicantData.firstName} ${applicantData.lastName}`,
    });

    // Krok 4: Ustaw rolę 'student' jako Custom Claim w tokenie
    logger.info(`Ustawianie roli 'student' dla UID: ${userRecord.uid}`);
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'student' });

    // Krok 5: Stwórz dokument dla nowego studenta w kolekcji 'users'
    logger.info(`Tworzenie dokumentu w Firestore w /users/${userRecord.uid}`);
    await db.collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: userRecord.displayName,
      role: 'student',
      // Możemy tu dodać inne domyślne pola, np. pustą grupę
      groupId: '',
      groupName: '',
    });

    // Krok 6: Zaktualizuj status oryginalnego wniosku
    logger.info(`Aktualizacja statusu wniosku na 'zaakceptowany'`);
    await applicationRef.update({
      status: 'zaakceptowany',
    });

    // Krok 7 (Cel na przyszłość): Wysyłka e-maila powitalnego
    // Tutaj w przyszłości zintegrujemy usługę do wysyłki e-maili, np. SendGrid,
    // aby wysłać studentowi jego hasło tymczasowe.
    logger.info(`PROCES ZAKOŃCZONY. Należy teraz ręcznie wysłać e-mail do studenta z hasłem: ${tempPassword}`);

    // Krok 8: Zwróć sukces do aplikacji
    return {
      status: 'success',
      message: `Student ${userRecord.displayName} został pomyślnie utworzony i zaakceptowany.`,
    };
  } catch (error: any) {
    logger.error('Błąd krytyczny podczas akceptacji kandydata:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Wystąpił nieoczekiwany błąd serwera.');
  }
});
// export const acceptApplicant = onCall(async (request) => {});
// // Tworzymy i eksportujemy naszą pierwszą funkcję "wywoływalną" (Callable Function)
// export const submitApplication = onCall((request) => {
//   // `request.auth` zawiera informacje o zalogowanym użytkowniku, który wywołał funkcję.
//   // To jest bezpieczne - Firebase samo weryfikuje tożsamość.
//   if (!request.auth) {
//     logger.error('Użytkownik nie jest uwierzytelniony.');
//     return { status: 'error', message: 'Brak autoryzacji.' };
//   }

//   // Pobieramy dane wysłane z naszej aplikacji React
//   const studentName = request.data.studentName || 'Nieznany student';
//   const studentId = request.data.studentId || 'Brak ID';

//   // Logujemy informację w konsoli Cloud Functions (będziemy mogli to podejrzeć w panelu Firebase)
//   logger.info(`Otrzymano wniosek od: ${studentName} (ID: ${studentId})`);

//   // Na razie nie robimy nic więcej, tylko odsyłamy odpowiedź o sukcesie
//   // W przyszłości tutaj dodamy logikę wysyłki e-mail i zapisu do bazy.

//   // Odsyłamy odpowiedź z powrotem do aplikacji React
//   return {
//     status: 'success',
//     message: `Wniosek od ${studentName} został pomyślnie przyjęty przez serwer!`,
//   };
// });
