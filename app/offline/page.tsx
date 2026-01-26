"use client";

import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center border border-orange-100">
        <div className="mb-6">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <svg
              className="w-10 h-10 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-12.728 12.728m0 0L5 21m13.364-15.364L21 5"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Cheesesteak.uz - Online Restaurant
          </h1>
          <h2 className="text-xl font-semibold text-orange-600 mb-4">
            You're offline
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Hozirda internetga ulanmaganingiz sababli ba'zi funksiyalar
            ishlamaydi. Iltimos, internetga ulanib, qayta urinib ko'ring.
          </p>
          {!isOnline && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">
                ⚠️ Internet ulanishi yo'q. Tekshirib ko'ring va qayta urinib
                ko'ring.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={handleReload}
            className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Qayta yuklash
          </button>

          <button
            onClick={handleReload}
            className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200 shadow-lg"
          >
            Try Again
          </button>

          <div className="text-sm text-gray-500 space-y-2">
            <p className="font-medium">Cheesesteak.uz - Online Restaurant</p>
            <p>Sizning restoran ilovangiz</p>
            <p className="text-xs">Offline rejimda mavjud</p>
          </div>
        </div>
      </div>
    </div>
  );
}
