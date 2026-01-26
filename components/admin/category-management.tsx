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
import { Edit, Plus, Trash2, X, Check, Loader2, GripVertical, ArrowUp, ArrowDown, Settings } from "lucide-react"
import type { Category } from "@/types"

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState("")
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editedName, setEditedName] = useState("")
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [draggedItem, setDraggedItem] = useState<Category | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const { toast } = useToast()

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
          title: "Xatolik",
          description: "Kategoriyalarni yuklashda xatolik yuz berdi.",
          variant: "destructive",
        })
        setIsLoading(false)
      },
    )

    return () => unsubscribe()
  }, [toast])

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newCategory.trim()) {
      toast({
        title: "Xatolik",
        description: "Kategoriya nomi bo'sh bo'lishi mumkin emas",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const maxOrder = Math.max(...categories.map((cat) => cat.order || 0), 0)

      await addDoc(collection(db, "categories"), {
        name: newCategory.trim(),
        order: maxOrder + 1,
        active: true,
        createdAt: new Date(),
      })

      toast({
        title: "Kategoriya qo'shildi",
        description: `${newCategory} muvaffaqiyatli qo'shildi`,
      })

      setNewCategory("")
    } catch (error) {
      console.error("Error adding category:", error)
      toast({
        title: "Xatolik",
        description: "Kategoriyani qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditClick = (category: Category) => {
    setEditingCategory(category)
    setEditedName(category.name)
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setEditedName("")
  }

  const handleSaveEdit = async (categoryId: string) => {
    if (!editedName.trim()) {
      toast({
        title: "Xatolik",
        description: "Kategoriya nomi bo'sh bo'lishi mumkin emas",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await updateDoc(doc(db, "categories", categoryId), {
        name: editedName.trim(),
        updatedAt: new Date(),
      })

      toast({
        title: "Kategoriya yangilandi",
        description: "Kategoriya muvaffaqiyatli yangilandi",
      })

      setEditingCategory(null)
      setEditedName("")
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: "Xatolik",
        description: "Kategoriyani yangilashda xatolik yuz berdi",
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
        title: currentActive ? "Kategoriya o'chirildi" : "Kategoriya yoqildi",
        description: `Kategoriya ${currentActive ? "nofaol" : "faol"} holatga o'tkazildi`,
      })
    } catch (error) {
      console.error("Error toggling category:", error)
      toast({
        title: "Xatolik",
        description: "Kategoriya holatini o'zgartirishda xatolik yuz berdi",
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
        title: "Kategoriya o'chirildi",
        description: "Kategoriya muvaffaqiyatli o'chirildi",
      })
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Xatolik",
        description: "Kategoriyani o'chirishda xatolik yuz berdi",
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
        title: "Tartib o'zgartirildi",
        description: "Kategoriya tartibi muvaffaqiyatli o'zgartirildi",
      })
    } catch (error) {
      console.error("Error reordering categories:", error)
      toast({
        title: "Xatolik",
        description: "Kategoriya tartibini o'zgartirishda xatolik yuz berdi",
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
              <h2 className="text-2xl font-bold">Kategoriyalar boshqaruvi</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kategoriyalarni tartibini o'zgartirish uchun sudrab olib boring
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Faol: {activeCategories.length}
              </Badge>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                Jami: {categories.length}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <Input
                placeholder="Yangi kategoriya nomi"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isSubmitting || !newCategory.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Qo'shilmoqda...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Qo'shish
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
                      order: 0, // First position
                      active: true,
                      isDiscountCategory: true,
                      createdAt: new Date(),
                    })
                    toast({
                      title: "Chegirmalar kategoriyasi qo'shildi",
                      description: "Endi chegirmali mahsulotlar avtomatik ko'rinadi",
                    })
                  } catch (error) {
                    toast({
                      title: "Xatolik",
                      description: "Kategoriyani qo'shishda xatolik",
                      variant: "destructive",
                    })
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                disabled={isSubmitting}
              >
                🔥 Chegirmalar kategoriyasini qo'shish
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
              <p className="text-lg font-medium text-muted-foreground mb-2">Hech qanday kategoriya topilmadi</p>
              <p className="text-sm text-muted-foreground">Birinchi kategoriyangizni qo'shing</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Categories */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-700 flex items-center gap-2">
                  <span>✅ Faol kategoriyalar</span>
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
                        <div className="flex flex-col sm:flex-row w-full items-start sm:items-center gap-2 sm:gap-3">
                          <div className="flex items-center w-full sm:w-auto gap-2">
                            <GripVertical className="h-5 w-5 text-gray-400 hidden sm:block" />
                            <Input
                              value={editedName}
                              onChange={(e) => setEditedName(e.target.value)}
                              className="flex-1"
                              autoFocus
                            />
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto justify-end">
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
                              <span className="font-semibold text-gray-800 text-base sm:text-lg break-all">{category.name}</span>
                              {category.isDiscountCategory ? (
                                <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200 text-[10px] sm:text-xs">
                                  🔥 Chegirmalar
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 text-[10px] sm:text-xs">
                                  Faol
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
                                title="Yuqoriga ko'chirish"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveCategory(category.id, "down")}
                                disabled={isSubmitting || index === activeCategories.length - 1}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-8 w-8 p-0"
                                title="Pastga ko'chirish"
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
                                title="Tahrirlash"
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
                                  title="O'chirish"
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
                    <span>❌ Nofaol kategoriyalar</span>
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
                          <span className="font-semibold text-gray-600 text-lg line-through">{category.name}</span>
                          <Badge variant="secondary" className="bg-gray-200 text-gray-600 border-gray-300">
                            ❌ Nofaol
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
            <AlertDialogTitle>Kategoriyani o'chirishni tasdiqlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu amal qaytarib bo'lmaydi. Bu kategoriyaga tegishli taomlar kategoriyasiz qolishi mumkin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  O'chirilmoqda...
                </>
              ) : (
                "O'chirish"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
