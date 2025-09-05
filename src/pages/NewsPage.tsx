// src/pages/NewsPage.tsx
import { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress, Card, CardContent, Divider } from '@mui/material';
import { getNewsArticles } from '../features/news/newsService';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export const NewsPage = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNewsArticles()
      .then((fetchedArticles) => {
        setArticles(fetchedArticles);
      })
      .catch((err) => console.error('Błąd pobierania artykułów:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1200px' }}>
        <Typography
          variant="h4"
          gutterBottom
        >
          Aktualności i Ogłoszenia
        </Typography>
        {loading ? (
          <CircularProgress />
        ) : (
          <Box>
            {articles.length === 0 ? (
              <Typography>Brak aktualności.</Typography>
            ) : (
              articles.map((article) => (
                <Card
                  key={article.id}
                  sx={{ mb: 3 }}
                >
                  <CardContent>
                    <Typography
                      variant="h5"
                      component="div"
                    >
                      {article.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      Opublikowano:{' '}
                      {article.createdAt
                        ? format(article.createdAt.toDate(), 'd MMMM yyyy, HH:mm', { locale: pl })
                        : ''}{' '}
                      przez {article.authorName}
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography
                      variant="body1"
                      sx={{ whiteSpace: 'pre-wrap' }}
                    >
                      {article.content}
                    </Typography>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};
