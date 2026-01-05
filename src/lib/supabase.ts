import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ÖNEMLİ: Cookie-based session storage kullan
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: {
      // Custom storage implementation
      getItem: (key: string): string | null => {
        if (typeof window === "undefined") return null;

        try {
          // Önce cookie'den dene
          const cookies = document.cookie.split(";").reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split("=");
            acc[key] = value;
            return acc;
          }, {} as Record<string, string>);

          if (cookies[key]) {
            return decodeURIComponent(cookies[key]);
          }

          // Sonra localStorage'dan
          return localStorage.getItem(key);
        } catch (error) {
          console.error("Storage getItem error:", error);
          return null;
        }
      },
      setItem: (key: string, value: string): void => {
        if (typeof window === "undefined") return;

        try {
          // Cookie'ye yaz (7 gün geçerli)
          document.cookie = `${key}=${encodeURIComponent(
            value
          )}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax${
            window.location.protocol === "https:" ? "; secure" : ""
          }`;

          // localStorage'a da yaz
          localStorage.setItem(key, value);
        } catch (error) {
          console.error("Storage setItem error:", error);
        }
      },
      removeItem: (key: string): void => {
        if (typeof window === "undefined") return;

        try {
          // Cookie'yi sil
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;

          // localStorage'dan da sil
          localStorage.removeItem(key);
        } catch (error) {
          console.error("Storage removeItem error:", error);
        }
      },
    },
    flowType: "pkce", // PKCE flow kullan (daha güvenli)
  },
  global: {
    headers: {
      "x-application-name": "smart-notes",
    },
  },
});

// Session kontrol fonksiyonu
export async function getValidSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Session error:", error);
      // Session expired, temizle
      await supabase.auth.signOut();
      return null;
    }

    if (!session) {
      console.log("No session found");
      return null;
    }

    // Session'ı refresh et
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (refreshError) {
      console.error("Session refresh error:", refreshError);
      return null;
    }

    return refreshedSession;
  } catch (error) {
    console.error("getValidSession error:", error);
    return null;
  }
}
