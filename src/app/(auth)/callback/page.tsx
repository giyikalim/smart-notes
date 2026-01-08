"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash from the URL
        const hash = window.location.hash;

        if (hash) {
          // PKCE flow için hash'i işle
          const { data, error } = await supabase.auth.getSessionFromUrl({
            storeSession: true,
          });

          if (error) {
            throw error;
          }

          if (data?.session) {
            // Başarılı, dashboard'a yönlendir
            router.push("/dashboard");
            return;
          }
        }

        // Regular OAuth callback
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          // Profile oluştur/güncelle
          try {
            await supabase.from("profiles").upsert({
              id: session.user.id,
              email: session.user.email,
              full_name:
                session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name,
              avatar_url:
                session.user.user_metadata?.avatar_url ||
                session.user.user_metadata?.picture,
              updated_at: new Date().toISOString(),
            });
          } catch (profileError) {
            console.error("Profile error (non-critical):", profileError);
          }

          // Dashboard'a yönlendir
          setTimeout(() => {
            router.push("/dashboard");
          }, 1000);
        } else {
          setError("No session found. Please try again.");
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "Authentication failed");

        // 5 saniye sonra login'e geri dön
        setTimeout(() => {
          router.push("/login");
        }, 5000);
      }
    };

    handleAuthCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white dark:bg-gray-900 rounded-lg shadow">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Authentication Error
            </h3>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <div className="mt-6">
              <p className="text-sm text-gray-500">
                Redirecting to login page in 5 seconds...
              </p>
              <button
                onClick={() => router.push("/login")}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Go to Login Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
        <p className="mt-2 text-sm text-gray-500">
          You will be redirected to the dashboard shortly.
        </p>
      </div>
    </div>
  );
}
