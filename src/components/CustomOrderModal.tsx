import { useState } from 'react';
import { ChefHat } from 'lucide-react';
import Modal from './Modal';
import { useCart } from '../context/CartContext';
import { MenuItem } from '../types';

interface CustomOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomOrderModal({ isOpen, onClose }: CustomOrderModalProps) {
  const [customName, setCustomName] = useState('');
  const [note, setNote] = useState('');
  const { addItem } = useCart();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    // Create a dummy MenuItem
    const customMenuItem: MenuItem = {
      id: 'custom-' + Date.now().toString(),
      name: 'เมนูสั่งตามใจ: ' + customName.trim(),
      description: note.trim() ? `หมายเหตุ: ${note}` : 'รอร้านประเมินราคา',
      price: 0,
      image: '',
      categoryId: 'custom',
      available: true
    };
    
    // Add to cart with isCustomItem flag
    addItem(customMenuItem, [], '', true);
    
    // Reset and close
    setCustomName('');
    setNote('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✨ สั่งเมนูตามใจคุณ">
      <div style={{ padding: '0 20px 20px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: '0.9rem' }}>
          พิมพ์ชื่อเมนูอาหารที่คุณต้องการได้เลย (เช่น ข้าวผัดกะเพราเนื้อ ไข่ดาวไม่สุก) 
          <br /><span style={{ color: 'var(--warning)', fontWeight: 600 }}>*ค่าอาหารจะเริ่มต้นที่ 0 บาท ทางร้านจะรวมยอดและประเมินราคาสุทธิให้อีกครั้งหลังจากได้รับออเดอร์ครับ</span>
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>ชื่อเมนูที่ต้องการสั่ง</label>
            <input 
              type="text" 
              placeholder="เช่น เส้นหมี่น้ำใส พิเศษหมู" 
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>รายละเอียดเพิ่มเติม (ถ้ามี)</label>
            <textarea 
              placeholder="ไม่ใส่ผักชล, เผ็ดน้อย, หวานน้อย..." 
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'none' }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', marginTop: '8px' }}>
            <ChefHat size={18} /> เพิ่มลงตะกร้า (รอประเมินราคา)
          </button>
        </form>
      </div>
    </Modal>
  );
}
