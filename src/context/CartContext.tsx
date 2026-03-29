import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem, MenuItem } from '../types';
import { getFromStorage, saveToStorage } from '../utils/localStorage';

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem, selectedOptions?: any[], note?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => getFromStorage('cart', []));

  useEffect(() => {
    saveToStorage('cart', items);
  }, [items]);

  const addItem = useCallback((menuItem: MenuItem, selectedOptions: any[] = [], note: string = '') => {
    setItems(prev => {
      // Find if an identical item (same menu ID, same options, and same note) exists
      const existing = prev.find(i => 
        i.menuItem.id === menuItem.id && 
        JSON.stringify(i.selectedOptions || []) === JSON.stringify(selectedOptions) &&
        i.note === note
      );
      
      if (existing) {
        return prev.map(i => i.cartItemId === existing.cartItemId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { cartItemId: `cart-${Date.now()}-${Math.random()}`, menuItem, quantity: 1, selectedOptions, note }];
    });
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
    } else {
      setItems(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => {
    const optionsTotal = (i.selectedOptions || []).reduce((optSum: number, opt: any) => optSum + (opt.price || 0), 0);
    return sum + (i.menuItem.price + optionsTotal) * i.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
