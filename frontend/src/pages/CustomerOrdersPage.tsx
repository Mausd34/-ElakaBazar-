import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

type Order = {
  id: string; order_number: string; shop_name: string; address_line: string; area_name: string
  subtotal: string; delivery_fee: string; total: string; payment_method: string; payment_status: string
  status: string; created_at: string
  items: Array<{ product_name: string; unit: string; quantity: string; unit_price: string; line_total: string }>
  history: Array<{ status: string; changed_by_name: string; note: string; created_at: string }>
}
const statusLabels: Record<string, string> = {
  PLACED: 'অর্ডার করা হয়েছে', ACCEPTED: 'দোকান অর্ডার গ্রহণ করেছে', PREPARING: 'পণ্য প্রস্তুত হচ্ছে',
  READY: 'ডেলিভারির জন্য প্রস্তুত', PICKED_UP: 'ডেলিভারি এজেন্ট সংগ্রহ করেছেন',
  OUT_FOR_DELIVERY: 'ডেলিভারির পথে', DELIVERED: 'ডেলিভারি সম্পন্ন', REJECTED: 'অর্ডার বাতিল',
  CANCELLED: 'অর্ডার বাতিল',
}
const dateText = (value: string) => new Date(value).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [selected, setSelected] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.get('/orders/').then(response => setOrders(response.data.results || response.data))
      .catch(() => setError('অর্ডার দেখতে লগইন করুন।'))
      .finally(() => setLoading(false))
  }, [])
  async function openOrder(id: string) {
    try { const response = await api.get(`/orders/${id}/`); setSelected(response.data) }
    catch { setError('অর্ডারের বিস্তারিত লোড করা যায়নি।') }
  }
  return <main className="page">
    <div className="page-heading"><div><span className="eyebrow">ORDER HISTORY</span><h1>আমার অর্ডার</h1></div><Link className="text-link" to="/">বাজারে ফিরে যান →</Link></div>
    {error && <div className="notice">{error} <Link to="/login">লগইন</Link></div>}
    {loading && <p>অর্ডার লোড হচ্ছে…</p>}
    {!loading && !error && orders.length === 0 && <div className="empty"><h3>এখনো কোনো অর্ডার নেই</h3><p>আপনার প্রথম বাজারটি আজই করুন।</p><Link className="primary-btn" to="/">পণ্য দেখুন</Link></div>}
    <div className="orders-layout">
      <section className="orders-list">{orders.map(order => <button className={`order-summary-card ${selected?.id === order.id ? 'selected' : ''}`} key={order.id} onClick={() => openOrder(order.id)}>
        <span><b>{order.order_number}</b><small>{dateText(order.created_at)}</small></span>
        <span className="status-pill">{statusLabels[order.status] || order.status}</span>
        <strong>৳{Number(order.total).toFixed(2)}</strong>
      </button>)}</section>
      {selected && <section className="order-detail-card">
        <div className="page-heading"><div><span className="eyebrow">ORDER DETAILS</span><h2>{selected.order_number}</h2></div><span className="status-pill">{statusLabels[selected.status] || selected.status}</span></div>
        <p className="muted">{selected.shop_name} · {selected.address_line}, {selected.area_name}</p>
        <h3>পণ্যের তালিকা</h3>
        {selected.items.map((item, index) => <div className="order-item-row" key={index}><span>{item.product_name} <small>× {item.quantity} {item.unit}</small></span><b>৳{Number(item.line_total).toFixed(2)}</b></div>)}
        <div className="order-total-row"><span>পণ্যের মূল্য</span><b>৳{Number(selected.subtotal).toFixed(2)}</b></div>
        <div className="order-total-row"><span>ডেলিভারি চার্জ</span><b>৳{Number(selected.delivery_fee).toFixed(2)}</b></div>
        <div className="order-total-row grand-total"><span>সর্বমোট</span><b>৳{Number(selected.total).toFixed(2)}</b></div>
        <h3>অর্ডারের অগ্রগতি</h3>
        <ol className="status-timeline">{selected.history.map((event, index) => <li key={index}><span className="timeline-dot" /><div><b>{statusLabels[event.status] || event.status}</b><small>{dateText(event.created_at)}</small>{event.note && <p>{event.note}</p>}</div></li>)}</ol>
      </section>}
    </div>
  </main>
}
