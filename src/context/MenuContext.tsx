import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MenuItem, Category } from '../types';
import { supabase } from '../lib/supabase';

interface MenuContextType {
  menuItems: MenuItem[];
  categories: Category[];
  loading: boolean;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const MenuContext = createContext<MenuContextType | null>(null);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMenuData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, itemsRes] = await Promise.all([
        supabase.from('categories').select('*').order('created_at', { ascending: true }),
        supabase.from('menu_items').select('*').order('created_at', { ascending: true })
      ]);

      if (catRes.error) throw catRes.error;
      if (itemsRes.error) throw itemsRes.error;

      setCategories(catRes.data || []);
      
      const mappedItems: MenuItem[] = (itemsRes.data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        categoryId: item.category,
        available: item.isAvailable,
        popular: item.isPopular,
        spicy: false, // Not in DB currently
        options: item.options || [],
      }));
      setMenuItems(mappedItems);
    } catch (error) {
      console.error('Error fetching menu data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuData();

    const channel = supabase
      .channel('menu_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        fetchMenuData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchMenuData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMenuData]);

  const addMenuItem = useCallback(async (item: Omit<MenuItem, 'id'>) => {
    const id = `item-${Date.now()}`;
    const { error } = await supabase.from('menu_items').insert({
      id,
      name: item.name,
      nameEn: item.name, // Mock
      description: item.description,
      price: item.price,
      image: item.image,
      category: item.categoryId,
      isAvailable: item.available,
      isPopular: item.popular || false,
      options: item.options || [],
    });
    if (!error) {
      fetchMenuData(); // Reload
    }
  }, [fetchMenuData]);

  const updateMenuItem = useCallback(async (id: string, updates: Partial<MenuItem>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.categoryId !== undefined) dbUpdates.category = updates.categoryId;
    if (updates.available !== undefined) dbUpdates.isAvailable = updates.available;
    if (updates.popular !== undefined) dbUpdates.isPopular = updates.popular;
    if (updates.options !== undefined) dbUpdates.options = updates.options;

    const { error } = await supabase.from('menu_items').update(dbUpdates).eq('id', id);
    if (!error) fetchMenuData();
  }, [fetchMenuData]);

  const deleteMenuItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (!error) fetchMenuData();
  }, [fetchMenuData]);

  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    const id = `cat-${Date.now()}`;
    const { error } = await supabase.from('categories').insert({
      id,
      name: category.name,
      nameEn: category.name, // Mock
      icon: category.icon,
      color: '#000000', // Mock
    });
    if (!error) fetchMenuData();
  }, [fetchMenuData]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    const { error } = await supabase.from('categories').update(updates).eq('id', id);
    if (!error) fetchMenuData();
  }, [fetchMenuData]);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) fetchMenuData();
  }, [fetchMenuData]);

  return (
    <MenuContext.Provider value={{ menuItems, categories, loading, addMenuItem, updateMenuItem, deleteMenuItem, addCategory, updateCategory, deleteCategory }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used within MenuProvider');
  return ctx;
}
