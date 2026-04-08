export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface StoreSettings {
  id: number;
  restaurant_name: string;
  contact_phone: string;
  promptpay_number: string;
  promptpay_name: string;
  store_lat: number | null;
  store_lng: number | null;
  base_delivery_fee: number;
  free_delivery_km: number;
  fee_per_km: number;
  max_delivery_km: number;
  opening_time: string;
  closing_time: string;
  auto_close_enabled: boolean;
  promo_banner_active: boolean;
  promo_banner_text: string;
  hero_headline: string;
  hero_highlight: string;
  hero_subheadline: string;
}

export interface MenuItemOptionChoice {
  id: string;
  name: string;
  price: number;
}

export interface MenuItemOption {
  id: string;
  name: string;
  isRequired: boolean;
  maxSelections: number;
  choices: MenuItemOptionChoice[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  available: boolean;
  popular?: boolean;
  spicy?: boolean;
  options?: MenuItemOption[];
}

export interface SelectedOption {
  optionName: string;
  choiceName: string;
  price: number;
}

export interface CartItem {
  cartItemId: string;
  menuItem: MenuItem;
  quantity: number;
  note?: string;
  customName?: string;
  isCustomItem?: boolean;
  selectedOptions?: SelectedOption[];
}

export type OrderStatus = 'pending_pricing' | 'awaiting_payment' | 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'completed' | 'cancelled';
export type OrderType = 'delivery' | 'dine_in' | 'takeaway';

export interface Order {
  id: string;
  queueNumber?: number;
  tableNumber?: string;
  items: CartItem[];
  total: number;
  deliveryFee?: number;
  discountAmount?: number;
  promoCode?: string;
  status: OrderStatus;
  orderType: OrderType;
  pickupTime?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  paymentMethod: 'cash' | 'promptpay' | 'card';
  createdAt: string;
  updatedAt: string;
  paymentSlipUrl?: string;
}

export interface Promotion {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_spend: number;
  max_discount: number | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at?: string;
}

export interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}
