import { useState, useRef, MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Plus, Check, ImageIcon } from 'lucide-react';
import { MenuItem } from '../types';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { MagicCard } from './magicui/MagicCard';

interface FoodCardProps {
  item: MenuItem;
  onAddClick?: (item: MenuItem) => void;
  disabled?: boolean;
}

export default function FoodCard({ item, onAddClick, disabled = false }: FoodCardProps) {
  const { addItem } = useCart();
  const { language, t } = useLanguage();
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

  const isUnavailable = !item.available || disabled;

  // 3D Tilt Effect Setup
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isUnavailable || !cardRef.current) return;
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
    <>
    <style>{`
      .sold-out-card {
        filter: grayscale(100%);
        opacity: 0.6;
        cursor: not-allowed;
        transition: all 0.3s ease;
      }
      .sold-out-card .add-to-cart-btn {
        background: var(--bg-hover) !important;
        color: var(--text-muted) !important;
        border-color: var(--bg-glass-border) !important;
      }
      .sold-out-card .food-card-image img {
        filter: brightness(0.8);
      }
      .sold-out-card:hover {
        transform: scale(0.98) !important; /* give it a slight sink effect instead of floating */
        opacity: 0.7;
      }
    `}</style>
    <motion.div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={isUnavailable ? { scale: 0.98 } : { y: -6, scale: 1.02 }}
      whileTap={isUnavailable ? { scale: 0.98 } : { scale: 0.98 }}
      style={{
        rotateX: isUnavailable ? 0 : rotateX,
        rotateY: isUnavailable ? 0 : rotateY,
        transformStyle: "preserve-3d",
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        marginBottom: '16px',
        boxShadow: 'var(--shadow-md)'
      }}
      className={`food-card-wrapper ${isUnavailable ? 'sold-out-card' : ''}`}
    >
      <MagicCard 
        glowColor={isUnavailable ? "rgba(0, 0, 0, 0)" : "rgba(255, 45, 85, 0.15)"}
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
          {item.popular && <span className="badge badge-popular">🔥 {t('ยอดนิยม')}</span>}
          {item.spicy && <span className="badge badge-spicy">🌶️ {t('เผ็ด')}</span>}
          {!item.available && <span className="badge badge-unavailable" style={{ background: '#000', color: '#fff', fontSize: '1rem', padding: '6px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>{t('หมดแล้ว')}</span>}
        </div>
      </div>
      <div className="food-card-body">
        <h3>{language === 'en' && item.nameEn ? item.nameEn : item.name}</h3>
        <p>{language === 'en' && item.descriptionEn ? item.descriptionEn : item.description}</p>
        <div className="food-card-footer">
          <div className="food-price" style={isUnavailable ? { color: 'var(--text-muted)' } : {}}>
            ฿{item.price} <small>บาท</small>
          </div>
          <button
            className={`add-to-cart-btn ${added ? 'added' : ''}`}
            onClick={handleAdd}
            disabled={isUnavailable}
          >
            {added ? <><Check size={16} /> {t('เพิ่มแล้ว')}</> : <><Plus size={16} /> {t('หมด')}</>}
          </button>
        </div>
      </div>
      </MagicCard>
    </motion.div>
    </>
  );
}
