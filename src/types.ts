
export interface FoodItem {
  id: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  price: number;
  image?: string;
  category: string;
  category_en?: string;
}

export interface CartItem extends FoodItem {
  quantity: number;
  specialInstructions?: string; // What they want/don't want
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'delivered' | 'cancelled';
  createdAt: string;
  adminNotes?: string;
  payment_slip_url?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'user';
}
