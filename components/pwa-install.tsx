"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

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

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the install prompt after a short delay
      setTimeout(() => setShowPrompt(true), 3000);
    };

    const handleAppInstalled = () => {
      // Hide the install prompt
      setShowPrompt(false);
      setDeferredPrompt(null);
      // Optionally show a success message
      toast({
        title: "Ilova o'rnatildi!",
        description: "Cheesesteak.uz endi sizning qurilmangizda.",
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
  }, [toast]);

  useEffect(() => {
    if (showPrompt && deferredPrompt) {
      toast({
        title: "Ilovani o'rnating",
        description: "Cheesesteak.uz ni tezroq ochish uchun ilovani o'rnating",
        action: (
          <ToastAction
            altText="O'rnatish"
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
            O'rnatish
          </ToastAction>
        ),
        duration: 10000, // Show for 10 seconds
      });
    }
  }, [showPrompt, deferredPrompt, toast]);

  return null;
}
