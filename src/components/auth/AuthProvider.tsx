import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthUser extends User {
  role?: string;
  firstName?: string;
  lastName?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, totpToken?: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  setup2FA: () => Promise<{ success: boolean; secret?: string; qrCode?: string; error?: string }>;
  verify2FA: (token: string, secret: string) => Promise<{ success: boolean; error?: string }>;
  disable2FA: (password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SECURITY_SERVER_URL = 'http://localhost:3004';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setSession(session);
          if (session?.user) {
            setUser({
              ...session.user,
              role: session.user.user_metadata?.role || 'viewer',
              firstName: session.user.user_metadata?.first_name,
              lastName: session.user.user_metadata?.last_name,
              permissions: session.user.user_metadata?.permissions || []
            });
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        
        if (session?.user) {
          setUser({
            ...session.user,
            role: session.user.user_metadata?.role || 'viewer',
            firstName: session.user.user_metadata?.first_name,
            lastName: session.user.user_metadata?.last_name,
            permissions: session.user.user_metadata?.permissions || []
          });
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, totpToken?: string) => {
    try {
      setLoading(true);
      
      // Use our security server for enhanced authentication
      const response = await fetch(`${SECURITY_SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, totpToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      if (data.requires2FA) {
        return { success: true, requires2FA: true };
      }

      // Store tokens securely
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Also sign in with Supabase for database access
      const { error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (supabaseError) {
        console.warn('Supabase sign-in warning:', supabaseError.message);
      }

      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Sign in failed' };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setLoading(true);
      
      // Use our security server for enhanced registration
      const response = await fetch(`${SECURITY_SERVER_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Sign up failed' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Sign out from our security server
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        await fetch(`${SECURITY_SERVER_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      }

      // Clear stored tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      // Sign out from Supabase
      await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${SECURITY_SERVER_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      localStorage.setItem('accessToken', data.accessToken);
      
      return data;
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, sign out the user
      await signOut();
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${SECURITY_SERVER_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      // Update local user state
      if (user) {
        setUser({ ...user, ...updates });
      }

      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: 'Profile update failed' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${SECURITY_SERVER_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: 'Password change failed' };
    }
  };

  const setup2FA = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${SECURITY_SERVER_URL}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { 
        success: true, 
        secret: data.secret, 
        qrCode: data.qrCode 
      };
    } catch (error) {
      console.error('2FA setup error:', error);
      return { success: false, error: '2FA setup failed' };
    }
  };

  const verify2FA = async (token: string, secret: string) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${SECURITY_SERVER_URL}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token, secret }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (error) {
      console.error('2FA verification error:', error);
      return { success: false, error: '2FA verification failed' };
    }
  };

  const disable2FA = async (password: string) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${SECURITY_SERVER_URL}/api/auth/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (error) {
      console.error('2FA disable error:', error);
      return { success: false, error: '2FA disable failed' };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshToken,
    updateProfile,
    changePassword,
    setup2FA,
    verify2FA,
    disable2FA,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
