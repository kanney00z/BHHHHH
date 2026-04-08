import { useState, useRef, MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { DollarSign, ShoppingCart, TrendingUp, Users, QrCode, LayoutDashboard, Download, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
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
  const [qrTableNumber, setQrTableNumber] = useState('');
  const orderUrl = qrTableNumber.trim() ? `${window.location.origin}/?table=${encodeURIComponent(qrTableNumber.trim())}` : window.location.origin;

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
      (o.status === 'completed' || o.status === 'delivered' || o.status === 'delivering' || o.status === 'preparing' || o.status === 'confirmed')
    );
    const total = dayOrders.reduce((sum, o) => sum + o.total, 0);
    return { 
      label: date.split('-').slice(1).join('/'), // MM/DD
      total, 
      count: dayOrders.length 
    };
  });

  const maxDailySale = Math.max(...salesByDay.map(s => s.total), 1);

  // ----- Top Selling Items -----
  const topSellingItems = (() => {
    const counts: Record<string, { count: number; name: string; revenue: number }> = {};
    orders.forEach(o => {
      if (o.status !== 'cancelled') {
        o.items.forEach(i => {
          const key = i.menuItem.id;
          if (!counts[key]) {
            counts[key] = { count: 0, name: i.menuItem.name, revenue: 0 };
          }
          counts[key].count += i.quantity;
          counts[key].revenue += i.quantity * i.menuItem.price;
        });
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  })();

  const handleExportCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer Name', 'Phone', 'Items', 'Total', 'Status', 'Payment Method'];
    const rows = orders.map(o => {
      return [
        o.id,
        new Date(o.createdAt).toLocaleString('th-TH'),
        `"${o.customerName}"`,
        o.customerPhone,
        `"${o.items.map(i => `${i.menuItem.name} x${i.quantity}`).join(', ')}"`,
        o.total,
        o.status,
        o.paymentMethod
      ].join(',');
    });
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `yumdash_sales_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Download size={18} /> Export CSV
            </button>
            <button className="btn-primary" onClick={() => setShowQR(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <QrCode size={18} /> สร้าง QR Code ร้าน
            </button>
          </div>
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

        {/* --- Business Analytics Section --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: 40, marginTop: 10 }}>
          {/* Chart */}
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border-hover)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px', color: 'var(--text-primary)' }}>
              ยอดขายย้อนหลัง 7 วัน
            </h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={salesByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} tickFormatter={value => `฿${value}`} />
                  <RechartsTooltip 
                    cursor={{ fill: 'var(--bg-primary)', opacity: 0.4 }}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                    formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, 'ยอดขาย']}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="var(--accent)" name="ยอดขาย" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Selling Items */}
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--glass-border-hover)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px', color: 'var(--text-primary)' }}>
              <Award size={20} color="var(--accent)" /> เมนูยอดฮิต (Top 5)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topSellingItems.map((item, idx) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: idx === 0 ? 'var(--accent-glow)' : 'var(--bg-primary)', color: idx === 0 ? 'var(--accent)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>จำนวน: {item.count} จาน</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                    ฿{item.revenue.toLocaleString()}
                  </div>
                </div>
              ))}
              {topSellingItems.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>ยังไม่มีข้อมูลยอดขาย</div>
              )}
            </div>
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
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, color: 'var(--text-primary)', fontWeight: 600 }}>สร้าง QR Code สำหรับโต๊ะ (ระบุเบอร์หรือเว้นว่าง):</label>
            <input 
              type="text" 
              placeholder="เช่น 1 หรือ VIP-01" 
              value={qrTableNumber} 
              onChange={e => setQrTableNumber(e.target.value)}
              style={{ 
                width: '100%', 
                maxWidth: '200px', 
                padding: '10px 14px', 
                fontSize: '1.05rem', 
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxShadow: '0 0 0 2px var(--accent-glow)'
              }}
            />
          </div>
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
