import { Box, Paper, Typography } from '@mui/material';
import { PaymentsList } from '../features/payments/components/PaymentsList';

export const PaymentsPage = () => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: '1200px' }}>
        <Typography
          variant="h4"
          gutterBottom
        >
          Opłaty za Studia
        </Typography>
        <PaymentsList />
      </Paper>
    </Box>
  );
};
