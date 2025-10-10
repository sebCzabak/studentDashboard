import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { useAuthContext } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Link as MuiLink,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';

import GoogleIcon from '@mui/icons-material/Google';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuthContext();

  const [view, setView] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userRole = userDoc.exists() && userDoc.data().role ? userDoc.data().role : 'student';
      const userPermissions = userDoc.exists() ? userDoc.data().managedApplicationTypes || [] : [];
      login(user, null, null, userRole, userPermissions);
      navigate('/');
    } catch (err: any) {
      setError('Nieprawidłowy login lub hasło.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    // provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    // provider.addScope('https://www.googleapis.com/auth/user.organization.read');
    provider.addScope('https://www.googleapis.com/auth/calendar');
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userPermissions = userDoc.exists() ? userDoc.data().managedApplicationTypes || [] : [];
      let userRole = 'student';
      if (userDoc.exists() && userDoc.data().role) {
        userRole = userDoc.data().role;
      } else if (!userDoc.exists()) {
        await setDoc(userDocRef, { email: user.email, displayName: user.displayName, role: 'student' });
      }
      const response = await fetch(
        'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,organizations',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const profileData = await response.json();
      login(user, token || null, profileData, userRole, userPermissions);
      navigate('/');
    } catch (error) {
      setError('Wystąpił błąd podczas logowania przez Google.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Proszę podać adres e-mail.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Jeśli konto istnieje, link do resetowania hasła został wysłany na Twój e-mail.');
      setView('login');
    } catch (err: any) {
      setError('Wystąpił błąd podczas wysyłania linku.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid
      container
      component="main"
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: (theme) => theme.palette.grey[100],
      }}
    >
      <Grid
        container
        size={{ xs: 11, sm: 10, md: 8, lg: 7 }}
        component={Paper}
        elevation={6}
        sx={{ maxWidth: '900px', display: 'flex', overflow: 'hidden' }}
      >
        <Grid
          size={{ xs: false, sm: 5, md: 6 }}
          sx={{
            backgroundImage: 'url(/images/login-background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Grid
          size={{ xs: 12, sm: 7, md: 6 }}
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        >
          <Box sx={{ my: 4, mx: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {view === 'login' ? (
              <>
                <Typography
                  component="h1"
                  variant="h5"
                >
                  Witaj!
                </Typography>
                <Box
                  component="form"
                  onSubmit={handleEmailLogin}
                  sx={{ mt: 1, width: '100%' }}
                >
                  {error && (
                    <Alert
                      severity="error"
                      sx={{ width: '100%', mb: 2 }}
                    >
                      {error}
                    </Alert>
                  )}
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    label="Adres Email / Login"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Hasło"
                    type="password"
                    autoComplete="current-password" /* <-- POPRAWKA TUTAJ */
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          value="remember"
                          color="primary"
                        />
                      }
                      label="Zapamiętaj mnie"
                    />
                    <MuiLink
                      href="#"
                      variant="body2"
                      onClick={() => {
                        setView('reset');
                        setError(null);
                      }}
                    >
                      Zapomniałeś hasła?
                    </MuiLink>
                  </Box>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Zaloguj się'}
                  </Button>
                  <Typography
                    align="center"
                    sx={{ my: 2 }}
                  >
                    LUB
                  </Typography>
                  <Button
                    type="button"
                    fullWidth
                    variant="outlined"
                    startIcon={<GoogleIcon />}
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                  >
                    Kontynuuj z Google
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography
                  component="h1"
                  variant="h5"
                >
                  Resetuj hasło
                </Typography>
                <Typography
                  variant="body2"
                  align="center"
                  sx={{ mt: 1 }}
                >
                  Podaj swój adres e-mail, aby otrzymać link.
                </Typography>
                <Box
                  component="form"
                  onSubmit={handlePasswordReset}
                  sx={{ mt: 1, width: '100%' }}
                >
                  {error && (
                    <Alert
                      severity="error"
                      sx={{ width: '100%', mb: 2 }}
                    >
                      {error}
                    </Alert>
                  )}
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    label="Adres Email"
                    name="email"
                    autoComplete="email" /* <-- POPRAWKA TUTAJ */
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Wyślij link'}
                  </Button>
                  <MuiLink
                    href="#"
                    variant="body2"
                    onClick={() => {
                      setView('login');
                      setError(null);
                    }}
                  >
                    &larr; Wróć do logowania
                  </MuiLink>
                </Box>
              </>
            )}
          </Box>
        </Grid>
      </Grid>
    </Grid>
  );
};
