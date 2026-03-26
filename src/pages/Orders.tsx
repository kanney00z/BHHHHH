import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Order } from '../types';
import { Package, Clock, CheckCircle2, XCircle, Loader2, Utensils, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import generatePayload from 'promptpay-qr';
import { toast } from 'sonner';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [promptpayNumber, setPromptpayNumber] = useState('');
  const [uploadingSlip, setUploadingSlip] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'promptpay_number').single();
      if (data) setPromptpayNumber(data.value);
    };
    fetchSettings();
  }, []);

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

  const fetchOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;
    if (!currentUserId) return;
    
    setUserId(currentUserId);

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, food_items(*))')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching orders from Supabase:', error);
    } else if (data) {
      const mappedOrders = data.map(order => ({
        ...order,
        // Map snake_case to camelCase for the UI
        userId: order.user_id,
        totalAmount: order.total_amount,
        adminNotes: order.admin_notes,
        payment_slip_url: order.payment_slip_url,
        createdAt: order.created_at, // This is a string from Supabase
        items: (order.order_items || []).map((item: any) => ({
          ...item,
          id: item.food_item_id || `custom-${item.id}`,
          name: item.name || item.food_items?.name || 'เมนูสั่งทำพิเศษ',
          category: item.food_items?.category || 'Custom',
          specialInstructions: item.special_instructions
        }))
      }));
      setOrders(mappedOrders as any[]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders().then(() => {
      // Set up subscriptions only after we know the userId
      supabase.auth.getSession().then(({ data: { session } }) => {
        const currentUserId = session?.user?.id;
        if (!currentUserId) return;

        const ordersSubscription = supabase
          .channel('user_orders_changes')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'orders',
            filter: `user_id=eq.${currentUserId}`
          }, () => debouncedFetchOrders())
          .subscribe();

        const orderItemsSubscription = supabase
          .channel('user_order_items_changes')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'order_items'
          }, () => debouncedFetchOrders())
          .subscribe();

        // Cleanup
        return () => {
          ordersSubscription.unsubscribe();
          orderItemsSubscription.unsubscribe();
        };
      });
    });

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  const handleFileUpload = async (orderId: string, file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ขนาดรูปภาพใหญ่เกินไป (จำกัด 5MB)');
      return;
    }

    setUploadingSlip(orderId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}-${Math.random()}.${fileExt}`;
      const filePath = `slips/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment_slips')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment_slips')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('orders')
        .update({ payment_slip_url: publicUrl })
        .eq('id', orderId);

      if (updateError) throw updateError;
      
      toast.success('แนบสลิปเรียบร้อยแล้ว');
    } catch (err: any) {
      console.error(err);
      toast.error('อัปโหลดสลิปไม่สำเร็จ');
    } finally {
      setUploadingSlip(null);
    }
  };

  const getStatusInfo = (status: Order['status']) => {
    switch (status) {
      case 'pending': return { icon: <Clock className="w-4 h-4" />, label: 'รอดำเนินการ', color: 'bg-yellow-100 text-yellow-700' };
      case 'preparing': return { icon: <Utensils className="w-4 h-4" />, label: 'กำลังเตรียมอาหาร', color: 'bg-blue-100 text-blue-700' };
      case 'delivered': return { icon: <CheckCircle2 className="w-4 h-4" />, label: 'จัดส่งสำเร็จ', color: 'bg-green-100 text-green-700' };
      case 'cancelled': return { icon: <XCircle className="w-4 h-4" />, label: 'ยกเลิกแล้ว', color: 'bg-red-100 text-red-700' };
      default: return { icon: <Package className="w-4 h-4" />, label: status, color: 'bg-gray-100 text-gray-700' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-gray-500 font-medium">กำลังโหลดประวัติการสั่งซื้อ...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">ประวัติการสั่งซื้อ</h1>
          <p className="text-gray-500 mt-2">ติดตามสถานะอาหารของคุณได้ที่นี่</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-orange-100 shadow-sm">
          <span className="text-sm text-gray-500">สั่งซื้อทั้งหมด</span>
          <p className="text-2xl font-black text-orange-500">{orders.length} รายการ</p>
        </div>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {orders.map((order, index) => {
              const status = getStatusInfo(order.status);
              return (
                <motion.div 
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[2rem] border border-orange-100 overflow-hidden hover:shadow-xl hover:shadow-orange-500/5 transition-all"
                >
                  <div className="p-6 md:p-8 bg-orange-50/50 border-b border-orange-100 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div className="bg-orange-500 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                        <span className="text-xl font-black">#{index + 1}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Order ID</p>
                        <p className="text-sm font-mono font-bold text-gray-600">#{order.id.slice(-8).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">วันที่สั่งซื้อ</p>
                      <p className="text-sm font-bold text-gray-600">
                        {order.createdAt 
                          ? new Date(order.createdAt).toLocaleDateString('th-TH', { 
                              year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })
                          : 'กำลังโหลด...'}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </div>
                  </div>

                  <div className="p-6 md:p-8 space-y-6">
                    <div className="space-y-4">
                      {(order.items || []).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                              {item.quantity}x
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-500">{item.category}</p>
                            </div>
                          </div>
                          <p className="font-bold text-gray-700">฿{item.price * item.quantity}</p>
                        </div>
                      ))}
                    </div>

                    <div className="h-px bg-orange-100" />

                    <div className="flex justify-between items-end">
                      <div className="space-y-1 flex-1">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">ยอดรวมสุทธิ</p>
                        <p className="text-3xl font-black text-orange-500 leading-none mb-4">฿{order.totalAmount}</p>

                        {order.status === 'pending' && promptpayNumber && !order.payment_slip_url && (
                          <div className="mt-8 flex flex-col md:flex-row items-center gap-6 p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                            <div className="flex flex-col items-center flex-1">
                              <p className="font-bold text-gray-700 mb-4 text-xs uppercase tracking-wider">แสกนเพื่อชำระเงิน</p>
                              <div className="bg-white p-3 rounded-2xl border-4 border-orange-500 shadow-xl shadow-orange-100 mb-3">
                                <QRCodeSVG 
                                  value={generatePayload(promptpayNumber, { amount: Number(order.totalAmount) })} 
                                  size={160}
                                />
                              </div>
                              <p className="text-sm font-bold text-gray-900">พร้อมเพย์: {promptpayNumber}</p>
                            </div>
                            
                            <div className="w-full md:w-64">
                              <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-orange-200 border-dashed rounded-[2rem] cursor-pointer bg-orange-50/50 hover:bg-orange-100 transition-colors ${uploadingSlip === order.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                  {uploadingSlip === order.id ? (
                                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
                                  ) : (
                                    <ImageIcon className="w-8 h-8 text-orange-400 mb-3" />
                                  )}
                                  <p className="mb-1 text-sm font-bold text-gray-700">แนบสลิปโอนเงิน</p>
                                  <p className="text-xs text-gray-500">รองรับ JPG, PNG</p>
                                </div>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  disabled={uploadingSlip === order.id}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(order.id, file);
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        )}

                        {order.payment_slip_url && (
                          <div className="mt-8 p-5 bg-green-50 border border-green-100 rounded-[2rem] flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-200 shrink-0">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-green-900">แนบสลิปสำเร็จแล้ว</p>
                              <p className="text-xs font-medium text-green-700/80">รอยืนยันการชำระเงินจากร้านค้า</p>
                            </div>
                            <a href={order.payment_slip_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-green-700 text-sm font-bold rounded-xl border border-green-200 hover:bg-green-100 transition-colors shrink-0 whitespace-nowrap">
                              <ImageIcon className="w-4 h-4" /> ดูสลิป
                            </a>
                          </div>
                        )}
                        
                        {order.adminNotes && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl max-w-md">
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">โน้ตจากแอดมิน</p>
                            <p className="text-sm text-blue-700">{order.adminNotes}</p>
                          </div>
                        )}
                      </div>
                      <button className="text-sm font-bold text-orange-500 hover:text-orange-600 underline underline-offset-4">
                        ดูรายละเอียดเพิ่มเติม
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] p-20 text-center border border-orange-100">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-orange-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">คุณยังไม่มีประวัติการสั่งซื้อ</h3>
          <p className="text-gray-500">เริ่มสั่งอาหารมื้อแรกของคุณได้เลย!</p>
        </div>
      )}
    </div>
  );
}
