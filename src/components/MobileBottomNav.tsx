import { Link, useLocation } from 'react-router-dom';
import { ChefHat, ShoppingCart, ReceiptText, Settings } from 'lucide-react';
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

  return (
    <div className="mobile-bottom-nav">
      {!isAdmin ? (
        <>
          <Link to="/" className={`tab-item ${location.pathname === '/' ? 'active' : ''}`}>
            <ChefHat size={22} />
            <span>เมนู</span>
          </Link>
          
          <button className="tab-item" onClick={onReceiptOpen}>
            <ReceiptText size={22} />
            <span>บิลของฉัน</span>
          </button>

          <button className="tab-item cart-tab" onClick={onCartOpen}>
            <div className="icon-wrapper">
              <ShoppingCart size={22} />
              {totalItems > 0 && <span className="tab-badge">{totalItems}</span>}
            </div>
            <span>ตะกร้า</span>
          </button>
          

        </>
      ) : (
        <>
          <Link to="/" className="tab-item">
            <ChefHat size={22} />
            <span>กลับหน้าร้าน</span>
          </Link>
          <Link to="/admin" className={`tab-item ${location.pathname === '/admin' ? 'active' : ''}`}>
            <Settings size={22} />
            <span>แดชบอร์ด</span>
          </Link>
        </>
      )}
    </div>
  );
}
