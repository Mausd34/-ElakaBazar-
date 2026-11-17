import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'

type Shop = { id:number; name:string; area_name:string; address:string; phone:string; status:string }
type Order = { id:string; order_number:string; status:string; total:string; customer_name:string; customer_phone:string; shop_name:string; address_line:string; area_name:string; delivery_agent:string|null; delivery_agent_name:string|null }
type Agent = { id:string; full_name:string; username:string; phone:string }
type Stats = { shops_total:number; shops_pending:number; orders_total:number; orders_active:number; orders_delivered:number; customers:number; shopkeepers:number; delivery_agents:number; gross_sales:string }

export default function AdminDashboardPage() {
  const [stats,setStats] = useState<Stats|null>(null)
  const [shops,setShops] = useState<Shop[]>([])
  const [orders,setOrders] = useState<Order[]>([])
  const [agents,setAgents] = useState<Agent[]>([])
  const [categories,setCategories] = useState<any[]>([])
  const [product,setProduct] = useState({name:'',name_bn:'',unit:'kg',category:'',image_url:''})
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const [busy,setBusy] = useState('')
  async function load() {
    try {
      const [s,sh,o,a,c] = await Promise.all([api.get('/admin/overview/'),api.get('/admin/shops/'),api.get('/admin/orders/'),api.get('/admin/delivery-agents/'),api.get('/categories/')])
      setStats(s.data); setShops(sh.data.results||sh.data); setOrders(o.data.results||o.data); setAgents(a.data.results||a.data); setCategories(c.data.results||c.data)
      if (!product.category && (c.data.results||c.data).length) setProduct(p=>({...p,category:String((c.data.results||c.data)[0].id)}))
      setError('')
    } catch { setError('Admin dashboard দেখতে staff/admin account দিয়ে লগইন করুন।') }
  }
  useEffect(()=>{load()},[])
  async function shopAction(shop:Shop, action:'approve'|'reject'|'suspend') {
    setBusy(String(shop.id)); setError(''); setMessage('')
    try { await api.post(`/admin/shops/${shop.id}/${action}/`); setMessage(`${shop.name}: ${action} সম্পন্ন হয়েছে।`); await load() }
    catch(e:any) { setError(e.response?.data?.detail || 'Shop status পরিবর্তন করা যায়নি।') }
    finally { setBusy('') }
  }
  async function assign(order:Order, agent:string) {
    if (!agent) return
    setBusy(order.id); setError(''); setMessage('')
    try { await api.post(`/admin/orders/${order.id}/assign/`,{agent}); setMessage(`${order.order_number} delivery agent-কে বরাদ্দ হয়েছে।`); await load() }
    catch(e:any) { setError(e.response?.data?.detail || 'ডেলিভারি বরাদ্দ করা যায়নি।') }
    finally { setBusy('') }
  }
  async function addProduct(e:FormEvent) {
    e.preventDefault(); setBusy('product'); setError(''); setMessage('')
    try { await api.post('/admin/products/',{...product,category:Number(product.category)}); setMessage('Catalogue-এ নতুন পণ্য যোগ হয়েছে।'); setProduct(p=>({...p,name:'',name_bn:'',image_url:''})); await load() }
    catch(e:any) { setError(e.response?.data?.detail || 'পণ্য যোগ করা যায়নি।') }
    finally { setBusy('') }
  }
  return <main className="page">
    <div className="page-heading"><div><span className="eyebrow">PLATFORM CONTROL</span><h1>Admin Dashboard</h1><p className="muted">দোকান অনুমোদন, অর্ডার বরাদ্দ ও পণ্য catalogue পরিচালনা করুন।</p></div><button className="secondary-btn" onClick={load}>Refresh</button></div>
    {error && <div className="notice" role="alert">{error}</div>}{message && <div className="success-notice" role="status">{message}</div>}
    {stats && <section className="admin-stats">{[['মোট দোকান',stats.shops_total],['অনুমোদনের অপেক্ষায়',stats.shops_pending],['মোট অর্ডার',stats.orders_total],['চলমান অর্ডার',stats.orders_active],['ডেলিভারি সম্পন্ন',stats.orders_delivered],['গ্রাহক',stats.customers],['দোকানদার',stats.shopkeepers],['ডেলিভারি এজেন্ট',stats.delivery_agents],['সম্পন্ন বিক্রি',`৳${Number(stats.gross_sales).toFixed(2)}`]].map(([label,value])=><div key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}</section>}
    <section className="workflow-panel"><div className="section-head"><h2>দোকান অনুমোদন</h2><span className="muted">{shops.filter(s=>s.status==='PENDING').length} pending</span></div>
      {shops.filter(s=>s.status==='PENDING').map(shop=><article className="workflow-card compact" key={shop.id}><div><b>{shop.name}</b><p>{shop.area_name} · {shop.address} · {shop.phone}</p></div><div className="workflow-actions"><button className="primary-btn" disabled={busy===String(shop.id)} onClick={()=>shopAction(shop,'approve')}>Approve</button><button className="secondary-btn" disabled={busy===String(shop.id)} onClick={()=>shopAction(shop,'reject')}>Reject</button></div></article>)}
      {shops.every(s=>s.status!=='PENDING') && <p className="muted">কোনো pending shop নেই।</p>}
    </section>
    <section className="workflow-panel"><div className="section-head"><h2>অর্ডার ও ডেলিভারি বরাদ্দ</h2><span className="muted">{orders.length} orders</span></div>
      {orders.filter(o=>!['DELIVERED','REJECTED','CANCELLED'].includes(o.status)).map(order=><article className="workflow-card compact" key={order.id}><div className="workflow-card-head"><div><b>{order.order_number}</b><span className="status-pill">{order.status}</span></div><strong>৳{Number(order.total).toFixed(2)}</strong></div><p>{order.customer_name} · {order.customer_phone} · {order.shop_name}</p><p>{order.address_line}, {order.area_name}</p><label className="assign-control">Delivery agent<select value={order.delivery_agent||''} disabled={busy===order.id} onChange={e=>assign(order,e.target.value)}><option value="">এজেন্ট নির্বাচন করুন</option>{agents.map(agent=><option key={agent.id} value={agent.id}>{agent.full_name||agent.username} ({agent.phone||agent.username})</option>)}</select></label>{order.delivery_agent_name && <small>Assigned: {order.delivery_agent_name}</small>}</article>)}
    </section>
    <section className="workflow-panel"><h2>নতুন Catalogue Product</h2><form className="admin-product-form" onSubmit={addProduct}><label>Product name (English)<input required value={product.name} onChange={e=>setProduct(p=>({...p,name:e.target.value}))}/></label><label>পণ্যের নাম (বাংলা)<input value={product.name_bn} onChange={e=>setProduct(p=>({...p,name_bn:e.target.value}))}/></label><label>Unit<input required value={product.unit} onChange={e=>setProduct(p=>({...p,unit:e.target.value}))}/></label><label>Category<select required value={product.category} onChange={e=>setProduct(p=>({...p,category:e.target.value}))}>{categories.map(c=><option key={c.id} value={c.id}>{c.name_bn||c.name}</option>)}</select></label><label>Image URL (optional)<input type="url" value={product.image_url} onChange={e=>setProduct(p=>({...p,image_url:e.target.value}))}/></label><button className="primary-btn" disabled={busy==='product'||!categories.length}>Catalogue-এ যোগ করুন</button></form></section>
  </main>
}
