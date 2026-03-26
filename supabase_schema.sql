-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to Firebase Auth UID)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, -- Firebase UID
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Food Items Table
CREATE TABLE IF NOT EXISTS food_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  image TEXT,
  category TEXT REFERENCES categories(name) ON UPDATE CASCADE,
  category_en TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT REFERENCES profiles(id),
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'delivered', 'cancelled')),
  admin_notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Order Items Table (Relational)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES food_items(id) ON DELETE SET NULL,
  name TEXT, -- Store name at time of order or edited name
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS POLICIES (Development Mode: Public Access) --
-- Note: In production, you should switch to Supabase Auth and use auth.uid() checks.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles access" ON profiles;
CREATE POLICY "Public profiles access" ON profiles FOR ALL USING (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public categories access" ON categories;
CREATE POLICY "Public categories access" ON categories FOR ALL USING (true);

ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public food items access" ON food_items;
CREATE POLICY "Public food items access" ON food_items FOR ALL USING (true);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public orders access" ON orders;
CREATE POLICY "Public orders access" ON orders FOR ALL USING (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public order items access" ON order_items;
CREATE POLICY "Public order items access" ON order_items FOR ALL USING (true);

-- SEED DATA --

-- Categories
INSERT INTO categories (name) VALUES 
('อาหารจานเดียว'),
('กับข้าว'),
('เครื่องดื่ม'),
('ของหวาน')
ON CONFLICT (name) DO NOTHING;

-- Food Items
INSERT INTO food_items (name, description, price, category, image) VALUES 
('ข้าวกะเพราไก่ไข่ดาว', 'กะเพราไก่รสเด็ด เสิร์ฟพร้อมไข่ดาวกรอบๆ', 65, 'อาหารจานเดียว', 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&q=80&w=800'),
('ข้าวผัดปู', 'ข้าวผัดปูเนื้อแน่น หอมกลิ่นกระทะ', 85, 'อาหารจานเดียว', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&q=80&w=800'),
('ต้มยำกุ้งน้ำข้น', 'ต้มยำกุ้งรสแซ่บ เครื่องเน้นๆ', 150, 'กับข้าว', 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&q=80&w=800'),
('ชาไทยเย็น', 'ชาไทยหอมหวาน มันกำลังดี', 45, 'เครื่องดื่ม', 'https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?auto=format&fit=crop&q=80&w=800'),
('ข้าวเหนียวมะม่วง', 'มะม่วงน้ำดอกไม้หวานฉ่ำ กับข้าวเหนียวมูนกะทิสด', 120, 'ของหวาน', 'https://images.unsplash.com/photo-1590005354167-6da97870c757?auto=format&fit=crop&q=80&w=800')
ON CONFLICT DO NOTHING;

-- 9. Create Settings Table for global shop configurations
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default shop name
INSERT INTO public.settings (key, value) 
VALUES ('shop_name', 'Aroi-D') 
ON CONFLICT (key) DO NOTHING;

-- Allow public read access and authenticated edit access to settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings are viewable by everyone." ON public.settings;
CREATE POLICY "Settings are viewable by everyone." 
ON public.settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can update settings." ON public.settings;
CREATE POLICY "Authenticated users can update settings." 
ON public.settings FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert settings." ON public.settings;
CREATE POLICY "Authenticated users can insert settings." 
ON public.settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 10. Enable Realtime functionality for all application tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE food_items;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- 11. Auto-Confirm Users Trigger (Bypasses the "Confirm Email" requirement)
CREATE OR REPLACE FUNCTION public.auto_confirm_users()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = now();
  NEW.confirmed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_users();

-- ==========================================
-- 11.5 ALTER TABLES FOR ENGLISH SUPPORT
-- ==========================================
ALTER TABLE public.food_items 
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS category_en TEXT;

-- ==========================================
-- 12. CLEAN UP OLD MOCK EMAILS FROM PROFILES
-- ==========================================
UPDATE public.profiles 
SET email = REPLACE(email, '@aroid-mock.com', '') 
WHERE email LIKE '%@aroid-mock.com';


-- ==========================================
-- 13. PROMPTPAY & PAYMENT SLIPS EXTENSION --
-- ==========================================

-- Add column for payment slip URL
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_slip_url TEXT;

-- Create Storage Bucket for Payment Slips (public access enabled)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment_slips', 'payment_slips', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for the payment_slips bucket
DROP POLICY IF EXISTS "Public Access to Slips" ON storage.objects;
CREATE POLICY "Public Access to Slips" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'payment_slips' );

DROP POLICY IF EXISTS "Authenticated users can upload slips" ON storage.objects;
CREATE POLICY "Authenticated users can upload slips" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'payment_slips' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Admin can update/delete slips"  ON storage.objects;
CREATE POLICY "Admin can update/delete slips"
ON storage.objects FOR DELETE
USING ( bucket_id = 'payment_slips' AND auth.uid()::text IN (SELECT id FROM profiles WHERE role = 'admin') );
