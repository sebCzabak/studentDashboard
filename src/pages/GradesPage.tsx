// src/pages/GradesPage.tsx
import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Divider } from '@mui/material';
import { GradesList } from '../features/grades/components/GradesList';
import { useAuthContext } from '../context/AuthContext';
import { getUserProfileData } from '../features/user/userService';

export const GradesPage = () => {
  const { user } = useAuthContext();
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (user) {
      getUserProfileData(user.uid).then((data) => {
        setProfileData(data);
      });
    }
  }, [user]);

  // Funkcja do generowania tekstu o semestrze
  const renderSemesterInfo = () => {
    if (!profileData) return null;

    // Możesz dostosować logikę, aby wyświetlać to, co chcesz
    const semester = profileData.semester || ''; // np. "2"
    const groupName = profileData.groupName || ''; // np. "Informatyka, I st., sem. 2"

    // Prosta logika do wyświetlania, można ją rozbudować
    if (groupName) {
      return `Grupa: ${groupName}`;
    }
    if (semester) {
      return `Semestr: ${semester}`;
    }
    return null;
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1200px' }}>
        <Typography
          variant="h4"
          gutterBottom
        >
          Twoje Oceny
        </Typography>

        {/* NOWA SEKCJA Z INFORMACJAMI O SEMESTRZE */}
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          {renderSemesterInfo()}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {/* ========================================= */}

        <GradesList />
      </Paper>
    </Box>
  );
};
