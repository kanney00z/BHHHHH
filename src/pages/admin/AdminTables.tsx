import React, { useState, useMemo } from 'react';
import { useOrders } from '../../context/OrderContext';
import { Order } from '../../types';
import { Grid, Utensils, CheckCircle, Clock, Banknote, X, Info, Receipt, Plus, Minus, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSidebar from '../../components/AdminSidebar';
import { QRCodeCanvas } from 'qrcode.react';

import { useSettings } from '../../context/SettingsContext';

export default function AdminTables() {
  const { orders, updateOrderStatus, loading } = useOrders();
  const { settings, updateSettings } = useSettings();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [printingTableQR, setPrintingTableQR] = useState<number | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [localLayout, setLocalLayout] = useState<any[]>([]);

  React.useEffect(() => {
    if (settings) {
      if (!settings.table_layout || settings.table_layout.length === 0) {
        const fallback = [];
        for (let i = 1; i <= (settings.total_tables || 20); i++) {
           fallback.push({ id: String(i), label: String(i), x: ((i-1) % 5) * 140, y: Math.floor((i-1) / 5) * 140, type: 'square' });
        }
        setLocalLayout(fallback);
      } else {
        setLocalLayout(settings.table_layout);
      }
    }
  }, [settings]);

  const handleSaveLayout = async () => {
    await updateSettings({ table_layout: localLayout });
    setIsEditMode(false);
  };

  const handleAddTable = (type: 'square' | 'circle') => {
    const newId = String(localLayout.length + 1);
    setLocalLayout([...localLayout, { id: newId, label: newId, x: 0, y: 0, type }]);
  };

  const handlePrintTableQR = (tableNum: number) => {
    setPrintingTableQR(tableNum);
    setTimeout(() => {
      window.print();
      // On iOS Safari, window.print() is non-blocking. If we remove the element
      // too quickly, it prints a blank page. We clean it up safely using afterprint
      // or a long fallback timeout.
      const handleAfterPrint = () => {
        setPrintingTableQR(null);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      setTimeout(() => setPrintingTableQR(null), 60000);
    }, 500); // Give QR canvas 500ms to render properly
  };

  // Calculate specific table states based on active dine-in orders
  const tableData = useMemo(() => {
    const data: Record<number, { status: 'available'|'waiting'|'eating'|'billing', activeOrders: Order[] }> = {};
    
    // Initialize tables as available from localLayout
    localLayout.forEach(table => {
        const i = parseInt(table.label, 10);
        if (!isNaN(i)) {
          data[i] = { status: 'available', activeOrders: [] };
        }
    });

    const activeTableOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed' && o.tableNumber);

    activeTableOrders.forEach(o => {
        const tNum = parseInt(o.tableNumber || '', 10);
        if (data[tNum]) {
            data[tNum].activeOrders.push(o);
        }
    });

    // Determine status per table based on its active orders
    localLayout.forEach(table => {
        const i = parseInt(table.label, 10);
        if (isNaN(i) || !data[i]) return;
        
        const tOrders = data[i].activeOrders;
        if (tOrders.length === 0) return;

        if (tOrders.some(o => o.status === 'awaiting_payment')) {
            data[i].status = 'billing';
        } else if (tOrders.some(o => ['pending', 'confirmed', 'preparing', 'pending_pricing'].includes(o.status))) {
            data[i].status = 'waiting';
        } else {
            data[i].status = 'eating';
        }
    });

    return data;
  }, [orders, localLayout]);

  // Handle side panel close
  const closePanel = () => setSelectedTable(null);

  if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Grid className="animate-spin" size={48} style={{ opacity: 0.5, color: 'var(--text-secondary)' }} />
        </div>
      );
  }

  // Find info for selected table
  const selectedTableInfo = selectedTable !== null ? tableData[selectedTable] : null;

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <div className="table-manager-container">
          <style>{`
        .table-manager-container {
            display: flex;
            gap: 24px;
            position: relative;
            min-height: calc(100vh - 140px);
        }

        /* Stats Header */
        .table-stats {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: 16px 24px;
            display: flex;
            gap: 24px;
            align-items: center;
            border: 1px solid var(--bg-glass-border);
            margin-bottom: 24px;
            flex-wrap: wrap;
        }
        .stat-item { display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 0.95rem; }
        .stat-dot { width: 12px; height: 12px; border-radius: 50%; }
        
        .c-available { color: #10b981; }
        .c-waiting { color: #f59e0b; }
        .c-eating { color: #3b82f6; }
        .c-billing { color: #8b5cf6; }
        
        .bg-available { background: #10b981; }
        .bg-waiting { background: #f59e0b; }
        .bg-eating { background: #3b82f6; }
        .bg-billing { background: #8b5cf6; }

        /* Grid */
        .table-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
            gap: 16px;
            flex: 1;
            align-content: start;
        }

        .table-card {
            aspect-ratio: 1;
            border-radius: var(--radius-lg);
            border: 2px solid var(--bg-glass-border);
            background: var(--bg-secondary);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
            box-shadow: var(--shadow-sm);
        }
        .table-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: rgba(255,255,255,0.2); }
        .table-card.selected { transform: translateY(-4px) scale(0.95); ring: 2px solid white; }

        .table-number { font-size: 2rem; font-weight: 800; z-index: 1; font-family: monospace; }
        .table-status-label { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; z-index: 1; margin-top: 4px; }
        
        /* Interactive BG based on status */
        .table-card::before {
            content: ''; position: absolute; inset: 0; opacity: 0.15; transition: opacity 0.3s;
        }
        .table-card.t-available::before { background: #10b981; }
        .table-card.t-waiting::before { background: #f59e0b; }
        .table-card.t-eating::before { background: #3b82f6; }
        .table-card.t-billing::before { background: #8b5cf6; }
        
        /* Make text pop when active */
        .table-card.t-waiting, .table-card.t-eating, .table-card.t-billing {
            border-color: transparent;
        }
        .table-card.t-waiting { background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.5); }
        .table-card.t-eating { background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.5); }
        .table-card.t-billing { background: rgba(139, 92, 246, 0.15); border-color: rgba(139, 92, 246, 0.5); }

        .orders-badge {
            position: absolute; top: 8px; right: 8px; 
            background: var(--text-primary); color: var(--bg-primary);
            font-size: 0.75rem; font-weight: 800;
            width: 20px; height: 20px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
        }

        /* Overview Panel */
        .table-panel {
            width: 100%;
            max-width: 400px;
            background: var(--bg-secondary);
            border-left: 1px solid var(--bg-glass-border);
            border-radius: var(--radius-lg);
            padding: 24px;
            box-shadow: -10px 0 30px rgba(0,0,0,0.1);
            position: sticky;
            top: 24px;
            height: calc(100vh - 140px);
            overflow-y: auto;
        }

        .map-canvas-area {
            position: relative;
            background: var(--bg-primary);
            border: 2px dashed var(--bg-glass-border);
            border-radius: var(--radius-lg);
            overflow: hidden;
            background-image: radial-gradient(var(--bg-glass-border) 1px, transparent 1px);
            background-size: 20px 20px;
            width: 100%;
            height: 600px;
            margin-top: 16px;
            overflow: auto;
        }

        .map-table {
            position: absolute;
            background: var(--bg-secondary);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: var(--shadow-sm);
            border: 2px solid var(--bg-glass-border);
            cursor: pointer;
            transition: box-shadow 0.2s, border-color 0.2s;
            user-select: none;
        }

        .map-table:hover { box-shadow: var(--shadow-md); border-color: rgba(255,255,255,0.2); }
        .map-table.selected { border-color: white !important; box-shadow: 0 0 0 2px white, var(--shadow-md); }
        
        /* Edit mode specific */
        .map-table.editing { cursor: grab; }
        .map-table.editing:active { cursor: grabbing; }

        .type-square { border-radius: 12px; width: 100px; height: 100px; }
        .type-circle { border-radius: 50%; width: 110px; height: 110px; }
        .type-rectangle { border-radius: 12px; width: 160px; height: 100px; }

        @media (max-width: 768px) {
            .table-manager-container { flex-direction: column; }
            .table-panel {
                position: fixed; inset: 0; z-index: 9999; max-width: 100%; height: 100vh;
                border-radius: 0; box-shadow: none; border: none;
                padding-bottom: 100px;
                background: var(--bg-primary);
            }
        }

        }
      `}</style>
      
      {/* Main Area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
               <Grid className="text-accent" /> แผนผังโต๊ะอาหาร (Floor Plan)
            </h1>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {isEditMode ? (
                    <>
                        <button onClick={() => handleAddTable('square')} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--bg-glass-border)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Plus size={16}/> สี่เหลี่ยม
                        </button>
                        <button onClick={() => handleAddTable('circle')} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--bg-glass-border)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Plus size={16}/> วงกลม
                        </button>
                        <button onClick={handleSaveLayout} style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            บันทึกผังร้าน
                        </button>
                    </>
                ) : (
                    <button onClick={() => setIsEditMode(true)} style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        แก้ไขผังร้าน (Edit Layout)
                    </button>
                )}
            </div>
        </div>
        
        <div className="table-stats">
            <div className="stat-item"><div className="stat-dot bg-available"></div> ว่าง</div>
            <div className="stat-item"><div className="stat-dot bg-waiting"></div> รอกิน / กำลังทำอาหาร</div>
            <div className="stat-item"><div className="stat-dot bg-eating"></div> กำลังเสิร์ฟ / กำลังกิน</div>
            <div className="stat-item"><div className="stat-dot bg-billing"></div> รอเช็คบิล</div>
            {isEditMode && <div className="stat-item" style={{color: 'var(--accent)', fontWeight: 'bold', marginLeft: 'auto'}}>💡 ลากเพื่อย้ายตำแหน่งของโต๊ะได้เลย</div>}
        </div>

        <div className="map-canvas-area">
            {localLayout.map((table) => {
                const tableNum = parseInt(table.label);
                const info = tableNum && tableData[tableNum] ? tableData[tableNum] : { status: 'available', activeOrders: [] };
                
                let icon = <CheckCircle size={24} className="c-available" style={{ opacity: 0.8 }} />;
                if (info.status === 'waiting') icon = <Clock size={24} className="c-waiting" />;
                if (info.status === 'eating') icon = <Utensils size={24} className="c-eating" />;
                if (info.status === 'billing') icon = <Banknote size={24} className="c-billing" />;

                return (
                    <motion.div 
                        key={table.id}
                        drag={isEditMode}
                        dragMomentum={false}
                        onDragEnd={(_, info) => {
                            if (!isEditMode) return;
                            setLocalLayout(prev => prev.map(t => t.id === table.id ? { ...t, x: t.x + info.offset.x, y: t.y + info.offset.y } : t));
                        }}
                        style={{ x: table.x, y: table.y }}
                        className={`map-table type-${table.type} t-${info.status} ${selectedTable === tableNum && !isEditMode ? 'selected' : ''} ${isEditMode ? 'editing' : ''}`}
                        onClick={() => {
                            if (!isEditMode && tableNum) setSelectedTable(tableNum);
                        }}
                    >
                        {isEditMode && (
                           <button onClick={(e) => {
                               e.stopPropagation();
                               setLocalLayout(prev => prev.filter(t => t.id !== table.id));
                           }} style={{ position: 'absolute', top: -8, right: -8, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', zIndex: 10 }}>×</button>
                        )}
                        {!isEditMode && info.activeOrders.length > 0 && <div className="orders-badge" style={{top: -8, right: -8}}>{info.activeOrders.length}</div>}
                        
                        <div className="table-number" style={{ fontSize: table.type === 'circle' ? '1.8rem' : '1.5rem'}}>{table.label}</div>
                        
                        {!isEditMode && (
                            <>
                                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', width: 36, height: 36, borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    {icon}
                                </div>
                                <div className={`table-status-label c-${info.status}`} style={{ background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: 999, fontSize: '0.65rem', marginTop: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                    {info.status === 'available' ? 'ว่าง' : 
                                     info.status === 'waiting' ? 'รอกิน' : 
                                     info.status === 'eating' ? 'กำลังกิน' : 'รอจ่าย'}
                                </div>
                            </>
                        )}
                    </motion.div>
                );
            })}
        </div>
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {selectedTable !== null && selectedTableInfo && (
            <motion.div 
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                className="table-panel"
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'var(--accent)', color: 'white', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>
                            {selectedTable}
                        </div> 
                        ข้อมูลโต๊ะ
                    </h2>
                    <button onClick={closePanel} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={24} />
                    </button>
                </div>

                <button 
                    onClick={() => handlePrintTableQR(selectedTable)}
                    style={{ width: '100%', padding: '12px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 24, boxShadow: '0 4px 12px rgba(255,45,85,0.2)' }}
                >
                    <QrCode size={20} /> พิมพ์ QR Code สั่งอาหาร (โต๊ะ {selectedTable})
                </button>

                {selectedTableInfo.activeOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                        <CheckCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <h3>โต๊ะว่าง</h3>
                        <p>สามารถรับลูกค้าใหม่เข้าโต๊ะนี้ได้</p>
                    </div>
                ) : (
                    <div>
                        <div style={{ marginBottom: 24, padding: '12px 16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-md)', color: '#3b82f6', fontWeight: 600 }}>
                            📌 มีการสั่งอาหาร {selectedTableInfo.activeOrders.length} บิล
                        </div>

                        <div>
                            {/* Merge all items into a single bill list visually */}
                            <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--bg-glass-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, paddingBottom: 12, borderBottom: '1px dashed var(--bg-glass-border)', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontWeight: 800 }}>รวมบิลโต๊ะที่ {selectedTable}</span>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {Array.from(new Set(selectedTableInfo.activeOrders.map(o => o.orderType || 'dine_in'))).map(type => (
                                                <span key={type} style={{ 
                                                    fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px',
                                                    background: type === 'dine_in' ? 'rgba(59, 130, 246, 0.15)' : type === 'takeaway' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                                                    color: type === 'dine_in' ? '#3b82f6' : type === 'takeaway' ? '#f59e0b' : '#a855f7',
                                                }}>
                                                    {type === 'dine_in' ? '🍽️ ทานที่ร้าน' : type === 'takeaway' ? '🛍️ สั่งกลับบ้าน' : '🛵 จัดส่ง (Delivery)'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 999 }}>{selectedTableInfo.activeOrders.length} ออเดอร์ (Ticket)</span>
                                </div>
                                
                                <div style={{ marginBottom: 16 }}>
                                    {selectedTableInfo.activeOrders.flatMap(o => o.items).map((item, idx) => (
                                        <div key={idx} style={{ marginBottom: 12, fontSize: '0.95rem', borderBottom: '1px dashed var(--bg-glass-border)', paddingBottom: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span><span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{item.quantity}x</span> {item.menuItem?.name || item.customName}</span>
                                                <span>฿{((item.menuItem?.price ?? 0) * item.quantity).toLocaleString()}</span>
                                            </div>
                                            
                                            {/* Show Selected Options like Kitchen Screen */}
                                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '24px', marginTop: '4px' }}>
                                                    {item.selectedOptions.map((opt, i) => (
                                                        <div key={i}>+ {opt.optionName}: {opt.choiceName} (+฿{opt.price || 0})</div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {/* Show Special Notes */}
                                            {item.note && (
                                                <div style={{ fontSize: '0.85rem', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px', marginTop: '4px', marginLeft: '24px', display: 'inline-block' }}>
                                                    📝 {item.note}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--bg-glass-border)', fontWeight: 'bold' }}>
                                    <span>ยอดรวมทั้งสิ้น (Grand Total):</span>
                                    <span style={{ color: 'var(--accent)', fontSize: '1.4rem' }}>
                                        ฿{selectedTableInfo.activeOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
                                    </span>
                                </div>
                                
                                {/* Status Actions for ALL orders on this table */}
                                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--bg-glass-border)' }}>
                                    
                                    {selectedTableInfo.status === 'billing' ? (
                                        <button 
                                            onClick={() => selectedTableInfo.activeOrders.forEach(o => updateOrderStatus(o.id, 'completed'))}
                                            style={{ width: '100%', padding: '10px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                                        >
                                            <Receipt size={18} /> ยืนยันลูกค้าจ่ายเงินแล้วทั้งหมด
                                        </button>
                                    ) : selectedTableInfo.status === 'eating' && selectedTableInfo.activeOrders.some(o => o.status === 'delivering') ? (
                                        <button 
                                            onClick={() => selectedTableInfo.activeOrders.filter(o => o.status === 'delivering').forEach(o => updateOrderStatus(o.id, 'delivered'))}
                                            style={{ width: '100%', padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                                        >
                                            <CheckCircle size={18} /> กดเพื่อเสิร์ฟเสร็จสิ้น (ลูกค้ากำลังกิน)
                                        </button>
                                    ) : selectedTableInfo.status === 'eating' ? (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button 
                                                onClick={() => selectedTableInfo.activeOrders.forEach(o => updateOrderStatus(o.id, 'awaiting_payment'))}
                                                style={{ flex: 1, padding: '10px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                                            >
                                                <Banknote size={18} /> ออกบิลรวม / เรียกเก็บเงิน
                                            </button>
                                            <button 
                                                onClick={() => selectedTableInfo.activeOrders.forEach(o => updateOrderStatus(o.id, 'cancelled'))}
                                                style={{ padding: '10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                                                title="ยกเลิกออเดอร์ทั้งหมด"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', marginBottom: 12 }}>
                                            สถานะ: กำลังทำอาหาร/รอกิน (ไม่สามารถเช็คบิลได้)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {printingTableQR !== null && (
          <div className="global-print-zone" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '100%', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', fontFamily: 'sans-serif', border: '2px solid #000', padding: '40px', borderRadius: '24px', width: '380px', margin: '0 auto' }}>
                  <h2 style={{ fontSize: '28px', marginBottom: '8px', marginTop: 0 }}>สแกนเพื่อสั่งอาหาร</h2>
                  <h1 style={{ fontSize: '64px', margin: '0 0 24px 0', borderBottom: '2px dashed #000', paddingBottom: '24px' }}>โต๊ะ {printingTableQR}</h1>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                      <QRCodeCanvas value={`${window.location.origin}/?table=${printingTableQR}`} size={280} level="H" />
                  </div>
                  <p style={{ marginTop: '16px', fontSize: '18px', fontWeight: 'bold' }}>ไม่ต้องเรียกพนักงาน สั่งปุ๊บเสิร์ฟปั๊บ!</p>
                  <p style={{ fontSize: '14px', color: '#555' }}>Powered by YumDash POS</p>
              </div>
          </div>
      )}
    </div>
  );
}
