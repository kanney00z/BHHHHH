import { useState, useMemo } from 'react';
import { useOrders } from '../../context/OrderContext';
import { Order, OrderStatus, CartItem } from '../../types';
import AdminSidebar from '../../components/AdminSidebar';
import Modal from '../../components/Modal';
import { Trash2, Edit2, Plus, Minus, Receipt, Printer, ShoppingCart } from 'lucide-react';
import DigitalReceipt from '../../components/DigitalReceipt';

const statusLabel: Record<string, string> = {
  pending_pricing: 'รอประเมินราคา',
  awaiting_payment: 'รอชำระเงิน',
  pending: 'รอยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  preparing: 'กำลังเตรียม',
  delivering: 'กำลังจัดส่ง',
  delivered: 'จัดส่งแล้ว',
  cancelled: 'ยกเลิก',
};

const orderTypeLabel: Record<string, string> = {
  delivery: '🛵 จัดส่ง',
  dine_in: '🍽️ ทานที่ร้าน',
  takeaway: '🛍️ รับกลับบ้าน'
};

const allStatuses = ['all', 'pending_pricing', 'awaiting_payment', 'pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'];
const statusFilterLabel: Record<string, string> = {
  all: 'ทั้งหมด',
  ...statusLabel,
};

export default function AdminOrders() {
  const { orders, updateOrderStatus, updateOrderDetails, deleteOrder } = useOrders();
  const [filter, setFilter] = useState('all');
  
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editItems, setEditItems] = useState<{ id: string; menuItemId: string; customName: string; price: number; qty: number; selectedOptions?: any[]; note?: string }[]>([]);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  const handleEditClick = (order: Order) => {
    setEditingOrder(order);
    setEditCustomerName(order.customerName);
    setEditPhone(order.customerPhone);
    setEditAddress(order.customerAddress || '');
    setEditItems(
      order.items.map((it, idx) => ({
        id: `${it.menuItem.id}-${idx}`,
        menuItemId: it.menuItem.id,
        customName: it.customName || it.menuItem.name,
        price: it.menuItem.price,
        qty: it.quantity,
        selectedOptions: it.selectedOptions,
        note: it.note,
      }))
    );
  };

  const calculateEditTotal = () => {
    return editItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    
    const newTotal = calculateEditTotal();
    const itemsUpdates = editItems.map(item => ({
      menu_item_id: item.menuItemId,
      custom_name: item.customName,
      price_at_time: item.price,
      quantity: item.qty,
      selected_options: item.selectedOptions || [],
      note: item.note || undefined,
    }));

    await updateOrderDetails(
      editingOrder.id,
      {
        customerName: editCustomerName,
        customerPhone: editPhone,
        customerAddress: editAddress,
        total: newTotal,
      },
      itemsUpdates
    );

    setEditingOrder(null);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeDelete = async () => {
    if (confirmDeleteId) {
      await deleteOrder(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handlePrintReceipt = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintingOrder(null), 1000);
    }, 150);
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <div className="admin-header">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
              <div style={{ background: 'var(--accent-glow)', color: 'var(--accent)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                <ShoppingCart size={28} />
              </div>
              จัดการออเดอร์
            </h1>
            <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>ดู แก้ไข หรือลบออเดอร์ทั้งหมดในระบบ</p>
          </div>
        </div>

        <div className="filter-tabs">
          {allStatuses.map(s => (
            <button key={s} className={`filter-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {statusFilterLabel[s]}
            </button>
          ))}
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>หมายเลข (คิว)</th>
                <th>ลูกค้า</th>
                <th>เบอร์โทร</th>
                <th>รายการ</th>
                <th>ยอดรวม</th>
                <th>สถานะ</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>ไม่มีออเดอร์</td></tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td data-label="หมายเลข (คิว)" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      #{order.id.slice(-6)}
                      {order.queueNumber && <span style={{display: 'block', fontSize: '0.8rem', color: 'var(--accent)'}}>(คิวที่ {order.queueNumber})</span>}
                      {order.status === 'pending_pricing' && (
                        <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 6px', background: 'var(--warning)', color: '#000', fontSize: '0.7rem', borderRadius: 4, fontWeight: 'bold' }}>
                          ⚠️ ต้องประเมินราคา
                        </span>
                      )}
                    </td>
                    <td data-label="ลูกค้า">
                      <div>{order.customerName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {orderTypeLabel[order.orderType || 'delivery']}
                        {order.pickupTime && order.orderType !== 'delivery' && (
                          <span style={{ marginLeft: 6, color: 'var(--accent)' }}>
                            ⏰ {order.pickupTime}
                          </span>
                        )}
                      </div>
                      {order.tableNumber && (
                        <div style={{ marginTop: 6, display: 'inline-block', background: 'var(--accent)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 2px 5px var(--accent-glow)' }}>
                          🍽️ โต๊ะ: {order.tableNumber}
                        </div>
                      )}
                    </td>
                    <td data-label="เบอร์โทร">{order.customerPhone}</td>
                    <td data-label="รายการ">
                      <ul style={{ paddingLeft: 16, margin: 0, fontSize: '0.9rem' }}>
                        {order.items.map((i, idx) => (
                          <li key={`${i.menuItem.id}-${idx}`} style={{ marginBottom: 4 }}>
                            <div>{i.customName || i.menuItem.name} x{i.quantity}</div>
                            {i.selectedOptions && i.selectedOptions.length > 0 && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                {i.selectedOptions.map((o, oidx) => (
                                  <span key={oidx} style={{ display: 'inline-block', marginRight: 6 }}>
                                    - {o.choiceName} {o.price > 0 && `(+฿${o.price})`}
                                  </span>
                                ))}
                              </div>
                            )}
                            {i.note && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: 2, fontWeight: 500 }}>
                                📝 {i.note}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td data-label="ยอดรวม" style={{ color: 'var(--text-primary)' }}>
                      <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '1.1rem' }}>฿{order.total}</div>
                      {order.orderType === 'delivery' && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div>สินค้า: ฿{order.total - (order.deliveryFee || 0)}</div>
                          <div>จัดส่ง: ฿{order.deliveryFee || 0}</div>
                        </div>
                      )}
                      {order.paymentSlipUrl && (
                        <div style={{ marginTop: 4 }}>
                          <a 
                            href={order.paymentSlipUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 4, 
                              fontSize: '0.8rem', 
                              color: 'var(--primary)', 
                              background: 'var(--primary-light)', 
                              padding: '2px 6px', 
                              borderRadius: 4,
                              textDecoration: 'none'
                            }}
                          >
                            <Receipt size={12} /> ดูสลิป
                          </a>
                        </div>
                      )}
                    </td>
                    <td data-label="สถานะ">
                      <select
                        className="admin-status-select"
                        value={order.status}
                        onChange={e => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                      >
                        {Object.entries(statusLabel).map(([val, lab]) => (
                          <option key={val} value={val}>{lab}</option>
                        ))}
                      </select>
                    </td>
                    <td data-label="การจัดการ">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          title="พิมพ์ใบเสร็จ (80mm)"
                          onClick={() => handlePrintReceipt(order)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'rgba(52, 199, 89, 0.1)', color: '#34c759',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(52, 199, 89, 0.2)')}
                          onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(52, 199, 89, 0.1)')}
                        >
                          <Printer size={18} />
                        </button>
                        <button 
                          title="แก้ไขบิล"
                          onClick={() => handleEditClick(order)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'rgba(0, 122, 255, 0.1)', color: '#007AFF',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(0, 122, 255, 0.2)')}
                          onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(0, 122, 255, 0.1)')}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          title="ลบบิล"
                          onClick={() => handleDeleteClick(order.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30',
                            border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)')}
                          onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)')}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Edit Order Modal */}
        <Modal isOpen={!!editingOrder} onClose={() => setEditingOrder(null)} title={`แก้ไขออเดอร์ #${editingOrder?.id.slice(-6)}`}>
          <div className="admin-form">
            <div className="form-group">
              <label>ชื่อลูกค้า</label>
              <input type="text" value={editCustomerName} onChange={e => setEditCustomerName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>เบอร์โทรศัพท์</label>
              <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label>ที่อยู่จัดส่ง</label>
              <textarea value={editAddress} onChange={e => setEditAddress(e.target.value)} rows={2} />
            </div>

            <h4 style={{ marginTop: '20px', marginBottom: '10px', color: 'var(--text-primary)' }}>รายการอาหาร</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-card)', padding: '15px', borderRadius: '8px' }}>
              {editItems.map((item, idx) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 40px', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    value={item.customName} 
                    onChange={e => {
                      const newItems = [...editItems];
                      newItems[idx].customName = e.target.value;
                      setEditItems(newItems);
                    }} 
                    placeholder="ชื่อรายการ"
                    style={{ padding: '6px', fontSize: '0.9rem' }}
                  />
                  <input 
                    type="number" 
                    value={item.price} 
                    onChange={e => {
                      const newItems = [...editItems];
                      newItems[idx].price = Number(e.target.value);
                      setEditItems(newItems);
                    }} 
                    placeholder="ราคา"
                    style={{ padding: '6px', fontSize: '0.9rem' }}
                  />
                  <div className="qty-controls" style={{ transform: 'scale(0.8)', transformOrigin: 'left center', margin: 0 }}>
                    <button type="button" onClick={() => {
                        const newItems = [...editItems];
                        if (newItems[idx].qty > 1) newItems[idx].qty -= 1;
                        setEditItems(newItems);
                    }}><Minus size={14} /></button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => {
                        const newItems = [...editItems];
                        newItems[idx].qty += 1;
                        setEditItems(newItems);
                    }}><Plus size={14} /></button>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    title="ลบรายการนี้"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border)', fontWeight: 'bold' }}>
                <span>ยอดรวมใหม่:</span>
                <span style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>฿{calculateEditTotal()}</span>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn-secondary" onClick={() => setEditingOrder(null)}>ยกเลิก</button>
              <button type="button" className="btn-primary" onClick={handleSaveEdit}>บันทึกการแก้ไข</button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="⚠️ ลบบิล">
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ marginBottom: 20 }}>
              <Trash2 size={48} color="var(--danger)" style={{ opacity: 0.8 }} />
            </div>
            <p style={{ fontSize: '1.1rem', marginBottom: 10 }}>คุณแน่ใจหรือไม่ว่าต้องการลบออเดอร์นี้?</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 30 }}>การลบจะไม่สามารถกู้คืนได้ และข้อมูลจะถูกลบออกจากฐานข้อมูลทันที</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>ยกเลิก</button>
              <button 
                className="btn-primary" 
                style={{ background: 'var(--danger)', color: 'white' }} 
                onClick={executeDelete}
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
}
