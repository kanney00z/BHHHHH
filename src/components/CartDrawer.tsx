import { X, Minus, Plus, ShoppingBag, Trash2, ImageIcon } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, totalPrice, totalItems } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      <div className={`cart-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`cart-drawer ${open ? 'open' : ''}`}>
        <div className="cart-drawer-header">
          <h2><ShoppingBag size={20} /> ตะกร้า ({totalItems})</h2>
          <button className="cart-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="cart-drawer-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={64} />
              <p>ตะกร้าว่างเปล่า</p>
              <p style={{ fontSize: '0.85rem', marginTop: 8 }}>เลือกเมนูโปรดของคุณเลย!</p>
            </div>
          ) : (
            items.map(item => {
              const optPrice = (item.selectedOptions || []).reduce((sum, o) => sum + (o.price || 0), 0);
              const unitPrice = item.menuItem.price + optPrice;
              return (
                <div className="cart-item" key={item.cartItemId}>
                <div style={{ flexShrink: 0 }}>
                  {item.menuItem.image ? (
                    <img className="cart-item-image" src={item.menuItem.image} alt={item.menuItem.name} />
                  ) : (
                    <div className="cart-item-image" style={{ background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <ImageIcon size={24} opacity={0.5} />
                    </div>
                  )}
                </div>
                  <div className="cart-item-info">
                    <h4>{item.menuItem.name}</h4>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {item.selectedOptions.map((opt, i) => (
                          <span key={i} style={{ background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: 4 }}>
                            {opt.choiceName} {opt.price > 0 && `(+฿${opt.price})`}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.note && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginBottom: 4 }}>
                        📝 หมายเหตุ: {item.note}
                      </div>
                    )}
                    <span className="cart-item-price">฿{unitPrice * item.quantity}</span>
                    <div className="cart-item-controls">
                      <button className="qty-btn" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}>
                        <Minus size={14} />
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}>
                        <Plus size={14} />
                      </button>
                      <button className="cart-item-remove" onClick={() => removeItem(item.cartItemId)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-total">
              <span>รวมทั้งหมด</span>
              <span className="price">฿{totalPrice}</span>
            </div>
            <button className="checkout-btn" onClick={handleCheckout}>
              <ShoppingBag size={18} />
              สั่งเลย
            </button>
          </div>
        )}
      </div>
    </>
  );
}
