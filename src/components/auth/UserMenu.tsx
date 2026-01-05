"use client";

import { useAuth } from "@/lib/auth";
import { useState } from "react";

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 focus:outline-none"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
          {user.email?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-700">{user.email}</p>
          <p className="text-xs text-gray-500">Hesabım</p>
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
            <div className="px-4 py-2 border-b">
              <p className="text-sm text-gray-700">{user.email}</p>
            </div>
            <a
              href="#"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
            >
              Profilim
            </a>
            <a
              href="#"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
              }}
            >
              Ayarlar
            </a>
            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Çıkış Yap
            </button>
          </div>
        </>
      )}
    </div>
  );
}
