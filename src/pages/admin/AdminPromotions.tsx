import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { supabase } from '../../lib/supabase';
import { Promotion } from '../../types';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import Modal from '../../components/Modal';

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [minSpend, setMinSpend] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState<number | ''>('');
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchPromotions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching promotions:', error);
    } else {
      setPromotions(data as Promotion[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPromotions();
  }, []);



  const resetForm = () => {
    setCode('');
    setDiscountType('fixed');
    setDiscountValue(0);
    setMinSpend(0);
    setMaxDiscount('');
    setMaxUses('');
    setExpiresAt('');
    setIsActive(true);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEdit = (promo: Promotion) => {
    setCode(promo.code);
    setDiscountType(promo.discount_type);
    setDiscountValue(promo.discount_value);
    setMinSpend(promo.min_spend);
    setMaxDiscount(promo.max_discount || '');
    setMaxUses(promo.max_uses || '');
    setExpiresAt(promo.expires_at ? new Date(promo.expires_at).toISOString().slice(0, 16) : '');
    setIsActive(promo.is_active);
    
    setEditingId(promo.id);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
        alert("กรุณากรอกรหัสส่วนลด");
        return;
    }
    
    const payload = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: discountValue,
      min_spend: minSpend,
      max_discount: maxDiscount === '' ? null : Number(maxDiscount),
      max_uses: maxUses === '' ? null : Number(maxUses),
      expires_at: expiresAt || null,
      is_active: isActive
    };

    if (editingId) {
      const { error } = await supabase.from('promotions').update(payload).eq('id', editingId);
      if (error) {
        console.error('Error updating promotion', error);
        alert(error.message.includes('unique') ? 'รหัสนี้มีอยู่แล้ว' : 'เกิดข้อผิดพลาดในการอัปเดต');
        return;
      }
    } else {
      const { error } = await supabase.from('promotions').insert(payload);
      if (error) {
        console.error('Error creating promotion', error);
        alert(error.message.includes('unique') ? 'รหัสนี้มีอยู่แล้ว' : 'เกิดข้อผิดพลาดในการสร้าง');
        return;
      }
    }

    resetForm();
    fetchPromotions();
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('promotions').update({ is_active: !current }).eq('id', id);
    if (error) {
      console.error(error);
      alert('ไม่สามารถเปลี่ยนสถานะได้: ' + error.message);
    }
    fetchPromotions();
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    const { error } = await supabase.from('promotions').delete().eq('id', deleteConfirmId);
    if (error) {
      console.error('Delete error:', error);
      alert('ไม่สามารถลบได้ (อาจติดสิทธิ์ RLS หรือถูกเรียกใช้งานอยู่): ' + error.message);
    } else {
      fetchPromotions();
    }
    setDeleteConfirmId(null);
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <div className="admin-header">
          <div>
            <h1>🎟️ โค้ดส่วนลดโปรโมชั่น</h1>
            <p>จัดการรหัสส่วนลด แจกแคมเปญ เพื่อกระตุ้นยอดขาย</p>
          </div>
        </div>

        <div className="admin-content-area" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Form */}
          <div style={{ flex: '1 1 350px', background: 'var(--surface)', padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: 16 }}>{isEditing ? 'แก้ไขรหัสอ้างอิง' : 'สร้างรหัสส่วนลดใหม่'}</h3>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-group">
                <label>รหัสโค้ด (CODE)</label>
                <input 
                  type="text" 
                  value={code} 
                  onChange={e => setCode(e.target.value.toUpperCase())} 
                  placeholder="เช่น YUMDASH, DISCOUNT20" 
                  required 
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 150px' }}>
                  <label>ประเภทส่วนลด</label>
                  <select value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                    <option value="fixed">ลดยอดเงิน (฿)</option>
                    <option value="percent">ลดเปอร์เซ็นต์ (%)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: '1 1 150px' }}>
                  <label>มูลค่า ({discountType === 'percent' ? '%' : 'บาท'})</label>
                  <input type="number" min="0" step="0.5" value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 150px' }}>
                  <label>เมื่อสั่งขั้นต่ำ (บาท)</label>
                  <input type="number" min="0" value={minSpend} onChange={e => setMinSpend(Number(e.target.value))} />
                </div>
                {discountType === 'percent' && (
                  <div className="form-group" style={{ flex: '1 1 150px' }}>
                    <label>ลดสูงสุด (บาท)</label>
                    <input type="number" min="0" value={maxDiscount} onChange={e => setMaxDiscount(e.target.value === '' ? '' : Number(e.target.value))} placeholder="ไม่มีกำหนด" />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 150px' }}>
                  <label>จำกัดจำนวนการใช้ (ครั้ง)</label>
                  <input type="number" min="1" value={maxUses} onChange={e => setMaxUses(e.target.value === '' ? '' : Number(e.target.value))} placeholder="ไม่จำกัด" />
                </div>
                <div className="form-group" style={{ flex: '1 1 150px' }}>
                  <label>วันหมดอายุ</label>
                  <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                <label htmlFor="isActive" style={{ margin: 0 }}>เปبدใช้งานโค้ดนี้</label>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  {isEditing ? 'อัปเดตโค้ด' : 'สร้างโค้ด'}
                </button>
                {isEditing && (
                  <button type="button" className="btn-secondary" onClick={resetForm}>ยกเลิก</button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div style={{ flex: '2 1 500px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton-pulse" style={{ height: '80px', borderRadius: '12px' }}></div>)}
              </div>
            ) : promotions.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface)', borderRadius: 16 }}>ยังไม่มีรหัสส่วนลดในระบบ</div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {promotions.map(promo => {
                  const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
                  const isFullyUsed = promo.max_uses && promo.current_uses >= promo.max_uses;
                  const isUsable = promo.is_active && !isExpired && !isFullyUsed;

                  return (
                    <div key={promo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: 16, borderRadius: 12, border: `1px solid ${isUsable ? 'var(--primary)' : 'var(--border)'}`, opacity: isUsable ? 1 : 0.7 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: isUsable ? 'var(--primary)' : 'var(--text-muted)' }}>{promo.code}</span>
                          {!promo.is_active && <span style={{ fontSize: '0.7rem', background: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: 4 }}>ปิดใช้งาน</span>}
                          {isExpired && <span style={{ fontSize: '0.7rem', background: 'var(--text-muted)', color: 'white', padding: '2px 6px', borderRadius: 4 }}>หมดอายุ</span>}
                          {isFullyUsed && <span style={{ fontSize: '0.7rem', background: 'var(--text-muted)', color: 'white', padding: '2px 6px', borderRadius: 4 }}>สิทธิ์เต็ม</span>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          ลด {promo.discount_value}{promo.discount_type === 'percent' ? '%' : ' บาท'}
                          {promo.min_spend > 0 && ` • ขั้นต่ำ ${promo.min_spend}บ.`}
                          {promo.max_discount && ` • ลดสูงสุด ${promo.max_discount}บ.`}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          ใช้ไป {promo.current_uses} {promo.max_uses ? `/ ${promo.max_uses}` : ''} ครั้ง
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => toggleActive(promo.id, promo.is_active)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: promo.is_active ? 'var(--danger)' : 'var(--success)' }}>
                          {promo.is_active ? <XCircle size={20} /> : <CheckCircle size={20} />}
                        </button>
                        <button onClick={() => handleEdit(promo)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)' }}>
                          <Edit2 size={20} />
                        </button>
                        <button onClick={() => handleDeleteClick(promo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--danger)' }}>
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <Modal isOpen={deleteConfirmId !== null} onClose={() => setDeleteConfirmId(null)} title="⚠️ ยืนยันการลบ">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Trash2 size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px', opacity: 0.8 }} />
          <h3 style={{ marginBottom: '8px' }}>คุณแน่ใจหรือไม่?</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>การลบรหัสส่วนลดนี้จะไม่สามารถกู้คืนได้</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => setDeleteConfirmId(null)} style={{ flex: 1 }}>ยกเลิก</button>
            <button className="btn-primary" onClick={confirmDelete} style={{ flex: 1, background: 'var(--danger)', borderColor: 'var(--danger)' }}>ลบเลย</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
