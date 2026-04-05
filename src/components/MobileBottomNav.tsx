import { Link, useLocation } from 'react-router-dom';
import { ChefHat, ShoppingCart, ReceiptText, Settings, LayoutDashboard, UtensilsCrossed, Image, FolderOpen, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface MobileBottomNavProps {
  onCartOpen: () => void;
  onReceiptOpen: () => void;
}

export default function MobileBottomNav({ onCartOpen, onReceiptOpen }: MobileBottomNavProps) {
  const { totalItems } = useCart();
  const location = useLocation();
  const { session } = useAuth();
  
  const isAdmin = location.pathname.startsWith('/admin');
  
  // Hide bottom nav on checkout and tracking pages to prevent overlapping action buttons
  if (location.pathname === '/checkout' || location.pathname.startsWith('/track')) {
    return null;
  }

  return (
    <>
      <style>
        {`
          .mobile-admin-scroll::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
      <motion.div 
        className={isAdmin ? "mobile-bottom-nav-container mobile-admin-scroll" : "mobile-bottom-nav-container"}
        initial={{ y: 100, opacity: 0, x: '-50%' }}
        animate={{ y: 0, opacity: 1, x: '-50%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          width: 'calc(100% - 48px)',
          maxWidth: '500px',
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '100px',
          display: 'flex',
          justifyContent: isAdmin ? 'flex-start' : 'space-around',
          alignItems: 'center',
          padding: '8px 12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.5)',
          zIndex: 5000,
          overflowX: isAdmin ? 'auto' : 'visible',
          gap: isAdmin ? '12px' : '0',
          scrollbarWidth: 'none' /* Firefox */
        }}
      >
      {!isAdmin ? (
        <>
          <Link 
            to="/" 
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '8px 24px', color: location.pathname === '/' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {location.pathname === '/' && (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-glow)', borderRadius: '100px', zIndex: -1 }} />
            )}
            <ChefHat size={22} />
            <span style={{ fontSize: '0.7rem', fontWeight: location.pathname === '/' ? 700 : 500 }}>เมนู</span>
          </Link>
          
          <button 
            onClick={onReceiptOpen}
            style={{ position: 'relative', background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 24px', color: 'var(--text-muted)' }}
          >
            <ReceiptText size={22} />
            <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>บิลของฉัน</span>
          </button>

          <button 
            onClick={onCartOpen}
            style={{ position: 'relative', background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 24px', color: 'var(--text-muted)' }}
          >
            <div style={{ position: 'relative' }}>
              <ShoppingCart size={22} />
              <AnimatePresence>
                {totalItems > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    exit={{ scale: 0 }}
                    style={{ position: 'absolute', top: '-6px', right: '-12px', background: 'var(--accent)', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '100px', border: '2px solid white', zIndex: 10 }}
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>ตะกร้า</span>
          </button>
        </>
      ) : (
        <>
          <Link 
            to="/" 
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '8px', color: 'var(--text-muted)' }}
          >
            <ChefHat size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: 500, whiteSpace: 'nowrap' }}>หน้าร้าน</span>
          </Link>

          <Link 
            to="/admin" 
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '8px', color: location.pathname === '/admin' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {location.pathname === '/admin' && (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-glow)', borderRadius: '100px', zIndex: -1 }} />
            )}
            <LayoutDashboard size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: location.pathname === '/admin' ? 700 : 500, whiteSpace: 'nowrap' }}>หน้าแรก</span>
          </Link>

          <Link 
            to="/admin/orders" 
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '8px', color: location.pathname === '/admin/orders' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {location.pathname === '/admin/orders' && (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-glow)', borderRadius: '100px', zIndex: -1 }} />
            )}
            <ShoppingCart size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: location.pathname === '/admin/orders' ? 700 : 500, whiteSpace: 'nowrap' }}>ออเดอร์</span>
          </Link>

          <Link 
            to="/admin/menu" 
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '8px', color: location.pathname === '/admin/menu' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {location.pathname === '/admin/menu' && (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-glow)', borderRadius: '100px', zIndex: -1 }} />
            )}
            <UtensilsCrossed size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: location.pathname === '/admin/menu' ? 700 : 500, whiteSpace: 'nowrap' }}>เมนู</span>
          </Link>

          <Link 
            to="/admin/categories" 
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '8px', color: location.pathname === '/admin/categories' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {location.pathname === '/admin/categories' && (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-glow)', borderRadius: '100px', zIndex: -1 }} />
            )}
            <FolderOpen size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: location.pathname === '/admin/categories' ? 700 : 500, whiteSpace: 'nowrap' }}>หมวดหมู่</span>
          </Link>

          <Link 
            to="/admin/banners" 
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '8px', color: location.pathname === '/admin/banners' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {location.pathname === '/admin/banners' && (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-glow)', borderRadius: '100px', zIndex: -1 }} />
            )}
            <Image size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: location.pathname === '/admin/banners' ? 700 : 500, whiteSpace: 'nowrap' }}>ตกแต่ง</span>
          </Link>

          <Link 
            to="/admin/promotions" 
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '8px', color: location.pathname === '/admin/promotions' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {location.pathname === '/admin/promotions' && (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-glow)', borderRadius: '100px', zIndex: -1 }} />
            )}
            <Ticket size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: location.pathname === '/admin/promotions' ? 700 : 500, whiteSpace: 'nowrap' }}>ส่วนลด</span>
          </Link>

          <Link 
            to="/admin/settings" 
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '8px', color: location.pathname === '/admin/settings' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {location.pathname === '/admin/settings' && (
              <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-glow)', borderRadius: '100px', zIndex: -1 }} />
            )}
            <Settings size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: location.pathname === '/admin/settings' ? 700 : 500, whiteSpace: 'nowrap' }}>ตั้งค่า</span>
          </Link>
        </>
      )}
      </motion.div>
    </>
  );
}
