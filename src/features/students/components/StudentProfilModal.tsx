import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Avatar,
  IconButton,
  TextField,
  CircularProgress,
  Badge,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
// Importy z nowo zainstalowanych bibliotek
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { OnboardingStatusChip } from '../../students/components/OnboardingStatusChip';

import type { UserProfile } from '../../user/types';
import { updateStudentProfile, uploadStudentPhoto } from '../../user/userService';

const profileSchema = z.object({
  displayName: z.string().min(3, 'Imię i nazwisko musi mieć co najmniej 3 znaki'),
  // Możesz dodać walidację dla innych pól, które rozszerzyłeś w UserProfile
  // np. privateEmail: z.string().email("Niepoprawny format e-mail").optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// --- Propsty dla Modala ---
interface StudentProfileModalProps {
  open: boolean;
  onClose: () => void;
  student: UserProfile | null;
  onSave: (updatedStudent: UserProfile) => void; // Prop z ManageStudentsPage
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ open, onClose, student, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
    },
  });

  // Resetuj formularz, gdy zmienia się student lub tryb edycji
  useEffect(() => {
    if (student) {
      reset({
        displayName: student.displayName,
      });
    }
  }, [student, isEditing, reset]);

  if (!student) return null;

  const getIndexNumber = (email: string) => {
    return email.split('@')[0];
  };

  const onSubmit = async (data: ProfileFormData) => {
    const dataToSave: Partial<UserProfile> = {
      ...data,
    };

    await toast.promise(updateStudentProfile(student.id, dataToSave), {
      loading: 'Zapisywanie danych...',
      success: 'Profil studenta zaktualizowany!',
      error: 'Błąd podczas zapisu.',
    });

    onSave({ ...student, ...dataToSave });
    setIsEditing(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Zakładamy, że uploadStudentPhoto istnieje w userService
      const downloadURL = await uploadStudentPhoto(student.id, file);
      await updateStudentProfile(student.id, { photoURL: downloadURL });

      onSave({ ...student, photoURL: downloadURL });
      toast.success('Zdjęcie profilowe zaktualizowane!');
    } catch (error) {
      toast.error('Błąd podczas przesyłania zdjęcia.');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseDialog = () => {
    setIsEditing(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseDialog} // <-- Przekazujemy POPRAWIONY handler
      maxWidth="md"
      fullWidth
      // USUNIĘTO BŁĘDNY PROP 'onCloseRequest'
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Profil Studenta</Typography>
        <IconButton
          aria-label="close"
          onClick={handleCloseDialog}
          sx={{ color: (theme) => theme.palette.grey[500] }}
          disabled={isSubmitting || isUploading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <DialogContent dividers>
          <Grid
            container
            spacing={3}
          >
            {/* SEKCJA 1: Avatar i Podstawowe dane */}
            <Grid
              size={{ xs: 12, md: 4 }}
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
            >
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  isEditing ? (
                    <IconButton
                      color="primary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <EditIcon />
                    </IconButton>
                  ) : null
                }
              >
                {isUploading ? (
                  <CircularProgress
                    size={150}
                    sx={{ position: 'absolute', top: 0, left: 0 }}
                  />
                ) : null}
                <Avatar
                  src={student.photoURL}
                  alt={student.displayName}
                  sx={{ width: 150, height: 150, fontSize: '4rem', opacity: isUploading ? 0.5 : 1 }}
                >
                  {student.displayName.charAt(0)}
                </Avatar>
              </Badge>

              <input
                type="file"
                ref={fileInputRef}
                hidden
                accept="image/png, image/jpeg"
                onChange={handleFileChange}
              />

              {isEditing ? (
                <Controller
                  name="displayName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Imię i nazwisko"
                      variant="outlined"
                      fullWidth
                      error={!!errors.displayName}
                      helperText={errors.displayName?.message}
                      sx={{ mt: 2 }}
                    />
                  )}
                />
              ) : (
                <Typography
                  variant="h5"
                  align="center"
                  sx={{ mt: 2 }}
                >
                  {student.displayName}
                </Typography>
              )}

              <OnboardingStatusChip status={student.onboardingStatus} />
            </Grid>

            {/* SEKCJA 2: Szczegółowe informacje */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Grid
                container
                spacing={2}
              >
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    variant="subtitle2"
                    color="textSecondary"
                  >
                    Adres e-mail (login)
                  </Typography>
                  <Typography
                    variant="body1"
                    gutterBottom
                  >
                    {student.email}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    variant="subtitle2"
                    color="textSecondary"
                  >
                    Numer indeksu
                  </Typography>
                  <Typography
                    variant="body1"
                    gutterBottom
                  >
                    {getIndexNumber(student.email)}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    variant="subtitle2"
                    color="textSecondary"
                  >
                    Data rekrutacji
                  </Typography>
                  <Typography
                    variant="body1"
                    gutterBottom
                  >
                    {student.createdAt
                      ? format(student.createdAt.toDate(), 'd MMMM yyyy, HH:mm', { locale: pl })
                      : 'Brak danych'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography
                    variant="subtitle2"
                    color="textSecondary"
                    sx={{ mt: 1 }}
                  >
                    Przypisanie
                  </Typography>
                  <Typography variant="body1">
                    <strong>Grupa:</strong> {student.groupName || 'Brak'}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Specjalizacja:</strong> {student.specializationName || 'Brak'}
                  </Typography>
                </Grid>

                {/* Tutaj możesz dodać więcej pól edytowalnych w trybie isEditing */}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          {isEditing ? (
            <>
              <Button
                onClick={() => setIsEditing(false)}
                color="secondary"
                disabled={isSubmitting || isUploading}
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting || isUploading}
                startIcon={isSubmitting || isUploading ? <CircularProgress size={20} /> : null}
              >
                Zapisz zmiany
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleCloseDialog}
                color="secondary"
              >
                Zamknij
              </Button>
              <Button
                variant="contained"
                onClick={() => setIsEditing(true)}
              >
                Edytuj profil
              </Button>
            </>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
};
