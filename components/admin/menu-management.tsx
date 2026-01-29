"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { CategoryManagement } from "@/components/admin/category-management"
import { BannerManagement } from "@/components/admin/banner-management"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Search, Trash2, Edit, Loader2, LayoutGrid, List as ListIcon, AlertCircle, UtensilsCrossed } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { MenuItem, Category } from "@/types"
import { optimizeImage } from "@/lib/image-optimizer"
import { PriceDisplay } from "@/components/price-display"
import { DiscountTimer } from "@/components/discount-timer"
import { ProductDetailDrawer } from "@/components/product-detail-drawer"
import { MenuItemForm } from "@/components/menu-item-form"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useRouter } from "next/navigation"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useLanguage } from "@/hooks/use-language"
import { LanguageSwitcher } from "@/components/language-switcher"
import { getLocalizedName, getLocalizedDescription } from "@/lib/localization"

export function MenuManagement() {
  const router = useRouter()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const { toast } = useToast()
  const { t, language } = useLanguage()

  // Navigation handlers for drawer
  const handleNext = () => {
    setSelectedItemIndex((prev) => {
      if (prev === null) return null;
      return (prev + 1) % filteredItems.length;
    });
  };

  const handlePrev = () => {
    setSelectedItemIndex((prev) => {
      if (prev === null) return null;
      return (prev - 1 + filteredItems.length) % filteredItems.length;
    });
  };

  // Stats derivation
  const stats = useMemo(() => {
    return {
      totalItems: menuItems.length,
      outOfStock: menuItems.filter(i => i.remainingServings === 0 || !i.isAvailable).length,
      totalCategories: categories.length
    }
  }, [menuItems, categories])

  useEffect(() => {
    const categoriesQuery = query(collection(db, "categories"), orderBy("name"))

    const categoriesUnsubscribe = onSnapshot(
      categoriesQuery,
      (snapshot) => {
        const categoriesData: Category[] = []
        snapshot.forEach((doc) => {
          categoriesData.push({ id: doc.id, ...doc.data() } as Category)
        })
        setCategories(categoriesData)
      },
      (error) => {
        console.error("Error fetching categories:", error)
        toast({
          title: t("common.error"),
          description: t("admin.category.error"),
          variant: "destructive",
        })
      }
    )

    const menuQuery = query(collection(db, "menuItems"))

    const menuUnsubscribe = onSnapshot(
      menuQuery,
      (snapshot) => {
        const items: MenuItem[] = []
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as MenuItem)
        })
        items.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0
          return b.createdAt.seconds - a.createdAt.seconds
        })
        setMenuItems(items)
        setFilteredItems(items)
        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching menu items:", error)
        toast({
          title: t("common.error"),
          description: t("admin.menu.error"),
          variant: "destructive",
        })
        setIsLoading(false)
      }
    )

    return () => {
      categoriesUnsubscribe()
      menuUnsubscribe()
    }
  }, [toast])

  useEffect(() => {
    let filtered = menuItems

    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          getLocalizedName(item, language).toLowerCase().includes(searchQuery.toLowerCase()) ||
          getLocalizedDescription(item, language).toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (categoryFilter && categoryFilter !== "all") {
      const selectedCategory = categories.find(c => c.id === categoryFilter);
      if (selectedCategory?.isDiscountCategory) {
        filtered = filtered.filter(
          (item) => item.discountEndsAt && new Date(item.discountEndsAt) > new Date()
        );
      } else {
        filtered = filtered.filter((item) => item.categoryId === categoryFilter);
      }
    }

    setFilteredItems(filtered)
  }, [searchQuery, categoryFilter, menuItems, categories])

  const handleAddItem = () => {
    setIsCreateDrawerOpen(true)
  }

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setIsEditDrawerOpen(true)
  }

  const handleDeleteClick = (item: MenuItem) => {
    setItemToDelete(item)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, "menuItems", itemToDelete.id))
      toast({
        title: t("admin.menu.item.delete"),
        description: `${itemToDelete.name} ${t("admin.menu.item.deleteSuccess") || "muvaffaqiyatli o'chirildi"}`,
      })
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting menu item:", error)
      toast({
        title: t("common.error"),
        description: t("admin.menu.deleteError") || "O'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category ? getLocalizedName(category, language) : t("common.noCategories")
  }

  return (
    <div className="min-h-screen bg-gray-50/50 -m-2 md:m-0">
      <div className="w-full space-y-6 md:space-y-8 pb-20 md:pb-6">

        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-3 shadow-sm transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900">{t("admin.menu.title")}</h1>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button onClick={handleAddItem} size="sm" className="shadow-md bg-primary hover:bg-primary/90 text-white rounded-full px-4">
                <Plus className="mr-1 h-4 w-4" />
                {t("admin.menu.addItem")}
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="menu-items" className="space-y-6 px-2 md:px-0">
          <div className="px-2">
            <TabsList className="w-full bg-white/50 border shadow-sm p-1 rounded-xl grid grid-cols-3">
              <TabsTrigger value="menu-items" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">{t("admin.menu.tabs.menu")}</TabsTrigger>
              <TabsTrigger value="categories" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">{t("admin.menu.tabs.categories")}</TabsTrigger>
              <TabsTrigger value="banners" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">{t("admin.menu.tabs.banners")}</TabsTrigger>
            </TabsList>
          </div>

          {/* Stats - Horizontal Scroll on Mobile */}
          <div className="flex gap-4 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-3 md:overflow-visible hide-scrollbar snap-x">
            <Card className="min-w-[200px] bg-white shadow-sm border-l-4 border-l-primary/70 snap-center">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <UtensilsCrossed className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("admin.menu.stats.totalItems")}</p>
                  <h3 className="text-xl font-bold">{stats.totalItems}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-[200px] bg-white shadow-sm border-l-4 border-l-orange-500/70 snap-center">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("admin.menu.stats.stopList")}</p>
                  <h3 className="text-xl font-bold">{stats.outOfStock}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="min-w-[200px] bg-white shadow-sm border-l-4 border-l-blue-500/70 snap-center">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <LayoutGrid className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("admin.menu.stats.categories")}</p>
                  <h3 className="text-xl font-bold">{stats.totalCategories}</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <TabsContent value="menu-items" className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={t("admin.menu.toolbar.search")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all w-full"
                  />
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="flex items-center bg-gray-100 p-1 rounded-lg border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className={`h-8 px-2 ${viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-gray-500"}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={`h-8 px-2 ${viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-gray-500"}`}
                    >
                      <ListIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Category Filter Pills (Horizontal Scroll) */}
              <ScrollArea className="w-full whitespace-nowrap pb-1">
                <div className="flex space-x-2">
                  <Button
                    variant={categoryFilter === "all" || !categoryFilter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter("all")}
                    className={`rounded-full px-4 transition-all ${categoryFilter === "all" || !categoryFilter ? "bg-primary text-white shadow-md" : "bg-white text-muted-foreground hover:bg-gray-100 hover:text-gray-900 border-gray-200"}`}
                  >
                    {t("common.all")}
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={categoryFilter === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCategoryFilter(category.id)}
                      className={`rounded-full px-4 transition-all ${categoryFilter === category.id ? "bg-primary text-white shadow-md" : "bg-white text-muted-foreground hover:bg-gray-100 hover:text-gray-900 border-gray-200"}`}
                    >
                      {getLocalizedName(category, language)}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="invisible" />
              </ScrollArea>
            </div>

            {/* Content Area */}
            {isLoading ? (
              <div className="flex h-60 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center bg-white/50">
                <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900">{t("admin.menu.empty.title")}</h3>
                <p className="text-gray-500 mb-4">{t("admin.menu.empty.desc")}</p>
                <Button
                  variant="outline"
                  onClick={() => setCategoryFilter("all")}
                  className="mt-2"
                >
                  {t("admin.menu.empty.clear")}
                </Button>
              </div>
            ) : (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {filteredItems.map((item, index) => (
                      <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-gray-200">
                        <div
                          className="relative aspect-[4/3] bg-gray-100 overflow-hidden cursor-pointer"
                          onClick={() => setSelectedItemIndex(index)}
                        >
                          {item.imageUrl ? (
                            <Image
                              src={optimizeImage(item.imageUrl, 400)}
                              alt={getLocalizedName(item, language)}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                              loading={index < 8 ? "eager" : "lazy"}
                              priority={index < 8}
                              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gray-50">
                              <UtensilsCrossed className="h-10 w-10 text-gray-300" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          {item.discountEndsAt && new Date(item.discountEndsAt) > new Date() && (
                            <div className="absolute top-2 left-2 z-20">
                              <DiscountTimer endsAt={item.discountEndsAt} className="text-[10px] px-2 py-1 bg-white/95 backdrop-blur-sm shadow-md font-bold text-red-600" />
                            </div>
                          )}

                          {/* Actions: Always visible on mobile if needed, or rely on tap */}
                          <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 md:translate-x-4 group-hover:translate-x-0 z-20">
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-sm bg-white/90" onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}>
                              <Edit className="h-4 w-4 text-black" />
                            </Button>
                            <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-sm" onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end translate-y-0 md:translate-y-4 group-hover:translate-y-0 transition-transform duration-300 z-10">
                            <Badge variant={item.isAvailable ? "default" : "destructive"} className="shadow-sm text-[10px] px-1.5 h-5">
                              {item.isAvailable ? t("admin.menu.item.available") : t("admin.menu.item.stop")}
                            </Badge>
                            <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
                              <PriceDisplay
                                price={item.price}
                                discountPrice={(item.discountEndsAt && new Date(item.discountEndsAt) > new Date()) ? item.discountPrice : undefined}
                              />
                            </div>
                          </div>
                        </div>

                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-1 h-8">
                            <div className="w-full">
                              <h3 className="font-semibold text-gray-900 line-clamp-1 text-sm leading-tight" title={getLocalizedName(item, language)}>{getLocalizedName(item, language)}</h3>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{getCategoryName(item.categoryId)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-[80px]">Rasm</TableHead>
                          <TableHead>Nomi</TableHead>
                          <TableHead>Kategoriya</TableHead>
                          <TableHead>{t("menu.price")}</TableHead>
                          <TableHead>{t("admin.menu.item.available")}</TableHead>
                          <TableHead className="text-right">{t("admin.menu.item.actions") || "Amallar"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => (
                          <TableRow key={item.id} className="hover:bg-gray-50/50">
                            <TableCell>
                              <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-100">
                                {item.imageUrl ? (
                                  <Image src={optimizeImage(item.imageUrl, 100)} alt={getLocalizedName(item, language)} fill className="object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-gray-400">
                                    <UtensilsCrossed className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div>{getLocalizedName(item, language)}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{getLocalizedDescription(item, language)}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal">
                                {getCategoryName(item.categoryId)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <PriceDisplay
                                price={item.price}
                                discountPrice={(item.discountEndsAt && new Date(item.discountEndsAt) > new Date()) ? item.discountPrice : undefined}
                              />
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.isAvailable ? "default" : "secondary"} className={!item.isAvailable ? "bg-gray-200 text-gray-500 hover:bg-gray-200" : ""}>
                                {item.isAvailable ? t("admin.menu.item.available") : t("admin.menu.item.stop")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}>
                                  <Edit className="h-4 w-4 text-gray-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManagement />
          </TabsContent>

          <TabsContent value="banners">
            <BannerManagement categories={categories} />
          </TabsContent>
        </Tabs>

        {/* Product Detail Drawer */}
        <ProductDetailDrawer
          item={selectedItemIndex !== null ? filteredItems[selectedItemIndex] : null}
          isOpen={selectedItemIndex !== null}
          onClose={() => setSelectedItemIndex(null)}
          onNext={handleNext}
          onPrev={handlePrev}
          isAdmin={true}
          onEdit={() => selectedItemIndex !== null && handleEditItem(filteredItems[selectedItemIndex])}
          onDelete={() => selectedItemIndex !== null && handleDeleteClick(filteredItems[selectedItemIndex])}
        />

        {/* Create Item Drawer */}
        <Drawer open={isCreateDrawerOpen} onOpenChange={setIsCreateDrawerOpen}>
          <DrawerContent className="max-h-[96vh] h-full rounded-t-[30px] border-0 outline-none flex flex-col bg-gray-50/95 backdrop-blur-sm">
            <DrawerTitle className="sr-only">{t("admin.menu.addItem")}</DrawerTitle>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
              <MenuItemForm
                categories={categories}
                onSuccess={() => setIsCreateDrawerOpen(false)}
                onCancel={() => setIsCreateDrawerOpen(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Edit Item Drawer */}
        <Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
          <DrawerContent className="max-h-[96vh] h-full rounded-t-[30px] border-0 outline-none flex flex-col bg-gray-50/95 backdrop-blur-sm">
            <DrawerTitle className="sr-only">{t("admin.menu.item.edit")}</DrawerTitle>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
              {editingItem && (
                <MenuItemForm
                  item={editingItem}
                  categories={categories}
                  onSuccess={() => { setIsEditDrawerOpen(false); setEditingItem(null); }}
                  onCancel={() => { setIsEditDrawerOpen(false); setEditingItem(null); }}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.menu.item.deleteTitle")}</DialogTitle>
              <DialogDescription>
                {t("admin.menu.item.deleteDesc")} <b>{itemToDelete?.name}</b>?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                {t("admin.form.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {t("admin.menu.item.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
