import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Komponenty Layoutu i Zabezpieczeń
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';

// Główne Strony
import { LoginPage } from './pages/LoginPage';
import { CalendarPage } from './pages/CalendarPage';
import { GradesPage } from './pages/GradesPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { NewsPage } from './pages/NewsPage';
import { SettingsPage } from './pages/SettingsPage';

//admin
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminNewsPage } from './pages/admin/AdminNewsPage';
import { ManageStudentsPage } from './pages/admin/ManageStudentsPage';
import { ManageSubmissionsPage } from './pages/admin/ManageSubmissionsPage';
import { GradingPage } from './pages/admin/GradingPage';
import { ManageFeeSchedulesPage } from './pages/admin/ManageFeeSchedulesPage';
import { ManageGroupsPage } from './pages/admin/ManageGroupsPage';
import { ManageCurriculumsPage } from './pages/admin/ManageCurriculumsPage';

// Strony Dokumentów
import { ScholarshipApplicationPage } from './pages/documents/ScholarshipApplication';
import { ManagePaymentsPage } from './pages/admin/ManagePaymentsPage';
import { ManageRecruitmentPage } from './pages/admin/ManageRecruitmentPage';
import { ApplicationDetailPage } from './pages/admin/ApplicationDetailPage';
import { ManageSemestersPage } from './pages/admin/ManageSemestersPage';
import { ManageSubjectsPage } from './pages/admin/ManageSubjectsPage';
import { ManageDictionariesPage } from './pages/admin/ManageDictionariesPage';
import { NewTimetableEditorPage } from './pages/NewTimetableEditorPages/NewTimetableEditorPage';
import { TimetablesListPage } from './pages/admin/TimetableListPage';
import { MyTimetablePage } from './pages/MyTimetablePage';
import { ManageUsersPage } from './pages/admin/ManageUsersPage';
import { LecturerWorkloadReportPage } from './pages/admin/LecturersWorkloadReportPage';
import { PrintableSchedulePage } from './pages/admin/PrintableSchedulePage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="bottom-right" />
        <Routes>
          {/* Trasa publiczna, dostępna dla każdego */}
          <Route
            path="/login"
            element={<LoginPage />}
          />

          {/* ================================================================== */}
          {/* Trasy dla zalogowanego studenta, opakowane w główny layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* "index" oznacza stronę, która wyświetli się pod adresem "/" */}
            <Route
              index
              element={<CalendarPage />}
            />

            <Route
              path="news"
              element={<NewsPage />}
            />
            <Route
              path="grades"
              element={<GradesPage />}
            />
            <Route
              path="payments"
              element={<PaymentsPage />}
            />
            <Route
              path="documents"
              element={<DocumentsPage />}
            />
            <Route
              path="documents/scholarship"
              element={<ScholarshipApplicationPage />}
            />
            <Route
              path="settings"
              element={<SettingsPage />}
            />
            <Route
              path="my-timetable"
              element={<MyTimetablePage />}
            />
            {/* Tutaj w przyszłości dodamy kolejne podstrony studenta */}
          </Route>
          {/* ================================================================== */}

          {/* ================================================================== */}
          {/* NOWOŚĆ: Osobna, chroniona sekcja tras dla pracowników/admina */}
          <Route
            path="/admin"
            element={<AdminRoute />}
          >
            <Route
              index
              element={<AdminDashboardPage />}
            />
            <Route
              path="news"
              element={<AdminNewsPage />}
            />{' '}
            <Route
              path="students"
              element={<ManageStudentsPage />}
            />
            <Route
              path="submissions"
              element={<ManageSubmissionsPage />}
            />
            <Route
              path="grading"
              element={<GradingPage />}
            />
            <Route
              path="fee-schedules"
              element={<ManageFeeSchedulesPage />}
            />
            <Route
              path="groups"
              element={<ManageGroupsPage />}
            />
            <Route
              path="payments"
              element={<ManagePaymentsPage />}
            />
            <Route
              path="curriculums"
              element={<ManageCurriculumsPage />}
            />
            <Route
              path="recruitment"
              element={<ManageRecruitmentPage />}
            />
            <Route
              path="recruitment/:collectionName/:applicationId"
              element={<ApplicationDetailPage />}
            />
            <Route
              path="subjects"
              element={<ManageSubjectsPage />}
            />
            <Route
              path="dictionaries"
              element={<ManageDictionariesPage />}
            />
            <Route
              path="newTimetable"
              element={<NewTimetableEditorPage />}
            />{' '}
            <Route
              path="timetables/:timetableId"
              element={<NewTimetableEditorPage />}
            />
            <Route
              path="TimetableList"
              element={<TimetablesListPage />}
            />{' '}
            <Route
              path="semesters"
              element={<ManageSemestersPage />}
            />
            <Route
              path="users"
              element={<ManageUsersPage />}
            />
            <Route
              path="reports/workload"
              element={<LecturerWorkloadReportPage />}
            />
            <Route
              path="schedule-view/:userId"
              element={<PrintableSchedulePage />}
            />
          </Route>
          {/* ================================================================== */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
