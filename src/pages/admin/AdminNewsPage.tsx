import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button } from '@mui/material';
import { useAuthContext } from '../../context/AuthContext';
import { addNewsArticle } from '../../features/news/newsService';
import { Link as RouterLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LoadingAnimation } from '../../assets/animations/LoadingAnimation';

export const AdminNewsPage = () => {
  const { user } = useAuthContext();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !content) {
      toast.error('Tytuł i treść są wymagane.');
      return;
    }
    setLoading(true);

    try {
      await addNewsArticle({
        title,
        content,
        authorId: user.uid,
        authorName: user.displayName || 'Anonim',
      });
      toast.success('Aktualność została pomyślnie opublikowana!');
      setTitle('');
      setContent('');
      navigate('/news');
    } catch (err) {
      console.error(err);
      toast.error('Wystąpił błąd podczas publikacji.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '900px' }}>
        <Button
          component={RouterLink}
          to="/admin"
          sx={{ mb: 2 }}
        >
          &larr; Wróć do panelu
        </Button>
        <Typography
          variant="h4"
          gutterBottom
        >
          Zarządzaj Aktualnościami
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
        >
          <TextField
            label="Tytuł aktualności"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Treść"
            fullWidth
            required
            multiline
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? <LoadingAnimation /> : 'Opublikuj'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
