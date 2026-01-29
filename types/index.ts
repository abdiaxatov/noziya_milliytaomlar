export interface MenuItem {
  id: string;
  name: string; // Default name (usually Uzbek)
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  description?: string;
  description_uz?: string;
  description_ru?: string;
  description_en?: string;
  price: number;
  category: string;
  imageUrl?: string;
  servesCount?: number;
  remainingServings?: number;
  needsContainer?: boolean;
  containerPrice?: number;
  available?: boolean;
  isAvailable?: boolean;
  modelUrl?: string;
  categoryId?: string;
  discountPrice?: number;
  discountEndsAt?: string; // ISO date string
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  description?: string;
  description_uz?: string;
  description_ru?: string;
  description_en?: string;
  imageUrl?: string;
  order?: number;
  active?: boolean;
  isDiscountCategory?: boolean; // Special flag for Chegirmalar category
  createdAt?: any;
  updatedAt?: any;
}

// Update the Table interface to include floor
export interface Table {
  id: string;
  number: number;
  seats: number;
  status: "available" | "occupied" | "reserved";
  roomId?: string;
  floor?: number;
}

// Update the Room interface to include floor
export interface Room {
  id: string;
  number: number;
  status: "available" | "occupied" | "reserved";
  description?: string;
  floor?: number;
}

// Update the Order type to include floor
export type Order = {
  id: string;
  orderType: "table" | "delivery";
  tableNumber?: number | null;
  roomNumber?: number | null;
  status: string;
  createdAt: any;
  updatedAt?: any;
  items: CartItem[];
  total: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryFee?: number;
  paymentMethod?: string;
  notes?: string;
  tableType?: string;
  seatingType?: string;
  floor?: number;
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "chef" | "waiter";
  createdAt: any;
}

// Add Floor interface
export interface Floor {
  id: string;
  number: number;
  name: string;
  description?: string;
}

export interface Banner {
  id: string;
  name: string;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  imageUrl: string;
  categoryId?: string;
  active: boolean; // default true
  createdAt?: any;
}
