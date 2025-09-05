import { Box, Paper, Typography, Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArticleIcon from '@mui/icons-material/Article';
import { SubmissionsList } from '../features/submissions/components/SubmissionsList';

export const DocumentsPage = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1200px' }}>
        <Typography
          variant="h4"
          gutterBottom
        >
          Dokumenty i Wnioski
        </Typography>

        <Typography sx={{ mb: 2 }}>
          Wybierz wniosek, który chcesz wypełnić i złożyć. Dane osobowe zostaną uzupełnione automatycznie.
        </Typography>
        <Stack
          direction="row"
          spacing={2}
          sx={{ mt: 3 }}
        >
          <Button
            variant="contained"
            component={RouterLink}
            to="/documents/scholarship"
            startIcon={<ArticleIcon />}
          >
            Wniosek o stypendium rektora
          </Button>
          <Button
            variant="outlined"
            disabled
          >
            Wniosek o przywrócenie na studia (wkrótce)
          </Button>
          <Button
            variant="outlined"
            disabled
          >
            Wniosek o skreślenie z listy (wkrótce)
          </Button>
        </Stack>
        <hr style={{ margin: '32px 0' }} />
        <SubmissionsList />
      </Paper>
    </Box>
  );
};
