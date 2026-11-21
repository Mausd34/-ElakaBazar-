import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

type Order = {
  id: string; order_number: string; shop_name: string; address_line: string; area_name: string
  subtotal: string; delivery_fee: string; total: string; payment_method: string; payment_status: string
  status: string; created_at: string; has_review: boolean
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
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
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
  async function submitReview(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    setReviewBusy(true)
    setReviewError('')
    setReviewMessage('')
    try {
      await api.post('/reviews/', { order: selected.id, rating: Number(reviewRating), comment: reviewComment })
      setSelected(order => order ? { ...order, has_review: true } : order)
      setOrders(current => current.map(order => order.id === selected.id ? { ...order, has_review: true } : order))
      setReviewComment('')
      setReviewMessage('আপনার রিভিউ জমা হয়েছে। ধন্যবাদ!')
    } catch (e: any) {
      setReviewError(e.response?.data?.order?.[0] || e.response?.data?.detail || 'রিভিউ জমা দেওয়া যায়নি। আবার চেষ্টা করুন।')
    } finally {
      setReviewBusy(false)
    }
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
        {selected.status === 'DELIVERED' && <section className="review-panel">
          <h3>আপনার অভিজ্ঞতা কেমন ছিল?</h3>
          {selected.has_review ? <p className="success-notice" role="status">এই অর্ডারের জন্য আপনার রিভিউ জমা হয়েছে।</p> : <form className="review-form" onSubmit={submitReview}>
            <label>রেটিং<select value={reviewRating} onChange={event => setReviewRating(event.target.value)}>{[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label>
            <label>মন্তব্য<textarea value={reviewComment} onChange={event => setReviewComment(event.target.value)} maxLength={2000} /></label>
            {reviewError && <p className="error" role="alert">{reviewError}</p>}
            <button className="primary-btn" disabled={reviewBusy}>{reviewBusy ? 'জমা হচ্ছে…' : 'রিভিউ জমা দিন'}</button>
          </form>}
          {reviewMessage && <p className="success-notice" role="status">{reviewMessage}</p>}
        </section>}
      </section>}
    </div>
  </main>
}
