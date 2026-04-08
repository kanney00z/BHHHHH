import React, { useState, useEffect, useMemo } from 'react';
import { useOrders } from '../../context/OrderContext';
import { ChefHat, Maximize2, Minimize2, Clock, CheckCircle, BellRing, CookingPot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminKitchen() {
  const { orders, updateOrderStatus, loading } = useOrders();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for accurate exact elapsed time calculation
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen toggler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Filter only orders that the kitchen needs to care about
  // Sort them so oldest confirmed orders come first
  const kitchenOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === 'confirmed' || o.status === 'preparing')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders]);

  // Handle Kitchen Sound on new Confirmed order
  // When the array of "confirmed" orders length increases, play a sound
  const [previousConfirmedCount, setPreviousConfirmedCount] = useState(0);
  useEffect(() => {
    const currentConfirmedCount = kitchenOrders.filter((o) => o.status === 'confirmed').length;
    if (currentConfirmedCount > previousConfirmedCount) {
      // Play a short synth beep
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch A5
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        }
      } catch (err) {
        // audio play failed (usually user needs to interact first)
      }
    }
    setPreviousConfirmedCount(currentConfirmedCount);
  }, [kitchenOrders, previousConfirmedCount]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-secondary)' }}>
        <ChefHat className="animate-spin" size={48} style={{ opacity: 0.5 }} />
      </div>
    );
  }

  // Helper to format wait time
  const getWaitInfo = (createdAt: string) => {
    const elapsedSeconds = Math.floor((currentTime.getTime() - new Date(createdAt).getTime()) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes > 15) return { text: `${minutes} นาที`, class: 'wait-critical' }; // Red
    if (minutes > 10) return { text: `${minutes} นาที`, class: 'wait-warning' }; // Orange/Yellow
    if (minutes > 0) return { text: `${minutes} นาที`, class: 'wait-normal' };
    return { text: 'เพิ่งมาถึง', class: 'wait-new' }; // Green
  };

  return (
    <div className={`kitchen-board ${isFullscreen ? 'fullscreen' : ''}`}>
      <style>{`
        .kitchen-board {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: calc(100vh - 100px);
          background: #0f172a; /* Custom dark theme for kitchen */
          color: #f1f5f9;
          margin: -20px; /* Counteract default admin padding */
          padding: 20px;
          border-radius: var(--radius-lg);
          font-family: var(--font-primary);
        }
        .kitchen-board.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          margin: 0;
          border-radius: 0;
          z-index: 9999;
        }
        .kitchen-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 1px solid #1e293b;
          margin-bottom: 20px;
        }
        .kitchen-header-title {
          font-size: 1.5rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #f8fafc;
        }
        .kds-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          flex: 1;
          align-items: start;
        }
        .ticket-card {
          background: #1e293b;
          border-radius: var(--radius-md);
          border: 2px solid transparent;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }
        .ticket-card.confirmed { border-color: #3b82f6; }
        .ticket-card.preparing { border-color: #f59e0b; }
        
        .ticket-header {
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0,0,0,0.2);
        }
        .ticket-id { font-size: 1.1rem; font-weight: 800; font-family: monospace; }
        .ticket-table {
          background: #3b82f6;
          color: white;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: bold;
        }
        .ticket-time {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 4px 12px;
        }
        .wait-critical { color: #ef4444; animation: pulse 2s infinite; }
        .wait-warning { color: #f59e0b; }
        .wait-normal { color: #94a3b8; }
        .wait-new { color: #22c55e; }
        
        .ticket-items { padding: 16px; flex: 1; }
        .ticket-item {
          display: flex;
          margin-bottom: 12px;
          font-size: 1.1rem;
          border-bottom: 1px dashed #334155;
          padding-bottom: 8px;
        }
        .ticket-item:last-child { border-bottom: none; }
        .item-qty {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #334155;
          border-radius: 4px;
          font-weight: bold;
          margin-right: 12px;
          flex-shrink: 0;
        }
        .item-details { flex: 1; }
        .item-name { font-weight: 600; display: block; margin-bottom: 4px; }
        .item-options { font-size: 0.85rem; color: #94a3b8; }
        .item-note { 
          font-size: 0.85rem; 
          color: #ef4444; 
          background: rgba(239, 68, 68, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 4px;
          display: inline-block;
        }

        .ticket-footer {
          padding: 0;
          display: grid;
        }
        .kds-btn {
          width: 100%;
          border: none;
          padding: 16px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .kds-btn-start {
          background: #3b82f6; color: white;
        }
        .kds-btn-start:hover { background: #2563eb; }
        
        .kds-btn-done {
          background: #22c55e; color: white;
        }
        .kds-btn-done:hover { background: #16a34a; }
        
        .empty-kds {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #64748b;
          text-align: center;
        }
      `}</style>
      
      <div className="kitchen-header">
        <div className="kitchen-header-title">
          <ChefHat size={28} color="#3b82f6" /> 
          <div>
            ครัว <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'normal', marginLeft: '12px' }}>ออเดอร์ต้องทำ: {kitchenOrders.length}</span>
          </div>
        </div>
        <button onClick={toggleFullscreen} style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          {isFullscreen ? <><Minimize2 size={18} /> ออกจากเต็มจอ</> : <><Maximize2 size={18} /> ขยายเต็มจอ</>}
        </button>
      </div>

      <div className="kds-grid">
        <AnimatePresence>
          {kitchenOrders.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-kds">
              <CookingPot size={64} style={{ opacity: 0.2, marginBottom: 16 }} />
              <h3 style={{ fontSize: '1.5rem', margin: 0 }}>ไม่มีออเดอร์ค้าง</h3>
              <p>ตอนนี้สบายใจได้ รอรับออเดอร์ใหม่ครับ!</p>
            </motion.div>
          ) : (
            kitchenOrders.map((order) => {
              const waitInfo = getWaitInfo(order.createdAt);
              return (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  className={`ticket-card ${order.status}`}
                >
                  <div className="ticket-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="ticket-id">#{order.id.slice(-4).toUpperCase()}</span>
                      {order.tableNumber ? (
                        <span className="ticket-table">โต๊ะ {order.tableNumber}</span>
                      ) : (
                        <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{order.customerName}</span>
                      )}
                    </div>
                    <div className={`ticket-time ${waitInfo.class}`}>
                      <Clock size={16} /> {waitInfo.text}
                    </div>
                  </div>

                  <div className="ticket-items">
                    {order.items.map((item, index) => (
                      <div key={index} className="ticket-item">
                        <div className="item-qty">{item.quantity}</div>
                        <div className="item-details">
                          <span className="item-name">
                            {item.menuItem?.name || item.customName || 'ไม่ระบุชื่อ'}
                          </span>
                          
                          {/* Options */}
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <div className="item-options">
                              {item.selectedOptions.map((opt, i) => (
                                <div key={i}>
                                  + {opt.optionName}: {opt.choiceName}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Special Note */}
                          {item.note && (
                            <div className="item-note">
                              📝 {item.note}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="ticket-footer">
                    {order.status === 'confirmed' ? (
                      <button 
                        className="kds-btn kds-btn-start"
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                      >
                        <CookingPot size={20} /> เริ่มทำอาหาร
                      </button>
                    ) : (
                      <button 
                        className="kds-btn kds-btn-done"
                        onClick={() => updateOrderStatus(order.id, 'delivering')}
                      >
                        <CheckCircle size={20} /> เสร็จแล้ว / พร้อมเสิร์ฟ!
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
