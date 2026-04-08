import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Phone, CreditCard, CheckCircle, ArrowRight, Clock, Store, ShoppingBag as BagIcon, Truck, Upload } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { useSettings } from '../context/SettingsContext';
import { supabase } from '../lib/supabase';
import generatePayload from 'promptpay-qr';
import { QRCodeCanvas } from 'qrcode.react';
import { OrderType } from '../types';
import MapPicker from '../components/MapPicker';
import { calculateDistance } from '../lib/distance';
import DigitalReceipt from '../components/DigitalReceipt';
import { useToast } from '../context/ToastContext';

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [mapPosition, setMapPosition] = useState<{lat: number, lng: number} | null>(null);
  const [addressNote, setAddressNote] = useState('');
  const savedTable = typeof window !== 'undefined' ? localStorage.getItem('restaurant_table_number') : null;
  const [orderType, setOrderType] = useState<OrderType>(savedTable ? 'dine_in' : 'delivery');
  const [pickupTime, setPickupTime] = useState('');
  const [payment, setPayment] = useState<'cash' | 'promptpay' | 'card'>('cash');
  const [showConfirm, setShowConfirm] = useState(false);
  const [orderId, setOrderId] = useState('');
  
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
  const [paymentSlipPreview, setPaymentSlipPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<import('../types').Order | null>(null);

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [activePromoCode, setActivePromoCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);

  // Auto-fill customer info on load
  useEffect(() => {
    const savedCustomer = localStorage.getItem('yumdash_customer_profile');
    if (savedCustomer) {
      try {
        const profile = JSON.parse(savedCustomer);
        if (profile.name) setName(profile.name);
        if (profile.phone) setPhone(profile.phone);
        if (profile.addressNote) setAddressNote(profile.addressNote);
        if (profile.mapPosition) setMapPosition(profile.mapPosition);
      } catch (e) {
        console.error('Failed to parse saved customer profile');
      }
    }
  }, []);

  const applyPromoCode = async () => {
    if (!promoCodeInput.trim()) return;
    setIsVerifyingPromo(true);
    setPromoError('');
    setPromoSuccess('');
    
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('code', promoCodeInput.trim().toUpperCase())
        .eq('is_active', true)
        .single();
        
      if (error || !data) {
        setPromoError('รหัสส่วนลดไม่ถูกต้องหรือถูกปิดใช้งาน');
        setActivePromoCode('');
        setDiscountAmount(0);
        return;
      }
      
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError('รหัสส่วนลดนี้หมดอายุแล้ว');
        return;
      }
      
      if (data.max_uses && data.current_uses >= data.max_uses) {
        setPromoError('รหัสส่วนลดนี้ถูกใช้ครบสิทธิ์ที่กำหนดแล้ว');
        return;
      }
      
      if (data.min_spend && totalPrice < data.min_spend) {
        setPromoError(`รหัสนี้ต้องสั่งขั้นต่ำ ฿${data.min_spend}`);
        return;
      }
      
      let discount = 0;
      if (data.discount_type === 'fixed') {
        discount = data.discount_value;
      } else if (data.discount_type === 'percent') {
        discount = totalPrice * (data.discount_value / 100);
        if (data.max_discount && discount > data.max_discount) {
          discount = data.max_discount;
        }
      }
      
      discount = Math.min(discount, totalPrice); // Can't discount delivery fee
      
      setActivePromoCode(data.code);
      setDiscountAmount(discount);
      setPromoSuccess(`ใช้ส่วนลดสำเร็จ! ลดไป ฿${discount}`);
      setPromoError('');
    } catch (e) {
      setPromoError('เกิดข้อผิดพลาดในการตรวจสอบรหัส');
    } finally {
      setIsVerifyingPromo(false);
    }
  };

  let computedDeliveryFee = 0;
  let distanceKm = 0;
  const hasStoreLocation = settings?.store_lat && settings?.store_lat !== 0;
  
  if (orderType === 'delivery' && mapPosition && hasStoreLocation) {
    distanceKm = calculateDistance(
      Number(settings.store_lat), Number(settings.store_lng),
      Number(mapPosition.lat), Number(mapPosition.lng)
    ) || 0;
    
    if (distanceKm <= (settings.free_delivery_km ?? 2)) {
      computedDeliveryFee = settings.base_delivery_fee ?? 15;
    } else {
      const extraKm = distanceKm - (settings.free_delivery_km ?? 2);
      computedDeliveryFee = (settings.base_delivery_fee ?? 15) + (Math.ceil(extraKm) * (settings.fee_per_km ?? 10));
    }
  }

  const deliveryFee = orderType === 'delivery' ? (isNaN(computedDeliveryFee) ? 0 : computedDeliveryFee) : 0;
  const grandTotal = Math.max(0, totalPrice - discountAmount) + deliveryFee;
  
  const hasCustomItems = items.some(i => i.menuItem.id.startsWith('custom-') || i.isCustomItem);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    if (!name.trim()) {
      showToast('กรุณากรอกชื่อผู้สั่ง', 'error');
      return;
    }
    
    if (!phone.trim()) {
      showToast('กรุณากรอกเบอร์โทรติดต่อ', 'error');
      return;
    }
    
    if (orderType === 'delivery') {
      if (!mapPosition) {
        showToast('กรุณาปักหมุดตำแหน่งจัดส่งบนแผนที่', 'error');
        return;
      }
      
      const hasStoreLocation = settings?.store_lat && settings?.store_lng;
      if (hasStoreLocation && distanceKm > (settings?.max_delivery_km ?? 10)) {
        showToast(`ขออภัย ตำแหน่งจัดส่งของคุณอยู่นอกพื้นที่ให้บริการ (สูงสุด ${settings?.max_delivery_km ?? 10} กม.)`, 'error');
        return;
      }
    }
    
    let paymentSlipUrl = '';

    if (payment === 'promptpay' && !hasCustomItems) {
      if (!paymentSlip) {
        showToast('กรุณาแนบสลิปโอนเงิน', 'error');
        return;
      }
      
      setIsSubmitting(true);
      const fileExt = paymentSlip.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage.from('payment_slips').upload(fileName, paymentSlip);
      
      if (error) {
        console.error('Error uploading slip:', error);
        showToast('เกิดข้อผิดพลาดในการอัพโหลดสลิป กรุณาลองใหม่', 'error');
        setIsSubmitting(false);
        return;
      }
      
      const { data: urlData } = supabase.storage.from('payment_slips').getPublicUrl(fileName);
      paymentSlipUrl = urlData.publicUrl;
    } else {
      setIsSubmitting(true);
    }

    try {
      let finalAddress = '';
      if (orderType === 'delivery') {
        const link = `https://maps.google.com/?q=${mapPosition?.lat},${mapPosition?.lng}`;
        finalAddress = addressNote ? `${link}\nจุดสังเกต: ${addressNote}` : link;
      }

      const savedTable = localStorage.getItem('restaurant_table_number') || undefined;

      const order = await addOrder(items, grandTotal, {
        name,
        phone,
        address: finalAddress,
        paymentMethod: payment,
        paymentSlipUrl,
        orderType,
        pickupTime: orderType !== 'delivery' ? (pickupTime || 'ASAP') : undefined,
        deliveryFee,
        promoCode: activePromoCode,
        discountAmount,
        tableNumber: savedTable,
      });
      
      if (activePromoCode) {
        // Will create fallback DB function or just update via normal query
        supabase
          .from('promotions')
          .select('current_uses')
          .eq('code', activePromoCode)
          .single()
          .then(({ data }) => {
            if (data) {
              supabase.from('promotions').update({ current_uses: data.current_uses + 1 }).eq('code', activePromoCode).then();
            }
          });
      }

      // Save customer profile for auto-fill
      localStorage.setItem('yumdash_customer_profile', JSON.stringify({
        name,
        phone,
        addressNote,
        mapPosition
      }));
      
      // Save order ID to local storage for "My Orders" history
      const history = JSON.parse(localStorage.getItem('yumdash_order_history') || '[]');
      localStorage.setItem('yumdash_order_history', JSON.stringify([order.id, ...history]));
      
      setOrderId(order.id);
      setCompletedOrder(order);
      clearCart();
      setShowConfirm(true);
    } catch (err) {
      console.error('Error submitting order', err);
      showToast('เกิดข้อผิดพลาดในการสร้างออเดอร์ กรุณาลองใหม่', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const payload = (settings?.promptpay_number && payment === 'promptpay') ? generatePayload(settings.promptpay_number, { amount: grandTotal }) : '';

  if (items.length === 0 && !showConfirm) {
    return (
      <div className="main-content">
        <div className="page-container checkout-page" style={{ textAlign: 'center', paddingTop: 80 }}>
          <p style={{ fontSize: '4rem', marginBottom: 16 }}>🛒</p>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>ตะกร้าว่างเปล่า</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>กรุณาเลือกเมนูก่อนทำรายการ</p>
          <button className="hero-cta" onClick={() => navigate('/')}>
            กลับไปเลือกเมนู <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-container checkout-page">
        <h1>🧾 สั่งซื้อ</h1>
        <p className="subtitle">กรอกข้อมูลเพื่อยืนยันออเดอร์</p>

        <form onSubmit={handleSubmit}>
          <div className="form-section" style={{ marginBottom: '24px' }}>
            {savedTable ? (
              <div style={{ position: 'relative', background: 'linear-gradient(135deg, rgba(255, 45, 85, 0.1), rgba(255, 85, 125, 0.05))', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255, 45, 85, 0.3)', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 32px rgba(255,45,85,0.05)', marginBottom: 24 }}>
                  <button 
                    type="button"
                    onClick={() => {
                        localStorage.removeItem('restaurant_table_number');
                        window.location.reload();
                    }}
                    style={{ position: 'absolute', top: 8, right: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%', width: 28, height: 28, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
                    title="ยกเลิกการล็อกโต๊ะ"
                  >
                    <X size={16} />
                  </button>
                  <div style={{ background: 'var(--accent)', color: 'white', minWidth: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.4rem', boxShadow: '0 4px 12px rgba(255,45,85,0.3)' }}>
                      {savedTable}
                  </div>
                  <div>
                      <h3 style={{ margin: '0 0 4px 0', color: 'var(--accent)', fontSize: '1.1rem' }}>สั่งอาหารแบบทานที่ร้าน</h3>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>เสิร์ฟตรงถึง **โต๊ะที่ {savedTable}**</p>
                  </div>
              </div>
            ) : (
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Store size={18} /> รูปแบบการสั่งอาหาร
                </h3>
                <div className="payment-options" style={{ marginBottom: 16 }}>
                  <div className={`payment-option ${orderType === 'delivery' ? 'selected' : ''}`} onClick={() => setOrderType('delivery')}>
                    <div className="pay-icon" style={{ fontSize: '1.2rem' }}><Truck size={20} /></div>
                    <div className="pay-label">จัดส่ง (Delivery)</div>
                  </div>
                  <div className={`payment-option ${orderType === 'takeaway' ? 'selected' : ''}`} onClick={() => setOrderType('takeaway')}>
                    <div className="pay-icon" style={{ fontSize: '1.2rem' }}><BagIcon size={20} /></div>
                    <div className="pay-label">รับกลับบ้าน</div>
                  </div>
                  <div className={`payment-option ${orderType === 'dine_in' ? 'selected' : ''}`} onClick={() => setOrderType('dine_in')}>
                    <div className="pay-icon" style={{ fontSize: '1.2rem' }}><Store size={20} /></div>
                    <div className="pay-label">ทานที่ร้าน</div>
                  </div>
                </div>
              </div>
            )}

            {orderType !== 'delivery' && (
              <div className="form-group" style={{ 
                background: 'var(--bg-glass)', 
                padding: '16px', 
                borderRadius: '12px', 
                border: '1px solid var(--border)' 
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={16} /> ระบุเวลา{orderType === 'dine_in' ? 'ที่จะถึงร้าน' : 'เวลารับของ'} (ตัวเลือก)
                </label>
                <input 
                  type="time" 
                  value={pickupTime} 
                  onChange={e => setPickupTime(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  * หากไม่ระบุ ระบบจะถือว่ามารับ/ถึงร้านโดยเร็วที่สุด (ASAP)
                </p>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="form-section">
            <h3><User size={18} /> ข้อมูลลูกค้า</h3>
            <div className="form-group">
              <label>ชื่อ-นามสกุล / ชื่อเล่น</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อผู้สั่ง" />
            </div>
            <div className="form-group">
              <label><Phone size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> เบอร์โทร</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0xx-xxx-xxxx" />
            </div>
            
            {orderType === 'delivery' && (
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--text)' }}>
                  <MapPin size={16} color="var(--accent)" /> <strong>ตำแหน่งจัดส่งของคุณ</strong>
                </label>
                
                <MapPicker 
                  position={mapPosition} 
                  onChange={pos => setMapPosition(pos)} 
                />
                
                <label style={{ display: 'block', marginTop: 16, marginBottom: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>จุดสังเกตเพิ่มเติม (ถ้ามี)</label>
                <textarea 
                  value={addressNote} 
                  onChange={e => setAddressNote(e.target.value)} 
                  placeholder="เช่น หมู่บ้าน A ซอย 3 เข้ามาหน้าบ้านมีรถเก๋งสีขาวจอดอยู่"
                  style={{ minHeight: '60px', width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                />
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="form-section">
            <h3><CreditCard size={18} /> ช่องทางชำระเงิน</h3>
            
            <div className="payment-options" style={{ marginBottom: hasCustomItems ? 24 : 0 }}>
              {settings?.promptpay_number && (
                <div className={`payment-option ${payment === 'promptpay' ? 'selected' : ''}`} onClick={() => setPayment('promptpay')}>
                  <div className="pay-icon">📱</div>
                  <div className="pay-label">PromptPay</div>
                </div>
              )}
              <div className={`payment-option ${payment === 'cash' ? 'selected' : ''}`} onClick={() => setPayment('cash')}>
                <div className="pay-icon">💵</div>
                <div className="pay-label">เงินสด</div>
              </div>
              <div className={`payment-option ${payment === 'card' ? 'selected' : ''}`} onClick={() => setPayment('card')}>
                <div className="pay-icon">💳</div>
                <div className="pay-label">บัตรเครดิต</div>
              </div>
            </div>
            
            {hasCustomItems ? (
              <div style={{ marginTop: 16, padding: 20, background: 'var(--bg-glass)', borderRadius: 16, border: '1px solid var(--warning)', textAlign: 'center' }}>
                <p style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: 8 }}>⚠️ ออเดอร์ของคุณมีรายการสั่งพิเศษที่ต้องประเมินราคา</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  ระบบจะข้ามขั้นตอนการชำระเงินไปก่อน กรุณากด "ยืนยันออเดอร์"<br/>
                  จากนั้นทางร้านจะประเมินราคา เมื่อเสร็จแล้วคุณจะสามารถโอนจ่ายได้ในหน้า <b>ติดตามออเดอร์</b>
                </p>
              </div>
            ) : (
              payment === 'promptpay' && settings?.promptpay_number && (
                <div style={{ marginTop: 24, padding: 24, background: 'var(--bg-lighter)', borderRadius: 16, border: '1px solid var(--border)', textAlign: 'center' }}>
                  <h4 style={{ marginBottom: 16 }}>แสกนเพื่อชำระเงิน</h4>
                  <div style={{ background: 'white', padding: 16, display: 'inline-block', borderRadius: 16, marginBottom: 16 }}>
                    <QRCodeCanvas value={payload} size={200} />
                  </div>
                  <p style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: 4 }}>฿{grandTotal}</p>
                  <p style={{ marginBottom: 4 }}>บัญชี: {settings?.promptpay_name}</p>
                  <p style={{ color: 'var(--text-muted)' }}>พร้อมเพย์: {settings?.promptpay_number}</p>
                  
                  <div style={{ marginTop: 24, textAlign: 'left' }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>อัพโหลดสลิปโอนเงิน *</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="payment-slip-upload"
                        onChange={e => {
                          if (e.target.files && e.target.files.length > 0) {
                            const file = e.target.files[0];
                            setPaymentSlip(file);
                            
                            // Cleanup previous preview if exists
                            if (paymentSlipPreview) {
                              URL.revokeObjectURL(paymentSlipPreview);
                            }
                            setPaymentSlipPreview(URL.createObjectURL(file));
                          }
                        }} 
                        style={{ display: 'none' }}
                      />
                      <label 
                        htmlFor="payment-slip-upload" 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: paymentSlipPreview ? '16px' : '32px 16px', 
                          background: paymentSlipPreview ? 'var(--surface)' : 'var(--bg-glass)', 
                          borderRadius: '16px',
                          border: paymentSlipPreview ? '2px solid var(--accent)' : '2px dashed var(--accent)',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          gap: '12px',
                          overflow: 'hidden'
                        }}
                      >
                        {paymentSlipPreview ? (
                          <>
                            <div style={{ position: 'relative', width: '100%', maxWidth: '200px', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                              <img src={paymentSlipPreview} alt="Payment Slip Preview" style={{ width: '100%', height: 'auto', display: 'block' }} />
                              <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--bg-glass)', borderRadius: '50%', padding: 4, display: 'flex' }}>
                                <CheckCircle size={20} color="var(--success)" />
                              </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>แตะรูปภาพเพื่อเปลี่ยนไฟล์ใหม่</p>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{paymentSlip?.name}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ padding: '16px', background: 'var(--accent)', borderRadius: '50%', color: 'white', display: 'flex', boxShadow: '0 8px 16px var(--accent-glow)' }}>
                              <Upload size={24} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontSize: '1.05rem' }}>แตะเพื่อแนบสลิปโอนเงิน</p>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>รองรับไฟล์ JPG หรือ PNG</p>
                            </div>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Promo Code Section */}
          <div className="form-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <span>🎟️</span> โค้ดส่วนลด
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                type="text" 
                value={promoCodeInput}
                onChange={e => setPromoCodeInput(e.target.value)}
                placeholder="กรอกรหัสส่วนลด..."
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', textTransform: 'uppercase' }}
                disabled={activePromoCode.length > 0}
              />
              {activePromoCode ? (
                <button 
                  type="button" 
                  onClick={() => {
                    setActivePromoCode('');
                    setPromoCodeInput('');
                    setDiscountAmount(0);
                    setPromoSuccess('');
                  }}
                  style={{ padding: '12px 16px', background: 'var(--text-muted)', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ยกเลิก
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={applyPromoCode}
                  disabled={isVerifyingPromo || !promoCodeInput.trim()}
                  style={{ padding: '12px 16px', background: 'var(--primary)', color: 'white', borderRadius: '8px', border: 'none', cursor: isVerifyingPromo || !promoCodeInput.trim() ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isVerifyingPromo || !promoCodeInput.trim() ? 0.7 : 1 }}
                >
                  {isVerifyingPromo ? 'กำลังตรวจสอบ...' : 'ใช้โค้ด'}
                </button>
              )}
            </div>
            {promoError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>{promoError}</p>}
            {promoSuccess && <p style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: 8 }}>{promoSuccess}</p>}
          </div>

          {/* Order Summary */}
          <div className="order-summary-section">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 14 }}>สรุปออเดอร์</h3>
            {items.map(item => {
              const optPrice = (item.selectedOptions || []).reduce((sum, o) => sum + (o.price || 0), 0);
              const unitPrice = item.menuItem.price + optPrice;
              return (
                <div key={item.cartItemId} style={{ marginBottom: 12 }}>
                  <div className="order-summary-item" style={{ marginBottom: 4 }}>
                    <span>{item.menuItem.name} x{item.quantity}</span>
                    <span>฿{unitPrice * item.quantity}</span>
                  </div>
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: 8, marginTop: -4 }}>
                      {item.selectedOptions.map((o, idx) => (
                        <div key={idx}>- {o.choiceName} {o.price > 0 && `(+฿${o.price})`}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {discountAmount > 0 && (
              <div className="order-summary-item" style={{ color: 'var(--primary)' }}>
                <span>ส่วนลด ({activePromoCode})</span>
                <span>-฿{discountAmount}</span>
              </div>
            )}
            <div className="order-summary-item">
              <span>ค่าจัดส่ง</span>
              <span>{orderType === 'delivery' && deliveryFee === 0 ? <span style={{ color: 'var(--success)' }}>ฟรี (ระยะโปรโมชัน)</span> : orderType === 'delivery' ? `฿${deliveryFee}` : '-'}</span>
            </div>
            {orderType === 'delivery' && distanceKm > 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '-8px', marginBottom: '8px' }}>
                ระยะทาง {distanceKm.toFixed(1)} กม.
              </div>
            )}
            <div className="order-summary-total">
              <span>รวมทั้งหมด</span>
              <span className="price">{hasCustomItems ? 'รอประเมิน' : `฿${grandTotal}`}</span>
            </div>
          </div>

          <button type="submit" className="place-order-btn" disabled={isSubmitting}>
            <CheckCircle size={20} /> {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันสั่งซื้อ'}
          </button>
        </form>

        {/* Confirmation Overlay with Digital Receipt */}
        {showConfirm && completedOrder && (
          <div className="order-confirmed-overlay" style={{ 
            padding: '20px', 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center' 
          }}>
            <h2 style={{ color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.3)', marginBottom: '24px', textAlign: 'center' }}>
              🎉 สั่งซื้อสำเร็จ!
            </h2>
            
            <DigitalReceipt order={completedOrder} restaurantName={settings?.restaurant_name} />
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '380px' }}>
              <button 
                className="btn-primary" 
                style={{ flex: 1, minWidth: '150px' }} 
                onClick={() => navigate(`/track/${orderId}`)}
              >
                ดูสถานะออเดอร์
              </button>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, minWidth: '150px' }} 
                onClick={() => navigate('/')}
              >
                กลับหน้าหลัก
              </button>
            </div>
            
            <div style={{ height: '40px' }}></div> {/* Spacer for scroll bottom */}
          </div>
        )}
      </div>
    </div>
  );
}
