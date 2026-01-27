// src/features/students/components/OnboardingStatusChip.tsx
import { Chip } from '@mui/material';
// Upewnij się, że ścieżka do typów jest poprawna
import type { OnboardingStatus } from '../../user/types';

interface StatusChipProps {
  status?: OnboardingStatus;
}

/**
 * Współdzielony komponent renderujący Chip dla statusu onboardingu studenta.
 */
export const OnboardingStatusChip: React.FC<StatusChipProps> = ({ status }) => {
  switch (status) {
    case 'email_sent':
      return (
        <Chip
          label="Email powitalny wysłany"
          color="success"
          size="small"
        />
      );

    case 'pending_post':
      return (
        <Chip
          label="Oczekuje na wysyłkę listu"
          color="warning"
          size="small"
        />
      );

    case 'post_sent':
      return (
        <Chip
          label="List powitalny wysłany"
          color="primary"
          size="small"
        />
      );

    case 'pending_email':
      return (
        <Chip
          label="W trakcie wysyłki email"
          color="info"
          size="small"
        />
      );

    case 'completed':
      return (
        <Chip
          label="Onboarding zakończony"
          color="success"
          size="small"
        />
      );

    default:
      return (
        <Chip
          label="Brak statusu"
          color="default"
          size="small"
        />
      );
  }
};
