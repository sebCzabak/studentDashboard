// src/components/TestGroupsComponent.tsx
import { Button } from '@mui/material';
import { getAllGroups } from '../features/user/userService';
import toast from 'react-hot-toast';

export const TestGroupsComponent = () => {
  const runTest = async () => {
    console.log('Uruchamiam test pobierania grup...');
    toast('Uruchamiam test...');
    try {
      const groupsData = await getAllGroups();
      console.log('TEST ZAKOŃCZONY SUKCESEM:', groupsData);
      toast.success(`Pobrano ${groupsData.length} grup!`);
    } catch (error) {
      console.error('TEST ZAKOŃCZONY BŁĘDEM:', error);
      toast.error('Test nie powiódł się. Sprawdź konsolę.');
    }
  };

  return (
    <div style={{ border: '2px dashed red', padding: '10px', marginTop: '20px' }}>
      <h3>Komponent Testowy</h3>
      <p>Ten przycisk wywołuje tylko i wyłącznie funkcję `getAllGroups`.</p>
      <Button
        variant="contained"
        onClick={runTest}
      >
        Testuj Pobieranie Grup
      </Button>
    </div>
  );
};
