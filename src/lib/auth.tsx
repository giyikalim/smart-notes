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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Kullanıcıyı yükleme fonksiyonu
  const loadUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(user);
      setSession(session);
    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

        if (event === "SIGNED_IN") {
          router.push("/dashboard");
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setSession(null);
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUser, router]);

  // Giriş yap
  const signIn = async (provider: string) => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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

// ✅ useProtectedRoute hook'u EKLENDİ
export function useProtectedRoute() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  return { user, isLoading };
}
