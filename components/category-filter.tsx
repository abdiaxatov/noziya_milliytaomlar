"use client";

import { useMemo } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import type { Category } from "@/types";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedName } from "@/lib/localization";

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  hasActiveDiscounts?: boolean;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  hasActiveDiscounts,
}: CategoryFilterProps) {
  const { t, language } = useLanguage();

  const sortedCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        // Filter out inactive categories
        if (cat.active === false) return false;

        // Always show the discount category if it exists and is active
        // skipping the hasActiveDiscounts check to ensure visibility

        return true;
      })
      .sort((a, b) => {
        // Force discount category to the very beginning
        const isADiscount = a.isDiscountCategory || getLocalizedName(a, 'uz').toLowerCase() === 'chegirmalar';
        const isBDiscount = b.isDiscountCategory || getLocalizedName(b, 'uz').toLowerCase() === 'chegirmalar';

        if (isADiscount && !isBDiscount) return -1;
        if (!isADiscount && isBDiscount) return 1;

        const orderA = a.order || 0;
        const orderB = b.order || 0;

        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return getLocalizedName(a, language).localeCompare(getLocalizedName(b, language));
      });
  }, [categories, hasActiveDiscounts, language]);

  if (!categories || categories.length === 0) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t("common.noCategories")}
          </span>
        </div>
        <LanguageSwitcher variant="outline" className="h-8" />
      </div>
    );
  }

  return (
    <div className="w-full flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-2 pb-4">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              className={`rounded-full transition-all duration-300 ${selectedCategory === null
                ? "bg-primary text-white shadow-md scale-105"
                : "border-primary/20 text-gray-600 hover:bg-primary/10 hover:text-primary hover:border-primary/50 hover:scale-105"
                }`}
              onClick={() => onSelectCategory(null)}
            >
              {t("common.all")}
            </Button>

            {sortedCategories.map((category) => {
              const matchesSelected = selectedCategory === category.id;
              const isDiscount = category.isDiscountCategory ||
                getLocalizedName(category, 'uz').toLowerCase() === 'chegirmalar' ||
                getLocalizedName(category, 'ru').toLowerCase() === 'скидки';

              if (isDiscount) {
                return (
                  <Button
                    key={category.id}
                    variant={matchesSelected ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full transition-all duration-300 relative overflow-hidden ${matchesSelected
                        ? "bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-lg scale-105 border-0"
                        : "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:scale-105 animate-pulse-subtle"
                      }`}
                    onClick={() => onSelectCategory(category.id)}
                  >
                    <span className="flex items-center gap-1">
                      <span className="text-sm">🔥</span>
                      {getLocalizedName(category, language)}
                    </span>
                    {matchesSelected && (
                      <span className="absolute inset-0 bg-white/20 animate-shine" />
                    )}
                  </Button>
                );
              }

              return (
                <Button
                  key={category.id}
                  variant={matchesSelected ? "default" : "outline"}
                  size="sm"
                  className={`rounded-full transition-all duration-300 ${matchesSelected
                    ? "bg-primary text-white shadow-md scale-105"
                    : "border-primary/20 text-gray-600 hover:bg-primary/10 hover:text-primary hover:border-primary/50 hover:scale-105"
                    }`}
                  onClick={() => onSelectCategory(category.id)}
                >
                  {getLocalizedName(category, language)}
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      <div className="pb-4">
        <LanguageSwitcher variant="outline" className="h-9 shadow-sm border-primary/20" />
      </div>
    </div>
  );
}

