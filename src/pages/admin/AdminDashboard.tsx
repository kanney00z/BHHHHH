import { useState, useRef, MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { DollarSign, ShoppingCart, TrendingUp, Users, QrCode, LayoutDashboard } from 'lucide-react';
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

  // ----- Analytics Data for Last 7 Days -----
  const last7Days = Array.from({length: 7}).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i)); // Past 7 days to today
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  });

  const salesByDay = last7Days.map(date => {
    const dayOrders = orders.filter(o => 
      o.createdAt.startsWith(date) && 
      (o.status === 'delivered' || o.status === 'delivering' || o.status === 'preparing' || o.status === 'confirmed')
    );
    const total = dayOrders.reduce((sum, o) => sum + o.total, 0);
    return { 
      label: date.split('-').slice(1).join('/'), // MM/DD
      total, 
      count: dayOrders.length 
    };
  });

  const maxDailySale = Math.max(...salesByDay.map(s => s.total), 1);

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
        <div className="admin-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
              <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                <LayoutDashboard size={28} />
              </div>
              แดชบอร์ด
            </h1>
            <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>ภาพรวมร้านอาหารของคุณ</p>
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

        {/* --- Business Analytics Chart --- */}
        <div style={{ marginBottom: 40, marginTop: 10, background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border-hover)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px', color: 'var(--text-primary)' }}>
            ยอดขายย้อนหลัง 7 วัน <span style={{fontSize:'0.9rem', color: 'var(--text-muted)'}}>(ไม่รวมออเดอร์ที่ถูกยกเลิก)</span>
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '200px', gap: '8px', paddingTop: '20px' }}>
            {salesByDay.map((day, idx) => {
              const heightPct = Math.max((day.total / maxDailySale) * 100, 2); // At least 2% to show the bar
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', position: 'relative' }}>
                  {/* Tooltip-like value */}
                  <div style={{ 
                    position: 'absolute', 
                    top: `calc(${100 - heightPct}% - 24px)`, 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    color: 'var(--accent)', 
                    opacity: day.total > 0 ? 1 : 0.5 
                  }}>
                    ฿{day.total.toLocaleString()}
                  </div>
                  
                  {/* The Bar */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', padding: '0 10%' }}>
                    <div style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      background: day.total > 0 ? 'var(--accent-gradient)' : 'var(--bg-primary)',
                      borderRadius: '8px 8px 0 0',
                      transition: 'height 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
                      boxShadow: day.total > 0 ? 'var(--shadow-glow)' : 'none'
                    }}></div>
                  </div>
                  
                  {/* X-axis Label */}
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {day.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(135deg, var(--text-primary), var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ออเดอร์ล่าสุด</h2>
        </div>
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
