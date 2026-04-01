import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import { MapPin, Phone, Download, CheckCircle, Store, Truck, ShoppingBag } from 'lucide-react';
import { Order } from '../types';

interface DigitalReceiptProps {
  order: Order;
  restaurantName?: string;
}

export default function DigitalReceipt({ order, restaurantName = 'YumDash' }: DigitalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveReceipt = async () => {
    if (!receiptRef.current) return;
    setIsSaving(true);
    try {
      // Use html2canvas to capture the div
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, // High resolution
        backgroundColor: null, // Keep transparent background if any
      });
      
      // Convert to image URL
      const image = canvas.toDataURL('image/png');
      
      // Trigger download
      const link = document.createElement('a');
      link.href = image;
      link.download = `yumdash-receipt-${order.id}.png`;
      link.click();
    } catch (err) {
      console.error('Error saving receipt:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกใบเสร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const formattedDate = new Date(order.createdAt).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const getOrderIcon = () => {
    if (order.orderType === 'delivery') return <Truck size={20} />;
    if (order.orderType === 'dine_in') return <Store size={20} />;
    return <ShoppingBag size={20} />;
  };

  const getOrderTypeName = () => {
    if (order.orderType === 'delivery') return 'จัดส่งเดลิเวอรี';
    if (order.orderType === 'dine_in') return 'ทานที่ร้าน';
    return 'รับกลับบ้าน';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
      {/* The Printable Area */}
      <div 
        ref={receiptRef}
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'var(--bg-card)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          fontFamily: 'var(--font-sans)',
          position: 'relative',
        }}
      >
        {/* Receipt Header */}
        <div style={{ background: 'var(--accent-gradient)', padding: '32px 24px', color: 'white', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
            {order.status === 'awaiting_payment' ? 'รอชำระเงิน' : order.status === 'pending_pricing' ? 'รอประเมินราคา' : 'ชำระเงินแล้ว'}
          </div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: 800 }}>{restaurantName}</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>E-Receipt • ใบสั่งซื้อดิจิทัล</p>
        </div>

        {/* Squiggly divider (using css masking or simple border) */}
        <div style={{ height: '20px', background: 'var(--bg-primary)', position: 'relative', marginTop: '-10px', borderRadius: '20px 20px 0 0' }}></div>

        {/* Order Info */}
        <div style={{ padding: '0 24px 16px 24px', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>วันที่ & เวลา</p>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{formattedDate}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>รหัสออเดอร์</p>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>#{order.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>

          {/* Customer Info */}
          <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600, color: 'var(--accent)' }}>
              {getOrderIcon()} {getOrderTypeName()}
            </div>
            <p style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontWeight: 500 }}>{order.customerName}</p>
            <p style={{ margin: '0 0 4px 0', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Phone size={14} /> {order.customerPhone}
            </p>
            {order.orderType === 'delivery' && order.customerAddress && (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                <MapPin size={14} style={{ flexShrink: 0, marginTop: 3 }} /> 
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {order.customerAddress.split('\nจุดสังเกต: ')[1] ? `จุดสังเกต: ${order.customerAddress.split('\nจุดสังเกต: ')[1]}` : 'ตามจุดปักหมุด'}
                </span>
              </p>
            )}
          </div>

          {/* Items List */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', fontSize: '0.9rem', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>รายการสั่งซื้อ</h4>
            {order.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ flex: 1, paddingRight: '12px' }}>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {item.quantity}x {item.isCustomItem ? item.customName : item.menuItem.name}
                  </p>
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '8px', borderLeft: '2px solid var(--border)' }}>
                      {item.selectedOptions.map((opt, i) => (
                        <div key={i}>• {opt.choiceName}</div>
                      ))}
                    </div>
                  )}
                  {item.note && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--accent)' }}>* {item.note}</p>
                  )}
                </div>
                {/* Custom items price may be uncalculated */}
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.isCustomItem ? 'รอประเมิน' : `฿${(item.menuItem.price + (item.selectedOptions?.reduce((sum, opt) => sum + opt.price, 0) || 0)) * item.quantity}`}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ borderTop: '2px dashed var(--border)', paddingTop: '16px' }}>
            {order.deliveryFee !== undefined && order.deliveryFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <span>ค่าจัดส่ง</span>
                <span>฿{order.deliveryFee}</span>
              </div>
            )}
            {order.discountAmount !== undefined && order.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--success)', fontSize: '0.9rem' }}>
                <span>ส่วนลด {order.promoCode && `(${order.promoCode})`}</span>
                <span>-฿{order.discountAmount}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', background: 'var(--bg-primary)', padding: '12px 16px', borderRadius: '12px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>รวมทั้งหมด</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>
                {order.status === 'pending_pricing' ? 'รอเรฟราคา' : `฿${order.total}`}
              </span>
            </div>
          </div>

          {/* Footer QR */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '32px', paddingBottom: '16px' }}>
            <QRCodeCanvas value={order.id} size={80} bgColor={"#ffffff"} fgColor={"#1d1d1f"} level={"L"} />
            <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>สแกนเพื่อตรวจสอบสถานะออเดอร์</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button 
        onClick={saveReceipt}
        disabled={isSaving}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '16px 32px',
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: isSaving ? 'not-allowed' : 'pointer',
          boxShadow: 'var(--shadow-md)',
          transition: 'transform 0.2s',
          transform: isSaving ? 'scale(0.98)' : 'scale(1)',
          width: '100%',
          maxWidth: '380px',
          justifyContent: 'center',
        }}
      >
        {isSaving ? (
          'กำลังบันทึกภาพ...'
        ) : (
          <>
            <Download size={20} /> บันทึกใบเสร็จ (Save to Gallery)
          </>
        )}
      </button>
    </div>
  );
}
