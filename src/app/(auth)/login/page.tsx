"use client";

import LoginButtons from "@/components/auth/LoginButtons";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const providers = [
  {
    id: "google",
    name: "Google",
    color: "bg-red-500 hover:bg-red-600",
    icon: "G",
  },
  {
    id: "facebook",
    name: "Facebook",
    color: "bg-blue-600 hover:bg-blue-700",
    icon: "F",
  },
  {
    id: "twitter",
    name: "Twitter",
    color: "bg-blue-400 hover:bg-blue-500",
    icon: "T",
  },
];

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !isLoading) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900">
          📝 Smart Notes
        </h2>
        <p className="mt-2 text-center text-lg text-gray-600">
          Notlarınızı otomatik kategorize eden akıllı not uygulaması
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Giriş Yap veya Kayıt Ol
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Notlarınızı otomatik organize edin. {providers.length} farklı
                sosyal giriş seçeneği.
              </p>
            </div>

            <LoginButtons providers={providers} />

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Özellikler
                  </span>
                </div>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li className="flex items-center">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Otomatik kategori önerisi
                </li>
                <li className="flex items-center">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Türkçe dil desteği
                </li>
                <li className="flex items-center">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  10 gün otomatik expire
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
