import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { ShoppingBasket, MapPin, Search, UserRound, ShoppingCart, Menu, Plus, Minus, Trash2, Store, Package, LogOut } from 'lucide-react'
import { api, login } from './api'
import RegisterPage from './pages/RegisterPage'
import AccountPage from './pages/AccountPage'
import CustomerOrdersPage from './pages/CustomerOrdersPage'
import ShopkeeperInventoryPage from './pages/ShopkeeperInventoryPage'
import DeliveryAgentPage from './pages/DeliveryAgentPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import ShopkeeperApplicationPage from './pages/ShopkeeperApplicationPage'

type Shop = { id:number; name:string; area_name:string; address:string; delivery_fee:string; minimum_order:string }
type Product = { id:number; shop:number; shop_name:string; product:number; product_name:string; product_name_bn:string; unit:string; image_url:string; category_name:string; price:string; stock:string }
type Cart = { id:number; shop:number|null; shop_name:string; items:{id:number;shop_product:number;product_name:string;product_name_bn:string;unit:string;price:string;quantity:string;image_url:string}[] }

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
      <Link to="/" className="brand"><span className="brand-icon"><ShoppingBasket size={24}/></span><span>Elaka<span>Bazar</span><small>আপনার এলাকার বাজার</small></span></Link>
      <label className="location"><MapPin size={17}/><select value={area} onChange={e=>setArea(e.target.value)}>{areas.map(a=><option key={a.id}>{a.name}</option>)}</select></label>
      <div className="searchbox"><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="পণ্য বা দোকান খুঁজুন..."/></div>
      <nav><Link to="/shops">দোকান</Link><Link to="/orders">অর্ডার</Link><Link to="/shopkeeper">দোকানদার</Link><Link to="/shopkeeper/inventory">ইনভেন্টরি</Link><Link to="/shopkeeper/apply">দোকান আবেদন</Link><Link to="/delivery">ডেলিভারি</Link><Link to="/admin">অ্যাডমিন</Link></nav>
      <Link to="/account" className="icon-link"><UserRound size={19}/><span>অ্যাকাউন্ট</span></Link>
      <Link to="/cart" className="cart-link"><ShoppingCart size={19}/><span>কার্ট</span><b>{count}</b></Link>
    </header>
    {notice && <div className="notice" onClick={()=>setNotice('')}>{notice} <button>×</button></div>}
    <Routes>
      <Route path="/" element={<main>
        <section className="hero"><div className="hero-copy"><span className="eyebrow">LOCAL SHOPPING, MADE EASY</span><h1>আপনার এলাকার বাজার,<br/><em>এখন আপনার হাতেই।</em></h1><p>কাছের দোকান থেকে তাজা বাজার অর্ডার করুন। স্থানীয় দোকান, পরিচিত পণ্য, ঘরে পৌঁছে দেওয়ার সুবিধা।</p><a className="primary-btn" href="#products">এখনই বাজার করুন <ShoppingBasket size={18}/></a><div className="trust"><span>✓ স্থানীয় দোকান</span><span>✓ সহজ অর্ডার</span><span>✓ ক্যাশ অন ডেলিভারি</span></div></div><div className="hero-art"><div className="hero-circle"></div><img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&auto=format&fit=crop&q=85" alt="Fresh vegetables"/><div className="floating-card"><b>🥬 Fresh groceries</b><small>আপনার পাশের দোকান থেকে</small></div></div></section>
        <section className="stats"><div><b>{shops.length}+</b><span>স্থানীয় দোকান</span></div><div><b>{products.length}+</b><span>পণ্য</span></div><div><b>১টি</b><span>সহজ প্ল্যাটফর্ম</span></div></section>
        <section className="section"><div className="section-head"><div><span className="eyebrow">SHOP BY CATEGORY</span><h2>কী বাজার করবেন?</h2></div><span className="muted">প্রতিদিনের প্রয়োজনীয় পণ্য</span></div><div className="categories">{[['🥬','শাকসবজি'],['🥚','ডিম ও দুধ'],['🍎','ফলমূল'],['🍚','চাল ও ডাল'],['🧴','নিত্যপণ্য'],['🐟','মাছ ও মাংস']].map(([emoji,name])=><button className="category" key={name} onClick={()=>setSearch(name)} style={{backgroundImage:`linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.88)), url(${categoryImages[name as keyof typeof categoryImages]})`, backgroundSize:'cover', backgroundPosition:'center'}}><span>{emoji}</span><b>{name}</b></button>)}</div></section>
        <section className="section" id="products"><div className="section-head"><div><span className="eyebrow">FRESH FROM LOCAL SHOPS</span><h2>আপনার এলাকার পণ্য</h2></div><span className="muted">{area}</span></div><div className="product-grid">{visibleProducts.map(p=><article className="product-card" key={p.id}><div className="product-image">{p.image_url?<img src={p.image_url} alt={p.product_name}/>:<span>🛒</span>}<small>{p.category_name}</small></div><div className="product-info"><span className="muted shop-name"><Store size={13}/>{p.shop_name}</span><h3>{p.product_name_bn || p.product_name}</h3><p className="muted">{p.product_name} · {p.unit}</p><div className="product-bottom"><b>৳{Number(p.price).toFixed(2)}</b><button disabled={busy} onClick={()=>addToCart(p)} aria-label="Add to cart"><Plus size={18}/></button></div></div></article>)}</div>{visibleProducts.length===0&&<div className="empty"><Package size={32}/><h3>এখনো কোনো পণ্য পাওয়া যায়নি</h3><p>অন্য এলাকা বা পণ্য দিয়ে খুঁজে দেখুন।</p></div>}</section>
        <section className="section"><div className="section-head"><div><span className="eyebrow">NEAR YOUR HOME</span><h2>কাছের দোকান</h2></div><Link to="/shops" className="text-link">সব দোকান দেখুন →</Link></div><div className="shop-grid">{shops.map(s=><div className="shop-card" key={s.id}><div className="shop-avatar"><Store size={26}/></div><div><h3>{s.name}</h3><p className="muted">{s.area_name} · {s.address}</p><small>ডেলিভারি ৳{s.delivery_fee} · মিনিমাম ৳{s.minimum_order}</small></div></div>)}</div></section>
        <section className="partner"><div><span className="eyebrow">GROW WITH US</span><h2>আপনার দোকান অনলাইনে আনুন</h2><p>ElakaBazar-এর সঙ্গে যুক্ত হয়ে এলাকার আরও কাস্টমারের কাছে পৌঁছান।</p><Link className="light-btn" to="/shopkeeper">দোকান যুক্ত করুন</Link></div><div className="partner-icon">🏪</div></section>
      </main>}/>
      <Route path="/shops" element={<main className="page"><h1>আপনার এলাকার দোকান</h1><div className="shop-grid">{shops.map(s=><div className="shop-card" key={s.id}><div className="shop-avatar"><Store/></div><div><h3>{s.name}</h3><p>{s.area_name} · {s.address}</p></div></div>)}</div></main>}/>
      <Route path="/register" element={<RegisterPage onRegistered={async(username,password)=>{await login(username,password);await refreshCart();navigate("/account")}}/>}/>
      <Route path="/account" element={<AccountPage/>}/>
      <Route path="/orders" element={<CustomerOrdersPage/>}/>
      <Route path="/shopkeeper/inventory" element={<ShopkeeperInventoryPage/>}/>
      <Route path="/shopkeeper/apply" element={<ShopkeeperApplicationPage/>}/>
      <Route path="/delivery" element={<DeliveryAgentPage/>}/>
      <Route path="/admin" element={<AdminDashboardPage/>}/>
      <Route path="/login" element={<Login onLogin={async(u)=>{await login(u.username,u.password);await refreshCart();navigate("/")}}/>}/>
      <Route path="/cart" element={<CartPage cart={cart} refresh={refreshCart} clear={clearCart}/>}/>
      <Route path="/shopkeeper" element={<ShopkeeperPage/>}/>
      <Route path="*" element={<main className="page"><h1>পৃষ্ঠা পাওয়া যায়নি</h1><Link to="/">হোমে ফিরুন</Link></main>}/>
    </Routes>
    <footer><div className="footer-brand">ElakaBazar</div><p>আপনার এলাকার বাজার, এখন আপনার হাতেই।</p><small>© 2026 ElakaBazar. Local shops, connected.</small></footer>
  </div>
}

function Login({onLogin}:{onLogin:(u:{username:string;password:string})=>void}) {
 const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState('')
 return <main className="auth-wrap"><form className="auth-card" onSubmit={async e=>{e.preventDefault();try{await onLogin({username,password})}catch{setError('লগইন হয়নি। ফোন নম্বর ও পাসওয়ার্ড যাচাই করুন।')}}}><span className="eyebrow">WELCOME BACK</span><h1>আপনার অ্যাকাউন্টে লগইন</h1><label>ফোন নম্বর / ইউজারনেম<input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="017XXXXXXXX"/></label><label>পাসওয়ার্ড<input required type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="error">{error}</p>}<button className="primary-btn full">লগইন করুন</button><p className="muted">নতুন ব্যবহারকারী? <Link className="text-link" to="/register">অ্যাকাউন্ট তৈরি করুন</Link></p></form></main>
}
function CartPage({cart,refresh,clear}:{cart:Cart|null;refresh:()=>void;clear:()=>void}) {
 const [addresses,setAddresses]=useState<any[]>([]); const [areas,setAreas]=useState<any[]>([]); const [address,setAddress]=useState(''); const [message,setMessage]=useState('')
 const [area,setArea]=useState(''); const [line,setLine]=useState(''); const [phone,setPhone]=useState('')
 async function loadAddresses(){const r=await api.get('/addresses/');setAddresses(r.data.results||r.data)}
 useEffect(()=>{loadAddresses();api.get('/areas/').then(r=>setAreas(r.data.results||r.data)).catch(()=>{})},[])
 const subtotal=cart?.items.reduce((s,i)=>s+Number(i.price)*Number(i.quantity),0)||0
 async function addAddress(e:FormEvent){e.preventDefault();try{const r=await api.post('/addresses/',{area,address_line:line,phone,is_default:addresses.length===0});await loadAddresses();setAddress(String(r.data.id));setLine('');setMessage('ঠিকানা সংরক্ষণ হয়েছে।')}catch(e:any){setMessage(e.response?.data?.detail||'ঠিকানা সংরক্ষণ করা যায়নি।')}}
 async function checkout(){try{const r=await api.post('/checkout/',{address});setMessage(`অর্ডার সফল! Order ID: ${r.data.order_number}`);await refresh()}catch(e:any){setMessage(e.response?.data?.detail||'অর্ডার করা যায়নি।')}}
 return <main className="page"><h1>আপনার শপিং কার্ট</h1>{!cart?.items.length?<div className="empty"><ShoppingCart size={36}/><h3>আপনার কার্ট খালি</h3><p>পছন্দের পণ্য যোগ করে বাজার শুরু করুন।</p><Link className="primary-btn" to="/">পণ্য দেখুন</Link></div>:<div className="cart-layout"><div className="cart-list"><div className="cart-title"><b>{cart.shop_name}</b><button className="text-link" onClick={clear}>কার্ট খালি করুন</button></div>{cart.items.map(i=><div className="cart-row" key={i.id}><div className="cart-thumb">🛒</div><div className="cart-product"><b>{i.product_name_bn||i.product_name}</b><small>৳{i.price} / {i.unit}</small></div><b>৳{(Number(i.price)*Number(i.quantity)).toFixed(2)}</b><button className="remove" onClick={async()=>{await api.delete(`/cart/items/${i.id}/`);refresh()}}><Trash2 size={17}/></button></div>)}</div><aside className="summary"><h3>অর্ডার সারাংশ</h3><div><span>পণ্যের মূল্য</span><b>৳{subtotal.toFixed(2)}</b></div><label>ডেলিভারি ঠিকানা<select value={address} onChange={e=>setAddress(e.target.value)}><option value="">ঠিকানা নির্বাচন করুন</option>{addresses.map(a=><option value={a.id} key={a.id}>{a.address_line} — {a.area_name}</option>)}</select></label>{addresses.length===0&&<form onSubmit={addAddress} className="address-form"><b>নতুন ঠিকানা যোগ করুন</b><select required value={area} onChange={e=>setArea(e.target.value)}><option value="">এলাকা নির্বাচন করুন</option>{areas.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select><input required placeholder="বাসা/রোড/এলাকার ঠিকানা" value={line} onChange={e=>setLine(e.target.value)}/><input required placeholder="মোবাইল নম্বর" value={phone} onChange={e=>setPhone(e.target.value)}/><button className="text-link">ঠিকানা সংরক্ষণ</button></form>}<div className="summary-total"><span>সাবটোটাল*</span><b>৳{subtotal.toFixed(2)}</b></div><small>*ডেলিভারি চার্জ checkout-এ সার্ভার হিসাব করবে।</small><button className="primary-btn full" disabled={!address} onClick={checkout}>Cash on Delivery দিয়ে অর্ডার</button>{message&&<p>{message}</p>}</aside></div>}</main>
}
function ShopkeeperPage(){const [orders,setOrders]=useState<any[]>([]);const [error,setError]=useState('');async function load(){try{const r=await api.get('/shopkeeper/orders/');setOrders(r.data.results||r.data)}catch{setError('শুধু Shopkeeper account দিয়ে লগইন করলে অর্ডার দেখা যাবে।')}}useEffect(()=>{load()},[]);return <main className="page"><h1>দোকানদার ড্যাশবোর্ড</h1><p className="muted">আপনার দোকানের অর্ডারগুলো এখানে পরিচালনা করুন।</p>{error&&<div className="notice">{error}</div>}{orders.map(o=><div className="order-card" key={o.id}><b>{o.order_number}</b><span>{o.status}</span><b>৳{o.total}</b><div className="actions">{['accept','preparing','ready','reject'].map(action=><button key={action} onClick={async()=>{await api.post(`/shopkeeper/orders/${o.id}/${action}/`);load()}}>{action}</button>)}</div></div>)}</main>}
export default App
