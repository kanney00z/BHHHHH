import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Clock, ChefHat, Truck, PartyPopper, CreditCard, Upload, CheckCircle } from 'lucide-react';
import { useOrders } from '../context/OrderContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import generatePayload from 'promptpay-qr';
import { QRCodeCanvas } from 'qrcode.react';
import DeliveryMap from '../components/DeliveryMap';

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const { getOrder, updateOrderStatus } = useOrders();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const order = orderId ? getOrder(orderId) : undefined;
  
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
  const [paymentSlipPreview, setPaymentSlipPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  if (!order) {
    return (
      <div className="main-content">
        <div className="page-container tracking-page" style={{ paddingTop: 80 }}>
          <p style={{ fontSize: '4rem', marginBottom: 16 }}>📦</p>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>ไม่พบออเดอร์</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>ออเดอร์ที่ค้นหาไม่มีในระบบ</p>
          <button className="hero-cta" onClick={() => navigate('/')}>
            กลับหน้าแรก <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  const hasCustomItems = order.items.some(i => i.customName && (i.menuItem.id === 'unknown' || i.menuItem.price === 0));

  let steps = [
    { key: 'confirmed', label: 'รับออเดอร์', desc: 'ร้านอาหารได้รับออเดอร์แล้ว', icon: Check },
    { key: 'preparing', label: 'กำลังเตรียม', desc: 'เชฟกำลังปรุงอาหาร', icon: ChefHat },
    { key: 'delivering', label: 'กำลังจัดส่ง', desc: 'ไรเดอร์กำลังนำส่ง', icon: Truck },
    { key: 'delivered', label: 'จัดส่งแล้ว', desc: 'อาหารมาถึงแล้ว!', icon: PartyPopper },
  ];

  if (hasCustomItems || order.status === 'pending_pricing' || order.status === 'awaiting_payment') {
    steps = [
      { key: 'pending_pricing', label: 'รอประเมินราคา', desc: 'ร้านกำลังตรวจสอบยอดเงิน', icon: Clock },
      { key: 'awaiting_payment', label: 'รอชำระเงิน', desc: 'กรุณาโอนเงินตามยอดที่ระบุ', icon: CreditCard },
      ...steps
    ];
  }

  // Treat 'pending' the same as 'pending_pricing' visually if custom order
  let virtualStatus = order.status;
  if (virtualStatus === 'pending' && hasCustomItems) {
    virtualStatus = 'pending_pricing';
  } else if (virtualStatus === 'pending' && !hasCustomItems) {
    virtualStatus = 'confirmed'; // Treat normal pending as beginning of confirmed
  }

  const currentIdx = steps.findIndex(s => s.key === virtualStatus) >= 0 
                     ? steps.findIndex(s => s.key === virtualStatus) 
                     : 0;

  let customerLat: number | null = null;
  let customerLng: number | null = null;
  if (order.customerAddress) {
    const match = order.customerAddress.match(/q=([\d.-]+),([\d.-]+)/);
    if (match) {
      customerLat = parseFloat(match[1]);
      customerLng = parseFloat(match[2]);
    }
  }

  const showMap = order.orderType === 'delivery' && 
                  settings?.store_lat && 
                  settings?.store_lng && 
                  customerLat && 
                  customerLng && 
                  ['confirmed', 'preparing', 'delivering', 'delivered'].includes(order.status);
                     
  const handleUploadSlip = async () => {
    if (!paymentSlip || !orderId) return;
    setIsUploading(true);
    try {
      const fileExt = paymentSlip.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('payment_slips').upload(fileName, paymentSlip);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('payment_slips').getPublicUrl(fileName);
      
      await supabase.from('orders').update({ 
        payment_slip_url: urlData.publicUrl,
        status: 'pending' // Send back to pending for admin to confirm payment
      }).eq('id', orderId);

      if (order) {
        // Create full updated order payload
        const updatedOrder = {
          ...order,
          paymentSlipUrl: urlData.publicUrl,
          status: 'pending'
        };
        // Trigger LINE Notify for the new slip
        supabase.functions.invoke('line-notify', {
          body: updatedOrder
        }).catch(err => console.error('Failed to trigger LINE Notify:', err));
        
        // Update local state if needed
        updateOrderStatus(orderId, 'pending');
      }
      
      showToast('อัปโหลดสลิปสำเร็จ! ร้านกำลังตรวจสอบอีกครั้งครับ', 'success');
    } catch (e) {
      console.error(e);
      showToast('เกิดข้อผิดพลาดในการอัปโหลด', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="main-content">
      <div className="page-container tracking-page">
        <h1>📦 ติดตามออเดอร์</h1>
        <p className="subtitle">เช็คสถานะออเดอร์แบบเรียลไทม์</p>

        <div className="tracking-card">
          <div className="tracking-order-id">
            <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> #{order.id.slice(-6)} • {new Date(order.createdAt).toLocaleString('th-TH')}
          </div>

          {order.queueNumber && (
            <div style={{ textAlign: 'center', margin: '20px 0', padding: '15px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>ลำดับคิวของคุณสำหรับวันนี้</p>
              <h2 style={{ margin: 0, fontSize: '3rem', color: 'var(--accent)' }}>#{order.queueNumber}</h2>
            </div>
          )}

          <div className="order-stepper">
            {steps.map((step, idx) => {
              const isCompleted = idx < currentIdx;
              const isActive = idx === currentIdx;
              const Icon = step.icon;
              return (
                <div className="stepper-step" key={step.key}>
                  <div className="stepper-line">
                    <div className={`stepper-dot ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                      {(isCompleted || isActive) && <Icon size={16} color="white" />}
                    </div>
                    {idx < steps.length - 1 && (
                      <div className={`stepper-connector ${isCompleted ? 'active' : ''}`} />
                    )}
                  </div>
                  <div className="stepper-content">
                    <h4 style={{ color: isActive || isCompleted ? 'var(--text-primary)' : 'var(--text-muted)' }}>{step.label}</h4>
                    <p>{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {showMap && settings?.store_lat && settings?.store_lng && customerLat && customerLng && (
            <div style={{ marginTop: 24, marginBottom: 24 }}>
              <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Truck size={18} color="var(--primary)" /> 
                ติดตามสถานะคนขับ (Live)
              </h4>
              <DeliveryMap 
                storeLat={settings.store_lat} 
                storeLng={settings.store_lng} 
                customerLat={customerLat} 
                customerLng={customerLng} 
                status={order.status} 
                updatedAt={order.updatedAt} 
              />
            </div>
          )}

          {order.paymentSlipUrl && (
            <div style={{ marginTop: 20, padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
              <h4 style={{ marginBottom: 12, color: 'var(--text-primary)' }}>✅ แนบสลิปเรียบร้อยแล้ว</h4>
              <a href={order.paymentSlipUrl} target="_blank" rel="noreferrer">
                <img 
                  src={order.paymentSlipUrl} 
                  alt="Payment Slip" 
                  style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 8, objectFit: 'contain' }}
                />
              </a>
              <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>* คลิกที่รูปเพื่อดูขนาดเต็ม</p>
            </div>
          )}

          {order.status === 'awaiting_payment' && order.paymentMethod === 'promptpay' && settings?.promptpay_number && (
            <div style={{ marginTop: 24, padding: 24, background: 'var(--bg-lighter)', borderRadius: 16, border: '1px solid var(--accent)', textAlign: 'center' }}>
              <h3 style={{ marginBottom: 16, color: 'var(--accent)' }}>แสกนเพื่อชำระเงินยอดใหม่</h3>
              <div style={{ background: 'white', padding: 16, display: 'inline-block', borderRadius: 16, marginBottom: 16 }}>
                 <QRCodeCanvas value={generatePayload(settings.promptpay_number, { amount: order.total })} size={200} />
              </div>
              <p style={{ fontWeight: 'bold', fontSize: '1.4rem', marginBottom: 4 }}>฿{order.total}</p>
              <p style={{ color: 'var(--text-muted)' }}>พร้อมเพย์: {settings.promptpay_number}</p>
              
              <div style={{ marginTop: 24, textAlign: 'left' }}>
                <label style={{ display: 'block', marginBottom: 12, fontWeight: 600 }}>อัพโหลดสลิปโอนเงิน *</label>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  id="tracking-payment-slip"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      const file = e.target.files[0];
                      setPaymentSlip(file);
                      if (paymentSlipPreview) URL.revokeObjectURL(paymentSlipPreview);
                      setPaymentSlipPreview(URL.createObjectURL(file));
                    }
                  }} 
                  style={{ display: 'none' }}
                />
                
                <label 
                  htmlFor="tracking-payment-slip" 
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
                    overflow: 'hidden',
                    marginBottom: '16px'
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

                <button 
                  onClick={handleUploadSlip} 
                  className="btn-primary" 
                  disabled={!paymentSlip || isUploading}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '14px' }}
                >
                  {isUploading ? 'กำลังส่ง...' : <><CheckCircle size={18} /> แจ้งชำระเงินและยืนยัน</>}
                </button>
              </div>
            </div>
          )}

          <div className="tracking-items">
            <h3>รายการสั่งซื้อ</h3>
            {order.items.map((item, i) => {
              const optPrice = (item.selectedOptions || []).reduce((sum, o) => sum + (o.price || 0), 0);
              const unitPrice = item.menuItem.price + optPrice;
              return (
                <div className="tracking-item" key={`${item.menuItem.id}-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>{item.customName || item.menuItem.name} x{item.quantity}</span>
                    <span>฿{unitPrice * item.quantity}</span>
                  </div>
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '8px' }}>
                      {item.selectedOptions.map(o => `${o.choiceName}${o.price > 0 ? ` (+${o.price})` : ''}`).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="tracking-total">
              <span>รวม</span>
              <span className="price">{order.status === 'pending_pricing' ? 'รอประเมิน' : `฿${order.total}`}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
