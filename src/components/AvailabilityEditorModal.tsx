import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress } from '@mui/material';
import { getUserAvailability } from '../features/user/userService';
import { AvailabilityPanel, type AvailabilitySlot } from '../pages/SettingsPage';
import type { UserProfile } from '../features/user/userService';

interface AvailabilityEditorModalProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile; // Użytkownik, którego dostępność edytujemy
}

export const AvailabilityEditorModal: React.FC<AvailabilityEditorModalProps> = ({ open, onClose, user }) => {
  const [initialAvailability, setInitialAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setLoading(true);
      getUserAvailability(user.id)
        .then((data: AvailabilitySlot[]) => setInitialAvailability(data as AvailabilitySlot[]))
        .finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Zarządzaj dostępnością dla: {user.displayName}</DialogTitle>
      <DialogContent>
        {loading ? (
          <CircularProgress />
        ) : (
          <AvailabilityPanel
            userProfile={user}
            initialAvailability={initialAvailability}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Zamknij</Button>
      </DialogActions>
    </Dialog>
  );
};
