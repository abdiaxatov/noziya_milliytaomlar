"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallButtonProps {
  className?: string;
  variant?:
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function PWAInstallButton({
  className,
  variant = "default",
  size = "default",
}: PWAInstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Check visibility after a delay
    const timer = setTimeout(() => {
      if (!isInstalled && !deferredPrompt) {
        setIsVisible(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(timer);
    };
  }, [deferredPrompt, isInstalled]);

  const { t } = useLanguage();

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log(t("pwa.status.accepted"));
      setIsInstalled(true);
    } else {
      console.log(t("pwa.status.dismissed"));
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (isInstalled || !isVisible) {
    return null;
  }

  return (
    <Button
      onClick={handleInstall}
      variant={variant}
      size={size}
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      {t("pwa.installBtn")}
    </Button>
  );
}
