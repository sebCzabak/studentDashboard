import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
} from '@mui/material';
import { getApplicationById, updateApplication } from '../../features/recruitment/recruitmetService';
import { type Application } from '../../features/recruitment/types';
import toast from 'react-hot-toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuthContext } from '../../context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { format } from 'date-fns/format';
import { pl } from 'date-fns/locale/pl';

export const ApplicationDetailPage = () => {
  const { collectionName, applicationId } = useParams<{ collectionName: string; applicationId: string }>();
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [notes, setNotes] = useState('');
  const [feePaid, setFeePaid] = useState(false);

  const fetchApplication = () => {
    if (collectionName && applicationId) {
      setLoading(true);
      getApplicationById(collectionName, applicationId)
        .then((data) => {
          if (data) {
            setApplication(data);
            setStatus(data.status || 'Nowe zgłoszenie');
            setNotes(data.notes || '');
            setFeePaid(data.hasPaidEnrollmentFee || false); // Wypełniamy stan checkboxa
          } else {
            toast.error('Nie znaleziono takiego wniosku.');
            navigate('/admin/recruitment');
          }
        })
        .catch(() => toast.error('Nie udało się wczytać danych wniosku.'))
        .finally(() => setLoading(false));
    }
  };
  const handleUpdate = async (dataToUpdate: object) => {
    if (!collectionName || !applicationId) return;
    const promise = updateApplication(collectionName, applicationId, dataToUpdate);
    await toast.promise(promise, {
      loading: 'Zapisywanie zmian...',
      success: 'Status został zaktualizowany!',
      error: 'Błąd podczas zapisu.',
    });
  };

  useEffect(() => {
    fetchApplication();
  }, [collectionName, applicationId]);

  const handleAssignProcessor = async () => {
    if (!user || !collectionName || !applicationId)
      return toast.error('Błąd: Nie można zidentyfikować pracownika lub wniosku.');

    const promise = updateApplication(collectionName, applicationId, {
      processorId: user.uid,
      processorName: user.displayName || user.email, // Zapisujemy ID i nazwę
    });

    await toast.promise(promise, {
      loading: 'Przypisywanie sprawy...',
      success: () => {
        fetchApplication(); // Odśwież dane, aby pokazać nowego prowadzącego
        return 'Sprawa została przypisana do Ciebie!';
      },
      error: 'Błąd podczas przypisywania sprawy.',
    });
  };

  const handleAccept = async () => {
    if (!collectionName || !applicationId) return;

    if (window.confirm(`Czy na pewno chcesz zaakceptować tego kandydata i stworzyć dla niego konto studenta?`)) {
      setIsAccepting(true);
      try {
        const functions = getFunctions();
        const acceptApplicant = httpsCallable(functions, 'acceptApplicant');

        const result = await acceptApplicant({ collectionName, applicationId });

        toast.success((result.data as any).message);
        fetchApplication(); // Odśwież dane, aby zobaczyć nowy status
      } catch (error: any) {
        toast.error(error.message || 'Wystąpił błąd podczas akceptacji.');
        console.error("Błąd wywołania Cloud Function 'acceptApplicant':", error);
      } finally {
        setIsAccepting(false);
      }
    }
  };

  if (loading) return <CircularProgress />;
  if (!application) return <Typography>Nie znaleziono wniosku.</Typography>;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1200px' }}>
        <Button
          component={RouterLink}
          to="/admin/recruitment"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Wróć do listy wniosków
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
          sx={{ mt: 1 }}
        >
          {/* LEWA, GŁÓWNA KOLUMNA Z DANYMI KANDYDATA */}
          <Grid
            size={{
              xs: 12,
              sm: 8,
            }}
          >
            <Paper
              variant="outlined"
              sx={{ p: 2 }}
            >
              <Typography variant="h6">Dane Podstawowe</Typography>
              <Grid
                container
                spacing={2}
                sx={{ mt: 1 }}
              >
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <TextField
                    label="Imię"
                    value={application.firstName || ''}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <TextField
                    label="Nazwisko"
                    value={application.lastName || ''}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <TextField
                    label="Data urodzenia"
                    value={
                      application.dateOfBirth
                        ? format(application.dateOfBirth.toDate(), 'd MMMM yyyy', { locale: pl })
                        : ''
                    }
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Paper
              variant="outlined"
              sx={{ p: 2, mt: 3 }}
            >
              <Typography variant="h6">Dane Kontaktowe</Typography>
              <Grid
                container
                spacing={2}
                sx={{ mt: 1 }}
              >
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <TextField
                    label="Email"
                    value={application.email || ''}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <TextField
                    label="Numer telefonu"
                    value={application.phoneNumber || ''}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <TextField
                    label="Ulica i numer"
                    value={application.address?.street || ''}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <TextField
                    label="Miasto i kod pocztowy"
                    value={`${application.address?.postalCode || ''} ${application.address?.city || ''}`}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>
            </Paper>
            <Paper
              variant="outlined"
              sx={{ p: 2, mt: 3 }}
            >
              <Typography variant="h6">Dane Dodatkowe</Typography>
              <Grid
                container
                spacing={2}
                sx={{ mt: 1 }}
              >
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <TextField
                    label="Ukończona szkoła"
                    value={application.previousEducation || ''}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>
            </Paper>
            <Paper
              variant="outlined"
              sx={{ p: 2, mt: 3 }}
            >
              <Typography variant="h6">Notatki Wewnętrzne</Typography>
              <TextField
                label="Notatki (widoczne tylko dla pracowników)"
                multiline
                rows={4}
                fullWidth
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                margin="normal"
              />
              <Button
                variant="outlined"
                onClick={() => handleUpdate({ notes: notes })}
              >
                Zapisz Notatki
              </Button>
            </Paper>
          </Grid>

          {/* PRAWA KOLUMNA Z AKCJAMI */}
          <Grid
            size={{
              xs: 12,
              sm: 4,
            }}
          >
            <Paper
              variant="outlined"
              sx={{ p: 2, position: 'sticky', top: '24px' }}
            >
              <Typography variant="h6">Zarządzanie Sprawą</Typography>
              <Box sx={{ my: 2 }}>
                {application.processorName ? (
                  <Alert severity="info">
                    Sprawę prowadzi: <strong>{application.processorName}</strong>
                  </Alert>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleAssignProcessor}
                  >
                    Podejmij sprawę
                  </Button>
                )}
              </Box>
              <Divider sx={{ my: 2 }} />
              <FormControl
                fullWidth
                margin="normal"
              >
                <InputLabel>Status Wniosku</InputLabel>
                <Select
                  value={status}
                  label="Status Wniosku"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="Nowe zgłoszenie">Nowe zgłoszenie</MenuItem>
                  <MenuItem value="wymaga uzupełnienia">Wymaga uzupełnienia</MenuItem>
                  <MenuItem value="zaakceptowany">Zaakceptowany</MenuItem>
                  <MenuItem value="odrzucony">Odrzucony</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                onClick={() => handleUpdate({ status: status })}
                fullWidth
              >
                Zapisz Status
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleAccept}
                fullWidth
                sx={{ mt: 4 }}
                disabled={status === 'zaakceptowany'}
              >
                Akceptuj Kandydata
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};
