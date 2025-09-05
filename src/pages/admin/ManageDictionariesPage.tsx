// src/pages/admin/ManageDictionariesPage.tsx
import { useState } from 'react';
import { Box, Paper, Typography, Tabs, Tab, Button } from '@mui/material';
import { CrudTable } from '../../components/CrudTable';
import { departmentsService, degreeLevelsService } from '../../features/shared/dictionaryService';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Konfiguracja dla naszych zakładek i tabel
const dictionaryTabs = [
  { label: 'Katedry', service: departmentsService, singularName: 'Katedrę' },
  { label: 'Stopnie Studiów', service: degreeLevelsService, singularName: 'Stopień Studiów' },
];

export const ManageDictionariesPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '900px' }}>
        <Button
          component={RouterLink}
          to="/admin"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Wróć do pulpitu
        </Button>
        <Typography
          variant="h4"
          gutterBottom
        >
          Zarządzaj Słownikami Systemowymi
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_e, newValue) => setActiveTab(newValue)}
          >
            {dictionaryTabs.map((tab) => (
              <Tab
                key={tab.label}
                label={tab.label}
              />
            ))}
          </Tabs>
        </Box>
        {/* Renderujemy komponent CrudTable, przekazując mu odpowiedni serwis */}
        <Box sx={{ pt: 2 }}>
          <CrudTable
            service={dictionaryTabs[activeTab].service}
            singularName={dictionaryTabs[activeTab].singularName}
          />
        </Box>
      </Paper>
    </Box>
  );
};
