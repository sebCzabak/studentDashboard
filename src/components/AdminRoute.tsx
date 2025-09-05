import { useAuthContext } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const staffRoles = ['admin', 'prowadzacy', 'pracownik_dziekanatu', 'pracownik_kwestury'];

export const AdminRoute = () => {
  const { role, user } = useAuthContext();

  if (!user) return <Navigate to="/login" />;
  if (!role || !staffRoles.includes(role)) {
    // Jeśli użytkownik nie ma roli pracownika, przekieruj go na stronę główną
    return <Navigate to="/" />;
  }
  // Jeśli ma odpowiednią rolę, wyświetl zawartość panelu
  return <Outlet />;
};
