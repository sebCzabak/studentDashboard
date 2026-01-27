import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Tabs,
  Tab,
  Stack,
  Chip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../context/AuthContext';
// Załóżmy, że typy zostały przeniesione do zewnętrznego pliku recruitment/types.ts
import type { Application, ApplicationStatusValue } from '../../features/recruitment/types';

// Definicja możliwych statusów dla listy rozwijanej
const STATUS_OPTIONS: ApplicationStatusValue[] = [
  'Nie wybrano',
  'Oczekuje',
  'Zapłacono',
  'W trakcie realizacji',
  'Zwrot',
  'Zaakceptowano',
  'Odrzucono',
];

// ------------------------------------
// Wewnętrzne formularze (Krok 2a - w uproszczonej formie)
// ------------------------------------

const PersonalDataPanel = ({ application, onFieldChange }: any) => (
  <Stack spacing={2}>
    <Typography
      variant="h5"
      sx={{ mb: 1 }}
    >
      Dane Osobowe
    </Typography>
    <Grid
      container
      spacing={3}
    >
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="Imię"
          fullWidth
          value={application.firstName || ''}
          onChange={(e) => onFieldChange('firstName', e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="Nazwisko"
          fullWidth
          value={application.lastName || ''}
          onChange={(e) => onFieldChange('lastName', e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="Data urodzenia"
          fullWidth
          value={application.dateOfBirth?.toDate()?.toLocaleDateString('pl-PL') || ''}
          InputProps={{ readOnly: true }}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="Płeć"
          fullWidth
          value={application.gender || ''}
          onChange={(e) => onFieldChange('gender', e.target.value)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="E-mail"
          fullWidth
          value={application.email || ''}
          InputProps={{ readOnly: true }}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          label="Numer telefonu"
          fullWidth
          value={application.phoneNumber || ''}
          onChange={(e) => onFieldChange('phoneNumber', e.target.value)}
        />
      </Grid>
    </Grid>
  </Stack>
);

// ------------------------------------
// GŁÓWNY KOMPONENT
// ------------------------------------

export const ApplicationDetailPage = () => {
  const { collectionName, applicationId } = useParams<{ collectionName: string; applicationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const isAccepted = application?.status === 'zaakceptowany';

  useEffect(() => {
    if (!applicationId || !collectionName) return;

    const docRef = doc(db, collectionName, applicationId);
    const fetchApplication = async () => {
      try {
        setLoading(true);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          // Inicjalizujemy 'verification' z domyślnymi wartościami, jeśli brakuje go w bazie
          const appData = docSnap.data();
          setApplication({
            id: docSnap.id,
            ...appData,
            verification: appData.verification || {},
          } as Application);
        } else {
          toast.error('Nie znaleziono wniosku.');
        }
      } catch (err) {
        toast.error('Błąd pobierania danych wniosku.');
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId, collectionName]);

  const handleFieldChange = (field: keyof Application, value: any) => {
    setApplication((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleVerificationChange = (field: keyof Application['verification'], value: ApplicationStatusValue) => {
    setApplication((prev) =>
      prev
        ? {
            ...prev,
            verification: { ...prev.verification, [field]: value },
          }
        : null
    );
  };

  const handleSaveChanges = async () => {
    if (!application || !applicationId) return;

    try {
      setLoading(true);
      const docRef = doc(db, collectionName!, applicationId);

      const dataToUpdate: Partial<Application> = {
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        phoneNumber: application.phoneNumber,
        gender: application.gender,
        verification: application.verification,
      };

      await updateDoc(docRef, dataToUpdate);
      toast.success('Zmiany zapisane pomyślnie.');
    } catch (e) {
      toast.error('Błąd zapisu danych.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeApplication = async (newStatus: 'zaakceptowany' | 'odrzucony') => {
    if (!application || !applicationId) return;
    if (!window.confirm(`Czy na pewno chcesz zmienić status na: ${newStatus}?`)) return;

    try {
      setLoading(true);
      const docRef = doc(db, collectionName!, applicationId);

      await updateDoc(docRef, {
        status: newStatus,
        processorId: user?.uid,
        processorName: user?.displayName,
      });
      toast.success(`Wniosek pomyślnie ${newStatus === 'zaakceptowany' ? 'zaakceptowany' : 'odrzucony'}.`);
      navigate(-1);
    } catch (e) {
      toast.error('Błąd finalizacji statusu.');
    }
  };

  if (loading || !application) return <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />;

  return (
    <Box sx={{ p: 3 }}>
      <Button
        component={RouterLink}
        to="/admin/recruitment"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        WRÓĆ DO LISTY WNIOSKÓW
      </Button>
      <Typography
        variant="h4"
        gutterBottom
      >
        Szczegóły Wniosku Rekrutacyjnego
      </Typography>

      <Grid
        container
        spacing={3}
      >
        {/* --------------------- LEWA STRONA: GŁÓWNE DANE I KARTY --------------------- */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                aria-label="Sekcje wniosku"
              >
                <Tab label="Dane Osobowe" />
                <Tab label="Adres i Kontakt" />
                <Tab label="Wykształcenie" />
              </Tabs>
            </Box>

            <Box sx={{ pt: 3 }}>
              {activeTab === 0 && (
                <PersonalDataPanel
                  application={application}
                  onFieldChange={handleFieldChange}
                />
              )}
              {activeTab === 1 && <Typography>Adres i Kontakt (do zaimplementowania)</Typography>}
              {activeTab === 2 && <Typography>Wykształcenie (do zaimplementowania)</Typography>}
            </Box>
          </Paper>
        </Grid>

        {/* --------------------- PRAWA STRONA: KONTROLA STATUSU --------------------- */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography
              variant="h6"
              gutterBottom
            >
              Zarządzanie Sprawą
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle1">Status Wniosku</Typography>
                <Chip
                  label={application.status}
                  color={isAccepted ? 'success' : 'info'}
                  sx={{ mt: 1 }}
                />
              </Box>

              <Button
                onClick={handleSaveChanges}
                variant="outlined"
              >
                ZAPISZ ZMIANY W DANYCH
              </Button>

              <Divider sx={{ mt: 3, mb: 1 }} />

              <Typography variant="subtitle2">Weryfikacja Dokumentów i Opłat</Typography>
              {/* FIX: Używamy OR operatora (||) dla zapewnienia, że w razie braku danych, mamy pusty obiekt do iteracji */}
              {Object.entries(application.verification || {}).map(([key, value]) => (
                <FormControl
                  fullWidth
                  key={key}
                >
                  <InputLabel sx={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</InputLabel>
                  <Select
                    value={value as ApplicationStatusValue}
                    label={key.replace(/([A-Z])/g, ' $1').trim()}
                    onChange={(e) =>
                      handleVerificationChange(
                        key as keyof Application['verification'],
                        e.target.value as ApplicationStatusValue
                      )
                    }
                    disabled={isAccepted}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <MenuItem
                        key={option}
                        value={option}
                      >
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}

              <Divider sx={{ mt: 3, mb: 1 }} />

              <Button
                onClick={() => handleFinalizeApplication('zaakceptowany')}
                variant="contained"
                color="success"
                disabled={isAccepted}
              >
                AKCEPTUJ WNIOSEK
              </Button>
              <Button
                onClick={() => handleFinalizeApplication('odrzucony')}
                variant="outlined"
                color="error"
                disabled={isAccepted}
              >
                ODRZUĆ WNIOSEK
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
