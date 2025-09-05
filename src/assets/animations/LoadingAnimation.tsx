import Lottie from 'lottie-react';
import loadingAnimation from './loading.json';

export const LoadingAnimation = () => {
  // Możesz dostosować rozmiar animacji tutaj
  return (
    <Lottie
      animationData={loadingAnimation}
      style={{ width: 200, height: 200 }}
    />
  );
};
