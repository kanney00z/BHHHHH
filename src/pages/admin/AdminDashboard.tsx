import { useState, useRef, MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { DollarSign, ShoppingCart, TrendingUp, Users, QrCode } from 'lucide-react';
import { useOrders } from '../../context/OrderContext';
import { useMenu } from '../../context/MenuContext';
import AdminSidebar from '../../components/AdminSidebar';
import Modal from '../../components/Modal';
import { QRCodeSVG } from 'qrcode.react';

function TiltStatCard({ children, className }: { children: React.ReactNode, className: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);
  const glareOpacity = useTransform(y, [-0.5, 0.5], [0, 0.1]);
  const glareY = useTransform(y, [-0.5, 0.5], ["0%", "100%"]);
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        position: 'relative',
        overflow: 'hidden'
      }}
      className={className}
    >
      <motion.div 
        className="glass-glare" 
        style={{ 
          opacity: glareOpacity, 
          background: 'linear-gradient(rgba(255,255,255,0.4), transparent)',
          position: 'absolute',
          top: 0, left: 0, right: 0, height: '100%',
          transform: `translateY(${glareY})`,
          zIndex: 10,
          pointerEvents: 'none',
        }} 
      />
      {children}
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { orders } = useOrders();
  const { menuItems } = useMenu();

  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const activeOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'preparing' || o.status === 'delivering').length;
  const totalItems = menuItems.length;
  
  const [showQR, setShowQR] = useState(false);
  const orderUrl = window.location.origin;

  const recentOrders = orders.slice(0, 8);

  const statusLabel: Record<string, string> = {
    confirmed: 'ยืนยันแล้ว',
    preparing: 'กำลังเตรียม',
    delivering: 'กำลังจัดส่ง',
    delivered: 'จัดส่งแล้ว',
    cancelled: 'ยกเลิก',
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <div className="admin-header">
          <div>
            <h1>📊 แดชบอร์ด</h1>
            <p>ภาพรวมร้านอาหารของคุณ</p>
          </div>
          <button className="btn-primary" onClick={() => setShowQR(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode size={18} /> สร้าง QR Code ร้าน
          </button>
        </div>

        <div className="stats-grid">
          <TiltStatCard className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon orange"><DollarSign size={22} /></div>
            </div>
            <div className="stat-value">฿{totalRevenue.toLocaleString()}</div>
            <div className="stat-label">ยอดขายทั้งหมด</div>
          </TiltStatCard>
          <TiltStatCard className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon blue"><ShoppingCart size={22} /></div>
            </div>
            <div className="stat-value">{totalOrders}</div>
            <div className="stat-label">ออเดอร์ทั้งหมด</div>
          </TiltStatCard>
          <TiltStatCard className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon green"><TrendingUp size={22} /></div>
            </div>
            <div className="stat-value">{activeOrders}</div>
            <div className="stat-label">ออเดอร์ที่ดำเนินการ</div>
          </TiltStatCard>
          <TiltStatCard className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon purple"><Users size={22} /></div>
            </div>
            <div className="stat-value">{totalItems}</div>
            <div className="stat-label">เมนูทั้งหมด</div>
          </TiltStatCard>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600, marginBottom: 16 }}>ออเดอร์ล่าสุด</h2>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>หมายเลข</th>
                <th>ลูกค้า</th>
                <th>รายการ</th>
                <th>ยอดรวม</th>
                <th>สถานะ</th>
                <th>เวลา</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id}>
                  <td data-label="หมายเลข" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>#{order.id.slice(-4)}</td>
                  <td data-label="ลูกค้า">{order.customerName}</td>
                  <td data-label="รายการ">{order.items.map(i => i.menuItem.name).join(', ')}</td>
                  <td data-label="ยอดรวม" style={{ fontWeight: 600, color: 'var(--accent)' }}>฿{order.total}</td>
                  <td data-label="สถานะ"><span className={`status-badge ${order.status}`}>{statusLabel[order.status]}</span></td>
                  <td data-label="เวลา">{new Date(order.createdAt).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <Modal isOpen={showQR} onClose={() => setShowQR(false)} title="📱 QR Code หน้าสั่งอาหาร">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ 
            background: 'white', 
            padding: '24px', 
            borderRadius: '16px', 
            display: 'inline-block',
            boxShadow: '0 0 30px rgba(0, 243, 255, 0.2)'
          }}>
            <QRCodeSVG value={orderUrl} size={256} level="H" includeMargin={true} />
          </div>
          <h3 style={{ marginTop: 24, color: 'var(--text-primary)' }}>สแกน QR Code นี้เพื่อสั่งอาหาร</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 8 }}>
            ลิงก์: <a href={orderUrl} target="_blank" rel="noreferrer" style={{color: 'var(--cyan)'}}>{orderUrl}</a>
          </p>
          <div style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--warning)', background: 'rgba(255,170,0,0.1)', padding: '12px', borderRadius: 8, textAlign: 'left', lineHeight: 1.5 }}>
            <strong>💡 หมายเหตุ (สำหรับทดสอบในเครื่อง):</strong> หากต้องการใช้มือถือสแกนเพื่อทดสอบในวงแลนเดียวกัน ให้แน่ใจว่าเข้าเว็บแอดมินด้วย IP ของเครื่อง (เช่น http://192.168.1.xxx:5173/) แทน localhost เพื่อให้ QR Code สร้างลิงก์ที่มือถือรู้จัก
          </div>
        </div>
      </Modal>
    </div>
  );
}
