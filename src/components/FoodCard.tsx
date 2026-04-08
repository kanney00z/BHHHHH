import { useState, useRef, MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Plus, Check, ImageIcon } from 'lucide-react';
import { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { MagicCard } from './magicui/MagicCard';

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

  // 3D Tilt Effect Setup
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);
  const glareOpacity = useTransform(y, [-0.5, 0.5], [0, 0.15]);
  const glareY = useTransform(y, [-0.5, 0.5], ["0%", "100%"]);
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        marginBottom: '16px',
        boxShadow: 'var(--shadow-md)'
      }}
      className={`food-card-wrapper ${disabled ? 'opacity-50 grayscale' : ''}`}
    >
      <MagicCard 
        glowColor="rgba(255, 45, 85, 0.15)"
        className="food-card-magic-inner"
      >
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
      </MagicCard>
    </motion.div>
  );
}
