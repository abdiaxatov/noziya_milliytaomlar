"use client";

import React, { useState } from "react";
import { MenuItemComponent } from "@/components/menu-item";
import { ProductDetailDrawer } from "@/components/product-detail-drawer";
import { BannerCarousel } from "@/components/banner-carousel";
import { useLanguage } from "@/hooks/use-language";
import type { MenuItem, Banner } from "@/types";

interface MenuGridProps {
  items: MenuItem[];
  banners?: Banner[];
  onBannerClick?: (categoryId: string) => void;
}

export const MenuGrid = React.memo(function MenuGrid({ items, banners, onBannerClick }: MenuGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="text-center py-8 ">
        <p className="text-muted-foreground">{t("menu.noDishesFound")}</p>
      </div>
    );
  }

  const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;

  const handleNext = () => {
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      return (prev + 1) % items.length;
    });
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      return (prev - 1 + items.length) % items.length;
    });
  };

  const firstBatch = items.slice(0, 4);
  const restItems = items.slice(4);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-2 pb-24 menu-grid">
        {/* First 4 Items */}
        {firstBatch.map((item, index) => (
          <div key={item.id} className="">
            <MenuItemComponent
              item={item}
              priority={true}
              onClick={() => setSelectedIndex(index)}
            />
          </div>
        ))}

        {/* Dynamic Banner Carousel */}
        {banners && banners.length > 0 && (
          <div className="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-3 xl:col-span-4 w-full">
            <BannerCarousel banners={banners} onBannerClick={onBannerClick} />
          </div>
        )}

        {/* Remaining Items */}
        {restItems.map((item, index) => (
          <div key={item.id} className="">
            <MenuItemComponent
              item={item}
              priority={false}
              onClick={() => setSelectedIndex(index + 4)}
            />
          </div>
        ))}
      </div>

      <ProductDetailDrawer
        item={selectedItem}
        isOpen={selectedIndex !== null}
        onClose={() => setSelectedIndex(null)}
        onNext={handleNext}
        onPrev={handlePrev}
      />
    </>
  );
});
