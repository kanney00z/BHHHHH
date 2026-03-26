import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, CreditCard, ShoppingBag, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { CartItem, Order } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateInstructions = (id: string, instructions: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, specialInstructions: instructions };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
    toast.error('ลบรายการออกจากตะกร้าแล้ว');
  };

  const addCustomItem = () => {
    const customId = `custom-${Date.now()}`;
    const newItem: CartItem = {
      id: customId,
      name: 'เมนูสั่งทำพิเศษ',
      price: 0, // Admin will set the price later
      category: 'Custom',
      quantity: 1,
      specialInstructions: '',
      description: 'เมนูที่คุณกำหนดเอง'
    };
    setCart(prev => [...prev, newItem]);
    toast.success('เพิ่มเมนูสั่งทำพิเศษแล้ว กรุณาระบุรายละเอียด');
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      toast.error('กรุณาเข้าสู่ระบบก่อนสั่งซื้อ');
      return;
    }

    if (cart.length === 0) return;

    // Check if any item has 0 price (custom items)
    const hasUnpricedItems = cart.some(item => item.price === 0);
    
    setIsCheckingOut(true);
    try {
      // 1. Create Order in Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user.id,
          total_amount: total,
          status: 'pending'
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items in Supabase
      const orderItems = cart.map(item => ({
        order_id: order.id,
        food_item_id: item.id.startsWith('custom-') ? null : item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        special_instructions: item.specialInstructions || ''
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        // If it's a "column does not exist" error (code 42703), try without the 'name' field
        if (itemsError.code === '42703') {
          console.log('Retrying insert without "name" column...');
          const itemsWithoutName = orderItems.map(({ name, ...rest }) => rest);
          const { error: retryError } = await supabase
            .from('order_items')
            .insert(itemsWithoutName);
          
          if (retryError) throw retryError;
        } else {
          throw itemsError;
        }
      }

      setCart([]);
      localStorage.removeItem('cart');
      
      if (hasUnpricedItems) {
        toast.success('สั่งซื้อสำเร็จ! เนื่องจากมีเมนูสั่งทำพิเศษ แอดมินจะแจ้งราคาให้ทราบภายหลัง');
      } else {
        toast.success('สั่งซื้อสำเร็จแล้ว! เรากำลังเตรียมอาหารให้คุณ');
      }
      navigate('/orders');
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error('เกิดข้อผิดพลาดในการสั่งซื้อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-8 bg-white rounded-[3rem] border border-orange-100 p-12">
        <div className="bg-orange-50 w-32 h-32 rounded-full flex items-center justify-center text-orange-500 animate-bounce">
          <ShoppingBag className="w-16 h-16" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-gray-900">ตะกร้าของคุณยังว่างอยู่</h2>
          <p className="text-gray-500">เลือกเมนูแสนอร่อยที่คุณชอบ หรือสั่งเมนูพิเศษก็ได้!</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            to="/menu" 
            className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 flex items-center gap-2"
          >
            ไปที่เมนูอาหาร
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </Link>
          <button 
            onClick={addCustomItem}
            className="bg-white text-orange-500 border-2 border-orange-500 px-10 py-4 rounded-2xl font-bold hover:bg-orange-50 transition-all flex items-center gap-2"
          >
            สั่งเมนูพิเศษ
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-12">
      <div className="lg:col-span-2 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">ตะกร้าสินค้า</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={addCustomItem}
              className="text-orange-500 font-bold text-sm hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              เพิ่มเมนูพิเศษ
            </button>
            <span className="bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-sm font-bold">
              {cart.length} รายการ
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {cart.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white p-6 rounded-3xl border border-orange-100 flex flex-col gap-4 group hover:shadow-lg hover:shadow-orange-500/5 transition-all"
              >
                <div className="flex items-center gap-6">
                  <img 
                    src={item.image || `https://picsum.photos/seed/${item.id}/200/200`} 
                    alt={item.name} 
                    className="w-24 h-24 rounded-2xl object-cover shadow-md group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{item.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">{item.category}</p>
                    <p className="text-lg font-black text-orange-500">
                      {item.price > 0 ? `฿${item.price}` : 'รอแอดมินสรุปราคา'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-orange-50 p-2 rounded-2xl">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-2 hover:bg-white rounded-xl transition-colors text-orange-600 disabled:opacity-50"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-bold text-gray-900">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-2 hover:bg-white rounded-xl transition-colors text-orange-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-3 hover:bg-red-50 rounded-2xl transition-colors text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">หมายเหตุพิเศษ (อยากกินอะไร / ไม่ใส่อะไร)</label>
                  <textarea 
                    placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย, หรือระบุรายละเอียดเมนูสั่งทำพิเศษ..."
                    value={item.specialInstructions || ''}
                    onChange={(e) => updateInstructions(item.id, e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm h-20 resize-none"
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="bg-white p-8 rounded-[2.5rem] border border-orange-100 shadow-xl shadow-orange-500/5 sticky top-24 space-y-8">
          <h2 className="text-2xl font-bold text-gray-900">สรุปการสั่งซื้อ</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between text-gray-500">
              <span>ราคารวม</span>
              <span className="font-medium text-gray-900">฿{total}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>ค่าจัดส่ง</span>
              <span className="text-green-500 font-bold uppercase text-xs">ฟรี</span>
            </div>
            <div className="h-px bg-orange-100" />
            <div className="flex justify-between items-end">
              <span className="text-gray-900 font-bold">ยอดสุทธิ</span>
              <span className="text-3xl font-black text-orange-500 leading-none">฿{total}</span>
            </div>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={isCheckingOut}
            className="w-full bg-orange-500 text-white py-5 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-3 disabled:opacity-70 group"
          >
            {isCheckingOut ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <CreditCard className="w-6 h-6 group-hover:scale-110 transition-transform" />
                ชำระเงินและสั่งซื้อ
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
            ปลอดภัย 100% ด้วยระบบชำระเงินมาตรฐานสากล
          </p>
        </div>
      </div>
    </div>
  );
}
