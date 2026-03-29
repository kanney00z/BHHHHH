import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus, CartItem, MenuItem, OrderType } from '../types';
import { supabase } from '../lib/supabase';

interface OrderCustomer {
  name: string;
  phone: string;
  address?: string; // Optional for dine_in/takeaway
  paymentMethod: 'cash' | 'promptpay' | 'card';
  paymentSlipUrl?: string;
  orderType: OrderType;
  pickupTime?: string;
  deliveryFee?: number;
  promoCode?: string;
  discountAmount?: number;
}

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (items: CartItem[], total: number, customer: OrderCustomer) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateOrderDetails: (orderId: string, updates: Partial<Order>, itemsUpdates?: { menu_item_id: string; custom_name?: string; price_at_time: number; quantity: number; selected_options?: any[]; note?: string }[]) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  getOrder: (orderId: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price_at_time,
            custom_name,
            selected_options,
            menu_items (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedOrders: Order[] = (data || []).map((o: any) => {
        const orderItems = o.order_items.map((oi: any) => {
          const mItem = oi.menu_items || {};
          return {
            menuItem: {
              id: mItem.id || 'unknown',
              name: mItem.name || 'Unknown Item',
              description: mItem.description || '',
              price: oi.price_at_time !== undefined ? oi.price_at_time : (mItem.price || 0),
              image: mItem.image || '',
              categoryId: mItem.category || '',
              available: mItem.isAvailable || false,
              popular: mItem.isPopular || false,
              spicy: false,
            } as MenuItem,
            quantity: oi.quantity,
            note: oi.note || undefined,
            customName: oi.custom_name,
            selectedOptions: oi.selected_options || [],
          };
        });

        return {
          id: o.id,
          queueNumber: o.queue_number,
          items: orderItems,
          total: parseFloat(o.total),
          status: o.status as OrderStatus,
          orderType: o.order_type || 'delivery',
          pickupTime: o.pickup_time || undefined,
          customerName: o.customerName || '',
          customerPhone: o.phone || '',
          customerAddress: o.address || '',
          paymentMethod: o.paymentMethod as any,
          paymentSlipUrl: o.payment_slip_url || undefined,
          promoCode: o.promo_code || undefined,
          discountAmount: parseFloat(o.discount_amount) || 0,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        };
      });

      setOrders(mappedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const addOrder = useCallback(async (items: CartItem[], total: number, customer: OrderCustomer) => {
    const orderId = `order-${Date.now()}`;
    const deliveryFee = customer.deliveryFee || 0;
    const subtotal = total - deliveryFee;

    // Calculate queue number for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday.toISOString());

    const queueNumber = (count || 0) + 1;

    // 1. Insert Order
    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      customerName: customer.name,
      phone: customer.phone,
      address: customer.address || null,
      paymentMethod: customer.paymentMethod,
      payment_slip_url: customer.paymentSlipUrl || null,
      status: 'pending',
      subtotal,
      deliveryFee: deliveryFee, // Old column requiring NOT NULL
      delivery_fee: deliveryFee, // New column added recently
      total,
      queue_number: queueNumber,
      order_type: customer.orderType,
      pickup_time: customer.pickupTime || null,
      promo_code: customer.promoCode || null,
      discount_amount: customer.discountAmount || 0,
    });

    if (orderError) throw orderError;

    // 2. Insert Order Items
    const orderItemsData = items.map(item => ({
      order_id: orderId,
      menu_item_id: item.menuItem.id,
      quantity: item.quantity,
      price_at_time: item.menuItem.price,
      custom_name: null,
      selected_options: item.selectedOptions || [],
      note: item.note || null,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData);
    if (itemsError) throw itemsError;

    fetchOrders(); // Let realtime or direct fetch sync it
    
    // Fast local update
    const newOrder: Order = {
      id: orderId,
      queueNumber,
      items,
      total,
      deliveryFee,
      status: 'pending',
      orderType: customer.orderType,
      pickupTime: customer.pickupTime,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      paymentMethod: customer.paymentMethod,
      paymentSlipUrl: customer.paymentSlipUrl,
      promoCode: customer.promoCode,
      discountAmount: customer.discountAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setOrders(prev => [newOrder, ...prev]);

    // Trigger LINE Notify
    supabase.functions.invoke('line-notify', {
      body: newOrder
    }).catch(err => console.error('Failed to trigger LINE Notify:', err));

    return newOrder;
  }, [fetchOrders]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o));
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) fetchOrders();
  }, [fetchOrders]);

  const updateOrderDetails = useCallback(async (
    orderId: string, 
    updates: Partial<Order>, 
    itemsUpdates?: { menu_item_id: string; custom_name?: string; price_at_time: number; quantity: number; selected_options?: any[]; note?: string }[]
  ) => {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.customerName !== undefined) dbUpdates.customerName = updates.customerName;
    if (updates.customerPhone !== undefined) dbUpdates.phone = updates.customerPhone;
    if (updates.customerAddress !== undefined) dbUpdates.address = updates.customerAddress;
    if (updates.total !== undefined) dbUpdates.total = updates.total;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    await supabase.from('orders').update(dbUpdates).eq('id', orderId);

    if (itemsUpdates && itemsUpdates.length > 0) {
      // Simplest way: delete existing items for this order and re-insert 
      // since dealing with UPSERT without a dedicated PK per item is tricky
      await supabase.from('order_items').delete().eq('order_id', orderId);
      
      const newItems = itemsUpdates.map(item => ({
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price_at_time: item.price_at_time,
        custom_name: item.custom_name || null,
        selected_options: item.selected_options || [],
        note: item.note || null,
      }));
      
      await supabase.from('order_items').insert(newItems);
    }

    fetchOrders();
  }, [fetchOrders]);

  const deleteOrder = useCallback(async (orderId: string) => {
    // Delete order_items first to avoid foreign key violation
    const { error: itemsError } = await supabase.from('order_items').delete().eq('order_id', orderId);
    if (itemsError) {
      console.error('Error deleting order items:', itemsError);
      return;
    }

    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) {
      console.error('Error deleting order:', error);
    } else {
      setOrders(prev => prev.filter(o => o.id !== orderId));
    }
  }, []);

  const getOrder = useCallback((orderId: string) => {
    return orders.find(o => o.id === orderId);
  }, [orders]);

  return (
    <OrderContext.Provider value={{ orders, loading, addOrder, updateOrderStatus, updateOrderDetails, deleteOrder, getOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrders must be used within OrderProvider');
  return ctx;
}
