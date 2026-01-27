import { useState, useEffect, useMemo } from 'react'; // NOWY IMPORT: useMemo
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Button,
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
  type SelectChangeEvent,
  Chip,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import {
  getDomesticApplications,
  getInternationalApplications,
  getPostgraduateApplications,
} from '../../features/recruitment/recruitmetService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import Papa from 'papaparse'; // Import biblioteki do CSV

// Definicja typu dla aplikacji (lepsze niż any)
interface Application {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  submissionDate?: { toDate: () => Date }; // Typ Firestore Timestamp
  status: string;
  processorName?: string;
}

// Funkcja pomocnicza do renderowania kolorowego statusu
const getStatusChip = (status: string) => {
  switch (status) {
    case 'zaakceptowany':
      return (
        <Chip
          label="Zaakceptowany"
          color="success"
          size="small"
        />
      );
    case 'odrzucony':
      return (
        <Chip
          label="Odrzucony"
          color="error"
          size="small"
        />
      );
    case 'wymaga uzupełnienia':
      return (
        <Chip
          label="Wymaga uzupełnienia"
          color="warning"
          size="small"
        />
      );
    case 'Nowe zgłoszenie':
    default:
      return (
        <Chip
          label="Nowe zgłoszenie"
          color="info"
          size="small"
        />
      );
  }
};

// Wewnętrzny komponent dla pojedynczej zakładki
const ApplicationsTabPanel = ({
  fetchFunction,
  collectionName,
}: {
  fetchFunction: (status: string) => Promise<any[]>;
  collectionName: string;
}) => {
  // Stan na wszystkie aplikacje (filtrowane tylko statusem z API)
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Nowe zgłoszenie');
  const [selectedYear, setSelectedYear] = useState<string>('all'); // NOWY STAN DLA FILTRA ROKU

  useEffect(() => {
    setLoading(true);
    // Ten useEffect pobiera dane tylko na podstawie statusu
    fetchFunction(statusFilter)
      .then((data) => setApplications(data as Application[]))
      .catch(() => toast.error('Nie udało się wczytać wniosków dla tej zakładki.'))
      .finally(() => setLoading(false));
  }, [fetchFunction, statusFilter]);

  // NOWA LOGIKA: Wyodrębnij dostępne lata z pobranych wniosków
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    applications.forEach((app) => {
      if (app.submissionDate && app.submissionDate.toDate) {
        yearsSet.add(app.submissionDate.toDate().getFullYear().toString());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a)); // Sortuj malejąco
  }, [applications]);

  // NOWA LOGIKA: Filtruj wnioski na podstawie wybranego roku
  const filteredApplications = useMemo(() => {
    if (selectedYear === 'all') {
      return applications; // Zwróć wszystko, co pobrało API
    }
    return applications.filter((app) => {
      if (app.submissionDate && app.submissionDate.toDate) {
        return app.submissionDate.toDate().getFullYear().toString() === selectedYear;
      }
      return false;
    });
  }, [applications, selectedYear]);

  if (loading) return <CircularProgress sx={{ mt: 3 }} />;

  return (
    <Box>
      {/* NOWY KONTENER NA FILTRY */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 2 }}>
        <FormControl
          size="small"
          sx={{ minWidth: 240 }}
        >
          <InputLabel>Filtruj po statusie</InputLabel>
          <Select
            value={statusFilter}
            label="Filtruj po statusie"
            onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="Nowe zgłoszenie">Nowe zgłoszenia</MenuItem>
            <MenuItem value="zaakceptowany">Zaakceptowane</MenuItem>
            <MenuItem value="odrzucony">Odrzucone</MenuItem>
            <MenuItem value="wymaga uzupełnienia">Wymaga uzupełnienia</MenuItem>
            <MenuItem value="wszystkie">Pokaż wszystkie</MenuItem>
          </Select>
        </FormControl>

        {/* NOWY FILTR ROKU */}
        <FormControl
          size="small"
          sx={{ minWidth: 200 }}
          disabled={availableYears.length === 0} // Wyłącz, jeśli nie ma lat
        >
          <InputLabel>Filtruj po roku</InputLabel>
          <Select
            value={selectedYear}
            label="Filtruj po roku"
            onChange={(e: SelectChangeEvent) => setSelectedYear(e.target.value)}
          >
            <MenuItem value="all">Wszystkie lata</MenuItem>
            {availableYears.map((year) => (
              <MenuItem
                key={year}
                value={year}
              >
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ mt: 2 }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Kandydat</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>E-mail</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Data Złożenia</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Prowadzący Sprawę</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* ZMIANA: mapujemy po filteredApplications */}
            {filteredApplications.length > 0 ? (
              filteredApplications.map((app) => (
                <TableRow
                  key={app.id}
                  hover
                >
                  <TableCell>
                    {app.firstName} {app.lastName}
                  </TableCell>
                  <TableCell>{app.email}</TableCell>
                  <TableCell>
                    {app.submissionDate
                      ? format(app.submissionDate.toDate(), 'd MMM yyyy, HH:mm', { locale: pl })
                      : '-'}
                  </TableCell>
                  <TableCell>{getStatusChip(app.status)}</TableCell>
                  <TableCell>{app.processorName || 'Nieprzypisane'}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      component={RouterLink}
                      to={`/admin/recruitment/${collectionName}/${app.id}`}
                    >
                      Zobacz Szczegóły
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  align="center"
                >
                  Brak wniosków o wybranych kryteriach (status i rok).
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export const ManageRecruitmentPage = () => {
  const { permissions } = useAuthContext();
  const [activeTab, setActiveTab] = useState(0);

  const availableTabs = [
    {
      label: 'Podania Krajowe',
      permission: 'domestic',
      collectionName: 'applications',
      component: (
        <ApplicationsTabPanel
          fetchFunction={(status) => getDomesticApplications(status)}
          collectionName="applications"
        />
      ),
    },
    {
      label: 'Podania Międzynarodowe',
      permission: 'international',
      collectionName: 'international_applications',
      component: (
        <ApplicationsTabPanel
          fetchFunction={(status) => getInternationalApplications(status)}
          collectionName="international_applications"
        />
      ),
    },
    {
      label: 'Studia Podyplomowe',
      permission: 'postgraduate',
      collectionName: 'postgraduate_applications',
      component: (
        <ApplicationsTabPanel
          fetchFunction={(status) => getPostgraduateApplications(status)}
          collectionName="postgraduate_applications"
        />
      ),
    },
  ];

  const visibleTabs = availableTabs.filter((tab) => permissions.includes(tab.permission));

  useEffect(() => {
    if (visibleTabs.length > 0 && activeTab >= visibleTabs.length) {
      setActiveTab(0);
    }
  }, [visibleTabs, activeTab]);

  const handleExportCsv = async () => {
    toast.loading('Przygotowuję plik CSV...');
    try {
      // Logika eksportu pozostaje bez zmian - eksportuje tylko zaakceptowanych
      // z aktywnej zakładki, ignorując filtry UI.
      const activeTabPermission = visibleTabs[activeTab]?.permission;
      let acceptedApplications: any[] = [];

      if (activeTabPermission === 'domestic') {
        acceptedApplications = await getDomesticApplications('zaakceptowany');
      } else if (activeTabPermission === 'international') {
        acceptedApplications = await getInternationalApplications('zaakceptowany');
      } else if (activeTabPermission === 'postgraduate') {
        // UZUPEŁNIENIE LOGIKI O PODYPLOMOWE
        acceptedApplications = await getPostgraduateApplications('zaakceptowany');
      }

      if (acceptedApplications.length === 0) {
        toast.dismiss();
        return toast.error('Brak zaakceptowanych kandydatów w tej sekcji do wyeksportowania.');
      }

      const dataToExport = acceptedApplications.map((app) => ({
        Imie: app.firstName,
        Nazwisko: app.lastName,
        Email: app.email,
        'Data Zlozenia': app.submissionDate ? format(app.submissionDate.toDate(), 'yyyy-MM-dd HH:mm') : '',
        'Prowadzacy Sprawe': app.processorName || '',
      }));

      const csv = Papa.unparse(dataToExport);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `zaakceptowani_${activeTabPermission}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss();
      toast.success('Plik CSV został pomyślnie wygenerowany.');
    } catch (error) {
      toast.dismiss();
      toast.error('Wystąpił błąd podczas eksportu.');
      console.error(error);
    }
  };

  if (permissions.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Nie masz uprawnień do przeglądania żadnych wniosków rekrutacyjnych.</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1200px' }}>
        <Button
          component={RouterLink}
          to="/admin"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Wróc do pulipitu
        </Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            variant="h4"
            gutterBottom
          >
            Panel Rekrutacyjny
          </Typography>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportCsv}
          >
            Eksportuj Zaakceptowanych do CSV
          </Button>
        </Box>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_e, newValue) => setActiveTab(newValue)}
            aria-label="zakładki rekrutacji"
          >
            {visibleTabs.map((tab) => (
              <Tab
                key={tab.label}
                label={tab.label}
              />
            ))}
          </Tabs>
        </Box>
        {visibleTabs[activeTab]?.component}
      </Paper>
    </Box>
  );
};
