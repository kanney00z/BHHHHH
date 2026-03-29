import { useState } from 'react';
import { Plus, Check, ImageIcon } from 'lucide-react';
import { MenuItem } from '../types';
import { useCart } from '../context/CartContext';

interface FoodCardProps {
  item: MenuItem;
  onAddClick?: (item: MenuItem) => void;
  disabled?: boolean;
}

export default function FoodCard({ item, onAddClick, disabled = false }: FoodCardProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!item.available || disabled) return;
    if (onAddClick) {
      onAddClick(item);
      return;
    }
    addItem(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  return (
    <div className={`food-card ${disabled ? 'opacity-50 grayscale' : ''}`}>
      <div className="food-card-image">
        {item.image ? (
          <img src={item.image} alt={item.name} loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: 200, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <ImageIcon size={48} opacity={0.5} />
          </div>
        )}
        <div className="food-card-badges">
          {item.popular && <span className="badge badge-popular">🔥 ยอดนิยม</span>}
          {item.spicy && <span className="badge badge-spicy">🌶️ เผ็ด</span>}
          {!item.available && <span className="badge badge-unavailable">หมด</span>}
        </div>
      </div>
      <div className="food-card-body">
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="food-card-footer">
          <div className="food-price">
            ฿{item.price} <small>บาท</small>
          </div>
          <button
            className={`add-to-cart-btn ${added ? 'added' : ''}`}
            onClick={handleAdd}
            disabled={!item.available || disabled}
          >
            {added ? <><Check size={16} /> เพิ่มแล้ว</> : <><Plus size={16} /> เพิ่ม</>}
          </button>
        </div>
      </div>
    </div>
  );
}
