import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FoodItem, CartItem } from '../types';
import FoodCard from '../components/FoodCard';
import { Search, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Menu() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching food items from Supabase:', error);
      } else if (data) {
        setItems(data as FoodItem[]);
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .order('name');
      
      if (error) {
        console.error('Error fetching categories from Supabase:', error);
      } else if (data) {
        setCategories(['All', ...data.map(c => c.name)]);
      }
    };

    fetchItems();
    fetchCategories();

    const itemsSubscription = supabase
      .channel('menu_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_items' }, () => fetchItems())
      .subscribe();

    const categoriesSubscription = supabase
      .channel('menu_categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchCategories())
      .subscribe();

    return () => {
      itemsSubscription.unsubscribe();
      categoriesSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: FoodItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`เพิ่ม ${item.name} ลงในตะกร้าแล้ว`);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                         item.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-gray-500 font-medium">กำลังโหลดเมนูแสนอร่อย...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">เมนูอาหารทั้งหมด</h1>
          <p className="text-gray-500 mt-2">เลือกสรรเมนูที่คุณต้องการได้เลย</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
            <input 
              type="text" 
              placeholder="ค้นหาเมนู..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all w-full sm:w-64"
            />
          </div>

          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="pl-12 pr-10 py-3 bg-white border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none cursor-pointer w-full sm:w-48"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.map((item: FoodItem) => (
            <FoodCard 
              key={item.id} 
              item={item} 
              onAddToCart={addToCart}
              quantityInCart={cart.find(i => i.id === item.id)?.quantity}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] p-20 text-center border border-orange-100">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-orange-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">ไม่พบเมนูที่คุณค้นหา</h3>
          <p className="text-gray-500">ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่นดูนะ</p>
        </div>
      )}
    </div>
  );
}
