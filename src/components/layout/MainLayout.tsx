import { useState, type MouseEvent } from 'react';
import { Link as RouterLink, Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
// Ikony
import MailIcon from '@mui/icons-material/Mail';
import SchoolIcon from '@mui/icons-material/School';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GradeIcon from '@mui/icons-material/Grade';
import PaymentIcon from '@mui/icons-material/Payment';
import ArticleIcon from '@mui/icons-material/Article';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import GroupIcon from '@mui/icons-material/Group';
import ClassIcon from '@mui/icons-material/Class';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventNoteIcon from '@mui/icons-material/EventNote';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import StyleIcon from '@mui/icons-material/Style';
import HowToRegIcon from '@mui/icons-material/HowToReg';
// Firebase & Context
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuthContext } from '../../context/AuthContext';

const drawerWidth = 240;

const studentNavItems = [
  { text: 'Kalendarz', icon: <CalendarMonthIcon />, path: '/' },
  { text: 'Aktualności', icon: <NewspaperIcon />, path: '/news' },
  { text: 'Oceny', icon: <GradeIcon />, path: '/grades' },
  { text: 'Opłaty', icon: <PaymentIcon />, path: '/payments' },
  { text: 'Dokumenty', icon: <ArticleIcon />, path: '/documents' },
  { text: 'Mój Plan Zajęć', icon: <ScheduleIcon />, path: '/my-timetable' },
];

const adminNavItems = [
  {
    text: 'Pulpit',
    icon: <AdminPanelSettingsIcon />,
    path: '/admin',
    allowedRoles: ['admin', 'prowadzacy', 'pracownik_dziekanatu', 'pracownik_kwestury'],
  },
  {
    text: 'Siatki Programowe',
    icon: <AccountTreeIcon />,
    path: '/admin/curriculums',
    allowedRoles: ['admin', 'pracownik_dziekanatu'],
  },
  {
    text: 'Lista planów',
    icon: <ScheduleIcon />,
    path: '/admin/TimetableList',
    allowedRoles: ['admin', 'pracownik_dziekanatu'],
  },

  { text: 'Wystaw Oceny', icon: <GradeIcon />, path: '/admin/grading', allowedRoles: ['admin', 'prowadzacy'] },
  {
    text: 'Rekrutacja',
    icon: <HowToRegIcon />,
    path: '/admin/recruitment',
    allowedRoles: ['admin', 'pracownik_dziekanatu'],
  },
  {
    text: 'Zarządzaj Studentami',
    icon: <GroupIcon />,
    path: '/admin/students',
    allowedRoles: ['admin', 'pracownik_dziekanatu'],
  },
  {
    text: 'Zarządzaj Grupami',
    icon: <ClassIcon />,
    path: '/admin/groups',
    allowedRoles: ['admin', 'pracownik_dziekanatu'],
  },
  {
    text: 'Harmonogramy Opłat',
    icon: <RequestQuoteIcon />,
    path: '/admin/fee-schedules',
    allowedRoles: ['admin', 'pracownik_kwestury'],
  },
  {
    text: 'Zarządzaj Płatnościami',
    icon: <PaymentIcon />,
    path: '/admin/payments',
    allowedRoles: ['admin', 'pracownik_kwestury'],
  },
  {
    text: 'Zarządzaj Wnioskami',
    icon: <ArticleIcon />,
    path: '/admin/submissions',
    allowedRoles: ['admin', 'pracownik_dziekanatu'],
  },
  // === NOWY LINK ===
  { text: 'Słowniki Systemowe', icon: <StyleIcon />, path: '/admin/dictionaries', allowedRoles: ['admin'] },
  { text: 'Zarządzaj Przedmiotami', icon: <LibraryBooksIcon />, path: '/admin/subjects', allowedRoles: ['admin'] },
  { text: 'Zarządzaj Semestrami', icon: <EventNoteIcon />, path: '/admin/semesters', allowedRoles: ['admin'] },
  {
    text: 'Zarządzaj Aktualnościami',
    icon: <NewspaperIcon />,
    path: '/admin/news',
    allowedRoles: ['admin', 'prowadzacy', 'pracownik_dziekanatu', 'pracownik_kwestury'],
  },
];

const staffRoles = ['admin', 'prowadzacy', 'pracownik_dziekanatu', 'pracownik_kwestury'];

export const MainLayout = () => {
  const { user, logout, role } = useAuthContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await signOut(auth);
      logout();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1 }}
          >
            Wirtualny Dziekanat
          </Typography>
          <IconButton
            color="inherit"
            component="a"
            href="mailto:example@example.com"
            target="_blank"
            title="Poczta"
          >
            <MailIcon />
          </IconButton>
          <IconButton
            color="inherit"
            component="a"
            href="https://moodle.org"
            target="_blank"
            title="Moodle"
          >
            <SchoolIcon />
          </IconButton>
          <Tooltip title="Ustawienia konta">
            <IconButton
              onClick={handleMenuOpen}
              sx={{ p: 0, ml: 2 }}
            >
              <Avatar
                alt={user?.displayName || 'U'}
                src={user?.photoURL || ''}
              >
                {user?.email?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={isMenuOpen}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
          >
            <MenuItem disabled>Witaj, {user?.displayName || user?.email}</MenuItem>
            <Divider />
            <MenuItem
              component={RouterLink}
              to="/settings"
              onClick={handleMenuClose}
            >
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              Profil i Ustawienia
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Wyloguj
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem>
              <Typography variant="overline">Panel Studenta</Typography>
            </ListItem>
            {studentNavItems.map((item) => (
              <ListItem
                key={`student-${item.text}`}
                disablePadding
              >
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {role && staffRoles.includes(role) && (
            <>
              <Divider sx={{ my: 1 }} />
              <List>
                <ListItem>
                  <Typography variant="overline">Panel Pracownika</Typography>
                </ListItem>
                {adminNavItems
                  .filter((item) => item.allowedRoles.includes(role))
                  .map((item) => (
                    <ListItem
                      key={`admin-${item.text}`}
                      disablePadding
                    >
                      <ListItemButton
                        component={RouterLink}
                        to={item.path}
                      >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.text} />
                      </ListItemButton>
                    </ListItem>
                  ))}
              </List>
            </>
          )}
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column' }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};
