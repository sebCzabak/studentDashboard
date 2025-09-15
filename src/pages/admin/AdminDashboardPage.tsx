import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Divider,
  Button,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { getNewsArticles } from '../../features/news/newsService';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

// Ikony
import NewspaperIcon from '@mui/icons-material/Newspaper';
import GradeIcon from '@mui/icons-material/Grade';
import PaymentIcon from '@mui/icons-material/Payment';
import ArticleIcon from '@mui/icons-material/Article';
import GroupIcon from '@mui/icons-material/Group';
import ClassIcon from '@mui/icons-material/Class';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import EventNoteIcon from '@mui/icons-material/EventNote';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import AssignmentIcon from '@mui/icons-material/AddComment';

// Definicja kafelków z przypisanymi rolami
const allAdminTiles = [
  // Działka Dziekanatu
  {
    title: 'Rekrutacja',
    description: 'Zarządzaj wnioskami rekrutacyjnymi.',
    icon: <HowToRegIcon sx={{ fontSize: 40 }} />,
    path: '/admin/recruitment',
    section: 'Dziekanat',
    allowedRoles: ['admin', 'pracownik_dziekanatu'],
  },
  {
    title: 'Zarządzaj Studentami',
    description: 'Przypisuj studentów do grup.',
    icon: <GroupIcon sx={{ fontSize: 40 }} />,
    path: '/admin/students',
    section: 'Dziekanat',
    allowedRoles: ['admin', 'pracownik_dziekanatu'],
  },
  {
    title: 'Zarządzaj Wnioskami',
    description: 'Przeglądaj wnioski studentów.',
    icon: <ArticleIcon sx={{ fontSize: 40 }} />,
    path: '/admin/submissions',
    section: 'Dziekanat',
    allowedRoles: ['admin', 'pracownik_dziekanatu'],
  },

  // Działka Kwestury
  {
    title: 'Harmonogramy Opłat',
    description: 'Definiuj szablony opłat.',
    icon: <RequestQuoteIcon sx={{ fontSize: 40 }} />,
    path: '/admin/fee-schedules',
    section: 'Kwestura',
    allowedRoles: ['admin', 'pracownik_kwestury'],
  },
  {
    title: 'Zarządzaj Płatnościami',
    description: 'Księguj wpłaty studentów.',
    icon: <PaymentIcon sx={{ fontSize: 40 }} />,
    path: '/admin/payments',
    section: 'Kwestura',
    allowedRoles: ['admin', 'pracownik_kwestury'],
  },

  // Działka Prowadzącego / Dydaktyka
  {
    title: 'Wystaw Oceny',
    description: 'Zarządzaj ocenami studentów.',
    icon: <GradeIcon sx={{ fontSize: 40 }} />,
    path: '/admin/grading',
    section: 'Dydaktyka',
    allowedRoles: ['admin', 'prowadzacy'],
  },

  // Narzędzia Ogólne / Konfiguracja Systemu (dla Admina)
  {
    title: 'Siatki Programowe',
    description: 'Zarządzaj programami studiów.',
    icon: <AccountTreeIcon sx={{ fontSize: 40 }} />,
    path: '/admin/curriculums',
    section: 'Konfiguracja',
    allowedRoles: ['admin', 'pracownik_dziekanatu'],
  },
  {
    title: 'Plany Zajęć',
    description: 'Twórz i edytuj plany zajęć.',
    icon: <ScheduleIcon sx={{ fontSize: 40 }} />,
    path: '/admin/TimetableList',
    section: 'Konfiguracja',
    allowedRoles: ['admin', 'pracownik_dziekanatu'],
  },
  {
    title: 'Zarządzaj Semestrami',
    description: 'Definiuj semestry i lata akademickie.',
    icon: <EventNoteIcon sx={{ fontSize: 40 }} />,
    path: '/admin/semesters',
    section: 'Konfiguracja',
    allowedRoles: ['admin'],
  },
  {
    title: 'Zarządzaj Przedmiotami',
    description: 'Definiuj przedmioty dostępne na uczelni.',
    icon: <LibraryBooksIcon sx={{ fontSize: 40 }} />,
    path: '/admin/subjects',
    section: 'Konfiguracja',
    allowedRoles: ['admin'],
  },
  {
    title: 'Stwórz raport',
    description: 'Stwórz raport z przydziałów.',
    icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
    path: '/admin/reports/workload',
    section: 'Konfiguracja',
    allowedRoles: ['admin'],
  },

  {
    title: 'Zarządzaj Grupami',
    description: 'Twórz i edytuj grupy studenckie.',
    icon: <ClassIcon sx={{ fontSize: 40 }} />,
    path: '/admin/groups',
    section: 'Konfiguracja',
    allowedRoles: ['admin', 'pracownik_dziekanatu'],
  },
  {
    title: 'Zarządzaj słownikami',
    description: 'Twórz i edytuj katedry i stopnie.',
    icon: <MenuBookIcon sx={{ fontSize: 40 }} />,
    path: '/admin/dictionaries',
    section: 'Konfiguracja',
    allowedRoles: ['admin'],
  },
  {
    title: 'Zarządzaj użytkownikami',
    description: 'Dodawanie użytkowników, dyspozycyjność.',
    icon: <AccountBoxIcon sx={{ fontSize: 40 }} />,
    path: '/admin/users',
    section: 'Konfiguracja',
    allowedRoles: ['admin'],
  },

  // Wspólne dla wszystkich pracowników
  {
    title: 'Zarządzaj Aktualnościami',
    description: 'Dodawaj i edytuj ogłoszenia.',
    icon: <NewspaperIcon sx={{ fontSize: 40 }} />,
    path: '/admin/news',
    section: 'Wspólne',
    allowedRoles: ['admin', 'prowadzacy', 'pracownik_dziekanatu', 'pracownik_kwestury'],
  },
];
export const AdminDashboardPage = () => {
  const { role } = useAuthContext();
  const [latestArticles, setLatestArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNewsArticles()
      .then((articles) => setLatestArticles(articles.slice(0, 3)))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Filtrujemy kafelki, do których użytkownik ma dostęp
  const visibleTiles = allAdminTiles.filter((tile) => role && tile.allowedRoles.includes(role));

  // Grupujemy przefiltrowane kafelki po sekcjach
  const groupedTiles = visibleTiles.reduce((acc, tile) => {
    const section = tile.section || 'Inne';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(tile);
    return acc;
  }, {} as Record<string, typeof visibleTiles>);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1200px' }}>
        <Button
          component={RouterLink}
          to="/"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Wróc do pulipitu
        </Button>
        <Typography
          variant="h4"
          gutterBottom
        >
          Panel Pracownika
        </Typography>
        <Typography sx={{ mb: 4 }}>Wybierz sekcję, którą chcesz zarządzać.</Typography>

        {/* Renderujemy kafelki w sekcjach */}
        {Object.entries(groupedTiles).map(([section, tiles]) => (
          <Box
            key={section}
            sx={{ mb: 4 }}
          >
            <Typography
              variant="h5"
              gutterBottom
            >
              {section}
            </Typography>
            <Grid
              container
              spacing={3}
            >
              {tiles.map((tile) => (
                <Grid
                  size={{ xs: 12, sm: 6, md: 4 }}
                  key={tile.title}
                >
                  <Card sx={{ height: '100%' }}>
                    <CardActionArea
                      component={RouterLink}
                      to={tile.path}
                      sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          {tile.icon}
                          <Typography
                            variant="h6"
                            component="div"
                            sx={{ ml: 2 }}
                          >
                            {tile.title}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          {tile.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}

        <Divider sx={{ my: 4 }} />
        <Box>
          <Typography
            variant="h5"
            gutterBottom
          >
            Ostatnio Opublikowane Aktualności (Podgląd)
          </Typography>
          {loading ? (
            <CircularProgress />
          ) : (
            <Box>
              {latestArticles.length === 0 ? (
                <Typography>Brak wpisów.</Typography>
              ) : (
                latestArticles.map((article) => (
                  <Paper
                    key={article.id}
                    variant="outlined"
                    sx={{ p: 2, mb: 2 }}
                  >
                    <Typography variant="h6">{article.title}</Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Opublikowano:{' '}
                      {article.createdAt ? format(article.createdAt.toDate(), 'd MMM yy', { locale: pl }) : ''}
                    </Typography>
                    <Typography
                      variant="body1"
                      noWrap
                    >
                      {article.content}
                    </Typography>
                  </Paper>
                ))
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
