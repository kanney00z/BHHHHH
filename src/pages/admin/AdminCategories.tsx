import { useState } from 'react';
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { useMenu } from '../../context/MenuContext';
import AdminSidebar from '../../components/AdminSidebar';

export default function AdminCategories() {
  const { categories, addCategory, updateCategory, deleteCategory, menuItems } = useMenu();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');

  const openAdd = () => {
    setEditId(null);
    setName('');
    setIcon('🍴');
    setShowModal(true);
  };

  const openEdit = (cat: { id: string; name: string; icon: string }) => {
    setEditId(cat.id);
    setName(cat.name);
    setIcon(cat.icon);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!name) return;
    if (editId) {
      updateCategory(editId, { name, icon });
    } else {
      addCategory({ name, icon });
    }
    setShowModal(false);
  };

  // Skip the "ทั้งหมด" category (cat-1) for management
  const manageable = categories.filter(c => c.id !== 'cat-1');

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <div className="admin-header">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
              <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                <FolderOpen size={28} />
              </div>
              จัดการหมวดหมู่
            </h1>
            <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>เพิ่ม แก้ไข ลบหมวดหมู่อาหาร</p>
          </div>
          <button className="admin-add-btn" onClick={openAdd}>
            <Plus size={18} /> เพิ่มหมวดหมู่
          </button>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ไอคอน</th>
                <th>ชื่อหมวดหมู่</th>
                <th>จำนวนเมนู</th>
                <th>การแสดงผล</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {manageable.map(cat => (
                <tr key={cat.id}>
                  <td data-label="ไอคอน" style={{ fontSize: '1.5rem' }}>{cat.icon}</td>
                  <td data-label="ชื่อหมวดหมู่" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</td>
                  <td data-label="จำนวนเมนู">{menuItems.filter(i => i.categoryId === cat.id).length} เมนู</td>
                  <td data-label="การแสดงผล">
                    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                      <input 
                        type="checkbox" 
                        checked={cat.is_active !== false}
                        onChange={(e) => updateCategory(cat.id, { is_active: e.target.checked })}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{ 
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                        backgroundColor: cat.is_active !== false ? 'var(--accent)' : 'var(--bg-glass-border)', 
                        transition: '.4s', borderRadius: '24px' 
                      }}>
                        <span style={{
                          position: 'absolute', height: '18px', width: '18px', left: cat.is_active !== false ? '22px' : '3px', bottom: '3px',
                          backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      </span>
                    </label>
                  </td>
                  <td data-label="การจัดการ">
                    <button className="admin-action-btn" onClick={() => openEdit(cat)}>
                      <Pencil size={14} />
                    </button>
                    <button className="admin-action-btn delete" onClick={() => deleteCategory(cat.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editId ? <Pencil size={24} color="var(--accent)" /> : <Plus size={24} color="var(--accent)" />}
                {editId ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
              </h2>
              <div className="form-group">
                <label>ไอคอน (Emoji)</label>
                <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="🍔" style={{ fontSize: '1.5rem' }} />
              </div>
              <div className="form-group">
                <label>ชื่อหมวดหมู่</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อหมวดหมู่" />
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                <button className="btn-primary" onClick={handleSave}>บันทึก</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
