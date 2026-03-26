import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, LogOut, LayoutDashboard, UtensilsCrossed, X, Mail, Lock } from 'lucide-react';
import { supabase } from '../supabase';
import { UserProfile } from '../types';
import { toast } from 'sonner';
import { motion } from 'motion/react';

interface NavbarProps {
  user: any;
  profile: UserProfile | null;
}

export default function Navbar({ user, profile }: NavbarProps) {
  const location = useLocation();
  const [shopName, setShopName] = useState('Aroi-D');

  useEffect(() => {
    const fetchShopName = async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'shop_name').single();
      if (data) setShopName(data.value);
    };
    fetchShopName();

    const sub = supabase.channel('navbar_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.shop_name' }, (payload: any) => {
        if (payload.new) setShopName(payload.new.value);
      }).subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error('กรุณากรอกเบอร์โทรศัพท์ให้ครบถ้วน');
      return;
    }

    setLoading(true);
    
    // Create deterministic mock credentials behind the scenes
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const mockEmail = `${cleanPhone}@aroid-mock.com`;
    const mockPassword = `AroiD${cleanPhone}!!`;

    try {
      // 1. Try to login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: mockEmail,
        password: mockPassword,
      });

      if (error) {
        // 2. If login fails, user might be new, try signing up
        const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
          email: mockEmail,
          password: mockPassword,
          options: {
            data: { phone: phoneNumber, full_name: `ลูกค้า ${phoneNumber}` }
          }
        });

        if (signUpError) throw signUpError;
        
        // 3. Re-attempt login to ensure session is set (if auto-confirm is enabled, this skips email confirmation)
        if (!signUpData?.session) {
           const { error: retryError } = await supabase.auth.signInWithPassword({
             email: mockEmail,
             password: mockPassword,
           });
           if (retryError) throw retryError;
        }
      }

      toast.success('เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับครับ');
      setShowAuthModal(false);
      setPhoneNumber('');
    } catch (error: any) {
      console.error('Phone login error:', error);
      toast.error('ระบบปฏิเสธการเข้าสู่ระบบ โปรดเช็คว่าปิด "Confirm Email" ใน Supabase แล้ว');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('ออกจากระบบสำเร็จ');
    } catch (error: any) {
      console.error('Logout failed:', error);
      toast.error('เกิดข้อผิดพลาดในการออกจากระบบ');
    }
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-orange-100">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-orange-500 p-2 rounded-xl group-hover:rotate-12 transition-transform">
            <UtensilsCrossed className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">{shopName}</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors ${location.pathname === '/' ? 'text-orange-500' : 'text-gray-600 hover:text-orange-500'}`}
          >
            เมนูอาหาร
          </Link>
          {user && (
            <Link 
              to="/orders" 
              className={`text-sm font-medium transition-colors ${location.pathname === '/orders' ? 'text-orange-500' : 'text-gray-600 hover:text-orange-500'}`}
            >
              ประวัติการสั่งซื้อ
            </Link>
          )}
          {profile?.role === 'admin' && (
            <Link 
              to="/admin" 
              className={`flex items-center gap-1 text-sm font-medium transition-colors ${location.pathname.startsWith('/admin') ? 'text-orange-500' : 'text-gray-600 hover:text-orange-500'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              จัดการหลังบ้าน
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Link to="/cart" className="relative p-2 hover:bg-orange-50 rounded-full transition-colors group">
            <ShoppingCart className="w-5 h-5 text-gray-600 group-hover:text-orange-500" />
            {/* Cart count could be added here with state */}
          </Link>

          {user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium text-gray-900">{user.user_metadata?.name || user.email}</p>
                <p className="text-[10px] text-gray-500">{user.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 rounded-full transition-colors text-gray-400 hover:text-red-500"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
            >
              <User className="w-4 h-4" />
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto relative"
          >
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-8 pb-10">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">เข้าสู่ระบบ</h2>
                <p className="text-gray-500">ใช้เบอร์โทรศัพท์ของคุณเพื่อสั่งอาหารได้เลย!</p>
              </div>

              <form onSubmit={handlePhoneLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">เบอร์โทรศัพท์</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    <input 
                      type="tel" 
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      placeholder="08X-XXX-XXXX"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'เข้าสู่ระบบ / สมัครสมาชิกทันที'
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 text-center text-xs text-gray-400">
                <p>การเข้าสู่ระบบหมายความว่าคุณยอมรับ</p>
                <p>เงื่อนไขการให้บริการ และ นโยบายความเป็นส่วนตัว ของเรา</p>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </nav>
  );
}
