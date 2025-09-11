import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCF0n63bbexFKlH0YAdnsxdGC9kOQ34mCE',
  authDomain: 'anoopole-main.firebaseapp.com',
  projectId: 'anoopole-main',
  storageBucket: 'anoopole-main.firebasestorage.app',
  messagingSenderId: '172657938536',
  appId: '1:172657938536:web:ac46d125ef217b1685ebdd',
  measurementId: 'G-RVWQXD4FB1',
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
