"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { collection, getDocs, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";
import { SearchBar } from "@/components/search-bar";
import { CategoryFilter } from "@/components/category-filter";
import { MenuGrid } from "@/components/menu-grid";
import { ViewMyOrdersButton } from "@/components/view-my-orders-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { OrderHistory } from "@/components/order-history";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Instagram, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { LogoLoader } from "@/components/ui/logo-loader";
import { AnimatePresence } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedName, getLocalizedDescription } from "@/lib/localization";

import type { MenuItem, Category, Banner } from "@/types";

export function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"menu" | "orders">("menu");
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);

  // 🔹 Banner fallback uchun state
  const [bannerSrc, setBannerSrc] = useState("/Banner.png");
  const [tableInfo, setTableInfo] = useState<{ number: number | string; type: string } | null>(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    const lastOrderInfoStr = localStorage.getItem("lastOrderInfo");
    if (lastOrderInfoStr) {
      try {
        const info = JSON.parse(lastOrderInfoStr);
        if (info.tableNumber) {
          setTableInfo({ number: info.tableNumber, type: t("menu.table") });
        } else if (info.roomNumber) {
          setTableInfo({ number: info.roomNumber, type: t("menu.room") });
        }
      } catch (e) {
        console.error("Error parsing lastOrderInfo", e);
      }
    }
  }, []);



  const { toast } = useToast();

  useEffect(() => {
    // 🔹 1. Cache First (Load from memory/storage immediately)
    const loadFromCache = () => {
      try {
        const cachedMenu = localStorage.getItem("menuItems");
        const cachedCategories = localStorage.getItem("categories");
        const cachedBanners = localStorage.getItem("banners");

        if (cachedMenu && cachedCategories) {
          setMenuItems(JSON.parse(cachedMenu));
          setCategories(JSON.parse(cachedCategories));
          if (cachedBanners) setBanners(JSON.parse(cachedBanners));
          setIsLoading(false);
          return true; // Cache found
        }
      } catch (e) {
        console.error("Cache parse error", e);
      }
      return false; // No cache
    };

    if (!loadFromCache()) {
      setIsLoading(true);
    }

    // 🔹 2. Real-time Listeners (Update cache on change)
    const unsubscribeCategories = onSnapshot(
      collection(db, "categories"),
      (snapshot) => {
        const categoriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(categoriesData);
        localStorage.setItem("categories", JSON.stringify(categoriesData));
      },
      (error) => console.error("Error fetching categories:", error)
    );

    const unsubscribeMenu = onSnapshot(
      collection(db, "menuItems"),
      (snapshot) => {
        const menuData = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "",
              name_uz: data.name_uz || "",
              name_ru: data.name_ru || "",
              name_en: data.name_en || "",
              description: data.description || "",
              description_uz: data.description_uz || "",
              description_ru: data.description_ru || "",
              description_en: data.description_en || "",
              price: data.price || 0,
              discountPrice: data.discountPrice || null,
              discountEndsAt: data.discountEndsAt || null,
              category: data.category || "",
              categoryId: data.categoryId || "",
              imageUrl: data.imageUrl || data.image,
              available: data.isAvailable !== false && data.available !== false,
              isAvailable: data.isAvailable !== false && data.available !== false,
              remainingServings: data.remainingServings,
              servesCount: data.servesCount,
              modelUrl: data.modelUrl,
            } as MenuItem;
          })
          .filter((item) => item.available && item.isAvailable);

        setMenuItems(menuData);
        localStorage.setItem("menuItems", JSON.stringify(menuData));
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching menu:", error);
        setIsLoading(false);
      }
    );

    const unsubscribeBanners = onSnapshot(
      query(collection(db, "banners"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const bannersData = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Banner))
          .filter((b) => b.active);
        setBanners(bannersData);
        localStorage.setItem("banners", JSON.stringify(bannersData));
      },
      (error) => console.error("Error fetching banners:", error)
    );

    return () => {
      unsubscribeCategories();
      unsubscribeMenu();
      unsubscribeBanners();
    };
  }, [toast]);

  // 🔹 Filter
  const filteredItems = useMemo(() => {
    let filtered = menuItems;
    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          getLocalizedName(item, language).toLowerCase().includes(searchQuery.toLowerCase()) ||
          getLocalizedDescription(item, language).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory) {
      // Check if selected category is a discount category
      const selectedCat = categories.find((c) => c.id === selectedCategory);
      if (selectedCat?.isDiscountCategory) {
        // Filter by active discounts
        filtered = filtered.filter(
          (item) => item.discountEndsAt && new Date(item.discountEndsAt) > new Date()
        );
      } else {
        filtered = filtered.filter(
          (item) => item.categoryId === selectedCategory
        );
      }
    }
    return filtered;
  }, [searchQuery, selectedCategory, menuItems, categories, language]);

  // 🔹 Check for active discounts
  const hasActiveDiscounts = useMemo(() => {
    return menuItems.some(
      (item) => item.discountEndsAt && new Date(item.discountEndsAt) > new Date()
    );
  }, [menuItems]);

  // 🔹 Background Image Preloader (Barcha rasmlarni oldindan yuklash)
  useEffect(() => {
    if (menuItems.length === 0) return;

    // Preload ALL menu item images in background
    menuItems.forEach((item) => {
      if (item.imageUrl) {
        const img = new window.Image();
        img.src = item.imageUrl;
      }
    });

    // Preload banner images
    banners.forEach((banner) => {
      if (banner.imageUrl) {
        const img = new window.Image();
        img.src = banner.imageUrl;
      }
    });
  }, [menuItems, banners]);

  const handleExternalLink = (url: string) => window.open(url, "_blank");
  const handleCall = () => (window.location.href = "tel:+998950624422");

  const hasOrders = (() => {
    try {
      const orders = JSON.parse(localStorage.getItem("myOrders") || "[]");
      return orders.length > 0;
    } catch {
      return false;
    }
  })();

  return (
    <div
      className="flex min-h-screen flex-col pb-20 bg-primary/10"
      style={{
        scrollBehavior: "smooth",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <AnimatePresence>
        {isLoading && <LogoLoader />}
      </AnimatePresence>
      {/* 🔹 Banner */}
      <div className="relative w-full px-4 pt-4 mb-2">
        <div className="relative w-full h-[180px] md:h-[280px] rounded-[24px] md:rounded-[30px] overflow-hidden shadow-xl transform transition-transform hover:scale-[1.005] duration-300">
          <Image
            src={bannerSrc}
            alt="Banner"
            fill
            priority
            loading="eager"
            onError={() => setBannerSrc("/placeholder.jpg")}
            className="object-cover"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Logo Circle */}
          <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 animate-in fade-in zoom-in duration-500 delay-100">
            <div className="w-[60px] h-[60px] md:w-[80px] md:h-[80px] bg-white rounded-full flex items-center justify-center p-1 md:p-2 shadow-2xl ring-2 md:ring-4 ring-white/30 backdrop-blur-sm overflow-hidden">
              <Image
                src="/Logo.png"
                alt="Oshxona Logo"
                width={80}
                height={80}
                className="object-cover w-full h-full rounded-full"
                priority
                unoptimized
              />
            </div>
          </div>

          {/* Text Content */}
          <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 z-10 text-white animate-in slide-in-from-bottom-4 duration-500 delay-200">
            <h1 className="text-2xl md:text-4xl font-black tracking-wide uppercase drop-shadow-lg leading-none">
              Noziya
            </h1>
            <h3 className="text-lg md:text-2xl font-semibold tracking-wide uppercase drop-shadow-lg">
              {t("menu.title")}
            </h3>
            {tableInfo && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-sm md:text-xl font-bold opacity-90 backdrop-blur-sm px-2 py-0.5 rounded-lg bg-white/10 border border-white/20">
                  {tableInfo.type} {tableInfo.number}
                </p>
              </div>
            )}
          </div>

          {/* Social Icons */}
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-10 flex gap-2 md:gap-3 animate-in slide-in-from-right-4 duration-500 delay-300">
            <Button
              size="icon"
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[#0088cc] hover:bg-[#0077b5] text-white border-0 shadow-lg hover:shadow-[#0088cc]/50 transition-all hover:-translate-y-1"
              onClick={() => handleExternalLink("https://t.me/@noziyaml")}
            >
              <Send className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
            <Button
              size="icon"
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-90 text-white border-0 shadow-lg hover:shadow-[#dc2743]/50 transition-all hover:-translate-y-1"
              onClick={() => handleExternalLink("https://www.instagram.com/noziya_milliytaomlar")}
            >
              <Instagram className="w-5 h-5 md:w-6 md:h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* 🔹 Floating buttons */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
        <ActionButton
          onClick={() =>
            handleExternalLink(
              "https://www.google.com/maps/place/Noziya+milliy+taomlar/@41.2657624,69.2435861,999m/data=!3m2!1e3!4b1!4m6!3m5!1s0x38ae8b001097b20f:0x5ee4506b740fe4c2!8m2!3d41.2657624!4d69.246161!16s%2Fg%2F11mkzqk0tl?entry=ttu&g_ep=EgoyMDI2MDEyMS4wIKXMDSoASAFQAw%3D%3D"
            )
          }
          icon={<MapPin className="h-5 w-5 text-white" />}
          gradient="bg-primary hover:bg-primary/90"
        />
        <ActionButton
          onClick={() => setCallModalOpen(true)}
          icon={<Phone className="h-5 w-5 text-white" />}
          gradient="bg-primary hover:bg-primary/90"
        />
        <ActionButton
          onClick={() =>
            handleExternalLink("https://www.instagram.com/noziya_milliytaomlar")
          }
          icon={<Instagram className="h-5 w-5 text-white" />}
          gradient="bg-primary hover:bg-primary/90"
        />
      </div>

      {/* 🔹 Call modal */}
      <Dialog open={callModalOpen} onOpenChange={setCallModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("menu.call.title")}</DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              {t("menu.call.manager")}: <span className="font-semibold">Anvarjon</span>
              <br />
              {t("menu.call.phone")}: <span className="font-semibold">+998 95 062 44 22</span>
            </p>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button
              onClick={handleCall}
              className="bg-primary hover:bg-primary/90"
            >
              {t("menu.call.yes")}
            </Button>
            <Button
              onClick={() => setCallModalOpen(false)}
              variant="outline"
              className="bg-gray-100"
            >
              {t("menu.call.no")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔹 Search & Tabs */}
      <header className="sticky top-0 z-10  p-4 ">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "menu" | "orders")}
        >
          <TabsContent value="menu" className="mt-2">
            {isLoading ? (
              <MenuLoadingSkeleton />
            ) : filteredItems.length > 0 ? (
              <MenuGrid
                items={filteredItems}
                banners={banners}
                onBannerClick={setSelectedCategory}
              />
            ) : (
              <NoItems
                hasItems={menuItems.length > 0}
                resetSearch={() => {
                  setSearchQuery("");
                  setSelectedCategory(null);
                }}
              />
            )}
          </TabsContent>
          <TabsContent value="orders" className="mt-2">
            <OrderHistory />
          </TabsContent>
        </Tabs>
      </header>

      {/* 🔹 Bottom category filter */}
      {activeTab === "menu" && (
        <footer className="fixed bottom-0 left-0 right-0 z-10 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
          <div className="overflow-x-auto p-2">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              hasActiveDiscounts={hasActiveDiscounts}
            />
          </div>
          <div className="flex items-center justify-center text-xs text-muted-foreground pb-2">
            <p>
              © 2025{" "}
              <a className="text-primary font-bold" href="http://abdiaxatov.uz">
                Abdiaxatov
              </a>{" "}
              {t("menu.itServices")}
            </p>
          </div>
        </footer>
      )}

      {!hasOrders && <ViewMyOrdersButton />}
    </div>
  );
}

/* 🔹 Action Button Component */
function ActionButton({
  onClick,
  icon,
  gradient,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className={`h-12 w-12 rounded-full bg-gradient-to-r ${gradient} shadow-lg`}
    >
      {icon}
    </Button>
  );
}

/* 🔹 No Items Component */
function NoItems({
  hasItems,
  resetSearch,
}: {
  hasItems: boolean;
  resetSearch: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="text-center py-8">
      <p className="text-muted-foreground">
        {hasItems ? t("menu.noItems") : t("menu.noAvailable")}
      </p>
      {hasItems && (
        <Button variant="outline" onClick={resetSearch} className="mt-2 text-xs">
          {t("menu.clearSearch")}
        </Button>
      )}
    </div>
  );
}

/* 🔹 Skeleton Loader */
function MenuLoadingSkeleton() {
  return (
    <div className="space-y-4 ">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-xl bg-gray-300/50" />
            <Skeleton className="h-4 w-3/4 bg-gray-300/50" />
            <Skeleton className="h-4 w-1/2 bg-gray-300/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
