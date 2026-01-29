"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useLanguage } from "@/hooks/use-language";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the install prompt immediately
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      // Hide the install prompt
      setShowPrompt(false);
      setDeferredPrompt(null);
      // Optionally show a success message
      toast({
        title: t("pwa.installSuccess"),
        description: t("pwa.installSuccessDesc"),
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [toast, t]);

  useEffect(() => {
    if (showPrompt && deferredPrompt) {
      toast({
        title: t("pwa.installToastTitle"),
        description: t("pwa.installToastDesc"),
        action: (
          <ToastAction
            altText={t("pwa.installToastAction")}
            onClick={async () => {
              if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === "accepted") {
                  console.log("User accepted the install prompt");
                } else {
                  console.log("User dismissed the install prompt");
                }
                setDeferredPrompt(null);
                setShowPrompt(false);
              }
            }}
          >
            {t("pwa.installToastAction")}
          </ToastAction>
        ),
        duration: Infinity, // Do not auto-dismiss
      });
    }
  }, [showPrompt, deferredPrompt, toast, t]);

  return null;
}
