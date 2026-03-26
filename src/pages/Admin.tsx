import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FoodItem, Order } from '../types';
import { Plus, Trash2, Edit2, Package, Utensils, CheckCircle2, XCircle, Clock, Loader2, Save, X, Image as ImageIcon, LayoutDashboard, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('menu');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [shopName, setShopName] = useState('Aroi-D');
  const [isUpdatingShopName, setIsUpdatingShopName] = useState(false);
  const [promptpayNumber, setPromptpayNumber] = useState('');
  const [isUpdatingPromptpay, setIsUpdatingPromptpay] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*');
      if (data) {
        const shop = data.find(d => d.key === 'shop_name');
        const pp = data.find(d => d.key === 'promptpay_number');
        if (shop) setShopName(shop.value);
        if (pp) setPromptpayNumber(pp.value);
      }
    };
    fetchSettings();

    const sub = supabase.channel('admin_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload: any) => {
        if (payload.new) {
          if (payload.new.key === 'shop_name') setShopName(payload.new.value);
          if (payload.new.key === 'promptpay_number') setPromptpayNumber(payload.new.value);
        }
      }).subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  const handleUpdateShopName = async () => {
    if (!shopName.trim()) return;
    setIsUpdatingShopName(true);
    try {
      const { error } = await supabase.from('settings').upsert({ key: 'shop_name', value: shopName.trim() });
      if (error) throw error;
      toast.success('อัปเดตชื่อร้านสำเร็จ');
    } catch (error) {
      console.error('Error updating shop name:', error);
      toast.error('ไม่สามารถอัปเดตชื่อร้านได้ ขอให้ตรวจสอบว่ามีตาราง settings หรือยัง');
    } finally {
      setIsUpdatingShopName(false);
    }
  };

  const handleUpdatePromptpay = async () => {
    setIsUpdatingPromptpay(true);
    try {
      const { error } = await supabase.from('settings').upsert({ key: 'promptpay_number', value: promptpayNumber.trim() });
      if (error) throw error;
      toast.success('อัปเดตเบอร์พร้อมเพย์สำเร็จ');
    } catch (error) {
      console.error('Error updating promptpay:', error);
      toast.error('ไม่สามารถอัปเดตพร้อมเพย์ได้');
    } finally {
      setIsUpdatingPromptpay(false);
    }
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<FoodItem>>({
    name: '',
    name_en: '',
    description: '',
    description_en: '',
    price: 0,
    category: '',
    category_en: '',
    image: ''
  });
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslate = async () => {
    if (!formData.name) {
      toast.error('กรุณากรอกชื่อเมนูก่อนแปลภาษา');
      return;
    }
    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: formData.name, 
          description: formData.description || '',
          category: formData.category || ''
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFormData(prev => ({
          ...prev,
          name_en: data.name_en || data.englishName || prev.name_en,
          description_en: data.description_en || prev.description_en,
          category_en: data.category_en || prev.category_en
        }));
        toast.success('แปลภาษาอัตโนมัติสำเร็จ! ✨');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('การแปลภาษาล้มเหลว กรุณาลองใหม่');
    } finally {
      setIsTranslating(false);
    }
  };

  // Fetch Food Items from Supabase
  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching food items from Supabase:', error);
    } else if (data) {
      setItems(data as FoodItem[]);
    }
  };

  // Fetch Categories from Supabase
  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching categories from Supabase:', error);
    } else if (data) {
      setCategories(data as {id: string, name: string}[]);
      if (data.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: data[0].name }));
      }
    }
  };

  // Fetch Orders from Supabase
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, food_items(*))')
      .order('created_at', { ascending: true }); // Change to ascending for queue management
    
    if (error) {
      console.error('Error fetching orders from Supabase:', error);
    } else if (data) {
      console.log('Fetched orders raw data:', data);
      // Map order_items back to items for compatibility
      const mappedOrders = data.map(order => ({
        ...order,
        // Map snake_case to camelCase for the UI
        userId: order.user_id,
        totalAmount: order.total_amount,
        adminNotes: order.admin_notes,
        createdAt: order.created_at, // This is a string from Supabase
        items: (order.order_items || []).map((item: any) => {
          console.log('Mapping item:', item);
          return {
            ...item,
            id: item.food_item_id || `custom-${item.id}`,
            name: item.name || item.food_items?.name || 'เมนูสั่งทำพิเศษ',
            category: item.food_items?.category || 'Custom',
            specialInstructions: item.special_instructions
          };
        })
      }));
      console.log('Mapped orders:', mappedOrders);
      setOrders(mappedOrders as any[]);
      setLoading(false);
    }
  };

  // Use a ref to track the fetch timeout for debouncing
  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const debouncedFetchOrders = () => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchOrders();
    }, 300);
  };

  useEffect(() => {
    // Real-time subscriptions for Supabase
    const itemsSubscription = supabase
      .channel('food_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_items' }, () => {
        console.log('Real-time: food_items changed');
        fetchItems();
      })
      .subscribe();

    const categoriesSubscription = supabase
      .channel('categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        console.log('Real-time: categories changed');
        fetchCategories();
      })
      .subscribe();

    const ordersSubscription = supabase
      .channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        console.log('Real-time: orders changed', payload);
        debouncedFetchOrders();
      })
      .subscribe();

    const orderItemsSubscription = supabase
      .channel('order_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (payload) => {
        console.log('Real-time: order_items changed', payload);
        debouncedFetchOrders();
      })
      .subscribe();

    fetchItems();
    fetchCategories();
    fetchOrders();

    return () => {
      itemsSubscription.unsubscribe();
      categoriesSubscription.unsubscribe();
      ordersSubscription.unsubscribe();
      orderItemsSubscription.unsubscribe();
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800000) { // Limit to 800KB for base64
      toast.error('ขนาดรูปภาพใหญ่เกินไป (จำกัด 800KB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim() }]);
      
      if (error) throw error;
      
      setNewCategoryName('');
      toast.success('เพิ่มหมวดหมู่สำเร็จ');
    } catch (error) {
      console.error('Add category failed:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    toast(`คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่ "${name}"?`, {
      action: {
        label: 'ลบ',
        onClick: async () => {
          try {
            const { error } = await supabase
              .from('categories')
              .delete()
              .eq('id', id);
            
            if (error) throw error;
            toast.success('ลบหมวดหมู่สำเร็จ');
          } catch (error) {
            console.error('Delete category failed:', error);
            toast.error('เกิดข้อผิดพลาดในการลบหมวดหมู่ (อาจมีเมนูที่ใช้หมวดหมู่นี้อยู่)');
          }
        },
      },
      cancel: {
        label: 'ยกเลิก',
        onClick: () => {},
      },
    });
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemData = {
        name: formData.name,
        name_en: formData.name_en,
        description: formData.description,
        description_en: formData.description_en,
        price: formData.price,
        category: formData.category,
        category_en: formData.category_en,
        image: formData.image
      };

      if (isEditing) {
        const { error } = await supabase
          .from('food_items')
          .update(itemData)
          .eq('id', isEditing);
        if (error) throw error;
        toast.success('อัปเดตเมนูสำเร็จ');
      } else {
        const { error } = await supabase
          .from('food_items')
          .insert([itemData]);
        if (error) throw error;
        toast.success('เพิ่มเมนูใหม่สำเร็จ');
      }
      setFormData({ name: '', name_en: '', description: '', description_en: '', price: 0, category: categories[0]?.name || '', category_en: '', image: '' });
      setIsEditing(null);
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleDeleteItem = async (id: string) => {
    toast('คุณแน่ใจหรือไม่ที่จะลบเมนูนี้?', {
      action: {
        label: 'ลบ',
        onClick: async () => {
          try {
            const { error } = await supabase
              .from('food_items')
              .delete()
              .eq('id', id);
            
            if (error) throw error;
            toast.success('ลบเมนูสำเร็จ');
          } catch (error) {
            console.error('Delete failed:', error);
            toast.error('เกิดข้อผิดพลาดในการลบเมนู');
          }
        },
      },
      cancel: {
        label: 'ยกเลิก',
        onClick: () => {},
      },
    });
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      toast.success('อัปเดตสถานะออเดอร์แล้ว');
    } catch (error) {
      console.error('Update status failed:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const [isEditingOrder, setIsEditingOrder] = useState<string | null>(null);
  const [editingOrderData, setEditingOrderData] = useState<Order | null>(null);

  const handleEditOrder = (order: Order) => {
    setIsEditingOrder(order.id);
    // Clone items array and other simple fields, but keep the original order object structure for Timestamp
    setEditingOrderData({ ...order, items: [...order.items] });
  };

  const saveOrderEdits = async () => {
    if (!editingOrderData) return;
    try {
      const { id, items, totalAmount, adminNotes, status } = editingOrderData;
      console.log('Saving order edits for ID:', id);
      console.log('Items to save:', items);
      
      if (!items || items.length === 0) {
        toast.error('ไม่สามารถบันทึกบิลที่ไม่มีรายการอาหารได้');
        return;
      }

      if (isNaN(totalAmount) || totalAmount < 0) {
        toast.error('ยอดรวมไม่ถูกต้อง กรุณาตรวจสอบราคาและจำนวน');
        return;
      }

      // 1. Update items (delete and re-insert)
      // We do this first so that when we update the order status/total,
      // the real-time subscription triggers and finds the new items already there.
      console.log('Deleting old items for order:', id);
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id);
      
      if (deleteError) {
        console.error('Delete items failed:', deleteError);
        throw new Error('ไม่สามารถลบรายการอาหารเดิมได้');
      }

      const itemsToInsert = items.map(item => {
        // Robust check for custom items
        const isCustom = typeof item.id === 'string' && item.id.startsWith('custom-');
        return {
          order_id: id,
          food_item_id: isCustom ? null : item.id,
          name: item.name || null,
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          special_instructions: item.specialInstructions || ''
        };
      });
      console.log('Items being inserted:', itemsToInsert);

      const { error: insertError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);
      
      if (insertError) {
        console.error('Insert items failed:', insertError);
        
        // If it's a "column does not exist" error (code 42703), try without the 'name' field
        if (insertError.code === '42703') {
          console.log('Retrying insert without "name" column...');
          const itemsWithoutName = itemsToInsert.map(({ name, ...rest }) => rest);
          const { error: retryError } = await supabase
            .from('order_items')
            .insert(itemsWithoutName);
          
          if (retryError) {
            console.error('Retry insert failed:', retryError);
            throw new Error(`ไม่สามารถบันทึกรายการอาหารได้: ${retryError.message}`);
          }
          console.warn('Saved without custom names because the "name" column is missing in the database.');
        } else {
          throw new Error(`ไม่สามารถบันทึกรายการอาหารใหม่ได้: ${insertError.message}`);
        }
      }

      // 2. Update order (this will trigger the real-time subscription)
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          total_amount: totalAmount, 
          admin_notes: adminNotes || '', 
          status
        })
        .eq('id', id);
      
      if (orderError) {
        console.error('Update order failed:', orderError);
        throw new Error(`ไม่สามารถอัปเดตข้อมูลออเดอร์ได้: ${orderError.message}`);
      }

      // Update local state immediately for better UX and to prevent 'reverting' feel
      setOrders(prev => prev.map(o => o.id === id ? { 
        ...o, 
        totalAmount, 
        adminNotes: adminNotes || '', 
        status,
        items: items.map(item => ({
          ...item,
          name: item.name || 'เมนูสั่งทำพิเศษ',
          category: item.category || 'Custom'
        }))
      } : o));

      // 3. Manually refresh to be sure
      await fetchOrders();

      toast.success('บันทึกการแก้ไขบิลสำเร็จ');
      setIsEditingOrder(null);
      setEditingOrderData(null);
    } catch (error: any) {
      console.error('Save order failed:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการบันทึกบิล');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    toast('คุณแน่ใจหรือไม่ที่จะลบบิลนี้?', {
      action: {
        label: 'ลบ',
        onClick: async () => {
          try {
            // Delete order items first
            const { error: itemsError } = await supabase
              .from('order_items')
              .delete()
              .eq('order_id', id);
            
            if (itemsError) throw itemsError;

            // Delete the order
            const { error: orderError } = await supabase
              .from('orders')
              .delete()
              .eq('id', id);
            
            if (orderError) throw orderError;

            toast.success('ลบบิลสำเร็จ');
            await fetchOrders();
          } catch (error) {
            console.error('Delete order failed:', error);
            toast.error('เกิดข้อผิดพลาดในการลบบิล');
          }
        },
      },
      cancel: {
        label: 'ยกเลิก',
        onClick: () => {},
      },
    });
  };

  const updateItemPrice = (index: number, price: number) => {
    if (!editingOrderData) return;
    const newItems = [...editingOrderData.items];
    newItems[index].price = price;
    
    // Recalculate total
    const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setEditingOrderData({ ...editingOrderData, items: newItems, totalAmount: newTotal });
  };

  const updateItemName = (index: number, name: string) => {
    if (!editingOrderData) return;
    const newItems = [...editingOrderData.items];
    newItems[index].name = name;
    setEditingOrderData({ ...editingOrderData, items: newItems });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-gray-500 font-medium">กำลังโหลดข้อมูลหลังบ้าน...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">จัดการหลังบ้าน</h1>
          <p className="text-gray-500 mt-2">ดูแลเมนูอาหารและออเดอร์ของคุณ</p>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-orange-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('menu')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'menu' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'text-gray-500 hover:text-orange-500'}`}
          >
            จัดการเมนู
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'text-gray-500 hover:text-orange-500'}`}
          >
            จัดการออเดอร์
          </button>
        </div>
      </div>

      {/* Shop Settings */}
      <section className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-orange-100 shadow-xl shadow-orange-500/5">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-200">
                <LayoutDashboard className="text-white w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">ตั้งค่าร้านค้า</h2>
                <p className="text-gray-500 text-sm">จัดการข้อมูลพื้นฐานของร้าน</p>
              </div>
            </div>

            <div className="space-y-6 max-w-md">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">ชื่อร้านค้า</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    className="flex-1 px-4 py-3 bg-orange-50/50 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="ระบุชื่อร้าน..."
                  />
                  <button 
                    onClick={handleUpdateShopName}
                    disabled={isUpdatingShopName}
                    className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-200"
                  >
                    {isUpdatingShopName ? '...' : 'บันทึก'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">เบอร์พร้อมเพย์ / เลขบัตร ปชช.</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={promptpayNumber}
                    onChange={e => setPromptpayNumber(e.target.value)}
                    className="flex-1 px-4 py-3 bg-orange-50/50 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="08X-XXX-XXXX หรือ 1XXXXXXXXXXXX"
                  />
                  <button 
                    onClick={handleUpdatePromptpay}
                    disabled={isUpdatingPromptpay}
                    className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-200"
                  >
                    {isUpdatingPromptpay ? '...' : 'บันทึก'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center p-8 bg-orange-50/50 rounded-3xl border border-orange-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">QR Code เข้าร้าน</h3>
            <p className="text-sm text-gray-500 mb-6 text-center">ลูกค้าสามารถสแกนเพื่อเปิดเมนูสั่งอาหารได้ทันทีบนมือถือ</p>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-6">
              <QRCodeSVG 
                value={window.location.origin} 
                size={180} 
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs font-bold text-orange-600 bg-orange-100/50 px-4 py-2 rounded-xl border border-orange-200/50 select-all">
              {window.location.origin}
            </p>
          </div>
        </div>
      </section>

      {activeTab === 'menu' ? (
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[2.5rem] border border-orange-100 shadow-xl shadow-orange-500/5 sticky top-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {isEditing ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}
              </h2>
              <form onSubmit={handleSaveItem} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">ชื่อเมนู</label>
                  </div>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-orange-50/50 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="เช่น ข้าวกะเพราหมูสับ"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">รายละเอียด</label>
                  <textarea 
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-orange-50/50 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none h-20"
                    placeholder="คำอธิบายเมนูอาหาร..."
                  />
                </div>

                {/* English Translation Section */}
                <div className="mt-4 p-6 bg-purple-50/30 rounded-3xl border border-purple-100 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-purple-600 tracking-wide flex items-center gap-2">
                      English Translation
                    </h3>
                    <button
                      type="button"
                      onClick={handleTranslate}
                      disabled={isTranslating || !formData.name}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-600/20 disabled:opacity-50 transition-all"
                    >
                      {isTranslating ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังแปล...</>
                      ) : (
                        <>แปลอัตโนมัติ</>
                      )}
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">MENU NAME (EN)</label>
                      <input 
                        type="text" 
                        value={formData.name_en || ''}
                        onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                        placeholder="English Name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CATEGORY (EN)</label>
                      <input 
                        type="text" 
                        value={formData.category_en || ''}
                        onChange={e => setFormData({ ...formData, category_en: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                        placeholder="English Category"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DESCRIPTION (EN)</label>
                      <textarea 
                        value={formData.description_en || ''}
                        onChange={e => setFormData({ ...formData, description_en: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none h-20 text-sm"
                        placeholder="English Description"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">หมวดหมู่</label>
                  <select 
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-orange-50/50 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none"
                  >
                    <option value="" disabled>เลือกหมวดหมู่</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>

                  {/* Category Management */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-2xl space-y-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">จัดการหมวดหมู่</p>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="ชื่อหมวดหมู่ใหม่..."
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                      />
                      <button 
                        type="button"
                        onClick={handleAddCategory}
                        className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600"
                      >
                        เพิ่ม
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded-lg text-xs">
                          <span>{cat.name}</span>
                          <button 
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">ราคา (บาท)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-orange-50/50 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">รูปภาพเมนู</label>
                  <div className="flex gap-4 items-center">
                    <div className="w-24 h-24 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 overflow-hidden border-2 border-dashed border-orange-200">
                      {formData.image ? (
                        <img src={formData.image} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 opacity-50" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label 
                        htmlFor="image-upload"
                        className="inline-block px-4 py-2 bg-white border border-orange-200 text-orange-500 rounded-xl text-sm font-bold cursor-pointer hover:bg-orange-50 transition-colors"
                      >
                        เลือกรูปภาพ
                      </label>
                      <p className="text-[10px] text-gray-400">ขนาดแนะนำ: 500x500px (ไม่เกิน 800KB)</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">คำอธิบาย</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-orange-50/50 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all h-24 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  {isEditing && (
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEditing(null);
                        setFormData({ name: '', description: '', price: 0, category: 'Main', image: '' });
                      }}
                      className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      ยกเลิก
                    </button>
                  )}
                  <button 
                    type="submit"
                    className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มเมนู'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-5 rounded-3xl border border-orange-100 flex items-center gap-6 group hover:shadow-lg hover:shadow-orange-500/5 transition-all"
                >
                  <img 
                    src={item.image || `https://picsum.photos/seed/${item.id}/200/200`} 
                    alt={item.name} 
                    className="w-20 h-20 rounded-2xl object-cover shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 truncate leading-tight">{item.name}</h3>
                        {item.name_en && <p className="text-[11px] text-gray-500 font-medium">{item.name_en}</p>}
                      </div>
                      <div className="flex flex-col gap-0.5 mt-0.5 justify-end items-end shrink-0">
                        <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          {item.category}
                        </span>
                        {item.category_en && (
                          <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                            {item.category_en}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1">
                      <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                      {item.description_en && <p className="text-[10px] text-gray-400 italic line-clamp-1">{item.description_en}</p>}
                    </div>
                    <p className="text-lg font-black text-orange-500 mt-2">฿{item.price}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setIsEditing(item.id);
                        setFormData(item);
                      }}
                      className="p-3 hover:bg-orange-50 rounded-2xl transition-colors text-gray-400 hover:text-orange-500"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-3 hover:bg-red-50 rounded-2xl transition-colors text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order, index) => (
            <div key={order.id} className="bg-white rounded-[2.5rem] border border-orange-100 overflow-hidden shadow-sm">
              <div className="p-6 bg-orange-50/50 border-b border-orange-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="bg-orange-500 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                    <span className="text-2xl font-black">#{index + 1}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl shadow-sm">
                      <Package className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order ID</p>
                      <p className="font-mono font-bold text-gray-900">#{order.id.toUpperCase()}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {[
                    { status: 'pending', label: 'รอดำเนินการ', icon: <Clock className="w-4 h-4" />, color: 'hover:bg-yellow-100 hover:text-yellow-700' },
                    { status: 'preparing', label: 'กำลังเตรียม', icon: <Utensils className="w-4 h-4" />, color: 'hover:bg-blue-100 hover:text-blue-700' },
                    { status: 'delivered', label: 'จัดส่งแล้ว', icon: <CheckCircle2 className="w-4 h-4" />, color: 'hover:bg-green-100 hover:text-green-700' },
                    { status: 'cancelled', label: 'ยกเลิก', icon: <XCircle className="w-4 h-4" />, color: 'hover:bg-red-100 hover:text-red-700' }
                  ].map(s => (
                    <button 
                      key={s.status}
                      onClick={() => updateOrderStatus(order.id, s.status as Order['status'])}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${order.status === s.status ? 'bg-orange-500 text-white shadow-md' : `bg-gray-50 text-gray-400 ${s.color}`}`}
                    >
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                  
                  <button 
                    onClick={() => handleDeleteOrder(order.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600"
                    title="ลบบิล"
                  >
                    <Trash2 className="w-4 h-4" />
                    ลบบิล
                  </button>
                </div>
              </div>

              <div className="p-8 grid md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">รายการอาหาร</p>
                    {isEditingOrder !== order.id && (
                      <button 
                        onClick={() => handleEditOrder(order)}
                        className="text-orange-500 text-xs font-bold hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        แก้ไขบิล
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {isEditingOrder === order.id && editingOrderData ? (
                      <div className="space-y-4">
                        {(editingOrderData.items || []).map((item: any, i: number) => (
                          <div key={i} className="bg-gray-50 p-4 rounded-2xl space-y-3">
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItemName(i, e.target.value)}
                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                              />
                              <div className="flex items-center gap-1">
                                <span className="text-gray-400 text-xs">฿</span>
                                <input 
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => updateItemPrice(i, Number(e.target.value))}
                                  className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                                />
                              </div>
                            </div>
                            {item.specialInstructions && (
                              <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                                <span className="font-bold">โน้ตจากลูกค้า:</span> {item.specialInstructions}
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">โน้ตจากแอดมิน (แจ้งลูกค้า)</label>
                          <textarea 
                            value={editingOrderData.adminNotes || ''}
                            onChange={(e) => setEditingOrderData({ ...editingOrderData, adminNotes: e.target.value })}
                            placeholder="เช่น แจ้งราคาเมนูพิเศษ, เวลาจัดส่งโดยประมาณ..."
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm h-20 resize-none focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setIsEditingOrder(null); setEditingOrderData(null); }}
                            className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-200"
                          >
                            ยกเลิก
                          </button>
                          <button 
                            onClick={saveOrderEdits}
                            className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-orange-600 shadow-lg shadow-orange-200"
                          >
                            บันทึกบิล
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(order.items || []).map((item: any, i: number) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-900 font-medium">{item.quantity}x {item.name}</span>
                              <span className="text-gray-500">฿{item.price * item.quantity}</span>
                            </div>
                            {item.specialInstructions && (
                              <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg italic">
                                "{item.specialInstructions}"
                              </p>
                            )}
                          </div>
                        ))}
                        {order.adminNotes && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">โน้ตจากแอดมิน</p>
                            <p className="text-sm text-blue-700">{order.adminNotes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="h-px bg-orange-100" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">ยอดรวมทั้งหมด</span>
                    <span className="text-2xl font-black text-orange-500">
                      ฿{isEditingOrder === order.id ? editingOrderData?.totalAmount : order.totalAmount}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ข้อมูลลูกค้า</p>
                  <div className="bg-orange-50/50 p-6 rounded-3xl space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">User ID:</span>
                      <span className="font-medium text-gray-900">{order.userId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">เวลาสั่งซื้อ:</span>
                      <span className="font-medium text-gray-900">
                        {order.createdAt 
                          ? new Date(order.createdAt).toLocaleString('th-TH') 
                          : 'กำลังโหลด...'}
                      </span>
                    </div>
                  </div>

                  {order.payment_slip_url && (
                    <div className="mt-6">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">หลักฐานการโอนเงิน</p>
                      <a href={order.payment_slip_url} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-3xl border-4 border-white shadow-xl bg-gray-50">
                        <img 
                          src={order.payment_slip_url} 
                          alt="Payment Slip" 
                          className="w-full h-auto max-h-64 object-contain transition-transform duration-500 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          <span className="text-white font-bold text-sm bg-black/50 px-4 py-2 rounded-xl backdrop-blur-sm">คลิกเพื่อดูรูปเต็ม</span>
                        </div>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
