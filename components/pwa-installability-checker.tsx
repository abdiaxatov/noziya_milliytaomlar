"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface PWAInstallCriteria {
  name: string;
  status: "pass" | "fail" | "warning";
  description: string;
  details?: string;
}

export default function PWAInstallabilityChecker() {
  const [criteria, setCriteria] = useState<PWAInstallCriteria[]>([]);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    checkInstallability();
  }, []);

  const checkInstallability = async () => {
    const checks: PWAInstallCriteria[] = [];

    // 1. HTTPS or localhost
    const isSecure =
      location.protocol === "https:" || location.hostname === "localhost";
    checks.push({
      name: "HTTPS yoki localhost",
      status: isSecure ? "pass" : "fail",
      description: "Ilova HTTPS orqali yoki localhost da ishlamog'i kerak",
      details: isSecure ? "✅ To'g'ri" : "❌ HTTP ishlatilayotgan",
    });

    // 2. Service Worker
    let hasServiceWorker = false;
    if ("serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        hasServiceWorker = registrations.length > 0;
      } catch (e) {
        console.log("SW check failed:", e);
      }
    }
    checks.push({
      name: "Service Worker",
      status: hasServiceWorker ? "pass" : "fail",
      description: "Service Worker ro'yxatdan o'tgan bo'lishi kerak",
      details: hasServiceWorker
        ? "✅ Ro'yxatdan o'tgan"
        : "❌ Ro'yxatdan o'tmagan",
    });

    // 3. Web App Manifest
    let hasManifest = false;
    let manifestValid = false;
    try {
      const manifestLink = document.querySelector(
        'link[rel="manifest"]'
      ) as HTMLLinkElement;
      if (manifestLink) {
        hasManifest = true;
        const response = await fetch(manifestLink.href);
        const manifest = await response.json();

        // Check required fields
        const requiredFields = ["name", "icons", "start_url"];
        const hasRequiredFields = requiredFields.every(
          (field) => manifest[field]
        );

        // Check for 192x192 icon
        const has192Icon = manifest.icons?.some(
          (icon: any) =>
            icon.sizes?.includes("192x192") || icon.sizes?.includes("512x512")
        );

        manifestValid = hasRequiredFields && has192Icon;
      }
    } catch (e) {
      console.log("Manifest check failed:", e);
    }

    checks.push({
      name: "Web App Manifest",
      status: hasManifest && manifestValid ? "pass" : "fail",
      description: "Manifest.json to'g'ri sozlangan bo'lishi kerak",
      details: hasManifest
        ? manifestValid
          ? "✅ To'g'ri"
          : "❌ Kerakli maydonlar yo'q"
        : "❌ Manifest topilmadi",
    });

    // 4. beforeinstallprompt event
    let supportsInstallPrompt = false;
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      supportsInstallPrompt = true;
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt, {
      once: true,
    });

    // Trigger install prompt check
    setTimeout(() => {
      checks.push({
        name: "Install Prompt",
        status: supportsInstallPrompt ? "pass" : "warning",
        description: "Brauzer install prompt ni qo'llab-quvvatlashi kerak",
        details: supportsInstallPrompt
          ? "✅ Qo'llab-quvvatlanadi"
          : "⚠️ Hali aniqlanmadi",
      });
      setCriteria(checks);
    }, 1000);

    // 5. User engagement (simulated)
    checks.push({
      name: "Foydalanuvchi o'zaro ta'siri",
      status: "warning",
      description: "Chrome 30 soniya va 2 tashrif talab qiladi",
      details: "⚠️ Development rejimida cheklangan",
    });

    setCriteria(checks);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("Foydalanuvchi o'rnatishni qabul qildi");
    } else {
      console.log("Foydalanuvchi o'rnatishni rad etdi");
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "fail":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pass":
        return "text-green-700 bg-green-50";
      case "fail":
        return "text-red-700 bg-red-50";
      case "warning":
        return "text-yellow-700 bg-yellow-50";
      default:
        return "text-gray-700 bg-gray-50";
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 PWA Installability Tekshiruvi
            <Badge variant={isInstallable ? "default" : "secondary"}>
              {isInstallable ? "O'rnatish mumkin" : "O'rnatish mumkin emas"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Chrome "Install app" tugmasini ko'rsatish uchun barcha kriteriyalar
            bajarilishi kerak
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {criteria.map((item, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getStatusColor(
                  item.status
                )}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm opacity-80">{item.description}</p>
                    {item.details && (
                      <p className="text-sm font-mono mt-1">{item.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isInstallable && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                🎉 Ilova o'rnatishga tayyor!
              </h3>
              <Button onClick={handleInstall} className="w-full">
                📱 Ilovani o'rnatish
              </Button>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 border rounded-lg">
            <h3 className="font-semibold mb-2">🔧 Muammolarni hal qilish:</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Service Worker yo'q:</strong> next.config.mjs da PWA
                yoqilganligini tekshiring
              </div>
              <div>
                <strong>Manifest xato:</strong> public/manifest.json ni
                tekshiring
              </div>
              <div>
                <strong>HTTPS yo'q:</strong> Production da HTTPS ishlatilishi
                kerak
              </div>
              <div>
                <strong>Install prompt yo'q:</strong> Foydalanuvchi 30 soniya
                o'zaro ta'sir qilishi kerak
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">
              ⚠️ Development rejimi
            </h3>
            <p className="text-sm text-yellow-800">
              Production da test qilish uchun{" "}
              <code>npm run build && npm start</code> ishlatib, HTTPS sertifikat
              bilan (masalan, ngrok) test qiling.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
