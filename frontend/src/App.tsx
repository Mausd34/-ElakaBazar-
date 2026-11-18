import { useEffect, useMemo, useState, type FormEvent } from 'react'
import axios from 'axios'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { ShoppingBasket, MapPin, Search, UserRound, ShoppingCart, Menu, Plus, Minus, Trash2, Store, Package, LogOut } from 'lucide-react'
import { api, login } from './api'

type Shop = { id:number; name:string; area_name:string; address:string; delivery_fee:string; minimum_order:string }
type Product = { id:number; shop:number; shop_name:string; product:number; product_name:string; product_name_bn:string; unit:string; image_url:string; category_name:string; price:string; stock:string }
type Cart = { id:number; shop:number|null; shop_name:string; items:{id:number;shop_product:number;product_name:string;product_name_bn:string;unit:string;price:string;quantity:string;image_url:string}[] }

function axiosStatus(error:unknown) {
  return axios.isAxiosError(error)?error.response?.status:undefined
}

function apiErrorMessage(error:unknown,fallback:string) {
  if(axios.isAxiosError(error)){
    const detail=error.response?.data?.detail
    if(typeof detail==='string') return detail
  }
  return fallback
}

function App() {
  const [area,setArea] = useState('Tongi')
  const [areas,setAreas] = useState<{id:number;name:string}[]>([])
  const [shops,setShops] = useState<Shop[]>([])
  const [products,setProducts] = useState<Product[]>([])
  const [search,setSearch] = useState('')
  const [cart,setCart] = useState<Cart|null>(null)
  const [user,setUser] = useState<any>(null)
  const [busy,setBusy] = useState(false)
  const [notice,setNotice] = useState('')
  const navigate = useNavigate()
  const areaId = areas.find(a=>a.name===area)?.id
  const categoryImages = {
    'শাকসবজি': 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
    'ডিম ও দুধ': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80',
    'ফলমূল': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=900&q=80',
    'চাল ও ডাল': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80',
    'নিত্যপণ্য': 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?auto=format&fit=crop&w=900&q=80',
    'মাছ ও মাংস': 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=900&q=80',
  }

  async function load() {
    try {
      const [a,s,p] = await Promise.all([api.get('/areas/'),api.get('/shops/'),api.get('/products/')])
      setAreas(a.data.results || a.data); setShops(s.data.results || s.data); setProducts(p.data.results || p.data)
    } catch { setNotice('API connection হয়নি। Backend চালু করে আবার চেষ্টা করুন।') }
  }
  async function refreshCart() {
    if (!localStorage.getItem('access')) return
    try { const r=await api.get('/cart/'); setCart(r.data) } catch {}
  }
  useEffect(()=>{load(); refreshCart()},[])
  useEffect(()=>{
    if (!areaId) return
    api.get('/shops/',{params:{area:areaId}}).then(r=>setShops(r.data.results||r.data)).catch(()=>{})
    api.get('/products/',{params:{area:areaId}}).then(r=>setProducts(r.data.results||r.data)).catch(()=>{})
  },[areaId])
  const visibleProducts = useMemo(()=>products.filter(p=>(`${p.product_name} ${p.product_name_bn} ${p.shop_name} ${p.category_name}`).toLowerCase().includes(search.toLowerCase())),[products,search])
  async function addToCart(p:Product) {
    if (!localStorage.getItem('access')) { navigate('/login'); return }
    setBusy(true); setNotice('')
    try {
      await api.post('/cart/',{shop_product:p.id,quantity:1}); await refreshCart(); setNotice('কার্টে যোগ হয়েছে।')
    } catch(e:any) { setNotice(e.response?.data?.detail || 'পণ্য যোগ করা যায়নি।') }
    finally {setBusy(false)}
  }
  async function clearCart() { await api.delete('/cart/'); await refreshCart() }
  async function logout() { localStorage.clear(); setCart(null); setUser(null); navigate('/') }
  const count = cart?.items.reduce((n,i)=>n+Number(i.quantity),0) || 0
  return <div>
    <header className="topbar">
      <Link to="/" className="brand"><span className="brand-icon"><ShoppingBasket size={24}/></span><span>Elaka<span>Bazar</span><small>Neighborhood grocery</small></span></Link>
      <label className="location"><MapPin size={17}/><select value={area} onChange={e=>setArea(e.target.value)}>{areas.map(a=><option key={a.id}>{a.name}</option>)}</select></label>
      <div className="searchbox"><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products or stores..."/></div>
      <nav><Link to="/shops">Stores</Link><Link to="/shopkeeper">For merchants</Link></nav>
      <Link to="/track-order" className="icon-link"><Package size={18}/><span>Track order</span></Link>
      <Link to="/login" className="icon-link"><UserRound size={19}/><span>Login</span></Link>
      <Link to="/cart" className="cart-link"><ShoppingCart size={19}/><span>Cart</span><b>{count}</b></Link>
    </header>
    {notice && <div className="notice" onClick={()=>setNotice('')}>{notice} <button>×</button></div>}
    <Routes>
      <Route path="/" element={<main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">স্থানীয় বাজারের স্মার্ট সমাধান</span>
            <h1>আপনার আশেপাশের বিশ্বস্ত দোকান থেকে তাজা পণ্য</h1>
            <p>কাছের দোকান থেকে তাজা শাকসবজি, নিত্যপ্রয়োজনীয় পণ্য ও দৈনন্দিন জিনিস সহজে অর্ডার করুন। দ্রুত ডেলিভারি, নির্ভরযোগ্য সেবা আর আধুনিক বাজারের সুবিধা একসাথে পাবেন আপনার ঘরে।</p>
            <div className="hero-actions">
              <a className="primary-btn" href="#products">এখনই বাজার করুন <ShoppingBasket size={18}/></a>
              <Link to="/shops" className="secondary-btn">দোকান দেখুন</Link>
            </div>
            <div className="trust"><span>✓ বিশ্বস্ত দোকান</span><span>✓ দ্রুত ডেলিভারি</span><span>✓ ক্যাশ অন ডেলিভারি</span></div>
          </div>
          <div className="hero-art">
            <div className="hero-circle"></div>
            <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80" alt="Fresh produce from a local market"/>
            <div className="floating-card"><b>তাজা বাজার</b><small>স্থানীয় বিক্রেতাদের কাছ থেকে</small></div>
          </div>
        </section>
        <section className="stats"><div><b>{shops.length}+</b><span>স্থানীয় দোকান</span></div><div><b>{products.length}+</b><span>পণ্য</span></div><div><b>১টি ট্যাপ</b><span>সহজ অর্ডার</span></div></section>
        <section className="section"><div className="section-head"><div><span className="eyebrow">ক্যাটাগরি অনুযায়ী</span><h2>জনপ্রিয় পণ্য</h2></div><span className="muted">দৈনন্দিন প্রয়োজনীয় জিনিস</span></div><div className="categories">{[['🥬','শাকসবজি'],['🥚','ডিম ও দুধ'],['🍎','ফলমূল'],['🍚','চাল ও ডাল'],['🧴','নিত্যপণ্য'],['🐟','মাছ ও মাংস']].map(([emoji,name])=><button className="category" key={name} onClick={()=>setSearch(name)} style={{backgroundImage:`linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.9)), url(${categoryImages[name as keyof typeof categoryImages]})`, backgroundSize:'cover', backgroundPosition:'center'}}><span>{emoji}</span><b>{name}</b></button>)}</div></section>
        <section className="section" id="products"><div className="section-head"><div><span className="eyebrow">স্থানীয় দোকান থেকে</span><h2>সেরা পণ্যসমূহ</h2></div><span className="muted">{area}</span></div><div className="product-grid">{visibleProducts.map(p=><article className="product-card" key={p.id}><div className="product-image">{p.image_url?<img src={p.image_url} alt={p.product_name}/>:<span>🛒</span>}<small>{p.category_name}</small></div><div className="product-info"><span className="muted shop-name"><Store size={13}/>{p.shop_name}</span><h3>{p.product_name_bn || p.product_name}</h3><p className="muted">{p.product_name} · {p.unit}</p><div className="product-bottom"><b>৳{Number(p.price).toFixed(2)}</b><button disabled={busy} onClick={()=>addToCart(p)} aria-label="Add to cart"><Plus size={18}/></button></div></div></article>)}</div>{visibleProducts.length===0&&<div className="empty"><Package size={32}/><h3>এখনও কোনো পণ্য পাওয়া যায়নি</h3><p>অন্য এলাকা বা পণ্য দিয়ে খুঁজে দেখুন।</p></div>}</section>
        <section className="section"><div className="section-head"><div><span className="eyebrow">আপনার আবাসনের কাছাকাছি</span><h2>আপনার এলাকার দোকান</h2></div><Link to="/shops" className="text-link">সব দোকান দেখুন →</Link></div><div className="shop-grid">{shops.map(s=><div className="shop-card" key={s.id}><div className="shop-avatar"><Store size={26}/></div><div><h3>{s.name}</h3><p className="muted">{s.area_name} · {s.address}</p><small>ডেলিভারি ৳{s.delivery_fee} · মিনিমাম ৳{s.minimum_order}</small></div></div>)}</div></section>
        <section className="section team-section">
          <div className="section-head"><div><span className="eyebrow">আমাদের পরিচয়</span><h2>আমাদের টিম</h2></div></div>
          <div className="team-grid">
            <figure className="team-member">
              <img src="/images/team-member-1.png" alt="Md. Pronay Islam"/>
              <figcaption>Md. Pronay Islam</figcaption>
            </figure>
            <figure className="team-member">
              <img src="/images/team-member-2.png" alt="Md Masud Rana"/>
              <figcaption>Md Masud Rana</figcaption>
            </figure>
          </div>
        </section>
        <section className="partner">
          <div className="partner-copy">
            <span className="eyebrow">আমাদের সঙ্গে বিকশিত হোন</span>
            <h2>আপনার দোকানকে আধুনিক স্থানীয় ব্র্যান্ডে রূপান্তর করুন।</h2>
            <p>ElakaBazar-এর সঙ্গে যুক্ত হয়ে আরও গ্রাহকের কাছে পৌঁছান এবং বিশ্বস্ত, সুবিধাজনক অনলাইন স্টোরফ্রন্টের মাধ্যমে আপনার ব্যবসা বাড়ান।</p>
            <Link className="light-btn" to="/shopkeeper">দোকান যুক্ত করুন</Link>
          </div>
          <div className="partner-visual">
            <img src="https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80" alt="Shop owner smiling in front of a local grocery store"/>
          </div>
        </section>
      </main>}/>
      <Route path="/shops" element={<main className="page"><h1>আপনার এলাকার দোকান</h1><div className="shop-grid">{shops.map(s=><div className="shop-card" key={s.id}><div className="shop-avatar"><Store/></div><div><h3>{s.name}</h3><p>{s.area_name} · {s.address}</p></div></div>)}</div></main>}/>
      <Route path="/track-order" element={<OrderTrackingPage/>}/>
      <Route path="/admin/orders" element={<AdminOrdersPage/>}/>
      <Route path="/login" element={<Login onLogin={async(u)=>{await login(u.username,u.password);await refreshCart();const profile=await api.get('/auth/me/');navigate(profile.data.role==='SHOPKEEPER'?'/shopkeeper':'/')}}/>}/>
      <Route path="/cart" element={<CartPage cart={cart} refresh={refreshCart} clear={clearCart}/>}/>
      <Route path="/shopkeeper" element={<ShopkeeperPage/>}/>
      <Route path="*" element={<main className="page"><h1>পৃষ্ঠা পাওয়া যায়নি</h1><Link to="/">হোমে ফিরুন</Link></main>}/>
    </Routes>
    <footer><div className="footer-brand">ElakaBazar</div><p>আপনার এলাকার বাজার, এখন আপনার হাতেই।</p><small>© 2026 ElakaBazar. Local shops, connected.</small></footer>
  </div>
}

function OrderTrackingPage() {
 type TrackedOrder = {
  id:string; order_number:string; tracking_number:string; status:string; created_at:string; updated_at:string;
  estimated_delivery:string|null; courier_name:string; payment_status:string; payment_method:string; total:string;
  delivery_address:{address_line:string;landmark:string;area:string;phone:string}|null;
  items:{product_name:string;unit:string;quantity:string;unit_price:string;line_total:string}[];
  shipment:{courier_name:string;tracking_number:string;shipment_status:string;shipped_at:string|null;delivered_at:string|null}|null;
  history:{status:string;previous_status:string;description:string;location:string;created_at:string}[];
 }
 const [trackingNumber,setTrackingNumber]=useState('')
 const [order,setOrder]=useState<TrackedOrder|null>(null)
 const [orders,setOrders]=useState<TrackedOrder[]>([])
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const stages = [
  {status:'PLACED',title:'Order placed',description:'We received your order.'},
  {status:'ACCEPTED',title:'Order confirmed',description:'The seller confirmed your order.'},
  {status:'PREPARING',title:'Seller processing',description:'The seller is preparing your products.'},
  {status:'READY',title:'Preparing for shipment',description:'Your order is packed and ready.'},
  {status:'PICKED_UP',title:'Shipped',description:'The courier has collected your package.'},
  {status:'OUT_FOR_DELIVERY',title:'Out for delivery',description:'The courier is on the way.'},
  {status:'DELIVERED',title:'Delivered',description:'Your order was delivered.'},
 ]
 const statusIndex = (status:string) => stages.findIndex(stage=>stage.status===status)
 async function loadPublic(number:string) {
  const clean=number.trim()
  if(!clean){setError('Enter an order or tracking number.');return}
  setLoading(true);setError('')
  try {
   const response=await api.get(`/track/${encodeURIComponent(clean)}/`)
   setOrder(response.data)
  } catch(e:any) {
   setOrder(null)
   setError(e.response?.status===404?'No order was found for this tracking number.':'Unable to load tracking details. Please try again.')
  } finally {setLoading(false)}
 }
 async function loadAccountOrders() {
  if(!localStorage.getItem('access')){setOrders([]);return}
  try {
   const response=await api.get('/orders/')
   setOrders(response.data.results||response.data)
  } catch {}
 }
 async function loadByOrderId(id:string) {
  setLoading(true);setError('')
  try {
   const response=await api.get(`/orders/${id}/tracking/`)
   setOrder(response.data)
   setTrackingNumber(response.data.tracking_number||'')
  } catch(e:any) {setError(e.response?.status===404?'Order not found.':'Unable to load order tracking.') }
  finally {setLoading(false)}
 }
 useEffect(()=>{loadAccountOrders()},[])
 useEffect(()=>{
  if(!order?.tracking_number)return
  const timer=window.setInterval(()=>loadPublic(order.tracking_number),30000)
  return ()=>window.clearInterval(timer)
 },[order?.tracking_number])
 const currentIndex=statusIndex(order?.status||'PLACED')
 return <main className="page tracking-page">
  <div className="tracking-heading"><span className="eyebrow">ORDER TRACKING</span><h1>Track your order</h1><p className="muted">Check live delivery progress with your tracking number.</p></div>
  <form className="tracking-search" onSubmit={e=>{e.preventDefault();loadPublic(trackingNumber)}}>
   <label>Tracking number<input value={trackingNumber} onChange={e=>setTrackingNumber(e.target.value)} placeholder="ELK-..." /></label>
   <button type="button" className="primary-btn" disabled={loading} onClick={()=>loadPublic(trackingNumber)}>{loading?'Checking...':'Track order'}</button>
  </form>
  {error&&<div className="dashboard-message error-message">{error}</div>}
  {orders.length>0&&<section className="tracked-orders"><h2>Your recent orders</h2><div>{orders.map(item=><button key={item.id} onClick={()=>loadByOrderId(item.id)}><b>{item.order_number}</b><span>{item.status}</span></button>)}</div></section>}
  {loading&&!order&&<div className="tracking-skeleton" aria-label="Loading tracking details"><div/><div/><div/></div>}
  {!loading&&!order&&!error&&<div className="empty"><Package size={36}/><h3>No tracking details yet</h3><p>Enter a tracking number or select one of your recent orders.</p></div>}
  {order&&<div className="tracking-layout">
   <section className="tracking-main">
    <div className="tracking-status-card"><div><span className="eyebrow">CURRENT STATUS</span><h2>{stages[Math.max(currentIndex,0)].title}</h2></div><button className="secondary-btn" onClick={()=>window.print()}>Print</button></div>
    <div className="tracking-timeline">
     {stages.map((stage,index)=>{
      const completed=index<=currentIndex
      const historyItem=order.history.find(h=>h.status===stage.status)
      return <div className={`tracking-step ${completed?'completed':''} ${index===currentIndex?'active':''}`} key={stage.status}><div className="timeline-marker">{completed?'✓':''}</div><div><h3>{stage.title}</h3><p>{stage.description}</p>{historyItem&&<small>{new Date(historyItem.created_at).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}{historyItem.location?` · ${historyItem.location}`:''}</small>}</div></div>
     })}
    </div>
   </section>
   <aside className="tracking-side">
    <section className="tracking-info-card"><h3>Order details</h3><dl><div><dt>Order number</dt><dd>{order.order_number}</dd></div><div><dt>Tracking number</dt><dd>{order.tracking_number||'Not assigned'}</dd></div><div><dt>Order date</dt><dd>{new Date(order.created_at).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</dd></div><div><dt>Estimated delivery</dt><dd>{order.estimated_delivery||'Awaiting update'}</dd></div><div><dt>Payment</dt><dd>{order.payment_status}</dd></div><div><dt>Total</dt><dd>৳{Number(order.total).toFixed(2)}</dd></div></dl></section>
    <section className="tracking-info-card"><h3>Shipment</h3><dl><div><dt>Courier</dt><dd>{order.shipment?.courier_name||order.courier_name||'To be assigned'}</dd></div><div><dt>Tracking</dt><dd>{order.shipment?.tracking_number||order.tracking_number||'Pending'}</dd></div></dl></section>
    {order.delivery_address&&<section className="tracking-info-card"><h3>Delivery address</h3><p>{order.delivery_address.address_line}{order.delivery_address.landmark?`, ${order.delivery_address.landmark}`:''}<br/>{order.delivery_address.area}<br/>{order.delivery_address.phone}</p></section>}
    <section className="tracking-info-card"><h3>Products</h3><div className="tracking-items">{order.items.map((item,index)=><div key={`${item.product_name}-${index}`}><span>{item.product_name} × {item.quantity} {item.unit}</span><b>৳{Number(item.line_total).toFixed(2)}</b></div>)}</div></section>
   </aside>
  </div>}
 </main>
}

function AdminOrdersPage() {
 type AdminOrder = {
  id:string; order_number:string; tracking_number:string; status:string; created_at:string;
  customer_name?:string; estimated_delivery:string|null; courier_name:string; payment_status:string; total:string;
  items:{product_name:string;quantity:string;line_total:string}[];
  history:{status:string;previous_status:string;description:string;location:string;created_at:string}[];
 }
 const [orders,setOrders]=useState<AdminOrder[]>([])
 const [search,setSearch]=useState('')
 const [status,setStatus]=useState('')
 const [date,setDate]=useState('')
 const [selected,setSelected]=useState<AdminOrder|null>(null)
 const [statusValue,setStatusValue]=useState('')
 const [courier,setCourier]=useState('')
 const [tracking,setTracking]=useState('')
 const [estimated,setEstimated]=useState('')
 const [message,setMessage]=useState('')
 async function load() {
  setMessage('')
  try {
   const response=await api.get('/admin/orders/',{params:{search:search||undefined,status:status||undefined,date:date||undefined}})
   setOrders(response.data.results||response.data)
  } catch(e:any) {setMessage(e.response?.status===403?'Admin account required.':'Unable to load orders.') }
 }
 useEffect(()=>{load()},[])
 async function updateStatus() {
  if(!selected||!statusValue)return
  try {
   await api.patch(`/admin/orders/${selected.id}/status/`,{status:statusValue})
   setMessage('Order status updated.')
   await load()
  } catch(e:any) {setMessage(e.response?.data?.detail||'Status update failed.') }
 }
 async function saveShipment() {
  if(!selected||!courier.trim()||!tracking.trim()) {setMessage('Courier and tracking number are required.');return}
  try {
   await api.post(`/admin/orders/${selected.id}/shipment/`,{courier_name:courier,tracking_number:tracking,estimated_delivery:estimated||null})
   setMessage('Shipment details saved.')
   await load()
  } catch(e:any) {setMessage(e.response?.data?.detail||'Shipment update failed.') }
 }
 return <main className="page admin-orders-page">
  <div className="shopkeeper-heading"><div><span className="eyebrow">ADMIN MANAGEMENT</span><h1>Order management</h1></div></div>
  {message&&<div className="dashboard-message error-message">{message}</div>}
  <div className="admin-order-filters"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order, tracking or customer"/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{['PLACED','ACCEPTED','PREPARING','READY','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','REJECTED','CANCELLED'].map(value=><option key={value} value={value}>{value}</option>)}</select><input type="date" value={date} onChange={e=>setDate(e.target.value)} /><button className="primary-btn" onClick={load}>Search</button></div>
  <div className="admin-order-layout"><section className="admin-order-table">{orders.length===0?<div className="empty"><Package size={30}/><p>No orders found.</p></div>:<div>{orders.map(order=><button key={order.id} className={`admin-order-row ${selected?.id===order.id?'selected':''}`} onClick={()=>{setSelected(order);setStatusValue(order.status);setCourier(order.courier_name||'');setTracking(order.tracking_number||'');setEstimated(order.estimated_delivery||'')}}><div><b>{order.order_number}</b><small>{new Date(order.created_at).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</small></div><b>৳{Number(order.total).toFixed(2)}</b><span className={`order-status status-${order.status.toLowerCase()}`}>{order.status}</span></button>)}</div>}</section>
  {selected&&<aside className="admin-order-detail"><h2>{selected.order_number}</h2><dl><div><dt>Tracking</dt><dd>{selected.tracking_number||'Not assigned'}</dd></div><div><dt>Payment</dt><dd>{selected.payment_status}</dd></div><div><dt>Estimated delivery</dt><dd>{selected.estimated_delivery||'Awaiting update'}</dd></div></dl><label>Status<select value={statusValue} onChange={e=>setStatusValue(e.target.value)}>{['PLACED','ACCEPTED','PREPARING','READY','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','REJECTED','CANCELLED'].map(value=><option key={value} value={value}>{value}</option>)}</select></label><button className="save-button" onClick={updateStatus}>Update status</button><div className="admin-shipment-form"><h3>Shipment</h3><label>Courier<input value={courier} onChange={e=>setCourier(e.target.value)} placeholder="Steadfast, RedX, manual"/></label><label>Tracking number<input value={tracking} onChange={e=>setTracking(e.target.value)}/></label><label>Estimated delivery<input type="date" value={estimated} onChange={e=>setEstimated(e.target.value)}/></label><button className="primary-btn" onClick={saveShipment}>Save shipment</button></div><div className="admin-history"><h3>Tracking history</h3>{selected.history.map((entry,index)=><div key={`${entry.status}-${index}`}><b>{entry.status}</b><small>{new Date(entry.created_at).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}</small><p>{entry.description||'Status updated'}{entry.location?` · ${entry.location}`:''}</p></div>)}</div></aside>}
  </div>
 </main>
}

function Login({onLogin}:{onLogin:(u:{username:string;password:string})=>void}) {
 const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState('')
 return <main className="auth-wrap"><form className="auth-card" onSubmit={async e=>{e.preventDefault();try{await onLogin({username,password})}catch{setError('লগইন হয়নি। ফোন নম্বর ও পাসওয়ার্ড যাচাই করুন।')}}}><span className="eyebrow">WELCOME BACK</span><h1>আপনার অ্যাকাউন্টে লগইন</h1><label>ফোন নম্বর / ইউজারনেম<input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="017XXXXXXXX"/></label><label>পাসওয়ার্ড<input required type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error">{error}</p>}<button className="primary-btn full">লগইন করুন</button><p className="muted">Customer demo: 01700000001 / DemoPass123!<br/>Shopkeeper demo: 01700000002 / DemoPass123!</p></form></main>
}
function CartPage({cart,refresh,clear}:{cart:Cart|null;refresh:()=>void;clear:()=>void}) {
 const [addresses,setAddresses]=useState<any[]>([]); const [areas,setAreas]=useState<any[]>([]); const [address,setAddress]=useState(''); const [message,setMessage]=useState('')
 const [area,setArea]=useState(''); const [line,setLine]=useState(''); const [phone,setPhone]=useState('')
 async function loadAddresses(){const r=await api.get('/addresses/');setAddresses(r.data.results||r.data)}
 useEffect(()=>{
   if(localStorage.getItem('access')) loadAddresses().catch((e:any)=>setMessage(e.response?.status===401?'সেশন শেষ হয়েছে। আবার লগইন করুন।':'ঠিকানা লোড করা যায়নি। আবার চেষ্টা করুন।'))
   api.get('/areas/').then(r=>setAreas(r.data.results||r.data)).catch(()=>{})
 },[])
 const subtotal=cart?.items.reduce((s,i)=>s+Number(i.price)*Number(i.quantity),0)||0
 async function addAddress(e:FormEvent){e.preventDefault();try{const r=await api.post('/addresses/',{area,address_line:line,phone,is_default:addresses.length===0});await loadAddresses();setAddress(String(r.data.id));setLine('');setMessage('ঠিকানা সংরক্ষণ হয়েছে।')}catch(e:any){setMessage(e.response?.data?.detail||'ঠিকানা সংরক্ষণ করা যায়নি।')}}
 async function checkout(){try{const r=await api.post('/checkout/',{address});setMessage(`অর্ডার সফল! Order ID: ${r.data.order_number}`);await refresh()}catch(e:any){setMessage(e.response?.data?.detail||'অর্ডার করা যায়নি।')}}
 return <main className="page"><h1>আপনার শপিং কার্ট</h1>{!cart?.items.length?<div className="empty"><ShoppingCart size={36}/><h3>আপনার কার্ট খালি</h3><p>পছন্দের পণ্য যোগ করে বাজার শুরু করুন।</p><Link className="primary-btn" to="/">পণ্য দেখুন</Link></div>:<div className="cart-layout"><div className="cart-list"><div className="cart-title"><b>{cart.shop_name}</b><button className="text-link" onClick={clear}>কার্ট খালি করুন</button></div>{cart.items.map(i=><div className="cart-row" key={i.id}><div className="cart-thumb">🛒</div><div className="cart-product"><b>{i.product_name_bn||i.product_name}</b><small>৳{i.price} / {i.unit}</small></div><b>৳{(Number(i.price)*Number(i.quantity)).toFixed(2)}</b><button className="remove" onClick={async()=>{await api.delete(`/cart/items/${i.id}/`);refresh()}}><Trash2 size={17}/></button></div>)}</div><aside className="summary"><h3>অর্ডার সারাংশ</h3><div><span>পণ্যের মূল্য</span><b>৳{subtotal.toFixed(2)}</b></div><label>ডেলিভারি ঠিকানা<select value={address} onChange={e=>setAddress(e.target.value)}><option value="">ঠিকানা নির্বাচন করুন</option>{addresses.map(a=><option value={a.id} key={a.id}>{a.address_line} — {a.area_name}</option>)}</select></label>{addresses.length===0&&<form onSubmit={addAddress} className="address-form"><b>নতুন ঠিকানা যোগ করুন</b><select required value={area} onChange={e=>setArea(e.target.value)}><option value="">এলাকা নির্বাচন করুন</option>{areas.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select><input required placeholder="বাসা/রোড/এলাকার ঠিকানা" value={line} onChange={e=>setLine(e.target.value)}/><input required placeholder="মোবাইল নম্বর" value={phone} onChange={e=>setPhone(e.target.value)}/><button className="text-link">ঠিকানা সংরক্ষণ</button></form>}<div className="summary-total"><span>সাবটোটাল*</span><b>৳{subtotal.toFixed(2)}</b></div><small>*ডেলিভারি চার্জ checkout-এ সার্ভার হিসাব করবে।</small><button className="primary-btn full" disabled={!address} onClick={checkout}>Cash on Delivery দিয়ে অর্ডার</button>{message&&<p>{message}</p>}</aside></div>}</main>
}
function ShopkeeperPage(){
 type OwnedShop = { id:number; name:string; area:number; area_name:string; address:string; phone:string; description:string; status:string; delivery_fee:string; minimum_order:string; is_open:boolean }
 type CatalogProduct = { id:number; name:string; name_bn:string; category:number; category_name:string; unit:string; image_url:string }
 type Listing = { id:number; shop:number; shop_name:string; product:number; product_name:string; product_name_bn:string; unit:string; image_url:string; category_name:string; price:string; stock:string; is_available:boolean }
 type OrderItem = { product_name:string; unit:string; quantity:string; unit_price:string; line_total:string }
 type ShopOrder = { id:string; order_number:string; subtotal:string; delivery_fee:string; total:string; status:string; created_at:string; items:OrderItem[] }
 const [shops,setShops]=useState<OwnedShop[]>([])
 const [catalog,setCatalog]=useState<CatalogProduct[]>([])
 const [listings,setListings]=useState<Listing[]>([])
 const [orders,setOrders]=useState<ShopOrder[]>([])
 const [areas,setAreas]=useState<{id:number;name:string}[]>([])
 const [selectedShop,setSelectedShop]=useState('')
 const [newShop,setNewShop]=useState({name:'',area:'',phone:'',address:'',description:'',delivery_fee:'30',minimum_order:'100'})
 const [newListing,setNewListing]=useState({product:'',price:'',stock:'100'})
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [success,setSuccess]=useState('')
 const [needsLogin,setNeedsLogin]=useState(!localStorage.getItem('access'))
 async function loadDashboard(){
   if(!localStorage.getItem('access')){
     setNeedsLogin(true)
     setError('দোকান পরিচালনা করতে Shopkeeper account দিয়ে লগইন করুন।')
     setLoading(false)
     return
   }
   try {
     const profile=await api.get('/auth/me/')
     if(profile.data.role!=='SHOPKEEPER'){
       setNeedsLogin(true)
       setError('এই ড্যাশবোর্ড দেখতে Shopkeeper account দিয়ে লগইন করুন।')
       return
     }
     const [shopResponse,listingResponse,catalogResponse,orderResponse,areaResponse]=await Promise.all([
       api.get('/shopkeeper/shops/'),
       api.get('/shop-products/manage/'),
       api.get('/catalog/products/'),
       api.get('/shopkeeper/orders/'),
       api.get('/areas/'),
     ])
     const ownShops:OwnedShop[]=shopResponse.data.results||shopResponse.data
     setShops(ownShops)
     setListings(listingResponse.data.results||listingResponse.data)
     setCatalog(catalogResponse.data.results||catalogResponse.data)
     setOrders(orderResponse.data.results||orderResponse.data)
     setAreas(areaResponse.data.results||areaResponse.data)
     setSelectedShop(current=>ownShops.some(shop=>String(shop.id)===current)?current:(ownShops[0]?String(ownShops[0].id):''))
     setNewShop(form=>({...form,area:form.area||(areaResponse.data.results||areaResponse.data)[0]?.id.toString()||''}))
     setError('')
     setNeedsLogin(false)
   } catch(e:unknown) {
     const status=axiosStatus(e)
     if(status===401){
       setError('সেশন শেষ হয়েছে। Shopkeeper account দিয়ে আবার লগইন করুন।')
       setNeedsLogin(true)
     } else if(status===403){
       setError('এই ড্যাশবোর্ড দেখতে Shopkeeper account দিয়ে লগইন করুন।')
       setNeedsLogin(true)
     } else {
       setError('ড্যাশবোর্ডের তথ্য লোড করা যায়নি। Backend চালু আছে কিনা দেখে আবার চেষ্টা করুন।')
     }
   } finally {
     setLoading(false)
   }
 }
 useEffect(()=>{void loadDashboard()},[])
 const selectedShopRecord=shops.find(shop=>String(shop.id)===selectedShop)
 const visibleListings=listings.filter(listing=>String(listing.shop)===selectedShop)
 async function createShop(event:FormEvent<HTMLFormElement>){
   event.preventDefault()
   setBusy(true);setError('');setSuccess('')
   try {
     await api.post('/shopkeeper/shops/',{...newShop,area:Number(newShop.area)})
     setNewShop(form=>({...form,name:'',phone:'',address:'',description:''}))
     setSuccess('দোকানের আবেদন জমা হয়েছে। Admin অনুমোদনের পর দোকানটি ক্রেতাদের কাছে দেখা যাবে।')
     await loadDashboard()
   } catch(e:unknown) {
     setError(apiErrorMessage(e,'দোকানের তথ্য সংরক্ষণ করা যায়নি।'))
   } finally {setBusy(false)}
 }
 async function addListing(event:FormEvent<HTMLFormElement>){
   event.preventDefault()
   if(!selectedShop){setError('আগে একটি দোকান তৈরি করুন।');return}
   setBusy(true);setError('');setSuccess('')
   try {
     await api.post('/shop-products/manage/',{shop:Number(selectedShop),product:Number(newListing.product),price:newListing.price,stock:newListing.stock})
     setNewListing(form=>({...form,product:'',price:''}))
     setSuccess('পণ্যটি দোকানের তালিকায় যোগ হয়েছে।')
     await loadDashboard()
   } catch(e:unknown) {
     setError(apiErrorMessage(e,'পণ্য যোগ করা যায়নি।'))
   } finally {setBusy(false)}
 }
 async function updateListing(event:FormEvent<HTMLFormElement>,listing:Listing){
   event.preventDefault()
   const form=new FormData(event.currentTarget)
   setBusy(true);setError('');setSuccess('')
   try {
     await api.patch(`/shop-products/manage/${listing.id}/`,{
       price:form.get('price'),
       stock:form.get('stock'),
       is_available:form.get('is_available')==='on',
     })
     setSuccess('পণ্যের দাম ও স্টক আপডেট হয়েছে।')
     await loadDashboard()
   } catch(e:unknown) {
     setError(apiErrorMessage(e,'পণ্য আপডেট করা যায়নি।'))
   } finally {setBusy(false)}
 }
 async function removeListing(listing:Listing){
   setBusy(true);setError('');setSuccess('')
   try {
     await api.delete(`/shop-products/manage/${listing.id}/`)
     setSuccess('পণ্যটি দোকানের তালিকা থেকে সরানো হয়েছে।')
     await loadDashboard()
   } catch(e:unknown) {
     setError(apiErrorMessage(e,'পণ্য সরানো যায়নি।'))
   } finally {setBusy(false)}
 }
 async function orderAction(order:ShopOrder,action:'accept'|'reject'|'preparing'|'ready'){
   setBusy(true);setError('');setSuccess('')
   try {
     await api.post(`/shopkeeper/orders/${order.id}/${action}/`)
     setSuccess(`${order.order_number} অর্ডারটি আপডেট হয়েছে।`)
     await loadDashboard()
   } catch(e:unknown) {
     setError(apiErrorMessage(e,'অর্ডারের অবস্থা আপডেট করা যায়নি।'))
   } finally {setBusy(false)}
 }
 return <main className="page shopkeeper-page">
   <div className="shopkeeper-heading"><div><span className="eyebrow">SHOP MANAGEMENT</span><h1>দোকানদার ড্যাশবোর্ড</h1><p className="muted">দোকান, পণ্য, স্টক এবং অর্ডার এক জায়গা থেকে পরিচালনা করুন।</p></div><button className="dashboard-refresh" disabled={loading||busy} onClick={()=>{setLoading(true);void loadDashboard()}}>রিফ্রেশ</button></div>
   {error&&<div className="dashboard-message error-message">{error}{needsLogin&&<> <Link className="text-link" to="/login">লগইন করুন</Link></>}</div>}
   {success&&<div className="dashboard-message success-message">{success}</div>}
   {loading?<div className="empty"><Package size={32}/><p>ড্যাশবোর্ড লোড হচ্ছে...</p></div>:needsLogin?null:<>
     <section className="dashboard-stats"><div><b>{shops.length}</b><span>আপনার দোকান</span></div><div><b>{listings.length}</b><span>পণ্যের তালিকা</span></div><div><b>{orders.filter(order=>order.status==='PLACED').length}</b><span>নতুন অর্ডার</span></div></section>
     <section className="dashboard-panel">
       <div className="dashboard-section-title"><div><h2>আপনার দোকান</h2><p className="muted">দোকান নির্বাচন করুন বা নতুন দোকানের আবেদন করুন।</p></div></div>
       {shops.length>0&&<div className="shop-select-row"><label>দোকান<select value={selectedShop} onChange={event=>setSelectedShop(event.target.value)}>{shops.map(shop=><option key={shop.id} value={shop.id}>{shop.name} — {shop.area_name}</option>)}</select></label>{selectedShopRecord&&<span className={`shop-status ${selectedShopRecord.status==='APPROVED'?'approved':'pending'}`}>{selectedShopRecord.status==='APPROVED'?'অনুমোদিত':'অনুমোদনের অপেক্ষায়'}</span>}</div>}
       <details className="dashboard-details" open={shops.length===0}>
         <summary>{shops.length===0?'দোকানের জন্য আবেদন করুন':'আরেকটি দোকান যোগ করুন'}</summary>
         <form className="dashboard-form" onSubmit={createShop}>
           <label>দোকানের নাম<input required value={newShop.name} onChange={event=>setNewShop({...newShop,name:event.target.value})}/></label>
           <label>এলাকা<select required value={newShop.area} onChange={event=>setNewShop({...newShop,area:event.target.value})}><option value="">এলাকা নির্বাচন</option>{areas.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
           <label>ফোন নম্বর<input required value={newShop.phone} onChange={event=>setNewShop({...newShop,phone:event.target.value})}/></label>
           <label>ঠিকানা<input required value={newShop.address} onChange={event=>setNewShop({...newShop,address:event.target.value})}/></label>
           <label>ডেলিভারি ফি (৳)<input required type="number" min="0" step="0.01" value={newShop.delivery_fee} onChange={event=>setNewShop({...newShop,delivery_fee:event.target.value})}/></label>
           <label>সর্বনিম্ন অর্ডার (৳)<input required type="number" min="0" step="0.01" value={newShop.minimum_order} onChange={event=>setNewShop({...newShop,minimum_order:event.target.value})}/></label>
           <label className="form-wide">বর্ণনা<textarea value={newShop.description} onChange={event=>setNewShop({...newShop,description:event.target.value})}/></label>
           <button className="primary-btn" disabled={busy||areas.length===0}>{busy?'সংরক্ষণ হচ্ছে...':'দোকানের আবেদন জমা দিন'}</button>
         </form>
       </details>
     </section>
     {selectedShopRecord?.status==='APPROVED'?<>
       <section className="dashboard-panel">
         <div className="dashboard-section-title"><div><h2>পণ্য ও স্টক</h2><p className="muted">দোকানের পণ্যের দাম, স্টক ও প্রাপ্যতা আপডেট করুন।</p></div></div>
         <form className="dashboard-form add-product-form" onSubmit={addListing}>
           <label>ক্যাটালগ পণ্য<select required value={newListing.product} onChange={event=>setNewListing({...newListing,product:event.target.value})}><option value="">পণ্য নির্বাচন করুন</option>{catalog.filter(product=>!visibleListings.some(listing=>listing.product===product.id)).map(product=><option key={product.id} value={product.id}>{product.name_bn||product.name} — {product.category_name}</option>)}</select></label>
           <label>দাম (৳)<input required type="number" min="0.01" step="0.01" value={newListing.price} onChange={event=>setNewListing({...newListing,price:event.target.value})}/></label>
           <label>স্টক<input required type="number" min="0" step="0.001" value={newListing.stock} onChange={event=>setNewListing({...newListing,stock:event.target.value})}/></label>
           <button className="primary-btn" disabled={busy||!catalog.some(product=>!visibleListings.some(listing=>listing.product===product.id))}><Plus size={16}/> পণ্য যোগ করুন</button>
         </form>
         {visibleListings.length===0?<div className="empty dashboard-empty"><Package size={30}/><p>এই দোকানে এখনো পণ্য যোগ করা হয়নি।</p></div>:<div className="inventory-list">{visibleListings.map(listing=><form className="inventory-row" key={listing.id} onSubmit={event=>updateListing(event,listing)}>
           <div className="inventory-product">{listing.image_url?<img src={listing.image_url} alt=""/>:<div className="inventory-placeholder"><Package size={19}/></div>}<div><b>{listing.product_name_bn||listing.product_name}</b><small>{listing.product_name} · {listing.category_name} · {listing.unit}</small></div></div>
           <label>দাম<input name="price" type="number" min="0.01" step="0.01" defaultValue={listing.price} required/></label>
           <label>স্টক<input name="stock" type="number" min="0" step="0.001" defaultValue={listing.stock} required/></label>
           <label className="availability-toggle"><input name="is_available" type="checkbox" defaultChecked={listing.is_available}/> বিক্রির জন্য চালু</label>
           <div className="inventory-actions"><button className="save-button" disabled={busy}>সংরক্ষণ</button><button type="button" className="delete-button" disabled={busy} onClick={()=>removeListing(listing)}>সরান</button></div>
         </form>)}</div>}
       </section>
       <section className="dashboard-panel">
         <div className="dashboard-section-title"><div><h2>অর্ডার পরিচালনা</h2><p className="muted">গ্রাহকের অর্ডার গ্রহণ করুন এবং প্রস্তুতির অবস্থা জানান।</p></div></div>
         {orders.length===0?<div className="empty dashboard-empty"><Package size={30}/><p>এখনো কোনো অর্ডার আসেনি। নতুন অর্ডার এখানে দেখা যাবে।</p></div>:<div className="order-list">{orders.map(order=><article className="managed-order" key={order.id}>
           <div className="managed-order-heading"><div><b>{order.order_number}</b><small>{new Date(order.created_at).toLocaleString('bn-BD')}</small></div><span className={`order-status status-${order.status.toLowerCase()}`}>{order.status}</span></div>
           <div className="managed-order-items">{order.items.map((item,index)=><span key={`${item.product_name}-${index}`}>{item.product_name} × {item.quantity} <b>৳{item.line_total}</b></span>)}</div>
           <div className="managed-order-footer"><b>মোট ৳{order.total}</b><div className="actions">
             {order.status==='PLACED'&&<><button disabled={busy} onClick={()=>orderAction(order,'accept')}>অর্ডার গ্রহণ</button><button className="reject-order" disabled={busy} onClick={()=>orderAction(order,'reject')}>বাতিল</button></>}
             {order.status==='ACCEPTED'&&<button disabled={busy} onClick={()=>orderAction(order,'preparing')}>প্রস্তুত করা শুরু</button>}
             {order.status==='PREPARING'&&<button disabled={busy} onClick={()=>orderAction(order,'ready')}>ডেলিভারির জন্য প্রস্তুত</button>}
           </div></div>
         </article>)}</div>}
       </section>
     </>:selectedShopRecord&&<section className="dashboard-panel approval-notice"><h2>দোকান অনুমোদনের অপেক্ষায়</h2><p>Admin অনুমোদন করলে দোকান ক্রেতাদের কাছে দেখা যাবে এবং আপনি পণ্য যোগ করতে পারবেন।</p></section>}
   </>}
 </main>
}
export default App
