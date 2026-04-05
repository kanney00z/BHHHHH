import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Banner } from '../../types';
import { ImagePlus, Trash2, ArrowUp, ArrowDown, Power, Link as LinkIcon, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSidebar from '../AdminSidebar';
import Modal from '../Modal';

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteBanner, setConfirmDeleteBanner] = useState<Banner | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBanners(data || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);

      const maxSortOrder = banners.reduce((max, b) => Math.max(max, b.sort_order), -1);

      const { error: insertError } = await supabase
        .from('banners')
        .insert([{
          image_url: publicUrl,
          sort_order: maxSortOrder + 1,
          is_active: true
        }]);

      if (insertError) throw insertError;

      showToast('อัปโหลดแบนเนอร์สำเร็จ', 'success');
      fetchBanners();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;
      
      setBanners(banners.map(b => b.id === banner.id ? { ...b, is_active: !b.is_active } : b));
      showToast('อัปเดตสถานะแบนเนอร์', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const updateLinkUrl = async (banner: Banner, newUrl: string) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ link_url: newUrl })
        .eq('id', banner.id);

      if (error) throw error;
      
      setBanners(banners.map(b => b.id === banner.id ? { ...b, link_url: newUrl } : b));
      showToast('บันทึกลิงก์สำเร็จ', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const deleteBanner = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', banner.id);

      if (error) throw error;
      
      setBanners(banners.filter(b => b.id !== banner.id));
      showToast('ลบแบนเนอร์สำเร็จ', 'success');
      setConfirmDeleteBanner(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const items = [...banners];
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;

    // Update sort_order locally
    const updatedItems = items.map((item, i) => ({ ...item, sort_order: i }));
    setBanners(updatedItems);

    // Save to DB
    for (const item of updatedItems) {
      await supabase.from('banners').update({ sort_order: item.sort_order }).eq('id', item.id);
    }
  };

  const moveDown = async (index: number) => {
    if (index === banners.length - 1) return;
    const items = [...banners];
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;

    // Update sort_order locally
    const updatedItems = items.map((item, i) => ({ ...item, sort_order: i }));
    setBanners(updatedItems);

    // Save to DB
    for (const item of updatedItems) {
      await supabase.from('banners').update({ sort_order: item.sort_order }).eq('id', item.id);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <div style={{ padding: '0 0 24px 0', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header & Upload */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--glass-border-hover)' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            ตกแต่งหน้าร้าน (Storefront Banners)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>จัดการรูปภาพสไลด์บนหน้าแรก เพื่อโปรโมทเมนูหรือโปรโมชั่น</p>
        </div>
        
        <div>
          <label style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 24px',
            fontWeight: 500,
            color: 'white',
            background: 'var(--accent-gradient)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            transition: 'var(--transition-fast)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {uploading ? (
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <ImagePlus size={18} />
              )}
              {uploading ? 'กำลังอัปโหลด...' : 'เพิ่มแบนเนอร์ใหม่'}
            </span>
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div style={{ background: 'rgba(255, 204, 0, 0.1)', color: '#997a00', padding: '16px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', border: '1px solid rgba(255, 204, 0, 0.3)' }}>
        <strong style={{ fontWeight: 600 }}>คำแนะนำ:</strong> เพื่อให้หน้าเว็บดูสวยงามและเป็นมืออาชีพ ควรใช้รูปภาพแนวนอนที่มี <strong>สัดส่วน 16:9</strong> (เช่น กว้าง 1600px สูง 900px) หรือ <strong>2:1</strong> และทุกรูปควรมีสัดส่วนเท่ากันทั้งหมด
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
          <Loader2 style={{ color: 'var(--accent)', width: '32px', height: '32px', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AnimatePresence>
            {banners.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '48px', textAlign: 'center', border: '2px dashed #eaeaea' }}
              >
                <div style={{ background: 'rgba(255, 45, 85, 0.05)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--accent)' }}>
                  <ImagePlus size={28} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>ยังไม่มีแบนเนอร์</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>เพิ่มรูปภาพสไลด์แบนเนอร์ของคุณเดี่ยวนี้</p>
              </motion.div>
            ) : (
              banners.map((banner, index) => (
                <motion.div 
                  key={banner.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '20px',
                    alignItems: 'center',
                    border: banner.is_active ? '1px solid var(--bg-glass-border)' : '1px solid #eaeaea',
                    opacity: banner.is_active ? 1 : 0.6,
                    filter: banner.is_active ? 'none' : 'grayscale(0.3)',
                    boxShadow: banner.is_active ? 'var(--shadow-sm)' : 'none',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      style={{ padding: '6px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? '#ccc' : 'var(--text-secondary)', transition: 'background 0.2s' }}
                      onMouseOver={(e) => { if(index !== 0) e.currentTarget.style.background = '#f5f5f5'; }}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button 
                      onClick={() => moveDown(index)}
                      disabled={index === banners.length - 1}
                      style={{ padding: '6px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: index === banners.length - 1 ? 'not-allowed' : 'pointer', color: index === banners.length - 1 ? '#ccc' : 'var(--text-secondary)', transition: 'background 0.2s' }}
                      onMouseOver={(e) => { if(index !== banners.length - 1) e.currentTarget.style.background = '#f5f5f5'; }}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>

                  <div style={{ width: '100%', maxWidth: '256px', height: '144px', background: '#f5f5f5', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                    <img 
                      src={banner.image_url} 
                      alt="Banner" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {!banner.is_active && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '12px', padding: '6px 12px', borderRadius: '100px', fontWeight: 500 }}>
                          ปิดใช้งาน
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <LinkIcon size={12} /> ลิงก์เป้าหมายเมื่อถูกคลิก (ไม่บังคับ)
                    </label>
                    <input
                      type="url"
                      placeholder="เช่น https://www.facebook.com/your-page"
                      value={banner.link_url || ''}
                      onChange={(e) => updateLinkUrl(banner, e.target.value)}
                      style={{ width: '100%', padding: '10px 16px', border: '1px solid #eaeaea', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', outline: 'none', transition: 'border 0.2s' }}
                      onFocus={(e) => e.currentTarget.style.border = '1px solid var(--accent)'}
                      onBlur={(e) => e.currentTarget.style.border = '1px solid #eaeaea'}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, paddingLeft: '16px', borderLeft: '1px solid #eaeaea' }}>
                    <button
                      onClick={() => toggleActive(banner)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, transition: 'var(--transition-fast)', border: 'none', cursor: 'pointer',
                        background: banner.is_active ? 'rgba(255, 170, 0, 0.1)' : 'rgba(52, 199, 89, 0.1)',
                        color: banner.is_active ? '#cc8800' : 'var(--success)'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = banner.is_active ? 'rgba(255, 170, 0, 0.2)' : 'rgba(52, 199, 89, 0.2)'}
                      onMouseOut={(e) => e.currentTarget.style.background = banner.is_active ? 'rgba(255, 170, 0, 0.1)' : 'rgba(52, 199, 89, 0.1)'}
                    >
                      <Power size={16} />
                      {banner.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </button>
                    
                    <button
                      onClick={() => setConfirmDeleteBanner(banner)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, transition: 'var(--transition-fast)', border: 'none', cursor: 'pointer',
                        background: 'rgba(255, 59, 48, 0.1)',
                        color: 'var(--danger)'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)'}
                    >
                      <Trash2 size={16} />
                      ลบระบุ
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
        </div>
      </div>

      <Modal
        isOpen={!!confirmDeleteBanner}
        onClose={() => setConfirmDeleteBanner(null)}
        title="ยืนยันการลบแบนเนอร์"
      >
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 59, 48, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
            <AlertTriangle size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>ลบแบนเนอร์นี้ใช่หรือไม่?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>ถ้าลบแล้วจะไม่สามารถกู้คืนได้ และแบนเนอร์จะหายไปจากหน้าร้านทันที</p>
          </div>
          
          {confirmDeleteBanner && (
            <div style={{ width: '100%', height: '120px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid #eaeaea', marginTop: '8px' }}>
              <img src={confirmDeleteBanner.image_url} alt="To Delete" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '16px' }}>
            <button
              onClick={() => setConfirmDeleteBanner(null)}
              style={{ flex: 1, padding: '12px', background: '#f5f5f7', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'var(--transition-fast)' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#ebebeb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#f5f5f7'}
            >
              ยกเลิก
            </button>
            <button
              onClick={() => confirmDeleteBanner && deleteBanner(confirmDeleteBanner)}
              style={{ flex: 1, padding: '12px', background: 'var(--danger)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'var(--transition-fast)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#e6352b'}
              onMouseOut={(e) => e.currentTarget.style.background = 'var(--danger)'}
            >
              <Trash2 size={18} /> ยืนยันการลบ
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
