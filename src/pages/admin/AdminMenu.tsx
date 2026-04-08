import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Upload, ImageIcon, X, Languages, UtensilsCrossed } from 'lucide-react';
import { useMenu } from '../../context/MenuContext';
import { MenuItem, MenuItemOption } from '../../types';
import AdminSidebar from '../../components/AdminSidebar';

const emptyForm = {
  name: '',
  nameEn: '',
  description: '',
  descriptionEn: '',
  price: 0,
  image: '',
  categoryId: '',
  available: true,
  popular: false,
  spicy: false,
  options: [] as MenuItemOption[],
};

export default function AdminMenu() {
  const { menuItems, categories, addMenuItem, updateMenuItem, deleteMenuItem } = useMenu();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isTranslating, setIsTranslating] = useState(false);

  const translateText = async (text: string): Promise<string> => {
    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=th|en`);
      const data = await res.json();
      if (data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
      return '';
    } catch (err) {
      console.error('Translation failed', err);
      return '';
    }
  };

  const handleTranslateList = async () => {
    setIsTranslating(true);
    const updates = { ...form };
    
    if (updates.name && !updates.nameEn) {
      const translatedName = await translateText(updates.name);
      if (translatedName) {
        updates.nameEn = translatedName;
      }
    }
    
    if (updates.description && !updates.descriptionEn) {
      const translatedDesc = await translateText(updates.description);
      if (translatedDesc) {
        updates.descriptionEn = translatedDesc;
      }
    }
    
    setForm(updates);
    setIsTranslating(false);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyForm, categoryId: categories[1]?.id || '' });
    setShowModal(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      nameEn: item.nameEn || '',
      description: item.description,
      descriptionEn: item.descriptionEn || '',
      price: item.price,
      image: item.image,
      categoryId: item.categoryId,
      available: item.available,
      popular: item.popular || false,
      spicy: item.spicy || false,
      options: item.options || [],
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name || !form.price) return;
    if (editId) {
      updateMenuItem(editId, form);
    } else {
      addMenuItem(form);
    }
    setShowModal(false);
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
        else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        setForm(prev => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.7) }));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = '';
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <div className="admin-header">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
              <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                <UtensilsCrossed size={28} />
              </div>
              จัดการเมนู
            </h1>
            <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>เพิ่ม แก้ไข ลบเมนูอาหาร</p>
          </div>
          <button className="admin-add-btn" onClick={openAdd}>
            <Plus size={18} /> เพิ่มเมนู
          </button>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>รูป</th>
                <th>ชื่อเมนู</th>
                <th>หมวด</th>
                <th>ราคา</th>
                <th>สถานะ</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map(item => (
                <tr key={item.id}>
                  <td data-label="รูป">
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </td>
                  <td data-label="ชื่อเมนู" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.name}
                    {item.popular && <span style={{ marginLeft: 6, fontSize: '0.7rem', background: 'rgba(255,107,53,0.2)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 8 }}>🔥</span>}
                    {item.nameEn && <span style={{display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400}}>{item.nameEn}</span>}
                  </td>
                  <td data-label="หมวด">{categories.find(c => c.id === item.categoryId)?.name || '-'}</td>
                  <td data-label="ราคา" style={{ fontWeight: 600, color: 'var(--accent)' }}>฿{item.price}</td>
                  <td data-label="สถานะ">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={item.available} onChange={() => updateMenuItem(item.id, { available: !item.available })} />
                      <span className="toggle-slider" />
                    </label>
                  </td>
                  <td data-label="การจัดการ">
                    <button className="admin-action-btn" onClick={() => openEdit(item)}>
                      <Pencil size={14} />
                    </button>
                    <button className="admin-action-btn delete" onClick={() => deleteMenuItem(item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                  {editId ? <Pencil size={24} color="var(--accent)" /> : <Plus size={24} color="var(--accent)" />}
                  {editId ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}
                </h2>
                <button 
                  className="btn-secondary" 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.85rem' }}
                  onClick={handleTranslateList}
                  disabled={isTranslating || (!form.name && !form.description)}
                  type="button"
                >
                  <Languages size={14} />
                  {isTranslating ? 'กำลังแปล...' : 'แปลภาษาอังกฤษ'}
                </button>
              </div>

              {/* Image Upload Area */}
              <div className="form-group">
                <label>📷 รูปภาพ</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                {form.image ? (
                  <div style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--bg-glass-border)',
                    marginBottom: 8,
                  }}>
                    <img
                      src={form.image}
                      alt="preview"
                      style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      display: 'flex',
                      gap: 6,
                    }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      ><Upload size={14} /></button>
                      <button
                        onClick={() => setForm({ ...form, image: '' })}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'rgba(239,68,68,0.7)', backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      ><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--bg-glass-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '32px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: dragOver ? 'rgba(255,107,53,0.05)' : 'var(--bg-secondary)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <ImageIcon size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 4 }}>
                      คลิกเลือกรูป หรือ ลากรูปมาวางที่นี่
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      รองรับ JPG, PNG, WebP
                    </p>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>ชื่อเมนู (TH)</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="เช่น ข้าวผัดหมู" />
              </div>
              <div className="form-group">
                <label>ชื่อเมนู (EN)</label>
                <input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} placeholder="e.g. Fried Rice with Pork" />
              </div>
              <div className="form-group">
                <label>รายละเอียด (TH)</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="รายละเอียดเมนู" />
              </div>
              <div className="form-group">
                <label>รายละเอียด (EN)</label>
                <textarea value={form.descriptionEn} onChange={e => setForm({ ...form, descriptionEn: e.target.value })} placeholder="Menu details" />
              </div>
              <div className="form-group">
                <label>ราคา (บาท)</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>หมวดหมู่</label>
                <select className="admin-status-select" style={{ width: '100%', padding: '12px 16px' }}
                  value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                  {categories.filter(c => c.id !== 'cat-1').map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.popular} onChange={() => setForm({ ...form, popular: !form.popular })} /> 🔥 ยอดนิยม
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.spicy} onChange={() => setForm({ ...form, spicy: !form.spicy })} /> 🌶️ เผ็ด
                </label>
              </div>

              {/* Add-ons Builder */}
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>ตัวเลือกเสริม (Options)</h3>
                  <button type="button" className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => setForm({...form, options: [...form.options, { id: `opt-${Date.now()}`, name: '', isRequired: false, maxSelections: 1, choices: [] }]})}>+ เพิ่มกลุ่มตัวเลือก</button>
                </div>
                {form.options.map((opt, optIndex) => (
                  <div key={opt.id} style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                      <input className="option-input" style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem' }} placeholder="ชื่อกลุ่ม เช่น เลือกเส้น, เพิ่มไข่" value={opt.name} onChange={e => {
                        const newOpts = [...form.options];
                        newOpts[optIndex].name = e.target.value;
                        setForm({...form, options: newOpts});
                      }} />
                      <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', gap: 4 }}><input type="checkbox" checked={opt.isRequired} onChange={e => {
                        const newOpts = [...form.options];
                        newOpts[optIndex].isRequired = e.target.checked;
                        setForm({...form, options: newOpts});
                      }} /> บังคับเลือก</label>
                      <button type="button" style={{ background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer' }} onClick={() => {
                        const newOpts = [...form.options];
                        newOpts.splice(optIndex, 1);
                        setForm({...form, options: newOpts});
                      }}><Trash2 size={16}/></button>
                    </div>
                    
                    <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
                      {opt.choices.map((choice, choiceIdx) => (
                        <div key={choice.id} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                          <input className="option-input" style={{ flex: 2, padding: '6px 10px', fontSize: '0.85rem' }} placeholder="ตัวเลือก เช่น เส้นใหญ่" value={choice.name} onChange={e => {
                            const newOpts = [...form.options];
                            newOpts[optIndex].choices[choiceIdx].name = e.target.value;
                            setForm({...form, options: newOpts});
                          }} />
                          <input className="option-input" type="number" style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem' }} placeholder="ราคา" value={choice.price || ''} onChange={e => {
                            const newOpts = [...form.options];
                            newOpts[optIndex].choices[choiceIdx].price = Number(e.target.value);
                            setForm({...form, options: newOpts});
                          }} />
                          <button type="button" style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', padding: 4 }} onClick={() => {
                            const newOpts = [...form.options];
                            newOpts[optIndex].choices.splice(choiceIdx, 1);
                            setForm({...form, options: newOpts});
                          }}><X size={14}/></button>
                        </div>
                      ))}
                      <button type="button" style={{ background: 'transparent', color: 'var(--accent)', border: 'none', fontSize: '0.8rem', padding: '4px 0', cursor: 'pointer', fontWeight: 600 }} onClick={() => {
                        const newOpts = [...form.options];
                        newOpts[optIndex].choices.push({ id: `ch-${Date.now()}-${Math.random()}`, name: '', price: 0 });
                        setForm({...form, options: newOpts});
                      }}>+ เพิ่มตัวเลือกย่อย</button>
                    </div>
                  </div>
                ))}
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
