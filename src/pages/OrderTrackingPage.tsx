import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Clock, ChefHat, Truck, PartyPopper, CreditCard, Upload } from 'lucide-react';
import { useOrders } from '../context/OrderContext';
import { useSettings } from '../context/SettingsContext';
import { supabase } from '../lib/supabase';
import generatePayload from 'promptpay-qr';
import { QRCodeCanvas } from 'qrcode.react';

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const { getOrder, updateOrderStatus } = useOrders();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const order = orderId ? getOrder(orderId) : undefined;
  
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
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
      
      alert('อัปโหลดสลิปสำเร็จ! ร้านกำลังตรวจสอบอีกครั้งครับ');
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการอัปโหลด');
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
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>อัพโหลดสลิปโอนเงิน *</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setPaymentSlip(e.target.files[0]);
                      }
                    }} 
                    style={{ flex: 1, padding: 12, background: 'var(--surface)', borderRadius: 8, border: '1px dashed var(--border)' }}
                  />
                  <button 
                    onClick={handleUploadSlip} 
                    className="btn-primary" 
                    disabled={!paymentSlip || isUploading}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {isUploading ? 'กำลังส่ง...' : <><Upload size={18} /> แจ้งโอนเงิน</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="tracking-items">
            <h3>รายการสั่งซื้อ</h3>
            {order.items.map((item, i) => (
              <div className="tracking-item" key={`${item.menuItem.id}-${i}`}>
                <span>{item.customName || item.menuItem.name} x{item.quantity}</span>
                <span>฿{item.menuItem.price * item.quantity}</span>
              </div>
            ))}
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
