import { supabase } from '../lib/supabase';
import { MenuItem } from '../types';

export const generateMockOrders = async (menuItems: MenuItem[], numOrders: number = 20) => {
  if (!menuItems || menuItems.length === 0) {
    throw new Error("No menu items available to generate orders.");
  }

  const currentDate = new Date();
  const statuses = ['delivered', 'completed', 'cancelled', 'preparing', 'delivering', 'confirmed'];
  
  // Weights to make completed/delivered more common for historical data
  const statusWeights = [40, 40, 5, 5, 5, 5]; 
  
  const randomStatus = () => {
    let rand = Math.random() * 100;
    let sum = 0;
    for (let i = 0; i < statuses.length; i++) {
        sum += statusWeights[i];
        if (rand <= sum) return statuses[i];
    }
    return 'completed';
  };

  const paymentMethods = ['cash', 'promptpay', 'card'];
  
  let newOrders = [];
  let newOrderItems = [];

  for (let i = 0; i < numOrders; i++) {
     // Generate date within the last 7 days
    const pastDays = Math.floor(Math.random() * 7);
    const orderDate = new Date(currentDate);
    orderDate.setDate(orderDate.getDate() - pastDays);
    // Randomize time
    orderDate.setHours(Math.floor(Math.random() * 12) + 9); // 9am - 8pm
    orderDate.setMinutes(Math.floor(Math.random() * 60));
    
    // Create Order
    const orderId = `order-mock-${Date.now()}-${i}`;
    const status = randomStatus();
    const orderType = Math.random() > 0.5 ? 'dine_in' : 'delivery';
    const tableNumber = orderType === 'dine_in' ? String(Math.floor(Math.random() * 10) + 1) : null;
    
    // Pick 1-4 random menu items
    const numItems = Math.floor(Math.random() * 4) + 1;
    let subtotal = 0;
    
    for (let j = 0; j < numItems; j++) {
      const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const priceAtTime = randomItem.price;
      subtotal += priceAtTime * quantity;
      
      newOrderItems.push({
        order_id: orderId,
        menu_item_id: randomItem.id,
        quantity: quantity,
        price_at_time: priceAtTime,
        selected_options: [] // Simple mock without options
      });
    }

    const deliveryFee = orderType === 'delivery' ? 15 : 0;
    const total = subtotal + deliveryFee;

    newOrders.push({
      id: orderId,
      customerName: `ลูกค้า ${Math.floor(Math.random() * 1000)}`,
      phone: `08${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      address: orderType === 'delivery' ? 'ที่อยู่จำลอง สำหรับจัดส่ง' : null,
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      status: status,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      total: total,
      created_at: orderDate.toISOString(),
      updated_at: orderDate.toISOString(),
      order_type: orderType,
      table_number: tableNumber
    });
  }

  // Insert to DB
  console.log(`Inserting ${newOrders.length} orders...`);
  const { error: ordersError } = await supabase.from('orders').insert(newOrders);
  if (ordersError) throw ordersError;

  console.log(`Inserting ${newOrderItems.length} order items...`);
  const { error: itemsError } = await supabase.from('order_items').insert(newOrderItems);
  if (itemsError) throw itemsError;

  return newOrders.length;
};
