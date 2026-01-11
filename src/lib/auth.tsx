"use client";

import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "./supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (provider: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

// lib/auth.ts'de AuthProvider'ı güncelleyin
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const router = useRouter();

  // Kullanıcıyı yükleme fonksiyonu
  const loadUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (userError) {
        console.error("User error:", userError);
      }

      if (sessionError) {
        console.error("Session error:", sessionError);
      }

      setUser(user);
      setSession(session);
    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
      if (initialLoad) {
        setInitialLoad(false);
      }
    }
  }, [initialLoad]);

  // İlk yükleme
  useEffect(() => {
    loadUser();

    // Auth state değişikliklerini dinle
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth state changed:", event);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setUser(newSession?.user ?? null);
        setSession(newSession);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setSession(null);
      } else if (event === "INITIAL_SESSION") {
        // İlk session yüklendi
        setUser(newSession?.user ?? null);
        setSession(newSession);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUser, initialLoad]); // router'ı buradan kaldırın

  // Giriş yap
  const signIn = async (provider: string) => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      });
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  // Çıkış yap
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Çıkış yaptıktan sonra router'ı burada kullan
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  // Kullanıcıyı yenile
  const refreshUser = async () => {
    await loadUser();
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    signIn,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// useAuth hook'u
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// lib/auth.ts'de useProtectedRoute'u güncelleyin
export function useProtectedRoute() {
  const { user, isLoading, session } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Yalnızca ilk yüklemede veya session değiştiğinde kontrol et
    if (!isLoading) {
      if (!user || !session) {
        // Küçük bir gecikme ekleyin, tarayıcının sayfayı tam yüklemesini bekleyin
        const timer = setTimeout(() => {
          router.push("/login");
        }, 100);

        return () => clearTimeout(timer);
      } else {
        setIsChecking(false);
      }
    }
  }, [user, session, isLoading, router]);

  // Hala yükleniyorsa veya kontrol ediliyorsa loading göster
  if (isLoading || isChecking) {
    return {
      user: null,
      isLoading: true,
      session: null,
    };
  }

  return {
    user,
    isLoading: false,
    session,
  };
}
