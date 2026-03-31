import { useState } from 'react';
import { ArrowRight, Search, Clock, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMenu } from '../context/MenuContext';
import { useSettings } from '../context/SettingsContext';
import { MenuItem } from '../types';
import FoodCard from '../components/FoodCard';
import MenuItemModal from '../components/MenuItemModal';
import CustomOrderModal from '../components/CustomOrderModal';
import { ChefHat } from 'lucide-react';

export default function HomePage() {
  const { menuItems, categories } = useMenu();
  const { settings } = useSettings();
  const [activeCat, setActiveCat] = useState('cat-1');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const checkIsStoreOpen = () => {
    if (!settings?.auto_close_enabled || !settings.opening_time || !settings.closing_time) return true;
    
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeMinutes = currentHours * 60 + currentMinutes;
    
    const [openH, openM] = settings.opening_time.split(':').map(Number);
    const openTimeMinutes = openH * 60 + openM;
    
    const [closeH, closeM] = settings.closing_time.split(':').map(Number);
    const closeTimeMinutes = closeH * 60 + closeM;
    
    if (closeTimeMinutes < openTimeMinutes) {
      // Over midnight case
      return currentTimeMinutes >= openTimeMinutes || currentTimeMinutes <= closeTimeMinutes;
    } else {
      return currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes;
    }
  };

  const isStoreOpen = checkIsStoreOpen();

  const handleAddClick = (item: MenuItem) => {
    if (item.options && item.options.length > 0) {
      setSelectedItem(item);
    } else {
      // It will just be added by FoodCard if no onAddClick is passed,
      // but since we override onAddClick we should handle direct adding here if we want.
      // Wait, FoodCard handles direct if onAddClick doesn't do anything or we don't pass it.
      // Actually we DO pass it, so let's check `item.options.length`. If 0, we shouldn't show modal.
      // Better to let FoodCard do it. 
      // Inside FoodCard we check if `onAddClick` is passed, it WILL call it. So we must add it here!
    }
  };

  const filtered = menuItems.filter(item => {
    const matchCat = activeCat === 'cat-1' || item.categoryId === activeCat;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                        item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="main-content">
      {settings?.promo_banner_active && (
        <div style={{ background: 'linear-gradient(90deg, #ff416c 0%, #ff4b2b 100%)', color: '#fff', padding: '12px 20px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(255, 75, 43, 0.3)', position: 'relative', zIndex: 10 }}>
          ✨ {settings.promo_banner_text}
        </div>
      )}
      {!isStoreOpen && (
        <div style={{ background: '#ef4444', color: '#fff', padding: '16px 20px', textAlign: 'center', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Clock size={18} /> ขณะนี้อยู่นอกเวลาทำการ ({settings?.opening_time} - {settings?.closing_time} น.) งดรับออเดอร์ชั่วคราว
        </div>
      )}
      <div className="page-container">
        {/* Hero */}
        <motion.section 
          className="hero"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hero-content">
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              {settings?.hero_headline || 'ยกระดับความล้ำ'} <span className="highlight">{settings?.hero_highlight || 'จัดส่งถึงบ้าน'}</span>
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {settings?.hero_subheadline || 'สั่งง่าย อร่อยเร็ว เลือกจากเมนูหลากหลาย จัดส่งฟรีทุกออเดอร์ด้วยระบบที่ล้ำกว่าเดิม'}
            </motion.p>
            
            {settings?.contact_phone && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                <a href={`tel:${settings.contact_phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-glass)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '100px', fontWeight: 'bold', textDecoration: 'none', border: '1px solid var(--border)' }}>
                  <Phone size={16} color="var(--accent)" /> {settings.contact_phone}
                </a>
              </motion.div>
            )}

            <motion.a 
              href="#menu" 
              className="hero-cta"
              style={{ marginTop: '24px' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ดูเมนู <ArrowRight size={18} />
            </motion.a>
          </div>
        </motion.section>

        {/* Search */}
        <div className="search-box" id="menu">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="ค้นหาเมนูที่ชอบ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Categories */}
        <section className="categories-section">
          <div style={{ padding: '0 20px 20px', maxWidth: '800px', margin: '0 auto' }}>
            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1.1rem', background: 'linear-gradient(45deg, var(--accent), #ff4b2b)', border: 'none', boxShadow: '0 8px 24px rgba(255,107,107,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => setIsCustomModalOpen(true)}
            >
              <ChefHat size={24} /> สั่งเมนูตามใจฉัน (ให้ร้านประเมินราคา)
            </button>
          </div>

          <div className="category-tabs">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-tab ${activeCat === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCat(cat.id)}
              >
                <span className="cat-icon">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </section>

        {/* Food Grid */}
        <section>
          <h2 className="section-title">
            {activeCat === 'cat-1' ? '🍽️ เมนูทั้งหมด' : categories.find(c => c.id === activeCat)?.icon + ' ' + categories.find(c => c.id === activeCat)?.name}
          </h2>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</p>
              <p>ไม่พบเมนูที่ค้นหา</p>
            </div>
          ) : (
            <motion.div 
              className="food-grid"
              variants={containerVars}
              initial="hidden"
              animate="show"
            >
              {filtered.map(item => (
                <motion.div key={item.id} variants={itemVars}>
                  <FoodCard 
                    item={item} 
                    onAddClick={item.options && item.options.length > 0 ? () => setSelectedItem(item) : undefined} 
                    disabled={!isStoreOpen}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </div>
      
      {selectedItem && (
        <MenuItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      <CustomOrderModal 
        isOpen={isCustomModalOpen} 
        onClose={() => setIsCustomModalOpen(false)} 
      />
    </div>
  );
}
