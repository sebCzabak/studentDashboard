import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuthContext } from '../../context/AuthContext';

export const Appbar = () => {
  const { logout } = useAuthContext();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
    } catch (error) {
      console.error('Błąd podczas wylogowywania ', error);
    }
  };

  return (
    <AppBar position="relative">
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1 }}
        >
          ANS Panel Studenta
        </Typography>
        <Button
          color="inherit"
          onClick={handleLogout}
        >
          Wyloguj
        </Button>
      </Toolbar>
    </AppBar>
  );
};
