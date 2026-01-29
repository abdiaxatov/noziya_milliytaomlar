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
import { useLanguage } from "@/hooks/use-language";

interface PWAInstallCriteria {
  name: string;
  status: "pass" | "fail" | "warning";
  description: string;
  details?: string;
}

export default function PWAInstallabilityChecker() {
  const { t } = useLanguage();
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
      name: t("pwa.checks.https"),
      status: isSecure ? "pass" : "fail",
      description: t("pwa.checks.httpsDesc"),
      details: isSecure ? t("pwa.checks.pass") : t("pwa.checks.fail"),
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
      name: t("pwa.checks.sw"),
      status: hasServiceWorker ? "pass" : "fail",
      description: t("pwa.checks.swDesc"),
      details: hasServiceWorker
        ? t("pwa.checks.swOk")
        : t("pwa.checks.swFail"),
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
      name: t("pwa.checks.manifest"),
      status: hasManifest && manifestValid ? "pass" : "fail",
      description: t("pwa.checks.manifestDesc"),
      details: hasManifest
        ? manifestValid
          ? t("pwa.checks.manifestOk")
          : t("pwa.checks.manifestNoFields")
        : t("pwa.checks.manifestNoFile"),
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
        name: t("pwa.checks.prompt"),
        status: supportsInstallPrompt ? "pass" : "warning",
        description: t("pwa.checks.promptDesc"),
        details: supportsInstallPrompt
          ? t("pwa.checks.promptOk")
          : t("pwa.checks.promptWaiting"),
      });
      setCriteria(checks);
    }, 1000);

    // 5. User engagement (simulated)
    checks.push({
      name: t("pwa.checks.interaction"),
      status: "warning",
      description: t("pwa.checks.interactionDesc"),
      details: t("pwa.checks.interactionDev"),
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
            {t("pwa.checkerTitle")}
            <Badge variant={isInstallable ? "default" : "secondary"}>
              {isInstallable ? t("pwa.installable") : t("pwa.notInstallable")}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t("pwa.checkerDesc")}
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
                {t("pwa.installReady")}
              </h3>
              <Button onClick={handleInstall} className="w-full">
                📱 {t("pwa.installBtn")}
              </Button>
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 border rounded-lg">
            <h3 className="font-semibold mb-2">{t("pwa.troubleshooting")}</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Service Worker:</strong> {t("pwa.tips.sw")}
              </div>
              <div>
                <strong>Manifest:</strong> {t("pwa.tips.manifest")}
              </div>
              <div>
                <strong>HTTPS:</strong> {t("pwa.tips.https")}
              </div>
              <div>
                <strong>Install prompt:</strong> {t("pwa.tips.prompt")}
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">
              {t("pwa.devMode")}
            </h3>
            <p className="text-sm text-yellow-800">
              {t("pwa.devModeDesc")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
