import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { Box } from '@mui/material';
import { LoadingAnimation } from '../assets/animations/LoadingAnimation';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingAnimation />
      </Box>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // Krok 3: Weryfikacja zakończona i jest użytkownik - wszystko w porządku, renderuj chronioną zawartość.
  return <>{children}</>;
};
