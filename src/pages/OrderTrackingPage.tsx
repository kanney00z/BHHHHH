import { useParams, useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Clock, ChefHat, Truck, PartyPopper } from 'lucide-react';
import { useOrders } from '../context/OrderContext';

const steps = [
  { key: 'confirmed', label: 'ยืนยันแล้ว', desc: 'ร้านอาหารได้รับออเดอร์แล้ว', icon: Check },
  { key: 'preparing', label: 'กำลังเตรียม', desc: 'เชฟกำลังปรุงอาหาร', icon: ChefHat },
  { key: 'delivering', label: 'กำลังจัดส่ง', desc: 'ไรเดอร์กำลังนำส่ง', icon: Truck },
  { key: 'delivered', label: 'จัดส่งแล้ว', desc: 'อาหารมาถึงแล้ว!', icon: PartyPopper },
];

function getStepIndex(status: string) {
  const idx = steps.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const { getOrder } = useOrders();
  const navigate = useNavigate();
  const order = orderId ? getOrder(orderId) : undefined;

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

  const currentIdx = getStepIndex(order.status);

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
              <span className="price">฿{order.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
