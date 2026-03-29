import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://umyidwrjjzlntteebzib.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVteWlkd3JqanpsbnR0ZWViemliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzA2MDksImV4cCI6MjA4OTk0NjYwOX0.igJD19m9xpJUTQJrGGz1Faq6GBjuYS4SEn-dx59xD2k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
  const orderId = 'order-1774627624699';
  console.log("Deleting order items...");
  const res1 = await supabase.from('order_items').delete().eq('order_id', orderId).select();
  console.log("Res1 Data length:", res1.data?.length, "Error:", res1.error);
  
  console.log("Deleting order...");
  const res2 = await supabase.from('orders').delete().eq('id', orderId).select();
  console.log("Res2 Data length:", res2.data?.length, "Error:", res2.error);
}

testDelete();
