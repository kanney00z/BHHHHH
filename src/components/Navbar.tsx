import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, ChefHat, Settings, ReceiptText } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { useSettings } from '../context/SettingsContext';
import Modal from './Modal';
import MobileBottomNav from './MobileBottomNav';

interface NavbarProps {
  onCartOpen: () => void;
}

export default function Navbar({ onCartOpen }: NavbarProps) {
  const { totalItems } = useCart();
  const { orders } = useOrders();
  const { settings } = useSettings();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const [showHistory, setShowHistory] = useState(false);
  const [myOrderIds, setMyOrderIds] = useState<string[]>([]);

  useEffect(() => {
    if (showHistory) {
      const history = JSON.parse(localStorage.getItem('yumdash_order_history') || '[]');
      setMyOrderIds(history);
    }
  }, [showHistory]);

  const myOrders = myOrderIds.map(id => orders.find(o => o.id === id)).filter(Boolean);

  return (
    <>
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <span>🔥</span> {settings?.restaurant_name || 'YumDash'}
      </Link>
      <div className="navbar-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          <ChefHat size={18} /> เมนู
        </Link>
        {isAdmin && (
          <Link to="/" className="">
            🏠 หน้าร้าน
          </Link>
        )}
        {!isAdmin && (
          <div className="desktop-nav-only" style={{ display: 'flex', gap: 8 }}>
            <button className="cart-btn" onClick={() => setShowHistory(true)} style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <ReceiptText size={18} /> บิลของฉัน
            </button>
            <button className="cart-btn" onClick={onCartOpen}>
              <ShoppingCart size={18} />
              ตะกร้า
              {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
            </button>
          </div>
        )}
      </div>

    </nav>
    <MobileBottomNav onCartOpen={onCartOpen} onReceiptOpen={() => setShowHistory(true)} />

    <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="🧾 ประวัติการสั่งซื้อ (บิลของฉัน)">
      {myOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <ReceiptText size={48} style={{ opacity: 0.5, margin: '0 auto 16px' }} />
          <p>คุณยังไม่มีประวัติการสั่งซื้อในอุปกรณ์นี้</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {myOrders.map((o: any) => (
            <div key={o.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-glass-border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ color: 'var(--accent)' }}>#{o.id.slice(-6)} (คิวที่ {o.queueNumber})</strong>
                <span className={`status-badge ${o.status}`}>{o.status === 'pending' ? 'รอยืนยัน' : o.status === 'confirmed' ? 'ยืนยันแล้ว' : o.status === 'preparing' ? 'กำลังเตรียม' : o.status === 'delivering' ? 'กำลังจัดส่ง' : o.status === 'delivered' ? 'จัดส่งแล้ว' : 'ยกเลิก'}</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                ยอดรวม: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>฿{o.total}</span>
                <span style={{ float: 'right' }}>
                  <Link to={`/track/${o.id}`} onClick={() => setShowHistory(false)} style={{ color: 'var(--info)', textDecoration: 'underline' }}>
                    ติดตามออเดอร์
                  </Link>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
    </>
  );
}
