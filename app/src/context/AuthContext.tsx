import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiLogin, apiLogout, apiRegister, apiVerify, type User, type RegisterResult } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    role?: 'client' | 'professional';
    phone?: string;
    location?: string;
    title?: string;
    bio?: string;
    id_card_number?: string;
  }) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on first load (no-op when backend is offline)
  useEffect(() => {
    let cancelled = false;
    apiVerify().then((u) => {
      if (!cancelled) {
        setUser(u);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setUser(u);
    return u;
  };

  const register: AuthContextValue['register'] = async (payload) => {
    const result = await apiRegister(payload);
    // Providers awaiting approval are not logged in (result.user is null).
    if (result.user) setUser(result.user);
    return result;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const updateUser = (u: User) => setUser(u);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
