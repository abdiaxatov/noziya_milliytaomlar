"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Trash2, Edit, Plus, GripVertical, ArrowUp, ArrowDown, Settings, Save, X, Ban, Trash, Loader2, Check } from "lucide-react"
import type { Category } from "@/types"
import { getLocalizedName } from "@/lib/localization"
import { useLanguage } from "@/hooks/use-language"

interface CategoryManagementProps {
}

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newNames, setNewNames] = useState({ uz: "", ru: "", en: "" })
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editedNames, setEditedNames] = useState({ uz: "", ru: "", en: "" })
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [draggedItem, setDraggedItem] = useState<Category | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const { toast } = useToast()
  const { t, language } = useLanguage()

  useEffect(() => {
    // Simple query by name first, then we'll sort by order on client side
    const categoriesQuery = query(collection(db, "categories"), orderBy("name"))

    const unsubscribe = onSnapshot(
      categoriesQuery,
      (snapshot) => {
        const categoriesData: Category[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          categoriesData.push({
            id: doc.id,
            name: data.name,
            order: data.order || 0,
            active: data.active !== false,
            isDiscountCategory: data.isDiscountCategory || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Category)
        })

        // Sort by order first, then by name
        categoriesData.sort((a, b) => {
          if (a.order !== b.order) {
            return (a.order || 0) - (b.order || 0)
          }
          return a.name.localeCompare(b.name)
        })

        setCategories(categoriesData)
        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching categories:", error)
        toast({
          title: t("common.error"),
          description: t("admin.category.error"),
          variant: "destructive",
        })
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [toast])

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()

    const hasAnyName = newNames.uz.trim() || newNames.ru.trim() || newNames.en.trim()

    if (!hasAnyName) {
      toast({
        title: t("common.error"),
        description: t("admin.form.errors.fillRequired") || "Iltimos, kamida bitta tilni to'ldiring",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const maxOrder = Math.max(...categories.map((cat) => cat.order || 0), 0)

      await addDoc(collection(db, "categories"), {
        // Use first available name for legacy 'name' field
        name: (newNames.uz || newNames.ru || newNames.en).trim(),
        name_uz: newNames.uz.trim(),
        name_ru: newNames.ru.trim(),
        name_en: newNames.en.trim(),
        order: maxOrder + 1,
        active: true,
        createdAt: new Date(),
      })

      toast({
        title: t("admin.category.addSuccess") || "Kategoriya qo'shildi",
        description: `${newNames.uz || newNames.ru || newNames.en} ${t("admin.category.addDesc") || "muvaffaqiyatli qo'shildi"}`,
      })

      setNewNames({ uz: "", ru: "", en: "" })
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: t("common.error"),
        description: t("admin.category.addError") || "Kategoriyani qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditClick = (category: Category) => {
    setEditingCategory(category)
    setEditedNames({
      uz: category.name_uz || category.name || "",
      ru: category.name_ru || "",
      en: category.name_en || "",
    })
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setEditedNames({ uz: "", ru: "", en: "" })
  }

  const handleSaveEdit = async (categoryId: string) => {
    const hasAnyName = editedNames.uz.trim() || editedNames.ru.trim() || editedNames.en.trim()

    if (!hasAnyName) {
      toast({
        title: t("common.error"),
        description: t("admin.form.errors.fillRequired") || "Iltimos, kamida bitta tilni to'ldiring",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await updateDoc(doc(db, "categories", categoryId), {
        // Update legacy 'name' field with first available name
        name: (editedNames.uz || editedNames.ru || editedNames.en).trim(),
        name_uz: editedNames.uz.trim(),
        name_ru: editedNames.ru.trim(),
        name_en: editedNames.en.trim(),
        updatedAt: new Date(),
      })

      toast({
        title: t("admin.category.updateSuccess") || "Kategoriya yangilandi",
        description: t("admin.category.updateDesc") || "Kategoriya muvaffaqiyatli yangilandi",
      })

      setEditingCategory(null)
      setEditedNames({ uz: "", ru: "", en: "" })
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: t("common.error"),
        description: t("admin.category.updateError") || "Kategoriyani yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (categoryId: string, currentActive: boolean) => {
    setIsSubmitting(true)

    try {
      await updateDoc(doc(db, "categories", categoryId), {
        active: !currentActive,
        updatedAt: new Date(),
      })

      toast({
        title: currentActive ? (t("admin.category.deactivated") || "Kategoriya o'chirildi") : (t("admin.category.activated") || "Kategoriya yoqildi"),
        description: (t("admin.category.statusChanged") || "Kategoriya holatga o'tkazildi").replace("{status}", currentActive ? (t("admin.category.inactive") || "nofaol") : (t("admin.category.active") || "faol")),
      })
    } catch (error) {
      console.error("Error toggling category:", error)
      toast({
        title: t("common.error"),
        description: t("admin.category.statusError") || "Kategoriya holatini o'zgartirishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (categoryId: string) => {
    setDeletingCategoryId(categoryId)
  }

  const handleDeleteCategory = async () => {
    if (!deletingCategoryId) return

    setIsSubmitting(true)

    try {
      await deleteDoc(doc(db, "categories", deletingCategoryId))

      toast({
        title: t("admin.category.deleted") || "Kategoriya o'chirildi",
        description: t("admin.category.deleteSuccess") || "Kategoriya muvaffaqiyatli o'chirildi",
      })
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: t("common.error"),
        description: t("admin.category.deleteError") || "Kategoriyani o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setDeletingCategoryId(null)
    }
  }

  const moveCategory = async (categoryId: string, direction: "up" | "down") => {
    const currentIndex = categories.findIndex((cat) => cat.id === categoryId)
    if (currentIndex === -1) return

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= categories.length) return

    await reorderCategories(currentIndex, newIndex)
  }

  const reorderCategories = async (fromIndex: number, toIndex: number) => {
    setIsSubmitting(true)

    try {
      const newCategories = [...categories]
      const [movedCategory] = newCategories.splice(fromIndex, 1)
      newCategories.splice(toIndex, 0, movedCategory)

      // Update order values for all categories
      const batch = writeBatch(db)
      newCategories.forEach((category, index) => {
        const categoryRef = doc(db, "categories", category.id)
        batch.update(categoryRef, {
          order: index + 1,
          updatedAt: new Date(),
        })
      })

      await batch.commit()

      toast({
        title: t("admin.category.reordered") || "Tartib o'zgartirildi",
        description: t("admin.category.reorderSuccess") || "Kategoriya tartibi muvaffaqiyatli o'zgartirildi",
      })
    } catch (error) {
      console.error("Error reordering categories:", error)
      toast({
        title: t("common.error"),
        description: t("admin.category.reorderError") || "Kategoriya tartibini o'zgartirishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, category: Category) => {
    setDraggedItem(category)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/html", e.currentTarget.outerHTML)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    if (!draggedItem) return

    const draggedIndex = categories.findIndex((cat) => cat.id === draggedItem.id)
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedItem(null)
      return
    }

    await reorderCategories(draggedIndex, targetIndex)
    setDraggedItem(null)
  }

  const activeCategories = categories.filter((cat) => cat.active)
  const inactiveCategories = categories.filter((cat) => !cat.active)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{t("admin.category.title")}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("admin.category.subtitle")}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {t("admin.category.active")}: {activeCategories.length}
              </Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                {t("admin.category.total")}: {categories.length}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <form onSubmit={handleAddCategory} className="space-y-4">
              <Tabs defaultValue="uz" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-2">
                  <TabsTrigger value="uz">UZ</TabsTrigger>
                  <TabsTrigger value="ru" className="flex gap-1">RU <span className="text-[10px] opacity-60 font-normal">{t("common.optional")}</span></TabsTrigger>
                  <TabsTrigger value="en" className="flex gap-1">EN <span className="text-[10px] opacity-60 font-normal">{t("common.optional")}</span></TabsTrigger>
                </TabsList>
                <TabsContent value="uz" className="mt-0">
                  <Input
                    placeholder={t("admin.form.nameUz")}
                    value={newNames.uz}
                    onChange={(e) => setNewNames(prev => ({ ...prev, uz: e.target.value }))}
                  />
                </TabsContent>
                <TabsContent value="ru" className="mt-0">
                  <Input
                    placeholder={t("admin.form.nameRu")}
                    value={newNames.ru}
                    onChange={(e) => setNewNames(prev => ({ ...prev, ru: e.target.value }))}
                  />
                </TabsContent>
                <TabsContent value="en" className="mt-0">
                  <Input
                    placeholder={t("admin.form.nameEn")}
                    value={newNames.en}
                    onChange={(e) => setNewNames(prev => ({ ...prev, en: e.target.value }))}
                  />
                </TabsContent>
              </Tabs>
              <Button type="submit" disabled={isSubmitting || !newNames.uz.trim()} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("admin.category.adding")}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("admin.category.addBtn")}
                  </>
                )}
              </Button>
            </form>

            {/* Add Discount Category Button - only show if no discount category exists */}
            {!categories.some(c => c.isDiscountCategory) && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                onClick={async () => {
                  setIsSubmitting(true)
                  try {
                    await addDoc(collection(db, "categories"), {
                      name: "Chegirmalar",
                      name_uz: "Chegirmalar",
                      name_ru: "Скидки",
                      name_en: "Discounts",
                      order: 0, // First position
                      active: true,
                      isDiscountCategory: true,
                      createdAt: new Date(),
                    })
                    toast({
                      title: t("admin.category.discountAdded") || "Chegirmalar kategoriyasi qo'shildi",
                      description: t("admin.category.discountDesc") || "Endi chegirmali mahsulotlar avtomatik ko'rinadi",
                    })
                  } catch (error) {
                    toast({
                      title: t("common.error"),
                      description: t("admin.category.addError") || "Kategoriyani qo'shishda xatolik",
                      variant: "destructive",
                    })
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                disabled={isSubmitting}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  🔥 {t("admin.category.addDiscountBtn") || "Chegirmalar kategoriyasini qo'shish"}
                </div>
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">{t("admin.category.empty")}</p>
              <p className="text-sm text-muted-foreground">{t("admin.category.addFirst")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Categories */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-700 flex items-center gap-2">
                  <span>✅ {t("admin.category.activeCats")}</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {activeCategories.length}
                  </Badge>
                </h3>
                <div className="space-y-2">
                  {activeCategories.map((category, index) => (
                    <div
                      key={category.id}
                      draggable={!isSubmitting}
                      onDragStart={(e) => handleDragStart(e, category)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-3 sm:p-4 gap-3 transition-all duration-200 cursor-move ${draggedItem?.id === category.id
                        ? "opacity-50 scale-95 rotate-2"
                        : dragOverIndex === index
                          ? "border-blue-400 bg-blue-50 shadow-lg scale-102"
                          : "hover:shadow-md hover:border-green-300 bg-gradient-to-r from-green-50/50 to-blue-50/50"
                        }`}
                    >
                      {editingCategory?.id === category.id ? (
                        <div className="flex flex-col w-full gap-3">
                          <Tabs defaultValue="uz" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-2">
                              <TabsTrigger value="uz">UZ</TabsTrigger>
                              <TabsTrigger value="ru">RU</TabsTrigger>
                              <TabsTrigger value="en">EN</TabsTrigger>
                            </TabsList>
                            <TabsContent value="uz" className="mt-0">
                              <Input
                                value={editedNames.uz}
                                onChange={(e) => setEditedNames(prev => ({ ...prev, uz: e.target.value }))}
                                placeholder={t("admin.form.nameUz")}
                                autoFocus
                              />
                            </TabsContent>
                            <TabsContent value="ru" className="mt-0">
                              <Input
                                value={editedNames.ru}
                                onChange={(e) => setEditedNames(prev => ({ ...prev, ru: e.target.value }))}
                                placeholder={t("admin.form.nameRu")}
                              />
                            </TabsContent>
                            <TabsContent value="en" className="mt-0">
                              <Input
                                value={editedNames.en}
                                onChange={(e) => setEditedNames(prev => ({ ...prev, en: e.target.value }))}
                                placeholder={t("admin.form.nameEn")}
                              />
                            </TabsContent>
                          </Tabs>
                          <div className="flex gap-2 w-full justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSaveEdit(category.id)}
                              disabled={isSubmitting}
                              className="text-green-600 hover:text-green-700 hover:bg-green-100 flex-1 sm:flex-none justify-center"
                            >
                              {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={isSubmitting} className="flex-1 sm:flex-none justify-center">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <GripVertical className="h-5 w-5 text-gray-400 cursor-grab active:cursor-grabbing shrink-0" />
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-mono text-xs">
                                #{(category.order || index + 1).toString().padStart(2, "0")}
                              </Badge>
                              <span className="font-semibold text-gray-800 text-base sm:text-lg break-all">
                                {getLocalizedName(category, language)}
                              </span>
                              {category.isDiscountCategory ? (
                                <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200 text-[10px] sm:text-xs">
                                  🔥 {t("admin.form.discounts") || "Chegirmalar"}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-[10px] sm:text-xs">
                                  {t("admin.category.active") || "Faol"}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between w-full sm:w-auto gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveCategory(category.id, "up")}
                                disabled={isSubmitting || index === 0}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-8 w-8 p-0"
                                title={t("admin.category.moveUp") || "Yuqoriga ko'chirish"}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveCategory(category.id, "down")}
                                disabled={isSubmitting || index === activeCategories.length - 1}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-8 w-8 p-0"
                                title={t("admin.category.moveDown") || "Pastga ko'chirish"}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="flex items-center gap-2">
                              <Switch
                                checked={category.active}
                                onCheckedChange={() => handleToggleActive(category.id, category.active)}
                                disabled={isSubmitting}
                                className="scale-90"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(category)}
                                disabled={isSubmitting}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 h-8 w-8 p-0"
                                title={t("admin.menu.item.edit")}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {!category.isDiscountCategory && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 w-8 p-0"
                                  onClick={() => handleDeleteClick(category.id)}
                                  disabled={isSubmitting}
                                  title={t("admin.menu.item.delete")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Inactive Categories */}
              {inactiveCategories.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-600 flex items-center gap-2">
                    <span>❌ {t("admin.category.inactiveCats")}</span>
                    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                      {inactiveCategories.length}
                    </Badge>
                  </h3>
                  <div className="space-y-2">
                    {inactiveCategories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between rounded-lg border p-4 bg-gray-50 opacity-75"
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-gray-300" />
                          <span className="font-semibold text-gray-600 text-lg line-through">{getLocalizedName(category, language)}</span>
                          <Badge variant="secondary" className="bg-gray-200 text-gray-600 border-gray-300">
                            ❌ {t("admin.category.inactive")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={category.active}
                            onCheckedChange={() => handleToggleActive(category.id, category.active)}
                            disabled={isSubmitting}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(category)}
                            disabled={isSubmitting}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                            title="Tahrirlash"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-100"
                            onClick={() => handleDeleteClick(category.id)}
                            disabled={isSubmitting}
                            title="O'chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingCategoryId} onOpenChange={(open) => !open && setDeletingCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.category.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.category.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>{t("admin.form.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("admin.category.deleting") || "O'chirilmoqda..."}
                </>
              ) : (
                t("admin.menu.item.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
