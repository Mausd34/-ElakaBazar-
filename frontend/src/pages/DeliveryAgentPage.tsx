import { useEffect, useState } from 'react'
import { api } from '../api'

type Job = { id: string; order_number: string; status: string; total: string; customer_name: string; customer_phone: string; address_line: string; area_name: string; shop_name: string; items: { product_name: string; quantity: string; unit: string }[] }

const labels: Record<string,string> = { READY: 'দোকান থেকে প্রস্তুত', PICKED_UP: 'ডেলিভারি এজেন্ট নিয়েছেন', OUT_FOR_DELIVERY: 'পথে আছে' }

export default function DeliveryAgentPage() {
  const [jobs,setJobs] = useState<Job[]>([])
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const [busy,setBusy] = useState('')
  async function load() {
    try { const r = await api.get('/delivery/jobs/'); setJobs(r.data.results || r.data); setError('') }
    catch { setError('ডেলিভারি কাজ দেখতে Delivery Agent account দিয়ে লগইন করুন।') }
  }
  useEffect(() => { load() }, [])
  async function act(job: Job, action: 'pickup'|'complete') {
    setBusy(job.id); setError(''); setMessage('')
    try { await api.post(`/delivery/jobs/${job.id}/${action}/`); setMessage(`${job.order_number} আপডেট হয়েছে।`); await load() }
    catch (e:any) { setError(e.response?.data?.detail || 'কাজটি সম্পন্ন করা যায়নি।') }
    finally { setBusy('') }
  }
  return <main className="page">
    <div className="page-heading"><div><span className="eyebrow">DELIVERY WORKSPACE</span><h1>আমার ডেলিভারি</h1><p className="muted">আপনার নামে বরাদ্দ অর্ডার সংগ্রহ ও পৌঁছে দিন।</p></div><button className="secondary-btn" onClick={load}>Refresh</button></div>
    {error && <div className="notice" role="alert">{error}</div>}
    {message && <div className="success-notice" role="status">{message}</div>}
    {jobs.length === 0 && !error && <div className="empty"><h3>এখন কোনো ডেলিভারি কাজ নেই</h3><p>Admin আপনাকে অর্ডার বরাদ্দ করলে এখানে দেখা যাবে।</p></div>}
    {jobs.map(job => <article className="workflow-card" key={job.id}>
      <div className="workflow-card-head"><div><b>{job.order_number}</b><span className="status-pill">{labels[job.status] || job.status}</span></div><strong>৳{Number(job.total).toFixed(2)}</strong></div>
      <div className="workflow-grid"><div><small>গ্রাহক</small><b>{job.customer_name || 'Customer'}</b><span>{job.customer_phone}</span></div><div><small>ডেলিভারি ঠিকানা</small><b>{job.address_line}</b><span>{job.area_name}</span></div><div><small>দোকান</small><b>{job.shop_name}</b></div></div>
      <div className="workflow-items">{job.items.map((item,i)=><span key={i}>{item.product_name} × {item.quantity} {item.unit}</span>)}</div>
      <div className="workflow-actions">
        {job.status === 'READY' && <button className="primary-btn" disabled={busy===job.id} onClick={()=>act(job,'pickup')}>অর্ডার সংগ্রহ করেছি</button>}
        {job.status === 'PICKED_UP' && <button className="primary-btn" disabled={busy===job.id} onClick={()=>act(job,'complete')}>গ্রাহকের কাছে পৌঁছে দিয়েছি</button>}
      </div>
    </article>)}
  </main>
}
