import { useRef, useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, CircularProgress, Grid } from '@mui/material';
import { useAuthContext } from '../../context/AuthContext';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { addSubmission } from '../../features/submissions/submissionsService';
import toast from 'react-hot-toast';

export const ScholarshipApplicationPage = () => {
  const { user, profileInfo } = useAuthContext();

  const [isLoading, setIsLoading] = useState(false);

  // Stany dla pól wypełnianych przez użytkownika
  const [kierunek, setKierunek] = useState('');
  const [srednia, setSrednia] = useState('');
  const [uzasadnienie, setUzasadnienie] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  // Dane pobierane automatycznie
  const studentId = user?.email?.split('@')[0] || '';
  const studentName = user?.displayName || '';
  const submissionDate = format(new Date(), 'd MMMM yyyy', { locale: pl });
  const organizationName = profileInfo?.organizations?.[0]?.name || '';

  // Wypełniamy pole kierunku nazwą organizacji przy pierwszym renderowaniu
  useEffect(() => {
    if (organizationName) {
      setKierunek(organizationName);
    }
  }, [organizationName]);

  const generatePdf = () => {
    const elementToPrint = printRef.current;
    if (!elementToPrint) return;

    html2canvas(elementToPrint, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pdfWidth - 20;
      const ratio = canvas.width / canvas.height;
      const imgHeight = imgWidth / ratio;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`wniosek-stypendium-${studentId}.pdf`);
    });
  };

  const handleFinalizeAndDownload = async () => {
    if (!user) {
      toast.error('Błąd: Użytkownik nie jest zalogowany.');
      return;
    }
    if (!kierunek || !srednia || !uzasadnienie) {
      toast.error('Proszę wypełnić wszystkie wymagane pola.');
      return;
    }

    setIsLoading(true);

    const formData = {
      kierunek,
      srednia: Number(srednia),
      uzasadnienie,
      // Dodatkowe dane do zapisu w bazie
      studentName,
      studentId,
      email: user.email,
      organizationName,
    };

    try {
      await addSubmission({
        studentId: user.uid,
        studentName: studentName,
        studentEmail: user.email || '',
        formType: 'Wniosek o stypendium rektora',
        formData: formData,
      });

      generatePdf();
      toast.success('Wniosek został pomyślnie zarejestrowany! Rozpoczynam pobieranie pliku PDF.');
    } catch (error) {
      console.error('Błąd podczas rejestracji wniosku:', error);
      toast.error('Wystąpił błąd podczas rejestracji wniosku w systemie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '900px' }}>
        <div ref={printRef}>
          <Box sx={{ p: 2, backgroundColor: 'white' }}>
            <Typography
              variant="h4"
              gutterBottom
              align="center"
            >
              Wniosek o przyznanie stypendium rektora
            </Typography>

            <Box
              component="div"
              sx={{ mt: 3 }}
            >
              <Grid
                container
                spacing={2}
              >
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Imię i Nazwisko"
                    value={studentName}
                    fullWidth
                    disabled
                    variant="standard"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Numer Indeksu"
                    value={studentId}
                    fullWidth
                    disabled
                    variant="standard"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="E-mail"
                    value={user?.email || ''}
                    fullWidth
                    disabled
                    variant="standard"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Data złożenia"
                    value={submissionDate}
                    fullWidth
                    disabled
                    variant="standard"
                  />
                </Grid>

                <Grid size={12}>
                  <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />
                </Grid>

                <Grid size={12}>
                  <TextField
                    label="Kierunek studiów"
                    value={kierunek}
                    onChange={(e) => setKierunek(e.target.value)}
                    placeholder="Wpisz kierunek studiów..."
                    fullWidth
                    required
                    variant="standard"
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Średnia ocen z ostatniego roku"
                    type="number"
                    value={srednia}
                    onChange={(e) => setSrednia(e.target.value)}
                    fullWidth
                    required
                    variant="standard"
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Uzasadnienie (np. osiągnięcia naukowe, sportowe)"
                    multiline
                    rows={4}
                    value={uzasadnienie}
                    onChange={(e) => setUzasadnienie(e.target.value)}
                    fullWidth
                    required
                    variant="standard"
                  />
                </Grid>
              </Grid>
            </Box>
          </Box>
        </div>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="button"
            variant="contained"
            color="primary"
            onClick={handleFinalizeAndDownload}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Zatwierdź i Pobierz PDF'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
