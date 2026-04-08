import { useState, useEffect } from 'react';
import { ArrowRight, Search, Clock, Phone, ChefHat, Tag, MapPin, Store, Navigation } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMenu } from '../context/MenuContext';
import { useSettings } from '../context/SettingsContext';
import { MenuItem, Banner } from '../types';
import FoodCard from '../components/FoodCard';
import MenuItemModal from '../components/MenuItemModal';
import CustomOrderModal from '../components/CustomOrderModal';
import { MagicCard } from '../components/magicui/MagicCard';
import { Marquee } from '../components/magicui/Marquee';
import { Meteors } from '../components/magicui/Meteors';
import { ShimmerButton } from '../components/magicui/ShimmerButton';
import BannerCarousel from '../components/BannerCarousel';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  const { menuItems, categories } = useMenu();
  const { settings } = useSettings();
  const [activeCat, setActiveCat] = useState('cat-1');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);

  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Preserve table search param
    const tableParam = searchParams.get('table');
    if (tableParam) {
      sessionStorage.setItem('restaurant_table_number', tableParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (data) {
          setBanners(data);
        }
      } catch (err) {
        console.error('Error fetching banners:', err);
      }
    };
    fetchBanners();

    // Subscribe to real-time changes
    const bannersSubscription = supabase
      .channel('public:banners:homepage')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
        // Refetch active banners when table changes (insert, update, delete)
        fetchBanners();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bannersSubscription);
    };
  }, []);

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
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(185, 28, 28, 0.98) 100%)', 
          backdropFilter: 'blur(12px)',
          color: '#fff', 
          padding: '14px 20px', 
          textAlign: 'center', 
          fontWeight: 600, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '12px',
          boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          zIndex: 10
        }}>
          <Clock size={22} color="rgba(255,255,255,0.9)" className="animate-pulse" />
          <span>
            ขณะนี้อยู่นอกเวลาทำการ 
            <span style={{ opacity: 0.8, fontWeight: 400, margin: '0 6px' }}>({settings?.opening_time} - {settings?.closing_time} น.)</span> 
            งดรับออเดอร์ชั่วคราว
          </span>
        </div>
      )}
      <div className="page-container">
        {banners.length > 0 ? (
          <div style={{ marginBottom: '24px' }}>
            <BannerCarousel banners={banners} />
          </div>
        ) : null}

        {/* Hero */}
        <motion.section 
          className="hero overflow-hidden relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <Meteors number={20} />
          <div className="hero-content" style={{ position: 'relative' }}>
            {/* Aceternity Style Background Glow */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '150%', height: '150%', background: 'radial-gradient(circle, rgba(255,45,85,0.08) 0%, rgba(255,45,85,0) 70%)', zIndex: -1, pointerEvents: 'none' }} />
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-glass)', padding: '8px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }}></div>
              ยกระดับประสบการณ์การกิน
            </motion.div>
            
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

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
              <a href="#menu" style={{ textDecoration: 'none' }}>
                <ShimmerButton shimmerColor="rgba(255, 45, 85, 0.8)" background="var(--text-primary)">
                  <span className="flex items-center gap-2 font-semibold">
                    ดูเมนู <ArrowRight size={18} />
                  </span>
                </ShimmerButton>
              </a>
            </div>
          </div>
        </motion.section>

        {/* Marquee Promotion Bar (Magic UI Premium) */}
        {settings?.promo_banner_active && settings.promo_banner_text && (
          <div style={{ padding: '0 20px', maxWidth: '800px', margin: '0 auto 32px' }}>
            <div style={{
              background: 'linear-gradient(90deg, rgba(255, 45, 85, 0.08), rgba(255, 149, 0, 0.08))',
              border: '1px solid rgba(255, 45, 85, 0.2)',
              borderRadius: '100px',
              padding: '6px 16px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 16px rgba(255, 45, 85, 0.08)',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ 
                background: 'linear-gradient(135deg, var(--accent), #ff4b2b)', 
                color: 'white', 
                borderRadius: '50%', 
                width: '32px', 
                height: '32px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginRight: '12px',
                flexShrink: 0,
                boxShadow: '0 2px 8px var(--accent-glow)'
              }}>
                <Tag size={16} />
              </div>
              <Marquee speed={35} className="promo-marquee" items={
                settings.promo_banner_text.split('|').map((text, index) => (
                  <span key={index} style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                    {text.trim()}
                    <span style={{ color: 'var(--accent)', opacity: 0.5, margin: '0 16px' }}>•</span>
                  </span>
                ))
              } />
            </div>
          </div>
        )}

        {/* Search */}
        <div id="menu" style={{ padding: '0 20px 32px', maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
          <motion.div 
            className="search-box-magic"
            whileFocus={{ scale: 1.03 }}
            style={{ 
              position: 'relative', 
              display: 'flex', 
              alignItems: 'center', 
              background: 'var(--bg-glass)', 
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '100px',
              border: '1px solid var(--bg-glass-border)',
              padding: '16px 24px',
              boxShadow: 'var(--shadow-glass), inset 0 1px 0 rgba(255,255,255,0.6)',
              transition: 'all 0.3s ease',
              overflow: 'hidden'
            }}
          >
            <div className="search-glow" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,45,85,0.05), transparent)', opacity: 0, transition: 'opacity 0.3s' }} />
            <Search size={20} color="var(--accent)" style={{ marginRight: '16px' }} />
            <input
              type="text"
              placeholder="ค้นหาเมนูที่ชอบ... (เช่น ต้มยำ, เย็นตาโฟ)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ 
                flex: 1, 
                border: 'none', 
                background: 'transparent', 
                fontSize: '1.1rem', 
                color: 'var(--text-primary)', 
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.parentElement!.style.border = '1px solid rgba(255,45,85,0.4)';
                e.currentTarget.parentElement!.style.boxShadow = '0 8px 32px rgba(255,45,85,0.1)';
                (e.currentTarget.previousElementSibling as HTMLElement).style.opacity = '1';
              }}
              onBlur={(e) => {
                e.currentTarget.parentElement!.style.border = '1px solid var(--border)';
                e.currentTarget.parentElement!.style.boxShadow = '0 8px 32px rgba(0,0,0,0.04)';
                (e.currentTarget.previousElementSibling as HTMLElement).style.opacity = '0';
              }}
            />
          </motion.div>
        </div>

        {/* Categories */}
        <section className="categories-section">
          <div style={{ padding: '0 20px 20px', maxWidth: '800px', margin: '0 auto' }}>
            <MagicCard 
              glowColor="rgba(255, 45, 85, 0.4)" 
              onClick={() => setIsCustomModalOpen(true)}
              className="custom-menu-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ background: 'var(--accent)', color: 'white', padding: '12px', borderRadius: '50%', boxShadow: '0 4px 12px var(--accent-glow)' }}>
                  <ChefHat size={28} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>สั่งเมนูตามใจฉัน</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>ให้ทางร้านอัปเดตราคาให้ตามจริง</p>
                </div>
              </div>
            </MagicCard>
          </div>

          <div className="category-tabs">
            {categories.filter(c => c.is_active !== false).map(cat => (
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
