import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { useSettings } from '../../context/SettingsContext';
import { Save, MapPin, Clock, Truck } from 'lucide-react';
import MapPicker from '../../components/MapPicker';

export default function AdminSettings() {
  const { settings, updateSettings, loading } = useSettings();
  
  const [restaurantName, setRestaurantName] = useState('');
  const [promptpayNumber, setPromptpayNumber] = useState('');
  const [promptpayName, setPromptpayName] = useState('');
  
  const [storeLat, setStoreLat] = useState<number | null>(null);
  const [storeLng, setStoreLng] = useState<number | null>(null);
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(15);
  const [freeDeliveryKm, setFreeDeliveryKm] = useState(2);
  const [feePerKm, setFeePerKm] = useState(10);
  const [maxDeliveryKm, setMaxDeliveryKm] = useState(10);
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('21:00');
  const [autoCloseEnabled, setAutoCloseEnabled] = useState(false);
  
  // Promo Banner
  const [promoBannerActive, setPromoBannerActive] = useState(false);
  const [promoBannerText, setPromoBannerText] = useState('');
  
  // Hero Section
  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroHighlight, setHeroHighlight] = useState('');
  const [heroSubheadline, setHeroSubheadline] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setRestaurantName(settings.restaurant_name || '');
      setPromptpayNumber(settings.promptpay_number || '');
      setPromptpayName(settings.promptpay_name || '');
      setStoreLat(settings.store_lat);
      setStoreLng(settings.store_lng);
      setBaseDeliveryFee(settings.base_delivery_fee ?? 15);
      setFreeDeliveryKm(settings.free_delivery_km ?? 2);
      setFeePerKm(settings.fee_per_km ?? 10);
      setMaxDeliveryKm(settings.max_delivery_km ?? 10);
      setOpeningTime(settings.opening_time || '09:00');
      setClosingTime(settings.closing_time || '21:00');
      setAutoCloseEnabled(settings.auto_close_enabled || false);
      setPromoBannerActive(settings.promo_banner_active || false);
      setPromoBannerText(settings.promo_banner_text || '');
      setHeroHeadline(settings.hero_headline || 'ยกระดับความล้ำ');
      setHeroHighlight(settings.hero_highlight || 'จัดส่งถึงบ้าน');
      setHeroSubheadline(settings.hero_subheadline || 'สั่งง่าย อร่อยเร็ว เลือกจากเมนูหลากหลาย จัดส่งฟรีทุกออเดอร์ด้วยระบบที่ล้ำกว่าเดิม');
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      await updateSettings({
        restaurant_name: restaurantName,
        promptpay_number: promptpayNumber,
        promptpay_name: promptpayName,
        store_lat: storeLat,
        store_lng: storeLng,
        base_delivery_fee: baseDeliveryFee,
        free_delivery_km: freeDeliveryKm,
        fee_per_km: feePerKm,
        max_delivery_km: maxDeliveryKm,
        opening_time: openingTime,
        closing_time: closingTime,
        auto_close_enabled: autoCloseEnabled,
        promo_banner_active: promoBannerActive,
        promo_banner_text: promoBannerText,
        hero_headline: heroHeadline,
        hero_highlight: heroHighlight,
        hero_subheadline: heroSubheadline
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <div className="admin-main">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
             <div className="skeleton-pulse" style={{ height: '60px', width: '200px', borderRadius: '12px' }}></div>
             <div className="skeleton-pulse" style={{ height: '400px', borderRadius: '24px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <div className="admin-header">
          <div>
            <h1>⚙️ ตั้งค่าร้าน</h1>
            <p>แก้ไขข้อมูลพื้นฐานและช่องทางการรับชำระเงินของร้าน</p>
          </div>
        </div>

        <div className="admin-content-area" style={{ maxWidth: 600 }}>
          <form className="admin-form" onSubmit={handleSave}>
            
            <h3 style={{ marginBottom: 16 }}>ข้อมูลร้าน</h3>
            <div className="form-group">
              <label>ชื่อร้าน (Restaurant Name)</label>
              <input 
                type="text" 
                value={restaurantName} 
                onChange={e => setRestaurantName(e.target.value)} 
                required 
                placeholder="เช่น YumDash"
              />
            </div>
            
            <h3 style={{ marginTop: 32, marginBottom: 16 }}>ข้อมูลรับชำระเงิน (PromptPay)</h3>
            <div className="form-group">
              <label>เบอร์โทรศัพท์ หรือ หมายเลขบัตรประชาชน (PromptPay Number)</label>
              <input 
                type="text" 
                value={promptpayNumber} 
                onChange={e => setPromptpayNumber(e.target.value)} 
                required 
                placeholder="08x-xxx-xxxx หรือ 1xxxxxxxxx"
              />
              <small style={{ color: 'var(--text-muted)' }}>* กรุณากรอกเฉพาะตัวเลข ไม่ต้องใส่ขีด (-) </small>
            </div>
            <div className="form-group">
              <label>ชื่อบัญชี (Account Name)</label>
              <input 
                type="text" 
                value={promptpayName} 
                onChange={e => setPromptpayName(e.target.value)} 
                required 
                placeholder="ชื่อ - นามสกุล"
              />
            </div>

            <h3 style={{ marginTop: 40, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>📢</span> ป้ายประกาศโฆษณา (Promotional Banner)
            </h3>
            <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <input 
                  type="checkbox" 
                  id="promoBanner" 
                  checked={promoBannerActive} 
                  onChange={e => setPromoBannerActive(e.target.checked)} 
                  style={{ width: 20, height: 20, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="promoBanner" style={{ fontWeight: 600, cursor: 'pointer', margin: 0 }}>เปิดใช้งานข้อความประกาศด้านบนสุดของเว็บ</label>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                แบนเนอร์จะแสดงแทบสีแดงสดสะดุดตา สำหรับประกาศส่วนลด ฟรีส่ง หรือแจ้งข่าวสำคัญ
              </p>
              
              <div style={{ display: 'flex', gap: 16, opacity: promoBannerActive ? 1 : 0.5, pointerEvents: promoBannerActive ? 'auto' : 'none' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>ข้อความประกาศ (Banner Text)</label>
                  <input type="text" value={promoBannerText} onChange={e => setPromoBannerText(e.target.value)} placeholder="เช่น ใส่โค้ดลดพิเศษ 20 บาท วันนี้เท่านั้น!" />
                </div>
              </div>
            </div>

            <h3 style={{ marginTop: 40, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>✨</span> ข้อความต้อนรับหน้าแรก (Hero Banner)
            </h3>
            <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                ปรับแต่งข้อความขนาดใหญ่ที่ลูกค้าเห็นเป็นอันดับแรกเมื่อเปิดเว็บ
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label>หัวข้อหลัก (เช่น ยกระดับความล้ำ)</label>
                  <input type="text" value={heroHeadline} onChange={e => setHeroHeadline(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>คำเน้นสี / ไฮไลท์ (เช่น จัดส่งถึงบ้าน)</label>
                  <input type="text" value={heroHighlight} onChange={e => setHeroHighlight(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>ข้อความอธิบายรอง (Subheadline)</label>
                  <textarea 
                    value={heroSubheadline} 
                    onChange={e => setHeroSubheadline(e.target.value)} 
                    rows={2}
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 'var(--radius-sm)', 
                      color: 'var(--text-primary)' 
                    }}
                  />
                </div>
              </div>
            </div>

            <h3 style={{ marginTop: 40, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="var(--primary)" /> เวลาเปิด-ปิดร้าน (Auto-Close)
            </h3>
            <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <input 
                  type="checkbox" 
                  id="autoClose" 
                  checked={autoCloseEnabled} 
                  onChange={e => setAutoCloseEnabled(e.target.checked)} 
                  style={{ width: 20, height: 20, accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="autoClose" style={{ fontWeight: 600, cursor: 'pointer', margin: 0 }}>เปิดใช้งานระบบปิดร้านตามเวลา</label>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                หากเปิดใช้งาน ถ้านอกเวลาทำการ ระบบจะขึ้นป้าย "ร้านปิดแล้ว" และป้องกันไม่ให้ลูกค้ากดสั่งอาหารเด็ดขาด
              </p>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, opacity: autoCloseEnabled ? 1 : 0.5, pointerEvents: autoCloseEnabled ? 'auto' : 'none' }}>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label>เวลาเปิด (Opening Time)</label>
                  <input type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label>เวลาปิด (Closing Time)</label>
                  <input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} />
                </div>
              </div>
            </div>

            <h3 style={{ marginTop: 40, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={18} color="var(--primary)" /> พิกัดร้าน & รัศมีจัดส่ง (Smart Delivery)
            </h3>
            <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                ปักหมุดตำแหน่งครัว/ร้านของคุณบนแผนที่ เพื่อให้ระบบอัจฉริยะคำนวณระยะทางไปบ้านลูกค้าอัตโนมัติ (รัศมีเส้นตรง)
              </p>
              <div style={{ marginBottom: 24, padding: 4, background: '#fff', borderRadius: 16, border: '2px dashed var(--primary)' }}>
                <MapPicker 
                  position={storeLat !== null && storeLng !== null ? { lat: storeLat, lng: storeLng } : null} 
                  onChange={pos => { setStoreLat(pos.lat); setStoreLng(pos.lng); }} 
                />
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 120px' }}>
                  <label>ค่าส่งเริ่มต้น (บาท)</label>
                  <input type="number" min="0" value={baseDeliveryFee} onChange={e => setBaseDeliveryFee(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ flex: '1 1 120px' }}>
                  <label>ส่งฟรีระยะ (กม.)</label>
                  <input type="number" step="0.1" min="0" value={freeDeliveryKm} onChange={e => setFreeDeliveryKm(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ flex: '1 1 120px' }}>
                  <label>ส่วนเกิน กม.ละ (บาท)</label>
                  <input type="number" min="0" value={feePerKm} onChange={e => setFeePerKm(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ flex: '1 1 120px' }}>
                  <label>รัศมีจัดส่งสูงสุด (กม.)</label>
                  <input type="number" step="0.1" min="0" value={maxDeliveryKm} onChange={e => setMaxDeliveryKm(Number(e.target.value))} />
                </div>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                ตัวอย่าง: ค่าส่งเริ่มต้น 15 บาท, ฟรีระยะ 2 กม., ส่วนเกินคิด กม.ละ 10 บาท
              </p>
            </div>

            <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>
              {saveSuccess && <span style={{ color: 'var(--success)' }}>บันทึกข้อมูลเรียบร้อยแล้ว</span>}
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}

// Forcing TS recompilation
