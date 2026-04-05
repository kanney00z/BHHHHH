import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, UtensilsCrossed, FolderOpen, Settings, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminSidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Hamburger Button intentionally removed; relying exclusively on iOS-style BottomTabBar */}

      {/* Mobile Overlay */}
      <div 
        className={`mobile-menu-overlay ${isOpen ? 'open' : ''}`}
        onClick={closeMenu}
      />

      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingLeft: 8 }}>
          <h3 style={{ margin: 0 }}>จัดการร้าน</h3>
          <button className="mobile-close-btn" onClick={closeMenu}>
            <X size={24} />
          </button>
        </div>

        <NavLink to="/admin" end onClick={closeMenu} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} /> แดชบอร์ด
        </NavLink>
        <NavLink to="/admin/orders" onClick={closeMenu} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <ShoppingCart size={18} /> ออเดอร์
        </NavLink>
        <NavLink to="/admin/menu" onClick={closeMenu} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <UtensilsCrossed size={18} /> จัดการเมนู
        </NavLink>
        <NavLink to="/admin/categories" onClick={closeMenu} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <FolderOpen size={18} /> หมวดหมู่
        </NavLink>
        <NavLink to="/admin/banners" onClick={closeMenu} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <span style={{ fontSize: '1.2rem', marginRight: '8px', lineHeight: 1, display: 'flex' }}>✨</span> ตกแต่งหน้าร้าน
        </NavLink>
        <div style={{ flex: 1 }} />
        <NavLink to="/admin/promotions" onClick={closeMenu} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>🎟️</span> โค้ดส่วนลด
        </NavLink>
        <NavLink to="/admin/settings" onClick={closeMenu} className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={18} /> ตั้งค่าร้าน
        </NavLink>
        
        <button 
          onClick={handleSignOut}
          className="admin-nav-item" 
          style={{ marginTop: 'auto', background: 'none', border: 'none', color: 'var(--danger)', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <LogOut size={18} /> ออกจากระบบ
        </button>
      </aside>
    </>
  );
}
