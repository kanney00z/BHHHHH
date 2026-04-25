import React, { useState, useEffect } from 'react';
import { X, Check, ImageIcon } from 'lucide-react';
import { MenuItem, MenuItemOption, SelectedOption } from '../types';
import { useCart } from '../context/CartContext';

interface MenuItemModalProps {
  item: MenuItem;
  onClose: () => void;
}

export default function MenuItemModal({ item, onClose }: MenuItemModalProps) {
  const { addItem } = useCart();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, SelectedOption[]>>({});
  const [note, setNote] = useState('');
  const [added, setAdded] = useState(false);
  const [errorOpts, setErrorOpts] = useState<string[]>([]);

  useEffect(() => {
    // Initialize default options
    const initials: Record<string, SelectedOption[]> = {};
    if (item.options) {
      item.options.forEach(opt => {
        initials[opt.id] = [];
      });
    }
    setSelectedOptions(initials);
  }, [item]);

  const handleOptionToggle = (opt: MenuItemOption, choice: {id: string, name: string, price: number}) => {
    setSelectedOptions(prev => {
      const current = prev[opt.id] || [];
      const exists = current.find(c => c.choiceName === choice.name);
      
      let newSelections = [...current];

      if (exists) {
        newSelections = newSelections.filter(c => c.choiceName !== choice.name);
      } else {
        if (opt.maxSelections === 1) {
          // Replace selection (radio behavior)
          newSelections = [{ optionName: opt.name, choiceName: choice.name, price: choice.price }];
        } else {
          // Add if under limit
          if (newSelections.length < opt.maxSelections) {
            newSelections.push({ optionName: opt.name, choiceName: choice.name, price: choice.price });
          }
        }
      }

      return { ...prev, [opt.id]: newSelections };
    });
    
    // Clear error for this option group if it becomes valid
    setErrorOpts(prev => prev.filter(id => id !== opt.id));
  };

  const handleAddToCart = () => {
    // Validate required options
    const errors: string[] = [];
    if (item.options) {
      item.options.forEach(opt => {
        if (opt.isRequired && (!selectedOptions[opt.id] || selectedOptions[opt.id].length === 0)) {
          errors.push(opt.id);
        }
      });
    }

    if (errors.length > 0) {
      setErrorOpts(errors);
      return;
    }

    // Flatten selected options
    const finalSelected: SelectedOption[] = [];
    Object.values(selectedOptions).forEach(opts => {
      finalSelected.push(...opts);
    });

    addItem(item, finalSelected, note.trim());
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 600);
  };

  const totalOptionPrice = Object.values(selectedOptions).flat().reduce((sum, opt) => sum + (opt.price || 0), 0);
  const finalPrice = item.price + totalOptionPrice;

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 6000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ zIndex: 6001, maxWidth: 500, width: '90%', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg-secondary)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)' }}>
        
        <div style={{ position: 'relative' }}>
          {item.image ? (
            <img src={item.image} alt={item.name} style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block', filter: 'contrast(1.1) brightness(0.9)' }} />
          ) : (
            <div style={{ width: '100%', height: 220, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <ImageIcon size={64} opacity={0.3} />
            </div>
          )}
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16, background: 'rgba(0, 0, 0, 0.6)', 
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: 36, height: 36, display: 'flex', 
            justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(10px)'
          }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px 20px', flex: 1, overflowY: 'auto', maxHeight: '50vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>{item.name}</h2>
            <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent)' }}>฿{item.price}</div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>{item.description}</p>

          {item.options && item.options.map((opt) => (
            <div key={opt.id} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>
                  {opt.name}
                  {opt.isRequired && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-glass)', padding: '2px 8px', borderRadius: 12 }}>
                  {opt.maxSelections === 1 ? 'เลือก 1 อย่าง' : `เลือกได้สูงสุด ${opt.maxSelections} อย่าง`}
                </span>
              </div>

              {errorOpts.includes(opt.id) && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 8 }}>กรุณาเลือกอย่างน้อย 1 รายการ</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {opt.choices.map(choice => {
                  const isSelected = (selectedOptions[opt.id] || []).some(s => s.choiceName === choice.name);
                  return (
                    <label key={choice.id} 
                      onClick={(e) => {
                        e.preventDefault();
                        handleOptionToggle(opt, choice);
                      }}
                      style={{
                      display: 'flex', justifyContent: 'space-between', padding: '12px 16px',
                      borderRadius: 12, border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--bg-glass-border)'}`,
                      background: isSelected ? 'var(--accent-glow)' : 'var(--bg-card)',
                      cursor: 'pointer', transition: 'all 0.2s ease', alignItems: 'center',
                      boxShadow: isSelected ? '0 0 15px var(--accent-glow)' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: opt.maxSelections === 1 ? '50%' : 4,
                          border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-muted)'}`,
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          background: isSelected ? 'var(--accent)' : 'transparent'
                        }}>
                          {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: isSelected ? 600 : 400 }}>{choice.name}</span>
                      </div>
                      <span style={{ color: isSelected ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {choice.price > 0 ? `+฿${choice.price}` : 'ฟรี'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Special Instructions Note */}
          <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <label style={{ display: 'block', fontSize: '0.95rem', marginBottom: 8, color: 'var(--text-primary)' }}>
              📝 หมายเหตุถึงร้านอาหาร (ตัวเลือก)
            </label>
            <input 
              type="text"
              placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย, แยกน้ำ"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <button 
            className={`add-to-cart-btn ${added ? 'added' : ''}`}
            onClick={handleAddToCart}
            style={{ width: '100%', height: 48, fontSize: '1.05rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '1px' }}
          >
            {added ? (
              <><Check size={20} /> เพิ่มลงตะกร้าแล้ว</>
            ) : (
              <>เพิ่มลงตะกร้า • ฿{finalPrice}</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
