import React, { useState, useMemo } from 'react';
import { useOrders } from '../../context/OrderContext';
import { Order } from '../../types';
import { Grid, Utensils, CheckCircle, Clock, Banknote, X, Info, Receipt, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSidebar from '../../components/AdminSidebar';

import { useSettings } from '../../context/SettingsContext';

export default function AdminTables() {
  const { orders, updateOrderStatus, loading } = useOrders();
  const { settings, updateSettings } = useSettings();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  // Dynamic Total Tables from Realtime Settings
  const totalTables = settings?.total_tables || 20;

  const handleAddTable = async () => {
    const newTotal = totalTables + 1;
    await updateSettings({ total_tables: newTotal });
  };

  const handleRemoveTable = async () => {
    if (totalTables > 1) {
      const newTotal = totalTables - 1;
      await updateSettings({ total_tables: newTotal });
      if (selectedTable === totalTables) {
        setSelectedTable(null);
      }
    }
  };
  
  // Calculate specific table states based on active dine-in orders
  // Table Status logic:
  // 1. Available (No active orders) -> Green
  // 2. Waiting (Orders that are pending, confirmed, preparing) -> Yellow/Orange
  // 3. Eating (Orders that are delivering or delivered) -> Blue
  // 4. Billing (Orders that are awaiting_payment) -> Purple
  const tableData = useMemo(() => {
    const data: Record<number, { status: 'available'|'waiting'|'eating'|'billing', activeOrders: Order[] }> = {};
    
    // Initialize tables as available
    for (let i = 1; i <= totalTables; i++) {
        data[i] = { status: 'available', activeOrders: [] };
    }

    // Process only dine_in orders that are not cancelled or completed payment (if standard flow: completed is marked, but we use delivered/payment depending on backend logic. Let's assume active means not cancelled and not 'completed' - since there's no completed status, we assume 'awaiting_payment' is billing, and 'delivered' is eating but if they finish they just cancel/delete the order? Actually, there must be a way to clear the table by deleting or updating status. We will check.)
    // Active orders exclude 'cancelled'
    const activeDineInOrders = orders.filter(o => o.orderType === 'dine_in' && o.status !== 'cancelled' && o.status !== 'completed' && o.tableNumber);

    activeDineInOrders.forEach(o => {
        const tNum = parseInt(o.tableNumber || '', 10);
        if (tNum >= 1 && tNum <= totalTables) {
            data[tNum].activeOrders.push(o);
        }
    });

    // Determine status per table based on its active orders
    for (let i = 1; i <= totalTables; i++) {
        const tOrders = data[i].activeOrders;
        if (tOrders.length === 0) continue;

        // If any order is awaiting payment, table is Billing
        if (tOrders.some(o => o.status === 'awaiting_payment')) {
            data[i].status = 'billing';
        } 
        // If any order is pending/confirmed/preparing, table is Waiting
        else if (tOrders.some(o => ['pending', 'confirmed', 'preparing', 'pending_pricing'].includes(o.status))) {
            data[i].status = 'waiting';
        } 
        // Else it means orders are delivering/delivered, people are Eating
        else {
            data[i].status = 'eating';
        }
    }

    return data;
  }, [orders, totalTables]);

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
        
        @media (max-width: 768px) {
            .table-manager-container { flex-direction: column; }
            .table-panel {
                position: fixed; inset: 0; z-index: 9999; max-width: 100%; height: 100vh;
                border-radius: 0; box-shadow: none; border: none;
                padding-bottom: 100px;
                background: var(--bg-primary);
            }
        }
      `}</style>
      
      {/* Main Grid Area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
               <Grid className="text-accent" /> แผนผังโต๊ะอาหารเสมือน (Interactive KDS)
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--bg-glass-border)' }}>
                <button 
                    onClick={handleRemoveTable}
                    disabled={totalTables <= 1}
                    style={{ background: 'transparent', border: 'none', color: totalTables <= 1 ? 'var(--text-secondary)' : 'var(--text-primary)', cursor: totalTables <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                >
                    <Minus size={18} />
                </button>
                <span style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '1.2rem', minWidth: '40px', textAlign: 'center' }}>
                    {totalTables} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>โต๊ะ</span>
                </span>
                <button 
                    onClick={handleAddTable}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                >
                    <Plus size={18} />
                </button>
            </div>
        </div>
        
        <div className="table-stats">
            <div className="stat-item"><div className="stat-dot bg-available"></div> ว่าง</div>
            <div className="stat-item"><div className="stat-dot bg-waiting"></div> รอกิน / กำลังทำอาหาร</div>
            <div className="stat-item"><div className="stat-dot bg-eating"></div> กำลังเสิร์ฟ / กำลังกิน</div>
            <div className="stat-item"><div className="stat-dot bg-billing"></div> รอเช็คบิล</div>
        </div>

        <div className="table-grid">
            {Object.keys(tableData).map((key) => {
                const tableNum = parseInt(key);
                const info = tableData[tableNum];
                
                let icon = <CheckCircle size={28} className="c-available" style={{ opacity: 0.8 }} />;
                if (info.status === 'waiting') icon = <Clock size={28} className="c-waiting" />;
                if (info.status === 'eating') icon = <Utensils size={28} className="c-eating" />;
                if (info.status === 'billing') icon = <Banknote size={28} className="c-billing" />;

                return (
                    <div 
                        key={tableNum} 
                        className={`table-card t-${info.status} ${selectedTable === tableNum ? 'selected' : ''}`}
                        onClick={() => setSelectedTable(tableNum)}
                    >
                        {info.activeOrders.length > 0 && <div className="orders-badge">{info.activeOrders.length}</div>}
                        <div className="table-number">{tableNum}</div>
                        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', width: 48, height: 48, borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            {icon}
                        </div>
                        <div className={`table-status-label c-${info.status}`} style={{ background: 'var(--bg-primary)', padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                            {info.status === 'available' ? 'ว่าง' : 
                             info.status === 'waiting' ? 'รอกิน' : 
                             info.status === 'eating' ? 'กำลังกิน' : 'รอจ่าย'}
                        </div>
                    </div>
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px dashed var(--bg-glass-border)' }}>
                                    <span style={{ fontWeight: 800 }}>รวมบิลโต๊ะที่ {selectedTable}</span>
                                    <span style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 999 }}>{selectedTableInfo.activeOrders.length} ออเดอร์ (Ticket)</span>
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
    </div>
  );
}
