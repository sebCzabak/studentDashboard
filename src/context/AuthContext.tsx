import { createContext, useState, useContext, type ReactNode, useEffect } from 'react';
import { type User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../config/firebase'; // Upewnij się, że importujesz `db`
import { doc, getDoc } from 'firebase/firestore'; // Dodaj importy z firestore
import { Box } from '@mui/material';
import { LoadingAnimation } from '../assets/animations/LoadingAnimation';

type ProfileInfo = any;

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  profileInfo: ProfileInfo | null;
  role: string | null;
  permissions: string[]; // Nowe pole na uprawnienia
  loading: boolean;
  login: (
    newUser: User,
    token: string | null,
    profile: ProfileInfo | null,
    userRole: string | null,
    userPermissions: string[]
  ) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'googleAccessToken';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]); // Nowy stan
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const userRole = (tokenResult.claims.role as string) || 'student';
        const userPermissions = userDoc.exists() ? userDoc.data().managedApplicationTypes || [] : [];
        const storedToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

        setUser(firebaseUser);
        setRole(userRole);
        setAccessToken(storedToken);
        setPermissions(userPermissions);
        setProfileInfo(null);
      } else {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        setUser(null);
        setRole(null);
        setAccessToken(null);
        setProfileInfo(null);
        setPermissions([]); // Poprawka: Czyścimy uprawnienia
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Poprawka: Dodajemy `userPermissions` do parametrów funkcji
  const login = (
    newUser: User,
    token: string | null,
    profile: ProfileInfo | null,
    userRole: string | null,
    userPermissions: string[]
  ) => {
    if (token) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
    setUser(newUser);
    setAccessToken(token);
    setProfileInfo(profile);
    setRole(userRole);
    setPermissions(userPermissions); // Poprawka: Zapisujemy uprawnienia
  };

  const logout = () => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    setUser(null);
    setRole(null);
    setAccessToken(null);
    setProfileInfo(null);
    setPermissions([]);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LoadingAnimation />
      </Box>
    );
  }

  return (
    // Poprawka: Dodajemy `permissions` do wartości Providera
    <AuthContext.Provider value={{ user, accessToken, profileInfo, role, loading, login, logout, permissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider.');
  }
  return context;
};
