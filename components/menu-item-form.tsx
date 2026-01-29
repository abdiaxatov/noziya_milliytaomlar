"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { collection, doc, addDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ImageIcon, CuboidIcon as Cube, X, Plus, Upload, AlertTriangle, ChevronLeft } from "lucide-react"
import type { MenuItem, Category } from "@/types"
import { uploadToGitHub } from "@/lib/github-upload"
import EmbeddedModelViewer from "@/components/embedded-3d-viewer"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/hooks/use-language"

interface MenuItemFormProps {
  item?: MenuItem | null
  categories: Category[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function MenuItemForm({ item, categories, onSuccess, onCancel }: MenuItemFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: item?.name || "",
    name_uz: item?.name_uz || "",
    name_ru: item?.name_ru || "",
    name_en: item?.name_en || "",
    price: item?.price ? item.price.toString() : "",
    categoryId: item?.categoryId || "",
    description: item?.description || "",
    description_uz: item?.description_uz || "",
    description_ru: item?.description_ru || "",
    description_en: item?.description_en || "",
    imageUrl: item?.imageUrl || "",
    modelUrl: item?.modelUrl || "",
    servesCount: item?.servesCount ? item.servesCount.toString() : "1",
    isAvailable: item?.isAvailable !== false,
    needsContainer: item?.needsContainer || false,
    containerPrice: item?.containerPrice ? item.containerPrice.toString() : "2000",
    discountPrice: item?.discountPrice ? item.discountPrice.toString() : "",
    discountEndsAt: item?.discountEndsAt || "",
    enableDiscount: !!item?.discountPrice && (!item.discountEndsAt || new Date(item.discountEndsAt) > new Date()),
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImageValid, setIsImageValid] = useState(false)
  const [isCheckingImage, setIsCheckingImage] = useState(false)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isUploadingModel, setIsUploadingModel] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [modelUrlError, setModelUrlError] = useState<string | null>(null)

  const { toast } = useToast()
  const { t } = useLanguage()

  const [imageFileName, setImageFileName] = useState(t("admin.form.fileNotSelected"))
  const [modelFileName, setModelFileName] = useState(t("admin.form.fileNotSelected"))

  const imageInputRef = useRef<HTMLInputElement>(null)
  const modelInputRef = useRef<HTMLInputElement>(null)

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.push("/admin/menu")
    }
  }

  // Validate model URL with enhanced checking
  const validateModelUrl = async (url: string) => {
    if (!url) {
      setModelUrlError(null)
      return
    }

    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname.toLowerCase()
      if (!pathname.endsWith(".glb") && !pathname.endsWith(".gltf")) {
        setModelUrlError(t("admin.form.errors.modelFormat"))
        return
      }

      // Test if URL is accessible (with timeout)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          setModelUrlError(`${t("admin.form.errors.serverError")}: ${response.status}`)
          return
        }

        const contentType = response.headers.get("content-type")
        if (contentType && (contentType.includes("text/html") || contentType.includes("application/json"))) {
          setModelUrlError(t("admin.form.errors.notModel"))
          return
        }

        setModelUrlError(null)
      } catch (fetchError: any) {
        if (fetchError.name === "AbortError") {
          setModelUrlError(t("admin.form.errors.timeout"))
        } else {
          setModelUrlError(t("admin.form.errors.connection"))
        }
      }
    } catch {
      setModelUrlError(t("admin.form.errors.invalidUrl"))
    }
  }

  // Check image validity when imageUrl changes
  useEffect(() => {
    if (formData.imageUrl) {
      setIsCheckingImage(true)
      setIsImageValid(false)
      const img = new window.Image()
      img.onload = () => {
        setIsImageValid(true)
        setIsCheckingImage(false)
      }
      img.onerror = () => {
        setIsImageValid(false)
        setIsCheckingImage(false)
      }
      img.src = formData.imageUrl
    } else {
      setIsImageValid(false)
      setIsCheckingImage(false)
    }
  }, [formData.imageUrl])

  // Validate model URL when it changes (with debouncing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.modelUrl) {
        validateModelUrl(formData.modelUrl).catch((error) => {
          console.warn("Model URL validation error:", error)
          setModelUrlError(t("admin.form.errors.checkError"))
        })
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [formData.modelUrl])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.name.endsWith(".glb") || file.name.endsWith(".gltf")) {
        setModelFile(file)
        setModelFileName(file.name)
        uploadModelFile(file)
      } else {
        toast({
          title: t("admin.form.errors.invalidFormat"),
          description: t("admin.form.errors.modelDesc"),
          variant: "destructive",
        })
        setModelFileName(t("admin.form.fileNotSelected"))
      }
    } else {
      setModelFileName(t("admin.form.fileNotSelected"))
    }
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type.startsWith("image/")) {
        setImageFile(file)
        setImageFileName(file.name)
        uploadImageFile(file)
      } else {
        toast({
          title: t("admin.form.errors.invalidFormat"),
          description: t("admin.form.errors.imageDesc"),
          variant: "destructive",
        })
        setImageFileName(t("admin.form.fileNotSelected"))
      }
    } else {
      setImageFileName(t("admin.form.fileNotSelected"))
    }
  }

  const uploadModelFile = async (file: File) => {
    setIsUploadingModel(true)
    try {
      const fileName = `${Date.now()}_${file.name}`
      const result = await uploadToGitHub(file, fileName, "models")

      if (result.success && result.url) {
        setFormData((prev) => ({ ...prev, modelUrl: result.url }))
        setModelFile(null)
        toast({
          title: t("admin.form.modelUploaded"),
          description: t("admin.form.modelUploadedDesc"),
        })
      } else {
        toast({
          title: t("admin.form.errors.uploadError"),
          description: result.error || t("admin.form.errors.modelNotUploaded"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.warn("Model upload error:", error)
      toast({
        title: t("common.error"),
        description: t("admin.form.errors.modelUploadError"),
        variant: "destructive",
      })
    } finally {
      setIsUploadingModel(false)
    }
  }

  const uploadImageFile = async (file: File) => {
    setIsUploadingImage(true)
    try {
      const fileName = `${Date.now()}_${file.name}`
      const result = await uploadToGitHub(file, fileName, "images")

      if (result.success && result.url) {
        setFormData((prev) => ({ ...prev, imageUrl: result.url }))
        setImageFile(null)
        toast({
          title: t("admin.form.imageUploaded"),
          description: t("admin.form.imageUploadedDesc"),
        })
      } else {
        toast({
          title: t("admin.form.errors.uploadError"),
          description: result.error || t("admin.form.errors.imageNotUploaded"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.warn("Image upload error:", error)
      toast({
        title: t("common.error"),
        description: t("admin.form.errors.imageUploadError"),
        variant: "destructive",
      })
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const hasAnyName = formData.name_uz.trim() || formData.name_ru.trim() || formData.name_en.trim() || formData.name.trim()

    if (!hasAnyName || !formData.price || !formData.categoryId) {
      toast({
        title: t("admin.form.errors.incomplete"),
        description: t("admin.form.errors.fillRequired"),
        variant: "destructive",
      })
      return
    }

    if (modelUrlError) {
      toast({
        title: t("admin.form.errors.modelUrlError"),
        description: modelUrlError,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const mainName = (formData.name_uz || formData.name_ru || formData.name_en || formData.name).trim()
      const menuItemData = {
        name: mainName,
        name_uz: formData.name_uz.trim(),
        name_ru: formData.name_ru.trim(),
        name_en: formData.name_en.trim(),
        price: Number(formData.price),
        categoryId: formData.categoryId,
        description: formData.description_uz || formData.description_ru || formData.description_en || formData.description,
        description_uz: formData.description_uz.trim(),
        description_ru: formData.description_ru.trim(),
        description_en: formData.description_en.trim(),
        imageUrl: formData.imageUrl || null,
        modelUrl: formData.modelUrl || null,
        servesCount: Number(formData.servesCount) || 1,
        isAvailable: formData.isAvailable,
        remainingServings: Number(formData.servesCount) || 1,
        needsContainer: formData.needsContainer,
        containerPrice: formData.needsContainer ? Number(formData.containerPrice) : 0,
        discountPrice: formData.enableDiscount && formData.discountPrice ? Number(formData.discountPrice) : null,
        discountEndsAt: formData.enableDiscount ? formData.discountEndsAt : null,
      }

      if (item?.id) {
        await updateDoc(doc(db, "menuItems", item.id), menuItemData)
        toast({
          title: t("admin.form.itemUpdated"),
          description: `${formData.name} ${t("admin.form.itemUpdatedDesc")}`,
        })
      } else {
        await addDoc(collection(db, "menuItems"), menuItemData)
        toast({
          title: t("admin.form.itemAdded"),
          description: `${formData.name} ${t("admin.form.itemAddedDesc")}`,
        })
        const audio = new Audio("/success.mp3")
        audio.play().catch((e) => console.warn("Audio play failed:", e))
      }

      if (onSuccess) {
        onSuccess()
      } else {
        handleCancel()
      }
    } catch (error) {
      console.warn("Error saving menu item:", error)
      toast({
        title: t("common.error"),
        description: t("admin.form.errors.saveError"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={handleCancel} className="h-10 w-10 rounded-full border-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {item ? t("admin.form.editItem") : t("admin.form.addItem")}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Live Preview Section */}
        <div className="bg-gradient-to-br bg-primary/10 rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            {t("admin.form.livePreview")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-green-600" />
                {t("admin.form.image")}
              </Label>
              <div className="relative h-48 bg-white rounded-xl border-2 border-dashed border-gray-300 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {isCheckingImage || isUploadingImage ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-sm text-gray-600 font-medium">
                        {isUploadingImage ? t("admin.form.uploading") : t("admin.form.checking")}
                      </p>
                    </div>
                  </div>
                ) : formData.imageUrl && isImageValid ? (
                  <Image
                    src={formData.imageUrl || "/placeholder.svg"}
                    alt={t("admin.form.image")}
                    fill
                    className="object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                    onClick={() => setShowImagePreview(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-primary">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3" />
                      <p className="text-sm font-medium">{t("admin.form.imagePreview")}</p>
                      <p className="text-xs">{t("admin.form.imagePreviewDesc")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3D Model Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Cube className="w-4 h-4 text-primary" />
                3D Model
                {modelUrlError && (
                  <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {t("common.error")}
                  </span>
                )}
              </Label>
              <div className="relative h-48 bg-gradient-to-br bg-white rounded-xl border-2 border-dashed border-gray-300 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {isUploadingModel ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-sm text-gray-600 font-medium">{t("admin.form.modelUploading")}</p>
                    </div>
                  </div>
                ) : (
                  <EmbeddedModelViewer modelUrl={formData.modelUrl} className="w-full h-full" />
                )}
              </div>
              {modelUrlError && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    {t("admin.form.errors.modelUrlError")}
                  </div>
                  <p>{modelUrlError}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                {t("admin.form.basicInfo")}
              </h3>
              <div className="space-y-4">
                <Tabs defaultValue="uz" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="uz">O'zbekcha</TabsTrigger>
                    <TabsTrigger value="ru" className="flex gap-1">Русский <span className="text-[10px] opacity-60 font-normal lowercase">{t("common.optional")}</span></TabsTrigger>
                    <TabsTrigger value="en" className="flex gap-1">English <span className="text-[10px] opacity-60 font-normal lowercase">{t("common.optional")}</span></TabsTrigger>
                  </TabsList>

                  <TabsContent value="uz" className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="name_uz" className="text-sm font-medium text-gray-700">
                        {t("admin.form.nameUz")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name_uz"
                        name="name_uz"
                        value={formData.name_uz}
                        onChange={handleChange}
                        required
                        placeholder={t("admin.form.itemNamePlaceholder")}
                        className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description_uz" className="text-sm font-medium text-gray-700">
                        {t("admin.form.descUz")}
                      </Label>
                      <Textarea
                        id="description_uz"
                        name="description_uz"
                        value={formData.description_uz}
                        onChange={handleChange}
                        rows={3}
                        placeholder={t("admin.form.itemDescPlaceholder")}
                        className="border-2 border-gray-200 focus:border-primary rounded-lg resize-none"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="ru" className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="name_ru" className="text-sm font-medium text-gray-700">
                        {t("admin.form.nameRu")}
                      </Label>
                      <Input
                        id="name_ru"
                        name="name_ru"
                        value={formData.name_ru}
                        onChange={handleChange}
                        placeholder="Плов"
                        className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description_ru" className="text-sm font-medium text-gray-700">
                        {t("admin.form.descRu")}
                      </Label>
                      <Textarea
                        id="description_ru"
                        name="description_ru"
                        value={formData.description_ru}
                        onChange={handleChange}
                        rows={3}
                        placeholder="О составе и приготовлении..."
                        className="border-2 border-gray-200 focus:border-primary rounded-lg resize-none"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="en" className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="name_en" className="text-sm font-medium text-gray-700">
                        {t("admin.form.nameEn")}
                      </Label>
                      <Input
                        id="name_en"
                        name="name_en"
                        value={formData.name_en}
                        onChange={handleChange}
                        placeholder="Plov"
                        className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description_en" className="text-sm font-medium text-gray-700">
                        {t("admin.form.descEn")}
                      </Label>
                      <Textarea
                        id="description_en"
                        name="description_en"
                        value={formData.description_en}
                        onChange={handleChange}
                        rows={3}
                        placeholder="About ingredients..."
                        className="border-2 border-gray-200 focus:border-primary rounded-lg resize-none"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                      {t("admin.form.price")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      value={formData.price}
                      onChange={handleChange}
                      required
                      placeholder="25000"
                      className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="servesCount" className="text-sm font-medium text-gray-700">
                      {t("admin.form.servesCount")}
                    </Label>
                    <Input
                      id="servesCount"
                      name="servesCount"
                      type="number"
                      min="1"
                      value={formData.servesCount}
                      onChange={handleChange}
                      placeholder="1"
                      className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId" className="text-sm font-medium text-gray-700">
                    {t("admin.form.category")} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => handleSelectChange("categoryId", value)}
                  >
                    <SelectTrigger className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg">
                      <SelectValue placeholder={t("admin.form.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name_uz || category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Discount Settings */}
            <div className={`bg-white rounded-xl p-6 border transition-colors duration-300 ${formData.enableDiscount ? "border-red-200 shadow-red-50" : "border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold">%</span>
                  {t("admin.form.discount")}
                </h3>
                <Switch
                  checked={formData.enableDiscount}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData(prev => ({
                        ...prev,
                        enableDiscount: true,
                        discountPrice: "",
                        discountEndsAt: ""
                      }));
                    } else {
                      setFormData(prev => ({ ...prev, enableDiscount: false }));
                    }
                  }}
                />
              </div>

              {formData.enableDiscount && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="discountPrice" className="text-sm font-medium text-gray-700">
                      {t("admin.form.discountPrice")} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="discountPrice"
                        name="discountPrice"
                        type="number"
                        value={formData.discountPrice}
                        onChange={handleChange}
                        placeholder="20000"
                        className={`h-11 border-2 rounded-lg pr-12 ${Number(formData.discountPrice) >= Number(formData.price)
                          ? "border-red-500 focus:border-red-500"
                          : "border-gray-200 focus:border-red-500"
                          }`}
                      />
                      <div className="absolute right-3 top-3 text-xs font-bold text-gray-400">SUM</div>
                    </div>
                    {Number(formData.discountPrice) >= Number(formData.price) && (
                      <p className="text-xs text-red-500 font-medium">
                        {t("admin.form.errors.discountGreater")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discountEndsAt" className="text-sm font-medium text-gray-700">
                      {t("admin.form.discountEndsAt")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="discountEndsAt"
                      name="discountEndsAt"
                      type="datetime-local"
                      value={formData.discountEndsAt}
                      onChange={handleChange}
                      className="h-11 border-2 border-gray-200 focus:border-red-500 rounded-lg"
                    />
                    <p className="text-xs text-gray-500">
                      {t("admin.form.discountEndsAtDesc")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">{t("admin.form.settings")}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="isAvailable" className="font-medium text-gray-800">
                      {t("admin.form.available")}
                    </Label>
                    <p className="text-sm text-gray-600">{t("admin.form.availableDesc")}</p>
                  </div>
                  <Switch
                    id="isAvailable"
                    checked={formData.isAvailable}
                    onCheckedChange={(checked) => handleSwitchChange("isAvailable", checked)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Label htmlFor="needsContainer" className="font-medium text-gray-800">
                        Bir martalik idish
                      </Label>
                      <p className="text-sm text-gray-600">{t("admin.form.needsContainerDesc")}</p>
                    </div>
                    <Switch
                      id="needsContainer"
                      checked={formData.needsContainer}
                      onCheckedChange={(checked) => handleSwitchChange("needsContainer", checked)}
                    />
                  </div>

                  {formData.needsContainer && (
                    <div className="ml-4 space-y-2">
                      <Label htmlFor="containerPrice" className="text-sm font-medium text-gray-700">
                        {t("admin.form.containerPrice")}
                      </Label>
                      <Input
                        id="containerPrice"
                        name="containerPrice"
                        type="number"
                        value={formData.containerPrice}
                        onChange={handleChange}
                        placeholder="2000"
                        className="w-32 h-10 border-2 border-gray-200 focus:border-primary rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Media Upload */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-green-600" />
                {t("admin.form.imageUpload")}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl" className="text-sm font-medium text-gray-700">
                    {t("admin.form.imageUrl")}
                  </Label>
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                    className="h-11 border-2 border-gray-200 focus:border-green-500 rounded-lg"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">{t("admin.form.or")}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageFile" className="text-sm font-medium text-gray-700">
                    {t("admin.form.uploadFile")}
                  </Label>
                  {/* Hidden input */}
                  <input
                    type="file"
                    accept="image/*"
                    id="imageFile"
                    ref={imageInputRef}
                    onChange={handleImageFileChange}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="h-24 w-full border-2 border-dashed border-green-300 hover:border-green-500 rounded-lg flex items-center justify-center text-sm text-gray-600 cursor-pointer transition-colors bg-primary/10 hover:bg-primary/20"
                      disabled={isUploadingImage}
                    >
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p className="font-medium text-gray-700">{imageFileName}</p>
                        <p className="text-xs text-gray-500 mt-1">{t("admin.form.imageFormats")}</p>
                      </div>
                    </button>
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                        <div className="text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 font-medium">{t("admin.form.uploading")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3D Model Upload */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                <Cube className="w-5 h-5 text-primary" />
                {t("admin.form.modelUpload")}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modelUrl" className="text-sm font-medium text-gray-700">
                    {t("admin.form.modelUrl")}
                  </Label>
                  <Input
                    id="modelUrl"
                    name="modelUrl"
                    value={formData.modelUrl}
                    onChange={handleChange}
                    placeholder="https://github.com/.../model.glb"
                    className={`h-11 border-2 rounded-lg ${modelUrlError
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-200 focus:border-primary"
                      }`}
                  />
                  {modelUrlError && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {modelUrlError}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">{t("admin.form.or")}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelFile" className="text-sm font-medium text-gray-700">
                    {t("admin.form.uploadFile")} (.glb, .gltf)
                  </Label>
                  {/* Hidden input */}
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    id="modelFile"
                    ref={modelInputRef}
                    onChange={handleModelFileChange}
                    disabled={isUploadingModel}
                    className="hidden"
                  />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => modelInputRef.current?.click()}
                      className="h-24 w-full border-2 border-dashed border-primary hover:border-primary rounded-lg flex items-center justify-center text-sm text-gray-600 cursor-pointer transition-colors bg-primary/10 hover:bg-primary/20"
                      disabled={isUploadingModel}
                    >
                      <div className="text-center">
                        <Cube className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-medium text-gray-700">{modelFileName}</p>
                        <p className="text-xs text-gray-500 mt-1">{t("admin.form.modelFormats")}</p>
                      </div>
                    </button>
                    {isUploadingModel && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                        <div className="text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                          <p className="text-sm text-gray-600 font-medium">{t("admin.form.uploading")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white/95 backdrop-blur-sm flex items-center justify-end gap-3 z-50 md:static md:bg-transparent md:p-0 md:border-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="px-6 py-2 h-11 border-2 border-gray-300  hover:border-primary rounded-lg font-medium bg-transparent"
          >
            {t("admin.form.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isUploadingImage || isUploadingModel || !!modelUrlError}
            className="px-8 py-2 h-11 bg-gradient-to-r from-primary to-primary/90 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("admin.form.saving")}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                {item ? t("admin.form.update") : t("admin.form.add")}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Image Preview Modal */}
      {showImagePreview && formData.imageUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <Button
              onClick={() => setShowImagePreview(false)}
              variant="outline"
              size="sm"
              className="absolute -top-12 right-0 bg-white/20 hover:bg-white/30 text-white border-white/40 backdrop-blur-sm"
            >
              <X className="w-4 h-4" />
            </Button>
            <Image
              src={formData.imageUrl || "/placeholder.svg"}
              alt={t("admin.form.image")}
              width={800}
              height={600}
              className="object-contain max-h-[80vh] rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
